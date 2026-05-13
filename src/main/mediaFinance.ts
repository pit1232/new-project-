import { ipcMain } from 'electron'

export function registerMediaFinanceHandlers(): void {
  // ============ SPOTIFY - Play Music ============
  ipcMain.handle('media:spotify-play', async (_, query: string) => {
    try {
      const { shell } = await import('electron')
      // Open Spotify search URI
      const spotifyUri = `spotify:search:${encodeURIComponent(query)}`
      await shell.openExternal(spotifyUri)
      return { success: true, query, message: `Opening Spotify: ${query}` }
    } catch (error: any) {
      // Fallback to web
      try {
        const { shell } = await import('electron')
        await shell.openExternal(
          `https://open.spotify.com/search/${encodeURIComponent(query)}`
        )
        return { success: true, query, message: `Opened Spotify Web: ${query}` }
      } catch (e: any) {
        return { error: e.message }
      }
    }
  })

  // ============ SPOTIFY - Control Playback ============
  ipcMain.handle('media:spotify-control', async (_, action: string) => {
    try {
      const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
      // Use media keys for playback control
      switch (action) {
        case 'play':
        case 'pause':
          await keyboard.pressKey(Key.AudioPlay)
          await keyboard.releaseKey(Key.AudioPlay)
          break
        case 'next':
          await keyboard.pressKey(Key.AudioNext)
          await keyboard.releaseKey(Key.AudioNext)
          break
        case 'previous':
        case 'prev':
          await keyboard.pressKey(Key.AudioPrev)
          await keyboard.releaseKey(Key.AudioPrev)
          break
        case 'mute':
          await keyboard.pressKey(Key.AudioMute)
          await keyboard.releaseKey(Key.AudioMute)
          break
        default:
          return { error: `Unknown action: ${action}` }
      }
      return { success: true, action }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ STOCK PRICE (Real-time Ticker) ============
  ipcMain.handle('finance:stock-price', async (_, symbol: string) => {
    try {
      const axios = (await import('axios')).default

      // Use Yahoo Finance API (free, no key needed)
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=1d&range=5d`
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      const result = response.data.chart.result[0]
      const meta = result.meta
      const quotes = result.indicators.quote[0]
      const timestamps = result.timestamp

      return {
        symbol: meta.symbol,
        currency: meta.currency,
        exchange: meta.exchangeName,
        currentPrice: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent:
          ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        high: Math.max(...(quotes.high || []).filter(Boolean)),
        low: Math.min(...(quotes.low || []).filter(Boolean)),
        volume: quotes.volume?.[quotes.volume.length - 1] || 0,
        history: timestamps?.map((t: number, i: number) => ({
          date: new Date(t * 1000).toISOString().split('T')[0],
          open: quotes.open?.[i],
          high: quotes.high?.[i],
          low: quotes.low?.[i],
          close: quotes.close?.[i],
          volume: quotes.volume?.[i]
        }))
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ COMPARE STOCKS ============
  ipcMain.handle('finance:compare-stocks', async (_, symbol1: string, symbol2: string) => {
    try {
      const axios = (await import('axios')).default

      const fetchStock = async (symbol: string) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=1d&range=1mo`
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        const result = response.data.chart.result[0]
        const meta = result.meta
        return {
          symbol: meta.symbol,
          price: meta.regularMarketPrice,
          previousClose: meta.previousClose,
          change: meta.regularMarketPrice - meta.previousClose,
          changePercent:
            ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
          fiftyDayAvg: meta.fiftyDayAverage,
          twoHundredDayAvg: meta.twoHundredDayAverage
        }
      }

      const [stock1, stock2] = await Promise.all([fetchStock(symbol1), fetchStock(symbol2)])

      return { stock1, stock2 }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ GET WEATHER ============
  ipcMain.handle('media:weather', async (_, location: string) => {
    try {
      const axios = (await import('axios')).default
      // Use wttr.in (free, no API key)
      const response = await axios.get(`https://wttr.in/${encodeURIComponent(location)}?format=j1`)
      const data = response.data
      const current = data.current_condition[0]

      return {
        location: data.nearest_area[0]?.areaName[0]?.value || location,
        temperature: current.temp_C,
        feelsLike: current.FeelsLikeC,
        humidity: current.humidity,
        windSpeed: current.windspeedKmph,
        windDir: current.winddir16Point,
        description: current.weatherDesc[0]?.value || '',
        visibility: current.visibility,
        uvIndex: current.uvIndex,
        forecast: data.weather?.slice(0, 3).map((day: any) => ({
          date: day.date,
          maxTemp: day.maxtempC,
          minTemp: day.mintempC,
          description: day.hourly[4]?.weatherDesc[0]?.value || ''
        }))
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ GENERATE IMAGE (Hugging Face) ============
  ipcMain.handle('media:generate-image', async (_, prompt: string, hfToken?: string) => {
    try {
      if (!hfToken) {
        return { error: 'Hugging Face token required for image generation' }
      }

      const { HfInference } = await import('@huggingface/inference')
      const hf = new HfInference(hfToken)

      const response = await hf.textToImage({
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        inputs: prompt,
        parameters: {
          negative_prompt: 'blurry, bad quality, distorted',
          num_inference_steps: 30
        }
      })

      // Convert blob to base64
      const buffer = Buffer.from(await response.arrayBuffer())
      const base64 = buffer.toString('base64')

      // Save to disk
      const os = await import('os')
      const path = await import('path')
      const fs = await import('fs')
      const savePath = path.join(
        os.homedir(),
        '.mmb-ai',
        `generated_${Date.now()}.png`
      )
      await fs.promises.mkdir(path.dirname(savePath), { recursive: true })
      await fs.promises.writeFile(savePath, buffer)

      return { image: base64, path: savePath, prompt }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ OPEN MAP ============
  ipcMain.handle('media:open-map', async (_, location?: string) => {
    try {
      const { shell } = await import('electron')
      const url = location
        ? `https://www.google.com/maps/search/${encodeURIComponent(location)}`
        : 'https://www.google.com/maps'
      await shell.openExternal(url)
      return { success: true, location: location || 'default' }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  // ============ GET NAVIGATION ============
  ipcMain.handle('media:navigate', async (_, from: string, to: string) => {
    try {
      const { shell } = await import('electron')
      const url = `https://www.google.com/maps/dir/${encodeURIComponent(from)}/${encodeURIComponent(to)}`
      await shell.openExternal(url)
      return { success: true, from, to, url }
    } catch (error: any) {
      return { error: error.message }
    }
  })
}
