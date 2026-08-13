import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  GitBranch,
  CheckCircle2,
  Circle,
  Users,
  Clock,
  Link2,
  Quote,
  AlertTriangle,
  Loader2,
  Pencil,
  Save,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDecisionDetail, useUpdateDecision } from '../hooks/use-decisions'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { DecisionOption } from '@/types'

export default function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: decision, isLoading } = useDecisionDetail(id)
  const updateDecision = useUpdateDecision(id)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [chosenOption, setChosenOption] = useState('')
  const [reasons, setReasons] = useState('')
  const [objections, setObjections] = useState('')
  const [decidedBy, setDecidedBy] = useState('')
  const [snippet, setSnippet] = useState('')
  const [options, setOptions] = useState<DecisionOption[]>([])
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (!decision || isEditing) return
    setTitle(decision.title)
    setContext(decision.context || '')
    setChosenOption(decision.chosen_option || '')
    setReasons(decision.reasons?.join('\n') || '')
    setObjections(decision.objections?.map((item) => `${item.from}：${item.content}`).join('\n') || '')
    setDecidedBy(decision.decided_by?.join('、') || '')
    setSnippet(decision.snippet || '')
    setOptions(decision.options.map((option) => ({ ...option, pros: [...(option.pros || [])], cons: [...(option.cons || [])] })))
  }, [decision, isEditing])

  const handleBack = () => {
    // 如果有保存的搜索状态，带着状态返回
    const state = location.state as { searchKey?: string } | null
    if (state?.searchKey) {
      navigate('/decisions', { state })
    } else {
      navigate('/decisions')
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setSaveMessage('决策标题不能为空')
      return
    }
    if (options.some((option) => !option.name.trim())) {
      setSaveMessage('候选方案名称不能为空')
      return
    }
    if (options.length > 0 && !options.some((option) => option.is_chosen)) {
      setSaveMessage('请从候选方案中选择一个最终方案')
      return
    }
    const parsedObjections = objections.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const separator = line.search(/[：:]/)
      return separator > 0
        ? { from: line.slice(0, separator).trim(), content: line.slice(separator + 1).trim() }
        : { from: '未标注', content: line }
    })
    try {
      await updateDecision.mutateAsync({
        title: title.trim(),
        context: context.trim() || null,
        chosen_option: chosenOption.trim() || null,
        reasons: reasons.split('\n').map((item) => item.trim()).filter(Boolean),
        objections: parsedObjections,
        decided_by: decidedBy.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
        snippet: snippet.trim() || null,
        options,
        review_status: 'confirmed',
        reviewed_by: '当前用户',
      })
      setIsEditing(false)
      setSaveMessage('修改已保存，研究决策已确认')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : '保存失败，请重试')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <GitBranch className="h-12 w-12 opacity-30" />
          <p className="mt-3 text-sm font-medium">决策不存在或已被删除</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button variant="ghost" onClick={handleBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Button>

      {/* 标题区 */}
      <div className="space-y-2">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
          <h1 className="text-2xl font-bold leading-tight">{decision.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            {decision.confidence != null && <Badge variant="secondary">置信度 {(decision.confidence * 100).toFixed(0)}%</Badge>}
            <Badge variant={decision.review_status === 'confirmed' ? 'success' : 'warning'}>
              {decision.review_status === 'confirmed' ? '已人工确认' : '待人工确认'}
            </Badge>
            {!isEditing && <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setSaveMessage('') }}><Pencil className="h-4 w-4" />编辑决策</Button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {decision.decided_by && decision.decided_by.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {decision.decided_by.join('、')}
            </span>
          )}
          {decision.decided_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDateTime(decision.decided_at)}
            </span>
          )}
          {decision.chosen_option && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              已选：{decision.chosen_option}
            </span>
          )}
        </div>
      </div>

      {isEditing && (
        <Card>
          <CardHeader className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div><CardTitle className="text-base">人工校对研究决策</CardTitle><p className="mt-1 text-xs text-muted-foreground">修改后保存并确认，才作为正式研究记录</p></div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setSaveMessage('') }} disabled={updateDecision.isPending}><X className="h-4 w-4" />取消</Button>
              <Button size="sm" onClick={handleSave} disabled={updateDecision.isPending}>{updateDecision.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{updateDecision.isPending ? '确认中' : '保存并确认'}</Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="decision-title">决策标题</Label><Input id="decision-title" maxLength={50} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="decision-context">决策背景</Label><Textarea id="decision-context" rows={4} value={context} onChange={(event) => setContext(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="decision-chosen">最终选择</Label><Input id="decision-chosen" maxLength={30} value={options.find((option) => option.is_chosen)?.name || chosenOption} onChange={(event) => setChosenOption(event.target.value)} readOnly={options.length > 0} /><p className="text-xs text-muted-foreground">{options.length > 0 ? '请在下方候选方案中设置最终选择' : '没有候选方案时可直接填写'}</p></div>
            <div className="space-y-2"><Label htmlFor="decision-by">参与决策人</Label><Input id="decision-by" value={decidedBy} onChange={(event) => setDecidedBy(event.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2">
              <Label>候选方案（每项均可编辑）</Label>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={option.id} className="rounded-md border bg-muted/20 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">方案 {index + 1}</span>
                      <Button type="button" variant={option.is_chosen ? 'default' : 'outline'} size="sm" onClick={() => { setOptions((current) => current.map((item) => ({ ...item, is_chosen: item.id === option.id }))); setChosenOption(option.name) }}>
                        {option.is_chosen ? '已选方案' : '设为最终选择'}
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor={`option-name-${option.id}`}>方案名称</Label><Input id={`option-name-${option.id}`} maxLength={30} value={option.name} onChange={(event) => { const nextName = event.target.value; setOptions((current) => current.map((item) => item.id === option.id ? { ...item, name: nextName } : item)); if (option.is_chosen) setChosenOption(nextName) }} /></div>
                      <div className="space-y-2"><Label htmlFor={`option-pros-${option.id}`}>优点（每行一条）</Label><Textarea id={`option-pros-${option.id}`} rows={3} value={(option.pros || []).join('\n')} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, pros: event.target.value.split('\n') } : item))} /></div>
                      <div className="space-y-2"><Label htmlFor={`option-cons-${option.id}`}>缺点（每行一条）</Label><Textarea id={`option-cons-${option.id}`} rows={3} value={(option.cons || []).join('\n')} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, cons: event.target.value.split('\n') } : item))} /></div>
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor={`option-by-${option.id}`}>提出人</Label><Input id={`option-by-${option.id}`} value={option.proposed_by || ''} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, proposed_by: event.target.value } : item))} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2"><Label htmlFor="decision-reasons">选择理由（每行一条）</Label><Textarea id="decision-reasons" rows={5} value={reasons} onChange={(event) => setReasons(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="decision-objections">异议（姓名：内容，每行一条）</Label><Textarea id="decision-objections" rows={5} value={objections} onChange={(event) => setObjections(event.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="decision-snippet">原文证据</Label><Textarea id="decision-snippet" rows={4} value={snippet} onChange={(event) => setSnippet(event.target.value)} /></div>
            {saveMessage && <p className="text-sm text-destructive sm:col-span-2">{saveMessage}</p>}
          </CardContent>
        </Card>
      )}

      {!isEditing && saveMessage && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{saveMessage}</p>}

      <div className={isEditing ? 'hidden' : 'contents'}>

      {/* 上下文 */}
      {decision.context && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">决策背景</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{decision.context}</p>
          </CardContent>
        </Card>
      )}

      {/* 候选方案 */}
      {decision.options.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">候选方案</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {decision.options.map((opt) => (
              <OptionItem key={opt.id} option={opt} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 反对意见 */}
      {decision.objections && decision.objections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              反对意见（少数派观点）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {decision.objections.map((obj, i) => (
                <div
                  key={i}
                  className="rounded-md border-l-4 border-l-amber-500 bg-amber-50 p-3 dark:bg-amber-950/30"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {obj.from}
                    </span>
                    <span className="text-xs text-muted-foreground">反对</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{obj.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 选择理由 */}
      {decision.reasons && decision.reasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">选择理由</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {decision.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 原文片段 */}
      {decision.snippet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Quote className="h-4 w-4" />
              原文片段
            </CardTitle>
          </CardHeader>
          <CardContent>
            <blockquote className="border-l-2 pl-4 text-sm italic text-muted-foreground">
              {decision.snippet}
            </blockquote>
          </CardContent>
        </Card>
      )}

      {/* 关联决策 */}
      {decision.related_decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" />
              关联决策（向量相似）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {decision.related_decisions.map((rel) => (
              <div
                key={rel.id}
                className="flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
                onClick={() =>
                  navigate(`/decisions/${rel.id}`, {
                    state: location.state, // 保持搜索状态
                  })
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{rel.title}</p>
                  {rel.context && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {rel.context}
                    </p>
                  )}
                </div>
                {rel.similarity_score != null && (
                  <Badge variant="outline" className="ml-2 shrink-0">
                    {(rel.similarity_score * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  )
}

function OptionItem({ option }: { option: DecisionOption }) {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        option.is_chosen && 'border-green-500/50 bg-green-50 dark:bg-green-950/30',
      )}
    >
      <div className="flex items-center gap-2">
        {option.is_chosen ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{option.name}</span>
        {option.proposed_by && (
          <span className="text-xs text-muted-foreground">· 由 {option.proposed_by} 提出</span>
        )}
      </div>
      {(option.pros && option.pros.length > 0) || (option.cons && option.cons.length > 0) ? (
        <div className="mt-2 grid gap-2 pl-6 text-xs sm:grid-cols-2">
          {option.pros && option.pros.length > 0 && (
            <div>
              <p className="font-medium text-green-600 dark:text-green-400">优点</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {option.pros.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {option.cons && option.cons.length > 0 && (
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">缺点</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {option.cons.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
