"""会议业务逻辑层"""

import os
import shutil
import uuid
import logging
from typing import Optional

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.meeting import Meeting
from app.models.transcript import Transcript
from app.schemas.meeting import MeetingCreate, MeetingUpdate

logger = logging.getLogger(__name__)


class MeetingService:
    """会议 CRUD 与会议原文查询。"""

    async def create_meeting(
        self, db: AsyncSession, data: MeetingCreate
    ) -> Meeting:
        """创建会议"""
        meeting = Meeting(
            title=data.title,
            description=data.description,
            participants=data.participants,
            start_time=data.start_time,
            end_time=data.end_time,
        )
        db.add(meeting)
        await db.flush()
        await db.refresh(meeting)
        return meeting

    async def get_meeting(self, db: AsyncSession, meeting_id: uuid.UUID) -> Optional[Meeting]:
        """获取单个会议"""
        result = await db.execute(
            select(Meeting).where(Meeting.id == meeting_id)
        )
        return result.scalar_one_or_none()

    async def list_meetings(
        self, db: AsyncSession, skip: int = 0, limit: int = 20
    ) -> tuple[list[Meeting], int]:
        """获取会议列表 + 总数"""
        # 列表
        result = await db.execute(
            select(Meeting)
            .order_by(Meeting.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        meetings = list(result.scalars().all())

        # 总数
        count_result = await db.execute(select(func.count(Meeting.id)))
        total = count_result.scalar_one()

        return meetings, total

    async def update_meeting(
        self, db: AsyncSession, meeting_id: uuid.UUID, data: MeetingUpdate
    ) -> Optional[Meeting]:
        """更新会议"""
        meeting = await self.get_meeting(db, meeting_id)
        if not meeting:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(meeting, key, value)

        await db.flush()
        await db.refresh(meeting)
        return meeting

    async def delete_meeting(self, db: AsyncSession, meeting_id: uuid.UUID) -> bool:
        """删除会议及其所有关联数据"""
        meeting = await self.get_meeting(db, meeting_id)
        if not meeting:
            return False

        # 删除会议上传目录（录音或文字记录）
        meeting_upload_dir = os.path.join(settings.UPLOAD_DIR, str(meeting_id))
        if os.path.isdir(meeting_upload_dir):
            try:
                shutil.rmtree(meeting_upload_dir, ignore_errors=True)
            except OSError as e:
                logger.warning(f"删除会议上传文件失败: {e}")

        # 手动删除关联数据（避免外键约束不一致）
        for table in ("agent_runs", "decisions", "transcripts", "summaries",
                       "action_items", "risks", "chat_sessions", "rooms"):
            await db.execute(
                text(f"DELETE FROM {table} WHERE meeting_id = :mid"),
                {"mid": meeting_id},
            )
        # 知识文档通过 source_id 关联
        await db.execute(
            text("DELETE FROM knowledge_documents WHERE source_id = :mid"),
            {"mid": meeting_id},
        )

        await db.delete(meeting)
        await db.flush()
        return True

    async def get_transcripts(
        self, db: AsyncSession, meeting_id: uuid.UUID
    ) -> list[Transcript]:
        """获取会议文字记录解析出的原文片段。"""
        result = await db.execute(
            select(Transcript)
            .where(Transcript.meeting_id == meeting_id)
            .order_by(Transcript.seq_index)
        )
        return list(result.scalars().all())

    async def get_transcript_count(
        self, db: AsyncSession, meeting_id: uuid.UUID
    ) -> int:
        """获取会议原文片段数量。"""
        result = await db.execute(
            select(func.count(Transcript.id)).where(Transcript.meeting_id == meeting_id)
        )
        return result.scalar_one()


# 全局实例
meeting_service = MeetingService()
