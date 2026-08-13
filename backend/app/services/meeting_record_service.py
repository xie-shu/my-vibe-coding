"""腾讯会议文字记录导入与自动整理。"""

import logging
import os
import re
import uuid

from sqlalchemy import delete, func, select

from app.config import settings
from app.db.session import async_session_factory
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.models.meeting import Meeting
from app.models.risk import Risk
from app.models.summary import Summary
from app.models.transcript import Transcript
from app.services.document_parser import document_parser
from app.services.summary_service import summary_service
from app.services.decision_graph_service import decision_graph_service

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".txt", ".md", ".docx", ".pdf"}
SPEAKER_LINE = re.compile(
    r"^(?:\[(?P<time>\d{1,2}:\d{2}(?::\d{2})?)\]\s*)?"
    r"(?P<speaker>[\u4e00-\u9fffA-Za-z0-9_·\- ]{1,30})[：:]\s*(?P<content>.+)$"
)
SPEAKER_TIME_LINE = re.compile(
    r"^(?P<speaker>[\u4e00-\u9fffA-Za-z0-9_·\- ]{1,30})\s+"
    r"(?P<time>\d{1,2}:\d{2}(?::\d{2})?)$"
)


def _seconds(value: str | None, fallback: float) -> float:
    if not value:
        return fallback
    parts = [int(part) for part in value.split(":")]
    if len(parts) == 2:
        return float(parts[0] * 60 + parts[1])
    return float(parts[0] * 3600 + parts[1] * 60 + parts[2])


def _segments_from_text(content: str) -> list[dict]:
    lines = [line.strip() for line in content.replace("\r\n", "\n").split("\n") if line.strip()]
    segments: list[dict] = []
    pending_speaker: str | None = None
    pending_time: str | None = None

    for line in lines:
        speaker_time = SPEAKER_TIME_LINE.match(line)
        if speaker_time:
            pending_speaker = speaker_time.group("speaker").strip()
            pending_time = speaker_time.group("time")
            continue

        match = SPEAKER_LINE.match(line)
        if match:
            speaker = match.group("speaker").strip()
            text = match.group("content").strip()
            timestamp = match.group("time")
        elif pending_speaker:
            speaker = pending_speaker
            text = line
            timestamp = pending_time
            pending_speaker = None
            pending_time = None
        else:
            speaker = "会议记录"
            text = line
            timestamp = None

        start = _seconds(timestamp, float(len(segments) * 15))
        segments.append({
            "speaker": speaker,
            "content": text,
            "start_time": start,
            "end_time": start + 14.0,
            "seq_index": len(segments),
        })

    return segments


