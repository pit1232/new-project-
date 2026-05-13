import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Radio } from 'lucide-react'

interface VoiceSystemProps {
  onTranscript: (text: string) => void
  onStateChange?: (state: 'idle' | 'listening' | 'processing' | 'speaking') => void
  isProcessing?: boolean
}

function VoiceSystem({ onTranscript, onStateChange, isProcessing }: VoiceSystemProps): React.ReactElement {
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')
  const [audioLevel, setAudioLevel] = useState(0)

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    synthRef.current = window.speechSynthesis
    return () => {
      stopListening()
      if (synthRef.current?.speaking) {
        synthRef.current.cancel()
      }
    }
  }, [])

  useEffect(() => {
    if (isProcessing) {
      updateState('processing')
    }
  }, [isProcessing])

  const updateState = (state: 'idle' | 'listening' | 'processing' | 'speaking') => {
    setVoiceState(state)
    onStateChange?.(state)
  }

  const startAudioAnalyser = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateLevel = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length
        setAudioLevel(avg / 255)
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }

  const stopAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(0)
  }

  const startListening = useCallback(() => {
    // Use Web Speech API (works in Electron with Chromium)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      updateState('listening')
      startAudioAnalyser()
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      setTranscript(interimTranscript || finalTranscript)

      if (finalTranscript) {
        onTranscript(finalTranscript.trim())
        setTranscript('')
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error !== 'no-speech') {
        stopListening()
      }
    }

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (isListening && recognitionRef.current) {
        try {
          recognition.start()
        } catch { /* already started */ }
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [onTranscript])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
    setTranscript('')
    updateState('idle')
    stopAudioAnalyser()
  }, [])

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Text-to-Speech function (can be called externally)
  const speak = useCallback((text: string) => {
    if (!synthRef.current || isMuted) return

    // Cancel any ongoing speech
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to use a good voice
    const voices = synthRef.current.getVoices()
    const preferredVoice = voices.find(
      (v) => v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Samantha')
    )
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onstart = () => updateState('speaking')
    utterance.onend = () => updateState(isListening ? 'listening' : 'idle')

    synthRef.current.speak(utterance)
  }, [isMuted, isListening])

  // Expose speak function via window for other components
  useEffect(() => {
    (window as any).__mmb_speak = speak
    return () => {
      delete (window as any).__mmb_speak
    }
  }, [speak])

  return (
    <div className="flex items-center gap-2">
      {/* Audio Level Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex items-center gap-1 overflow-hidden"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full bg-emerald-400"
                animate={{
                  height: audioLevel > (i + 1) * 0.15 ? `${8 + audioLevel * 20}px` : '4px'
                }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript Preview */}
      {transcript && (
        <span className="text-xs text-white/50 font-mono max-w-32 truncate">{transcript}</span>
      )}

      {/* Voice State Indicator */}
      {voiceState !== 'idle' && (
        <div className="flex items-center gap-1">
          <Radio
            size={12}
            className={`${
              voiceState === 'listening'
                ? 'text-emerald-400 animate-pulse'
                : voiceState === 'speaking'
                  ? 'text-cyan-400 animate-pulse'
                  : 'text-orange-400 animate-pulse'
            }`}
          />
          <span className="text-[10px] font-mono text-white/40 uppercase">
            {voiceState}
          </span>
        </div>
      )}

      {/* Mute TTS */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsMuted(!isMuted)}
        className={`p-2 rounded-lg transition-colors ${
          isMuted ? 'bg-red-500/15 text-red-400' : 'hover:bg-white/5 text-white/40'
        }`}
        title={isMuted ? 'Unmute TTS' : 'Mute TTS'}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </motion.button>

      {/* Mic Toggle */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleListening}
        className={`p-2.5 rounded-xl transition-all ${
          isListening
            ? 'bg-emerald-500/20 text-emerald-400 glow-green'
            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
        }`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? (
          <Mic size={18} className="animate-pulse" />
        ) : (
          <MicOff size={18} />
        )}
      </motion.button>
    </div>
  )
}

export default VoiceSystem
