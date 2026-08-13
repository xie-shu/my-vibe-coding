import { memo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Bot,
  BookOpenText,
  GitBranch,
  Loader2,
  NotebookText,
  Square,
  User,
  Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { useVirtualList } from '@/hooks/use-virtual-list'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

interface ChatMessageVirtualListProps {
  messages: ChatMessage[]
  /** 流式输出中的临时内容 */
  streamingContent?: string
  isStreaming?: boolean
  /** 朗读回调 */
  onSpeak?: (text: string) => void
  /** 正在朗读的消息 ID */
  speakingId?: string
  className?: string
}

type EvidenceSource = NonNullable<
  NonNullable<ChatMessage['metadata']>['sources']
>[number]

const SOURCE_META: Record<
  string,
  { label: string; icon: typeof GitBranch; accent: string }
> = {
  decision: {
    label: '研究决策',
    icon: GitBranch,
    accent: 'border-l-emerald-500',
  },
  meeting_summary: {
    label: '组会纪要',
    icon: NotebookText,
    accent: 'border-l-sky-500',
  },
  uploaded_doc: {
    label: '研究资料',
    icon: BookOpenText,
    accent: 'border-l-amber-500',
  },
}

function getSourceHref(source: EvidenceSource) {
  if (source.source_type === 'decision' && source.source_id) {
    return `/decisions/${source.source_id}`
  }
  if (source.source_type === 'meeting_summary' && source.source_id) {
    return `/summaries/${source.source_id}`
  }
  if (source.source_type === 'uploaded_doc') return '/knowledge'
  return null
}

function ChatMessageVirtualListBase({
  messages,
  streamingContent,
  isStreaming,
  onSpeak,
  speakingId,
  className,
}: ChatMessageVirtualListProps) {
  // 包含流式消息的总数
  const hasStreaming = isStreaming && streamingContent !== undefined
  const count = messages.length + (hasStreaming ? 1 : 0)

  const { parentRef, virtualizer, items, totalSize, scrollToBottom } =
    useVirtualList({
      count,
      estimateSize: 120,
      overscan: 4,
    })

  // 新消息时自动滚动到底部
  const prevCount = useRef(0)
  useEffect(() => {
    if (count > prevCount.current) {
      scrollToBottom()
    }
    prevCount.current = count
  }, [count, scrollToBottom])

  // 流式内容变化时滚动
  useEffect(() => {
    if (hasStreaming) {
      scrollToBottom()
    }
  }, [streamingContent, hasStreaming, scrollToBottom])

  return (
    <div
      ref={parentRef}
      className={cn('h-full overflow-y-auto pr-2', className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const isStreamingItem =
            hasStreaming && virtualItem.index === messages.length
          const message = isStreamingItem
            ? null
            : messages[virtualItem.index]
          if (!message && !isStreamingItem) return null

          const isUser = message?.role === 'user'
          const content = isStreamingItem ? streamingContent : message?.content || ''

          return (
            <div
              key={isStreamingItem ? 'streaming' : message!.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="py-2"
            >
              <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    isUser ? 'bg-primary' : 'bg-primary/10',
                  )}
                >
                  {isUser ? (
                    <User className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className={cn('flex-1', isUser && 'flex flex-col items-end')}>
                  <div
                    className={cn(
                      'inline-block max-w-[85%] rounded-lg p-3',
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm">{content}</p>
                    ) : content ? (
                      <MarkdownRenderer content={content} />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* 回答依据：把检索技术翻译成研究者能核对的来源 */}
                  {message?.metadata?.sources &&
                    message.metadata.sources.length > 0 && (
                      <div className="mt-3 w-full max-w-[85%] space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          回答依据 · {message.metadata.sources.length} 条
                        </p>
                        <div className="grid gap-1.5">
                          {message.metadata.sources.map((src, i) => {
                            const meta = SOURCE_META[src.source_type] ?? SOURCE_META.uploaded_doc
                            const Icon = meta.icon
                            const href = getSourceHref(src)
                            const body = (
                              <>
                                <div className="flex min-w-0 items-start gap-2">
                                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[11px] text-muted-foreground">
                                        {meta.label} · 依据 {src.rank ?? i + 1}
                                      </span>
                                      {href && (
                                        <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                      )}
                                    </div>
                                    <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-5 text-foreground">
                                      {src.title}
                                    </p>
                                  </div>
                                </div>
                              </>
                            )

                            const className = cn(
                              'block min-h-[66px] border border-l-2 bg-background px-2.5 py-2 text-left transition-colors',
                              meta.accent,
                              href && 'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            )

                            return href ? (
                              <Link key={`${src.source_type}-${src.source_id ?? i}`} to={href} className={className}>
                                {body}
                              </Link>
                            ) : (
                              <div key={`${src.source_type}-${i}`} className={className}>
                                {body}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                  {/* 朗读按钮（仅 assistant 消息） */}
                  {!isUser && !isStreamingItem && onSpeak && content && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 px-2 text-xs text-muted-foreground"
                      onClick={() => onSpeak(content)}
                    >
                      {speakingId === message!.id ? (
                        <>
                          <Square className="mr-1 h-3 w-3" />
                          停止
                        </>
                      ) : (
                        <>
                          <Volume2 className="mr-1 h-3 w-3" />
                          朗读
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const ChatMessageVirtualList = memo(ChatMessageVirtualListBase)
