import type {
  ActionItem,
  AgentRun,
  ChatMessage,
  ChatSession,
  DailyQuestion,
  DecisionDetail,
  GrowthToday,
  KnowledgeDocument,
  Meeting,
  PracticeAnswer,
  RadarItem,
  Risk,
  Summary,
  Transcript,
} from '@/types'

export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false'
export const DEMO_MEETING_ID = 'meeting-ai-pm-practice'
export const DEMO_DECISION_ID = 'decision-ai-pm-mvp'

const STORAGE_KEY = 'growth-workbench-core-state-v3-focus'
const GROWTH_STORAGE_KEY = 'growth-workbench-demo-state-v10-daily-focus'
const CREATED_AT = '2026-08-13T06:00:00.000Z'

interface DemoState {
  meetings: Meeting[]
  transcripts: Transcript[]
  summaries: Summary[]
  actionItems: ActionItem[]
  risks: Risk[]
  decisions: DecisionDetail[]
  knowledgeDocuments: KnowledgeDocument[]
  chatSessions: ChatSession[]
  chatMessages: ChatMessage[]
  agentRuns: AgentRun[]
}

interface GrowthState {
  questions: DailyQuestion[]
  practices: PracticeAnswer[]
  radarItems: RadarItem[]
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const pause = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

const dayKey = (date = new Date()) =>
  Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(date)
      .replaceAll('-', ''),
  )

const rotateByToday = <T>(items: T[], offset = 0): T[] => {
  if (items.length <= 1) return [...items]
  const start = (dayKey() + offset) % items.length
  return [...items.slice(start), ...items.slice(0, start)]
}

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const containsAny = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(normalizeText(keyword)))

const scoreCoverage = (text: string, keywords: string[]) => {
  if (!keywords.length) return 0
  const normalized = normalizeText(text)
  const hits = keywords.filter((keyword) => normalized.includes(normalizeText(keyword))).length
  return hits / keywords.length
}

function scorePracticeAnswer(question: DailyQuestion, answerText: string) {
  const normalized = normalizeText(answerText)
  const lengths = normalized.split(' ').filter(Boolean).length
  const structureKeywords = ['用户', '痛点', '闭环', '方案', '指标', '边界', '迭代', '复盘']
  const productKeywords = [
    ...question.ability_tags,
    ...question.suggested_structure,
    ...(question.scoring_guide?.product_thinking ?? []),
  ]
  const expressionKeywords = ['因为', '所以', '首先', '其次', '最后', '此外', '总结']
  const structureCoverage = scoreCoverage(normalized, [...question.suggested_structure, ...structureKeywords])
  const productCoverage = scoreCoverage(normalized, productKeywords)
  const expressionCoverage = scoreCoverage(normalized, expressionKeywords)
  const lengthBonus = Math.min(10, Math.max(0, Math.round(lengths / 35)))
  const base = 64 + Math.round(structureCoverage * 16) + Math.round(productCoverage * 15) + Math.round(expressionCoverage * 5) + lengthBonus
  const score = Math.max(60, Math.min(95, base))
  return {
    score,
    structure_score: Math.max(60, Math.min(95, Math.round(score * 0.96 + structureCoverage * 4))),
    product_thinking_score: Math.max(60, Math.min(95, Math.round(score * 0.98 + productCoverage * 3))),
    expression_score: Math.max(60, Math.min(95, Math.round(score * 0.94 + expressionCoverage * 6))),
    structureCoverage,
    productCoverage,
    expressionCoverage,
  }
}

const githubRadarItems: RadarItem[] = [
  {
    id: 'radar-github-openai-cookbook',
    title: 'OpenAI Cookbook：用可复用案例理解 Function calling、RAG 与评估',
    source_name: 'GitHub · openai/openai-cookbook',
    source_url: 'https://github.com/openai/openai-cookbook',
    summary:
      'OpenAI Cookbook 收集了大量开发者示例，覆盖结构化输出、函数调用、RAG、评估、向量检索与多模态等方向，适合 AI 产品经理把技术能力转译成产品方案。',
    full_content: `OpenAI Cookbook 是一个适合 AI 产品经理持续阅读的 GitHub 资料源。它不像新闻稿那样只讲产品发布，而是用具体代码样例展示“大模型能力如何落到真实任务链路里”。对求职准备来说，它的价值在于帮助你把抽象概念讲具体：RAG 不是一句“接知识库”，而是包含资料切分、embedding、召回、重排、引用与答案评估；Function calling 不是“让模型调用工具”，而是要定义工具 schema、参数校验、失败重试和人工确认边界。

如果面试官问“你如何判断一个 AI 功能是否只是套壳”，可以用 Cookbook 的视角回答：我会看它是否把模型能力封装进完整任务闭环，例如输入是什么、调用哪些工具、如何检索知识、如何验证结果、失败如何兜底、成本和延迟是否可控。

在本工作台里，这类资料可以沉淀为资料库内容，用于生成每日产品题，也可以作为 AI 问答助手回答技术产品化问题的参考来源。`,
    pm_insight:
      '把 Cookbook 当成“技术能力清单”来读：每个示例都可以追问它解决什么用户问题、需要什么产品边界、指标如何设计。',
    tags: ['大模型产品', 'RAG', 'AI PM'],
    created_at: '2026-08-13T07:30:00.000Z',
    saved_to_knowledge: true,
  },
  {
    id: 'radar-github-langgraph',
    title: 'LangGraph：Agent 产品从单轮问答走向可控工作流',
    source_name: 'GitHub · langchain-ai/langgraph',
    source_url: 'https://github.com/langchain-ai/langgraph',
    summary:
      'LangGraph 强调用图结构组织 Agent 流程，适合解释多 Agent 协作、状态管理、人工确认、失败恢复和可追溯执行轨迹。',
    full_content: `LangGraph 对 AI 产品经理最重要的启发是：Agent 不是“一个万能聊天机器人”，而是一个带状态、步骤和边界的工作流系统。复杂任务通常需要先理解目标，再拆解计划，再调用工具，最后校验结果；其中某些节点还需要人工确认，例如写入数据库、发送消息、删除文件、对外发布等。

这对面试表达很有帮助。你可以说：我不会把 Agent 产品设计成黑盒自动化，而会把它拆成可观察、可控制、可回滚的流程。比如个人成长工作台可以设计三个 Agent 化职责：内容雷达 Agent 负责整理 GitHub/官网热点；题目生成 Agent 负责把热点和知识库转成训练题；答案评估 Agent 负责分析用户回答并生成复盘。三者不一定在 V1.0 就做成完全自主多 Agent，但职责边界要清楚。

落到产品功能，LangGraph 这类框架提示我们关注四件事：流程状态、节点输出、执行日志、人工确认。也就是说，一个 Agent 产品不能只展示最终答案，还要展示它基于什么资料、经过哪些步骤、哪里需要用户确认。`,
    pm_insight:
      '面试讲 Agent 时重点讲“可控执行”：状态管理、步骤拆解、工具调用、人工确认和失败恢复，比单纯说多 Agent 更成熟。',
    tags: ['Agent', '工作流', 'AI PM'],
    created_at: '2026-08-13T07:40:00.000Z',
    saved_to_knowledge: true,
  },
  {
    id: 'radar-github-llamaindex',
    title: 'LlamaIndex：知识库问答的产品关键不是上传，而是资料治理',
    source_name: 'GitHub · run-llama/llama_index',
    source_url: 'https://github.com/run-llama/llama_index',
    summary:
      'LlamaIndex 聚焦数据连接、索引、检索和 Agent 应用，适合用来理解个人知识库、资料检索、引用来源和问答质量评估。',
    full_content: `LlamaIndex 适合用来解释为什么知识库问答不是“把 PDF 丢给大模型”这么简单。一个真正可用的知识库产品，需要处理资料来源、文档解析、切分策略、索引结构、混合检索、重排、引用展示、答案评估和权限边界。

在个人成长工作台中，知识库分成两个板块：资料检索库和练习复盘库。资料检索库存放从 GitHub、官网和行业资料整理来的 AI 热点趋势；练习复盘库存放每天的题目、你的回答、参考答案和解析。这样 AI 问答助手回答问题时，不只是凭通用知识回答，而是能结合你的资料积累和练习记录。

面试时可以这样表达：RAG 的产品价值不是让答案显得更长，而是让回答更贴近用户自己的资料、更可追溯、更容易被纠错和持续优化。`,
    pm_insight:
      '知识库产品要讲“资料治理 + 检索质量 + 引用可追溯 + 反馈闭环”，不要只停留在“支持上传文档”。',
    tags: ['RAG', '知识库', 'AI PM'],
    created_at: '2026-08-13T07:50:00.000Z',
    saved_to_knowledge: true,
  },
  {
    id: 'radar-github-mcp',
    title: 'Model Context Protocol：AI 助手连接外部工具的标准化趋势',
    source_name: 'GitHub · modelcontextprotocol',
    source_url: 'https://github.com/modelcontextprotocol',
    summary:
      'MCP 让 AI 助手以更标准的方式连接外部工具和数据源，产品上可以用于解释工具生态、权限边界和跨应用任务执行。',
    full_content: `Model Context Protocol 体现了 AI 产品的一个趋势：AI 助手不再只是在聊天窗口里回答问题，而是要连接文件、数据库、设计工具、项目管理工具和业务系统。对产品经理来说，这意味着“工具连接能力”会成为 AI 助手体验的一部分。

但工具越多，越要设计权限、确认和可追溯机制。用户需要知道 AI 读取了什么、准备调用什么工具、会不会改写外部数据、如何撤销或确认关键操作。否则，工具调用能力越强，用户的不信任感也可能越强。

在个人成长工作台中，MCP 思路可以作为后续版本方向：未来可以连接日历提醒每日练习、连接浏览器抓取热点、连接文档库沉淀资料。但 V1.0 先做站内闭环，把每日题、AI 点评、资料库和问答助手跑顺。`,
    pm_insight:
      '讲 MCP 时不要只说协议，重点说“AI 助手如何安全连接工具生态”：授权、确认、轨迹、撤销和权限分层。',
    tags: ['Agent', '工具调用', 'AI PM'],
    created_at: '2026-08-13T08:00:00.000Z',
    saved_to_knowledge: true,
  },
  {
    id: 'radar-github-autogen',
    title: 'AutoGen：多 Agent 协作要解决的是分工、通信和质量控制',
    source_name: 'GitHub · microsoft/autogen',
    source_url: 'https://github.com/microsoft/autogen',
    summary:
      'AutoGen 是多 Agent 框架代表之一，适合用来解释多 Agent 产品为什么要拆角色，以及如何做协作、复核和评估。',
    full_content: `AutoGen 对产品经理最有价值的启发不是“Agent 越多越好”，而是多 Agent 只有在任务确实需要不同职责时才有意义。比如一个复杂 AI 工作台里，内容整理、题目生成、答案评估、事实校验可能需要不同的提示词、输入输出和评估标准。

如果面试官问“第一个第二个 Agent 能不能合并”，成熟的回答是：可以合并，关键取决于任务复杂度和质量要求。V1.0 可以先用一个大模型流程完成题目生成和答案评估；当内容来源变多、用户历史变长、评分维度变复杂时，再拆成多个子 Agent，分别优化召回、生成、评估和复核。

因此，本工作台可以把三 Agent 作为产品架构表达：内容雷达 Agent、题目生成 Agent、答案评估 Agent。但实现上先做 Agent 化流程，避免过度设计。`,
    pm_insight:
      '多 Agent 的面试表达重点是“为什么拆、怎么协作、如何验收质量”，不要把 Agent 数量本身当卖点。',
    tags: ['Agent', '多 Agent', '面试'],
    created_at: '2026-08-13T08:10:00.000Z',
    saved_to_knowledge: true,
  },
  {
    id: 'radar-github-vercel-ai',
    title: 'Vercel AI SDK：流式输出、多轮会话和前端 AI 体验工程化',
    source_name: 'GitHub · vercel/ai',
    source_url: 'https://github.com/vercel/ai',
    summary:
      'Vercel AI SDK 展示了 AI 应用前端体验的工程化方向，包括流式输出、工具调用、多模态输入和聊天状态管理。',
    full_content: `Vercel AI SDK 对个人成长工作台这类产品很有参考意义，因为用户感知最明显的 AI 能力往往不是模型参数，而是交互体验：回答是否流式出现、历史会话是否保留、追问是否理解上下文、失败时是否给出明确提示、引用来源是否清楚。

在 AI 问答助手中，流式输出能减少等待焦虑；历史会话能帮助用户持续复盘；上下文记忆能让用户追问“那我上一题哪里没讲好”；引用知识库能让回答不只停留在泛泛建议。

面试时可以把这类能力总结为：AI 产品体验需要同时关注模型能力、前端交互、状态管理和用户信任。`,
    pm_insight:
      'AI 问答助手优化不只靠换模型，还要做流式输出、历史会话、上下文记忆、引用来源和错误兜底。',
    tags: ['大模型产品', '问答助手', 'AI PM'],
    created_at: '2026-08-13T08:20:00.000Z',
    saved_to_knowledge: true,
  },
  {
    id: 'radar-github-smolagents',
    title: 'smolagents：轻量 Agent 框架说明“够用的自动化”比堆复杂架构更重要',
    source_name: 'GitHub · huggingface/smolagents',
    source_url: 'https://github.com/huggingface/smolagents',
    summary:
      'smolagents 强调用更轻量的方式构建工具调用型 Agent，适合用来讨论 AI PM 如何判断 Agent 产品是否需要复杂编排。',
    full_content: `smolagents 对 AI 产品经理的启发是：不是所有 Agent 产品都需要一上来做复杂多 Agent 编排。很多个人效率、学习复盘、资料整理类场景，先把“输入-工具-输出-确认”的闭环做稳，比堆很多 Agent 名词更重要。

对个人成长工作台来说，V1.0 可以先做轻量流程：读取资料和热点，生成一道题，用户作答，AI 评分并保存复盘。等用户资料量变多、题目类型变复杂、评分需要多维校验时，再拆出更清晰的 Agent 协作。

面试中可以这样表达：Agent 产品设计不是越复杂越好，而是要看任务是否需要状态、工具、外部数据、人工确认和失败恢复。`,
    pm_insight:
      '讲 Agent 落地时可以强调“先流程闭环，后复杂编排”：MVP 不过度设计，但保留可扩展的 Agent 化职责。',
    tags: ['Agent', 'MVP', 'AI PM'],
    created_at: '2026-08-14T08:20:00.000Z',
    saved_to_knowledge: false,
  },
  {
    id: 'radar-github-rag-evals',
    title: 'RAG 评估：知识库问答要从“能回答”走向“答得准、可追溯”',
    source_name: 'GitHub · RAG eval examples',
    source_url: 'https://github.com/explodinggradients/ragas',
    summary:
      'RAG 评估关注答案相关性、上下文召回、忠实度和引用质量，适合解释知识库问答助手后续如何优化。',
    full_content: `RAG 产品常见误区是只做上传和问答，不做评估。真正影响体验的是：系统有没有召回正确资料，答案有没有忠实于资料，引用是否能点回原文，用户反馈能否沉淀为下一轮优化。

在 AI PM 成长助手里，知识库包括 AI 热点资料、上传资料和练习复盘。如果用户问“我上次回答哪里不好”，系统应该召回最近练习记录；如果问“为什么要做 RAG”，系统应该召回 RAG 相关资料和产品化说明。后续版本可以用命中率、引用准确率、用户采纳率来评估问答质量。

这能让作品集从“接了大模型”升级为“我知道如何评估 AI 功能质量”。`,
    pm_insight:
      'AI 问答助手的优化重点不是只换更强模型，还要设计检索评估、引用可信度和用户反馈闭环。',
    tags: ['RAG', '评估', '问答助手'],
    created_at: '2026-08-14T08:30:00.000Z',
    saved_to_knowledge: false,
  },
]

