"""对话服务：知识库检索增强 + LLM 流式生成"""

import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chat import ChatSession, ChatMessage
from app.services.knowledge_service import knowledge_service
from app.services.decision_graph_service import decision_graph_service

logger = logging.getLogger(__name__)

# 系统提示词
SYSTEM_PROMPT = """你是“AI 成长舱”的 AI 产品经理成长助手，服务于 AI 产品经理求职准备与日常产品思维训练。

你的能力：
1. 基于个人知识库、AI 产品资料和练习复盘回答问题
2. 解释每日产品思维练习题的考察点、作答结构和优化方向
3. 帮用户把 AI 产品趋势、RAG、Agent、多模态等内容转成面试表达
4. 区分平台已有资料、用户历史练习和通用知识，不虚构项目事实

回答规范：
- 普通寒暄可以自然回应，例如用户说“你好”时，简短介绍你能帮什么
- 先判断问题是否需要外部资料：不需要检索的问题直接用通用知识回答，不要因为知识库没有命中就拒答
- 需要资料依据时，优先使用【个人知识库】和【练习复盘库】中的内容回答
- 引用知识时明确标注来源；不要编造不存在的资料、练习记录或项目结论
- 对需要实时外部工具的问题（例如天气、股价、汇率、航班、实时新闻），先判断当前是否有对应工具；如果检索结果没有提供相关数据，必须明确说明“当前没有接入对应查询工具/知识库，不能判断”，不要编造答案
- 上下文不足时，先说明“当前资料中缺少足够证据”，再给出需要补充的材料或建议
- 使用 Markdown 格式输出，结构清晰
- 如使用通用知识补充，必须与平台已有资料明确区分

当前检索结果：
{context}
"""


