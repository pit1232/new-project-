import { ipcMain, globalShortcut, clipboard } from 'electron'

export function registerDesktopAutomationHandlers(): void {
  // ============ SCROLL SCREEN ============
  ipcMain.handle('automation:scroll', async (_, direction: 'up' | 'down', amount?: number) => {
    try {
      const { mouse } = await import('@nut-tree-fork/nut-js')
      const scrollAmount = amount || 500
      if (direction === 'down') {
        await mouse.scrollDown(scrollAmount)
      } else {
        await mouse.scrollUp(scrollAmount)
      }
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ PRESS KEYBOARD SHORTCUT ============
  ipcMain.handle('automation:shortcut', async (_, keys: string[]) => {
    try {
      const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
      // Map string key names to Key enum values
      const keyMap: Record<string, any> = {
        ctrl: Key.LeftControl,
        control: Key.LeftControl,
        alt: Key.LeftAlt,
        shift: Key.LeftShift,
        enter: Key.Enter,
        return: Key.Enter,
        tab: Key.Tab,
        escape: Key.Escape,
        esc: Key.Escape,
        space: Key.Space,
        backspace: Key.Backspace,
        delete: Key.Delete,
        home: Key.Home,
        end: Key.End,
        pageup: Key.PageUp,
        pagedown: Key.PageDown,
        up: Key.Up,
        down: Key.Down,
        left: Key.Left,
        right: Key.Right,
        f1: Key.F1,
        f2: Key.F2,
        f3: Key.F3,
        f4: Key.F4,
        f5: Key.F5,
        f6: Key.F6,
        f7: Key.F7,
        f8: Key.F8,
        f9: Key.F9,
        f10: Key.F10,
        f11: Key.F11,
        f12: Key.F12,
        win: Key.LeftWin,
        windows: Key.LeftWin,
        meta: Key.LeftWin,
        a: Key.A, b: Key.B, c: Key.C, d: Key.D, e: Key.E,
        f: Key.F, g: Key.G, h: Key.H, i: Key.I, j: Key.J,
        k: Key.K, l: Key.L, m: Key.M, n: Key.N, o: Key.O,
        p: Key.P, q: Key.Q, r: Key.R, s: Key.S, t: Key.T,
        u: Key.U, v: Key.V, w: Key.W, x: Key.X, y: Key.Y,
        z: Key.Z
      }

      const mappedKeys = keys.map((k) => {
        const mapped = keyMap[k.toLowerCase()]
        if (!mapped) throw new Error(`Unknown key: ${k}`)
        return mapped
      })

      await keyboard.pressKey(...mappedKeys)
      await keyboard.releaseKey(...mappedKeys)
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ PHANTOM TYPER (Clipboard Injection) ============
  ipcMain.handle('automation:phantom-type', async (_, text: string) => {
    try {
      const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
      // Save current clipboard
      const previousClipboard = clipboard.readText()
      // Set text to clipboard
      clipboard.writeText(text)
      // Paste with Ctrl+V
      await keyboard.pressKey(Key.LeftControl, Key.V)
      await keyboard.releaseKey(Key.LeftControl, Key.V)
      // Small delay then restore clipboard
      await new Promise((resolve) => setTimeout(resolve, 200))
      clipboard.writeText(previousClipboard)
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ MOUSE DOUBLE CLICK ============
  ipcMain.handle('automation:double-click', async (_, x: number, y: number) => {
    try {
      const { mouse, Point } = await import('@nut-tree-fork/nut-js')
      await mouse.setPosition(new Point(x, y))
      await mouse.doubleClick(0) // 0 = left button
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ MOUSE RIGHT CLICK ============
  ipcMain.handle('automation:right-click', async (_, x: number, y: number) => {
    try {
      const { mouse, Point } = await import('@nut-tree-fork/nut-js')
      await mouse.setPosition(new Point(x, y))
      await mouse.rightClick()
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ MOUSE DRAG ============
  ipcMain.handle(
    'automation:drag',
    async (_, fromX: number, fromY: number, toX: number, toY: number) => {
      try {
        const { mouse, Point, straightTo } = await import('@nut-tree-fork/nut-js')
        await mouse.setPosition(new Point(fromX, fromY))
        await mouse.pressButton(0) // left button down
        await mouse.move(straightTo(new Point(toX, toY)))
        await mouse.releaseButton(0) // left button up
        return { success: true }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ GET MOUSE POSITION ============
  ipcMain.handle('automation:get-mouse-position', async () => {
    try {
      const { mouse } = await import('@nut-tree-fork/nut-js')
      const pos = await mouse.getPosition()
      return { x: pos.x, y: pos.y }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ SET VOLUME ============
  ipcMain.handle('automation:set-volume', async (_, level: number) => {
    try {
      const loudness = await import('loudness')
      await loudness.default.setVolume(Math.max(0, Math.min(100, level)))
      return { success: true, volume: level }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ GET VOLUME ============
  ipcMain.handle('automation:get-volume', async () => {
    try {
      const loudness = await import('loudness')
      const volume = await loudness.default.getVolume()
      const muted = await loudness.default.getMuted()
      return { volume, muted }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ TOGGLE MUTE ============
  ipcMain.handle('automation:toggle-mute', async () => {
    try {
      const loudness = await import('loudness')
      const currentMuted = await loudness.default.getMuted()
      await loudness.default.setMuted(!currentMuted)
      return { success: true, muted: !currentMuted }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ GET SCREEN SIZE ============
  ipcMain.handle('automation:get-screen-size', async () => {
    try {
      const { screen } = await import('@nut-tree-fork/nut-js')
      const width = await screen.width()
      const height = await screen.height()
      return { width, height }
    } catch (error: any) {
      return { error: error.message }
    }
  })
}