const questions: DailyQuestion[] = [
  {
    id: 'question-ai-pm-onboarding',
    title: '如果你负责一个 AI 面试助手，如何设计它的 MVP？',
    background: '目标用户是准备 AI 产品经理面试的学生或转岗求职者。他们有大量资料和项目经历，但缺少持续练习、反馈和结构化复盘。',
    ability_tags: ['需求拆解', 'MVP 定义', 'AI 产品理解', '指标设计'],
    source_ids: ['radar-github-openai-cookbook', 'radar-github-vercel-ai'],
    suggested_structure: ['先说明目标用户和核心痛点', '定义 V1.0 最小闭环', '说明 AI 能力边界和人工确认机制', '给出衡量效果的指标'],
    scoring_guide: {
      structure: ['是否按用户-痛点-方案-指标-边界展开', '是否有清晰的分层和顺序', '是否能用一句话总结主结论'],
      product_thinking: ['是否讲清为什么做这个而不是别的', '是否能把 AI 能力映射成产品价值', '是否有指标和迭代思路'],
      expression: ['表达是否具体、简洁、可复述', '是否避免空泛口号', '是否有面试可直接复用的话术'],
    },
    status: 'answered',
    created_at: '2026-08-13T08:00:00.000Z',
  },
  {
    id: 'question-rag-value',
    title: '面试官问“为什么这个产品需要 RAG，而不是直接问大模型”，你会怎么回答？',
    background: '请结合 AI 产品经理日常学习和面试准备场景，说明知识库、历史练习记录、资讯内容对回答质量的价值。',
    ability_tags: ['RAG', '技术产品化', '回答结构', '面试表达'],
    source_ids: ['radar-github-llamaindex', 'radar-github-openai-cookbook'],
    suggested_structure: ['先解释直接问大模型的问题', '再解释知识库增强的价值', '最后结合产品场景举例'],
    scoring_guide: {
      structure: ['是否先讲问题，再讲方案，最后落到场景', '是否有对比关系', '是否能形成完整结论'],
      product_thinking: ['是否解释 RAG 的产品价值', '是否说明知识库如何降低幻觉', '是否能结合用户场景而不只讲技术'],
      expression: ['是否容易在面试中直接说出来', '是否有清晰的因果表达', '是否语言过于泛化'],
    },
    status: 'new',
    created_at: '2026-08-13T08:00:00.000Z',
  },
  {
    id: 'question-agent-feedback',
    title: '复杂问题下，AI 问答助手如何理解用户真正意图？',
    background: '用户可能一次问多个问题、问题描述不完整，或者希望 AI 结合历史练习给出个性化建议。',
    ability_tags: ['上下文记忆', '复杂问题理解', '问答体验', 'Agent 协作'],
    source_ids: ['radar-github-langgraph', 'radar-github-autogen'],
    suggested_structure: ['拆分复杂问题类型', '说明上下文记忆如何参与', '设计追问与澄清机制', '给出效果评估指标'],
    scoring_guide: {
      structure: ['是否先分类问题，再给方案', '是否说明处理链路', '是否把追问和澄清讲清楚'],
      product_thinking: ['是否考虑多轮对话和历史上下文', '是否能说明复杂问题的兜底方式', '是否有评估理解质量的指标'],
      expression: ['是否能让人听懂而不是听专业术语', '是否有可执行的产品建议', '是否能落到用户体验'],
    },
    status: 'new',
    created_at: '2026-08-12T08:00:00.000Z',
  },
  {
    id: 'question-rag-evaluation',
    title: '如何评估一个知识库问答助手回答得好不好？',
    background: '你的 AI PM 成长助手可以基于资料库和练习复盘回答问题，但需要证明它不是泛泛回答，而是真的命中了用户资料。',
    ability_tags: ['RAG 评估', '指标设计', '问答助手', '用户反馈'],
    source_ids: ['radar-github-rag-evals', 'radar-github-llamaindex'],
    suggested_structure: ['先定义好答案的标准', '拆成检索质量、生成质量和用户反馈三层指标', '说明 badcase 如何沉淀', '给出后续优化路径'],
    scoring_guide: {
      structure: ['是否把评估拆成多层', '是否有指标和样例', '是否说明持续优化机制'],
      product_thinking: ['是否关注引用准确率和用户采纳', '是否能说明 badcase 价值', '是否避免只说满意度'],
      expression: ['是否能用简单语言讲清评估框架', '是否有产品经理视角', '是否能落到版本迭代'],
    },
    status: 'new',
    created_at: '2026-08-14T08:10:00.000Z',
  },
]

const practices: PracticeAnswer[] = [
  {
    id: 'practice-ai-pm-onboarding',
    question_id: 'question-ai-pm-onboarding',
    answer_text: '我会先做每日题目、知识库和 AI 点评，先不做复杂推送。核心是让用户每天练一道题，并得到结构化反馈。',
    transcript_text: '我会先做每日题目、知识库和 AI 点评，先不做复杂推送。核心是让用户每天练一道题，并得到结构化反馈。',
    score: 82,
    structure_score: 84,
    product_thinking_score: 80,
    expression_score: 82,
    strengths: ['能抓住最小闭环：题目、作答、点评、复盘', '知道先砍掉外部推送等非核心能力'],
    weaknesses: ['对目标用户分层不够清楚', '缺少衡量训练效果的指标'],
    suggestions: ['补充“基础用户/进阶用户”的差异', '用完成率、复练率、回答分数提升幅度衡量效果'],
    reference_answer:
      '我会把 V1.0 定义为“每日产品题 + 语音/文字作答 + AI 结构化点评 + 历史复盘 + 资料库问答”。它先解决用户无法持续练习和缺少即时反馈的问题。知识库和 AI 热点资料作为题目生成与回答点评的材料来源，外部推送、长期训练计划和点赞点踩放到后续版本。',
    created_at: '2026-08-13T09:20:00.000Z',
  },
]

