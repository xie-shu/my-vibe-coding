import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getDailyQuestion,
  getGrowthToday,
  getPracticeAnswer,
  listDailyQuestions,
  listPracticeAnswers,
  listRadarItems,
  saveRadarItemToKnowledge,
  submitPracticeAnswer,
  transcribePracticeAudio,
} from '@/api/growth'
import { QUERY_KEYS } from '@/lib/constants'

export function useGrowthToday() {
  return useQuery({
    queryKey: QUERY_KEYS.growthToday,
    queryFn: getGrowthToday,
  })
}

export function useDailyQuestions() {
  return useQuery({
    queryKey: QUERY_KEYS.dailyQuestions,
    queryFn: listDailyQuestions,
  })
}

export function useDailyQuestion(id?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.dailyQuestion(id || ''),
    queryFn: () => getDailyQuestion(id!),
    enabled: !!id,
  })
}

export function useTranscribePracticeAudio() {
  return useMutation({
    mutationFn: ({ questionId, file }: { questionId: string; file: File }) => transcribePracticeAudio(questionId, file),
  })
}

export function useSubmitPracticeAnswer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: { answer_text: string; transcript_text?: string; audio_url?: string } }) => submitPracticeAnswer(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.growth] })
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.knowledge] })
    },
  })
}

export function usePracticeAnswers() {
  return useQuery({
    queryKey: QUERY_KEYS.practiceAnswers,
    queryFn: listPracticeAnswers,
  })
}

export function usePracticeAnswer(id?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.practiceAnswer(id || ''),
    queryFn: () => getPracticeAnswer(id!),
    enabled: !!id,
  })
}

export function useRadarItems(tag?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.radarItems(tag || '全部'),
    queryFn: () => listRadarItems(tag),
  })
}

export function useSaveRadarItemToKnowledge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveRadarItemToKnowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.growth] })
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.knowledge] })
    },
  })
}
