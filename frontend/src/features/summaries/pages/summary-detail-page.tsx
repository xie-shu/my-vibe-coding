import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  CheckSquare,
  Sparkles,
  Loader2,
  AlertCircle,
  Pencil,
  Save,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { ActionItemList } from '../components/action-item-list'
import {
  useMeetingSummary,
  useGenerateSummary,
  useUpdateSummary,
  useUpdateActionItem,
} from '../hooks/use-summaries'
import { useMeeting } from '@/features/meetings/hooks/use-meetings'
import { cn } from '@/lib/utils'
import type { ActionItem } from '@/types'

type Tab = 'summary' | 'actions'

export default function SummaryListPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const focusId = searchParams.get('focus') || undefined
  const [activeTab, setActiveTab] = useState<Tab>(
    requestedTab === 'actions' ? requestedTab : 'summary',
  )
  const [isEditing, setIsEditing] = useState(false)
  const [draftContent, setDraftContent] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  const { data: meeting } = useMeeting(id)
  const { data: summaryData, isLoading } = useMeetingSummary(id)
  const generateSummary = useGenerateSummary()
  const updateSummary = useUpdateSummary(id)
  const updateActionItem = useUpdateActionItem(id)

  const summary = summaryData?.summary
  const actionItems = summaryData?.action_items || []

  useEffect(() => {
    if (!isEditing) setDraftContent(summary?.content || '')
  }, [summary?.content, isEditing])

  const isGenerating = generateSummary.isPending
  const summaryStatus = summary?.status

  const handleGenerate = async () => {
    if (!id) return
    try {
      await generateSummary.mutateAsync(id)
    } catch (err) {
      console.error('生成失败:', err)
    }
  }

  const handleToggleActionStatus = (item: ActionItem) => {
    const newStatus: ActionItem['status'] =
      item.status === 'pending' ? 'in_progress' : item.status === 'in_progress' ? 'done' : 'pending'
    updateActionItem.mutate({ itemId: item.id, data: { status: newStatus } })
  }

  const handleStartEditing = () => {
    setDraftContent(summary?.content || '')
    setSaveMessage('')
    setIsEditing(true)
  }

  const handleCancelEditing = () => {
    setDraftContent(summary?.content || '')
    setSaveMessage('')
    setIsEditing(false)
  }

  const handleSaveSummary = async () => {
    if (!draftContent.trim()) {
      setSaveMessage('纪要内容不能为空')
      return
    }
    try {
      await updateSummary.mutateAsync(draftContent)
      setIsEditing(false)
      setSaveMessage('修改已保存')
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : '保存失败，请重试')
    }
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button variant="ghost" onClick={() => navigate('/summaries')} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {meeting?.title || '组会纪要'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            根据腾讯会议文字记录生成，可人工校对后保存为正式组会记录
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="self-start"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGenerating ? '生成中...' : '生成纪要'}
        </Button>
      </div>

      {/* 生成中提示 */}
      {summaryStatus === 'generating' && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Multi-Agent 正在生成纪要...
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                纪要、行动项和研究决策正在并行整理
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 生成失败提示 */}
      {summaryStatus === 'failed' && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium">纪要生成失败</p>
              <p className="text-xs text-muted-foreground">请重试或检查会议原文</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 切换 */}
      <div className="flex gap-1 overflow-x-auto border-b">
        <TabButton
          active={activeTab === 'summary'}
          onClick={() => setActiveTab('summary')}
          icon={<FileText className="h-4 w-4" />}
          label="纪要"
          count={summary ? 1 : 0}
        />
        <TabButton
          active={activeTab === 'actions'}
          onClick={() => setActiveTab('actions')}
          icon={<CheckSquare className="h-4 w-4" />}
          label="行动项"
          count={actionItems.length}
        />
      </div>

      {/* 内容区 */}
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          {activeTab === 'summary' && (
            <Card>
              <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <CardTitle>组会纪要</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">AI 初稿需要结合腾讯会议原文人工校对</p>
                </div>
                {summary?.content && (
                  isEditing ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleCancelEditing} disabled={updateSummary.isPending}>
                        <X className="h-4 w-4" />
                        取消
                      </Button>
                      <Button size="sm" onClick={handleSaveSummary} disabled={updateSummary.isPending}>
                        {updateSummary.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {updateSummary.isPending ? '保存中' : '保存修改'}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleStartEditing}>
                      <Pencil className="h-4 w-4" />
                      编辑纪要
                    </Button>
                  )
                )}
              </CardHeader>
              <CardContent>
                {summaryStatus === 'generating' ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={draftContent}
                      onChange={(event) => {
                        setDraftContent(event.target.value)
                        setSaveMessage('')
                      }}
                      className="min-h-[460px] resize-y font-mono text-sm leading-7"
                      aria-label="编辑组会纪要"
                    />
                    {saveMessage && <p className="text-sm text-destructive">{saveMessage}</p>}
                  </div>
                ) : summary?.content ? (
                  <>
                    <MarkdownRenderer content={summary.content} />
                    {summary.key_points && summary.key_points.length > 0 && (
                      <div className="mt-6 border-t pt-4">
                        <h4 className="mb-2 text-sm font-semibold">关键要点</h4>
                        <MarkdownRenderer
                          content={summary.key_points.map((p) => `- ${p}`).join('\n')}
                          className="text-sm text-muted-foreground"
                        />
                      </div>
                    )}
                    {saveMessage && <p className="mt-5 border-t pt-4 text-sm text-emerald-700">{saveMessage}</p>}
                  </>
                ) : (
                  <EmptyState
                    icon={<FileText className="h-8 w-8" />}
                    title="尚未生成纪要"
                    description="点击右上角「生成纪要」按钮开始"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/35 px-4 py-3 text-sm leading-6 text-muted-foreground">
                行动项是组会结束后需要落实的待办任务。系统从讨论中提取任务、负责人和截止日期，负责人再通过状态更新持续跟进。
              </div>
              <ActionItemList items={actionItems} onToggleStatus={handleToggleActionStatus} focusId={focusId} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
      {count > 0 && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">
          {count}
        </span>
      )}
    </button>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <div className="opacity-50">{icon}</div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs">{description}</p>
    </div>
  )
}
