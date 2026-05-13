import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Monitor,
  MousePointerClick,
  Terminal,
  Globe,
  Brain,
  GitBranch,
  Shield,
  Settings,
  Minus,
  Square,
  X
} from 'lucide-react'

const navItems = [
  { path: '/', icon: MessageSquare, label: 'AI Chat' },
  { path: '/system', icon: Monitor, label: 'System' },
  { path: '/automation', icon: MousePointerClick, label: 'Automation' },
  { path: '/devtools', icon: Terminal, label: 'Dev Tools' },
  { path: '/research', icon: Globe, label: 'Research' },
  { path: '/memory', icon: Brain, label: 'Memory' },
  { path: '/memory-graph', icon: GitBranch, label: 'Graph' },
  { path: '/security', icon: Shield, label: 'Security' },
  { path: '/settings', icon: Settings, label: 'Settings' }
]

function Layout(): React.ReactElement {
  const location = useLocation()

  return (
    <div className="h-screen w-screen flex flex-col bg-[#030303] overflow-hidden">
      {/* Title Bar */}
      <div className="drag-region h-10 flex items-center justify-between px-4 border-b border-white/5 bg-black/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2 no-drag">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
          <span className="text-xs font-mono tracking-widest uppercase text-emerald-400/80">
            MMB AI
          </span>
          <span className="text-[10px] font-mono text-white/30 ml-2">v1.0.0</span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => window.api.minimizeWindow()}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <Minus size={12} className="text-white/60" />
          </button>
          <button
            onClick={() => window.api.maximizeWindow()}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <Square size={10} className="text-white/60" />
          </button>
          <button
            onClick={() => window.api.closeWindow()}
            className="p-1.5 rounded hover:bg-red-500/20 transition-colors group"
          >
            <X size={12} className="text-white/60 group-hover:text-red-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-16 lg:w-56 flex flex-col items-center lg:items-stretch py-4 px-2 lg:px-3 border-r border-white/5 bg-black/40 backdrop-blur-xl shrink-0 gap-1 overflow-y-auto">
          {/* Logo */}
          <div className="mb-4 flex items-center justify-center lg:justify-start lg:px-2 gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-xs font-bold text-black">M</span>
            </div>
            <span className="hidden lg:block text-sm font-semibold text-white/90">MMB AI</span>
          </div>

          {/* Nav Items */}
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <NavLink key={item.path} to={item.path} className="no-drag">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'text-emerald-400' : ''} />
                  <span className="hidden lg:block text-sm">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 w-0.5 h-6 bg-emerald-400 rounded-r-full"
                    />
                  )}
                </motion.div>
              </NavLink>
            )
          })}

          {/* Bottom status */}
          <div className="mt-auto pt-4 hidden lg:block">
            <div className="glass rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  System Online
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default Layout
