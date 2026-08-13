"""会议模型"""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, func, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    source_file_path: Mapped[str | None] = mapped_column(String(500))
    source_file_name: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    participants: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # 关系
    transcripts = relationship("Transcript", back_populates="meeting", cascade="all, delete-orphan")
    summary = relationship("Summary", back_populates="meeting", cascade="all, delete-orphan", uselist=False)
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="meeting", cascade="all, delete-orphan")
