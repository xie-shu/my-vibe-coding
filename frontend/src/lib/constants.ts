export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
export const SSE_BASE_URL = import.meta.env.VITE_SSE_BASE_URL || '/api'

export const QUERY_KEYS = {
  // meetings
  meetings: 'meetings',
  meeting: (id: string) => ['meeting', id] as const,
  transcripts: (meetingId: string) => ['transcripts', meetingId] as const,
  processingStatus: (meetingId: string) => ['processing-status', meetingId] as const,
  // summaries
  summaries: 'summaries',
  summaryList: (page: number, pageSize: number) => ['summary-list', page, pageSize] as const,
  meetingSummary: (meetingId: string) => ['meeting-summary', meetingId] as const,
  summaryDetail: (meetingId: string) => ['summary-detail', meetingId] as const,
  actionItems: (meetingId: string) => ['action-items', meetingId] as const,
  risks: (meetingId: string) => ['risks', meetingId] as const,
  // chat
  chatSessions: (meetingId: string) => ['chat-sessions', meetingId] as const,
  chatMessages: (sessionId: string) => ['chat-messages', sessionId] as const,
  // knowledge
  knowledge: 'knowledge',
  knowledgeDocuments: (page: number, pageSize: number) => ['knowledge-documents', page, pageSize] as const,
  // agent runs
  agentRuns: 'agent-runs',
  agentRunsList: (params: Record<string, unknown>) => ['agent-runs-list', params] as const,
  agentRun: (id: string) => ['agent-run', id] as const,
  agentRunStats: 'agent-run-stats',
  tools: 'tools',
  // decisions
  decisions: 'decisions',
  decisionList: (skip: number, limit: number, meetingId?: string) =>
    ['decision-list', skip, limit, meetingId] as const,
  decision: (id: string) => ['decision', id] as const,
  decisionSearch: (query: string) => ['decision-search', query] as const,
  // growth workbench
  growth: 'growth',
  growthToday: ['growth', 'today'] as const,
  dailyQuestions: ['growth', 'questions'] as const,
  dailyQuestion: (id: string) => ['growth', 'question', id] as const,
  practiceAnswers: ['growth', 'practices'] as const,
  practiceAnswer: (id: string) => ['growth', 'practice', id] as const,
  radarItems: (tag: string) => ['growth', 'radar', tag] as const,
  interviewRecords: ['growth', 'interviews'] as const,
  interviewRecord: (id: string) => ['growth', 'interview', id] as const,
} as const

export const APP_TITLE = 'AI 成长舱'
