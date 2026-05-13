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

export interface API {
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void

  fs: {
    readDirectory: (dirPath: string) => Promise<FileItem[] | { error: string }>
    readFile: (filePath: string) => Promise<{ content: string } | { error: string }>
    writeFile: (filePath: string, content: string) => Promise<{ success: boolean } | { error: string }>
    copyFile: (src: string, dest: string) => Promise<{ success: boolean } | { error: string }>
    moveFile: (src: string, dest: string) => Promise<{ success: boolean } | { error: string }>
    deleteFile: (filePath: string) => Promise<{ success: boolean } | { error: string }>
    createDirectory: (dirPath: string) => Promise<{ success: boolean } | { error: string }>
    getStats: (filePath: string) => Promise<any>
    selectDirectory: () => Promise<string | null>
    selectFile: () => Promise<string | null>
  }

  system: {
    getInfo: () => Promise<SystemInfo>
    openApp: (appPath: string) => Promise<{ success: boolean } | { error: string }>
    openUrl: (url: string) => Promise<{ success: boolean } | { error: string }>
  }

  terminal: {
    execute: (command: string, cwd?: string) => Promise<{
      stdout: string
      stderr: string
      error: string | null
      exitCode: number
    }>
    spawn: (command: string, args: string[], cwd?: string) => Promise<{
      stdout: string
      stderr: string
      exitCode: number
    }>
  }

  store: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<{ success: boolean }>
    delete: (key: string) => Promise<{ success: boolean }>
    getAll: () => Promise<any>
  }

  ai: {
    chat: (provider: string, apiKey: string, messages: any[], model?: string) => Promise<{
      content?: string
      provider?: string
      error?: string
    }>
  }

  web: {
    search: (query: string, apiKey?: string) => Promise<any>
    scrape: (url: string) => Promise<any>
  }

  automation: {
    mouseClick: (x: number, y: number) => Promise<{ success: boolean } | { error: string }>
    keyboardType: (text: string) => Promise<{ success: boolean } | { error: string }>
    screenshot: () => Promise<{ image: string } | { error: string }>
  }
}

declare global {
  interface Window {
    api: API
  }
}