class MeetingRecordService:
    async def import_record(
        self,
        db,
        meeting: Meeting,
        file_content: bytes,
        filename: str,
    ) -> Meeting:
        extension = os.path.splitext(filename)[1].lower()
        if extension not in SUPPORTED_EXTENSIONS:
            raise ValueError("仅支持 TXT、Markdown、DOCX 和 PDF 会议记录")

        meeting_dir = os.path.join(settings.UPLOAD_DIR, str(meeting.id), "records")
        os.makedirs(meeting_dir, exist_ok=True)
        for existing_name in os.listdir(meeting_dir):
            existing_path = os.path.join(meeting_dir, existing_name)
            if os.path.isfile(existing_path):
                os.remove(existing_path)
        safe_name = f"source{extension}"
        file_path = os.path.join(meeting_dir, safe_name)
        with open(file_path, "wb") as target:
            target.write(file_content)

        content = document_parser.parse(file_path, filename)
        if not content or len(content.strip()) < 20:
            raise ValueError("会议记录内容过短或无法解析")

        segments = _segments_from_text(content)
        if not segments:
            raise ValueError("会议记录中没有可整理的文本")

        await db.execute(delete(Transcript).where(Transcript.meeting_id == meeting.id))
        await db.execute(delete(Summary).where(Summary.meeting_id == meeting.id))
        await db.execute(delete(ActionItem).where(ActionItem.meeting_id == meeting.id))
        await db.execute(delete(Risk).where(Risk.meeting_id == meeting.id))
        await db.execute(delete(Decision).where(Decision.meeting_id == meeting.id))

        for segment in segments:
            db.add(Transcript(meeting_id=meeting.id, **segment))

        meeting.source_file_path = file_path
        meeting.source_file_name = filename
        meeting.status = "processing"
        await db.flush()
        await db.refresh(meeting)
        return meeting

    async def generate_outputs(self, meeting_id: str) -> None:
        async with async_session_factory() as db:
            meeting = await db.get(Meeting, uuid.UUID(meeting_id))
            if not meeting:
                return
            try:
                summary = await summary_service.generate_summary(db, meeting.id)
                await self._ensure_outputs(db, meeting, summary)
                meeting.status = "processed"
                await db.commit()
            except Exception as exc:
                logger.exception("会议记录自动整理失败: %s", exc)
                meeting.status = "failed"
                await db.commit()

    async def _ensure_outputs(self, db, meeting: Meeting, summary: Summary | None) -> None:
        """模型失败或未抽取到结构化结果时生成可编辑的本地初稿。"""
        result = await db.execute(
            select(Transcript)
            .where(Transcript.meeting_id == meeting.id)
            .order_by(Transcript.seq_index)
        )
        transcripts = list(result.scalars().all())
        if not transcripts:
            raise ValueError("会议原文为空")

        decision_terms = ("决定", "确定", "结论", "采用", "统一", "同意", "冻结", "选择")
        action_terms = ("负责", "提交", "完成", "整理", "复现", "跟进")
        decision_segments = [item for item in transcripts if any(term in item.content for term in decision_terms)]
        action_segments = [item for item in transcripts if any(term in item.content for term in action_terms)]

        if not summary or summary.status != "completed":
            overview = "\n".join(f"- **{item.speaker or '会议记录'}**：{item.content}" for item in transcripts[:12])
            conclusions = decision_segments or transcripts[-2:]
            conclusion_text = "\n".join(f"- {item.content}" for item in conclusions[:6])
            action_text = "\n".join(f"- {item.content}" for item in action_segments[:6]) or "- 暂无明确责任人，需人工补充"
            content = (
                "## 会议概述\n\n"
                "以下初稿根据上传的腾讯会议文字记录整理，需结合原文人工校对。\n\n"
                f"## 主要讨论\n\n{overview}\n\n"
                f"## 会议结论\n\n{conclusion_text}\n\n"
                f"## 后续安排\n\n{action_text}"
            )
            if summary:
                summary.content = content
                summary.key_points = [item.content for item in conclusions[:5]]
                summary.status = "completed"
            else:
                db.add(Summary(
                    meeting_id=meeting.id,
                    content=content,
                    key_points=[item.content for item in conclusions[:5]],
                    status="completed",
                ))

        action_count = (
            await db.execute(select(func.count(ActionItem.id)).where(ActionItem.meeting_id == meeting.id))
        ).scalar_one()
        if action_count == 0:
            for item in action_segments[:8]:
                db.add(ActionItem(
                    meeting_id=meeting.id,
                    title=item.content[:500],
                    assignee=item.speaker if item.speaker != "会议记录" else None,
                    due_date=None,
                    priority="medium",
                    status="pending",
                ))

        decision_count = (
            await db.execute(select(func.count(Decision.id)).where(Decision.meeting_id == meeting.id))
        ).scalar_one()
        if decision_count == 0 and decision_segments:
            fallback_decisions = []
            for item in decision_segments[:5]:
                previous = transcripts[max(0, item.seq_index - 1)]
                fallback_decisions.append({
                    "title": item.content[:50],
                    "context": previous.content if previous.id != item.id else meeting.description,
                    "snippet": f"{item.speaker or '会议记录'}：{item.content}",
                    "chosen": item.content[:30],
                    "reasons": ["会议原文包含明确结论表达，具体理由需人工校对"],
                    "objections": [],
                    "decided_by": [item.speaker] if item.speaker and item.speaker != "会议记录" else [],
                    "decided_at": meeting.end_time,
                    "confidence": 0.55,
                    "options": [{
                        "name": item.content[:30],
                        "pros": [],
                        "cons": ["由本地规则提取，需人工确认"],
                        "proposed_by": item.speaker,
                    }],
                })
            await decision_graph_service.save_decisions(db, meeting.id, fallback_decisions)

        await db.flush()
        current_summary = await summary_service.get_summary(db, meeting.id)
        if current_summary:
            try:
                from app.services.knowledge_service import knowledge_service
                await knowledge_service.index_meeting_summary(
                    db,
                    meeting.id,
                    meeting.title,
                    current_summary.content,
                )
            except Exception as exc:
                logger.warning("会议纪要知识库同步失败: %s", exc)

    async def get_processing_status(self, db, meeting_id: uuid.UUID) -> dict:
        transcript_count = (
            await db.execute(select(func.count(Transcript.id)).where(Transcript.meeting_id == meeting_id))
        ).scalar_one()
        summary_ready = (
            await db.execute(
                select(func.count(Summary.id)).where(
                    Summary.meeting_id == meeting_id,
                    Summary.status == "completed",
                )
            )
        ).scalar_one() > 0
        decision_count = (
            await db.execute(select(func.count(Decision.id)).where(Decision.meeting_id == meeting_id))
        ).scalar_one()
        return {
            "meeting_id": meeting_id,
            "transcript_count": transcript_count,
            "summary_ready": summary_ready,
            "decision_count": decision_count,
        }


meeting_record_service = MeetingRecordService()
