import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Plus, Users, Clock, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MeetingStatusBadge } from '../components/meeting-status-badge'
import { CreateMeetingDialog } from '../components/create-meeting-dialog'
import { useMeetings, useDeleteMeeting } from '../hooks/use-meetings'
import { formatDateTime } from '@/lib/utils'
import type { Meeting } from '@/types'

interface MeetingCardProps {
  meeting: Meeting
  onClick: () => void
  onDelete: () => void
  isDeleting: boolean
}

interface EmptyStateProps {
  onCreate: () => void
}

export default function MeetingListPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { data: meetings, isLoading } = useMeetings()
  const deleteMeeting = useDeleteMeeting()
  const navigate = useNavigate()

  const handleDelete = async (meeting: Meeting) => {
    if (!confirm(`确定删除会议「${meeting.title}」吗？\n关联的会议原文、纪要和决策也将被删除。`)) return
    setDeleteId(meeting.id)
    try {
      await deleteMeeting.mutateAsync(meeting.id)
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">组会管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理课题组讨论、实验复盘与方案评审</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          新建组会
        </Button>
      </div>

      {/* 会议列表 */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : meetings && meetings.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onClick={() => navigate(`/meetings/${meeting.id}`)}
              onDelete={() => handleDelete(meeting)}
              isDeleting={deleteId === meeting.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState onCreate={() => setDialogOpen(true)} />
      )}

      {/* 新建会议对话框 */}
      <CreateMeetingDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}

function MeetingCard({ meeting, onClick, onDelete, isDeleting }: MeetingCardProps) {
  return (
    <Card className="group cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="line-clamp-1 font-semibold">{meeting.title}</h3>
          <div className="flex items-center gap-1">
            <MeetingStatusBadge status={meeting.status} />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>

        {meeting.description && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {meeting.description}
          </p>
        )}

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {meeting.start_time && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDateTime(meeting.start_time)}</span>
            </div>
          )}
          {meeting.participants && meeting.participants.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{meeting.participants.join('、')}</span>
            </div>
          )}
          {meeting.source_file_name && (
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate">{meeting.source_file_name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
      <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
      <p className="mt-4 text-lg font-medium">暂无组会记录</p>
      <p className="mt-1 text-sm text-muted-foreground">上传腾讯会议文字记录，自动整理研究产出</p>
      <Button className="mt-4" onClick={onCreate}>
        <Plus className="h-4 w-4" />
        新建组会
      </Button>
    </div>
  )
}
