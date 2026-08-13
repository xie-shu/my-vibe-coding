import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  FileCheck2,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AgentRunStatusBadge,
  ReviewStatusBadge,
} from '../components/agent-run-status-badge'
import { ReviewDialog } from '../components/review-dialog'
import { useAgentRuns, useAgentRunStats } from '../hooks/use-agent-runs'
import { formatDateTime } from '@/lib/utils'
import type { AgentRun, AgentRunStatus } from '@/types'

const STATUS_FILTERS: { label: string; value: AgentRunStatus | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '正在整理', value: 'running' },
  { label: '待导师确认', value: 'paused' },
  { label: '处理完成', value: 'succeeded' },
  { label: '处理异常', value: 'failed' },
]

export default function AgentRunListPage() {
  const [statusFilter, setStatusFilter] = useState<AgentRunStatus | 'all'>('all')
  const [reviewRun, setReviewRun] = useState<AgentRun | null>(null)
  const navigate = useNavigate()

  const { data: stats, isLoading: statsLoading } = useAgentRunStats()
  const { data, isLoading } = useAgentRuns({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page_size: 50,
  })
  const runs = data?.items ?? []

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div>
        <h1 className="text-2xl font-bold">研究处理记录</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看组会整理进度、研究产出与导师确认状态
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="已处理组会"
          value={stats?.total_runs ?? 0}
          icon={<Activity className="h-4 w-4" />}
          loading={statsLoading}
        />
        <StatCard
          title="处理完成率"
          value={`${((stats?.success_rate ?? 0) * 100).toFixed(1)}%`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          loading={statsLoading}
        />
        <StatCard
          title="待导师确认"
          value={stats?.status_counts.paused ?? 0}
          icon={<UserCheck className="h-4 w-4" />}
          loading={statsLoading}
        />
        <StatCard
          title="已确认记录"
          value={stats?.status_counts.succeeded ?? 0}
          icon={<FileCheck2 className="h-4 w-4" />}
          loading={statsLoading}
        />
      </div>

      {/* 状态分布 */}
      {stats && (
        <div className="flex flex-wrap gap-3 text-sm">
          {(['running', 'paused', 'succeeded', 'failed'] as AgentRunStatus[]).map((s) => (
            <div
              key={s}
              className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5"
            >
              <StatusIcon status={s} />
              <span className="text-muted-foreground">{statusLabel(s)}</span>
              <span className="font-semibold">
                {stats.status_counts[s] ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 状态过滤 */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={statusFilter === f.value ? 'default' : 'outline'}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Run 列表 */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : runs.length > 0 ? (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              onClick={() => navigate(`/agent-runs/${run.id}`)}
              onReview={() => setReviewRun(run)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Activity className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">暂无研究处理记录</p>
        </div>
      )}

      {/* 审批对话框 */}
      <ReviewDialog
        run={reviewRun}
        open={!!reviewRun}
        onClose={() => setReviewRun(null)}
      />
    </div>
  )
}

// ── 子组件 ──

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  loading?: boolean
}

function StatCard({ title, value, icon, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon}
        </div>
        <div className="mt-2 text-2xl font-bold">
          {loading ? <Skeleton className="h-7 w-16" /> : value}
        </div>
      </CardContent>
    </Card>
  )
}

function RunRow({
  run,
  onClick,
  onReview,
}: {
  run: AgentRun
  onClick: () => void
  onReview: () => void
}) {
  const stepCount = run.steps.length
  const succeededSteps = run.steps.filter((s) => s.status === 'succeeded').length
  const failedSteps = run.steps.filter(
    (s) => s.status === 'failed' || s.status === 'timeout' || s.status === 'budget_exceeded',
  ).length
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* 左侧 */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <AgentRunStatusBadge status={run.status} />
              {run.review_status && <ReviewStatusBadge status={run.review_status} />}
              <span className="text-xs text-muted-foreground">
                组会 {run.meeting_id.slice(0, 16)}…
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDateTime(run.started_at)}
              {run.finished_at && ` → ${formatDateTime(run.finished_at)}`}
            </div>
            <div className="text-xs text-muted-foreground">
              整理进度：{succeededSteps}/{stepCount} 项完成
              {failedSteps > 0 && (
                <span className="text-destructive"> · {failedSteps} 项异常</span>
              )}
            </div>
          </div>

          {/* 右侧：研究产出 */}
          <div className="hidden shrink-0 text-right sm:block">
            <div className="text-xs font-medium">纪要 · 决策 · 行动项</div>
            <div className="mt-1 text-xs text-muted-foreground">点击查看处理详情</div>
          </div>

          {/* 审批按钮 */}
          {run.status === 'paused' && run.review_status === 'pending' && (
            <Button
              size="sm"
              variant="default"
              onClick={(e) => {
                e.stopPropagation()
                onReview()
              }}
            >
              导师确认
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusIcon({ status }: { status: AgentRunStatus }) {
  const cls = 'h-3.5 w-3.5'
  switch (status) {
    case 'running':
      return <PlayCircle className={`${cls} text-blue-500`} />
    case 'paused':
      return <PauseCircle className={`${cls} text-yellow-500`} />
    case 'succeeded':
      return <CheckCircle2 className={`${cls} text-green-500`} />
    case 'failed':
      return <XCircle className={`${cls} text-red-500`} />
    default:
      return <Activity className={`${cls} text-muted-foreground`} />
  }
}

function statusLabel(s: AgentRunStatus): string {
  const m: Record<AgentRunStatus, string> = {
    pending: '等待处理',
    running: '正在整理',
    succeeded: '处理完成',
    failed: '处理异常',
    paused: '待导师确认',
    cancelled: '已取消',
  }
  return m[s]
}
