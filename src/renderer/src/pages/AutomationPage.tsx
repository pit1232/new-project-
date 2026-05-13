import { useState } from 'react'
import { motion } from 'framer-motion'
import { MousePointerClick, Keyboard, Camera, Play, Target } from 'lucide-react'

function AutomationPage(): React.ReactElement {
  const [mouseX, setMouseX] = useState('')
  const [mouseY, setMouseY] = useState('')
  const [typeText, setTypeText] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  const handleMouseClick = async () => {
    const x = parseInt(mouseX)
    const y = parseInt(mouseY)
    if (isNaN(x) || isNaN(y)) {
      setStatus('Invalid coordinates')
      return
    }
    const result = await window.api.automation.mouseClick(x, y)
    setStatus('error' in result ? `Error: ${result.error}` : 'Mouse clicked successfully!')
  }

  const handleKeyboardType = async () => {
    if (!typeText.trim()) return
    const result = await window.api.automation.keyboardType(typeText)
    setStatus('error' in result ? `Error: ${result.error}` : 'Text typed successfully!')
    setTypeText('')
  }

  const handleScreenshot = async () => {
    setStatus('Taking screenshot...')
    const result = await window.api.automation.screenshot()
    if ('image' in result) {
      setScreenshot(`data:image/png;base64,${result.image}`)
      setStatus('Screenshot captured!')
    } else {
      setStatus(`Error: ${result.error}`)
    }
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MousePointerClick className="text-emerald-400" size={20} />
        <h1 className="text-lg font-semibold text-white/90">Desktop Automation</h1>
      </div>

      {/* Status */}
      {status && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl px-4 py-2"
        >
          <span className="text-xs font-mono text-emerald-400">{status}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mouse Click */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-emerald-400" />
            <h3 className="text-sm font-medium text-white/80">Mouse Click</h3>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              value={mouseX}
              onChange={(e) => setMouseX(e.target.value)}
              placeholder="X"
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-emerald-500/30"
            />
            <input
              value={mouseY}
              onChange={(e) => setMouseY(e.target.value)}
              placeholder="Y"
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-emerald-500/30"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleMouseClick}
            className="w-full py-2.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-colors flex items-center justify-center gap-2"
          >
            <Play size={14} /> Click
          </motion.button>
        </div>

        {/* Keyboard Type */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Keyboard size={16} className="text-cyan-400" />
            <h3 className="text-sm font-medium text-white/80">Keyboard Type</h3>
          </div>
          <input
            value={typeText}
            onChange={(e) => setTypeText(e.target.value)}
            placeholder="Text to type..."
            onKeyDown={(e) => e.key === 'Enter' && handleKeyboardType()}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-cyan-500/30 mb-3"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleKeyboardType}
            className="w-full py-2.5 rounded-lg bg-cyan-500/15 text-cyan-400 text-sm font-medium hover:bg-cyan-500/25 transition-colors flex items-center justify-center gap-2"
          >
            <Keyboard size={14} /> Type
          </motion.button>
        </div>

        {/* Screenshot */}
        <div className="glass rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-purple-400" />
              <h3 className="text-sm font-medium text-white/80">Screenshot</h3>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleScreenshot}
              className="px-4 py-2 rounded-lg bg-purple-500/15 text-purple-400 text-sm font-medium hover:bg-purple-500/25 transition-colors flex items-center gap-2"
            >
              <Camera size={14} /> Capture
            </motion.button>
          </div>
          {screenshot && (
            <div className="rounded-lg overflow-hidden border border-white/5">
              <img src={screenshot} alt="Screenshot" className="w-full h-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AutomationPage