function buildPracticeReviewContent(question: DailyQuestion, practice: PracticeAnswer) {
  return [
    `题目：${question.title}`,
    '',
    `题目背景：${question.background}`,
    '',
    `考察能力：${question.ability_tags.join('、')}`,
    '',
    `推荐作答结构：\n${question.suggested_structure.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
    '',
    `我的回答：\n${practice.transcript_text}`,
    '',
    `评分：综合 ${practice.score}；逻辑结构 ${practice.structure_score}；产品思维 ${practice.product_thinking_score}；表达清晰度 ${practice.expression_score}`,
    '',
    `回答优点：\n${practice.strengths.map((item) => `- ${item}`).join('\n')}`,
    '',
    `需要优化：\n${practice.weaknesses.map((item) => `- ${item}`).join('\n')}`,
    '',
    `改进建议：\n${practice.suggestions.map((item) => `- ${item}`).join('\n')}`,
    '',
    `正确答案 / 参考答案：\n${practice.reference_answer}`,
    '',
    `答案解析：这道题主要考察 ${question.ability_tags.join('、')}。完整回答需要覆盖“用户场景-核心痛点-AI 能力-产品边界-效果指标-风险兜底”。`,
  ].join('\n')
}

const defaultGrowthState: GrowthState = {
  questions,
  practices,
  radarItems: githubRadarItems,
}

function buildKnowledgeDocuments(): KnowledgeDocument[] {
  const radarDocs: KnowledgeDocument[] = githubRadarItems.map((item) => ({
    id: `knowledge-${item.id}`,
    title: item.title,
    source_type: 'radar_item',
    source_id: item.id,
    content: `${item.full_content || item.summary}\n\n产品经理视角：${item.pm_insight}\n\n来源：${item.source_name}\n${item.source_url}`,
    metadata: { source_name: item.source_name, source_url: item.source_url, tags: item.tags },
    created_at: item.created_at,
  }))

  const practiceDocs: KnowledgeDocument[] = practices.map((practice) => {
    const question = questions.find((item) => item.id === practice.question_id) || questions[0]
    return {
      id: `knowledge-${practice.id}`,
      title: `练习复盘：${question.title}`,
      source_type: 'practice_record',
      source_id: practice.id,
      content: buildPracticeReviewContent(question, practice),
      metadata: { question_id: question.id, tags: question.ability_tags },
      created_at: practice.created_at,
    }
  })

  return [
    ...radarDocs,
    ...practiceDocs,
    {
      id: 'knowledge-ai-pm-method',
      title: 'AI 产品经理面试表达框架',
      source_type: 'uploaded_doc',
      content:
        '介绍 AI 产品项目时可以按“背景-用户痛点-产品目标-核心流程-AI 能力-数据来源-评估指标-边界与迭代”展开。回答不要只罗列功能，要解释为什么做、怎么验证、哪里需要人工确认。',
      metadata: { tags: ['AI PM', '面试', '表达结构'] },
      created_at: '2026-08-13T08:30:00.000Z',
    },
    {
      id: 'knowledge-rag-prd',
      title: 'RAG 产品化价值说明',
      source_type: 'uploaded_doc',
      content:
        'RAG 的价值是把模型回答绑定到用户自己的资料和最新内容上，降低幻觉，提高可追溯性。产品设计要关注资料上传、解析分块、召回质量、重排、引用来源、答案评估和用户反馈。',
      metadata: { tags: ['RAG', '知识库', 'AI 产品'] },
      created_at: '2026-08-13T08:35:00.000Z',
    },
  ]
}

const defaultState: DemoState = {
  meetings: [
    {
      id: DEMO_MEETING_ID,
      title: 'AI PM 面试练习复盘样例',
      description: '用于演示文字资料上传后，系统如何整理成练习复盘和知识库素材。',
      source_file_name: 'AI产品经理面试练习记录.txt',
      status: 'processed',
      start_time: '2026-08-13T09:00:00.000Z',
      end_time: '2026-08-13T09:25:00.000Z',
      participants: ['我', 'AI 成长助手'],
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
    },
  ],
  transcripts: [
    {
      id: 'transcript-ai-pm-0',
      meeting_id: DEMO_MEETING_ID,
      speaker: '我',
      content: '我想练习一个 AI 面试助手的 MVP 设计题，重点说明为什么先做每日题、点评和复盘。',
      start_time: 0,
      end_time: 30,
      seq_index: 0,
      created_at: CREATED_AT,
    },
    {
      id: 'transcript-ai-pm-1',
      meeting_id: DEMO_MEETING_ID,
      speaker: 'AI 成长助手',
      content: '建议回答时补充目标用户、核心痛点、AI 能力边界和评估指标，不要只讲功能。',
      start_time: 31,
      end_time: 70,
      seq_index: 1,
      created_at: CREATED_AT,
    },
  ],
  summaries: [
    {
      id: 'summary-ai-pm-practice',
      meeting_id: DEMO_MEETING_ID,
      status: 'completed',
      key_points: ['V1.0 先完成每日题、作答、AI 点评和历史复盘闭环', 'AI 问答助手需要结合资料库和练习记录', '后续优化上下文记忆、复杂问题理解和反馈闭环'],
      content:
        '本次复盘围绕 AI 产品经理面试助手 MVP 展开。当前版本重点是每日产品题、语音/文字作答、AI 结构化点评、练习复盘、AI 热点资料库和知识库问答。后续版本重点优化上下文记忆、复杂问题理解、点赞点踩反馈和多 Agent 协作质量。',
      created_at: CREATED_AT,
    },
  ],
  actionItems: [
    {
      id: 'action-practice-context',
      meeting_id: DEMO_MEETING_ID,
      title: '补充 AI 问答助手的上下文记忆需求说明',
      assignee: '我',
      due_date: '2026-08-14',
      priority: 'medium',
      status: 'in_progress',
      created_at: CREATED_AT,
      source: 'ai_extracted',
      evidence: '后续版本重点优化上下文记忆和复杂问题理解。',
      last_updated_by: 'AI 提取 · 可人工确认',
    },
  ],
  risks: [],
  decisions: [
    {
      id: DEMO_DECISION_ID,
      meeting_id: DEMO_MEETING_ID,
      title: 'V1.0 定位为 AI PM 个人成长工作台，而不是会议决策助手',
      context: '用户更希望把作品集方向改成日常面试训练、AI 热点学习和个人知识库问答。',
      snippet: '每天练一道产品题，把 AI 趋势变成面试表达。',
      chosen_option: '个人成长工作台',
      reasons: ['更贴近 AI 产品经理求职场景', '演示闭环比会议决策提取更可靠', '可突出 AI 问答助手和知识库能力'],
      objections: [],
      decided_by: ['我'],
      decided_at: '2026-08-13T09:00:00.000Z',
      confidence: 0.96,
      review_status: 'confirmed',
      reviewed_by: '我',
      reviewed_at: '2026-08-13T09:10:00.000Z',
      created_at: CREATED_AT,
      options: [
        { id: 'option-growth-cockpit', name: '个人成长工作台', pros: ['贴近求职', '日常可用', '容易讲清 AI 产品闭环'], cons: ['需要持续补充题目和资料'], proposed_by: '我', is_chosen: true },
        { id: 'option-meeting-assistant', name: '会议决策助手', pros: ['结构完整'], cons: ['AI 提取决策准确性不稳定'], proposed_by: 'AI', is_chosen: false },
      ],
      related_decisions: [],
    },
  ],
  knowledgeDocuments: buildKnowledgeDocuments(),
  chatSessions: [
    {
      id: 'chat-growth-demo',
      title: 'AI PM 成长问答',
      created_at: CREATED_AT,
    },
  ],
  chatMessages: [
    {
      id: 'message-growth-welcome',
      session_id: 'chat-growth-demo',
      role: 'assistant',
      content: '你好，我是 AI PM 成长助手。你可以问我：今天的题目考察什么能力、我上次回答哪里不好、最近 GitHub 上有哪些 AI 产品趋势、为什么这个产品需要 RAG。',
      created_at: CREATED_AT,
    },
  ],
  agentRuns: [
    {
      id: 'run-growth-review-demo',
      meeting_id: DEMO_MEETING_ID,
      graph_name: 'growth_workbench_flow_v1',
      status: 'succeeded',
      current_node: null,
      started_at: '2026-08-13T09:00:00.000Z',
      finished_at: '2026-08-13T09:00:28.000Z',
      max_tokens: 16000,
      max_cost_usd: 0.2,
      input_tokens: 2800,
      output_tokens: 1600,
      total_tokens: 4400,
      total_cost_usd: 0.018,
      plan: {
        meeting_type: 'review',
        should_run_summary: true,
        should_run_actions: true,
        should_run_risks: false,
        should_run_decisions: false,
        needs_human_review: false,
        transcript_strategy: 'compressed',
        estimated_tokens: 4200,
        reason: '演示个人成长工作台的题目生成、答案评估和资料沉淀流程。',
      },
      steps: [
        { node: 'content_radar_agent', status: 'succeeded', started_at: '2026-08-13T09:00:00.000Z', finished_at: '2026-08-13T09:00:08.000Z', duration_ms: 8000 },
        { node: 'question_agent', status: 'succeeded', started_at: '2026-08-13T09:00:08.000Z', finished_at: '2026-08-13T09:00:16.000Z', duration_ms: 8000 },
        { node: 'answer_review_agent', status: 'succeeded', started_at: '2026-08-13T09:00:16.000Z', finished_at: '2026-08-13T09:00:28.000Z', duration_ms: 12000 },
      ],
      node_usage: {
        content_radar_agent: { tokens: 1200, cost: 0.005 },
        question_agent: { tokens: 1300, cost: 0.006 },
        answer_review_agent: { tokens: 1900, cost: 0.007 },
      },
      tool_calls: [],
      review_status: 'skipped',
      reviewer: null,
      review_note: null,
      reviewed_at: null,
      error: null,
      thread_id: 'thread-growth-demo',
      created_at: '2026-08-13T09:00:00.000Z',
    },
  ],
}

function readState(): DemoState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState))
    return clone(defaultState)
  }
  try {
    return JSON.parse(raw) as DemoState
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState))
    return clone(defaultState)
  }
}

function writeState(state: DemoState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function readGrowthState(): GrowthState {
  const raw = localStorage.getItem(GROWTH_STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(GROWTH_STORAGE_KEY, JSON.stringify(defaultGrowthState))
    return clone(defaultGrowthState)
  }
  try {
    return JSON.parse(raw) as GrowthState
  } catch {
    localStorage.setItem(GROWTH_STORAGE_KEY, JSON.stringify(defaultGrowthState))
    return clone(defaultGrowthState)
  }
}

function writeGrowthState(state: GrowthState) {
  localStorage.setItem(GROWTH_STORAGE_KEY, JSON.stringify(state))
}

export function resetDemoState() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(GROWTH_STORAGE_KEY)
}

export async function demoListMeetings(page = 1, pageSize = 20) {
  await pause()
  const items = readState().meetings
  return clone(items.slice((page - 1) * pageSize, page * pageSize))
}

export async function demoGetMeeting(id: string) {
  await pause()
  const meeting = readState().meetings.find((item) => item.id === id)
  if (!meeting) throw new Error('记录不存在')
  return clone(meeting)
}

export async function demoCreateMeeting(data: Partial<Meeting>) {
  await pause()
  const state = readState()
  const now = new Date().toISOString()
  const meeting: Meeting = {
    id: `meeting-${crypto.randomUUID()}`,
    title: data.title || '新的练习资料',
    description: data.description || '上传文本后生成练习复盘素材。',
    source_file_name: data.source_file_name,
    status: 'pending',
    start_time: data.start_time || now,
    end_time: data.end_time,
    participants: data.participants || ['我'],
    created_at: now,
    updated_at: now,
  }
  state.meetings.unshift(meeting)
  writeState(state)
  return clone(meeting)
}

export async function demoUpdateMeeting(id: string, data: Partial<Meeting>) {
  await pause()
  const state = readState()
  const index = state.meetings.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('记录不存在')
  state.meetings[index] = { ...state.meetings[index], ...data, updated_at: new Date().toISOString() }
  writeState(state)
  return clone(state.meetings[index])
}

export async function demoDeleteMeeting(id: string) {
  await pause()
  const state = readState()
  state.meetings = state.meetings.filter((item) => item.id !== id)
  state.transcripts = state.transcripts.filter((item) => item.meeting_id !== id)
  state.summaries = state.summaries.filter((item) => item.meeting_id !== id)
  state.actionItems = state.actionItems.filter((item) => item.meeting_id !== id)
  state.decisions = state.decisions.filter((item) => item.meeting_id !== id)
  writeState(state)
}

export async function demoUploadMeetingRecord(meetingId: string, file: File, onProgress?: (percent: number) => void) {
  for (const percent of [18, 42, 68, 100]) {
    await pause(120)
    onProgress?.(percent)
  }
  const state = readState()
  const now = new Date().toISOString()
  const meeting = state.meetings.find((item) => item.id === meetingId)
  if (!meeting) throw new Error('记录不存在')
  meeting.source_file_name = file.name
  meeting.status = 'processed'
  meeting.updated_at = now
  state.transcripts = state.transcripts.filter((item) => item.meeting_id !== meetingId)
  state.transcripts.push({
    id: `transcript-${crypto.randomUUID()}`,
    meeting_id: meetingId,
    speaker: '我',
    content: '这是一份上传后的练习文字记录。系统会整理成可编辑复盘内容，并沉淀到知识库。',
    start_time: 0,
    end_time: 60,
    seq_index: 0,
    created_at: now,
  })
  writeState(state)
  await demoGenerateSummary(meetingId)
  return clone(meeting)
}

export async function demoGetProcessingStatus(_meetingId: string) {
  await pause()
  return { meeting_id: _meetingId, status: 'processed' as const, transcript_count: 1, summary_ready: true, decision_count: 0 }
}

export async function demoGetTranscripts(meetingId: string) {
  await pause()
  return clone(readState().transcripts.filter((item) => item.meeting_id === meetingId))
}

export async function demoListSummaries(page = 1, pageSize = 20) {
  await pause()
  const state = readState()
  const items = state.summaries.map((summary) => ({
    id: summary.id,
    meeting_id: summary.meeting_id,
    meeting_title: state.meetings.find((meeting) => meeting.id === summary.meeting_id)?.title || '练习复盘',
    content: summary.content,
    status: summary.status,
    created_at: summary.created_at,
  }))
  return clone(items.slice((page - 1) * pageSize, page * pageSize))
}

export async function demoGetMeetingSummary(meetingId: string) {
  await pause()
  const state = readState()
  return {
    summary: clone(state.summaries.find((item) => item.meeting_id === meetingId) || null),
    action_items: clone(state.actionItems.filter((item) => item.meeting_id === meetingId)),
    risks: [],
  }
}

export async function demoGenerateSummary(meetingId: string) {
  await pause()
  const state = readState()
  const meeting = state.meetings.find((item) => item.id === meetingId)
  if (!meeting) throw new Error('记录不存在')
  const now = new Date().toISOString()
  const summary: Summary = {
    id: `summary-${crypto.randomUUID()}`,
    meeting_id: meetingId,
    status: 'completed',
    content: `## 练习复盘\n\n${meeting.title} 已整理为个人成长素材。\n\n## 后续建议\n\n- 提炼一道产品思维训练题\n- 补充你的回答和 AI 点评\n- 将参考答案沉淀进练习复盘库`,
    key_points: ['整理练习资料', '沉淀参考答案', '进入知识库问答'],
    created_at: now,
  }
  state.summaries = state.summaries.filter((item) => item.meeting_id !== meetingId)
  state.summaries.unshift(summary)
  writeState(state)
  return clone(summary)
}

