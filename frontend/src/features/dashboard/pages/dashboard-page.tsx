import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Clock3,
  FileUp,
  GitBranch,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMeetingSummary } from '@/features/summaries/hooks/use-summaries'
import { useMeetings } from '@/features/meetings/hooks/use-meetings'
import { useDecisions } from '@/features/decisions/hooks/use-decisions'

type Period = 'week' | 'month'

const metrics = {
  week: [
    { label: '处理组会', value: '3', detail: '本周 2 次方案评审', tone: 'teal' },
    { label: '研究决策', value: '9', detail: '导师确认 8 条', tone: 'coral' },
    { label: '实验闭环', value: '71%', detail: '5 / 7 已完成', tone: 'yellow' },
    { label: '节省整理时间', value: '2.1h', detail: '每次约 42 分钟', tone: 'ink' },
  ],
  month: [
    { label: '处理组会', value: '11', detail: '含 4 次实验评审', tone: 'teal' },
    { label: '研究决策', value: '31', detail: '导师确认率 87%', tone: 'coral' },
    { label: '实验闭环', value: '78%', detail: '25 / 32 已完成', tone: 'yellow' },
    { label: '节省整理时间', value: '7.7h', detail: '覆盖 4 位研究生', tone: 'ink' },
  ],
}

const timeline = [
  { time: '10:05', label: '问题界定', detail: '随机拆帧可能造成同源视频泄漏', status: 'done' },
  { time: '10:18', label: '方案比较', detail: '比较 RAG、Agent 与多模态问答方案', status: 'done' },
  { time: '10:34', label: '评价对齐', detail: '固定误报约束下比较 Recall，并报告 AP50-95', status: 'active' },
  { time: '10:48', label: '责任确认', detail: '赵哲审计数据，王博复现基线，孙悦整理困难样本', status: 'done' },
]

