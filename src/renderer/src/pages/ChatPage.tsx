import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { useChatStore } from '../stores/chatStore'
import { useSettingsStore } from '../stores/settingsStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function ChatPage(): React.ReactElement {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, isLoading, activeProvider, addMessage, setLoading, setProvider, clearMessages } =
    useChatStore()
  const { geminiKey, groqKey } = useSettingsStore()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    addMessage({ role: 'user', content: userMessage })
    setLoading(true)

    try {
      const apiKey = activeProvider === 'gemini' ? geminiKey : groqKey
      if (!apiKey) {
        addMessage({
          role: 'assistant',
          content: `⚠️ ${activeProvider === 'gemini' ? 'Gemini' : 'Groq'} API key not set. Go to Settings to add your API key.`
        })
        setLoading(false)
        return
      }

      const chatMessages = messages
        .filter((m) => m.role !== 'system')
        .concat({ id: '', role: 'user', content: userMessage, timestamp: 0 })
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await window.api.ai.chat(activeProvider, apiKey, chatMessages)

      if (response.error) {
        addMessage({ role: 'assistant', content: `❌ Error: ${response.error}` })
      } else {
        addMessage({
          role: 'assistant',
          content: response.content || 'No response received.',
          provider: response.provider
        })
      }
    } catch (error: any) {
      addMessage({ role: 'assistant', content: `❌ Error: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Sparkles className="text-emerald-400" size={20} />
          <h1 className="text-lg font-semibold text-white/90">AI Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Provider Toggle */}
          <div className="glass rounded-lg flex overflow-hidden">
            <button
              onClick={() => setProvider('gemini')}
              className={`px-3 py-1.5 text-xs font-mono transition-all ${
                activeProvider === 'gemini'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Gemini
            </button>
            <button
              onClick={() => setProvider('groq')}
              className={`px-3 py-1.5 text-xs font-mono transition-all ${
                activeProvider === 'groq'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Groq
            </button>
          </div>
          <button
            onClick={clearMessages}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-red-400 transition-colors"
            title="Clear chat"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-4 glow-green"
            >
              <Bot size={36} className="text-emerald-400" />
            </motion.div>
            <h2 className="text-xl font-semibold text-white/80 mb-2">MMB AI Ready</h2>
            <p className="text-sm text-white/40 max-w-sm">
              Your personal AI assistant. Ask me anything — code, research, system tasks, or just
              chat.
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={16} className="text-emerald-400" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-emerald-500/15 border border-emerald-500/20 text-white/90'
                    : 'glass text-white/85'
                }`}
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                {msg.provider && (
                  <span className="text-[10px] font-mono text-white/30 mt-2 block">
                    via {msg.provider}
                  </span>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-1">
                  <User size={16} className="text-white/60" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Loader2 size={16} className="text-emerald-400 animate-spin" />
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div
                  className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                  style={{ animationDelay: '0.2s' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mt-4 glass rounded-2xl p-2 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask MMB AI anything..."
          className="flex-1 bg-transparent px-4 py-3 text-sm text-white/90 placeholder-white/30 outline-none"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </motion.button>
      </div>
    </div>
  )
}

export default ChatPage
