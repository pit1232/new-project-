import { create } from 'zustand'

interface SettingsState {
  geminiKey: string
  groqKey: string
  tavilyKey: string
  hfToken: string
  userName: string
  theme: 'dark' | 'light'
  setGeminiKey: (key: string) => void
  setGroqKey: (key: string) => void
  setTavilyKey: (key: string) => void
  setHfToken: (key: string) => void
  setUserName: (name: string) => void
  setTheme: (theme: 'dark' | 'light') => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  geminiKey: '',
  groqKey: '',
  tavilyKey: '',
  hfToken: '',
  userName: 'User',
  theme: 'dark',

  setGeminiKey: (key) => set({ geminiKey: key }),
  setGroqKey: (key) => set({ groqKey: key }),
  setTavilyKey: (key) => set({ tavilyKey: key }),
  setHfToken: (key) => set({ hfToken: key }),
  setUserName: (name) => set({ userName: name }),
  setTheme: (theme) => set({ theme }),

  loadSettings: async () => {
    try {
      const settings = await window.api.store.getAll()
      if (settings) {
        set({
          geminiKey: settings.geminiKey || '',
          groqKey: settings.groqKey || '',
          tavilyKey: settings.tavilyKey || '',
          hfToken: settings.hfToken || '',
          userName: settings.userName || 'User',
          theme: settings.theme || 'dark'
        })
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  },

  saveSettings: async () => {
    const state = get()
    try {
      await window.api.store.set('geminiKey', state.geminiKey)
      await window.api.store.set('groqKey', state.groqKey)
      await window.api.store.set('tavilyKey', state.tavilyKey)
      await window.api.store.set('hfToken', state.hfToken)
      await window.api.store.set('userName', state.userName)
      await window.api.store.set('theme', state.theme)
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }
}))
