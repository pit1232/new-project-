import { BrowserWindow, ipcMain, screen } from 'electron'

// Track floating widget windows
const widgets: Map<string, BrowserWindow> = new Map()

export function registerWindowManagerHandlers(mainWindow: BrowserWindow): void {
  // ============ WINDOW MANAGEMENT (Teleport Windows) ============

  // Get all open windows info
  ipcMain.handle('window:get-all', async () => {
    try {
      const windowManager = await import('node-window-manager')
      const windows = windowManager.windowManager.getWindows()
      return windows.map((w) => ({
        id: w.id,
        title: w.getTitle(),
        path: w.path,
        bounds: w.getBounds(),
        isVisible: w.isVisible()
      }))
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // Focus a specific window by ID
  ipcMain.handle('window:focus', async (_, windowId: number) => {
    try {
      const windowManager = await import('node-window-manager')
      const windows = windowManager.windowManager.getWindows()
      const target = windows.find((w) => w.id === windowId)
      if (target) {
        target.bringToTop()
        return { success: true }
      }
      return { error: 'Window not found' }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // Move/resize a window (Teleport)
  ipcMain.handle(
    'window:teleport',
    async (_, windowId: number, bounds: { x: number; y: number; width: number; height: number }) => {
      try {
        const windowManager = await import('node-window-manager')
        const windows = windowManager.windowManager.getWindows()
        const target = windows.find((w) => w.id === windowId)
        if (target) {
          target.setBounds(bounds)
          return { success: true }
        }
        return { error: 'Window not found' }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // Minimize a window
  ipcMain.handle('window:minimize-external', async (_, windowId: number) => {
    try {
      const windowManager = await import('node-window-manager')
      const windows = windowManager.windowManager.getWindows()
      const target = windows.find((w) => w.id === windowId)
      if (target) {
        target.minimize()
        return { success: true }
      }
      return { error: 'Window not found' }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // Get active/foreground window
  ipcMain.handle('window:get-active', async () => {
    try {
      const windowManager = await import('node-window-manager')
      const active = windowManager.windowManager.getActiveWindow()
      return {
        id: active.id,
        title: active.getTitle(),
        path: active.path,
        bounds: active.getBounds()
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ FLOATING WIDGETS ============

  // Create a floating widget window
  ipcMain.handle(
    'widget:create',
    async (
      _,
      config: {
        id: string
        html: string
        width?: number
        height?: number
        x?: number
        y?: number
        title?: string
        alwaysOnTop?: boolean
      }
    ) => {
      try {
        // Close existing widget with same ID
        if (widgets.has(config.id)) {
          widgets.get(config.id)?.close()
          widgets.delete(config.id)
        }

        const display = screen.getPrimaryDisplay()
        const { width: screenW, height: screenH } = display.workAreaSize

        const widgetWindow = new BrowserWindow({
          width: config.width || 300,
          height: config.height || 200,
          x: config.x ?? screenW - (config.width || 300) - 20,
          y: config.y ?? 20,
          frame: false,
          transparent: true,
          alwaysOnTop: config.alwaysOnTop !== false,
          skipTaskbar: true,
          resizable: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        })

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                background: rgba(0, 0, 0, 0.85);
                color: white;
                font-family: 'Inter', -apple-system, sans-serif;
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(20px);
                -webkit-app-region: drag;
              }
              .widget-header {
                padding: 8px 12px;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: rgba(255,255,255,0.4);
                border-bottom: 1px solid rgba(255,255,255,0.05);
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .widget-close {
                cursor: pointer;
                -webkit-app-region: no-drag;
                opacity: 0.4;
                transition: opacity 0.2s;
              }
              .widget-close:hover { opacity: 1; color: #ef4444; }
              .widget-body {
                padding: 12px;
                -webkit-app-region: no-drag;
              }
            </style>
          </head>
          <body>
            <div class="widget-header">
              <span>${config.title || 'Widget'}</span>
              <span class="widget-close" onclick="window.close()">X</span>
            </div>
            <div class="widget-body">${config.html}</div>
          </body>
          </html>
        `

        widgetWindow.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
        )

        widgets.set(config.id, widgetWindow)

        widgetWindow.on('closed', () => {
          widgets.delete(config.id)
        })

        return { success: true, id: config.id }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // Close a specific widget
  ipcMain.handle('widget:close', async (_, widgetId: string) => {
    try {
      const widget = widgets.get(widgetId)
      if (widget) {
        widget.close()
        widgets.delete(widgetId)
        return { success: true }
      }
      return { error: 'Widget not found' }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // Close all widgets
  ipcMain.handle('widget:close-all', async () => {
    try {
      for (const [id, widget] of widgets) {
        widget.close()
      }
      widgets.clear()
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // List active widgets
  ipcMain.handle('widget:list', async () => {
    const list: Array<{ id: string; bounds: any }> = []
    for (const [id, widget] of widgets) {
      if (!widget.isDestroyed()) {
        list.push({ id, bounds: widget.getBounds() })
      }
    }
    return list
  })
}
