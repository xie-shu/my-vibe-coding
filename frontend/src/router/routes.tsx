import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'

// 路由懒加载
const MeetingListPage = lazy(() => import('@/features/meetings/pages/meeting-list-page'))
const TodayPage = lazy(() => import('@/features/growth/pages/today-page'))
const PracticePage = lazy(() => import('@/features/growth/pages/practice-page'))
const RadarPage = lazy(() => import('@/features/growth/pages/radar-page'))
const PracticeHistoryPage = lazy(() => import('@/features/growth/pages/practice-history-page'))
const InterviewLibraryPage = lazy(() => import('@/features/growth/pages/interview-library-page'))
const MeetingDetailPage = lazy(() => import('@/features/meetings/pages/meeting-detail-page'))
const SummaryListPage = lazy(() => import('@/features/summaries/pages/summary-list-page'))
const SummaryDetailPage = lazy(() => import('@/features/summaries/pages/summary-detail-page'))
const ChatPage = lazy(() => import('@/features/chat/pages/chat-page'))
const KnowledgePage = lazy(() => import('@/features/knowledge/pages/knowledge-page'))
const DecisionListPage = lazy(() => import('@/features/decisions/pages/decision-list-page'))
const DecisionDetailPage = lazy(() => import('@/features/decisions/pages/decision-detail-page'))
// 房间页（M1 Step 1.4 实现）
// const RoomListPage = lazy(() => import('@/features/rooms/pages/room-list-page'))
// const RoomPage = lazy(() => import('@/features/rooms/pages/room-page'))

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <TodayPage />,
      },
      {
        path: 'practice/:id',
        element: <PracticePage />,
      },
      {
        path: 'radar',
        element: <RadarPage />,
      },
      {
        path: 'practices',
        element: <PracticeHistoryPage />,
      },
      {
        path: 'practices/:id',
        element: <PracticeHistoryPage />,
      },
      {
        path: 'interviews',
        element: <InterviewLibraryPage />,
      },
      {
        path: 'meetings',
        element: <MeetingListPage />,
      },
      {
        path: 'meetings/:id',
        element: <MeetingDetailPage />,
      },
      {
        path: 'summaries',
        element: <SummaryListPage />,
      },
      {
        path: 'summaries/:id',
        element: <SummaryDetailPage />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'knowledge',
        element: <KnowledgePage />,
      },
      {
        path: 'decisions',
        element: <DecisionListPage />,
      },
      {
        path: 'decisions/:id',
        element: <DecisionDetailPage />,
      },
      // 房间路由占位（Step 1.4 启用）
      // { path: 'rooms', element: <RoomListPage /> },
      // { path: 'rooms/:roomId', element: <RoomPage /> },
    ],
  },
]
