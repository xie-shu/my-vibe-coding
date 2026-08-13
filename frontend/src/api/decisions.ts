import { apiClient } from './client'
import type {
  DecisionListResponse,
  DecisionDetail,
  DecisionSearchResponse,
} from '@/types'
import { IS_DEMO_MODE, demoGetDecision, demoListDecisions, demoSearchDecisions, demoUpdateDecision } from '@/lib/demo-data'

// 决策列表（分页 + 可选按 meeting 筛选）
export async function listDecisions(
  skip = 0,
  limit = 20,
  meetingId?: string,
): Promise<DecisionListResponse> {
  if (IS_DEMO_MODE) return demoListDecisions(skip, limit, meetingId)
  return apiClient
    .get('decisions', {
      searchParams: meetingId
        ? { skip, limit, meeting_id: meetingId }
        : { skip, limit },
    })
    .json()
}

// 决策语义搜索
export async function searchDecisions(
  query: string,
  topK = 5,
): Promise<DecisionSearchResponse> {
  if (IS_DEMO_MODE) return demoSearchDecisions(query, topK)
  return apiClient
    .get('decisions/search', {
      searchParams: { q: query, top_k: topK },
    })
    .json()
}

// 决策详情（含 options + 关联决策）
export async function getDecisionDetail(
  decisionId: string,
): Promise<DecisionDetail> {
  if (IS_DEMO_MODE) return demoGetDecision(decisionId)
  return apiClient.get(`decisions/${decisionId}`).json()
}

export async function updateDecision(
  decisionId: string,
  data: Pick<DecisionDetail, 'title' | 'context' | 'snippet' | 'chosen_option' | 'reasons' | 'objections' | 'decided_by' | 'options'> & { review_status?: 'pending' | 'confirmed'; reviewed_by?: string },
): Promise<DecisionDetail> {
  if (IS_DEMO_MODE) return demoUpdateDecision(decisionId, data)
  return apiClient.patch(`decisions/${decisionId}`, { json: data }).json()
}
