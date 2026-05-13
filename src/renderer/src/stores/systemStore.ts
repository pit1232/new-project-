import { create } from 'zustand'

export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

export interface SystemInfo {
  platform: string
  arch: string
  hostname: string
  username: string
  homedir: string
  cpus: number
  totalMemory: number
  freeMemory: number
  uptime: number
}

interface SystemState {
  currentPath: string
  files: FileItem[]
  systemInfo: SystemInfo | null
  isLoadingFiles: boolean
  terminalOutput: string[]
  setCurrentPath: (path: string) => void
  setFiles: (files: FileItem[]) => void
  setSystemInfo: (info: SystemInfo) => void
  setLoadingFiles: (loading: boolean) => void
  addTerminalOutput: (output: string) => void
  clearTerminal: () => void
  loadDirectory: (dirPath: string) => Promise<void>
  loadSystemInfo: () => Promise<void>
}

export const useSystemStore = create<SystemState>((set) => ({
  currentPath: '',
  files: [],
  systemInfo: null,
  isLoadingFiles: false,
  terminalOutput: [],

  setCurrentPath: (path) => set({ currentPath: path }),
  setFiles: (files) => set({ files }),
  setSystemInfo: (info) => set({ systemInfo: info }),
  setLoadingFiles: (loading) => set({ isLoadingFiles: loading }),
  addTerminalOutput: (output) =>
    set((state) => ({ terminalOutput: [...state.terminalOutput, output] })),
  clearTerminal: () => set({ terminalOutput: [] }),

  loadDirectory: async (dirPath: string) => {
    set({ isLoadingFiles: true })
    try {
      const result = await window.api.fs.readDirectory(dirPath)
      if (Array.isArray(result)) {
        set({ files: result, currentPath: dirPath })
      }
    } catch (e) {
      console.error('Failed to load directory:', e)
    } finally {
      set({ isLoadingFiles: false })
    }
  },

  loadSystemInfo: async () => {
    try {
      const info = await window.api.system.getInfo()
      set({ systemInfo: info })
    } catch (e) {
      console.error('Failed to load system info:', e)
    }
  }
}))