const actionStatus = {
  pending: { label: '待确认', className: 'bg-warning-soft text-warning-foreground' },
  in_progress: { label: '进行中', className: 'bg-secondary text-secondary-foreground' },
  done: { label: '已完成', className: 'bg-primary/10 text-primary' },
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('week')
  const navigate = useNavigate()
  const { data: meetings } = useMeetings(1, 20)
  const featuredMeeting = meetings?.find((meeting) => meeting.title.includes('AI PM')) || meetings?.[0]
  const featuredMeetingId = featuredMeeting?.id
  const { data: meetingSummary } = useMeetingSummary(featuredMeetingId)
  const { data: featuredDecisions } = useDecisions(0, 100, featuredMeetingId)
  const trackedActions = meetingSummary?.action_items.slice(0, 3) || []
  const decisionTarget = featuredMeetingId
    ? `/decisions?meetingId=${featuredMeetingId}`
    : '/decisions'
  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date()),
    [],
  )

  return (
    <div className="mx-auto max-w-[1480px] space-y-7 pb-8">
      <section className="flex flex-col gap-5 border-b border-border/80 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs font-semibold uppercase text-primary">Research decision workspace · {dateLabel}</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl">让每次组会，都推进一个可复现的结论。</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">AI 成长舱持续整理每日练习、AI 热点资料和个人复盘，让面试准备从“看过资料”走到“讲得清楚”。</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex rounded-md border bg-card p-1" aria-label="数据周期">
            {(['week', 'month'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={cn(
                  'min-h-9 cursor-pointer rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  period === item ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item === 'week' ? '本周' : '本月'}
              </button>
            ))}
          </div>
          <Button onClick={() => navigate('/meetings')}>
            <FileUp className="h-4 w-4" />
            导入组会
          </Button>
        </div>
      </section>

      <section aria-labelledby="overview-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="overview-title" className="text-sm font-semibold">决策概览</h2>
          <span className="text-xs text-muted-foreground">演示数据 · 实际使用时由组会自动汇总</span>
        </div>
        <div className="grid border-y bg-card sm:grid-cols-2 xl:grid-cols-4">
          {metrics[period].map((metric, index) => (
            <div key={metric.label} className={cn(
              'relative min-h-32 px-5 py-5 xl:border-t-0',
              index > 0 && 'border-t xl:border-l',
              index < 2 && 'sm:border-t-0',
              index >= 2 && 'sm:border-t',
              index % 2 === 1 && 'sm:border-l',
              index === 2 && 'xl:border-l',
            )}>
              <span className={cn('absolute left-5 top-0 h-1 w-10', `metric-${metric.tone}`)} />
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-3 font-mono text-3xl font-semibold leading-none">{metric.value}</p>
              <p className="mt-3 text-xs text-muted-foreground">{metric.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div>
        <section aria-labelledby="current-meeting-title" className="border bg-card">
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
                刚刚完成分析
              </div>
              <h2 id="current-meeting-title" className="mt-2 text-xl font-semibold">{featuredMeeting?.title || '最近一次组会'}</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />48 分钟</span>
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{featuredMeeting?.participants?.length || 0} 位参会者</span>
                <span className="flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" />{featuredDecisions?.total || 0} 条决策</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(decisionTarget)}>
              查看决策记录 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-5 rounded-md border-l-4 border-l-primary bg-muted/60 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">最终结论</p>
              <p className="mt-1 text-sm font-medium leading-6">V1.0 先完成每日题、作答点评、练习复盘和知识库问答闭环，再逐步优化上下文记忆与复杂问题理解。</p>
            </div>
            <div className="relative">
              <div className="absolute bottom-5 left-[71px] top-5 w-px bg-border" aria-hidden="true" />
              {timeline.map((item) => (
                <div key={item.time} className="relative grid grid-cols-[54px_18px_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="pt-0.5 font-mono text-xs text-muted-foreground">{item.time}</span>
                  <span className={cn('z-10 mt-1 h-3 w-3 rounded-full border-2 border-card ring-1', item.status === 'active' ? 'bg-coral ring-coral' : 'bg-primary ring-primary')} />
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div>
        <section aria-labelledby="actions-title">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 id="actions-title" className="text-lg font-semibold">行动项追踪</h2>
              <p className="mt-1 text-xs text-muted-foreground">从组会结论自动拆解，并持续追踪实验闭环</p>
            </div>
            <Button variant="ghost" size="sm" disabled={!featuredMeetingId} onClick={() => navigate(`/summaries/${featuredMeetingId}?tab=actions`)}>全部行动项 <ArrowRight className="h-4 w-4" /></Button>
          </div>
          <div className="overflow-hidden border bg-card">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_100px_100px_110px] gap-4 border-b bg-muted/50 px-5 py-3 text-xs font-semibold text-muted-foreground sm:grid">
              <span>任务</span><span>负责人</span><span>截止时间</span><span>跟进状态</span>
            </div>
            <div className="divide-y">
              {trackedActions.map((item) => {
                const status = actionStatus[item.status] || actionStatus.pending
                return (
                <button key={item.id} type="button" onClick={() => navigate(`/summaries/${featuredMeetingId}?tab=actions&focus=${item.id}`)} className="grid w-full cursor-pointer gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(0,1.5fr)_100px_100px_110px] sm:items-center sm:gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', item.status === 'done' ? 'bg-primary' : item.status === 'in_progress' ? 'bg-warning' : 'bg-muted-foreground')} />
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">AI 从组会原文提取</span></span>
                  </div>
                  <span className="text-sm"><span className="sm:hidden text-muted-foreground">负责人 · </span>{item.assignee}</span>
                  <span className="font-mono text-xs text-muted-foreground"><span className="sm:hidden font-sans">截止 · </span>{item.due_date?.slice(5).replace('-', '月')}日</span>
                  <span className={cn('inline-flex w-fit rounded px-2 py-1 text-xs font-semibold', status.className)}>{status.label}</span>
                </button>
              )})}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
