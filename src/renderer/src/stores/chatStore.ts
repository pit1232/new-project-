import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  provider?: string
}

interface ChatState {
  messages: Message[]
  isLoading: boolean
  activeProvider: 'gemini' | 'groq'
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  setLoading: (loading: boolean) => void
  setProvider: (provider: 'gemini' | 'groq') => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  activeProvider: 'gemini',

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now()
        }
      ]
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setProvider: (provider) => set({ activeProvider: provider }),
  clearMessages: () => set({ messages: [] })
}))