export async function demoGetSummaryDetail(meetingId: string) {
  await pause()
  const summary = readState().summaries.find((item) => item.meeting_id === meetingId)
  if (!summary) throw new Error('复盘不存在')
  return clone(summary)
}

export async function demoUpdateSummary(meetingId: string, content: string) {
  await pause()
  const state = readState()
  const summary = state.summaries.find((item) => item.meeting_id === meetingId)
  if (!summary) throw new Error('复盘不存在')
  summary.content = content
  writeState(state)
  return clone(summary)
}

export async function demoGetActionItems(meetingId: string) {
  await pause()
  return clone(readState().actionItems.filter((item) => item.meeting_id === meetingId))
}

export async function demoUpdateActionItem(meetingId: string, itemId: string, data: Partial<ActionItem>) {
  await pause()
  const state = readState()
  const item = state.actionItems.find((entry) => entry.meeting_id === meetingId && entry.id === itemId)
  if (!item) throw new Error('行动项不存在')
  Object.assign(item, data, { last_updated_by: '我 · 手动更新' })
  writeState(state)
  return clone(item)
}

export async function demoGetRisks(_meetingId: string) {
  await pause()
  return []
}

export async function demoListDecisions(skip = 0, limit = 20, meetingId?: string) {
  await pause()
  const items = readState().decisions.filter((item) => !meetingId || item.meeting_id === meetingId)
  return { items: clone(items.slice(skip, skip + limit)), total: items.length, skip, limit }
}

