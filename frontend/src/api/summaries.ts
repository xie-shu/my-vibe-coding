import { apiClient } from './client'
import type {
  Summary,
  ActionItem,
  Risk,
  MeetingSummary,
  SummaryListItem,
} from '@/types'
import {
  IS_DEMO_MODE,
  demoGenerateSummary,
  demoGetActionItems,
  demoGetMeetingSummary,
  demoGetRisks,
  demoGetSummaryDetail,
  demoListSummaries,
  demoUpdateSummary,
  demoUpdateActionItem,
} from '@/lib/demo-data'

// 获取所有纪要列表
export async function listSummaries(
  page = 1,
  pageSize = 20,
): Promise<SummaryListItem[]> {
  if (IS_DEMO_MODE) return demoListSummaries(page, pageSize)
  return apiClient
    .get('summaries', {
      searchParams: { page, page_size: pageSize },
    })
    .json()
}

// 生成纪要（触发 Multi-Agent）
export async function generateSummary(meetingId: string): Promise<Summary> {
  if (IS_DEMO_MODE) return demoGenerateSummary(meetingId)
  return apiClient.post(`meetings/${meetingId}/summarize`).json()
}

// 获取会议纪要综合数据（纪要 + 行动项 + 风险）
export async function getMeetingSummary(meetingId: string): Promise<MeetingSummary> {
  if (IS_DEMO_MODE) return demoGetMeetingSummary(meetingId)
  return apiClient.get(`meetings/${meetingId}/summary`).json()
}

// 获取纪要详情
export async function getSummaryDetail(meetingId: string): Promise<Summary> {
  if (IS_DEMO_MODE) return demoGetSummaryDetail(meetingId)
  return apiClient.get(`meetings/${meetingId}/summary/detail`).json()
}

export async function updateSummary(meetingId: string, content: string): Promise<Summary> {
  if (IS_DEMO_MODE) return demoUpdateSummary(meetingId, content)
  return apiClient.patch(`meetings/${meetingId}/summary`, { json: { content } }).json()
}

// 获取行动项列表
export async function getActionItems(meetingId: string): Promise<ActionItem[]> {
  if (IS_DEMO_MODE) return demoGetActionItems(meetingId)
  return apiClient.get(`meetings/${meetingId}/action-items`).json()
}

// 更新行动项
export async function updateActionItem(
  meetingId: string,
  itemId: string,
  data: { status?: string; priority?: string; assignee?: string },
): Promise<ActionItem> {
  if (IS_DEMO_MODE) return demoUpdateActionItem(meetingId, itemId, data as Partial<ActionItem>)
  return apiClient
    .patch(`meetings/${meetingId}/action-items/${itemId}`, { json: data })
    .json()
}

// 获取风险列表
export async function getRisks(meetingId: string): Promise<Risk[]> {
  if (IS_DEMO_MODE) return demoGetRisks(meetingId)
  return apiClient.get(`meetings/${meetingId}/risks`).json()
}
