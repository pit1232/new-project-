import { ipcMain, clipboard } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export function registerOCRVisionHandlers(): void {
  // ============ SCREEN PEELER (OCR - Screenshot to Text) ============
  ipcMain.handle('ocr:screen-to-text', async (_, imagePath?: string) => {
    try {
      let imageBuffer: Buffer

      if (imagePath) {
        // OCR from file
        imageBuffer = await fs.promises.readFile(imagePath)
      } else {
        // Take screenshot first then OCR
        const screenshot = (await import('screenshot-desktop')).default
        imageBuffer = await screenshot({ format: 'png' })
      }

      const Tesseract = await import('tesseract.js')
      const worker = await Tesseract.createWorker('eng')
      const result = await worker.recognize(imageBuffer)
      await worker.terminate()

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words?.length || 0
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ OCR FROM REGION (Specific Screen Area) ============
  ipcMain.handle(
    'ocr:region-to-text',
    async (_, region: { x: number; y: number; width: number; height: number }) => {
      try {
        const screenshot = (await import('screenshot-desktop')).default
        const img = await screenshot({ format: 'png' })

        // For region crop, we'd need sharp or similar
        // For now, OCR the full screen
        const Tesseract = await import('tesseract.js')
        const worker = await Tesseract.createWorker('eng')
        const result = await worker.recognize(img)
        await worker.terminate()

        return {
          text: result.data.text,
          confidence: result.data.confidence,
          region
        }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ ANALYZE PHOTO (Multimodal Vision with Gemini) ============
  ipcMain.handle(
    'vision:analyze-photo',
    async (_, imagePath: string, prompt?: string, apiKey?: string) => {
      try {
        if (!apiKey) {
          return { error: 'Gemini API key required for image analysis' }
        }

        const imageBuffer = await fs.promises.readFile(imagePath)
        const base64Image = imageBuffer.toString('base64')
        const mimeType = imagePath.endsWith('.png')
          ? 'image/png'
          : imagePath.endsWith('.gif')
            ? 'image/gif'
            : 'image/jpeg'

        const { GoogleGenAI } = await import('@google/genai')
        const ai = new GoogleGenAI({ apiKey })

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Image
                  }
                },
                {
                  text: prompt || 'Describe this image in detail. What do you see?'
                }
              ]
            }
          ]
        })

        return {
          analysis: response.text || '',
          imagePath
        }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ ANALYZE SCREENSHOT (Live Screen Analysis) ============
  ipcMain.handle('vision:analyze-screen', async (_, prompt?: string, apiKey?: string) => {
    try {
      if (!apiKey) {
        return { error: 'Gemini API key required for screen analysis' }
      }

      // Take screenshot
      const screenshot = (await import('screenshot-desktop')).default
      const img = await screenshot({ format: 'png' })
      const base64Image = img.toString('base64')

      const { GoogleGenAI } = await import('@google/genai')
      const ai = new GoogleGenAI({ apiKey })

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64Image
                }
              },
              {
                text:
                  prompt ||
                  'What is currently displayed on this screen? Describe the active applications, content, and any important information visible.'
              }
            ]
          }
        ]
      })

      return { analysis: response.text || '' }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ GHOST CODER (Inline Code Generation via Clipboard) ============
  ipcMain.handle('vision:ghost-code', async (_, instruction: string, apiKey?: string) => {
    try {
      if (!apiKey) {
        return { error: 'Gemini API key required for Ghost Coder' }
      }

      const { GoogleGenAI } = await import('@google/genai')
      const ai = new GoogleGenAI({ apiKey })

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are a code generator. Generate ONLY the code (no explanations, no markdown, no backticks) for the following instruction:\n\n${instruction}`
              }
            ]
          }
        ]
      })

      const code = response.text || ''

      // Put code in clipboard
      clipboard.writeText(code)

      // Auto-paste with Ctrl+V
      const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
      await new Promise((resolve) => setTimeout(resolve, 200))
      await keyboard.pressKey(Key.LeftControl, Key.V)
      await keyboard.releaseKey(Key.LeftControl, Key.V)

      return { success: true, code, message: 'Code generated and pasted' }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ READ GALLERY (Scan Local Images) ============
  ipcMain.handle('vision:read-gallery', async (_, directoryPath: string) => {
    try {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
      const images: Array<{ path: string; name: string; size: number; modified: Date }> = []

      async function scanDir(dir: string) {
        try {
          const entries = await fs.promises.readdir(dir, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
              await scanDir(fullPath)
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase()
              if (imageExtensions.includes(ext)) {
                const stats = await fs.promises.stat(fullPath)
                images.push({
                  path: fullPath,
                  name: entry.name,
                  size: stats.size,
                  modified: stats.mtime
                })
              }
            }
          }
        } catch { /* skip */ }
      }

      await scanDir(directoryPath)

      // Sort by modified date (newest first)
      images.sort((a, b) => b.modified.getTime() - a.modified.getTime())

      return { images: images.slice(0, 100), total: images.length }
    } catch (error: any) {
      return { error: error.message }
    }
  })
}
