import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Search, ExternalLink, Loader2, FileText } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'

interface SearchResult {
  title: string
  url: string
  content?: string
}

function WebResearchPage(): React.ReactElement {
  const [query, setQuery] = useState('')
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [scrapeContent, setScrapeContent] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const { tavilyKey } = useSettingsStore()

  const handleSearch = async () => {
    if (!query.trim() || isSearching) return
    setIsSearching(true)
    setScrapeContent(null)

    try {
      const response = await window.api.web.search(query, tavilyKey || undefined)
      if (response.results) {
        setResults(response.results)
      } else {
        setResults([{ title: 'Raw HTML response', url: '', content: 'Search completed (no Tavily API key - results limited)' }])
      }
    } catch (err: any) {
      setResults([{ title: 'Error', url: '', content: err.message }])
    } finally {
      setIsSearching(false)
    }
  }

  const handleScrape = async () => {
    if (!scrapeUrl.trim() || isScraping) return
    setIsScraping(true)

    try {
      const response = await window.api.web.scrape(scrapeUrl)
      if (response.error) {
        setScrapeContent(`Error: ${response.error}`)
      } else {
        setScrapeContent(`# ${response.title}\n\n${response.text}`)
      }
    } catch (err: any) {
      setScrapeContent(`Error: ${err.message}`)
    } finally {
      setIsScraping(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Globe className="text-emerald-400" size={20} />
        <h1 className="text-lg font-semibold text-white/90">Web Research</h1>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-2 flex items-center gap-2">
        <Search size={16} className="text-white/30 ml-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search the web..."
          className="flex-1 bg-transparent px-2 py-3 text-sm text-white/90 placeholder-white/30 outline-none"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-30"
        >
          {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </motion.button>
      </div>

      {/* Scrape URL */}
      <div className="glass rounded-2xl p-2 flex items-center gap-2">
        <FileText size={16} className="text-white/30 ml-3" />
        <input
          value={scrapeUrl}
          onChange={(e) => setScrapeUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
          placeholder="Enter URL to scrape..."
          className="flex-1 bg-transparent px-2 py-3 text-sm text-white/90 placeholder-white/30 outline-none"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleScrape}
          disabled={!scrapeUrl.trim() || isScraping}
          className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all disabled:opacity-30"
        >
          {isScraping ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
        </motion.button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <h3 className="text-xs font-mono text-white/40 uppercase tracking-wider">
              Search Results
            </h3>
            {results.map((result, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4 hover:border-emerald-500/20 transition-colors cursor-pointer"
                onClick={() => result.url && window.api.system.openUrl(result.url)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white/80 mb-1">{result.title}</h4>
                    {result.url && (
                      <p className="text-[11px] text-emerald-400/60 mb-2 flex items-center gap-1">
                        <ExternalLink size={10} /> {result.url}
                      </p>
                    )}
                    {result.content && (
                      <p className="text-xs text-white/50 line-clamp-3">{result.content}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrape Content */}
      {scrapeContent && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-4">
          <h3 className="text-xs font-mono text-white/40 uppercase tracking-wider mb-3">
            Scraped Content
          </h3>
          <pre className="text-xs text-white/60 whitespace-pre-wrap max-h-60 overflow-y-auto">
            {scrapeContent}
          </pre>
        </motion.div>
      )}
    </div>
  )
}

export default WebResearchPage
