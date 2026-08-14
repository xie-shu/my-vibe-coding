import { Moon, RotateCcw, Sparkles, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { IS_DEMO_MODE, resetDemoState } from '@/lib/demo-data'

const routeTitles: Record<string, string> = {
  '/': '今日成长',
  '/practice': '每日训练',
  '/practices': '练习记录',
  '/interviews': '面试库',
  '/radar': 'AI 产品雷达',
  '/chat': '成长问答',
  '/knowledge': '个人知识库',
  '/meetings': '历史组会',
  '/summaries': '历史纪要',
  '/decisions': '历史决策',
}

export function Header() {
  const { darkMode, toggleDarkMode } = useUIStore()
  const { pathname } = useLocation()
  const section = Object.entries(routeTitles).find(([route]) => route !== '/' && pathname.startsWith(route))?.[1] || routeTitles[pathname] || 'AI 成长舱'

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground md:hidden">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{section}</p>
          <p className="hidden text-[11px] text-muted-foreground sm:block">每日产品题 · AI 趋势雷达 · 面试表达复盘</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {IS_DEMO_MODE && (
          <div className="hidden items-center gap-1 sm:flex">
            <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              全站 Demo 模式
            </div>
            <Button
              variant="ghost"
              size="icon"
              title="重置 Demo 数据"
              aria-label="重置 Demo 数据"
              onClick={() => {
                resetDemoState()
                window.location.assign('/')
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} title="切换主题" aria-label={darkMode ? '切换到浅色主题' : '切换到深色主题'}>
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  )
}
