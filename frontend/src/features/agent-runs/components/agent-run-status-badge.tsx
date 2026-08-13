import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { AgentRunStatus, ReviewStatus } from '@/types'

interface AgentRunStatusBadgeProps {
  status: AgentRunStatus
}

const STATUS_CONFIG: Record<
  AgentRunStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  pending: { label: '等待处理', variant: 'secondary' },
  running: { label: '正在整理', variant: 'info' },
  succeeded: { label: '处理完成', variant: 'success' },
  failed: { label: '处理异常', variant: 'destructive' },
  paused: { label: '待导师确认', variant: 'warning' },
  cancelled: { label: '已取消', variant: 'secondary' },
}

export function AgentRunStatusBadge({ status }: AgentRunStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const REVIEW_CONFIG: Record<
  Exclude<ReviewStatus, null>,
  { label: string; variant: BadgeProps['variant'] }
> = {
  pending: { label: '待导师确认', variant: 'warning' },
  approved: { label: '导师已确认', variant: 'success' },
  rejected: { label: '导师已退回', variant: 'destructive' },
  skipped: { label: '无需确认', variant: 'secondary' },
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  if (!status) return null
  const config = REVIEW_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
