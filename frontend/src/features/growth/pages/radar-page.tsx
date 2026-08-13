import { useMemo, useState } from 'react'
import { ExternalLink, Loader2, PlusCircle, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRadarItems, useSaveRadarItemToKnowledge } from '../hooks/use-growth'

export default function RadarPage() {
  const [activeTag, setActiveTag] = useState('全部')
  const { data: items, isLoading } = useRadarItems(activeTag)
  const save = useSaveRadarItemToKnowledge()
  const tags = useMemo(() => ['全部', '大模型产品', 'Agent', 'RAG', '多模态', 'AI PM', '面试'], [])

  return (
    <div className="ambient-shell mx-auto max-w-[1480px] space-y-6 pb-8">
      <section className="glass-card soft-reveal rounded-3xl border bg-card p-6 sm:p-8">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary"><Sparkles className="h-4 w-4" />AI product radar</p>
        <h1 className="gradient-text text-3xl font-semibold leading-tight sm:text-4xl">把每天的 AI 动态，转成产品经理可讲的观点。</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">V1.0 暂时改用 GitHub 真实资料源：OpenAI Cookbook、LangGraph、LlamaIndex、MCP、AutoGen、Vercel AI SDK。每张卡片都能查看完整整理内容和原始仓库链接。</p>
      </section>

      <div className="soft-reveal soft-reveal-delay-1 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button key={tag} type="button" onClick={() => setActiveTag(tag)} className={`glass-card rounded-full border px-4 py-2 text-sm transition ${activeTag === tag ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
            {tag}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items?.map((item) => (
            <Card key={item.id} className="glass-card soft-reveal rounded-2xl">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="outline">{item.source_name}</Badge>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold leading-snug">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                </div>
                {item.full_content && (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-semibold text-muted-foreground">全文整理</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{item.full_content}</p>
                  </div>
                )}
                <div className="rounded-xl bg-primary/10 p-4">
                  <p className="text-xs font-semibold text-primary">产品经理视角</p>
                  <p className="mt-2 text-sm leading-6">{item.pm_insight}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => window.open(item.source_url, '_blank')}>
                    <ExternalLink className="h-4 w-4" />查看 GitHub 来源
                  </Button>
                  <Button onClick={() => save.mutate(item.id)} disabled={item.saved_to_knowledge || save.isPending}>
                    {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    {item.saved_to_knowledge ? '已加入知识库' : '加入知识库'}
                  </Button>
                  <Button variant="ghost">
                    <Search className="h-4 w-4" />基于此生成面试题
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
