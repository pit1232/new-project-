import { ipcMain } from 'electron'
import { exec } from 'child_process'
import * as path from 'path'

// Helper to run ADB commands
function runADB(command: string): Promise<{ stdout: string; stderr: string; error: string | null }> {
  return new Promise((resolve) => {
    exec(`adb ${command}`, { timeout: 30000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout?.trim() || '',
        stderr: stderr?.trim() || '',
        error: error ? error.message : null
      })
    })
  })
}

export function registerMobileControlHandlers(): void {
  // ============ CHECK ADB CONNECTION ============
  ipcMain.handle('mobile:check-connection', async () => {
    try {
      const result = await runADB('devices')
      const lines = result.stdout.split('\n').filter((l) => l.includes('\tdevice'))
      return {
        connected: lines.length > 0,
        devices: lines.map((l) => l.split('\t')[0]),
        raw: result.stdout
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ GET MOBILE INFO (Battery, etc.) ============
  ipcMain.handle('mobile:get-info', async () => {
    try {
      const [battery, model, android, screen] = await Promise.all([
        runADB('shell dumpsys battery'),
        runADB('shell getprop ro.product.model'),
        runADB('shell getprop ro.build.version.release'),
        runADB('shell wm size')
      ])

      // Parse battery info
      const batteryLevel = battery.stdout.match(/level:\s*(\d+)/)?.[1] || 'unknown'
      const isCharging = battery.stdout.includes('status: 2') || battery.stdout.includes('status: 5')

      return {
        model: model.stdout || 'Unknown',
        androidVersion: android.stdout || 'Unknown',
        batteryLevel: parseInt(batteryLevel),
        isCharging,
        screenSize: screen.stdout.replace('Physical size: ', '').trim()
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ GET MOBILE NOTIFICATIONS ============
  ipcMain.handle('mobile:get-notifications', async () => {
    try {
      const result = await runADB('shell dumpsys notification --noredact')
      // Parse notifications
      const notifications: Array<{ pkg: string; title: string; text: string }> = []
      const blocks = result.stdout.split('NotificationRecord')

      for (const block of blocks.slice(1, 11)) {
        const pkg = block.match(/pkg=([^\s]+)/)?.[1] || ''
        const title = block.match(/android\.title=([^\n]+)/)?.[1] || ''
        const text = block.match(/android\.text=([^\n]+)/)?.[1] || ''
        if (pkg && (title || text)) {
          notifications.push({ pkg, title: title.trim(), text: text.trim() })
        }
      }

      return { notifications }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ PUSH FILE TO MOBILE ============
  ipcMain.handle('mobile:push-file', async (_, localPath: string, remotePath?: string) => {
    try {
      const dest = remotePath || `/sdcard/Download/${path.basename(localPath)}`
      const result = await runADB(`push "${localPath}" "${dest}"`)
      if (result.error) return { error: result.error }
      return { success: true, remotePath: dest, output: result.stdout }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ PULL FILE FROM MOBILE ============
  ipcMain.handle('mobile:pull-file', async (_, remotePath: string, localPath?: string) => {
    try {
      const os = await import('os')
      const dest = localPath || path.join(os.homedir(), 'Downloads', path.basename(remotePath))
      const result = await runADB(`pull "${remotePath}" "${dest}"`)
      if (result.error) return { error: result.error }
      return { success: true, localPath: dest, output: result.stdout }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ OPEN MOBILE APP ============
  ipcMain.handle('mobile:open-app', async (_, packageName: string) => {
    try {
      // Get launch activity
      const launchResult = await runADB(
        `shell cmd package resolve-activity --brief ${packageName}`
      )
      const activity = launchResult.stdout.split('\n').pop()?.trim() || ''

      if (activity) {
        const result = await runADB(`shell am start -n ${activity}`)
        return { success: true, activity, output: result.stdout }
      } else {
        // Try monkey approach
        const result = await runADB(
          `shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`
        )
        return { success: true, output: result.stdout }
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ CLOSE MOBILE APP ============
  ipcMain.handle('mobile:close-app', async (_, packageName: string) => {
    try {
      const result = await runADB(`shell am force-stop ${packageName}`)
      return { success: true, output: result.stdout }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ LIST INSTALLED APPS ============
  ipcMain.handle('mobile:list-apps', async () => {
    try {
      const result = await runADB('shell pm list packages -3') // -3 = third party only
      const packages = result.stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => line.replace('package:', '').trim())
      return { apps: packages }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ TAP MOBILE SCREEN ============
  ipcMain.handle('mobile:tap', async (_, x: number, y: number) => {
    try {
      const result = await runADB(`shell input tap ${x} ${y}`)
      return { success: true, x, y }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ SWIPE MOBILE SCREEN ============
  ipcMain.handle(
    'mobile:swipe',
    async (_, fromX: number, fromY: number, toX: number, toY: number, duration?: number) => {
      try {
        const dur = duration || 300
        const result = await runADB(`shell input swipe ${fromX} ${fromY} ${toX} ${toY} ${dur}`)
        return { success: true }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ TYPE ON MOBILE ============
  ipcMain.handle('mobile:type', async (_, text: string) => {
    try {
      // Escape special characters for ADB
      const escaped = text.replace(/(['" \\&|;])/g, '\\$1')
      const result = await runADB(`shell input text "${escaped}"`)
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ PRESS MOBILE KEY ============
  ipcMain.handle('mobile:press-key', async (_, keycode: number | string) => {
    try {
      // Common keycodes: 3=HOME, 4=BACK, 26=POWER, 187=APP_SWITCH
      const keyMap: Record<string, number> = {
        home: 3,
        back: 4,
        power: 26,
        recent: 187,
        volumeup: 24,
        volumedown: 25,
        enter: 66,
        menu: 82
      }
      const code = typeof keycode === 'string' ? keyMap[keycode.toLowerCase()] || 0 : keycode
      const result = await runADB(`shell input keyevent ${code}`)
      return { success: true, keycode: code }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ TOGGLE HARDWARE (WiFi/Bluetooth/Flashlight) ============
  ipcMain.handle('mobile:toggle-hardware', async (_, hardware: string, enable: boolean) => {
    try {
      let command = ''
      switch (hardware.toLowerCase()) {
        case 'wifi':
          command = `shell svc wifi ${enable ? 'enable' : 'disable'}`
          break
        case 'bluetooth':
          command = enable
            ? 'shell am start -a android.bluetooth.adapter.action.REQUEST_ENABLE'
            : 'shell settings put global bluetooth_on 0'
          break
        case 'flashlight':
          // Flashlight toggle requires shell commands
          command = `shell cmd statusbar expand-settings`
          break
        case 'airplane':
          command = `shell settings put global airplane_mode_on ${enable ? '1' : '0'}`
          break
        case 'location':
          command = `shell settings put secure location_mode ${enable ? '3' : '0'}`
          break
        default:
          return { error: `Unknown hardware: ${hardware}` }
      }

      const result = await runADB(command)
      return { success: true, hardware, enabled: enable }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ TAKE MOBILE SCREENSHOT ============
  ipcMain.handle('mobile:screenshot', async () => {
    try {
      const os = await import('os')
      const localPath = path.join(os.homedir(), '.mmb-ai', 'mobile-screenshot.png')

      await runADB('shell screencap -p /sdcard/screenshot.png')
      await runADB(`pull /sdcard/screenshot.png "${localPath}"`)
      await runADB('shell rm /sdcard/screenshot.png')

      const fs = await import('fs')
      const img = await fs.promises.readFile(localPath)
      return { image: img.toString('base64'), path: localPath }
    } catch (error: any) {
      return { error: error.message }
    }
  })
}
