"""Seed a coherent portfolio dataset for pantograph computer-vision research.

All metrics and thresholds are labelled as demo assumptions. They are useful
for product walkthroughs and must not be presented as published results.

Usage: cd backend && PYTHONPATH=. .venv/bin/python seed_data.py
"""

import asyncio
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import delete

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.db.session import async_session_factory
from app.models.action_item import ActionItem
from app.models.decision import Decision, DecisionOption, DecisionRelation
from app.models.knowledge_doc import KnowledgeDocument
from app.models.meeting import Meeting
from app.models.risk import Risk
from app.models.summary import Summary
from app.models.transcript import Transcript
from app.services.knowledge_service import knowledge_service


MEETINGS = [
    {
        "meeting": {
            "title": "弓网状态视觉检测实验方案评审",
            "description": "评审数据划分、模型基线、评价指标与外部线路测试方案",
            "participants": ["周老师", "陈晨", "王博", "孙悦"],
        },
        "transcripts": [
            (0, "周老师", "今天先冻结数据划分和评价口径，不然模型结果不能横向比较。"),
            (12, "陈晨", "当前数据来自三条线路、九个车次，连续视频按帧随机划分会造成近重复样本泄漏。"),
            (28, "王博", "建议按车次、区段和原始视频 ID 分组，另留一条线路只做外部测试。"),
            (43, "孙悦", "外部线路样本少，但能检验跨线路泛化，不能再混回训练集。"),
            (58, "周老师", "模型先比较 YOLOv8-s、RT-DETR 和 Mask R-CNN，不继续扩模型清单。"),
            (72, "陈晨", "综合指标用 mAP，但安全相关结论应比较固定误报约束下的召回率。"),
            (86, "王博", "困难工况需要单独报告夜间、逆光、雨雪、隧道切换和运动模糊。"),
            (101, "孙悦", "我负责生成分组清单和数据指纹，防止同源片段跨集合。"),
            (116, "周老师", "所有数值先标为阶段目标，真实结论以冻结测试集复算为准。"),
            (130, "周老师", "本次决策是先保证无泄漏和口径一致，再讨论结构创新。"),
        ],
        "summary": """## 评审结论

本次组会冻结受电弓与弓网状态视觉检测的第一版实验协议。作品集中的数值均为演示阶段目标，不代表论文结论。

## 已确认方案

- 数据按车次、运行区段和原始视频 ID 分组，禁止相邻帧跨集合
- 保留一条未参与训练的线路作为外部测试集
- 第一轮只比较 YOLOv8-s、RT-DETR、Mask R-CNN
- 主报告同时给出 mAP 与固定误报约束下的 Recall
- 夜间、逆光、雨雪、隧道切换、运动模糊分别形成困难工况子集

## 待验证

先完成数据指纹审计和三模型统一复跑，再决定是否投入小目标增强或域适配。""",
        "key_points": [
            "按视频源分组，避免连续帧泄漏",
            "保留独立线路测试跨域泛化",
            "固定误报约束下比较召回率",
            "五类困难工况分别报告",
        ],
        "actions": [
            {"title": "生成视频分组清单与数据指纹", "assignee": "孙悦", "due": "2026-08-12", "priority": "high", "status": "in_progress"},
            {"title": "按统一配置复跑三类基线模型", "assignee": "陈晨", "due": "2026-08-16", "priority": "high", "status": "pending"},
            {"title": "建立五类困难工况测试子集", "assignee": "王博", "due": "2026-08-15", "priority": "high", "status": "in_progress"},
            {"title": "归档数据版本与环境快照", "assignee": "孙悦", "due": "2026-08-11", "priority": "medium", "status": "done"},
        ],
        "risks": [
            {"description": "连续帧跨集合导致指标虚高", "severity": "high", "mitigation": "按视频源分组并计算感知哈希，发现近重复样本立即阻断发布"},
            {"description": "外部线路样本量过小导致置信区间过宽", "severity": "medium", "mitigation": "同时报告样本量、置信区间，并继续补采独立线路数据"},
            {"description": "不同模型预处理与阈值不一致造成不公平比较", "severity": "medium", "mitigation": "冻结输入尺寸、训练轮次、随机种子和阈值选择规则"},
        ],
        "decisions": [
            {
                "title": "数据集按视频源分组并保留外部线路",
                "context": "连续视频相邻帧高度相似，随机拆帧会让同源信息同时进入训练集和测试集。",
                "snippet": "按车次、区段和原始视频 ID 分组，另留一条线路只做外部测试。",
                "chosen_option": "按视频源分组",
                "reasons": ["降低近重复样本泄漏", "能够检验跨线路泛化"],
                "objections": [{"from": "孙悦", "content": "外部线路样本量较少，需报告不确定性"}],
                "decided_by": ["周老师", "陈晨", "王博", "孙悦"],
                "confidence": 0.96,
                "options": [
                    {"name": "按视频源分组", "pros": ["无泄漏", "可解释"], "cons": ["有效样本量下降"], "proposed_by": "王博", "is_chosen": True},
                    {"name": "随机按帧划分", "pros": ["实现简单"], "cons": ["近重复泄漏"], "proposed_by": "陈晨", "is_chosen": False},
                ],
            },
            {
                "title": "固定误报约束下的召回率作为核心指标",
                "context": "单一 mAP 不能直接反映线路巡检对漏检和误报的业务约束。",
                "snippet": "安全相关结论应比较固定误报约束下的召回率。",
                "chosen_option": "固定误报下比较Recall",
                "reasons": ["与漏检风险直接相关", "便于在相同误报成本下公平比较"],
                "objections": [{"from": "陈晨", "content": "仍需保留 mAP 以便与公开论文对照"}],
                "decided_by": ["周老师", "陈晨"],
                "confidence": 0.91,
                "options": [
                    {"name": "固定误报下比较Recall", "pros": ["贴近巡检约束"], "cons": ["需冻结工作点"], "proposed_by": "周老师", "is_chosen": True},
                    {"name": "只报告mAP", "pros": ["论文常用"], "cons": ["掩盖工作点差异"], "proposed_by": "陈晨", "is_chosen": False},
                ],
            },
        ],
    },
    {
        "meeting": {
            "title": "困难工况与燃弧标注复盘",
            "description": "复盘燃弧事件标注分歧并冻结困难工况测试矩阵",
            "participants": ["周老师", "孙悦", "刘洋", "赵宁"],
        },
        "transcripts": [
            (0, "孙悦", "燃弧标注的主要分歧是单帧反光和真正连续燃弧事件。"),
            (14, "刘洋", "如果逐帧独立标注，开始帧和结束帧会在不同标注者之间漂移。"),
            (30, "赵宁", "建议先标事件起止，再标事件内有效帧；疑难样本进入双人复核池。"),
            (47, "周老师", "同意，事件级标注保留起止帧、持续时间、工况和置信等级。"),
            (65, "孙悦", "困难工况不要只用一个总体分数，要按五类场景分别看失败模式。"),
            (82, "刘洋", "夜间和隧道切换可以共现，标签需要允许多选。"),
            (98, "赵宁", "我会抽检五十个事件，统计双人一致率和边界帧偏差。"),
            (114, "周老师", "在一致性达标前，不把燃弧指标写成模型能力结论。"),
        ],
        "summary": """## 复盘结论

燃弧采用事件级标注：记录开始帧、结束帧、持续时间、工况标签和置信等级。单帧反光、遮挡和边界不清样本进入疑难池，由两名标注者独立复核。

## 困难工况矩阵

夜间、逆光、雨雪、隧道切换、运动模糊允许多标签共现。总体指标之外必须报告各工况的 Recall、Precision 和样本量。

## 验收门槛

演示设定为：抽检 50 个事件，计算事件一致率与边界帧偏差。未通过复核前只报告过程状态，不输出确定性研究结论。""",
        "key_points": ["燃弧改为事件级标注", "疑难样本双人独立复核", "困难工况允许多标签", "未复核前不下模型结论"],
        "actions": [
            {"title": "复核五十个燃弧疑难事件", "assignee": "赵宁", "due": "2026-08-13", "priority": "high", "status": "in_progress"},
            {"title": "补充事件起止帧与工况标签", "assignee": "孙悦", "due": "2026-08-14", "priority": "high", "status": "pending"},
            {"title": "输出标注一致性与边界偏差报告", "assignee": "刘洋", "due": "2026-08-15", "priority": "medium", "status": "pending"},
        ],
        "risks": [
            {"description": "单帧反光被误标为燃弧事件", "severity": "high", "mitigation": "要求连续性证据并由双人复核疑难事件"},
            {"description": "困难工况标签共现导致分层统计口径混乱", "severity": "medium", "mitigation": "采用多标签并同时报告单标签与共现组合样本量"},
        ],
        "decisions": [
            {
                "title": "燃弧采用事件级标注与双人复核",
                "context": "逐帧独立标注难以稳定区分单帧反光与连续燃弧，边界帧分歧明显。",
                "snippet": "先标事件起止，再标事件内有效帧；疑难样本进入双人复核池。",
                "chosen_option": "事件级标注",
                "reasons": ["保留时间连续性", "便于统计事件级漏检", "降低边界噪声"],
                "objections": [{"from": "刘洋", "content": "事件标注成本高于逐帧单标签"}],
                "decided_by": ["周老师", "孙悦", "刘洋", "赵宁"],
                "confidence": 0.93,
                "options": [
                    {"name": "事件级标注", "pros": ["利用时序证据"], "cons": ["标注成本较高"], "proposed_by": "赵宁", "is_chosen": True},
                    {"name": "逐帧独立标注", "pros": ["工具简单"], "cons": ["边界不稳定"], "proposed_by": "刘洋", "is_chosen": False},
                ],
            },
            {
                "title": "建立五类困难工况分层测试矩阵",
                "context": "总体指标无法解释模型在夜间、逆光、雨雪、隧道切换和运动模糊中的失效条件。",
                "snippet": "五类场景分别报告，工况标签允许多选。",
                "chosen_option": "困难工况分层测试",
                "reasons": ["定位具体失效条件", "支持针对性数据补采"],
                "objections": [],
                "decided_by": ["周老师", "孙悦"],
                "confidence": 0.9,
                "options": [
                    {"name": "困难工况分层测试", "pros": ["结果可解释"], "cons": ["需补元数据"], "proposed_by": "孙悦", "is_chosen": True},
                    {"name": "只看总体测试集", "pros": ["统计简单"], "cons": ["掩盖局部失效"], "proposed_by": "刘洋", "is_chosen": False},
                ],
            },
        ],
    },
    {
        "meeting": {
            "title": "受电弓滑板裂纹漏检周报",
            "description": "定位真实线路小目标裂纹漏检，确定下周实验顺序",
            "participants": ["周老师", "陈晨", "王博"],
        },
        "transcripts": [
            (0, "陈晨", "离线验证集表现稳定，但真实线路的小目标裂纹召回下降。"),
            (16, "王博", "漏检主要集中在低照度、运动模糊和新线路相机位姿，可能存在域偏移。"),
            (34, "周老师", "先不要继续堆模型结构，先把尺寸、线路和工况三个维度的召回率拆出来。"),
            (51, "陈晨", "我会比较训练集和真实线路的亮度、清晰度、目标尺寸与相机视角分布。"),
            (68, "王博", "再抽检三十个漏检样本，区分分辨率不足、域偏移和标注问题。"),
            (84, "周老师", "如果域偏移成立，下周优先做诊断、补集和针对性增强，不先换骨干网络。"),
        ],
        "summary": """## 问题

真实线路小目标裂纹的召回低于冻结验证集。当前只有现象，尚不能把原因归结为模型结构。

## 三个待验证假设

1. 裂纹像素尺寸过小，输入分辨率不足
2. 训练数据与真实线路在光照、模糊、位姿和线路分布上存在域偏移
3. 小裂纹标注标准不一致或存在漏标

## 下周顺序

先做按尺寸、线路、工况分桶的错误分析；再抽检漏检样本；只有确认域偏移后才进入补采、增强或域适配实验。""",
        "key_points": ["真实线路小裂纹召回下降", "优先验证域偏移", "先错误分析再改模型", "漏检样本需人工复核"],
        "actions": [
            {"title": "按尺寸线路工况输出召回分桶", "assignee": "陈晨", "due": "2026-08-11", "priority": "high", "status": "in_progress"},
            {"title": "人工复核三十个裂纹漏检样本", "assignee": "王博", "due": "2026-08-12", "priority": "high", "status": "pending"},
            {"title": "对比训练集与真实线路数据分布", "assignee": "陈晨", "due": "2026-08-13", "priority": "high", "status": "pending"},
        ],
        "risks": [
            {"description": "未定位根因就更换模型导致实验成本浪费", "severity": "high", "mitigation": "先完成分桶诊断和漏检复核，评审通过后再开结构实验"},
            {"description": "真实线路样本与训练数据元数据字段不一致", "severity": "medium", "mitigation": "统一线路、相机、天气、清晰度和目标尺寸字段"},
        ],
        "decisions": [
            {
                "title": "先验证域偏移再开展模型结构实验",
                "context": "漏检集中于新线路、低照度和运动模糊场景，尚不能证明模型容量不足。",
                "snippet": "先做诊断、补集和针对性增强，不先换骨干网络。",
                "chosen_option": "先做域偏移诊断",
                "reasons": ["避免低收益结构试验", "让后续增强对应明确失效因素"],
                "objections": [{"from": "王博", "content": "诊断会推迟新模型尝试约一周"}],
                "decided_by": ["周老师", "陈晨", "王博"],
                "confidence": 0.88,
                "options": [
                    {"name": "先做域偏移诊断", "pros": ["根因可解释"], "cons": ["延后一周结构实验"], "proposed_by": "周老师", "is_chosen": True},
                    {"name": "立即更换骨干网络", "pros": ["可快速试新结构"], "cons": ["无法解释收益来源"], "proposed_by": "王博", "is_chosen": False},
                ],
            },
        ],
    },
]


