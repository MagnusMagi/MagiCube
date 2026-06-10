import { useState, useEffect, useRef } from 'react'
import { useMessages } from '../hooks/useMail'
import { mail } from '../api/mail'
import BlurText from './bits/BlurText'
import SpotlightCard from './bits/SpotlightCard'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (now.getFullYear() === d.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

function normalizeSubject(s) {
  if (!s) return ''
  const cleaned = s.replace(/^(Re|Fwd|FW|AW|RE|Fw)[:\s]+/i, '').trim()
  return cleaned === s ? cleaned : normalizeSubject(cleaned)
}

function groupIntoThreads(messages) {
  const map = new Map()
  for (const msg of messages) {
    const key = normalizeSubject(msg.subject) || '(no subject)'
    if (!map.has(key)) {
      map.set(key, { subject: key, messages: [], latestDate: null, hasUnread: false, uids: [] })
    }
    const thread = map.get(key)
    thread.messages.push(msg)
    thread.uids.push(msg.uid)
    if (!msg.read) thread.hasUnread = true
    if (!thread.latestDate || new Date(msg.date) > new Date(thread.latestDate)) {
      thread.latestDate = msg.date
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate))
}

function MessageRow({ msg, active, selected, onSelect, onToggleSelect, indented }) {
  return (
    <SpotlightCard spotlightColor={active ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.07)'} className={`group relative flex items-stretch border-b border-zinc-800/40 transition-colors ${active ? 'bg-violet-600/10' : selected ? 'bg-zinc-800/60' : ''} ${active ? 'border-l-2 border-l-violet-500' : ''} ${indented ? 'border-l-2 border-l-zinc-700/60' : ''}`}>
      <div className={`flex items-center shrink-0 ${indented ? 'pl-6 pr-1' : 'pl-3 pr-1'}`}>
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
    </SpotlightCard>
  )
}

function ThreadRow({ thread, activeUid, selectedUids, onSelect, onToggleSelect, expanded, onToggleExpand }) {
  const latestMsg = thread.messages.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b)
  const isAnyActive = thread.uids.some(uid => uid === activeUid)

  return (
    <div className={`border-b border-zinc-800/40 ${isAnyActive ? 'bg-violet-600/5' : ''}`}>
      <div className={`group relative flex items-stretch transition-colors ${isAnyActive ? 'border-l-2 border-l-violet-500' : ''} ${!expanded ? 'hover:bg-zinc-800/40' : 'bg-zinc-800/20'}`}>
        <div className="flex items-center pl-3 pr-1 shrink-0">
          <input
            type="checkbox"
            checked={thread.uids.every(uid => selectedUids.has(uid))}
            onChange={() => {
              const allSelected = thread.uids.every(uid => selectedUids.has(uid))
              thread.uids.forEach(uid => onToggleSelect(uid, allSelected ? 'remove' : 'add'))
            }}
            onClick={e => e.stopPropagation()}
            className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-violet-500 cursor-pointer"
          />
        </div>
        <button onClick={() => onToggleExpand(thread.subject)} className="flex-1 text-left px-3 py-3.5 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-zinc-500 text-xs shrink-0">{expanded ? '▼' : '▶'}</span>
              <span className={`text-sm truncate ${thread.hasUnread ? 'text-white font-medium' : 'text-zinc-400'}`}>
                {latestMsg.from.name || latestMsg.from.address}
              </span>
              {thread.messages.length > 1 && (
                <span className="shrink-0 text-xs text-zinc-400 bg-zinc-700 rounded-full px-1.5 py-0.5 leading-none">
                  {thread.messages.length}
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500 shrink-0">{formatDate(thread.latestDate)}</span>
          </div>
          <div className={`text-xs truncate ${thread.hasUnread ? 'text-zinc-300' : 'text-zinc-500'}`}>{thread.subject}</div>
        </button>
      </div>
      {expanded && (
        <div>
          {[...thread.messages]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(msg => (
              <MessageRow
                key={msg.uid}
                msg={msg}
                active={activeUid === msg.uid}
                selected={selectedUids.has(msg.uid)}
                onSelect={onSelect}
                onToggleSelect={uid => onToggleSelect(uid)}
                indented
              />
            ))}
        </div>
      )}
    </div>
  )
}

export function MessageList({ folder, activeUid, onSelect }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedUids, setSelectedUids] = useState(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [threadMode, setThreadMode] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState(new Set())
  const timerRef = useRef(null)

  const perPage = parseInt(localStorage.getItem('magicube:perPage') || '50', 10)
  const { messages, total, loading, error, refresh } = useMessages(folder, page, search, perPage)
  const totalPages = Math.ceil(total / perPage) || 1

  const threads = threadMode ? groupIntoThreads(messages) : []

  useEffect(() => { setPage(1); setSelectedUids(new Set()); setExpandedThreads(new Set()) }, [folder])
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

  function toggleOne(uid, forceAction) {
    setSelectedUids(prev => {
      const next = new Set(prev)
      if (forceAction === 'remove') next.delete(uid)
      else if (forceAction === 'add') next.add(uid)
      else next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  function toggleThreadExpand(subject) {
    setExpandedThreads(prev => {
      const next = new Set(prev)
      next.has(subject) ? next.delete(subject) : next.add(subject)
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
        <BlurText key={folder} text={folder ? folder.split(/[./]/).pop() : 'Inbox'} delay={50} stepDuration={0.2} className="text-sm font-semibold text-zinc-200 flex-1" />
        <button
          onClick={() => setThreadMode(m => !m)}
          className={`text-xs px-2 py-1 rounded transition-colors ${threadMode ? 'bg-violet-600/30 text-violet-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          title={threadMode ? 'Switch to flat list' : 'Switch to thread view'}
        >
          {threadMode ? 'Threads' : 'All'}
        </button>
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
        {threadMode
          ? threads.map(thread => (
              <ThreadRow
                key={thread.subject}
                thread={thread}
                activeUid={activeUid}
                selectedUids={selectedUids}
                onSelect={onSelect}
                onToggleSelect={toggleOne}
                expanded={expandedThreads.has(thread.subject)}
                onToggleExpand={toggleThreadExpand}
              />
            ))
          : messages.map(msg => (
              <MessageRow key={msg.uid} msg={msg} active={activeUid === msg.uid} selected={selectedUids.has(msg.uid)} onSelect={onSelect} onToggleSelect={toggleOne} />
            ))
        }
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
