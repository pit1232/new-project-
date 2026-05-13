import { create } from 'zustand'

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

interface MemoryState {
  notes: Note[]
  searchQuery: string
  addNote: (title: string, content: string, tags?: string[]) => void
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => void
  deleteNote: (id: string) => void
  setSearchQuery: (query: string) => void
  loadNotes: () => Promise<void>
  saveNotes: () => Promise<void>
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  notes: [],
  searchQuery: '',

  addNote: (title, content, tags = []) =>
    set((state) => ({
      notes: [
        ...state.notes,
        {
          id: crypto.randomUUID(),
          title,
          content,
          tags,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    })),

  updateNote: (id, updates) =>
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
      )
    })),

  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id)
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  loadNotes: async () => {
    try {
      const notes = await window.api.store.get('notes')
      if (notes) set({ notes })
    } catch (e) {
      console.error('Failed to load notes:', e)
    }
  },

  saveNotes: async () => {
    try {
      await window.api.store.set('notes', get().notes)
    } catch (e) {
      console.error('Failed to save notes:', e)
    }
  }
}))
