"""对话 API：会话管理 + SSE 流式对话"""

import json
import uuid

from openai import AsyncOpenAI
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.config import settings
from app.services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


# ── 请求/响应模型 ──

class CreateSessionRequest(BaseModel):
    meeting_id: str | None = None
    title: str | None = None


class ChatRequest(BaseModel):
    query: str
    images: list[str] | None = None  # base64 data URL 列表，用于多模态对话
    history: list[dict] | None = None
    context: str | None = None


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    metadata: dict | None = None
    created_at: str


class SessionResponse(BaseModel):
    id: str
    meeting_id: str | None = None
    title: str | None = None
    created_at: str


DIRECT_CHAT_PROMPT = """你是“AI 成长舱”的 AI 产品经理成长助手。

产品背景：
- 用户正在准备 AI 产品经理面试，也会用工作台做日常 AI 产品学习。
- 工作台包含每日产品思维训练、AI 产品雷达、个人知识库和练习复盘库。
- 回答要像一个有经验的 AI 产品经理教练：具体、可落地、适合面试表达。

回答要求：
1. 先判断问题类型：普通知识/寒暄、知识库问题，还是需要外部实时工具的问题。
2. 不需要检索或工具的问题，直接使用通用知识正常回答，不要因为知识库没有命中就拒答。
3. 需要资料依据的问题，优先结合用户提供的资料上下文、练习记录和 AI 产品雷达内容。
4. 需要实时信息或外部操作的问题（例如天气、股价、汇率、航班、实时新闻），先判断当前是否有对应工具；如果没有工具或工具没有返回结果，必须明确说明“当前没有接入对应查询工具/知识库，不能判断”，不要编造答案。
5. 普通寒暄和能力介绍问题可以自然回应，例如用户说“你好”“你会做什么”时，简短介绍你能帮什么。
6. 尽量给结构化回答，必要时给面试话术。
7. 中文回答，语气清晰直接。

可参考上下文：
{context}
"""


def _safe_history(history: list[dict] | None) -> list[dict]:
    """只保留最近多轮 user/assistant 文本，避免前端传入异常结构。"""
    safe: list[dict] = []
    for item in (history or [])[-8:]:
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
            safe.append({"role": role, "content": content[:2000]})
    return safe


def _classify_direct_chat_error(exc: Exception) -> str:
    text = str(exc)
    if "401" in text or "Incorrect API key" in text or "Unauthorized" in text:
        return "大模型认证失败，请检查后端 OPENAI_API_KEY 配置"
    if "404" in text or "model" in text.lower():
        return "大模型或接口地址不可用，请检查 OPENAI_BASE_URL 和 LLM_MODEL 配置"
    if "timeout" in text.lower():
        return "大模型响应超时，请稍后重试"
    return "大模型调用失败，请检查后端服务和模型配置"


# ── 会话管理 ──

@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    req: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    """创建对话会话"""
    meeting_uuid = None
    if req.meeting_id:
        try:
            meeting_uuid = uuid.UUID(req.meeting_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的组会 ID")
    session = await chat_service.create_session(
        db,
        meeting_id=meeting_uuid,
        title=req.title,
    )
    return SessionResponse(
        id=str(session.id),
        meeting_id=str(session.meeting_id) if session.meeting_id else None,
        title=session.title,
        created_at=session.created_at.isoformat(),
    )


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    meeting_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """获取会话列表"""
    meeting_uuid = None
    if meeting_id:
        try:
            meeting_uuid = uuid.UUID(meeting_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的组会 ID")
    sessions = await chat_service.list_sessions(db, meeting_uuid)
    return [
        SessionResponse(
            id=str(s.id),
            meeting_id=str(s.meeting_id) if s.meeting_id else None,
            title=s.title,
            created_at=s.created_at.isoformat(),
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """获取会话消息历史"""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的会话 ID")

    msgs = await chat_service.get_session_messages(db, session_uuid)
    return [
        MessageResponse(
            id=str(m.id),
            session_id=str(m.session_id),
            role=m.role,
            content=m.content,
            metadata=m.metadata_,
            created_at=m.created_at.isoformat(),
        )
        for m in msgs
    ]


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """删除会话"""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的会话 ID")
    ok = await chat_service.delete_session(db, session_uuid)
    if not ok:
        raise HTTPException(status_code=404, detail="会话不存在")
    return {"message": "已删除"}


# ── SSE 流式对话 ──

@router.post("/sessions/{session_id}/stream")
async def chat_stream(
    session_id: str,
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """SSE 流式对话

    返回 Server-Sent Events：
    - data: {"type": "token", "content": "..."}  增量内容
    - data: {"type": "done", "sources": [...]}  完成
    - data: {"type": "error", "message": "..."} 错误
    """
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的会话 ID")

    if not req.query.strip():
        raise HTTPException(status_code=400, detail="查询不能为空")

    async def event_generator():
        try:
            async for event in chat_service.chat_stream(
                db, session_uuid, req.query, req.images
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/direct-stream")
async def direct_chat_stream(req: ChatRequest):
    """作品集演示用的真实 GPT 流式对话。

    这个接口不依赖数据库会话，适合前端继续使用 Demo 会话管理，
    但回答生成走后端真实 OpenAI 兼容大模型。API Key 只保存在后端。
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="查询不能为空")
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="LLM 未配置，请在后端 .env 配置 OPENAI_API_KEY")

    client = AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL,
        max_retries=0,
        timeout=60.0,
    )
    has_images = bool(req.images)
    model = settings.VISION_MODEL if has_images else settings.LLM_MODEL

    async def event_generator():
        full_response = ""
        try:
            if has_images:
                user_content: list[dict] = [{"type": "text", "text": req.query}]
                for img in req.images or []:
                    user_content.append({"type": "image_url", "image_url": {"url": img}})
                messages = [
                    {"role": "system", "content": DIRECT_CHAT_PROMPT.format(context=req.context or "（暂无额外上下文）")},
                    *_safe_history(req.history),
                    {"role": "user", "content": user_content},
                ]
            else:
                messages = [
                    {"role": "system", "content": DIRECT_CHAT_PROMPT.format(context=req.context or "（暂无额外上下文）")},
                    *_safe_history(req.history),
                    {"role": "user", "content": req.query},
                ]

            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=0.7,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    delta = chunk.choices[0].delta.content
                    full_response += delta
                    yield f"data: {json.dumps({'type': 'token', 'content': delta}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': _classify_direct_chat_error(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
