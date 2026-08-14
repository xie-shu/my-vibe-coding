import { apiClient } from './client'
import type { DailyQuestion, GrowthToday, PracticeAnswer, RadarItem } from '@/types'
import {
  IS_DEMO_MODE,
  demoGetDailyQuestion,
  demoGetGrowthToday,
  demoGetPracticeAnswer,
  demoListDailyQuestions,
  demoListPracticeAnswers,
  demoListRadarItems,
  demoSaveRadarItemToKnowledge,
  demoSubmitPracticeAnswer,
  demoTranscribePracticeAudio,
} from '@/lib/demo-data'

export async function getGrowthToday(): Promise<GrowthToday> {
  if (IS_DEMO_MODE) return demoGetGrowthToday()
  return apiClient.get('growth/today').json()
}

export async function listDailyQuestions(): Promise<DailyQuestion[]> {
  if (IS_DEMO_MODE) return demoListDailyQuestions()
  return apiClient.get('growth/questions').json()
}

export async function getDailyQuestion(id: string): Promise<DailyQuestion> {
  if (IS_DEMO_MODE) return demoGetDailyQuestion(id)
  return apiClient.get(`growth/questions/${id}`).json()
}

export async function transcribePracticeAudio(questionId: string, file: File): Promise<{ transcript_text: string }> {
  if (IS_DEMO_MODE) return demoTranscribePracticeAudio(questionId, file)
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post(`growth/questions/${questionId}/transcribe`, { body: formData }).json()
}

export async function submitPracticeAnswer(questionId: string, data: { answer_text: string; transcript_text?: string; audio_url?: string }): Promise<PracticeAnswer> {
  if (IS_DEMO_MODE) return demoSubmitPracticeAnswer(questionId, data)
  return apiClient.post(`growth/questions/${questionId}/answers`, { json: data }).json()
}

export async function listPracticeAnswers(): Promise<PracticeAnswer[]> {
  if (IS_DEMO_MODE) return demoListPracticeAnswers()
  return apiClient.get('growth/practices').json()
}

export async function getPracticeAnswer(id: string): Promise<PracticeAnswer> {
  if (IS_DEMO_MODE) return demoGetPracticeAnswer(id)
  return apiClient.get(`growth/practices/${id}`).json()
}

export async function listRadarItems(tag?: string): Promise<RadarItem[]> {
  if (IS_DEMO_MODE) return demoListRadarItems(tag)
  return apiClient.get('growth/radar', { searchParams: tag ? { tag } : {} }).json()
}

export async function saveRadarItemToKnowledge(id: string): Promise<RadarItem> {
  if (IS_DEMO_MODE) return demoSaveRadarItemToKnowledge(id)
  return apiClient.post(`growth/radar/${id}/save-to-knowledge`).json()
}
