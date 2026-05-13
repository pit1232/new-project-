import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Monitor,
  Folder,
  File,
  ArrowLeft,
  RefreshCw,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  FolderOpen,
  Trash2,
  Copy
} from 'lucide-react'
import { useSystemStore } from '../stores/systemStore'

function SystemControlPage(): React.ReactElement {
  const {
    currentPath,
    files,
    systemInfo,
    isLoadingFiles,
    loadDirectory,
    loadSystemInfo
  } = useSystemStore()
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  useEffect(() => {
    loadSystemInfo()
    // Load home directory on mount
    window.api.system.getInfo().then((info) => {
      if (info.homedir) {
        loadDirectory(info.homedir)
      }
    })
  }, [])

  const handleNavigate = (filePath: string, isDir: boolean) => {
    if (isDir) {
      loadDirectory(filePath)
    } else {
      setSelectedFile(filePath)
    }
  }

  const handleGoUp = () => {
    if (!currentPath) return
    const parts = currentPath.replace(/\\/g, '/').split('/')
    parts.pop()
    const parent = parts.join('/') || '/'
    loadDirectory(parent)
  }

  const handleSelectDirectory = async () => {
    const dir = await window.api.fs.selectDirectory()
    if (dir) loadDirectory(dir)
  }

  const handleDeleteFile = async (filePath: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      await window.api.fs.deleteFile(filePath)
      loadDirectory(currentPath)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Monitor className="text-emerald-400" size={20} />
        <h1 className="text-lg font-semibold text-white/90">System Control</h1>
      </div>

      {/* System Info Cards */}
      {systemInfo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={14} className="text-emerald-400" />
              <span className="text-[10px] font-mono text-white/40 uppercase">Platform</span>
            </div>
            <p className="text-sm font-medium text-white/80">
              {systemInfo.platform} ({systemInfo.arch})
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={14} className="text-cyan-400" />
              <span className="text-[10px] font-mono text-white/40 uppercase">CPUs</span>
            </div>
            <p className="text-sm font-medium text-white/80">{systemInfo.cpus} Cores</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MemoryStick size={14} className="text-purple-400" />
              <span className="text-[10px] font-mono text-white/40 uppercase">Memory</span>
            </div>
            <p className="text-sm font-medium text-white/80">
              {formatBytes(systemInfo.freeMemory)} / {formatBytes(systemInfo.totalMemory)}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-orange-400" />
              <span className="text-[10px] font-mono text-white/40 uppercase">Uptime</span>
            </div>
            <p className="text-sm font-medium text-white/80">{formatUptime(systemInfo.uptime)}</p>
          </div>
        </div>
      )}

      {/* File Browser */}
      <div className="flex-1 glass rounded-xl p-4 flex flex-col min-h-0">
        {/* File Browser Header */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
          <button
            onClick={handleGoUp}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 bg-white/5 rounded-lg px-3 py-1.5">
            <span className="text-xs font-mono text-white/50 truncate block">{currentPath}</span>
          </div>
          <button
            onClick={handleSelectDirectory}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white/80 transition-colors"
            title="Select directory"
          >
            <FolderOpen size={16} />
          </button>
          <button
            onClick={() => loadDirectory(currentPath)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white/80 transition-colors"
          >
            <RefreshCw size={16} className={isLoadingFiles ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {files
            .sort((a, b) => {
              if (a.isDirectory && !b.isDirectory) return -1
              if (!a.isDirectory && b.isDirectory) return 1
              return a.name.localeCompare(b.name)
            })
            .map((file) => (
              <motion.div
                key={file.path}
                whileHover={{ x: 2 }}
                onClick={() => handleNavigate(file.path, file.isDirectory)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
                  selectedFile === file.path
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'hover:bg-white/5'
                }`}
              >
                {file.isDirectory ? (
                  <Folder size={16} className="text-emerald-400/70" />
                ) : (
                  <File size={16} className="text-white/40" />
                )}
                <span className="flex-1 text-sm text-white/70 truncate">{file.name}</span>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteFile(file.path)
                    }}
                    className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default SystemControlPage
