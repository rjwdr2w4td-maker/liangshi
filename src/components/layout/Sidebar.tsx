import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Users,
  ListTodo,
  Sprout,
  Wheat,
  Shield,
  Map,
  AlertTriangle,
  FileText,
  X,
  ChevronDown,
  ClipboardList,
  CalendarDays,
  CloudSun,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

interface MenuChild {
  path: string
  label: string
  icon: typeof Home
}

interface MenuItem {
  path?: string
  icon: typeof Home
  label: string
  children?: MenuChild[]
}

const menuItems: MenuItem[] = [
  { path: '/', icon: Home, label: '首页' },
  {
    icon: ClipboardList,
    label: '任务与规划',
    children: [
      { path: '/tasks', icon: ListTodo, label: '任务分解' },
      { path: '/entities', icon: Users, label: '种植主体' },
    ],
  },
  {
    icon: CalendarDays,
    label: '生产进度调度',
    children: [
      { path: '/sowing', icon: Sprout, label: '播种进度' },
      { path: '/harvest', icon: Wheat, label: '收获进度' },
      { path: '/progress/details', icon: ListTodo, label: '进度明细' },
    ],
  },
  { path: '/policies', icon: FileText, label: '惠农政策' },
  {
    icon: Shield,
    label: '防灾减灾调度',
    children: [
      { path: '/disaster', icon: CloudSun, label: '气象预警' },
      { path: '/map/disaster', icon: AlertTriangle, label: '灾情档案' },
    ],
  },
  { path: '/map', icon: Map, label: '一张图' },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
    const defaults = new Set<string>()
    menuItems.forEach(item => {
      if (item.children?.some(child => location.pathname === child.path || location.pathname.startsWith(`${child.path}/`))) {
        defaults.add(item.label)
      }
    })
    return defaults
  })

  const toggleMenu = (label: string) => {
    const next = new Set(expandedMenus)
    if (next.has(label)) {
      next.delete(label)
    } else {
      next.add(label)
    }
    setExpandedMenus(next)
  }

  const isChildActive = (children?: MenuChild[]) => {
    return children?.some(child => location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)) || false
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white shadow-lg z-40
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <span className="text-lg font-semibold text-gray-800">菜单</span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <nav className="p-4 overflow-y-auto h-[calc(100%-4rem)] lg:h-full">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const hasChildren = !!item.children?.length
              const expanded = expandedMenus.has(item.label)
              const activeParent = isChildActive(item.children)

              return (
                <li key={item.label}>
                  {hasChildren ? (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleMenu(item.label)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          activeParent
                            ? 'bg-emerald-700 text-white shadow-md'
                            : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      {expanded && (
                        <ul className="mt-1 ml-4 pl-4 border-l border-gray-200 space-y-1">
                          {item.children!.map((child) => (
                            <li key={child.path}>
                              <NavLink
                                to={child.path}
                                onClick={onClose}
                                className={({ isActive }) =>
                                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                                    isActive
                                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                                      : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`
                                }
                              >
                                <child.icon className="w-4 h-4 flex-shrink-0" />
                                <span>{child.label}</span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <NavLink
                      to={item.path || '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-md'
                            : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </NavLink>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
