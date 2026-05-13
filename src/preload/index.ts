import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // File System
  fs: {
    readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:read-directory', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:write-file', filePath, content),
    copyFile: (src: string, dest: string) => ipcRenderer.invoke('fs:copy-file', src, dest),
    moveFile: (src: string, dest: string) => ipcRenderer.invoke('fs:move-file', src, dest),
    deleteFile: (filePath: string) => ipcRenderer.invoke('fs:delete-file', filePath),
    createDirectory: (dirPath: string) => ipcRenderer.invoke('fs:create-directory', dirPath),
    getStats: (filePath: string) => ipcRenderer.invoke('fs:get-stats', filePath),
    selectDirectory: () => ipcRenderer.invoke('fs:select-directory'),
    selectFile: () => ipcRenderer.invoke('fs:select-file')
  },

  // System
  system: {
    getInfo: () => ipcRenderer.invoke('system:get-info'),
    openApp: (appPath: string) => ipcRenderer.invoke('system:open-app', appPath),
    openUrl: (url: string) => ipcRenderer.invoke('system:open-url', url)
  },

  // Terminal
  terminal: {
    execute: (command: string, cwd?: string) => ipcRenderer.invoke('terminal:execute', command, cwd),
    spawn: (command: string, args: string[], cwd?: string) =>
      ipcRenderer.invoke('terminal:spawn', command, args, cwd)
  },

  // Store (Settings/Memory)
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
    getAll: () => ipcRenderer.invoke('store:get-all')
  },

  // AI
  ai: {
    chat: (provider: string, apiKey: string, messages: any[], model?: string) =>
      ipcRenderer.invoke('ai:chat', provider, apiKey, messages, model)
  },

  // Web Research
  web: {
    search: (query: string, apiKey?: string) => ipcRenderer.invoke('web:search', query, apiKey),
    scrape: (url: string) => ipcRenderer.invoke('web:scrape', url)
  },

  // Automation
  automation: {
    mouseClick: (x: number, y: number) => ipcRenderer.invoke('automation:mouse-click', x, y),
    keyboardType: (text: string) => ipcRenderer.invoke('automation:keyboard-type', text),
    screenshot: () => ipcRenderer.invoke('automation:screenshot')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
