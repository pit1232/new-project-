import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'
import * as path from 'path'
import { exec, spawn } from 'child_process'
import Store from 'electron-store'
import { registerWindowManagerHandlers } from './windowManager'
import { registerDesktopAutomationHandlers } from './desktopAutomation'
import { registerVectorSearchHandlers } from './vectorSearch'
import { registerOCRVisionHandlers } from './ocrVision'
import { registerCommunicationsHandlers } from './communications'
import { registerMobileControlHandlers } from './mobileControl'
import { registerWebResearchHandlers } from './webResearch'
import { registerMediaFinanceHandlers } from './mediaFinance'
import { registerAdvancedFeaturesHandlers } from './advancedFeatures'
import { registerMultiAgentHandlers } from './multiAgent'
import { registerPluginSystemHandlers } from './pluginSystem'

const store = new Store()

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#030303',
    icon: join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Window controls
  ipcMain.on('window-minimize', () => mainWindow.minimize())
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.on('window-close', () => mainWindow.close())

  return mainWindow
}

// ============ FILE SYSTEM OPERATIONS ============
ipcMain.handle('fs:read-directory', async (_, dirPath: string) => {
  try {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true })
    return items.map((item) => ({
      name: item.name,
      path: path.join(dirPath, item.name),
      isDirectory: item.isDirectory(),
      isFile: item.isFile()
    }))
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('fs:read-file', async (_, filePath: string) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return { content }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('fs:write-file', async (_, filePath: string, content: string) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('fs:copy-file', async (_, src: string, dest: string) => {
  try {
    await fs.promises.copyFile(src, dest)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('fs:move-file', async (_, src: string, dest: string) => {
  try {
    await fs.promises.rename(src, dest)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('fs:delete-file', async (_, filePath: string) => {
  try {
    await fs.promises.unlink(filePath)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('fs:create-directory', async (_, dirPath: string) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('fs:get-stats', async (_, filePath: string) => {
  try {
    const stats = await fs.promises.stat(filePath)
    return {
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      created: stats.birthtime,
      modified: stats.mtime
    }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('fs:select-directory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('fs:select-file', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] })
  return result.canceled ? null : result.filePaths[0]
})

// ============ SYSTEM / APP CONTROL ============
ipcMain.handle('system:get-info', async () => {
  const os = await import('os')
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    homedir: os.homedir(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime()
  }
})

ipcMain.handle('system:open-app', async (_, appPath: string) => {
  try {
    exec(`start "" "${appPath}"`, (error) => {
      if (error) console.error('Failed to open app:', error)
    })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('system:open-url', async (_, url: string) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
})

// ============ TERMINAL / COMMAND EXECUTION ============
ipcMain.handle('terminal:execute', async (_, command: string, cwd?: string) => {
  return new Promise((resolve) => {
    exec(command, { cwd: cwd || process.env.HOME || '/' }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        error: error ? error.message : null,
        exitCode: error ? error.code : 0
      })
    })
  })
})

ipcMain.handle('terminal:spawn', async (_, command: string, args: string[], cwd?: string) => {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: cwd || process.env.HOME || '/',
      shell: true
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code })
    })
  })
})

// ============ STORE (SETTINGS / MEMORY) ============
ipcMain.handle('store:get', async (_, key: string) => {
  return store.get(key)
})

ipcMain.handle('store:set', async (_, key: string, value: any) => {
  store.set(key, value)
  return { success: true }
})

ipcMain.handle('store:delete', async (_, key: string) => {
  store.delete(key)
  return { success: true }
})

ipcMain.handle('store:get-all', async () => {
  return store.store
})

// ============ AI SERVICE ============
ipcMain.handle(
  'ai:chat',
  async (_, provider: string, apiKey: string, messages: any[], model?: string) => {
    try {
      if (provider === 'gemini') {
        const { GoogleGenAI } = await import('@google/genai')
        const ai = new GoogleGenAI({ apiKey })
        const response = await ai.models.generateContent({
          model: model || 'gemini-2.0-flash',
          contents: messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
        })
        return { content: response.text || '', provider: 'gemini' }
      } else if (provider === 'groq') {
        const Groq = (await import('groq-sdk')).default
        const groq = new Groq({ apiKey })
        const response = await groq.chat.completions.create({
          model: model || 'llama-3.3-70b-versatile',
          messages: messages.map((m) => ({ role: m.role, content: m.content }))
        })
        return { content: response.choices[0]?.message?.content || '', provider: 'groq' }
      }
      return { error: 'Unknown provider' }
    } catch (error: any) {
      return { error: error.message }
    }
  }
)

// ============ WEB RESEARCH ============
ipcMain.handle('web:search', async (_, query: string, apiKey?: string) => {
  try {
    if (apiKey) {
      const { tavily } = await import('@tavily/core')
      const client = tavily({ apiKey })
      const response = await client.search(query, { maxResults: 5 })
      return { results: response.results }
    }
    // Fallback: basic fetch
    const axios = (await import('axios')).default
    const response = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    )
    return { html: response.data }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('web:scrape', async (_, url: string) => {
  try {
    const axios = (await import('axios')).default
    const cheerio = await import('cheerio')
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    const $ = cheerio.load(response.data)
    $('script, style, nav, footer, header').remove()
    const text = $('body').text().replace(/\s+/g, ' ').trim()
    const title = $('title').text()
    return { title, text: text.substring(0, 5000), url }
  } catch (error: any) {
    return { error: error.message }
  }
})

// ============ AUTOMATION (Desktop) ============
ipcMain.handle('automation:mouse-click', async (_, x: number, y: number) => {
  try {
    const { mouse, Point } = await import('@nut-tree-fork/nut-js')
    await mouse.setPosition(new Point(x, y))
    await mouse.leftClick()
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('automation:keyboard-type', async (_, text: string) => {
  try {
    const { keyboard } = await import('@nut-tree-fork/nut-js')
    await keyboard.type(text)
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
})

ipcMain.handle('automation:screenshot', async () => {
  try {
    const screenshot = (await import('screenshot-desktop')).default
    const img = await screenshot({ format: 'png' })
    return { image: img.toString('base64') }
  } catch (error: any) {
    return { error: error.message }
  }
})

// ============ APP LIFECYCLE ============
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mmb.ai')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createWindow()

  // Register all feature modules
  registerWindowManagerHandlers(mainWindow)
  registerDesktopAutomationHandlers()
  registerVectorSearchHandlers()
  registerOCRVisionHandlers()
  registerCommunicationsHandlers()
  registerMobileControlHandlers()
  registerWebResearchHandlers()
  registerMediaFinanceHandlers()
  registerAdvancedFeaturesHandlers()
  registerMultiAgentHandlers()
  registerPluginSystemHandlers()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