export async function demoSearchDecisions(query: string, topK = 5) {
  await pause()
  const items = readState().decisions
    .filter((item) => `${item.title} ${item.context} ${item.chosen_option}`.includes(query) || query.length > 0)
    .slice(0, topK)
    .map((item) => ({ id: item.id, title: item.title, context: item.context, chosen_option: item.chosen_option, meeting_id: item.meeting_id, score: 0.9, source_type: 'decision' }))
  return { items: clone(items), query, total: items.length }
}

export async function demoGetDecision(id: string) {
  await pause()
  const decision = readState().decisions.find((item) => item.id === id)
  if (!decision) throw new Error('记录不存在')
  return clone(decision)
}

export async function demoUpdateDecision(id: string, data: Partial<DecisionDetail>) {
  await pause()
  const state = readState()
  const index = state.decisions.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('记录不存在')
  state.decisions[index] = { ...state.decisions[index], ...data, review_status: 'confirmed', reviewed_at: new Date().toISOString() }
  writeState(state)
  return clone(state.decisions[index])
}

export async function demoListKnowledgeDocuments(page = 1, pageSize = 50) {
  await pause()
  const items = readState().knowledgeDocuments
  return clone(items.slice((page - 1) * pageSize, page * pageSize))
}

export async function demoSearchKnowledge(query: string, topK = 5) {
  await pause()
  const items = readState().knowledgeDocuments
    .map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      source_type: item.source_type,
      source_id: item.source_id,
      metadata: item.metadata,
      score: `${item.title} ${item.content}`.toLowerCase().includes(query.toLowerCase()) ? 0.96 : 0.72,
      rerank_score: `${item.title} ${item.content}`.toLowerCase().includes(query.toLowerCase()) ? 0.94 : 0.68,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
  return { query, results: clone(items), total: items.length }
}

export async function demoUploadDocument(file: File, onProgress?: (percent: number) => void) {
  for (const percent of [20, 48, 76, 100]) {
    await pause(120)
    onProgress?.(percent)
  }
  const state = readState()
  const doc: KnowledgeDocument = {
    id: `knowledge-${crypto.randomUUID()}`,
    title: file.name.replace(/\.[^.]+$/, ''),
    source_type: 'uploaded_doc',
    content: `这是上传资料「${file.name}」的演示索引内容。正式环境会解析 PDF、Markdown、TXT 或 DOCX，并将分块内容写入向量检索。`,
    metadata: { file_name: file.name },
    created_at: new Date().toISOString(),
  }
  state.knowledgeDocuments.unshift(doc)
  writeState(state)
  return [clone(doc)]
}

export async function demoDeleteKnowledgeDocument(id: string) {
  await pause()
  const state = readState()
  state.knowledgeDocuments = state.knowledgeDocuments.filter((item) => item.id !== id)
  writeState(state)
}

export async function demoGetGrowthToday(): Promise<GrowthToday> {
  await pause()
  const growth = readGrowthState()
  const question = rotateByToday(growth.questions)[0]
  const todayRadar = rotateByToday(growth.radarItems, 7)
  const practices = growth.practices
  const average = practices.length ? Math.round(practices.reduce((sum, item) => sum + item.score, 0) / practices.length) : 0
  return clone({
    question,
    radar_items: todayRadar,
    recent_practices: practices.slice(0, 3),
    stats: {
      streak_days: practices.length ? 3 : 0,
      practice_count: practices.length,
      average_score: average,
      weakest_tag: '复杂问题理解',
    },
  })
}

export async function demoListDailyQuestions() {
  await pause()
  return clone(rotateByToday(readGrowthState().questions))
}

export async function demoGetDailyQuestion(id: string) {
  await pause()
  const question = readGrowthState().questions.find((item) => item.id === id)
  if (!question) throw new Error('题目不存在')
  return clone(question)
}

export async function demoTranscribePracticeAudio(_questionId: string, _file: File) {
  await pause(800)
  return {
    transcript_text:
      '我认为这个产品的核心用户是准备 AI 产品经理面试的人。V1.0 应该先做每日练习题、语音或文字作答、AI 点评和历史复盘，再把资料库作为问答和题目生成的来源。',
    audio_url: `demo-audio-${crypto.randomUUID()}.webm`,
  }
}

export async function demoSubmitPracticeAnswer(questionId: string, data: { answer_text: string; transcript_text?: string; audio_url?: string }) {
  await pause(900)
  const growth = readGrowthState()
  const state = readState()
  const question = growth.questions.find((item) => item.id === questionId)
  if (!question) throw new Error('题目不存在')
  const text = data.transcript_text || data.answer_text
  const scored = scorePracticeAnswer(question, text)
  const normalized = normalizeText(text)
  const hasUser = containsAny(normalized, ['用户', '目标用户', '基础用户', '进阶用户'])
  const hasProblem = containsAny(normalized, ['痛点', '问题', '需求', '场景'])
  const hasSolution = containsAny(normalized, ['闭环', 'mvp', '方案', '功能', '产品', '能力'])
  const hasMetric = containsAny(normalized, ['指标', '完成率', '复练率', '留存', '满意度', '得分'])
  const hasBoundary = containsAny(normalized, ['边界', '兜底', '人工确认', '可编辑', '风险'])
  const score = scored.score
  const missing: string[] = []
  if (!hasUser) missing.push('用户定位还可以再明确')
  if (!hasProblem) missing.push('痛点和问题定义还可以更具体')
  if (!hasSolution) missing.push('方案闭环和功能设计可以再展开')
  if (!hasMetric) missing.push('效果指标和验证方式可以再补充')
  if (!hasBoundary) missing.push('人工确认、可编辑和边界兜底可以说得更清楚')
  const strengths = [
    hasSolution ? '能围绕产品方案展开，而不是只停留在概念' : '能表达出产品方向感',
    hasUser ? '有意识地提到目标用户' : '能保持回答和题目相关',
  ]
  const weaknesses = missing.length > 0 ? missing.slice(0, 3) : ['回答整体比较完整，但还可以继续压缩表达']
  const suggestions = [
    hasUser ? '先用一句话明确用户是谁' : '先补上用户画像，避免一上来就讲功能',
    hasMetric ? '把指标和验证方式说得更落地' : '补充完成率、复练率、得分提升等验证指标',
    hasBoundary ? '保留你对边界和兜底的判断' : '补充人工确认、可编辑和风险兜底',
  ]
  const referenceAnswer = question.scoring_guide
    ? `我会先从“${question.title}”的目标用户和核心问题讲起：${question.background}。回答时按“用户-痛点-方案-指标-边界”展开，先说明为什么做，再说明 V1.0 先做什么、AI 在哪里帮忙、哪里需要人工确认，以及如何衡量效果。`
    : '我会先明确目标用户，再讲核心痛点、方案闭环、指标和边界。'
  const practice: PracticeAnswer = {
    id: `practice-${crypto.randomUUID()}`,
    question_id: questionId,
    answer_text: data.answer_text,
    transcript_text: text,
    audio_url: data.audio_url,
    score,
    structure_score: scored.structure_score,
    product_thinking_score: scored.product_thinking_score,
    expression_score: scored.expression_score,
    strengths,
    weaknesses,
    suggestions,
    reference_answer: referenceAnswer,
    created_at: new Date().toISOString(),
  }
  growth.practices.unshift(practice)
  question.status = 'answered'
  writeGrowthState(growth)
  state.knowledgeDocuments.unshift({
    id: `knowledge-${practice.id}`,
    title: `练习复盘：${question.title}`,
    source_type: 'practice_record',
    source_id: practice.id,
    content: buildPracticeReviewContent(question, practice),
    metadata: { question_id: question.id, tags: question.ability_tags },
    created_at: practice.created_at,
  })
  writeState(state)
  return clone(practice)
}

