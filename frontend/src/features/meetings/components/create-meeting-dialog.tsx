import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { MeetingRecordUploader } from './meeting-record-uploader'
import { useCreateMeeting } from '../hooks/use-meetings'
import { deleteMeeting, uploadMeetingRecord } from '@/api/meetings'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'

interface CreateMeetingDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateMeetingDialog({ open, onClose }: CreateMeetingDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [participants, setParticipants] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const createMeeting = useCreateMeeting()
  const queryClient = useQueryClient()

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setParticipants('')
    setFile(null)
    setUploadProgress(0)
    setIsUploading(false)
    setError('')
  }

  const handleClose = () => {
    if (isUploading) return
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    let createdMeetingId: string | null = null
    setError('')

    if (!title.trim()) {
      setError('请输入会议标题')
      return
    }
    if (!file) {
      setError('请上传腾讯会议文字记录')
      return
    }

    try {
      const meeting = await createMeeting.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        participants: participants
          ? participants.split(',').map((p) => p.trim()).filter(Boolean)
          : undefined,
      })
      createdMeetingId = meeting.id

      setIsUploading(true)
      await uploadMeetingRecord(meeting.id, file, setUploadProgress)
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.meetings] })

      resetForm()
      onClose()
    } catch (err) {
      if (createdMeetingId) {
        await deleteMeeting(createdMeetingId).catch(() => undefined)
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.meetings] })
      }
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="新建组会"
      description="上传腾讯会议文字记录，系统将自动整理纪要、研究决策与行动项"
      closeOnOverlayClick={!isUploading}
    >
      <div className="space-y-5">
        {/* 标题 */}
        <div className="space-y-2">
          <Label htmlFor="title">
            组会标题 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：AI 产品经理面试练习复盘"
            autoFocus
          />
        </div>

        {/* 描述 */}
        <div className="space-y-2">
          <Label htmlFor="description">组会描述</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简要描述研究问题、实验进展或待决策事项..."
            rows={3}
          />
        </div>

        {/* 参会人 */}
        <div className="space-y-2">
          <Label htmlFor="participants">参会人员</Label>
          <Input
            id="participants"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="用逗号分隔，如：张三, 李四, 王五"
          />
        </div>

        {/* 会议输入上传 */}
        <div className="space-y-2">
          <Label>腾讯会议文字记录 <span className="text-destructive">*</span></Label>
          <MeetingRecordUploader onFileSelect={setFile} selectedFile={file} uploadProgress={uploadProgress} isUploading={isUploading} />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose} disabled={isUploading}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isUploading || createMeeting.isPending}
        >
          {isUploading
            ? `上传中 ${uploadProgress}%`
            : createMeeting.isPending
              ? '创建中...'
              : '创建并整理'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
