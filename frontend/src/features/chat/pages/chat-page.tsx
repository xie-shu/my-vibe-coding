import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Send,
  Trash2,
  MessageSquare,
  Loader2,
  Bot,
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
  Volume2,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  useChatSessions,
  useSessionMessages,
  useCreateSession,
  useDeleteSession,
  useStreamChat,
} from '../hooks/use-chat'
import { ChatMessageVirtualList } from '../components/chat-message-virtual-list'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis'
import type { ChatMessage } from '@/types'
import { IS_DEMO_MODE, demoSaveRealChatExchange } from '@/lib/demo-data'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const CHAT_MODEL_MODE = import.meta.env.VITE_CHAT_MODEL_MODE || 'real'

const buildGrowthContext = () => {
  const growthState =
    localStorage.getItem('growth-workbench-demo-state-v10-daily-focus') ||
    Object.keys(localStorage)
      .filter((key) => key.startsWith('growth-workbench-demo-state-'))
      .sort()
      .map((key) => localStorage.getItem(key))
      .find(Boolean)
  return [
    '当前产品是 AI 成长舱：面向 AI 产品经理求职与日常成长的个人工作台。',
    '核心功能包括：每日产品思维训练、语音/文字作答、AI 点评、AI 产品雷达、个人知识库、练习复盘库、成长问答。',
    growthState ? `本地训练题、练习记录与 AI 雷达示例 JSON：${growthState.slice(0, 6000)}` : '',
  ].filter(Boolean).join('\n\n')
}