export async function demoListPracticeAnswers() {
  await pause()
  return clone(readGrowthState().practices)
}

export async function demoGetPracticeAnswer(id: string) {
  await pause()
  const practice = readGrowthState().practices.find((item) => item.id === id)
  if (!practice) throw new Error('练习记录不存在')
  return clone(practice)
}

export async function demoListRadarItems(tag?: string) {
  await pause()
  const items = rotateByToday(readGrowthState().radarItems, 7)
  if (!tag || tag === '全部') return clone(items)
  return clone(items.filter((item) => item.tags.includes(tag)))
}

export async function demoSaveRadarItemToKnowledge(id: string) {
  await pause()
  const growth = readGrowthState()
  const state = readState()
  const item = growth.radarItems.find((entry) => entry.id === id)
  if (!item) throw new Error('热点不存在')
  item.saved_to_knowledge = true
  writeGrowthState(growth)
  if (!state.knowledgeDocuments.some((doc) => doc.source_id === item.id)) {
    state.knowledgeDocuments.unshift({
      id: `knowledge-${item.id}`,
      title: item.title,
      source_type: 'radar_item',
      source_id: item.id,
      content: `${item.full_content || item.summary}\n\n产品经理视角：${item.pm_insight}\n\n来源：${item.source_name}\n${item.source_url}`,
      metadata: { source_name: item.source_name, source_url: item.source_url, tags: item.tags },
      created_at: new Date().toISOString(),
    })
    writeState(state)
  }
  return clone(item)
}

export async function demoCreateSession(data: { meeting_id?: string; title?: string }) {
  await pause()
  const state = readState()
  const session: ChatSession = { id: `chat-${crypto.randomUUID()}`, meeting_id: data.meeting_id, title: data.title || '新对话', created_at: new Date().toISOString() }
  state.chatSessions.unshift(session)
  writeState(state)
  return clone(session)
}

export async function demoListSessions(meetingId?: string) {
  await pause()
  return clone(readState().chatSessions.filter((item) => !meetingId || item.meeting_id === meetingId))
}

export async function demoGetSessionMessages(sessionId: string) {
  await pause()
  return clone(readState().chatMessages.filter((item) => item.session_id === sessionId))
}

export async function demoDeleteSession(sessionId: string) {
  await pause()
  const state = readState()
  state.chatSessions = state.chatSessions.filter((item) => item.id !== sessionId)
  state.chatMessages = state.chatMessages.filter((item) => item.session_id !== sessionId)
  writeState(state)
}

function buildDemoAnswer(query: string) {
  const growth = readGrowthState()
  const todayQuestion = rotateByToday(growth.questions)[0]
  const latestPractice = growth.practices[0]
  if (/^(你好|您好|hello|hi|哈喽|在吗)[！!。.\s]*$/i.test(query.trim())) {
    return '你好呀，我是 AI 成长舱里的产品思维学习助手。你可以问我今天的练习题、上次练习哪里需要改进、AI 产品趋势、RAG/Agent 怎么讲，或者让我帮你整理一段面试表达。'
  }
  if (/(天气|气温|下雨|降雨|空气质量|台风|温度|几度|穿什么|实时天气|今天天气|明天天气)/.test(query)) {
    return '这个问题我现在不能直接回答。当前问答助手没有接入天气查询工具，也没有可检索的实时天气知识库，所以不能判断今天的天气。你可以换成问我“今天的产品思维练习是什么”或“最近 AI 产品趋势有哪些”。'
  }
  if (/(股票|股价|汇率|航班|火车票|高铁票|实时新闻|彩票|油价|限行)/.test(query)) {
    return '这个问题需要实时外部数据或专门工具支持。当前工作台只接入了个人知识库、练习复盘和 AI 产品资料，不具备这类实时查询能力，所以我不能编造答案。'
  }
  if (/今天|今日|题目|考察|练习/.test(query)) {
    return `今天的产品思维训练题是《${todayQuestion.title}》。\n\n背景：${todayQuestion.background}\n\n考察能力：${todayQuestion.ability_tags.join('、')}。\n\n建议你按这个结构回答：\n${todayQuestion.suggested_structure.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n回答时不要只讲功能清单，要补充 AI 能力边界、效果指标和风险兜底。`
  }
  if (/上次|最近.*回答|哪里不好|薄弱|复盘|得分/.test(query) && latestPractice) {
    return `你最近一次练习得分是 ${latestPractice.score} 分。\n\n优点：\n${latestPractice.strengths.map((item) => `- ${item}`).join('\n')}\n\n需要优化：\n${latestPractice.weaknesses.map((item) => `- ${item}`).join('\n')}\n\n下一次建议重点练“复杂问题拆解”：先拆用户、场景和目标，再讲 AI 能力、数据来源、指标和风险边界。`
  }
  if (/GitHub|趋势|前沿|资讯|动态|雷达|热点|开源|产品更新/.test(query)) {
    return `今天 AI 产品雷达暂时改用 GitHub 资料源，重点看这些方向：\n\n1. OpenAI Cookbook：把 RAG、函数调用、评估等技术能力转成产品方案。\n2. LangGraph：用状态图组织 Agent 工作流，强调可控执行和人工确认。\n3. LlamaIndex：说明知识库问答的关键是资料治理、检索质量和引用可追溯。\n4. MCP：体现 AI 助手连接外部工具和数据源的标准化趋势。\n\n面试表达可以总结为：AI 产品竞争不只是模型参数，而是能否把能力包装成可控、可追溯、能持续改进的用户任务闭环。`
  }
  if (/RAG|知识库|为什么.*大模型|直接问/.test(query)) {
    return '如果直接问大模型，回答依赖通用知识，容易和你的个人资料、历史练习、最新资料脱节。RAG 的价值是把资料库、AI 热点和练习复盘作为上下文，让回答能引用具体来源，降低幻觉，并支持持续优化。'
  }
  if (/Agent|子agent|协作|工作流/.test(query)) {
    return '这个个人成长工作台可以设计为三个 Agent 化流程：内容雷达 Agent 负责整理 GitHub/官网热点；题目生成 Agent 负责根据知识库和资讯生成每日题；答案评估 Agent 负责分析回答，输出评分、优缺点和参考答案。V1.0 先做职责清晰的 Agent 化流程，不夸大成完全自主多 Agent 系统。'
  }
  if (/面试官|怎么回答|怎么介绍|AI产品经理|AI PM/.test(query)) {
    return '面试表达建议按“场景痛点-产品方案-AI 能力-边界兜底-指标验证”展开。介绍这个工作台时，可以说：我发现 AI 产品经理面试准备的问题不是缺资料，而是缺持续练习和即时反馈，所以做了每日产品题、语音/文字作答、AI 点评、AI 产品雷达和个人知识库问答，形成从学习输入到表达输出的闭环。'
  }
  if (/用户画像/.test(query)) {
    return '用户画像是对目标用户群体的结构化描述，通常包括用户特征、场景、目标、痛点和行为。产品设计时，用户画像不是简单罗列年龄职业，而是帮助团队明确“谁在什么场景下，为什么需要这个产品”。'
  }
  if (/\bMVP\b|最小可行产品|产品经理是做什么/.test(query)) {
    return 'MVP 是用最小成本验证核心价值的产品版本。它不是功能越少越好，而是优先保留能验证关键假设的闭环，例如本工作台 V1.0 先验证“每日练习题—回答—AI 点评—历史复盘”是否能帮助用户持续训练。'
  }
  return `这个问题不需要检索个人知识库，我可以直接基于通用知识回答。当前 Demo 只内置了部分产品经理学习场景示例；如果你接入真实 GPT，它会继续回答这类通用问题。涉及天气、股价等实时信息时，仍需要对应工具才能查询。`
}

