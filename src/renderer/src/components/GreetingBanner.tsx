import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Sun, Moon, Sunrise, Coffee } from 'lucide-react'

function getGreeting(): { text: string; icon: React.ReactNode; subtext: string } {
  const hour = new Date().getHours()

  if (hour < 9) {
    return {
      text: 'Good Morning, Kuldeep',
      icon: <Sunrise size={24} className="text-orange-400" />,
      subtext: 'Co-Founder MMB | Let\'s build something amazing today.'
    }
  } else if (hour < 12) {
    return {
      text: 'Hey Kuldeep',
      icon: <Coffee size={24} className="text-amber-400" />,
      subtext: 'Co-Founder MMB | Your morning session is active.'
    }
  } else if (hour < 17) {
    return {
      text: 'Good Afternoon, Kuldeep',
      icon: <Sun size={24} className="text-yellow-400" />,
      subtext: 'Co-Founder MMB | Stay focused, you\'re doing great.'
    }
  } else if (hour < 21) {
    return {
      text: 'Good Evening, Kuldeep',
      icon: <Moon size={24} className="text-indigo-400" />,
      subtext: 'Co-Founder MMB | Wrapping up the day.'
    }
  } else {
    return {
      text: 'Hey Night Owl, Kuldeep',
      icon: <Sparkles size={24} className="text-purple-400" />,
      subtext: 'Co-Founder MMB | Late night grind mode.'
    }
  }
}

function GreetingBanner(): React.ReactElement {
  const [greeting, setGreeting] = useState(getGreeting())
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
      setGreeting(getGreeting())
    }, 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-xl p-4 mb-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
            {greeting.icon}
          </div>
          <div>
            <h2 className="text-base font-semibold text-white/90">{greeting.text}</h2>
            <p className="text-xs text-white/40">{greeting.subtext}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono text-emerald-400/80">{formattedTime}</p>
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{formattedDate}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default GreetingBanner
