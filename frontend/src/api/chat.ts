import { apiClient } from './client'
import { API_BASE_URL } from '@/lib/constants'
import type { ChatSession, ChatMessage } from '@/types'
import {
  IS_DEMO_MODE,
  demoCreateSession,
  demoDeleteSession,
  demoGetSessionMessages,
  demoListSessions,
  demoStreamChat,
} from '@/lib/demo-data'

const CHAT_MODEL_MODE = import.meta.env.VITE_CHAT_MODEL_MODE || 'real'

// 创建会话
export async function createSession(data: {
  meeting_id?: string
  title?: string
}): Promise<ChatSession> {
  if (IS_DEMO_MODE) return demoCreateSession(data)
  return apiClient.post('chat/sessions', { json: data }).json()
}

// 获取会话列表
export async function listSessions(meetingId?: string): Promise<ChatSession[]> {
  if (IS_DEMO_MODE) return demoListSessions(meetingId)
  return apiClient
    .get('chat/sessions', {
      searchParams: meetingId ? { meeting_id: meetingId } : {},
    })
    .json()
}

// 获取会话消息
export async function getSessionMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  if (IS_DEMO_MODE) return demoGetSessionMessages(sessionId)
  return apiClient.get(`chat/sessions/${sessionId}/messages`).json()
}

// 删除会话
export async function deleteSession(sessionId: string): Promise<void> {
  if (IS_DEMO_MODE) return demoDeleteSession(sessionId)
  await apiClient.delete(`chat/sessions/${sessionId}`)
}

// SSE 流式对话
export async function* streamChat(
  sessionId: string,
  query: string,
  images?: string[],
  history?: Pick<ChatMessage, 'role' | 'content'>[],
  context?: string,
): AsyncGenerator<{ type: string; content?: string; message?: string; sources?: NonNullable<ChatMessage['metadata']>['sources'] }> {
  if (IS_DEMO_MODE && CHAT_MODEL_MODE !== 'real') {
    yield* demoStreamChat(sessionId, query)
    return
  }
  const url = IS_DEMO_MODE && CHAT_MODEL_MODE === 'real'
    ? `${API_BASE_URL}/chat/direct-stream`
    : `${API_BASE_URL}/chat/sessions/${sessionId}/stream`
  const response = await fetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, images, history, context }),
    },
  )

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // 解析 SSE 事件
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data) {
          try {
            yield JSON.parse(data)
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }
}
