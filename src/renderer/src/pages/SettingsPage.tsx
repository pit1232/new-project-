import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Key, User, Save, Check, Eye, EyeOff } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'

function SettingsPage(): React.ReactElement {
  const {
    geminiKey,
    groqKey,
    tavilyKey,
    hfToken,
    userName,
    setGeminiKey,
    setGroqKey,
    setTavilyKey,
    setHfToken,
    setUserName,
    loadSettings,
    saveSettings
  } = useSettingsStore()

  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    await saveSettings()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const maskKey = (key: string) => {
    if (!key) return ''
    if (showKeys) return key
    return key.substring(0, 4) + '•'.repeat(Math.max(0, key.length - 8)) + key.slice(-4)
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="text-emerald-400" size={20} />
          <h1 className="text-lg font-semibold text-white/90">Settings</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-colors flex items-center gap-2"
        >
          {saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save All'}
        </motion.button>
      </div>

      {/* Profile */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-emerald-400" />
          <h3 className="text-sm font-medium text-white/80">Profile</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 block">
              Your Name
            </label>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-emerald-500/30"
            />
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-cyan-400" />
            <h3 className="text-sm font-medium text-white/80">API Keys</h3>
          </div>
          <button
            onClick={() => setShowKeys(!showKeys)}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            {showKeys ? <EyeOff size={12} /> : <Eye size={12} />}
            {showKeys ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 block">
              Google Gemini API Key <span className="text-red-400">*required</span>
            </label>
            <input
              type={showKeys ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-emerald-500/30 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 block">
              Groq API Key <span className="text-red-400">*required</span>
            </label>
            <input
              type={showKeys ? 'text' : 'password'}
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-emerald-500/30 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 block">
              Tavily API Key <span className="text-white/20">(optional - for web research)</span>
            </label>
            <input
              type={showKeys ? 'text' : 'password'}
              value={tavilyKey}
              onChange={(e) => setTavilyKey(e.target.value)}
              placeholder="tvly-..."
              className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-emerald-500/30 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 block">
              Hugging Face Token <span className="text-white/20">(optional)</span>
            </label>
            <input
              type={showKeys ? 'text' : 'password'}
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              placeholder="hf_..."
              className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-emerald-500/30 font-mono"
            />
          </div>
        </div>
      </div>

      {/* About */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-medium text-white/80 mb-3">About MMB AI</h3>
        <div className="space-y-2 text-xs text-white/40">
          <p>Version: 1.0.0</p>
          <p>Electron Desktop AI Assistant</p>
          <p>Built with React 19 + Tailwind CSS + Framer Motion</p>
          <p className="text-emerald-400/60 mt-3">
            Powered by Google Gemini & Groq
          </p>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
