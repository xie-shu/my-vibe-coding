import { apiClient } from './client'
import { API_BASE_URL } from '@/lib/constants'
import type {
  Meeting,
  Transcript,
  MeetingStatus,
} from '@/types'
import {
  IS_DEMO_MODE,
  demoCreateMeeting,
  demoDeleteMeeting,
  demoGetMeeting,
  demoGetTranscripts,
  demoListMeetings,
  demoUpdateMeeting,
  demoUploadMeetingRecord,
  demoGetProcessingStatus,
} from '@/lib/demo-data'

// 创建会议
export async function createMeeting(data: {
  title: string
  description?: string
  participants?: string[]
  start_time?: string
  end_time?: string
}): Promise<Meeting> {
  if (IS_DEMO_MODE) return demoCreateMeeting(data)
  return apiClient.post('meetings', { json: data }).json()
}

// 获取会议列表
export async function listMeetings(
  page = 1,
  pageSize = 20,
): Promise<Meeting[]> {
  if (IS_DEMO_MODE) return demoListMeetings(page, pageSize)
  return apiClient
    .get('meetings', {
      searchParams: { page, page_size: pageSize },
    })
    .json()
}

// 获取会议详情
export async function getMeeting(id: string): Promise<Meeting> {
  if (IS_DEMO_MODE) return demoGetMeeting(id)
  return apiClient.get(`meetings/${id}`).json()
}

// 更新会议
export async function updateMeeting(
  id: string,
  data: Partial<Pick<Meeting, 'title' | 'description' | 'participants'>>,
): Promise<Meeting> {
  if (IS_DEMO_MODE) return demoUpdateMeeting(id, data)
  return apiClient.patch(`meetings/${id}`, { json: data }).json()
}

// 删除会议
export async function deleteMeeting(id: string): Promise<void> {
  if (IS_DEMO_MODE) return demoDeleteMeeting(id)
  await apiClient.delete(`meetings/${id}`)
}

export async function uploadMeetingRecord(
  meetingId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Meeting> {
  if (IS_DEMO_MODE) return demoUploadMeetingRecord(meetingId, file, onProgress)
  const formData = new FormData()
  formData.append('file', file)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
      else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).detail || '会议记录上传失败'))
        } catch {
          reject(new Error('会议记录上传失败'))
        }
      }
    })
    xhr.addEventListener('error', () => reject(new Error('网络错误')))
    xhr.open('POST', `${API_BASE_URL}/meetings/${meetingId}/record-upload`)
    xhr.send(formData)
  })
}

// 获取从会议文字记录解析出的原文片段
export async function getTranscripts(meetingId: string): Promise<Transcript[]> {
  if (IS_DEMO_MODE) return demoGetTranscripts(meetingId)
  return apiClient.get(`meetings/${meetingId}/transcripts`).json()
}

export async function getProcessingStatus(meetingId: string): Promise<{
  meeting_id: string
  status: MeetingStatus
  transcript_count: number
  summary_ready: boolean
  decision_count: number
}> {
  if (IS_DEMO_MODE) return demoGetProcessingStatus(meetingId)
  return apiClient.get(`meetings/${meetingId}/processing-status`).json()
}
