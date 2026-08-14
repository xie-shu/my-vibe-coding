// 会议状态
export type MeetingStatus = 'pending' | 'processing' | 'processed' | 'failed'

// 会议
export interface Meeting {
  id: string
  title: string
  description?: string
  source_file_name?: string
  status: MeetingStatus
  start_time?: string
  end_time?: string
  participants?: string[]
  created_at: string
  updated_at: string
}

// 从会议文字记录解析出的原文片段
export interface Transcript {
  id: string
  meeting_id: string
  speaker: string
  content: string
  start_time: number
  end_time: number
  seq_index: number
  created_at: string
}

// 纪要
export interface Summary {
  id: string
  meeting_id: string
  content: string
  key_points?: string[]
  status: 'generating' | 'completed' | 'failed'
  created_at: string
}

// 纪要列表项
export interface SummaryListItem {
  id: string
  meeting_id: string
  meeting_title: string
  content: string
  status: string
  created_at: string
}

// 纪要综合响应（纪要 + 行动项 + 风险）
export interface MeetingSummary {
  summary: Summary | null
  action_items: ActionItem[]
  risks: Risk[]
}

// 行动项
export interface ActionItem {
  id: string
  meeting_id: string
  title: string
  assignee?: string
  due_date?: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'done'
  created_at: string
  source?: 'ai_extracted' | 'manual' | 'external_sync'
  evidence?: string
  last_updated_by?: string
  external_url?: string
}

// 风险
export interface Risk {
  id: string
  meeting_id: string
  description: string
  severity: 'high' | 'medium' | 'low'
  mitigation?: string
  created_at: string
}

// 对话会话
export interface ChatSession {
  id: string
  meeting_id?: string
  title: string
  created_at: string
}

// 对话消息
export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: {
    sources?: Array<{
      source_id?: string
      title: string
      source_type: string
      route?: 'decision' | 'knowledge'
      rank?: number
      score?: number
      snippet?: string
    }>
  }
  created_at: string
}

