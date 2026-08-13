import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listDecisions,
  searchDecisions,
  getDecisionDetail,
  updateDecision,
} from '@/api/decisions'
import { QUERY_KEYS } from '@/lib/constants'

// 决策列表
export function useDecisions(
  skip = 0,
  limit = 20,
  meetingId?: string,
) {
  return useQuery({
    queryKey: QUERY_KEYS.decisionList(skip, limit, meetingId),
    queryFn: () => listDecisions(skip, limit, meetingId),
  })
}

// 决策搜索
export function useSearchDecisions(query: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.decisionSearch(query),
    queryFn: () => searchDecisions(query, 10),
    enabled: enabled && query.trim().length > 0,
  })
}

// 决策详情
export function useDecisionDetail(decisionId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.decision(decisionId || ''),
    queryFn: () => getDecisionDetail(decisionId!),
    enabled: !!decisionId,
  })
}

export function useUpdateDecision(decisionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof updateDecision>[1]) => updateDecision(decisionId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decision(decisionId || '') })
      queryClient.invalidateQueries({ queryKey: ['decision-list'] })
      queryClient.invalidateQueries({ queryKey: ['decision-search'] })
    },
  })
}
