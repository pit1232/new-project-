import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Lock, Unlock, Eye, EyeOff, Fingerprint, Key } from 'lucide-react'

function SecurityPage(): React.ReactElement {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [status, setStatus] = useState('')
  const [savedPin, setSavedPin] = useState<string | null>(null)

  const handleSetPin = async () => {
    if (pin.length < 4) {
      setStatus('PIN must be at least 4 digits')
      return
    }
    if (pin !== confirmPin) {
      setStatus('PINs do not match')
      return
    }
    await window.api.store.set('security_pin', pin)
    setSavedPin(pin)
    setStatus('PIN set successfully!')
    setPin('')
    setConfirmPin('')
  }

  const handleLock = () => {
    setIsLocked(true)
    setStatus('System locked')
  }

  const handleUnlock = () => {
    if (pin === savedPin) {
      setIsLocked(false)
      setStatus('Unlocked successfully!')
      setPin('')
    } else {
      setStatus('Incorrect PIN!')
    }
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="text-emerald-400" size={20} />
        <h1 className="text-lg font-semibold text-white/90">Security</h1>
      </div>

      {/* Lock Status */}
      <div className="glass rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isLocked ? 'bg-red-500/15' : 'bg-emerald-500/15'
            }`}
          >
            {isLocked ? (
              <Lock size={24} className="text-red-400" />
            ) : (
              <Unlock size={24} className="text-emerald-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-white/80">
              System {isLocked ? 'Locked' : 'Unlocked'}
            </h3>
            <p className="text-xs text-white/40">
              {isLocked ? 'Enter PIN to unlock' : 'System is accessible'}
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={isLocked ? undefined : handleLock}
          disabled={isLocked}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isLocked
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
          }`}
        >
          Lock System
        </motion.button>
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
        {/* Set PIN */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-emerald-400" />
            <h3 className="text-sm font-medium text-white/80">Set PIN</h3>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter PIN..."
                maxLength={8}
                className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-emerald-500/30 font-mono tracking-widest"
              />
              <button
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Confirm PIN..."
              maxLength={8}
              className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-emerald-500/30 font-mono tracking-widest"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSetPin}
              className="w-full py-2.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
            >
              Save PIN
            </motion.button>
          </div>
        </div>

        {/* Unlock */}
        {isLocked && (
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint size={16} className="text-cyan-400" />
              <h3 className="text-sm font-medium text-white/80">Unlock</h3>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter PIN to unlock..."
                maxLength={8}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5 focus:border-cyan-500/30 font-mono tracking-widest"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUnlock}
                className="w-full py-2.5 rounded-lg bg-cyan-500/15 text-cyan-400 text-sm font-medium hover:bg-cyan-500/25 transition-colors"
              >
                Unlock
              </motion.button>
            </div>
          </div>
        )}

        {/* Face Recognition Placeholder */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Fingerprint size={16} className="text-purple-400" />
            <h3 className="text-sm font-medium text-white/80">Face Recognition</h3>
          </div>
          <div className="h-32 flex items-center justify-center rounded-lg border border-dashed border-white/10">
            <div className="text-center">
              <Fingerprint size={32} className="text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/30">Face ID Setup</p>
              <p className="text-[10px] text-white/20">Requires camera access</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecurityPage
