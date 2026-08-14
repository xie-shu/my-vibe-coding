import { NavLink, Outlet } from 'react-router-dom'
import { BookOpen, LayoutDashboard, MessageSquare, Radar, Target } from 'lucide-react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { to: '/', label: '今日', icon: LayoutDashboard },
  { to: '/practices', label: '练习', icon: Target },
  { to: '/radar', label: '雷达', icon: Radar },
  { to: '/chat', label: '问答', icon: MessageSquare },
  { to: '/knowledge', label: '知识', icon: BookOpen },
]

export function AppLayout() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 md:pb-8">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="移动端主导航">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => cn('flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', isActive && 'text-primary')}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
