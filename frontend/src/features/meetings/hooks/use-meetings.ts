import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  listMeetings,
  getMeeting,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getTranscripts,
  uploadMeetingRecord,
  getProcessingStatus,
} from '@/api/meetings'
import { QUERY_KEYS } from '@/lib/constants'

// 会议列表
export function useMeetings(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [QUERY_KEYS.meetings, page, pageSize],
    queryFn: () => listMeetings(page, pageSize),
  })
}

// 会议详情
export function useMeeting(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.meeting(id || ''),
    queryFn: () => getMeeting(id!),
    enabled: !!id,
  })
}

// 创建会议
export function useCreateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.meetings] })
    },
  })
}

// 更新会议
export function useUpdateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateMeeting>[1] }) =>
      updateMeeting(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meeting(id) })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.meetings] })
    },
  })
}

// 删除会议
export function useDeleteMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.meetings] })
    },
  })
}

export function useUploadMeetingRecord(meetingId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) =>
      uploadMeetingRecord(meetingId!, file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meeting(meetingId || '') })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcripts(meetingId || '') })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.processingStatus(meetingId || '') })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.meetings] })
    },
  })
}

export function useProcessingStatus(meetingId: string | undefined) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: QUERY_KEYS.processingStatus(meetingId || ''),
    queryFn: () => getProcessingStatus(meetingId!),
    enabled: !!meetingId,
    refetchInterval: (current) => current.state.data?.status === 'processing' ? 2000 : false,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    const status = query.data?.status
    if (status === 'processed' || status === 'failed') {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meeting(meetingId || '') })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcripts(meetingId || '') })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meetingSummary(meetingId || '') })
      queryClient.invalidateQueries({ queryKey: ['decision-list'] })
    }
  }, [meetingId, query.data?.status, queryClient])
  return query
}

// 从会议文字记录解析出的原文片段
export function useTranscripts(meetingId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.transcripts(meetingId || ''),
    queryFn: () => getTranscripts(meetingId!),
    enabled: !!meetingId,
  })
}
