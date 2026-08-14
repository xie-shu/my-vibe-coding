import { useState } from 'react'
import {
  Search,
  Upload,
  FileText,
  Trash2,
  Loader2,
  Database,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { HighlightText } from '@/components/ui/highlight-text'
import {
  useKnowledgeDocuments,
  useDeleteKnowledgeDocument,
  useKnowledgeSearch,
  useUploadDocument,
} from '../hooks/use-knowledge'
import { formatDateTime } from '@/lib/utils'
import type { SearchResult, KnowledgeDocument } from '@/types'

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<'search' | 'documents'>('search')
  const [activeLibrary, setActiveLibrary] = useState<'uploaded' | 'practice' | 'interview'>('practice')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  // 上传阶段：idle | uploading | indexing | done
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'indexing'>('idle')
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null)

  const { data: documents, isLoading: docsLoading } = useKnowledgeDocuments()
  const deleteDoc = useDeleteKnowledgeDocument()
  const search = useKnowledgeSearch()
  const upload = useUploadDocument()
  const hotDocuments = (documents || []).filter((doc) => doc.source_type === 'radar_item')
  const uploadedDocuments = (documents || []).filter((doc) => doc.source_type === 'uploaded_doc')
  const practiceDocuments = (documents || []).filter((doc) => ['practice_record', 'reference_answer'].includes(doc.source_type))
  const interviewDocuments = (documents || []).filter((doc) => doc.source_type === 'interview_record')
  const visibleDocuments = activeLibrary === 'uploaded' ? uploadedDocuments : activeLibrary === 'interview' ? interviewDocuments : practiceDocuments

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setActionMsg(null)
    try {
      const response = await search.mutateAsync({ query: searchQuery })
      setSearchResults(response.results)
      if (response.results.length === 0) {
        setActionMsg({ type: 'error', text: '未找到相关结果' })
      }
    } catch (err) {
      console.error('检索失败:', err)
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : '检索失败，请稍后重试' })
    }
  }

  const handleDeleteClick = (docId: string, docTitle: string) => {
    setDeleteTarget({ id: docId, title: docTitle })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setActionMsg(null)
    try {
      await deleteDoc.mutateAsync(deleteTarget.id)
      setActionMsg({ type: 'success', text: `「${deleteTarget.title}」已删除` })
    } catch (err) {
      console.error('删除失败:', err)
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : '删除失败' })
    }
    setDeleteTarget(null)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setActionMsg(null)
    setUploadStage('uploading')
    setUploadProgress(0)
    try {
      // 阶段1：网络上传（XHR progress 事件驱动进度条）
      await upload.mutateAsync({
        file,
        onProgress: (p) => {
          setUploadProgress(p)
          // 网络上传完成后进入索引阶段
          if (p >= 100) {
            setUploadStage('indexing')
          }
        },
      })
      // 阶段2：后端索引完成（mutateAsync resolve 即索引完成）
      setUploadProgress(0)
      setUploadStage('idle')
      setActionMsg({ type: 'success', text: `「${file.name}」上传并索引成功` })
    } catch (err) {
      console.error('上传失败:', err)
      setUploadProgress(0)
      setUploadStage('idle')
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : '上传失败' })
    }
    e.target.value = ''
  }

  return (
    <div className="ambient-shell space-y-6">
      {/* 标题栏 */}
      <div className="soft-reveal flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">个人知识库</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            资料检索下展开 AI 热点资料库，练习复盘库沉淀每次作答、参考答案和解析
          </p>
        </div>
        <label className="inline-flex min-h-9 max-w-full cursor-pointer items-center justify-center gap-2 self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.docx,.doc,.txt,.md"
            disabled={upload.isPending}
          />
          {upload.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {upload.isPending
            ? uploadStage === 'indexing'
              ? '索引中...（解析/分块/向量化）'
              : `上传中 ${uploadProgress}%`
            : '上传文档'}
        </label>
      </div>

      {/* 操作反馈消息 */}
      {actionMsg && (
        <div
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm ${
            actionMsg.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
          }`}
        >
          {actionMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{actionMsg.text}</span>
          <button
            onClick={() => setActionMsg(null)}
            className="ml-auto text-xs opacity-60 hover:opacity-100"
          >
            关闭
          </button>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="glass-card soft-reveal soft-reveal-delay-1 flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="h-4 w-4" />
          资料检索
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'documents'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Database className="h-4 w-4" />
          知识库
        </button>
      </div>

      {/* 检索界面 */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索 AI 产品方法、RAG、Agent、历史练习或今日趋势..."
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={search.isPending || !searchQuery.trim()}>
              {search.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              搜索
            </Button>
          </div>

          {/* 检索结果 */}
          {search.isPending ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                找到 {searchResults.length} 条相关结果
              </p>
              {searchResults.map((result) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  keywords={searchQuery}
                  onOpen={() => {
                    const doc = documents?.find((item) => item.id === result.id || item.source_id === result.source_id)
                    setSelectedDoc(doc || {
                      id: result.id,
                      title: result.title,
                      source_type: result.source_type as KnowledgeDocument['source_type'],
                      source_id: result.source_id,
                      content: result.content,
                      metadata: result.metadata,
                      created_at: new Date().toISOString(),
                    })
                  }}
                />
              ))}
            </div>
          ) : search.isIdle ? (
            <div className="glass-card soft-reveal flex min-h-40 flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 opacity-30" />
              <p className="mt-3 text-sm">输入关键词开始检索</p>
              <p className="mt-1 text-xs">支持资料、AI 雷达、练习记录与参考答案</p>
            </div>
          ) : (
            <div className="glass-card soft-reveal flex min-h-40 flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 opacity-30" />
              <p className="mt-3 text-sm">未找到相关结果</p>
            </div>
          )}

          <section className="space-y-4 pt-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold">今日 AI 技术热点</p>
                <p className="mt-1 text-xs text-muted-foreground">每天从配置的官网与行业来源整理，点击卡片查看完整内容。</p>
              </div>
              <Badge variant="secondary">{hotDocuments.length} 条资料</Badge>
            </div>
            {docsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : hotDocuments.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {hotDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onOpen={() => setSelectedDoc(doc)}
                    onDelete={() => handleDeleteClick(doc.id, doc.title)}
                    compact
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-card/60 p-6 text-center text-sm text-muted-foreground">
                暂无今日热点，可以从 AI 产品雷达页加入内容。
              </div>
            )}
          </section>
        </div>
      )}

      {/* 文档管理 */}
      {activeTab === 'documents' && (
        <div className="space-y-3">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <button type="button" onClick={() => setActiveLibrary('practice')} className={`glass-card soft-reveal rounded-2xl border p-4 text-left transition ${activeLibrary === 'practice' ? 'border-primary bg-primary/10' : 'bg-card hover:bg-muted/60'}`}>
              <p className="text-sm font-semibold">练习复盘库</p>
              <p className="mt-1 text-xs text-muted-foreground">存放每天的面试题、你的回答、AI 点评、改进建议、正确答案和答案解析。</p>
              <p className="mt-3 text-2xl font-semibold">{practiceDocuments.length}</p>
            </button>
            <button type="button" onClick={() => setActiveLibrary('interview')} className={`glass-card soft-reveal soft-reveal-delay-1 rounded-2xl border p-4 text-left transition ${activeLibrary === 'interview' ? 'border-primary bg-primary/10' : 'bg-card hover:bg-muted/60'}`}>
              <p className="text-sm font-semibold">面试复盘库</p>
              <p className="mt-1 text-xs text-muted-foreground">存放面试音频转写、面试官问题、我的回答、AI 分析和更好的参考答案。</p>
              <p className="mt-3 text-2xl font-semibold">{interviewDocuments.length}</p>
            </button>
            <button type="button" onClick={() => setActiveLibrary('uploaded')} className={`glass-card soft-reveal soft-reveal-delay-1 rounded-2xl border p-4 text-left transition ${activeLibrary === 'uploaded' ? 'border-primary bg-primary/10' : 'bg-card hover:bg-muted/60'}`}>
              <p className="text-sm font-semibold">上传资料库</p>
              <p className="mt-1 text-xs text-muted-foreground">存放你手动上传的 PRD、课程笔记、AI 产品资料和技术文章。</p>
              <p className="mt-3 text-2xl font-semibold">{uploadedDocuments.length}</p>
            </button>
          </div>

          {docsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : visibleDocuments.length > 0 ? (
            visibleDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onOpen={() => setSelectedDoc(doc)}
                onDelete={() => handleDeleteClick(doc.id, doc.title)}
              />
            ))
          ) : (
            <div className="glass-card soft-reveal flex min-h-40 flex-col items-center justify-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 opacity-30" />
              <p className="mt-3 text-sm">{activeLibrary === 'uploaded' ? '上传资料库为空' : activeLibrary === 'interview' ? '面试复盘库为空' : '练习复盘库为空'}</p>
              <p className="mt-1 text-xs">{activeLibrary === 'uploaded' ? '上传 AI 产品资料、PRD 或课程笔记后会显示在这里' : activeLibrary === 'interview' ? '上传面试音频后，逐字稿、问题分析和参考答案会自动入库' : '完成每日训练后，题目、点评、正确答案和解析会自动入库'}</p>
            </div>
          )}
        </div>
      )}

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除文档"
        description={`确定删除「${deleteTarget?.title}」吗？该文档的所有分块将被永久删除，此操作不可撤销。`}
        closeOnOverlayClick
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteConfirm}
            disabled={deleteDoc.isPending}
          >
            {deleteDoc.isPending ? '删除中...' : '删除'}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={selectedDoc !== null}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc?.title || '资料详情'}
        description={selectedDoc ? `${getSourceTypeLabel(selectedDoc.source_type)} · ${formatDateTime(selectedDoc.created_at)}` : ''}
        closeOnOverlayClick
      >
        {selectedDoc && (
          <div className="max-h-[65vh] overflow-auto rounded-xl border bg-muted/30 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{getSourceTypeLabel(selectedDoc.source_type)}</Badge>
              {Array.isArray(selectedDoc.metadata?.tags) && selectedDoc.metadata.tags.map((tag) => (
                <Badge key={String(tag)} variant="outline">{String(tag)}</Badge>
              ))}
            </div>
            <article className="whitespace-pre-wrap text-sm leading-7 text-foreground">
              {selectedDoc.content}
            </article>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setSelectedDoc(null)}>关闭</Button>
        </div>
      </Dialog>
    </div>
  )
}

function SearchResultCard({
  result,
  keywords,
  onOpen,
}: {
  result: SearchResult
  keywords: string
  onOpen: () => void
}) {
  const sourceTypeLabel = getSourceTypeLabel(result.source_type)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">{result.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">{sourceTypeLabel}</Badge>
            {result.rerank_score !== undefined && result.rerank_score > 0 && (
              <Badge variant="secondary">
                相关度 {(result.rerank_score * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        </div>

        <p className="line-clamp-3 text-sm text-muted-foreground">
          <HighlightText text={result.content} keywords={keywords} />
        </p>

        <button onClick={onOpen} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink className="h-3 w-3" />
          查看全文
        </button>
      </CardContent>
    </Card>
  )
}

function DocumentCard({
  doc,
  onOpen,
  onDelete,
  compact = false,
}: {
  doc: KnowledgeDocument
  onOpen: () => void
  onDelete: () => void
  compact?: boolean
}) {
  const sourceTypeLabel = getSourceTypeLabel(doc.source_type)

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className={`${compact ? 'h-9 w-9' : 'h-10 w-10'} flex shrink-0 items-center justify-center rounded-lg bg-primary/10`}>
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{doc.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{doc.content}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{sourceTypeLabel}</Badge>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateTime(doc.created_at)}
              </span>
            </div>
          </div>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

function getSourceTypeLabel(sourceType: string) {
  if (sourceType === 'meeting_summary') return '历史纪要'
  if (sourceType === 'radar_item') return 'AI 雷达'
  if (sourceType === 'practice_record') return '练习复盘'
  if (sourceType === 'interview_record') return '面试复盘'
  if (sourceType === 'reference_answer') return '参考答案'
  return '上传资料'
}
