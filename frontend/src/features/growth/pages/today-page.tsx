import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Brain, Flame, MessageSquare, Newspaper, Sparkles, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGrowthToday } from '../hooks/use-growth'

export default function TodayPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useGrowthToday()
  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date()),
    [],
  )

  if (isLoading || !data) {
    return <div className="mx-auto max-w-[1480px] space-y-4"><Skeleton className="h-48" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
  }

  return (
    <div className="ambient-shell mx-auto max-w-[1480px] space-y-7 pb-8">
      <section className="glass-card soft-reveal overflow-hidden rounded-3xl border-pink-200/70 bg-[radial-gradient(circle_at_85%_12%,rgba(244,114,182,0.28),transparent_32%),radial-gradient(circle_at_8%_4%,rgba(253,186,116,0.32),transparent_30%),linear-gradient(135deg,rgba(255,247,237,0.98),rgba(252,231,243,0.94)_52%,rgba(244,194,194,0.88))] p-6 text-foreground shadow-xl shadow-pink-200/30 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/45 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> AI PM growth cockpit · {dateLabel}
            </p>
            <h1 className="gradient-text max-w-4xl text-3xl font-semibold leading-tight sm:text-5xl">每天做一道产品思维练习。</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">个人成长工作台会根据知识库、AI 产品资讯和历史练习生成练习题。</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric label="连续练习" value={`${data.stats.streak_days}天`} />
            <Metric label="练习次数" value={`${data.stats.practice_count}`} />
            <Metric label="平均分" value={data.stats.average_score ? `${data.stats.average_score}` : '—'} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="glass-card soft-reveal soft-reveal-delay-1 overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            <div className="border-b bg-muted/40 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-primary">今日产品思维练习</p>
                  <h2 className="mt-2 text-2xl font-semibold">{data.question.title}</h2>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{data.question.background}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.question.ability_tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-sm font-medium">推荐作答结构</p>
                <div className="mt-2 grid gap-2">
                  {data.question.suggested_structure.map((item, index) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{index + 1}</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <Button size="lg" onClick={() => navigate(`/practice/${data.question.id}`)}>
                开始今日练习 <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card soft-reveal soft-reveal-delay-2 rounded-2xl">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-primary">能力成长概览</p>
                <h2 className="mt-1 text-xl font-semibold">当前薄弱项：{data.stats.weakest_tag}</h2>
              </div>
              <Brain className="h-7 w-7 text-primary" />
            </div>
            <div className="grid gap-3">
              <Insight icon={<Flame className="h-4 w-4" />} title="今日建议" text="回答复杂问题时，先拆用户、场景、目标，再讲 AI 能力和边界。" />
              <Insight icon={<BookOpen className="h-4 w-4" />} title="资料沉淀" text="练习记录和参考答案会自动进入知识库，后续问答可追溯。" />
              <Insight icon={<MessageSquare className="h-4 w-4" />} title="AI 问答" text="可以直接问：我上次回答哪里不好？最近 AI 产品趋势有哪些？" />
            </div>
            <Button variant="outline" className="mt-5 w-full" onClick={() => navigate('/chat')}>问问 AI 成长助手</Button>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">今日 AI 产品热点</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/radar')}>查看全部 <ArrowRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.radar_items.slice(0, 4).map((item) => (
            <button key={item.id} type="button" onClick={() => navigate('/radar')} className="glass-card soft-reveal rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Badge variant="outline">{item.source_name}</Badge>
                  <Newspaper className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold leading-5">{item.title}</h3>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{item.pm_insight}</p>
              </button>
            ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-primary/15 bg-white/45 px-4 py-3 shadow-sm backdrop-blur"><p className="text-2xl font-semibold text-primary">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>
}

function Insight({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex gap-3 rounded-xl border bg-background/60 p-3"><div className="mt-0.5 text-primary">{icon}</div><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div></div>
}
