import { ipcMain } from 'electron'
import Store from 'electron-store'

const store = new Store()

export function registerCommunicationsHandlers(): void {
  // ============ WHATSAPP - Send Message via Puppeteer ============
  ipcMain.handle('whatsapp:send', async (_, phoneNumber: string, message: string) => {
    try {
      const puppeteer = (await import('puppeteer')).default

      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--no-sandbox'],
        userDataDir: './whatsapp-session' // Persist login session
      })

      const page = await browser.newPage()

      // Format phone number (remove non-digits, add country code if needed)
      const cleanNumber = phoneNumber.replace(/\D/g, '')
      const url = `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(message)}`

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

      // Wait for the send button to appear
      await page.waitForSelector('[data-testid="send"]', { timeout: 30000 })
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Click send button
      await page.click('[data-testid="send"]')
      await new Promise((resolve) => setTimeout(resolve, 2000))

      await browser.close()

      return { success: true, message: `Message sent to ${phoneNumber}` }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ WHATSAPP - Schedule Message ============
  ipcMain.handle(
    'whatsapp:schedule',
    async (_, phoneNumber: string, message: string, sendAt: number) => {
      try {
        // Store scheduled message
        const scheduled = (store.get('scheduled_messages') as any[]) || []
        const newMsg = {
          id: Date.now().toString(),
          phoneNumber,
          message,
          sendAt,
          status: 'pending',
          createdAt: Date.now()
        }
        scheduled.push(newMsg)
        store.set('scheduled_messages', scheduled)

        return {
          success: true,
          scheduled: newMsg,
          message: `Message scheduled for ${new Date(sendAt).toLocaleString()}`
        }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ WHATSAPP - Get Scheduled Messages ============
  ipcMain.handle('whatsapp:get-scheduled', async () => {
    const scheduled = (store.get('scheduled_messages') as any[]) || []
    return { messages: scheduled }
  })

  // ============ WHATSAPP - Cancel Scheduled ============
  ipcMain.handle('whatsapp:cancel-scheduled', async (_, messageId: string) => {
    const scheduled = (store.get('scheduled_messages') as any[]) || []
    const filtered = scheduled.filter((m) => m.id !== messageId)
    store.set('scheduled_messages', filtered)
    return { success: true }
  })

  // ============ EMAIL - Read Emails (Gmail API) ============
  ipcMain.handle('email:read', async (_, apiKey?: string, maxResults?: number) => {
    try {
      // Use Gmail API with OAuth credentials stored
      const credentials = store.get('gmail_credentials') as any

      if (!credentials) {
        return {
          error: 'Gmail not configured. Please authenticate via Settings > Email Setup'
        }
      }

      const { google } = await import('googleapis')
      const oauth2Client = new google.auth.OAuth2(
        credentials.clientId,
        credentials.clientSecret,
        'http://localhost:3000/oauth/callback'
      )
      oauth2Client.setCredentials(credentials.tokens)

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      const res = await gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults || 10,
        labelIds: ['INBOX']
      })

      const messages = res.data.messages || []
      const emails: any[] = []

      for (const msg of messages.slice(0, 10)) {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        })

        const headers = detail.data.payload?.headers || []
        emails.push({
          id: msg.id,
          from: headers.find((h) => h.name === 'From')?.value || '',
          subject: headers.find((h) => h.name === 'Subject')?.value || '',
          date: headers.find((h) => h.name === 'Date')?.value || '',
          snippet: detail.data.snippet || ''
        })
      }

      return { emails }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ EMAIL - Draft Email ============
  ipcMain.handle(
    'email:draft',
    async (_, to: string, subject: string, body: string) => {
      try {
        const credentials = store.get('gmail_credentials') as any
        if (!credentials) {
          return { error: 'Gmail not configured' }
        }

        const { google } = await import('googleapis')
        const oauth2Client = new google.auth.OAuth2(
          credentials.clientId,
          credentials.clientSecret,
          'http://localhost:3000/oauth/callback'
        )
        oauth2Client.setCredentials(credentials.tokens)

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

        const rawMessage = Buffer.from(
          `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
        ).toString('base64url')

        const res = await gmail.users.drafts.create({
          userId: 'me',
          requestBody: {
            message: { raw: rawMessage }
          }
        })

        return { success: true, draftId: res.data.id }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ EMAIL - Send Email ============
  ipcMain.handle(
    'email:send',
    async (_, to: string, subject: string, body: string) => {
      try {
        const credentials = store.get('gmail_credentials') as any
        if (!credentials) {
          return { error: 'Gmail not configured' }
        }

        const { google } = await import('googleapis')
        const oauth2Client = new google.auth.OAuth2(
          credentials.clientId,
          credentials.clientSecret,
          'http://localhost:3000/oauth/callback'
        )
        oauth2Client.setCredentials(credentials.tokens)

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

        const rawMessage = Buffer.from(
          `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
        ).toString('base64url')

        const res = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: rawMessage }
        })

        return { success: true, messageId: res.data.id }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ EMAIL - Setup Gmail OAuth ============
  ipcMain.handle(
    'email:setup',
    async (_, clientId: string, clientSecret: string) => {
      try {
        store.set('gmail_credentials', { clientId, clientSecret, tokens: null })
        return {
          success: true,
          message: 'Gmail credentials saved. You need to complete OAuth flow.'
        }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )
}
