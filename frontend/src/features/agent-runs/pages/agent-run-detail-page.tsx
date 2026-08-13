import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  DollarSign,
  FileText,
  GitBranch,
  ListChecks,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMeeting } from '@/features/meetings/hooks/use-meetings'
import { useMeetingSummary } from '@/features/summaries/hooks/use-summaries'
import { useDecisions } from '@/features/decisions/hooks/use-decisions'
import { formatDateTime } from '@/lib/utils'
import type { AgentRunStep, ExecutionPlan, ToolCall } from '@/types'
import {
  AgentRunStatusBadge,
  ReviewStatusBadge,
} from '../components/agent-run-status-badge'
import { ReviewDialog } from '../components/review-dialog'
import { useAgentRun } from '../hooks/use-agent-runs'

const STEP_STATUS_STYLES: Record<string, { dot: string; badge: string }> = {
  running: { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  succeeded: { dot: 'bg-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
  failed: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  timeout: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  skipped: { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  budget_exceeded: { dot: 'bg-red-600', badge: 'bg-red-200 text-red-800 dark:bg-red-950 dark:text-red-200' },
  invalid_output: { dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' },
}

const STEP_STATUS_LABELS: Record<string, string> = {
  running: '整理中',
  succeeded: '已完成',
  failed: '异常',
  timeout: '超时',
  skipped: '跳过',
  budget_exceeded: '预算超限',
  invalid_output: '结果需检查',
}

export default function AgentRunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: run, isLoading } = useAgentRun(id)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const { data: meeting, isLoading: meetingLoading } = useMeeting(run?.meeting_id)
  const { data: summaryData, isLoading: summaryLoading } = useMeetingSummary(run?.meeting_id)
  const { data: decisionsData, isLoading: decisionsLoading } = useDecisions(0, 20, run?.meeting_id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">研究处理记录不存在</p>
        <Button className="mt-3" variant="outline" onClick={() => navigate('/agent-runs')}>
          返回列表
        </Button>
      </div>
    )
  }

  const isWaitingReview = run.status === 'paused' && run.review_status === 'pending'
  const visibleSteps = run.steps.filter((step) => step.node !== 'risk_agent')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" aria-label="返回处理记录" onClick={() => navigate('/agent-runs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold sm:text-2xl">{meetingLoading ? '正在加载组会…' : meeting?.title || '组会研究处理记录'}</h1>
              <AgentRunStatusBadge status={run.status} />
              {run.review_status && <ReviewStatusBadge status={run.review_status} />}
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              AI 已整理组会原文，请检查研究结论、研究决策和实验任务
            </p>
          </div>
        </div>
        {isWaitingReview && (
          <Button onClick={() => setReviewOpen(true)} className="self-start sm:self-auto">
            <UserCheck className="h-4 w-4" />
            导师确认
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b bg-muted/35 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">处理概览</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">先检查研究产出和导师确认状态；模型消耗位于高级明细</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className={`h-2 w-2 rounded-full ${run.status === 'succeeded' ? 'bg-green-500' : run.status === 'paused' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                {run.status === 'paused' ? '研究结论等待导师确认' : run.status === 'succeeded' ? '研究结论已确认' : 'AI 正在整理组会'}
              </div>
            </div>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem label="开始处理" value={formatDateTime(run.started_at)} />
            <InfoItem label="处理完成" value={run.finished_at ? formatDateTime(run.finished_at) : '等待导师确认'} />
            <InfoItem label="处理阶段" value={formatCurrentStage(run.current_node, run.status)} />
            <InfoItem label="导师确认" value={run.reviewer ? `${run.reviewer} · 已确认` : run.review_status === 'pending' ? '待确认' : '无需确认'} />
            {run.error && (
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">处理异常</div>
                <div className="mt-1 rounded-md bg-destructive/10 p-2 text-xs text-destructive">{run.error}</div>
              </div>
            )}
          </div>
          {run.review_note && (
            <div className="border-t px-5 py-4 text-sm leading-6">
              <span className="text-muted-foreground">导师意见：</span>{run.review_note}
            </div>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="outputs-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="outputs-title" className="text-lg font-semibold">本次研究产出</h2>
            <p className="mt-1 text-xs text-muted-foreground">从同一份组会原文中并行提取</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <OutputCard loading={summaryLoading} icon={<FileText className="h-4 w-4" />} title="组会纪要" value={summaryData?.summary ? 1 : 0} detail={summaryData?.summary ? '已生成结构化结论' : '尚未生成'} />
          <OutputCard loading={decisionsLoading} icon={<GitBranch className="h-4 w-4" />} title="研究决策" value={decisionsData?.total ?? 0} detail="含方案、理由与异议" />
          <OutputCard loading={summaryLoading} icon={<ListChecks className="h-4 w-4" />} title="实验行动项" value={summaryData?.action_items.length ?? 0} detail="负责人和截止日期已提取" />
        </div>
      </section>

      {run.plan && (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <h2 className="mb-3 font-semibold">为什么需要导师确认</h2>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <PlanItem label="AI 整理内容" value={formatResearchOutputs(run.plan)} />
              <PlanItem label="确认要求" value={run.plan.needs_human_review ? '涉及实验方案或评价口径，需导师确认' : '普通记录，无需额外确认'} />
              <div className="sm:col-span-2"><PlanItem label="判断依据" value={run.plan.reason} /></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 sm:p-5">
          <h2 className="mb-4 font-semibold">AI 整理进度 ({visibleSteps.length})</h2>
          {visibleSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无处理步骤</p>
          ) : (
            <div className="space-y-3">
              {visibleSteps.map((step, index) => (
                <StepRow key={`${step.node}-${index}`} step={step} isLast={index === visibleSteps.length - 1} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <button
          type="button"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((value) => !value)}
          className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted"><SlidersHorizontal className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">高级运行明细</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">面向管理员：模型用量、费用预算、节点和工具调用</span>
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
        </button>
        {advancedOpen && (
          <CardContent className="space-y-5 border-t p-4 sm:p-5">
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
              Token 与成本用于限制 AI 处理预算、定位高消耗步骤，不代表研究进度。Demo 数字是演示数据，接入模型 API 后才统计真实调用。
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BudgetCard icon={<Coins className="h-4 w-4" />} title="总 Token" used={run.total_tokens} max={run.max_tokens} format={(value) => value.toLocaleString()} />
              <BudgetCard icon={<DollarSign className="h-4 w-4" />} title="估算成本 (USD)" used={run.total_cost_usd} max={run.max_cost_usd} format={(value) => `$${value.toFixed(4)}`} />
              <BudgetCard icon={<Clock className="h-4 w-4" />} title="输入 Token" used={run.input_tokens} max={null} format={(value) => value.toLocaleString()} />
              <BudgetCard icon={<Clock className="h-4 w-4" />} title="输出 Token" used={run.output_tokens} max={null} format={(value) => value.toLocaleString()} />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {run.node_usage && Object.keys(run.node_usage).length > 0 && (
                <div className="rounded-md border p-4">
                  <h3 className="mb-3 text-sm font-semibold">节点模型用量</h3>
                  <div className="space-y-2">
                    {Object.entries(run.node_usage).map(([node, usage]) => (
                      <div key={node} className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-mono text-xs">{node}</span>
                        <span className="text-xs text-muted-foreground">{usage.tokens.toLocaleString()} tokens · ${usage.cost.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-md border p-4">
                <h3 className="mb-3 text-sm font-semibold">运行配置</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PlanItem label="运行 ID" value={run.id} />
                  <PlanItem label="工作流" value={run.graph_name} />
                  <PlanItem label="组会 ID" value={run.meeting_id} />
                  <PlanItem label="原文处理策略" value={run.plan?.transcript_strategy ?? '—'} />
                </div>
              </div>
            </div>
            {run.tool_calls.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold">工具调用记录 ({run.tool_calls.length})</h3>
                <div className="space-y-2">{run.tool_calls.map((call, index) => <ToolCallRow key={`${call.tool}-${index}`} call={call} />)}</div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <ReviewDialog run={run} open={reviewOpen} onClose={() => setReviewOpen(false)} />
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-sm font-medium leading-6">{value}</div></div>
}

function OutputCard({ icon, title, value, detail, loading }: { icon: React.ReactNode; title: string; value: number; detail: string; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground"><span className="text-sm">{title}</span>{icon}</div>
        <div className="mt-3 flex min-h-8 items-end gap-2">{loading ? <Skeleton className="h-7 w-12" /> : <><span className="text-2xl font-bold">{value}</span><span className="pb-0.5 text-xs text-muted-foreground">项</span></>}</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function BudgetCard({ icon, title, used, max, format }: { icon: React.ReactNode; title: string; used: number; max: number | null; format: (value: number) => string }) {
  const percentage = max ? Math.min(100, (used / max) * 100) : 0
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{title}</span>{icon}</div>
      <div className="mt-2 text-xl font-bold">{format(used)}{max !== null && <span className="ml-1 text-xs font-normal text-muted-foreground">/ {format(max)}</span>}</div>
      {max !== null && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full ${percentage > 80 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${percentage}%` }} /></div>}
    </div>
  )
}