// 知识文档
export interface KnowledgeDocument {
  id: string
  title: string
  source_type: 'meeting_summary' | 'uploaded_doc' | 'radar_item' | 'practice_record' | 'reference_answer' | 'interview_record'
  source_id?: string
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

// 每日产品思维训练题
export interface DailyQuestion {
  id: string
  title: string
  background: string
  ability_tags: string[]
  source_ids: string[]
  suggested_structure: string[]
  scoring_guide?: {
    structure: string[]
    product_thinking: string[]
    expression: string[]
  }
  status: 'new' | 'answered'
  created_at: string
}

// 训练回答与 AI 点评
export interface PracticeAnswer {
  id: string
  question_id: string
  answer_text: string
  audio_url?: string
  transcript_text: string
  score: number
  structure_score: number
  product_thinking_score: number
  expression_score: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  reference_answer: string
  created_at: string
}

// 面试音频复盘
export interface InterviewTurn {
  id: string
  speaker: 'interviewer' | 'me'
  speaker_label: string
  content: string
  start_time: number
  end_time: number
}

export interface InterviewRecord {
  id: string
  title: string
  source_file_name?: string
  duration_seconds: number
  transcript: InterviewTurn[]
  questions: Array<{
    id: string
    question: string
    answer: string
    analysis: string
    improved_answer: string
    score: number
  }>
  overall_score: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  created_at: string
}

// AI 产品雷达资讯
export interface RadarItem {
  id: string
  title: string
  source_name: string
  source_url: string
  summary: string
  full_content?: string
  pm_insight: string
  tags: string[]
  created_at: string
  saved_to_knowledge: boolean
}

export interface GrowthToday {
  question: DailyQuestion
  radar_items: RadarItem[]
  recent_practices: PracticeAnswer[]
  stats: {
    streak_days: number
    practice_count: number
    average_score: number
    weakest_tag: string
  }
}

// 检索结果项
export interface SearchResult {
  id: string
  content: string
  title: string
  source_type: string
  source_id?: string
  metadata?: Record<string, unknown>
  score: number
  rerank_score?: number
}

// 检索响应
export interface KnowledgeSearchResponse {
  query: string
  results: SearchResult[]
  total: number
}

// SSE 流式事件
export interface SSEEvent {
  event: string
  data: string
  id?: string
}

// SSE 对话事件
export interface ChatSSEEvent {
  type: 'token' | 'done' | 'error'
  content?: string
  message?: string
}

// API 分页响应
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// API 错误响应
export interface ApiError {
  detail: string
  code?: string
}

// ── AgentRun（Harness 生命周期） ──

// AgentRun 状态
export type AgentRunStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'paused'
  | 'cancelled'

// AgentRun 审批状态
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'skipped' | null

// Planner 输出的执行计划
export interface ExecutionPlan {
  meeting_type: 'standup' | 'review' | 'decision' | 'brainstorm' | 'unknown'
  should_run_summary: boolean
  should_run_actions: boolean
  should_run_risks: boolean
  should_run_decisions: boolean
  needs_human_review: boolean
  transcript_strategy: 'full' | 'compressed'
  estimated_tokens: number
  reason: string
}

// 节点执行 step
export interface AgentRunStep {
  node: string
  status: 'running' | 'succeeded' | 'failed' | 'timeout' | 'skipped' | 'budget_exceeded' | 'invalid_output'
  started_at?: string
  finished_at?: string
  duration_ms?: number
  error?: string
}

// 节点级 Token 消耗
export interface NodeUsage {
  [nodeName: string]: {
    tokens: number
    cost: number
  }
}

// Tool 调用记录
export interface ToolCall {
  tool: string
  args: Record<string, unknown>
  result?: Record<string, unknown>
  duration_ms: number
  status: 'succeeded' | 'failed'
  error?: string
  timestamp: string
}

// AgentRun
export interface AgentRun {
  id: string
  meeting_id: string
  graph_name: string
  status: AgentRunStatus
  current_node?: string | null
  plan?: ExecutionPlan | null
  started_at: string
  finished_at?: string | null
  max_tokens: number
  max_cost_usd: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  total_cost_usd: number
  steps: AgentRunStep[]
  node_usage?: NodeUsage
  tool_calls: ToolCall[]
  review_status: ReviewStatus
  reviewer?: string | null
  review_note?: string | null
  reviewed_at?: string | null
  error?: string | null
  thread_id?: string | null
  created_at: string
}

// AgentRun 列表响应
export interface AgentRunListResponse {
  items: AgentRun[]
  total: number
  page: number
  page_size: number
}

// Tool 注册表项
export interface ToolSpec {
  name: string
  risk: 'read_only' | 'write_safe' | 'write_danger' | 'system'
  description: string
  requires_confirmation: boolean
  timeout_seconds: number
}

// Tool 注册表响应
export interface ToolListResponse {
  tools: ToolSpec[]
}

// ── 多人会议房间（mediasoup SFU） ────────────────────────────

export type RoomScene = 'tech_review' | 'cross_align' | 'incident_review' | 'generic'
export type RoomStatus = 'active' | 'ended' | 'error'

export interface Room {
  id: string
  meeting_id: string | null
  title: string
  scene: RoomScene
  status: RoomStatus
  participants: string[]
  started_at: string
  ended_at: string | null
}

// 实时字幕片段（与后端 live_subtitle 服务对齐）
export interface LiveSubtitleSegment {
  speaker: string
  content: string
  start_time: number
  end_time: number
  seq_index: number
}

// AI 协作侧栏推送的实时建议（会议进行中增量出现）
export type AISuggestionType = 'decision' | 'action' | 'risk' | 'contract'
export interface AISuggestion {
  id: string
  type: AISuggestionType
  title: string
  detail: string
  evidence: string  // 触发该建议的会议原文片段
  created_at: string
}

// ── 评审决策知识库（Q5 决策） ────────────────────────────────

// 决策候选方案
export interface DecisionOption {
  id: string
  name: string
  pros?: string[]
  cons?: string[]
  proposed_by?: string | null
  is_chosen: boolean
}

// 关联决策（向量相似 top-3）
export interface RelatedDecision {
  id: string
  title: string
  similarity_score?: number | null
  relation_type: string
  context?: string | null
}

// 决策详情
export interface DecisionDetail {
  id: string
  meeting_id: string | null
  title: string
  context?: string | null
  snippet?: string | null
  chosen_option?: string | null
  reasons?: string[] | null
  objections?: Array<{ from: string; content: string }> | null
  decided_by?: string[] | null
  decided_at?: string | null
  confidence?: number | null
  review_status?: 'pending' | 'confirmed'
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  options: DecisionOption[]
  related_decisions: RelatedDecision[]
}

// 决策列表项（精简版）
export interface DecisionListItem {
  id: string
  title: string
  chosen_option?: string | null
  meeting_id: string | null
  decided_by?: string[] | null
  confidence?: number | null
  created_at: string
}

// 决策列表响应
export interface DecisionListResponse {
  items: DecisionListItem[]
  total: number
  skip: number
  limit: number
}

// 决策搜索结果项
export interface DecisionSearchResult {
  id: string
  title: string
  context?: string | null
  chosen_option?: string | null
  meeting_id: string | null
  score: number
  source_type: string
}

// 决策搜索响应
export interface DecisionSearchResponse {
  items: DecisionSearchResult[]
  query: string
  total: number
}
