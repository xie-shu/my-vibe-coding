import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Circle, Clock, User, Calendar, FileSearch, RefreshCw } from 'lucide-react'
import type { ActionItem } from '@/types'
import { formatDate, cn } from '@/lib/utils'

const priorityConfig = {
  high: { label: '高', variant: 'destructive' as const },
  medium: { label: '中', variant: 'warning' as const },
  low: { label: '低', variant: 'secondary' as const },
}

const statusConfig = {
  pending: { label: '待办', icon: Circle, variant: 'secondary' as const },
  in_progress: { label: '进行中', icon: Clock, variant: 'info' as const },
  done: { label: '已完成', icon: CheckCircle2, variant: 'success' as const },
}

interface ActionItemListProps {
  items: ActionItem[]
  onToggleStatus?: (item: ActionItem) => void
  focusId?: string
}

export function ActionItemList({ items, onToggleStatus, focusId }: ActionItemListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 opacity-50" />
        <p className="mt-2 text-sm">暂无行动项</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const priority = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.medium
        const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending
        const StatusIcon = status.icon

        return (
          <Card key={item.id} className={cn(focusId === item.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onToggleStatus?.(item)}
                  aria-label={`切换“${item.title}”的状态，当前为${status.label}`}
                  title="依次切换：待办、进行中、已完成"
                  className="mt-0.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <StatusIcon className="h-5 w-5" />
                </button>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-medium', item.status === 'done' && 'text-muted-foreground line-through')}>
                      {item.title}
                    </p>
                    <div className="flex shrink-0 gap-1.5">
                      <Badge variant={priority.variant}>{priority.label}</Badge>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {item.assignee && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.assignee}
                      </span>
                    )}
                    {item.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.due_date)}
                      </span>
                    )}
                    {item.source && (
                      <span className="flex items-center gap-1">
                        <FileSearch className="h-3 w-3" />
                        {item.source === 'ai_extracted' ? 'AI 从组会原文提取' : item.source === 'external_sync' ? '实验平台同步' : '手动创建'}
                      </span>
                    )}
                    {item.last_updated_by && (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        {item.last_updated_by}
                      </span>
                    )}
                  </div>
                  {item.evidence && (
                    <p className="rounded-md border-l-2 border-l-primary bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">“{item.evidence}”</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