function buildChatSources(query: string) {
  if (
    /^(你好|您好|hello|hi|哈喽|在吗)[！!。.\s]*$/i.test(query.trim()) ||
    /(天气|气温|下雨|降雨|空气质量|台风|温度|几度|穿什么|实时天气|今天天气|明天天气|股票|股价|汇率|航班|火车票|高铁票|实时新闻|彩票|油价|限行)/.test(query)
  ) {
    return []
  }
  if (/GitHub|趋势|前沿|资讯|动态|雷达|热点|开源|产品更新/.test(query)) {
    return [
      { source_id: 'knowledge-radar-github-openai-cookbook', title: 'OpenAI Cookbook：RAG 与评估案例', source_type: 'radar_item', route: 'knowledge' as const, rank: 1, score: 0.95 },
      { source_id: 'knowledge-radar-github-langgraph', title: 'LangGraph：Agent 工作流', source_type: 'radar_item', route: 'knowledge' as const, rank: 2, score: 0.91 },
    ]
  }
  if (/RAG|知识库|为什么.*大模型|直接问/.test(query)) {
    return [
      { source_id: 'knowledge-rag-prd', title: 'RAG 产品化价值说明', source_type: 'uploaded_doc', route: 'knowledge' as const, rank: 1, score: 0.97 },
      { source_id: 'knowledge-radar-github-llamaindex', title: 'LlamaIndex：知识库问答资料治理', source_type: 'radar_item', route: 'knowledge' as const, rank: 2, score: 0.9 },
    ]
  }
  return []
}

export function demoSaveRealChatExchange(sessionId: string, query: string, answer: string) {
  const state = readState()
  const now = new Date().toISOString()
  const session = state.chatSessions.find((item) => item.id === sessionId)
  if (session?.title === '新对话') session.title = query.slice(0, 18)
  state.chatMessages.push({ id: `message-${crypto.randomUUID()}`, session_id: sessionId, role: 'user', content: query, created_at: now })
  state.chatMessages.push({ id: `message-${crypto.randomUUID()}`, session_id: sessionId, role: 'assistant', content: answer, metadata: { sources: buildChatSources(query) }, created_at: new Date().toISOString() })
  writeState(state)
}

export async function* demoStreamChat(sessionId: string, query: string): AsyncGenerator<{ type: string; content?: string; message?: string }> {
  const state = readState()
  const now = new Date().toISOString()
  const session = state.chatSessions.find((item) => item.id === sessionId)
  if (session?.title === '新对话') session.title = query.slice(0, 18)
  state.chatMessages.push({ id: `message-${crypto.randomUUID()}`, session_id: sessionId, role: 'user', content: query, created_at: now })
  writeState(state)
  const answer = buildDemoAnswer(query)
  const chunks = answer.match(/.{1,8}/g) || [answer]
  let full = ''
  for (const chunk of chunks) {
    await pause(22)
    full += chunk
    yield { type: 'token', content: chunk }
  }
  const finalState = readState()
  finalState.chatMessages.push({ id: `message-${crypto.randomUUID()}`, session_id: sessionId, role: 'assistant', content: full, metadata: { sources: buildChatSources(query) }, created_at: new Date().toISOString() })
  writeState(finalState)
  yield { type: 'done' }
}

export async function demoListAgentRuns(params: { meeting_id?: string; status?: string; page?: number; page_size?: number } = {}) {
  await pause()
  const page = params.page || 1
  const pageSize = params.page_size || 20
  const runs = readState().agentRuns.filter((item) => (!params.meeting_id || item.meeting_id === params.meeting_id) && (!params.status || item.status === params.status))
  return { items: clone(runs.slice((page - 1) * pageSize, page * pageSize)), total: runs.length, page, page_size: pageSize }
}

export async function demoGetAgentRun(id: string) {
  await pause()
  const run = readState().agentRuns.find((item) => item.id === id)
  if (!run) throw new Error('运行记录不存在')
  return clone(run)
}

export async function demoReviewAgentRun(id: string, req: { action: 'approve' | 'reject'; reviewer: string; note?: string }) {
  await pause()
  const state = readState()
  const run = state.agentRuns.find((item) => item.id === id)
  if (!run) throw new Error('运行记录不存在')
  run.review_status = req.action === 'approve' ? 'approved' : 'rejected'
  run.reviewer = req.reviewer
  run.review_note = req.note || null
  run.reviewed_at = new Date().toISOString()
  run.status = req.action === 'approve' ? 'succeeded' : 'cancelled'
  writeState(state)
  return { status: run.status, run: clone(run) }
}

export async function demoGetAgentRunStats() {
  const runs = readState().agentRuns
  const statusCounts = runs.reduce<Record<string, number>>((acc, run) => ({ ...acc, [run.status]: (acc[run.status] || 0) + 1 }), {})
  return { status_counts: statusCounts, total_runs: runs.length, total_tokens: runs.reduce((sum, run) => sum + run.total_tokens, 0), total_cost_usd: runs.reduce((sum, run) => sum + run.total_cost_usd, 0), success_rate: runs.length ? runs.filter((run) => run.status === 'succeeded').length / runs.length : 0 }
}

export async function demoListTools() {
  return {
    tools: [
      { name: 'collect_github_ai_topics', risk: 'read_only' as const, description: '读取 GitHub AI 热点资料', requires_confirmation: false, timeout_seconds: 10 },
      { name: 'generate_daily_question', risk: 'write_safe' as const, description: '生成每日产品训练题', requires_confirmation: false, timeout_seconds: 10 },
      { name: 'save_practice_review', risk: 'write_safe' as const, description: '保存练习复盘与参考答案', requires_confirmation: false, timeout_seconds: 10 },
    ],
  }
}
