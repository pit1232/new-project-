import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Plus, Search, Trash2, Tag, Edit3, Save } from 'lucide-react'
import { useMemoryStore, Note } from '../stores/memoryStore'

function MemoryPage(): React.ReactElement {
  const { notes, searchQuery, addNote, updateNote, deleteNote, setSearchQuery, loadNotes, saveNotes } =
    useMemoryStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newTags, setNewTags] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    loadNotes()
  }, [])

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleAdd = () => {
    if (!newTitle.trim()) return
    addNote(
      newTitle,
      newContent,
      newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    )
    setNewTitle('')
    setNewContent('')
    setNewTags('')
    setShowAdd(false)
    saveNotes()
  }

  const handleDelete = (id: string) => {
    deleteNote(id)
    saveNotes()
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="text-emerald-400" size={20} />
          <h1 className="text-lg font-semibold text-white/90">Memory & Notes</h1>
          <span className="text-xs text-white/30 font-mono">({notes.length} notes)</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdd(!showAdd)}
          className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
        >
          <Plus size={18} />
        </motion.button>
      </div>

      {/* Search */}
      <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
        <Search size={16} className="text-white/30" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/30 outline-none"
        />
      </div>

      {/* Add Note Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl p-4 space-y-3"
          >
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Note content..."
              rows={4}
              className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 resize-none"
            />
            <input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma separated)..."
              className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd}
              className="w-full py-2.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={14} /> Save Note
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {filteredNotes.length === 0 && (
          <div className="h-40 flex items-center justify-center">
            <p className="text-white/30 text-sm">
              {notes.length === 0 ? 'No notes yet. Add your first note!' : 'No notes match your search.'}
            </p>
          </div>
        )}
        {filteredNotes.map((note) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 group"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-medium text-white/80">{note.title}</h3>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDelete(note.id)}
                  className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <p className="text-xs text-white/50 mb-2 line-clamp-3">{note.content}</p>
            {note.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {note.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] text-emerald-400/70"
                  >
                    <Tag size={8} /> {tag}
                  </span>
                ))}
              </div>
            )}
            <span className="text-[10px] text-white/20 font-mono mt-2 block">
              {new Date(note.updatedAt).toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default MemoryPage
