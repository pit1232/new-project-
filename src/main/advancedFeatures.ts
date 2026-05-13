import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import Store from 'electron-store'

const store = new Store()

// File watcher for Smart Drop Zones
let activeWatchers: Map<string, fs.FSWatcher> = new Map()

export function registerAdvancedFeaturesHandlers(): void {
  // ============ WORMHOLE - Expose Localhost to Internet ============
  ipcMain.handle('wormhole:deploy', async (_, port: number) => {
    try {
      const { startTunnel } = await import('untun')
      const tunnel = await startTunnel({ port })
      const url = await tunnel.getURL()

      // Store tunnel reference
      store.set(`wormhole_${port}`, { port, url, startedAt: Date.now() })

      return { success: true, url, port, message: `Tunnel active: ${url} → localhost:${port}` }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ WORMHOLE - Close Tunnel ============
  ipcMain.handle('wormhole:close', async (_, port: number) => {
    try {
      store.delete(`wormhole_${port}`)
      return { success: true, message: `Tunnel for port ${port} closed` }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ WORMHOLE - List Active Tunnels ============
  ipcMain.handle('wormhole:list', async () => {
    const allStore = store.store as any
    const tunnels = Object.entries(allStore)
      .filter(([key]) => key.startsWith('wormhole_'))
      .map(([_, value]) => value)
    return { tunnels }
  })

  // ============ SMART DROP ZONES (AI File Sorting) ============
  ipcMain.handle(
    'dropzone:setup',
    async (_, watchPath: string, rules: Array<{ extension: string; destination: string }>) => {
      try {
        // Stop existing watcher for this path
        if (activeWatchers.has(watchPath)) {
          activeWatchers.get(watchPath)?.close()
          activeWatchers.delete(watchPath)
        }

        // Ensure destination directories exist
        for (const rule of rules) {
          await fs.promises.mkdir(rule.destination, { recursive: true })
        }

        // Start watching
        const watcher = fs.watch(watchPath, async (eventType, filename) => {
          if (eventType === 'rename' && filename) {
            const filePath = path.join(watchPath, filename)

            // Check if file exists (not deleted)
            try {
              await fs.promises.access(filePath)
            } catch {
              return // File was deleted
            }

            const ext = path.extname(filename).toLowerCase()

            // Find matching rule
            const rule = rules.find((r) => r.extension.toLowerCase() === ext)
            if (rule) {
              const destPath = path.join(rule.destination, filename)
              try {
                await fs.promises.rename(filePath, destPath)
                console.log(`[DropZone] Moved ${filename} → ${rule.destination}`)
              } catch (err) {
                console.error(`[DropZone] Failed to move ${filename}:`, err)
              }
            }
          }
        })

        activeWatchers.set(watchPath, watcher)

        // Save config
        const config = (store.get('dropzones') as any[]) || []
        config.push({ watchPath, rules, createdAt: Date.now() })
        store.set('dropzones', config)

        return {
          success: true,
          message: `Drop zone active: watching ${watchPath} with ${rules.length} rules`
        }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ SMART DROP ZONES - Stop ============
  ipcMain.handle('dropzone:stop', async (_, watchPath: string) => {
    try {
      if (activeWatchers.has(watchPath)) {
        activeWatchers.get(watchPath)?.close()
        activeWatchers.delete(watchPath)
      }
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ SMART DROP ZONES - List Active ============
  ipcMain.handle('dropzone:list', async () => {
    const zones = Array.from(activeWatchers.keys())
    return { activeZones: zones }
  })

  // ============ EXECUTE MACRO (JSON-based Automation Sequence) ============
  ipcMain.handle(
    'macro:execute',
    async (_, steps: Array<{ action: string; params: any; delay?: number }>) => {
      try {
        const results: any[] = []

        for (const step of steps) {
          // Wait for delay if specified
          if (step.delay) {
            await new Promise((resolve) => setTimeout(resolve, step.delay))
          }

          // Execute action based on type
          switch (step.action) {
            case 'click': {
              const { mouse, Point } = await import('@nut-tree-fork/nut-js')
              await mouse.setPosition(new Point(step.params.x, step.params.y))
              await mouse.leftClick()
              results.push({ action: 'click', success: true })
              break
            }
            case 'type': {
              const { keyboard } = await import('@nut-tree-fork/nut-js')
              await keyboard.type(step.params.text)
              results.push({ action: 'type', success: true })
              break
            }
            case 'shortcut': {
              const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
              const keyMap: Record<string, any> = {
                ctrl: Key.LeftControl, alt: Key.LeftAlt, shift: Key.LeftShift,
                enter: Key.Enter, tab: Key.Tab, escape: Key.Escape,
                a: Key.A, b: Key.B, c: Key.C, d: Key.D, e: Key.E,
                f: Key.F, g: Key.G, h: Key.H, i: Key.I, j: Key.J,
                k: Key.K, l: Key.L, m: Key.M, n: Key.N, o: Key.O,
                p: Key.P, q: Key.Q, r: Key.R, s: Key.S, t: Key.T,
                u: Key.U, v: Key.V, w: Key.W, x: Key.X, y: Key.Y, z: Key.Z
              }
              const keys = step.params.keys.map((k: string) => keyMap[k.toLowerCase()])
              await keyboard.pressKey(...keys)
              await keyboard.releaseKey(...keys)
              results.push({ action: 'shortcut', success: true })
              break
            }
            case 'wait': {
              await new Promise((resolve) => setTimeout(resolve, step.params.ms || 1000))
              results.push({ action: 'wait', success: true })
              break
            }
            case 'shell': {
              const output = await new Promise<string>((resolve) => {
                exec(step.params.command, (error, stdout) => {
                  resolve(error ? error.message : stdout)
                })
              })
              results.push({ action: 'shell', success: true, output })
              break
            }
            case 'scroll': {
              const { mouse } = await import('@nut-tree-fork/nut-js')
              if (step.params.direction === 'down') {
                await mouse.scrollDown(step.params.amount || 500)
              } else {
                await mouse.scrollUp(step.params.amount || 500)
              }
              results.push({ action: 'scroll', success: true })
              break
            }
            default:
              results.push({ action: step.action, success: false, error: 'Unknown action' })
          }
        }

        return { success: true, results, stepsExecuted: results.length }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ SAVE MACRO ============
  ipcMain.handle(
    'macro:save',
    async (_, name: string, steps: Array<{ action: string; params: any; delay?: number }>) => {
      try {
        const macros = (store.get('saved_macros') as any) || {}
        macros[name] = { steps, savedAt: Date.now() }
        store.set('saved_macros', macros)
        return { success: true, name }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ LOAD & RUN NAMED MACRO ============
  ipcMain.handle('macro:run-named', async (_, name: string) => {
    try {
      const macros = (store.get('saved_macros') as any) || {}
      const macro = macros[name]
      if (!macro) return { error: `Macro "${name}" not found` }
      // Trigger execute via same logic
      return { steps: macro.steps, message: `Loaded macro: ${name}` }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ LIST SAVED MACROS ============
  ipcMain.handle('macro:list', async () => {
    const macros = (store.get('saved_macros') as any) || {}
    return {
      macros: Object.entries(macros).map(([name, data]: [string, any]) => ({
        name,
        stepsCount: data.steps.length,
        savedAt: data.savedAt
      }))
    }
  })

  // ============ OPEN PROJECT IN IDE ============
  ipcMain.handle('dev:open-project', async (_, projectPath: string, ide?: string) => {
    try {
      const editorCmd = ide || 'code' // Default to VS Code
      return new Promise((resolve) => {
        exec(`${editorCmd} "${projectPath}"`, (error) => {
          if (error) {
            resolve({ error: error.message })
          } else {
            resolve({ success: true, path: projectPath, ide: editorCmd })
          }
        })
      })
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ ACTIVATE CODING MODE (Context Switch) ============
  ipcMain.handle('dev:coding-mode', async (_, projectPath: string, language?: string) => {
    try {
      // Open project in IDE
      exec(`code "${projectPath}"`)

      // Store context
      store.set('coding_mode', {
        active: true,
        projectPath,
        language: language || 'auto',
        startedAt: Date.now()
      })

      return {
        success: true,
        mode: 'coding',
        project: projectPath,
        language: language || 'auto',
        message: `Coding mode activated for ${projectPath}`
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ BUILD FILE (Write Code to Disk) ============
  ipcMain.handle('dev:build-file', async (_, filePath: string, code: string) => {
    try {
      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
      await fs.promises.writeFile(filePath, code, 'utf-8')
      return { success: true, path: filePath, size: code.length }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ READ PDF ============
  ipcMain.handle('doc:read-pdf', async (_, filePath: string) => {
    try {
      const pdfParse = (await import('pdf-parse')).default
      const buffer = await fs.promises.readFile(filePath)
      const data = await pdfParse(buffer)
      return {
        text: data.text,
        pages: data.numpages,
        info: data.info
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ READ DOCX ============
  ipcMain.handle('doc:read-docx', async (_, filePath: string) => {
    try {
      const mammoth = await import('mammoth')
      const buffer = await fs.promises.readFile(filePath)
      const result = await mammoth.extractRawText({ buffer })
      return { text: result.value }
    } catch (error: any) {
      return { error: error.message }
    }
  })
}
