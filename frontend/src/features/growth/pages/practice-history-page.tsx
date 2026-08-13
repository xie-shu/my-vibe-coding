import { useMemo, useState } from 'react'
import { CalendarDays, FileText, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/utils'
import { useDailyQuestions, usePracticeAnswers } from '../hooks/use-growth'

export default function PracticeHistoryPage() {
  const { data: practices, isLoading } = usePracticeAnswers()
  const { data: questions } = useDailyQuestions()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = practices?.find((item) => item.id === selectedId) || practices?.[0]
  const question = questions?.find((item) => item.id === selected?.question_id)
  const averageScore = useMemo(() => practices?.length ? Math.round(practices.reduce((sum, item) => sum + item.score, 0) / practices.length) : 0, [practices])

  if (isLoading) return <div className="mx-auto max-w-[1480px] space-y-4"><Skeleton className="h-36" /><Skeleton className="h-80" /></div>

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-8">
      <section className="rounded-3xl border bg-card p-6 sm:p-8">
        <p className="mb-2 text-xs font-semibold text-primary">practice archive</p>
        <h1 className="text-3xl font-semibold">练习记录</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">沉淀每次产品思维训练的原回答、AI 点评、分数和参考答案，让面试准备从“感觉练过”变成“能复盘提升”。</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat icon={<FileText className="h-4 w-4" />} label="练习次数" value={`${practices?.length || 0}`} />
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="平均得分" value={averageScore ? `${averageScore}` : '—'} />
          <Stat icon={<CalendarDays className="h-4 w-4" />} label="最近练习" value={practices?.[0] ? formatDateTime(practices[0].created_at).slice(5) : '暂无'} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="rounded-2xl">
          <CardContent className="p-3">
            {practices && practices.length > 0 ? practices.map((practice) => {
              const q = questions?.find((item) => item.id === practice.question_id)
              return (
                <button key={practice.id} type="button" onClick={() => setSelectedId(practice.id)} className={`w-full rounded-xl p-4 text-left transition hover:bg-muted ${selected?.id === practice.id ? 'bg-muted' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{practice.score} 分</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(practice.created_at).slice(5)}</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-medium">{q?.title || '产品思维训练'}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{practice.transcript_text}</p>
                </button>
              )
            }) : (
              <div className="p-8 text-center text-sm text-muted-foreground">暂无练习记录，先完成今日训练。</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            {selected ? (
              <div className="space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {question?.ability_tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{question?.title || '产品思维训练'}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{question?.background}</p>
                </div>
                {question && (
                  <Block
                    title="出题依据"
                    text={`这道练习题基于以下材料和能力目标整理：\n\n- 相关资料来源：${question.source_ids.length > 0 ? question.source_ids.join('、') : '暂无'}\n- 考察能力：${question.ability_tags.join('、')}\n- 生成方式：围绕当前资料库中的 AI 热点、产品方法论和历史练习中暴露出的薄弱项组合成题\n\n所以它不是随机出的，而是为了让你在“资料输入 → 结构化表达 → AI 点评 → 复盘提升”这条链路上持续训练。`}
                  />
                )}
                <div className="grid gap-3 sm:grid-cols-4">
                  <Score label="综合" value={selected.score} />
                  <Score label="结构" value={selected.structure_score} />
                  <Score label="产品思维" value={selected.product_thinking_score} />
                  <Score label="表达" value={selected.expression_score} />
                </div>
                <Block title="我的回答" text={selected.transcript_text} />
                <div className="grid gap-5 lg:grid-cols-2">
                  <List title="回答优点" items={selected.strengths} />
                  <List title="需要优化" items={selected.weaknesses} />
                </div>
                <List title="改进建议" items={selected.suggestions} />
                <Block title="正确答案 / 参考答案" text={selected.reference_answer} />
                <Block
                  title="答案解析"
                  text={`这道题主要考察 ${question?.ability_tags.join('、') || '产品分析能力'}。一个更完整的回答需要同时讲清楚：用户是谁、痛点是什么、为什么 AI 能解决、V1.0 先做哪些最小闭环、用什么指标验证，以及 ASR/大模型点评不准时如何兜底。你的答案可以对照上面的参考答案，重点检查是否覆盖了“场景-方案-指标-风险”四个层次。`}
                />
              </div>
            ) : (
              <div className="flex h-80 flex-col items-center justify-center text-sm text-muted-foreground">选择一条练习记录查看详情</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border bg-muted/30 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-2 text-2xl font-semibold">{value}</p></div>
}

function Score({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div><p className="text-sm font-semibold">{title}</p><ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>
}

function Block({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border bg-muted/30 p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{text}</p></div>
}