export default function ChatPage() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [images, setImages] = useState<string[]>([]) // base64 data URL
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadedSessionRef = useRef<string | null>(null)

  const { data: sessions } = useChatSessions()
  const { data: dbMessages } = useSessionMessages(currentSessionId)
  const createSession = useCreateSession()
  const deleteSession = useDeleteSession()
  const { stream, isStreaming, streamingContent, reset } = useStreamChat()
  const queryClient = useQueryClient()

  // 语音识别
  const speechRecognition = useSpeechRecognition({
    onResult: (transcript, isFinal) => {
      if (isFinal) {
        setInput((prev) => (prev ? prev + transcript : transcript))
      }
    },
    onError: (err) => {
      console.error('语音识别错误:', err)
    },
  })

  // 语音合成
  const speechSynthesis = useSpeechSynthesis()

  // 切换会话时加载消息（仅非流式状态下同步，避免覆盖正在生成的消息）
  useEffect(() => {
    if (dbMessages && currentSessionId && loadedSessionRef.current !== currentSessionId) {
      setLocalMessages(dbMessages)
      loadedSessionRef.current = currentSessionId
    }
  }, [currentSessionId, dbMessages])

  useEffect(() => {
    if (!currentSessionId && sessions && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id)
    }
  }, [currentSessionId, sessions])

  const handleNewSession = async () => {
    try {
      const session = await createSession.mutateAsync({})
      setCurrentSessionId(session.id)
      setLocalMessages([])
      loadedSessionRef.current = session.id
      reset()
    } catch (err) {
      console.error('创建会话失败:', err)
    }
  }

  const handleImageSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_IMAGE_SIZE) {
        alert('图片大小不能超过 10MB')
        continue
      }

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setImages((prev) => [...prev, dataUrl])
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async (suggestedQuery?: string) => {
    const messageText = suggestedQuery ?? input
    if ((!messageText.trim() && images.length === 0) || !currentSessionId || isStreaming)
      return

    const userMsg: ChatMessage = {
      id: `temp-${crypto.randomUUID()}`,
      session_id: currentSessionId,
      role: 'user',
      content: messageText || '(图片)',
      created_at: new Date().toISOString(),
    }
    setLocalMessages((prev) => [...prev, userMsg])
    const query = messageText
    const sentImages = images.length > 0 ? images : undefined
    const history = localMessages
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }))
    setInput('')
    setImages([])

    await stream(
      currentSessionId,
      query,
      (fullContent) => {
        const assistantMsg: ChatMessage = {
          id: `assistant-${crypto.randomUUID()}`,
          session_id: currentSessionId,
          role: 'assistant',
          content: fullContent,
          metadata: IS_DEMO_MODE
            ? {
                sources: [
                  { source_id: 'knowledge-ai-pm-method', title: 'AI 产品经理面试表达框架', source_type: 'uploaded_doc', route: 'knowledge', rank: 1, score: 0.94 },
                  { source_id: 'knowledge-rag-prd', title: 'RAG 产品化价值说明', source_type: 'uploaded_doc', route: 'knowledge', rank: 2, score: 0.9 },
                ],
              }
            : undefined,
          created_at: new Date().toISOString(),
        }
        if (IS_DEMO_MODE && CHAT_MODEL_MODE === 'real') {
          demoSaveRealChatExchange(currentSessionId, query, fullContent)
        }
        setLocalMessages((prev) => [...prev, assistantMsg])
        queryClient.invalidateQueries({ queryKey: ['chat-sessions'] })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chatMessages(currentSessionId) })
        reset()
      },
      (err) => {
        const errorMsg: ChatMessage = {
          id: `error-${crypto.randomUUID()}`,
          session_id: currentSessionId,
          role: 'assistant',
          content: `[错误] ${err}`,
          created_at: new Date().toISOString(),
        }
        setLocalMessages((prev) => [...prev, errorMsg])
        reset()
      },
      sentImages,
      (sources) => {
        if (IS_DEMO_MODE) return
        setLocalMessages((prev) => {
          const last = prev[prev.length - 1]
          if (!last || last.role !== 'assistant') return prev
          return [...prev.slice(0, -1), { ...last, metadata: { sources } }]
        })
      },
      history,
      buildGrowthContext(),
    )
  }

  const handleToggleMic = () => {
    if (!speechRecognition.isSupported) {
      alert('当前浏览器不支持语音识别，请使用 Chrome / Edge / Safari')
      return
    }
    speechRecognition.toggle()
  }

  const handleToggleTTS = (text: string) => {
    if (!speechSynthesis.isSupported) {
      alert('当前浏览器不支持语音合成')
      return
    }
    speechSynthesis.toggle(text)
  }

  const handleDeleteSession = async (id: string) => {
    const session = sessions?.find((item) => item.id === id)
    if (!window.confirm(`确定删除历史会话“${session?.title || '未命名会话'}”吗？`)) return
    await deleteSession.mutateAsync(id)
    if (currentSessionId === id) {
      setCurrentSessionId(null)
      setLocalMessages([])
      loadedSessionRef.current = null
    }
  }

  return (
    <div className="ambient-shell flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-4 md:flex-row">
      {/* 侧边栏：会话列表 */}
      <div className="glass-card soft-reveal flex h-40 w-full shrink-0 flex-col border-b pb-3 md:h-auto md:w-64 md:border-b-0 md:border-r md:pb-0 md:pr-4">
        <Button onClick={handleNewSession} className="mb-3" disabled={createSession.isPending || isStreaming}>
          {createSession.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          新建对话
        </Button>

        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">历史会话</span>
          <Badge variant="secondary" className="text-[11px]">
            {CHAT_MODEL_MODE === 'real' ? 'GPT 实时' : IS_DEMO_MODE ? 'Demo 模拟' : 'GPT-5.4 Mini'}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {sessions?.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                  currentSessionId === session.id && 'bg-accent',
                  isStreaming && currentSessionId !== session.id && 'cursor-not-allowed opacity-50',
                )}
                onClick={() => {
                  if (!isStreaming) setCurrentSessionId(session.id)
                }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate">{session.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(session.created_at).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-100 md:h-6 md:w-6 md:opacity-0 md:group-hover:opacity-100"
                  aria-label={`删除对话“${session.title}”`}
                  disabled={isStreaming || deleteSession.isPending}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteSession(session.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 主区域：对话 */}
      <div className="glass-card soft-reveal soft-reveal-delay-1 flex min-h-0 flex-1 flex-col">
        {currentSessionId ? (
          <>
            {/* 消息列表（虚拟滚动） */}
            <div className="flex-1 overflow-hidden py-4">
              {localMessages.length === 0 && !isStreaming ? (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <Bot className="h-12 w-12 opacity-30" />
                  <p className="mt-3 text-sm">开始向 AI 成长助手提问</p>
                  <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2">
                    {['今天的题目考察什么能力？', '我上次回答哪里不好？', '最近 AI 产品趋势有哪些？', '为什么这个产品需要 RAG？'].map((prompt) => (
                      <button key={prompt} type="button" onClick={() => handleSend(prompt)} className="min-h-11 cursor-pointer rounded-md border bg-card px-3 py-2 text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ChatMessageVirtualList
                  messages={localMessages}
                  streamingContent={streamingContent}
                  isStreaming={isStreaming}
                  onSpeak={handleToggleTTS}
                  speakingId={speechSynthesis.isSpeaking ? 'streaming' : undefined}
                />
              )}
            </div>

            {/* 图片预览区 */}
            {images.length > 0 && (
              <div className="flex gap-2 border-t pt-2">
                {images.map((img, i) => (
                  <div key={i} className="group relative">
                    <img
                      src={img}
                      alt={`上传图片 ${i + 1}`}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 输入框 */}
            <div className="flex items-end gap-2 border-t pt-4">
              {/* 图片上传按钮 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleImageSelect(e.target.files)
                  e.target.value = ''
                }}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                title="上传图片"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>

              {/* 语音输入按钮 */}
              <Button
                variant={speechRecognition.isListening ? 'destructive' : 'outline'}
                size="icon"
                onClick={handleToggleMic}
                disabled={isStreaming}
                title={speechRecognition.isListening ? '停止语音输入' : '语音输入'}
              >
                {speechRecognition.isListening ? (
                  <MicOff className="h-4 w-4 animate-pulse" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>

              <Input
                aria-label="向 AI 成长助手提问"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={
                  speechRecognition.isListening ? '正在聆听...' : '问练习、趋势、知识库或面试表达，Enter 发送...'
                }
                disabled={isStreaming}
                className="flex-1"
              />

              {/* TTS 朗读按钮（朗读最后一条 AI 回复） */}
              {localMessages.length > 0 &&
                localMessages[localMessages.length - 1].role === 'assistant' &&
                !isStreaming && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleToggleTTS(localMessages[localMessages.length - 1].content)
                    }
                    title={speechSynthesis.isSpeaking ? '停止朗读' : '朗读回复'}
                  >
                    {speechSynthesis.isSpeaking ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                )}

              <Button onClick={() => handleSend()} disabled={(!input.trim() && images.length === 0) || isStreaming} aria-label="发送消息">
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <Bot className="h-16 w-16 opacity-20" />
            <p className="mt-4 text-sm">选择或新建对话开始</p>
            <p className="mt-1 text-xs">支持语音输入、图片上传和历史会话</p>
          </div>
        )}
      </div>
    </div>
  )
}
