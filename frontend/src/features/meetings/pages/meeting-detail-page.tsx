import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  FileText,
  GitBranch,
  Loader2,
  MessageSquareText,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDecisions } from '@/features/decisions/hooks/use-decisions'
import { formatDateTime } from '@/lib/utils'
import { MeetingRecordUploader } from '../components/meeting-record-uploader'
import { MeetingStatusBadge } from '../components/meeting-status-badge'
import { TranscriptVirtualList } from '../components/transcript-virtual-list'
import {
  useDeleteMeeting,
  useMeeting,
  useProcessingStatus,
  useTranscripts,
  useUploadMeetingRecord,
} from '../hooks/use-meetings'

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [uploaderOpen, setUploaderOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')

  const { data: meeting, isLoading: meetingLoading } = useMeeting(id)
  const { data: transcripts, isLoading: transcriptsLoading } = useTranscripts(id)
  const { data: processingStatus } = useProcessingStatus(id)
  const { data: decisions, isLoading: decisionsLoading } = useDecisions(0, 100, id)
  const deleteMeeting = useDeleteMeeting()
  const uploadRecord = useUploadMeetingRecord(id)

  const isProcessing = processingStatus?.status === 'processing'

  const handleDelete = async () => {
    if (!meeting || !confirm(`确定删除会议「${meeting.title}」吗？\n关联原文、纪要和决策也将被删除。`)) return
    await deleteMeeting.mutateAsync(meeting.id)
    navigate('/meetings')
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    if (meeting?.source_file_name && !confirm('替换输入会重新生成纪要、行动项和研究决策，是否继续？')) return
    setUploadError('')
    setUploadProgress(0)
    try {
      await uploadRecord.mutateAsync({ file: selectedFile, onProgress: setUploadProgress })
      setSelectedFile(null)
      setUploaderOpen(false)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '会议记录上传失败')
    }
  }

  const closeUploader = () => {
    if (uploadRecord.isPending) return
    setUploaderOpen(false)
    setSelectedFile(null)
    setUploadError('')
  }

  if (meetingLoading) return <Skeleton className="h-64" />
  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm">会议不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/meetings')}>返回列表</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/meetings')} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />返回列表
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{meeting.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <MeetingStatusBadge status={meeting.status} />
                <span className="text-xs text-muted-foreground">创建于 {formatDateTime(meeting.created_at)}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setUploaderOpen((value) => !value)}>
                {uploaderOpen ? <X className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
                {uploaderOpen ? '收起' : meeting.source_file_name ? '替换会议记录' : '上传会议记录'}
              </Button>
              {processingStatus?.summary_ready && (
                <Button onClick={() => navigate(`/summaries/${meeting.id}`)}>
                  <Sparkles className="h-4 w-4" />查看纪要
                </Button>
              )}
              <Button variant="outline" onClick={handleDelete} disabled={deleteMeeting.isPending}>
                <Trash2 className="h-4 w-4" />删除
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {uploaderOpen && (
            <div className="mb-5 space-y-3 border-b pb-5">
              <MeetingRecordUploader onFileSelect={setSelectedFile} selectedFile={selectedFile} uploadProgress={uploadProgress} isUploading={uploadRecord.isPending} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-muted-foreground">上传完成后自动整理纪要、行动项和研究决策。</p>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={closeUploader} disabled={uploadRecord.isPending}>取消</Button>
                  <Button size="sm" onClick={handleUpload} disabled={!selectedFile || uploadRecord.isPending}>
                    {uploadRecord.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {uploadRecord.isPending ? `上传中 ${uploadProgress}%` : '上传并整理'}
                  </Button>
                </div>
              </div>
              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {meeting.start_time && <InfoItem icon={<Clock className="h-4 w-4" />} label="会议时间" value={formatDateTime(meeting.start_time)} />}
            {meeting.participants?.length ? <InfoItem icon={<Users className="h-4 w-4" />} label="参会人员" value={meeting.participants.join('、')} /> : null}
            {meeting.source_file_name && <InfoItem icon={<FileText className="h-4 w-4" />} label="文字记录" value={meeting.source_file_name} />}
          </div>
          {meeting.description && <div className="mt-4 rounded-md bg-muted p-3 text-sm">{meeting.description}</div>}
        </CardContent>
      </Card>

      {isProcessing && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">正在整理会议记录</p>
              <p className="mt-0.5 text-xs text-muted-foreground">依次生成组会纪要、行动项和研究决策，完成后页面会自动更新。</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5" />会议原文
            <span className="text-sm font-normal text-muted-foreground">({processingStatus?.transcript_count ?? transcripts?.length ?? 0} 段)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transcriptsLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, index) => <Skeleton key={index} className="h-16" />)}</div>
          ) : transcripts?.length ? (
            <TranscriptVirtualList transcripts={transcripts} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-50" />
              <p className="mt-3 text-sm font-medium">尚未导入会议记录</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setUploaderOpen(true)}>上传会议记录</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {(meeting.status === 'processed' || processingStatus?.decision_count) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><GitBranch className="h-5 w-5" />研究决策</span>
              {decisions && decisions.total > 0 && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/decisions?meetingId=${meeting.id}`)}>查看全部</Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {decisionsLoading ? <Skeleton className="h-28" /> : decisions?.items.length ? (
              <div className="space-y-3">
                {decisions.items.slice(0, 5).map((decision) => (
                  <button key={decision.id} type="button" className="flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted" onClick={() => navigate(`/decisions/${decision.id}`)}>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{decision.title}</span>
                      {decision.chosen_option && <span className="mt-1 block text-sm text-muted-foreground">已选：{decision.chosen_option}</span>}
                    </span>
                    {decision.confidence != null && <Badge variant="secondary">{(decision.confidence * 100).toFixed(0)}%</Badge>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">原文中没有识别到明确的研究决策，请人工检查会议原文。</p>
            )}
          </CardContent>
        </Card>
      )}

      {meeting.status === 'failed' && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div><p className="text-sm font-medium">自动整理失败</p><p className="mt-1 text-xs text-muted-foreground">请检查文件内容或替换会议记录后重试。</p></div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</div>
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-sm font-medium" title={value}>{value}</p></div>
    </div>
  )
}
