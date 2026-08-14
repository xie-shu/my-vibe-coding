import { useMemo, useState } from 'react'
import { Bot, CalendarDays, FileAudio, Loader2, MessageSquareQuote, Mic2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/utils'
import type { InterviewRecord } from '@/types'
import { useAnalyzeInterviewAudio, useInterviewRecords } from '../hooks/use-growth'

export default function InterviewLibraryPage() {
  const { data: interviews, isLoading } = useInterviewRecords()
  const analyze = useAnalyzeInterviewAudio()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const selected = interviews?.find((item) => item.id === selectedId) || interviews?.[0]
  const averageScore = useMemo(
    () => interviews?.length ? Math.round(interviews.reduce((sum, item) => sum + item.overall_score, 0) / interviews.length) : 0,
    [interviews],
  )

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setMessage(null)
    try {
      const record = await analyze.mutateAsync(file)
      setSelectedId(record.id)
      setMessage(`「${file.name}」已完成转写、说话人区分和面试分析`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '面试音频分析失败，请稍后重试')
    }
    event.target.value = ''
  }

  if (isLoading) {
    return <div className="mx-auto max-w-[1480px] space-y-4"><Skeleton className="h-40" /><Skeleton className="h-96" /></div>
  }

  return (
    <div className="ambient-shell mx-auto max-w-[1480px] space-y-6 pb-8">
      <section className="glass-card soft-reveal overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_90%_0%,rgba(244,114,182,0.20),transparent_30%),linear-gradient(135deg,rgba(255,247,237,0.95),rgba(252,231,243,0.82))] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/55 px-3 py-1 text-xs font-semibold text-primary">
              <Mic2 className="h-3.5 w-3.5" /> interview review library
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">面试音频复盘库</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              上传模拟面试或真实面试音频，系统会先转写并区分“面试官 / 我”，再按问题分析回答质量，生成更好的参考答案并沉淀到面试库。
            </p>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90">
            <input className="hidden" type="file" accept="audio/*,.mp3,.wav,.m4a,.webm" onChange={handleUpload} disabled={analyze.isPending} />
            {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {analyze.isPending ? '分析音频中...' : '上传面试音频'}
          </label>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat icon={<FileAudio className="h-4 w-4" />} label="面试复盘" value={`${interviews?.length || 0}`} />
          <Stat icon={<Bot className="h-4 w-4" />} label="平均得分" value={averageScore ? `${averageScore}` : '—'} />
          <Stat icon={<CalendarDays className="h-4 w-4" />} label="最近复盘" value={interviews?.[0] ? formatDateTime(interviews[0].created_at).slice(5) : '暂无'} />
        </div>
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-800">
          V1.0 Demo 模式使用模拟 ASR 与说话人分离结果，用于展示产品流程；真实上线需要后端接入 ASR + diarization 服务，并提供说话人和转写文本的人工校对。
        </p>
        {message && <p className="mt-3 rounded-xl border bg-card/70 px-4 py-2 text-sm text-muted-foreground">{message}</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="rounded-2xl">
          <CardContent className="p-3">
            {interviews && interviews.length > 0 ? interviews.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-xl p-4 text-left transition hover:bg-muted ${selected?.id === item.id ? 'bg-muted' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary">{item.overall_score} 分</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(item.created_at).slice(5)}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold">{item.title}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.questions[0]?.question || '面试问题分析'}
                </p>
              </button>
            )) : (
              <div className="p-8 text-center text-sm text-muted-foreground">暂无面试复盘，上传一段音频开始。</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            {selected ? <InterviewDetail interview={selected} /> : <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">选择一条面试复盘查看详情</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InterviewDetail({ interview }: { interview: InterviewRecord }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{interview.overall_score} 分</Badge>
          <Badge variant="outline">{interview.source_file_name || '音频文件'}</Badge>
          <Badge variant="outline">{Math.round(interview.duration_seconds / 60)} 分钟</Badge>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">{interview.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(interview.created_at)}</p>
      </div>

      <section>
        <p className="mb-3 text-sm font-semibold">说话人分离逐字稿</p>
        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
          {interview.transcript.map((turn) => (
            <div key={turn.id} className={`flex gap-3 ${turn.speaker === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-2xl border px-4 py-3 ${turn.speaker === 'me' ? 'bg-primary/10' : 'bg-card'}`}>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquareQuote className="h-3.5 w-3.5" />
                  {turn.speaker_label} · {Math.round(turn.start_time)}s
                </div>
                <p className="text-sm leading-6">{turn.content}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-3 text-sm font-semibold">逐题分析</p>
        <div className="space-y-4">
          {interview.questions.map((item, index) => (
            <div key={item.id} className="rounded-2xl border bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Q{index + 1}</Badge>
                <Badge variant="outline">{item.score} 分</Badge>
              </div>
              <p className="font-medium leading-6">{item.question}</p>
              <Block title="我的回答" text={item.answer} />
              <Block title="AI 分析" text={item.analysis} />
              <Block title="更好的参考答案" text={item.improved_answer} />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <List title="整体优点" items={interview.strengths} />
        <List title="主要不足" items={interview.weaknesses} />
      </div>
      <List title="下一步改进建议" items={interview.suggestions} />
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border bg-white/50 p-4 backdrop-blur"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-2 text-2xl font-semibold">{value}</p></div>
}

function Block({ title, text }: { title: string; text: string }) {
  return <div className="mt-3 rounded-xl border bg-muted/30 p-3"><p className="text-xs font-semibold text-muted-foreground">{title}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{text}</p></div>
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border bg-muted/20 p-4"><p className="text-sm font-semibold">{title}</p><ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>
}
