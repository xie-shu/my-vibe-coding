import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  Radar,
  Sparkles,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { APP_TITLE } from '@/lib/constants'

const navItems = [
  { to: '/', label: '今日成长', icon: LayoutDashboard },
  { to: '/practices', label: '练习记录', icon: Target },
  { to: '/radar', label: 'AI 产品雷达', icon: Radar },
  { to: '/chat', label: '成长问答', icon: MessageSquare },
  { to: '/knowledge', label: '个人知识库', icon: BookOpen },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <aside
      className={cn(
        'hidden flex-col border-r bg-card transition-all duration-300 md:flex',
        sidebarCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo 区域 */}
      <div className="flex h-16 items-center gap-2.5 border-b px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        {!sidebarCollapsed && <div className="min-w-0"><span className="block truncate text-sm font-semibold">{APP_TITLE}</span><span className="block truncate text-[10px] text-muted-foreground">AI PM growth cockpit</span></div>}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* 折叠按钮 */}
      <div className="border-t p-2">
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
          className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
          {!sidebarCollapsed && <span>收起侧栏</span>}
        </button>
      </div>
    </aside>
  )
}
