"""会议相关 Pydantic Schema"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── 会议 ──

class MeetingBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    participants: Optional[list[str]] = None


class MeetingCreate(MeetingBase):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    participants: Optional[list[str]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class MeetingResponse(MeetingBase):
    id: uuid.UUID
    source_file_name: Optional[str] = None
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── 会议原文片段 ──

class TranscriptResponse(BaseModel):
    id: uuid.UUID
    meeting_id: uuid.UUID
    speaker: Optional[str] = None
    content: str
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    seq_index: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProcessingStatusResponse(BaseModel):
    meeting_id: uuid.UUID
    status: str
    transcript_count: int = 0
    summary_ready: bool = False
    decision_count: int = 0