KNOWLEDGE_DOCS = [
    {
        "title": "受电弓与弓网燃弧数据标注手册",
        "category": "数据标注",
        "content": """# 受电弓与弓网燃弧数据标注手册

标注对象包括受电弓弓头、滑板裂纹、接触线附近燃弧和可见异常。燃弧按事件记录开始帧、结束帧、持续时间、工况与置信等级。单帧反光、遮挡和边界不清样本进入疑难池，由两名标注者独立复核。滑板小裂纹同时保留框、最短边像素长度和是否可辨认字段。""",
    },
    {
        "title": "弓网视觉检测数据划分与评价协议 v1.2",
        "category": "实验协议",
        "content": """# 数据划分与评价协议

训练集、验证集和测试集按车次、运行区段和原始视频 ID 分组，相邻帧不得跨集合。保留独立线路作为外部测试集。报告 mAP、Precision、Recall，并在固定误报约束下比较 Recall。所有表格必须同时给出样本量、数据版本和置信区间；演示阈值不是论文结论。""",
    },
    {
        "title": "困难工况测试矩阵规范",
        "category": "模型评估",
        "content": """# 困难工况测试矩阵

测试矩阵覆盖夜间、逆光、雨雪、隧道切换和运动模糊，允许多标签共现。除总体指标外，各工况分别统计样本数、目标尺寸分布、Precision、Recall 和典型失败案例。任何改进都要在冻结总体测试集与外部线路测试集上复核。""",
    },
    {
        "title": "真实线路域偏移诊断清单",
        "category": "错误分析",
        "content": """# 真实线路域偏移诊断清单

当离线验证集与真实线路性能差距扩大时，先比较亮度、对比度、模糊度、相机位姿、线路、天气、背景复杂度和裂纹像素尺寸分布。按尺寸、线路与工况对召回率分桶，人工复核漏检样本并区分分辨率不足、域偏移、标注噪声。确认偏移因素后再选择补采、针对性增强或域适配。""",
    },
    {
        "title": "计算机视觉实验复现检查表",
        "category": "实验管理",
        "content": """# 实验复现检查表

每次实验记录代码提交、数据版本、划分清单、随机种子、依赖环境、模型权重、输入尺寸、增强配置、阈值和评估脚本版本。实验结论必须关联对应证据，失败实验也需保留原因，避免组会后重复试错。""",
    },
]


