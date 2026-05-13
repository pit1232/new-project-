import { useState } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Play, Trash2, Copy } from 'lucide-react'

function DevToolsPage(): React.ReactElement {
  const [command, setCommand] = useState('')
  const [cwd, setCwd] = useState('')
  const [history, setHistory] = useState<
    Array<{ cmd: string; output: string; error: string | null; time: number }>
  >([])
  const [isRunning, setIsRunning] = useState(false)

  const handleExecute = async () => {
    if (!command.trim() || isRunning) return
    const cmd = command.trim()
    setCommand('')
    setIsRunning(true)

    try {
      const result = await window.api.terminal.execute(cmd, cwd || undefined)
      setHistory((prev) => [
        ...prev,
        {
          cmd,
          output: result.stdout || result.stderr || '(no output)',
          error: result.error,
          time: Date.now()
        }
      ])
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        { cmd, output: '', error: err.message, time: Date.now() }
      ])
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="text-emerald-400" size={20} />
          <h1 className="text-lg font-semibold text-white/90">Developer Tools</h1>
        </div>
        <button
          onClick={() => setHistory([])}
          className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-red-400 transition-colors"
          title="Clear history"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* CWD Input */}
      <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
        <span className="text-[10px] font-mono text-white/30 uppercase">CWD:</span>
        <input
          value={cwd}
          onChange={(e) => setCwd(e.target.value)}
          placeholder="Working directory (optional)"
          className="flex-1 bg-transparent text-xs font-mono text-white/60 placeholder-white/20 outline-none"
        />
      </div>

      {/* Terminal Output */}
      <div className="flex-1 glass rounded-xl p-4 overflow-y-auto font-mono text-xs space-y-3">
        {history.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/20 text-sm">Run a command to see output here...</p>
          </div>
        )}
        {history.map((entry, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">$</span>
              <span className="text-white/70">{entry.cmd}</span>
              <button
                onClick={() => navigator.clipboard.writeText(entry.output)}
                className="ml-auto p-1 rounded hover:bg-white/5 text-white/20 hover:text-white/50"
              >
                <Copy size={10} />
              </button>
            </div>
            {entry.error ? (
              <pre className="text-red-400/80 whitespace-pre-wrap pl-4">{entry.error}</pre>
            ) : (
              <pre className="text-white/50 whitespace-pre-wrap pl-4 max-h-40 overflow-y-auto">
                {entry.output}
              </pre>
            )}
          </div>
        ))}
        {isRunning && (
          <div className="flex items-center gap-2 text-emerald-400/60">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Running...</span>
          </div>
        )}
      </div>

      {/* Command Input */}
      <div className="glass rounded-2xl p-2 flex items-center gap-2">
        <span className="text-emerald-400 font-mono text-sm pl-3">$</span>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
          placeholder="Enter command..."
          className="flex-1 bg-transparent px-2 py-3 text-sm font-mono text-white/90 placeholder-white/30 outline-none"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExecute}
          disabled={!command.trim() || isRunning}
          className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-30"
        >
          <Play size={16} />
        </motion.button>
      </div>
    </div>
  )
}

export default DevToolsPage