function PlanItem({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-sm leading-6">{value}</div></div>
}

function formatResearchOutputs(plan: ExecutionPlan): string {
  return [
    plan.should_run_summary && '组会纪要',
    plan.should_run_decisions && '研究决策',
    plan.should_run_actions && '实验行动项',
  ].filter(Boolean).join('、')
}

function formatCurrentStage(node: string | null | undefined, status: string): string {
  if (status === 'succeeded') return '全部处理完成'
  if (status === 'failed') return '处理异常'
  const labels: Record<string, string> = {
    planner: '识别组会类型',
    summary_agent: '整理组会纪要',
    decision_extractor: '提取研究决策',
    risk_agent: '整理研究产出',
    human_review: '等待导师确认',
  }
  return node ? labels[node] ?? node : '等待处理'
}

function StepRow({ step, isLast }: { step: AgentRunStep; isLast: boolean }) {
  const style = STEP_STATUS_STYLES[step.status] ?? { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700' }
  const label = STEP_STATUS_LABELS[step.status] ?? step.status
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center"><div className={`mt-1 h-3 w-3 rounded-full ${style.dot}`} />{!isLast && <div className="w-px flex-1 bg-border" />}</div>
      <div className="min-w-0 flex-1 pb-3">
        <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{formatStepName(step.node)}</span><span className={`rounded-md px-2 py-0.5 text-xs ${style.badge}`}>{label}</span></div>
        <div className="mt-1 text-xs text-muted-foreground">{step.started_at && formatDateTime(step.started_at)}{step.finished_at && ` → ${formatDateTime(step.finished_at)}`}{step.duration_ms !== undefined && ` · ${(step.duration_ms / 1000).toFixed(1)} 秒`}</div>
        {step.error && <div className="mt-1 rounded-md bg-destructive/10 p-2 text-xs text-destructive">{step.error}</div>}
      </div>
    </div>
  )
}

function formatStepName(node: string): string {
  const labels: Record<string, string> = {
    planner: '识别组会类型与处理范围',
    summary_agent: '生成结构化组会纪要',
    action_items_agent: '提取实验行动项',
    decision_extractor: '提取研究决策与依据',
    output_validator: '检查结构化结果',
    human_review: '导师确认研究结论',
    persist: '保存研究记录',
  }
  return labels[node] ?? node
}

function ToolCallRow({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false)
  const hasDetail = call.args || call.result || call.error
  return (
    <div className="rounded-md border bg-muted/30 text-sm">
      <button type="button" disabled={!hasDetail} onClick={() => setOpen((value) => !value)} className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left disabled:cursor-default">
        <div className="flex min-w-0 items-center gap-2">{hasDetail ? open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" /> : <span className="w-3" />}<span className={`h-2 w-2 shrink-0 rounded-full ${call.status === 'succeeded' ? 'bg-green-500' : 'bg-red-500'}`} /><span className="truncate font-mono text-xs">{call.tool}</span></div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground"><span>{call.duration_ms}ms</span><span className="hidden sm:inline">{formatDateTime(call.timestamp)}</span></div>
      </button>
      {open && hasDetail && (
        <div className="space-y-2 border-t px-3 py-2 text-xs">
          {call.args && Object.keys(call.args).length > 0 && <JsonBlock label="args" value={call.args} />}
          {call.result && <JsonBlock label="result" value={call.result} />}
          {call.error && <div><div className="font-medium text-muted-foreground">error</div><pre className="mt-1 overflow-x-auto rounded bg-destructive/10 p-2 font-mono text-destructive">{call.error}</pre></div>}
        </div>
      )}
    </div>
  )
}

function JsonBlock({ label, value }: { label: string; value: Record<string, unknown> }) {
  return <div><div className="font-medium text-muted-foreground">{label}</div><pre className="mt-1 overflow-x-auto rounded bg-background p-2 font-mono">{JSON.stringify(value, null, 2)}</pre></div>
}
