"""会议 API 路由"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_meeting_or_404
from app.models.meeting import Meeting
from app.schemas.meeting import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    TranscriptResponse,
    ProcessingStatusResponse,
)
from app.services.meeting_service import meeting_service
from app.services.meeting_record_service import meeting_record_service

router = APIRouter(prefix="/meetings", tags=["会议管理"])


@router.post("", response_model=MeetingResponse, status_code=201)
async def create_meeting(
    data: MeetingCreate, db: AsyncSession = Depends(get_db)
) -> Meeting:
    """创建会议"""
    return await meeting_service.create_meeting(db, data)


@router.get("", response_model=list[MeetingResponse])
async def list_meetings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[Meeting]:
    """获取会议列表"""
    skip = (page - 1) * page_size
    meetings, _ = await meeting_service.list_meetings(db, skip=skip, limit=page_size)
    return meetings


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(meeting: Meeting = Depends(get_meeting_or_404)) -> Meeting:
    """获取会议详情"""
    return meeting


@router.patch("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    data: MeetingUpdate,
    db: AsyncSession = Depends(get_db),
    meeting: Meeting = Depends(get_meeting_or_404),
) -> Meeting:
    """更新会议"""
    updated = await meeting_service.update_meeting(db, meeting.id, data)
    return updated  # type: ignore[return-value]


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(
    db: AsyncSession = Depends(get_db),
    meeting: Meeting = Depends(get_meeting_or_404),
) -> None:
    """删除会议"""
    await meeting_service.delete_meeting(db, meeting.id)


@router.post("/{meeting_id}/record-upload", response_model=MeetingResponse)
async def upload_meeting_record(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    meeting: Meeting = Depends(get_meeting_or_404),
) -> Meeting:
    """导入腾讯会议文字记录并自动生成研究产出。"""
    file_content = await file.read()
    filename = file.filename or "meeting-record.txt"
    if not file_content:
        raise HTTPException(status_code=400, detail="会议记录文件为空")
    if len(file_content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="会议记录文件超过 50MB 限制")
    try:
        updated = await meeting_record_service.import_record(
            db, meeting, file_content, filename
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    background_tasks.add_task(
        meeting_record_service.generate_outputs,
        str(meeting.id),
    )
    return updated


@router.get("/{meeting_id}/transcripts", response_model=list[TranscriptResponse])
async def get_transcripts(
    db: AsyncSession = Depends(get_db),
    meeting: Meeting = Depends(get_meeting_or_404),
) -> list:
    """获取从会议文字记录解析出的原文片段。"""
    return await meeting_service.get_transcripts(db, meeting.id)


@router.get("/{meeting_id}/processing-status", response_model=ProcessingStatusResponse)
async def get_processing_status(
    meeting: Meeting = Depends(get_meeting_or_404),
    db: AsyncSession = Depends(get_db),
) -> ProcessingStatusResponse:
    """获取会议记录解析与研究产出生成状态。"""
    detail = await meeting_record_service.get_processing_status(db, meeting.id)
    return ProcessingStatusResponse(status=meeting.status, **detail)
