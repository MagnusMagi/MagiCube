import { useState, useEffect, useRef } from 'react'
import { useMessages } from '../hooks/useMail'
import { mail } from '../api/mail'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (now.getFullYear() === d.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

function MessageRow({ msg, active, selected, onSelect, onToggleSelect }) {
  return (
    <div className={`group relative flex items-stretch border-b border-zinc-800/40 transition-colors ${active ? 'bg-violet-600/10' : selected ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/40'} ${active ? 'border-l-2 border-l-violet-500' : ''}`}>
      <div className="flex items-center pl-3 pr-1 shrink-0">
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(msg.uid)} onClick={e => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-violet-500 cursor-pointer"
          style={{ opacity: selected ? 1 : undefined }} />
      </div>
      <button onClick={() => onSelect(msg.uid)} className="flex-1 text-left px-3 py-3.5 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`text-sm truncate ${msg.read ? 'text-zinc-400' : 'text-white font-medium'}`}>{msg.from.name || msg.from.address}</span>
          <span className="text-xs text-zinc-500 shrink-0">{formatDate(msg.date)}</span>
        </div>
        <div className={`text-xs truncate ${msg.read ? 'text-zinc-500' : 'text-zinc-300'}`}>{msg.subject}</div>
      </button>
    </div>
  )
}

export function MessageList({ folder, activeUid, onSelect }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedUids, setSelectedUids] = useState(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const timerRef = useRef(null)

  const perPage = parseInt(localStorage.getItem('magicube:perPage') || '50', 10)
  const { messages, total, loading, error, refresh } = useMessages(folder, page, search, perPage)
  const totalPages = Math.ceil(total / perPage) || 1

  useEffect(() => { setPage(1); setSelectedUids(new Set()) }, [folder])
  useEffect(() => { setSelectedUids(new Set()) }, [page, search])

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const idx = messages.findIndex(m => m.uid === activeUid)
      if ((e.key === 'j' || e.key === 'ArrowDown') && messages[idx + 1]) onSelect(messages[idx + 1].uid)
      if ((e.key === 'k' || e.key === 'ArrowUp') && idx > 0) onSelect(messages[idx - 1].uid)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [messages, activeUid, onSelect])

  function handleSearchChange(e) {
    setSearchInput(e.target.value)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { setSearch(e.target.value); setPage(1) }, 400)
  }

  function toggleSelectAll() {
    if (selectedUids.size === messages.length) setSelectedUids(new Set())
    else setSelectedUids(new Set(messages.map(m => m.uid)))
  }

  function toggleOne(uid) {
    setSelectedUids(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  async function bulkMarkRead() {
    setBulkStatus('Marking…')
    try { await mail.bulkFlags([...selectedUids], folder, ['\\Seen'], []); setSelectedUids(new Set()); refresh(); setBulkStatus('') }
    catch (e) { setBulkStatus(e.message) }
  }

  async function bulkMarkUnread() {
    setBulkStatus('Marking…')
    try { await mail.bulkFlags([...selectedUids], folder, [], ['\\Seen']); setSelectedUids(new Set()); refresh(); setBulkStatus('') }
    catch (e) { setBulkStatus(e.message) }
  }

  async function bulkDelete() {
    setBulkStatus('Deleting…')
    try { await mail.bulkDelete([...selectedUids], folder); setSelectedUids(new Set()); refresh(); setBulkStatus('') }
    catch (e) { setBulkStatus(e.message) }
  }

  const anySelected = selectedUids.size > 0
  const allSelected = selectedUids.size === messages.length && messages.length > 0

  return (
    <div className="w-full md:w-80 shrink-0 h-full flex flex-col border-r border-zinc-800/60 bg-zinc-900/40">
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-zinc-200 flex-1 truncate">{folder ? folder.split(/[./]/).pop() : 'Inbox'}</h2>
        <button onClick={refresh} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded" title="Refresh">
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M13 2A6 6 0 1 0 13 11M13 2v4M13 2H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div className="px-3 py-2 border-b border-zinc-800/40">
        <input type="search" value={searchInput} onChange={handleSearchChange} placeholder="Search…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors" />
      </div>

      {anySelected && (
        <div className="px-3 py-2 border-b border-zinc-800/40 flex items-center gap-2 bg-zinc-800/30">
          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
            className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-700 accent-violet-500 cursor-pointer" />
          <span className="text-xs text-zinc-400 flex-1">{selectedUids.size} selected</span>
          <button onClick={bulkMarkRead} className="text-xs text-zinc-400 hover:text-zinc-200 px-1 transition-colors">Read</button>
          <button onClick={bulkMarkUnread} className="text-xs text-zinc-400 hover:text-zinc-200 px-1 transition-colors">Unread</button>
          <button onClick={bulkDelete} className="text-xs text-red-400 hover:text-red-300 px-1 transition-colors">Delete</button>
          {bulkStatus && <span className="text-xs text-zinc-500">{bulkStatus}</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex items-center justify-center h-20 text-zinc-500 text-sm">Loading…</div>}
        {error && <div className="px-4 py-3 text-red-400 text-xs">{error}</div>}
        {!loading && messages.length === 0 && <div className="flex items-center justify-center h-20 text-zinc-500 text-sm">No messages</div>}
        {messages.map(msg => (
          <MessageRow key={msg.uid} msg={msg} active={activeUid === msg.uid} selected={selectedUids.has(msg.uid)} onSelect={onSelect} onToggleSelect={toggleOne} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/60 text-xs text-zinc-500">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-30 hover:text-zinc-300 transition-colors">← Prev</button>
          <span>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="disabled:opacity-30 hover:text-zinc-300 transition-colors">Next →</button>
        </div>
      )}
    </div>
  )
}