class ChatService:
    """对话服务"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            max_retries=0,
            timeout=60.0,
        ) if settings.OPENAI_API_KEY else None
        self.model = settings.LLM_MODEL

    async def create_session(
        self,
        db: AsyncSession,
        meeting_id: str | None = None,
        title: str | None = None,
    ) -> ChatSession:
        """创建对话会话"""
        session = ChatSession(
            meeting_id=meeting_id,
            title=title or "新对话",
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    async def list_sessions(
        self,
        db: AsyncSession,
        meeting_id: str | None = None,
    ) -> list[ChatSession]:
        """获取会话列表"""
        stmt = select(ChatSession).order_by(ChatSession.created_at.desc())
        if meeting_id:
            stmt = stmt.where(ChatSession.meeting_id == meeting_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_session_messages(
        self,
        db: AsyncSession,
        session_id: str,
    ) -> list[ChatMessage]:
        """获取会话消息历史"""
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def save_message(
        self,
        db: AsyncSession,
        session_id: str,
        role: str,
        content: str,
        metadata: dict | None = None,
    ) -> ChatMessage:
        """保存消息"""
        msg = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            metadata_=metadata,
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg

    async def rename_session_from_query(
        self,
        db: AsyncSession,
        session_id: str,
        query: str,
    ) -> None:
        """Use the first user question as a useful history title."""
        stmt = select(ChatSession).where(ChatSession.id == session_id)
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        if session and (not session.title or session.title == "新对话"):
            title = " ".join(query.strip().split())[:32]
            session.title = title or "研究问答"
            await db.commit()

    async def chat_stream(
        self,
        db: AsyncSession,
        session_id: str,
        query: str,
        images: list[str] | None = None,
    ) -> AsyncGenerator[dict, None]:
        """流式对话：RAG 检索 + LLM 流式生成

        Args:
            images: base64 编码的图片列表（data URL），用于多模态对话
        通过 SSE 逐步返回内容。
        """
        if not self.client:
            yield {"type": "error", "message": "LLM 未配置，请在后端 .env 配置 OPENAI_API_KEY"}
            return

        session_stmt = select(ChatSession).where(ChatSession.id == session_id)
        session_result = await db.execute(session_stmt)
        if session_result.scalar_one_or_none() is None:
            yield {"type": "error", "message": "对话不存在或已被删除"}
            return

        # 1. 保存用户消息（含图片元信息）
        await self.save_message(
            db,
            session_id,
            "user",
            query,
            metadata={"images": images} if images else None,
        )
        await self.rename_session_from_query(db, session_id, query)

        # 2. 获取历史消息（最近 10 条）
        history = await self.get_session_messages(db, session_id)
        history_msgs = [
            {"role": m.role, "content": m.content}
            for m in history[-10:]  # 最近 10 条
        ]

        # 3. 查询改写：多轮对话中消解指代（"它"、"这个"等）
        # 仅当存在历史且查询简短时触发，节省 token
        rewritten_query = await self._rewrite_query(query, history_msgs[:-1]) if len(history_msgs) > 1 else query
        logger.info(f"查询改写: {query!r} → {rewritten_query!r}")

        # 4. 双路 RAG 检索（文档 + 决策）+ RRF 融合
        try:
            doc_results = await knowledge_service.search(db, rewritten_query, top_k=8)
        except Exception as e:
            logger.warning(f"知识库检索失败: {e}")
            doc_results = []

        try:
            decision_results = await decision_graph_service.search(db, rewritten_query, top_k=8)
        except Exception as e:
            logger.warning(f"决策库检索失败: {e}")
            decision_results = []

        # RRF 融合两路结果（跨来源统一排序）
        fused = self._rrf_fuse(doc_results, decision_results, top_k=5)

        # 构建上下文（区分来源类型）
        if fused:
            context_parts = []
            for i, r in enumerate(fused, 1):
                source_type = r.get("source_type", "")
                if source_type == "decision":
                    title = r.get("title", "未知决策")
                    chosen = r.get("chosen_option")
                    context_text = r.get("context", "")
                    parts = [f"[{i}] 来源：决策库 - {title}"]
                    if chosen:
                        parts.append(f"已选方案：{chosen}")
                    if context_text:
                        parts.append(f"背景：{context_text[:400]}")
                    context_parts.append("\n".join(parts))
                else:
                    source = "会议纪要" if source_type == "meeting_summary" else "文档"
                    context_parts.append(
                        f"[{i}] 来源：{source} - {r.get('title', '未知')}\n"
                        f"内容：{r.get('content', '')[:500]}"
                    )
            context = "\n\n".join(context_parts)
        else:
            context = "（未检索到相关知识或决策）"

        # 5. 构建消息列表
        # 有图片时使用多模态模型 qwen-vl-plus
        has_images = bool(images)
        model = settings.VISION_MODEL if has_images else self.model

        if has_images:
            # 多模态：当前用户消息包含文本 + 图片
            user_content: list[dict] = [{"type": "text", "text": query}]
            for img in images:
                user_content.append({"type": "image_url", "image_url": {"url": img}})

            messages = [
                {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
                *[
                    {"role": m["role"], "content": m["content"]}
                    for m in history_msgs[:-1]  # 排除当前用户消息（已含图片）
                ],
                {"role": "user", "content": user_content},
            ]
        else:
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
                *history_msgs,
            ]

        # 6. 流式生成
        full_response = ""
        llm_failed = False
        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=0.7,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    delta = chunk.choices[0].delta.content
                    full_response += delta
                    yield {"type": "token", "content": delta}

        except Exception as e:
            logger.error(f"LLM 流式生成失败: {e}")
            # 分类错误并返回友好提示，避免暴露 request_id 等技术细节
            from app.agents.meeting_graph import _classify_llm_error
            friendly_msg = _classify_llm_error(e)
            llm_failed = True
            yield {"type": "error", "message": friendly_msg}

        # 7. 保存助手回复（仅当未失败且内容非空时）
        # 失败时不保存，避免污染历史对话
        if full_response and not llm_failed:
            sources = self._build_sources(fused)
            await self.save_message(
                db,
                session_id,
                "assistant",
                full_response,
                metadata={
                    "sources": sources
                } if fused else None,
            )
            yield {
                "type": "done",
                "sources": sources if fused else [],
            }

    @staticmethod
    def _build_sources(results: list[dict]) -> list[dict]:
        """将检索结果转为前端可追溯的证据元数据。"""
        sources = []
        for rank, item in enumerate(results, 1):
            source_type = item.get("source_type") or "uploaded_doc"
            is_decision = source_type == "decision"
            source_id = item.get("id") if is_decision else item.get("source_id")
            raw_score = item.get("rerank_score", item.get("score"))
            sources.append({
                "source_id": source_id,
                "title": item.get("title") or "未命名研究资料",
                "source_type": source_type,
                "route": "decision" if is_decision else "knowledge",
                "rank": rank,
                "score": round(float(raw_score), 4) if raw_score is not None else None,
                "snippet": str(
                    item.get("context") if is_decision else item.get("content", "")
                )[:160],
            })
        return sources

    def _rrf_fuse(
        self,
        doc_results: list[dict],
        decision_results: list[dict],
        top_k: int = 5,
        k: int = 60,
    ) -> list[dict]:
        """RRF 融合文档与决策两路检索结果

        公式：score = 1 / (k + rank)
        两路结果 id 来自不同表（knowledge_documents / decisions），不会冲突，
        RRF 的作用是跨来源统一排序——决定哪条文档/决策应排在前面。

        Args:
            doc_results: knowledge_service.search 返回的结果（已按相关性排序）
            decision_results: decision_graph_service.search 返回的结果（已按相似度排序）
            top_k: 融合后返回数量
            k: RRF 平滑常数（标准值 60）

        Returns:
            融合后的结果列表，每项含原始字段 + rrf_score
        """
        scores: dict[str, float] = {}
        items_map: dict[str, dict] = {}

        # 文档路：按返回顺序赋 rank（search 已内部排序）
        for rank, item in enumerate(doc_results):
            key = f"doc:{item.get('id')}"
            scores[key] = scores.get(key, 0) + 1.0 / (k + rank + 1)
            items_map[key] = item

        # 决策路
        for rank, item in enumerate(decision_results):
            key = f"decision:{item.get('id')}"
            scores[key] = scores.get(key, 0) + 1.0 / (k + rank + 1)
            items_map[key] = item

        # 按融合分数降序排序
        sorted_keys = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        result = []
        for key in sorted_keys[:top_k]:
            item = items_map[key].copy()
            item["rrf_score"] = round(scores[key], 4)
            result.append(item)
        return result

    async def _rewrite_query(self, query: str, history: list[dict]) -> str:
        """Expand referential follow-ups with the previous user question.

        The model already receives full conversation history. Retrieval only
        needs a compact lexical anchor, so a local expansion avoids a second
        non-streaming model call before the first visible token.
        """
        if len(query) > 160 or not history:
            return query

        # 检测指代词（中英文）
        ref_keywords = ["它", "他", "她", "这个", "那个", "这些", "那些", "其",
                        "前者", "后者", "上述", "刚才", "前面", "第一个", "第二个", "第三个",
                        "it", "this", "that", "these", "those", "they", "them"]
        query_lower = query.lower()
        if not any(kw in query_lower for kw in ref_keywords):
            return query

        previous_user = next(
            (
                str(message.get("content", "")).strip()
                for message in reversed(history)
                if message.get("role") == "user" and message.get("content")
            ),
            "",
        )
        if not previous_user:
            return query
        return f"{previous_user[:240]}\n追问：{query}"

    async def delete_session(self, db: AsyncSession, session_id: str) -> bool:
        """删除会话"""
        stmt = select(ChatSession).where(ChatSession.id == session_id)
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()
            return True
        return False


chat_service = ChatService()
