import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Mic, PauseCircle, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useDailyQuestion, useSubmitPracticeAnswer, useTranscribePracticeAudio } from '../hooks/use-growth'

export default function PracticePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: question, isLoading } = useDailyQuestion(id)
  const transcribe = useTranscribePracticeAudio()
  const submit = useSubmitPracticeAnswer()
  const [answerText, setAnswerText] = useState('')
  const [recording, setRecording] = useState(false)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
  }, [])

  const startRecording = async () => {
    if (!question) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `${question.id}.webm`, { type: 'audio/webm' })
        const result = await transcribe.mutateAsync({ questionId: question.id, file })
        setAnswerText(result.transcript_text)
        stream.getTracks().forEach((track) => track.stop())
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      alert('无法访问麦克风。你也可以直接在文本框输入答案。')
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    setRecording(false)
  }

  const handleSubmit = async () => {
    if (!question || !answerText.trim()) return
    const practice = await submit.mutateAsync({
      questionId: question.id,
      data: { answer_text: answerText, transcript_text: answerText },
    })
    setAnalysisId(practice.id)
  }

  if (isLoading || !question) {
    return <div className="mx-auto max-w-5xl space-y-4"><Skeleton className="h-40" /><Skeleton className="h-80" /></div>
  }

  return (
    <div className="ambient-shell mx-auto max-w-5xl space-y-6 pb-8">
      <Button variant="ghost" onClick={() => navigate('/')} className="-ml-2"><ArrowLeft className="h-4 w-4" />返回今日页</Button>

      <Card className="glass-card soft-reveal rounded-2xl">
        <CardContent className="p-6">
          <p className="text-xs font-semibold text-primary">每日产品思维练习</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{question.title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{question.background}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {question.ability_tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="glass-card soft-reveal soft-reveal-delay-1 rounded-2xl">
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold">作答提示</h2>
            <div className="mt-4 space-y-3">
              {question.suggested_structure.map((item, index) => (
                <div key={item} className="glass-card flex gap-3 rounded-xl border bg-muted/30 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
                  <p className="text-sm leading-6">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-primary/10 p-4 text-sm leading-6 text-primary">
              建议回答 1-2 分钟。先说判断，再展开依据，最后补充指标和风险边界。
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card soft-reveal soft-reveal-delay-2 rounded-2xl">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">我的回答</h2>
                <p className="mt-1 text-xs text-muted-foreground">可以语音回答，转写后支持手动修正。</p>
              </div>
              {recording ? (
                <Button variant="destructive" onClick={stopRecording}><PauseCircle className="h-4 w-4" />结束回答</Button>
              ) : (
                <Button variant="outline" onClick={startRecording} disabled={transcribe.isPending}><Mic className="h-4 w-4" />开始录音</Button>
              )}
            </div>

            {transcribe.isPending && (
              <div className="glass-card flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> 正在转写语音，完成后可编辑文本
              </div>
            )}

            <Textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="也可以直接输入你的回答：我会先从目标用户和核心痛点说起..."
              className="min-h-64 resize-y"
            />

              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!answerText.trim() || submit.isPending}>
                {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              提交 AI 分析
              </Button>
          </CardContent>
        </Card>
      </div>

      {submit.data && (
        <Card className="glass-card soft-reveal rounded-2xl border-primary/30">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold text-primary"><Sparkles className="h-4 w-4" />AI 点评结果</p>
                <h2 className="mt-2 text-2xl font-semibold">综合评分 {submit.data.score}</h2>
              </div>
              <Button variant="outline" onClick={() => navigate(analysisId ? `/practices/${analysisId}` : '/practices')}>查看练习详情</Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Score label="逻辑结构" value={submit.data.structure_score} />
              <Score label="产品思维" value={submit.data.product_thinking_score} />
              <Score label="表达清晰度" value={submit.data.expression_score} />
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <List title="回答优点" items={submit.data.strengths} />
              <List title="需要优化" items={submit.data.weaknesses} />
            </div>
            <div className="mt-5 rounded-xl bg-muted/50 p-4">
              <p className="text-sm font-semibold">更好的参考答案</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{submit.data.reference_answer}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Score({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div><p className="text-sm font-semibold">{title}</p><ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>
}