RELATIONS = [
    ("数据集按视频源分组并保留外部线路", "固定误报约束下的召回率作为核心指标", "supports", 0.89),
    ("数据集按视频源分组并保留外部线路", "建立五类困难工况分层测试矩阵", "supports", 0.86),
    ("建立五类困难工况分层测试矩阵", "先验证域偏移再开展模型结构实验", "supports", 0.9),
    ("燃弧采用事件级标注与双人复核", "建立五类困难工况分层测试矩阵", "relates", 0.82),
]


async def seed() -> None:
    async with async_session_factory() as db:
        print("清除旧的作品集测试数据...")
        await db.execute(delete(DecisionRelation))
        await db.execute(delete(DecisionOption))
        await db.execute(delete(Decision))
        await db.execute(delete(Risk))
        await db.execute(delete(ActionItem))
        await db.execute(delete(Summary))
        await db.execute(delete(Transcript))
        await db.execute(delete(Meeting))
        await db.execute(delete(KnowledgeDocument))
        await db.flush()

        now = datetime.now(timezone.utc)
        decisions_by_title: dict[str, Decision] = {}

        for index, dataset in enumerate(MEETINGS):
            meeting_data = dataset["meeting"]
            meeting = Meeting(
                title=meeting_data["title"],
                description=meeting_data["description"],
                participants=meeting_data["participants"],
                status="processed",
                transcription_mode="mock",
                start_time=now - timedelta(days=3 - index, hours=2),
                end_time=now - timedelta(days=3 - index, hours=1),
            )
            db.add(meeting)
            await db.flush()

            for seq_index, (start, speaker, content) in enumerate(dataset["transcripts"]):
                db.add(Transcript(
                    meeting_id=meeting.id,
                    speaker=speaker,
                    content=content,
                    start_time=float(start),
                    end_time=float(start + 10),
                    seq_index=seq_index,
                ))

            db.add(Summary(
                meeting_id=meeting.id,
                content=dataset["summary"],
                key_points=dataset["key_points"],
                status="completed",
            ))

            for item in dataset["actions"]:
                db.add(ActionItem(
                    meeting_id=meeting.id,
                    title=item["title"],
                    assignee=item["assignee"],
                    due_date=date.fromisoformat(item["due"]),
                    priority=item["priority"],
                    status=item["status"],
                ))

            for risk in dataset["risks"]:
                db.add(Risk(meeting_id=meeting.id, **risk))

            for data in dataset["decisions"]:
                options = data.pop("options")
                decision = Decision(
                    meeting_id=meeting.id,
                    decided_at=meeting.end_time,
                    **data,
                )
                data["options"] = options
                db.add(decision)
                await db.flush()
                decisions_by_title[decision.title] = decision
                for option in options:
                    db.add(DecisionOption(decision_id=decision.id, **option))

            await knowledge_service.index_meeting_summary(
                db,
                meeting.id,
                meeting.title,
                dataset["summary"],
            )
            print(f"  已创建：{meeting.title}")

        for source_title, target_title, relation_type, score in RELATIONS:
            source = decisions_by_title[source_title]
            target = decisions_by_title[target_title]
            db.add(DecisionRelation(
                source_decision_id=source.id,
                target_decision_id=target.id,
                relation_type=relation_type,
                context="由实验前置条件与证据链关联",
                similarity_score=score,
            ))

        for doc in KNOWLEDGE_DOCS:
            await knowledge_service.index_text(
                db,
                title=doc["title"],
                content=doc["content"],
                source_type="uploaded_doc",
                metadata={
                    "filename": f"{doc['title']}.md",
                    "category": doc["category"],
                    "portfolio_demo": True,
                },
            )
            print(f"  已索引：{doc['title']}")

        await db.commit()
        print(f"\n完成：{len(MEETINGS)} 场科研组会，{len(decisions_by_title)} 条决策，{len(KNOWLEDGE_DOCS)} 篇资料")


if __name__ == "__main__":
    asyncio.run(seed())
