# 研会智策 · AI 组会决策助手

> 面向研究生课题组的 **组会决策提取与研究证据检索平台**。上传腾讯会议录音或导出的文字记录 → 统一生成会议原文 → Multi-Agent 并行提取纪要/实验行动项/研究决策 → 人工编辑确认 → 决策入库向量化 → 课题问答双路 RAG 召回。

![Portfolio](https://img.shields.io/badge/status-portfolio--ready-087f73) ![React](https://img.shields.io/badge/React-19-149eca) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688) ![LangGraph](https://img.shields.io/badge/Agent-LangGraph-d85f45)

## 作品集导览

- **直接演示**：只启动前端即可体验全站 Demo，包括录音转写、文字记录导入、纪要编辑、实验行动项、决策追溯、课题问答、资料库和决策人工确认，不依赖 API、数据库或模型 Key。
- **完整链路**：启动 PostgreSQL、Redis 和 FastAPI 后，可演示录音转写、文字记录解析、Agent 处理、决策库、RAG 问答与运行监控。
- **产品案例**：见 [`PORTFOLIO_CASE.md`](./PORTFOLIO_CASE.md)，包含问题洞察、北极星指标、产品取舍和下一步验证。
- **面试脚本**：见 [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md)，可按 5 分钟节奏演示。
- **逐页测试**：见 [`TEST_CASES.md`](./TEST_CASES.md)，覆盖所有页面、深链和状态更新。
- **缺口清单**：见 [`SUBMISSION_CHECKLIST.md`](./SUBMISSION_CHECKLIST.md)，区分必需环境、AI 配置和面试加分材料。

> 首页指标是用于说明产品体验的演示数据；案例文档中的目标指标是待真实试点验证的假设，不代表已上线成绩。

---

## 核心能力

### 离线组会处理链路

```
腾讯会议录音（ASR）或文字记录（TXT / MD / DOCX / PDF）
         → 统一解析为原文片段（含说话人 + 时间戳）
         → Multi-Agent 并行（LangGraph）
            ├─ 摘要 Agent        → Summary
            ├─ 行动项 Agent      → ActionItem[]
            └─ 决策抽取 Agent    → Decision[]（两步流水线）
         → 落库 + 决策向量化 + 即时关联 top-3 历史决策
```

### 决策抽取两步流水线

| 步骤 | 节点 | 职责 |
|------|------|------|
| Step 1 | `DecisionDetector` | LLM 全量扫描会议原文，定位决策段（区分 决策/提议/推迟），`confidence ≥ 0.7` 过滤 |
| Step 2 | `OptionExtractor` | 对每个决策段结构化抽取：标题 / 背景 / 候选方案（含 pros/cons）/ 已选方案 / 理由 / 反对意见 / 决策人 |

### Harness 约束框架

每个 Agent 节点由 `harness_wrap` 包裹，提供：

- **BudgetGuard** — Token / 成本预算，超限抛 `BudgetExceededError`
- **CircuitBreaker** — 连续失败熔断
- **RetryPolicy** — 可配置重试次数与退避
- **OutputValidator** — 结构化校验 + 回灌重试
- **AgentRun** — 节点耗时 / Token / 成本 / Tool 调用全生命周期记录

ContextVar 跨节点传递 `run_id` / `budget_guard`，不侵入 LangGraph state。

### 双路 RAG 召回

AI 对话同时检索研究资料与结构化决策，并将来源作为可点击证据返回：

```
用户提问
  ├─ 文档路：knowledge_service.search()（纪要 + 知识文档，向量 + 全文 + RRF）
  └─ 决策路：decision_graph_service.search()（决策库 pgvector 语义检索）
  → 扩大候选召回 → RRF 融合 → Rerank → overlap 去重 → top-5
  → LLM 流式输出（SSE）+ 可点击回到原决策/纪要/资料的证据卡
```

---

## 技术栈

### 后端

| 领域 | 技术 |
|---|---|
| Web 框架 | FastAPI 0.115 + Uvicorn |
| 数据库 | PostgreSQL 16 + pgvector（cosine, ivfflat, 1024 维） |
| ORM | SQLAlchemy 2.0（async）+ Alembic |
| 缓存 | Redis 7 |
| Agent 编排 | LangGraph 0.2（StateGraph + 条件路由 + 并行 fan-out） |
| LLM | OpenAI 兼容网关；文本 gpt-5.4-mini，图片 gpt-5.4 |
| RAG 检索 | 可选 pgvector；当前供应商无 Embedding 时降级为中文多关键词检索 |
| 文档解析 | pypdf / python-docx |

### 前端

| 领域 | 技术 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 服务端状态 | TanStack Query 5 |
| UI 状态 | Zustand 5 |
| 路由 | React Router 7（懒加载） |
| 样式 | Tailwind CSS 4 |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| 流式通信 | @microsoft/fetch-event-source（SSE） |
| 虚拟滚动 | @tanstack/react-virtual |

### 基础设施

| 领域 | 技术 |
|---|---|
| 容器化 | Docker Compose（PostgreSQL + pgvector + Redis） |
| 向量数据库 | pgvector（PostgreSQL 扩展） |

---

## 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                           前端（React）                           │
│  会议管理 │ 纪要详情 │ 决策库 │ AI 对话 │ 知识库 │ Agent 监控     │
└──────────────┬───────────────────────────────────┬───────────────┘
               │ HTTP / SSE                         │
┌──────────────▼───────────────────────────────────▼───────────────┐
│                        后端（FastAPI）                            │
├───────────┬───────────┬───────────┬───────────┬──────────────────┤
│ meetings  │ summaries │ decisions │   chat    │  agent_runs API  │
├───────────┴───────────┴───────────┴───────────┴──────────────────┤
│                         Service Layer                             │
│  MeetingRecordService（文件解析 + 产出编排）                    │
│  TranscriptionService（DashScope ASR + Mock 降级）               │
│  SummaryService │ DecisionGraphService │ ChatService              │
│  KnowledgeService（向量 + 全文 + RRF）│ EmbeddingService          │
├──────────────────────────────────────────────────────────────────┤
│                  Multi-Agent（LangGraph v2）                      │
│  [planner] → [budget_check] → fan-out（动态路由）                 │
│    ├─ summary_agent      ┐                                        │
│    ├─ action_items_agent │ 并行（套 Harness）                     │
│    └─ decision_extractor ┘                                        │
│  → [output_validator] → [persist]                                  │
│  → 决策详情页人工编辑并确认（Human-in-the-loop）             │
├──────────────────────────────────────────────────────────────────┤
│                    决策抽取两步流水线                              │
│  DecisionDetector（全量扫描定位）→ OptionExtractor（结构化抽取）  │
├──────────────────────────────────────────────────────────────────┤
│                    双路 RAG 召回（AI 对话）                       │
│  文档路（knowledge_service）+ 决策路（decision_graph_service）     │
│  → RRF 融合 → top-5 上下文 → LLM 流式输出                         │
└──────────────┬───────────────────────────────────┬───────────────┘
               │                                    │
┌──────────────▼──────────────────┐ ┌──────────────▼───────────────┐
│   PostgreSQL + pgvector         │ │           Redis              │
│ meetings / transcripts /        │ │                               │
│ summaries / action_items /      │ │                               │
│ decisions / decision_options /  │ │                               │
│ decision_relations /            │ │                               │
│ knowledge_documents /           │ │                               │
│ agent_runs / chat_sessions      │ │                               │
└─────────────────────────────────┘ └──────────────────────────────┘
```

---

## 项目结构

```
yuan-meet/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── harness/              # Harness 约束框架
│   │   │   │   ├── budget.py         # BudgetGuard（Token/成本预算）
│   │   │   │   ├── circuit_breaker.py# CircuitBreaker（熔断）
│   │   │   │   ├── retry.py          # RetryPolicy（重试退避）
│   │   │   │   ├── validator.py      # OutputValidator（结构校验）
│   │   │   │   └── wrap.py           # harness_wrap 装饰器 + ContextVar
│   │   │   ├── nodes/
│   │   │   │   ├── planner.py        # Planner（会议类型识别 + 动态调度）
│   │   │   │   ├── budget_check.py   # 文本压缩 + 预算预检
│   │   │   │   ├── decision_detector.py  # Step 1：决策段定位
│   │   │   │   ├── option_extractor.py   # Step 2：结构化选项抽取
│   │   │   │   ├── decision_extractor.py # 两步流水线组合节点
│   │   │   │   ├── output_validator.py   # 校验 + 回灌重试
│   │   │   │   └── human_review.py       # 关键结论人工审批
│   │   │   ├── tools/                # Tool Registry（Agent 工具调用）
│   │   │   ├── meeting_graph.py      # v1 基础图（保留对照）
│   │   │   └── meeting_graph_v2.py   # v2 Harness 版（四路并行）
│   │   ├── api/
│   │   │   ├── meetings.py           # 会议 CRUD + 录音/文字记录导入
│   │   │   ├── summaries.py          # 纪要生成 + 行动项
│   │   │   ├── decisions.py          # 决策库（列表/详情/搜索）
│   │   │   ├── chat.py               # AI 对话（SSE 流式）
│   │   │   ├── knowledge.py          # 知识库检索 + 文档管理
│   │   │   ├── agent_runs.py         # Agent 运行监控 + 审批
│   │   │   └── rooms.py              # 实时房间（MVP 未启用）
│   │   ├── services/
│   │   │   ├── meeting_record_service.py  # TXT / MD / DOCX / PDF 解析与产出编排
│   │   │   ├── transcription_service.py   # 录音转写（DashScope + Mock 降级）
│   │   │   ├── dashscope_asr_service.py   # DashScope Paraformer 文件识别
│   │   │   ├── oss_service.py             # ASR 文件公网 URL 中转
│   │   │   ├── summary_service.py         # Agent 工作流协调 + 落库
│   │   │   ├── decision_graph_service.py  # 决策入库 + 向量关联 + 检索
│   │   │   ├── chat_service.py            # AI 对话（双路 RAG + RRF）
│   │   │   ├── knowledge_service.py       # 知识检索（向量 + 全文 + RRF）
│   │   │   ├── embedding_service.py       # 文本向量化
│   │   │   ├── agent_run_service.py       # AgentRun 生命周期
│   │   │   ├── document_parser.py         # 文档解析（PDF/DOCX）
│   │   │   └── document_chunker.py        # 文档分块
│   │   ├── models/
│   │   │   ├── decision.py           # Decision / DecisionOption / DecisionRelation
│   │   │   ├── agent_run.py          # AgentRun（含 steps / node_usage）
│   │   │   ├── meeting.py / transcript.py / summary.py
│   │   │   ├── action_item.py / risk.py
│   │   │   ├── knowledge_doc.py / chat.py
│   │   │   └── room.py / realtime_session.py（MVP 未启用）
│   │   ├── schemas/                  # Pydantic 响应模型
│   │   ├── db/                       # 数据库连接
│   │   └── config.py                 # 配置管理
│   ├── alembic/versions/             # 数据库迁移
│   ├── scripts/                      # 测试脚本
│   ├── seed_data.py                  # 示例数据
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── features/
│       │   ├── meetings/             # 会议管理（列表/详情/录音转写/文字记录导入）
│       │   ├── summaries/            # 纪要（列表/详情/行动项）
│       │   ├── decisions/            # 决策库（列表/详情/语义搜索/分页）
│       │   ├── chat/                 # AI 对话（流式 + 虚拟滚动）
│       │   ├── knowledge/            # 知识库（上传/检索/管理）
│       │   └── agent-runs/           # Agent 监控（统计/步骤/审批）
│       ├── components/
│       │   ├── layout/               # AppLayout / Sidebar / Header
│       │   └── ui/                   # Button / Card / Badge / Markdown 等
│       ├── api/                      # ky HTTP 客户端
│       ├── hooks/                    # 虚拟列表 / 语音
│       ├── lib/                      # constants / utils / query-client
│       ├── router/                   # 路由配置（懒加载）
│       └── types/                    # TypeScript 类型定义
├── sfu/                              # mediasoup SFU（MVP 未启用）
├── docker-compose.yml                # PostgreSQL + pgvector + Redis
└── README.md
```

---

## 数据模型

### 决策三表（核心）

```
decisions
├─ id (UUID, PK)
├─ meeting_id (FK → meetings)
├─ title (varchar 50)
├─ context / snippet (text)
├─ chosen_option (varchar 30)
├─ reasons / decided_by / objections (JSONB)
├─ decided_at / confidence
├─ embedding (vector(1024), ivfflat cosine)
└─ created_at

decision_options
├─ id (UUID, PK)
├─ decision_id (FK → decisions, CASCADE)
├─ name / pros / cons / proposed_by
└─ is_chosen (bool)

decision_relations
├─ source_decision_id (FK → decisions)
├─ target_decision_id (FK → decisions)
├─ relation_type (default 'relates')
├─ similarity_score (float)
└─ UNIQUE(source, target)
```

### 其他核心表

`meetings` / `transcripts` / `summaries` / `action_items` / `risks` / `knowledge_documents` / `agent_runs` / `chat_sessions` / `chat_messages`

---

## 快速开始

### 环境要求

- Python 3.11–3.12（后端）
- Node.js 20+
- Docker（用于 PostgreSQL + Redis）

### 0. 全站作品集 Demo（无需 API Key）

```bash
cd frontend
npm ci
npm run dev
```

访问 http://localhost:5173。`VITE_DEMO_MODE` 默认开启，所有业务页面都使用浏览器本地数据并可交互；修改会持久化到 `localStorage`，可用页头的“重置 Demo 数据”恢复初始状态。

要连接真实后端，在 `frontend/.env` 中设置：

```bash
VITE_DEMO_MODE=false
```

### 1. 启动基础设施

```bash
docker compose up -d
```

### 2. 后端启动

```bash
cd backend

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 OpenAI 兼容网关配置

# 数据库迁移
PYTHONPATH=. alembic upgrade head

# 灌入示例数据（可选）
python seed_data.py

# 启动服务
uvicorn app.main:app --reload --port 8787
```

### 3. 前端启动

```bash
cd frontend
npm install
npm run dev
```

### 4. 访问应用

- 前端：http://localhost:5173
- API 文档：http://localhost:8787/docs

---

## 配置说明

编辑 `backend/.env`：

```bash
# 数据库
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/yuan_meet

# LLM（OpenAI 兼容接口）
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://your-provider.example/v1
LLM_MODEL=gpt-5.4-mini
VISION_MODEL=gpt-5.4
EMBEDDING_ENABLED=false
EMBEDDING_MODEL=text-embedding-v3
EMBEDDING_DIMENSIONS=1024

# 录音转写
TRANSCRIPTION_PROVIDER=auto
TRANSCRIPTION_MODEL=paraformer-v2
# DASHSCOPE_API_KEY=your-dashscope-key
# OSS_ACCESS_KEY_ID=
# OSS_ACCESS_KEY_SECRET=
# OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
# OSS_BUCKET_NAME=

```

**零配置快速体验**：默认前端使用本地 Demo 数据，问答会以预置研究上下文模拟流式输出，不会调用模型或产生费用。切换 `VITE_DEMO_MODE=false` 并配置 OpenAI 兼容网关后，问答使用 `gpt-5.4-mini`，支持 SSE 流式输出、多轮上下文、历史会话管理和双路 RAG 来源回传；带图片时切换到 `gpt-5.4`。当前接入方没有 Embedding 模型，因此本地运行会使用全文与中文多关键词检索；提供独立 Embedding 服务后可重新启用 pgvector 语义召回。

**输入边界**：平台支持两种等价输入。可以上传腾讯会议录音，由 DashScope Paraformer 完成 ASR；也可以直接上传腾讯会议导出的 TXT、Markdown、DOCX 或 PDF。两种输入最终都进入同一套会议原文、纪要、行动项和研究决策整理链路，所有 AI 产出都可以人工编辑后保存。

### 行动项来源与进度口径

- 行动项由 Action Item Agent 从带时间戳和说话人的会议原文中抽取，保存标题、负责人、截止日期、优先级和原文证据。
- 新抽取的行动项初始为“待办”，负责人确认后进入“进行中”，交付验收后进入“已完成”。Demo 中点击状态图标即可依次切换，并记录“当前用户 · 手动更新”。
- 真实产品中由实验负责人在工作台更新；后续可从 MLflow/W&B 实验运行或 GitHub/GitLab 提交状态回写，首页读取同一份行动项状态。
- 不使用 AI 推测完成百分比。没有外部任务数据时，只展示可审计的离散状态，避免制造虚假精度。

---

## API 概览

| 模块 | 端点 | 说明 |
|------|------|------|
| 会议 | `POST /api/meetings` | 创建会议 |
| | `POST /api/meetings/{id}/upload` | 上传录音并自动转写、整理 |
| | `GET /api/meetings/{id}/transcription-status` | 查询录音转写状态 |
| | `GET /api/meetings/{id}/audio` | 播放已上传录音 |
| | `POST /api/meetings/{id}/record-upload` | 上传 TXT / MD / DOCX / PDF 会议文字记录并自动整理 |
| | `GET /api/meetings/{id}/transcripts` | 获取会议原文片段 |
| | `GET /api/meetings/{id}/processing-status` | 查询纪要、行动项和研究决策整理状态 |
| 纪要 | `POST /api/meetings/{id}/summarize` | 触发 Multi-Agent |
| | `GET /api/meetings/{id}/summary` | 获取纪要 + 行动项 |
| | `PATCH /api/meetings/{id}/summary` | 保存人工校对后的纪要 |
| 决策 | `GET /api/decisions` | 决策列表（分页 + 按会议筛选） |
| | `GET /api/decisions/search?q=` | 语义搜索 |
| | `GET /api/decisions/{id}` | 决策详情（含 options + 关联决策） |
| | `PATCH /api/decisions/{id}` | 保存并确认人工编辑后的研究决策（含候选方案名称、优缺点、提出人和选中状态） |
| 对话 | `POST /api/chat/sessions` | 创建会话 |
| | `POST /api/chat/sessions/{id}/messages/stream` | 流式对话（SSE） |
| Agent | `GET /api/agent-runs` | 运行列表 |
| | `GET /api/agent-runs/{id}` | 运行详情（steps + budget） |
| | `POST /api/agent-runs/{id}/review` | 审批（approve/reject） |
| 知识 | `GET /api/knowledge/search?q=` | 知识检索 |
| | `POST /api/knowledge/documents` | 上传文档 |

完整文档：http://localhost:8787/docs

---

## 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 研究驾驶舱 | 组会决策脉络与实验行动项概览 |
| `/meetings` | 组会列表 | 组会与实验复盘管理入口 |
| `/meetings/:id` | 组会详情 | 录音转写、文字记录、会议原文与整理产出 |
| `/summaries` | 纪要列表 | 所有组会研究纪要 |
| `/summaries/:id` | 纪要详情 | 可编辑研究结论 + 实验行动项 |
| `/decisions` | 研究决策库 | 方案、证据、异议的语义搜索与分页 |
| `/decisions/:id` | 决策详情 | 候选实验方案 + 理由 + 异议 + 原文证据 |
| `/chat` | 课题问答 | 研究资料与历史决策双路 RAG |
| `/knowledge` | 研究资料库 | 实验协议、标注规范与论文笔记上传检索 |
| `/agent-runs` | Agent 监控 | 运行统计 + 列表 |
| `/agent-runs/:id` | 运行详情 | 步骤 / 预算 / Tool 调用 / 审批 |

---

## License

MIT
