import { useState, useEffect, useRef, useCallback } from 'react'
import { mail } from '../api/mail'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function folderLabel(path) {
  const raw = path.split(/[./]/).pop()
  return raw === raw.toUpperCase() ? raw[0] + raw.slice(1).toLowerCase() : raw
}

export function GlobalSearch({ onClose, onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const timerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.trim().length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const data = await mail.search(query.trim())
        setResults(data.results || [])
        setActiveIdx(0)
      } catch (_) {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(timerRef.current)
  }, [query])

  const handleSelect = useCallback((result) => {
    onNavigate(result.folder, result.uid)
    onClose()
  }, [onNavigate, onClose])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && results[activeIdx]) {
        handleSelect(results[activeIdx])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [results, activeIdx, handleSelect, onClose])

  useEffect(() => {
    const el = listRef.current?.children[activeIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <svg className="w-4 h-4 text-zinc-500 shrink-0" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all folders…"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-zinc-600 border-t-violet-500 rounded-full animate-spin shrink-0" />
          )}
          <kbd className="text-xs text-zinc-600 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {results.length > 0 && (
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto divide-y divide-zinc-800/50">
            {results.map((r, i) => (
              <button
                key={`${r.folder}-${r.uid}`}
                onClick={() => handleSelect(r)}
                className={`w-full text-left px-4 py-3 transition-colors ${i === activeIdx ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'}`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={`text-sm truncate ${r.read ? 'text-zinc-400' : 'text-zinc-100 font-medium'}`}>
                    {r.from.name || r.from.address}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {folderLabel(r.folder)}
                    </span>
                    <span className="text-xs text-zinc-500">{formatDate(r.date)}</span>
                  </div>
                </div>
                <p className={`text-xs truncate ${r.read ? 'text-zinc-500' : 'text-zinc-300'}`}>{r.subject}</p>
              </button>
            ))}
          </div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">No messages found</div>
        )}

        {query.trim().length < 2 && (
          <div className="px-4 py-6 text-center text-xs text-zinc-600">
            Type at least 2 characters to search across all folders
          </div>
        )}

        <div className="flex items-center gap-4 px-4 py-2 border-t border-zinc-800/60 text-xs text-zinc-600">
          <span><kbd className="bg-zinc-800 border border-zinc-700 px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="bg-zinc-800 border border-zinc-700 px-1 rounded">↵</kbd> open</span>
          <span><kbd className="bg-zinc-800 border border-zinc-700 px-1 rounded">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
