"""Planner 节点：科研组会任务规划与多 Agent 动态编排。

分析会议标题 + 转写文本特征，输出执行计划：
- 组会类型（weekly_sync/experiment_review/paper_discussion/annotation_review）
- 是否跑摘要 / 行动项 / 决策 Agent
- 是否含高影响研究决策（用于生成后的逐条人工确认）
- 转写文本策略（full/compressed）
- 预估 Token 消耗

Planner 失败时降级为可解释的本地规则，保证可用性。
"""

import logging

from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel

from app.agents.meeting_graph import get_llm, _extract_json, _invoke_with_retry
from app.agents.harness.wrap import get_run_id

logger = logging.getLogger(__name__)


class ExecutionPlan(BaseModel):
    """Planner 输出的执行计划"""
    meeting_type: str = "unknown"
    should_run_summary: bool = True
    should_run_actions: bool = True
    should_run_decisions: bool = True
    needs_human_review: bool = False
    transcript_strategy: str = "full"    # full/compressed
    estimated_tokens: int = 10000
    reason: str = "default"


PLANNER_PROMPT = """你是研究生课题组的组会任务规划器。根据会议标题和原文，只规划后续需要执行的分析任务。

判断规则：
- meeting_type：weekly_sync(周进展同步)/experiment_review(实验复盘)/paper_discussion(论文讨论)/annotation_review(标注或数据评审)/unknown
- 转写文本字数 > 20000 → transcript_strategy="compressed"
- 始终生成组会纪要
- 原文出现"负责/完成/提交/补充/截止"等可执行表达 → should_run_actions=true，否则可以为 false
- 原文出现"采用/确定/选择/冻结/统一/保留"等明确结论 → should_run_decisions=true，纯开放讨论则可以为 false
- 决策涉及数据集划分、标注规范、评价指标、基线变更或论文核心结论 → needs_human_review=true
- 人工确认不阻塞整场组会处理；研究决策会先以"待人工确认"保存

只返回 JSON，格式：
{
  "meeting_type": "experiment_review",
  "should_run_summary": true,
  "should_run_actions": true,
  "should_run_decisions": true,
  "needs_human_review": true,
  "transcript_strategy": "full",
  "estimated_tokens": 8000,
  "reason": "复盘了数据划分方案，需抽取决策并由研究者确认"
}
"""

ACTION_KEYWORDS = {"负责", "完成", "提交", "补充", "截止", "实验", "复现"}
DECISION_KEYWORDS = {"采用", "确定", "选择", "冻结", "统一", "保留", "决定"}
HIGH_IMPACT_KEYWORDS = {
    "数据划分", "数据集划分", "标注规范", "评价指标", "评估指标",
    "基线", "论文结论", "外部测试", "测试集", "验收标准",
}


async def planner_node(state: dict) -> dict:
    """Planner 节点：规划执行计划"""
    meeting_title = state.get("meeting_title", "")
    transcript_text = state.get("transcript_text", "")
    run_id = get_run_id()

    # 兜底规则（无论 LLM 是否成功，都要先做基础判断）
    fallback_plan = _build_fallback_plan(meeting_title, transcript_text)

    try:
        llm = get_llm()
        messages = [
            SystemMessage(content=PLANNER_PROMPT),
            HumanMessage(content=f"会议标题：{meeting_title}\n\n转写前2000字：\n{transcript_text[:2000]}"),
        ]
        content, err = await _invoke_with_retry(llm, messages, max_retries=1)
        if content is None:
            logger.warning(f"[Planner] LLM 失败，降级兜底: {err}")
            plan = fallback_plan
        else:
            parsed = _extract_json(content)
            if not isinstance(parsed, dict):
                logger.warning(f"[Planner] JSON 解析失败，降级兜底: {content[:200]}")
                plan = fallback_plan
            else:
                plan = ExecutionPlan.model_validate(parsed)
                # 高影响决策不允许被模型的否定判断覆盖。
                if fallback_plan.needs_human_review:
                    plan.needs_human_review = True
    except Exception as e:
        logger.warning(f"[Planner] 异常，降级兜底: {e}")
        plan = fallback_plan

    plan_dict = plan.model_dump()
    logger.info(f"[Planner] 计划: type={plan.meeting_type} "
                f"summary={plan.should_run_summary} actions={plan.should_run_actions} "
                f"decisions={plan.should_run_decisions} "
                f"review={plan.needs_human_review} "
                f"strategy={plan.transcript_strategy} est_tokens={plan.estimated_tokens}")

    # 持久化 plan 到 AgentRun
    if run_id:
        try:
            from app.services.agent_run_service import agent_run_service
            await agent_run_service.save_plan(run_id, plan_dict)
        except Exception as e:
            logger.debug(f"[Planner] 保存 plan 失败: {e}")

    return {"plan": plan_dict}


def _build_fallback_plan(meeting_title: str, transcript_text: str) -> ExecutionPlan:
    """基于规则的兜底执行计划（不依赖 LLM）"""
    title_lower = meeting_title.lower()

    combined_text = f"{meeting_title}\n{transcript_text}"
    needs_review = any(kw in combined_text for kw in HIGH_IMPACT_KEYWORDS)

    # 会议类型推断（默认全跑）
    meeting_type = "unknown"
    should_run_summary = True
    should_run_actions = any(kw in combined_text for kw in ACTION_KEYWORDS)
    should_run_decisions = any(kw in combined_text for kw in DECISION_KEYWORDS)

    if any(kw in title_lower for kw in ["周报", "周会", "组会", "同步"]):
        meeting_type = "weekly_sync"
    if any(kw in title_lower for kw in ["实验", "复盘", "评审", "review"]):
        meeting_type = "experiment_review"
    elif any(kw in title_lower for kw in ["论文", "paper", "文献"]):
        meeting_type = "paper_discussion"
    elif any(kw in title_lower for kw in ["标注", "数据", "annotation"]):
        meeting_type = "annotation_review"

    # 长文本压缩
    if len(transcript_text) > 20000:
        strategy = "compressed"
        est_tokens = min(8000, len(transcript_text) // 4)
    else:
        strategy = "full"
        est_tokens = min(15000, len(transcript_text) // 3 + 2000)

    return ExecutionPlan(
        meeting_type=meeting_type,
        should_run_summary=should_run_summary,
        should_run_actions=should_run_actions,
        should_run_decisions=should_run_decisions,
        needs_human_review=needs_review,
        transcript_strategy=strategy,
        estimated_tokens=est_tokens,
        reason=f"fallback: type={meeting_type}",
    )
