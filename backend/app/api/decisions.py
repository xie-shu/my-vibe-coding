"""决策库 API：列表 / 搜索 / 详情

自动抽取后的研究决策支持人工校对保存。
"""

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.services.decision_graph_service import decision_graph_service
from app.models.decision import Decision, DecisionOption
from app.services.embedding_service import embedding_service

router = APIRouter(prefix="/decisions", tags=["decisions"])


class DecisionUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=50)
    context: str | None = None
    snippet: str | None = None
    chosen_option: str | None = Field(None, max_length=30)
    reasons: list[str] = Field(default_factory=list)
    objections: list[dict] = Field(default_factory=list)
    decided_by: list[str] = Field(default_factory=list)
    review_status: Literal["pending", "confirmed"] = "confirmed"
    reviewed_by: str = Field(default="当前用户", max_length=100)
    options: list[dict] = Field(default_factory=list)


@router.get("")
async def list_decisions(
    meeting_id: uuid.UUID | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """决策列表（分页 + 按 meeting 筛选）

    Args:
        meeting_id: 按会议筛选（可选）
        skip: 分页偏移
        limit: 每页数量（1~100）
    """
    decisions, total = await decision_graph_service.list_decisions(
        db, meeting_id=meeting_id, skip=skip, limit=limit
    )
    return {
        "items": [
            {
                "id": str(d.id),
                "title": d.title,
                "chosen_option": d.chosen_option,
                "meeting_id": str(d.meeting_id) if d.meeting_id else None,
                "decided_by": d.decided_by,
                "confidence": d.confidence,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in decisions
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/search")
async def search_decisions(
    q: str = Query(..., min_length=1, description="关键词或语义查询"),
    top_k: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """决策语义搜索（基于 pgvector cosine 相似度）

    适用于「为什么选 X」「X 选型决策」类查询
    """
    results = await decision_graph_service.search(db, q, top_k=top_k)
    return {
        "items": results,
        "query": q,
        "total": len(results),
    }


@router.get("/{decision_id}")
async def get_decision(
    decision_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """决策详情（含 options + 关联决策）

    关联决策由 Q9 决策的「写入时即时向量关联」生成，
    relation_type 暂全填 'relates'（M2 再细化分类）
    """
    detail = await decision_graph_service.get_decision(db, decision_id)
    if not detail:
        raise HTTPException(status_code=404, detail="决策不存在")
    return detail


@router.patch("/{decision_id}")
async def update_decision(
    decision_id: uuid.UUID,
    data: DecisionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """保存研究者人工校对后的决策内容。"""
    result = await db.execute(select(Decision).where(Decision.id == decision_id))
    decision = result.scalar_one_or_none()
    if not decision:
        raise HTTPException(status_code=404, detail="决策不存在")

    decision.title = data.title.strip()
    decision.context = data.context.strip() if data.context else None
    decision.snippet = data.snippet.strip() if data.snippet else None
    decision.chosen_option = data.chosen_option.strip() if data.chosen_option else None
    decision.reasons = [item.strip() for item in data.reasons if item.strip()]
    decision.objections = [item for item in data.objections if item.get("content")]
    decision.decided_by = [item.strip() for item in data.decided_by if item.strip()]
    # 候选方案与主决策一起保存，避免人工确认后仍保留错误的方案比较信息。
    existing_options = {
        str(option.id): option
        for option in (
            await db.execute(select(DecisionOption).where(DecisionOption.decision_id == decision_id))
        ).scalars().all()
    }
    chosen_name = data.chosen_option.strip() if data.chosen_option else None
    for raw_option in data.options:
        option_id = str(raw_option.get("id", ""))
        option = existing_options.get(option_id)
        if not option:
            continue
        option.name = str(raw_option.get("name", option.name)).strip()[:30] or option.name
        option.pros = [str(item).strip() for item in raw_option.get("pros", []) if str(item).strip()]
        option.cons = [str(item).strip() for item in raw_option.get("cons", []) if str(item).strip()]
        option.proposed_by = str(raw_option.get("proposed_by", "")).strip()[:50] or None
        option.is_chosen = bool(raw_option.get("is_chosen", False))
        if option.is_chosen:
            chosen_name = option.name
    if data.options and chosen_name:
        decision.chosen_option = chosen_name
    decision.review_status = data.review_status
    decision.reviewed_by = data.reviewed_by.strip() or "当前用户"
    decision.reviewed_at = datetime.now(timezone.utc) if data.review_status == "confirmed" else None
    decision.embedding = await embedding_service.embed_text(
        f"{decision.title} {decision.context or ''}"
    )
    await db.flush()
    return await decision_graph_service.get_decision(db, decision_id)
