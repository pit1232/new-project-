import { ipcMain } from 'electron'
import Store from 'electron-store'

const store = new Store()

export function registerWebResearchHandlers(): void {
  // ============ DEEP RESEARCH (Multi-step Web Crawl + Summarize) ============
  ipcMain.handle(
    'research:deep',
    async (_, query: string, apiKey?: string, groqKey?: string) => {
      try {
        const axios = (await import('axios')).default
        const cheerio = await import('cheerio')

        // Step 1: Search for relevant URLs
        let urls: string[] = []

        if (apiKey) {
          // Use Tavily for better results
          const { tavily } = await import('@tavily/core')
          const client = tavily({ apiKey })
          const searchResult = await client.search(query, { maxResults: 5 })
          urls = searchResult.results.map((r) => r.url)
        } else {
          // Fallback to basic Google scraping
          const searchResponse = await axios.get(
            `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5`,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            }
          )
          const $ = cheerio.load(searchResponse.data)
          $('a[href^="/url?q="]').each((_, el) => {
            const href = $(el).attr('href')
            if (href) {
              const url = href.split('/url?q=')[1]?.split('&')[0]
              if (url && !url.includes('google.com')) urls.push(decodeURIComponent(url))
            }
          })
        }

        // Step 2: Scrape content from URLs
        const contents: Array<{ url: string; title: string; text: string }> = []

        for (const url of urls.slice(0, 5)) {
          try {
            const response = await axios.get(url, {
              timeout: 10000,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            })
            const $ = cheerio.load(response.data)
            $('script, style, nav, footer, header, aside').remove()
            const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000)
            const title = $('title').text()
            contents.push({ url, title, text })
          } catch {
            // Skip failed URLs
          }
        }

        // Step 3: Summarize with AI (Groq for speed)
        let summary = ''
        const combinedContent = contents
          .map((c) => `Source: ${c.title}\nURL: ${c.url}\nContent: ${c.text}`)
          .join('\n\n---\n\n')

        if (groqKey) {
          const Groq = (await import('groq-sdk')).default
          const groq = new Groq({ apiKey: groqKey })

          const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content:
                  'You are a research assistant. Synthesize the following web research into a comprehensive, well-structured summary. Include key findings, cite sources, and provide actionable insights.'
              },
              {
                role: 'user',
                content: `Research query: "${query}"\n\nWeb research results:\n\n${combinedContent}`
              }
            ]
          })
          summary = response.choices[0]?.message?.content || ''
        }

        return {
          query,
          sources: contents.map((c) => ({ url: c.url, title: c.title })),
          rawContent: contents,
          summary,
          sourcesCount: contents.length
        }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ NOTION - Read Reports ============
  ipcMain.handle('notion:read', async (_, databaseId: string, notionToken?: string) => {
    try {
      const token = notionToken || (store.get('notion_token') as string)
      if (!token) {
        return { error: 'Notion integration token not configured' }
      }

      const { Client } = await import('@notionhq/client')
      const notion = new Client({ auth: token })

      const response = await notion.databases.query({
        database_id: databaseId,
        page_size: 20
      })

      const pages = response.results.map((page: any) => {
        const properties: Record<string, any> = {}
        for (const [key, value] of Object.entries(page.properties) as any) {
          switch (value.type) {
            case 'title':
              properties[key] = value.title?.map((t: any) => t.plain_text).join('') || ''
              break
            case 'rich_text':
              properties[key] = value.rich_text?.map((t: any) => t.plain_text).join('') || ''
              break
            case 'number':
              properties[key] = value.number
              break
            case 'select':
              properties[key] = value.select?.name || ''
              break
            case 'multi_select':
              properties[key] = value.multi_select?.map((s: any) => s.name) || []
              break
            case 'date':
              properties[key] = value.date?.start || ''
              break
            case 'checkbox':
              properties[key] = value.checkbox
              break
            default:
              properties[key] = `[${value.type}]`
          }
        }
        return { id: page.id, url: page.url, properties }
      })

      return { pages, hasMore: response.has_more }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ NOTION - Setup Token ============
  ipcMain.handle('notion:setup', async (_, token: string) => {
    store.set('notion_token', token)
    return { success: true }
  })

  // ============ ADVANCED WEB SCRAPE (with Puppeteer Stealth) ============
  ipcMain.handle('research:scrape-advanced', async (_, url: string) => {
    try {
      const puppeteer = (await import('puppeteer-extra')).default
      const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default
      puppeteer.use(StealthPlugin())

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })

      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

      // Wait for content to load
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const content = await page.evaluate(() => {
        // Remove scripts and styles
        document.querySelectorAll('script, style, nav, footer, header').forEach((el) => el.remove())
        return {
          title: document.title,
          text: document.body?.innerText?.substring(0, 10000) || '',
          html: document.body?.innerHTML?.substring(0, 20000) || '',
          url: window.location.href
        }
      })

      await browser.close()
      return content
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ HACK LIVE WEBSITE (Visual DOM Manipulation) ============
  ipcMain.handle(
    'research:hack-website',
    async (_, url: string, cssInjection: string, jsInjection?: string) => {
      try {
        const puppeteer = (await import('puppeteer')).default
        const browser = await puppeteer.launch({
          headless: false,
          defaultViewport: null,
          args: ['--no-sandbox']
        })

        const page = await browser.newPage()
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

        // Inject CSS
        if (cssInjection) {
          await page.addStyleTag({ content: cssInjection })
        }

        // Inject JS
        if (jsInjection) {
          await page.evaluate((js) => {
            eval(js)
          }, jsInjection)
        }

        return { success: true, message: `Injected styles/scripts into ${url}` }
        // Note: browser stays open for user to see changes
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )

  // ============ BUILD ANIMATED WEB (AI generates Tailwind + GSAP page) ============
  ipcMain.handle(
    'research:build-web',
    async (_, instruction: string, geminiKey?: string) => {
      try {
        if (!geminiKey) {
          return { error: 'Gemini API key required' }
        }

        const { GoogleGenAI } = await import('@google/genai')
        const ai = new GoogleGenAI({ apiKey: geminiKey })

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Create a complete, single-file HTML page with the following requirements:
- Use Tailwind CSS (via CDN)
- Use GSAP for animations (via CDN)
- Dark theme with glassmorphism
- Responsive design
- Include all CSS inline or via CDN
- The page should be: ${instruction}

Return ONLY the complete HTML code, nothing else. No markdown, no explanations.`
                }
              ]
            }
          ]
        })

        const html = response.text || ''
        return { html, message: 'Web page generated' }
      } catch (error: any) {
        return { error: error.message }
      }
    }
  )
}
