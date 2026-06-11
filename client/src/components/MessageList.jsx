import { useState, useEffect, useRef } from 'react'
import { useMessages } from '../hooks/useMail'
import { mail } from '../api/mail'
import BlurText from './bits/BlurText'
import SpotlightCard from './bits/SpotlightCard'
import AnimatedList from './bits/AnimatedList'
import DecryptedText from './bits/DecryptedText'
import { ContextMenu } from './bits/ContextMenu'
import { useContextMenu } from '../hooks/useContextMenu'
import { useSwipe } from '../hooks/useSwipe'

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

function MessageRow({ msg, active, selected, onSelect, onToggleSelect, indented, onContextMenu, onSwipeDelete, onSwipeToggleRead }) {
  const { contentRef, onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
    onSwipeLeft:  onSwipeDelete,
    onSwipeRight: onSwipeToggleRead,
  })

  return (
    <div className="relative overflow-hidden">
      {/* Delete hint — revealed on left swipe */}
      <div className="absolute inset-0 flex items-center justify-end pr-5 bg-red-500/15 pointer-events-none">
        <svg className="w-4 h-4 text-red-400" viewBox="0 0 16 16" fill="none">
          <path d="M13 4H3M6 4V3h4v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {/* Read/Unread hint — revealed on right swipe */}
      <div className="absolute inset-0 flex items-center pl-5 bg-violet-500/15 pointer-events-none">
        <svg className="w-4 h-4 text-violet-400" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="5" width="14" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1 6l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          {msg.read && <circle cx="14" cy="3" r="2.5" fill="currentColor"/>}
        </svg>
      </div>
      {/* Swipeable content */}
      <div
        ref={contentRef}
        style={{ touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <SpotlightCard
          spotlightColor={active ? 'rgba(161,161,170,0.10)' : 'rgba(161,161,170,0.05)'}
          className={`group relative flex items-stretch border-b border-zinc-800/40 transition-colors ${active ? 'bg-zinc-700/15' : selected ? 'bg-zinc-800/60' : ''} ${active ? 'border-l-2 border-l-zinc-400' : !msg.read && !indented ? 'border-l-2 border-l-violet-500' : 'border-l-2 border-l-transparent'} ${indented ? 'border-l-2 border-l-zinc-700/60' : ''}`}
          onContextMenu={e => onContextMenu?.(e, msg)}
        >
          <div className={`flex items-center shrink-0 ${indented ? 'pl-6 pr-1' : 'pl-3 pr-1'}`}>
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(msg.uid)} onClick={e => e.stopPropagation()}
              className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-violet-500 cursor-pointer"
              style={{ opacity: selected ? 1 : undefined }} />
          </div>
          <button onClick={() => onSelect(msg.uid)} className="flex-1 text-left px-3 py-3.5 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-sm truncate ${msg.read ? 'text-zinc-400' : 'text-zinc-100 font-medium'}`}>{msg.from.name || msg.from.address}</span>
              <span className="text-xs text-zinc-500 shrink-0" title={msg.date ? new Date(msg.date).toLocaleString() : ''}>{formatDate(msg.date)}</span>
            </div>
            <div className={`text-xs truncate ${msg.read ? 'text-zinc-500' : 'text-zinc-300'}`}>{msg.subject}</div>
          </button>
        </SpotlightCard>
      </div>
    </div>
  )
}

function ThreadRow({ thread, activeUid, selectedUids, onSelect, onToggleSelect, expanded, onToggleExpand, onContextMenu, onSwipeDelete, onSwipeToggleRead }) {
  const latestMsg = thread.messages.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b)
  const isAnyActive = thread.uids.some(uid => uid === activeUid)

  return (
    <div className={`border-b border-zinc-800/40 ${isAnyActive ? 'bg-zinc-700/10' : ''}`}>
      <div className={`group relative flex items-stretch transition-colors ${isAnyActive ? 'border-l-2 border-l-zinc-600' : ''} ${!expanded ? 'hover:bg-zinc-800/40' : 'bg-zinc-800/20'}`}>
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
              <span className={`text-sm truncate ${thread.hasUnread ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}>
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
                onContextMenu={onContextMenu}
                onSwipeDelete={onSwipeDelete}
                onSwipeToggleRead={onSwipeToggleRead}
                indented
              />
            ))}
        </div>
      )}
    </div>
  )
}

export function MessageList({ folder, activeUid, onSelect, folders = [] }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedUids, setSelectedUids] = useState(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [threadMode, setThreadMode] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState(new Set())
  const timerRef = useRef(null)
  const { menu, openMenu, closeMenu } = useContextMenu()

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

  function handleSwipeDelete(uid) {
    mail.delete(uid, folder).then(refresh).catch(() => {})
  }

  function handleSwipeToggleRead(msg) {
    mail.flags(msg.uid, folder,
      msg.read ? [] : ['\\Seen'],
      msg.read ? ['\\Seen'] : []
    ).then(refresh).catch(() => {})
  }

  function handleRowContextMenu(e, msg) {
    const moveTargets = folders.filter(f => f.path !== folder)
    openMenu(e, [
      {
        label: msg.read ? 'Mark as Unread' : 'Mark as Read',
        icon: <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M1 3h12v8a1 1 0 01-1 1H2a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 4l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
        onClick: () => mail.flags(msg.uid, folder,
          msg.read ? [] : ['\\Seen'],
          msg.read ? ['\\Seen'] : []
        ).then(refresh).catch(() => {}),
      },
      { separator: true },
      {
        label: 'Move to Folder',
        icon: <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M1 3h4l2 2h6v6a1 1 0 01-1 1H2a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
        disabled: moveTargets.length === 0,
        submenu: moveTargets.map(f => ({
          label: f.path.split(/[./]/).pop(),
          onClick: () => mail.move(msg.uid, folder, f.path).then(refresh).catch(() => {}),
        })),
      },
      { separator: true },
      {
        label: 'Delete',
        danger: true,
        icon: <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M12 3H2M5 3V2h4v1M4 3v8a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
        onClick: () => mail.delete(msg.uid, folder).then(refresh).catch(() => {}),
      },
    ])
  }

  const anySelected = selectedUids.size > 0
  const allSelected = selectedUids.size === messages.length && messages.length > 0

  return (
    <div className="w-full lg:w-80 shrink-0 h-full flex flex-col border-r border-zinc-800/60 bg-zinc-900/60">
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
        <BlurText key={folder} text={(() => { const r = folder ? folder.split(/[./]/).pop() : 'Inbox'; return r === r.toUpperCase() ? r[0] + r.slice(1).toLowerCase() : r })()} delay={50} stepDuration={0.2} className="hidden lg:flex text-sm font-semibold text-zinc-200 flex-1" />
        <div className="flex-1 lg:hidden" />
        <div className="flex rounded-md overflow-hidden border border-zinc-700/60 shrink-0">
          <button
            onClick={() => setThreadMode(false)}
            aria-pressed={!threadMode}
            className={`text-xs px-2.5 py-1 transition-colors ${!threadMode ? 'bg-gradient-to-b from-zinc-700 to-zinc-800 text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            All
          </button>
          <button
            onClick={() => setThreadMode(true)}
            aria-pressed={threadMode}
            className={`text-xs px-2.5 py-1 border-l border-zinc-700/60 transition-colors ${threadMode ? 'bg-gradient-to-b from-zinc-700 to-zinc-800 text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            Threads
          </button>
        </div>
        <button onClick={refresh} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded" title="Refresh">
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M11 2A6 6 0 1 0 11 11M11 2v4M11 2H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
        {loading && <div className="flex items-center justify-center h-20 text-zinc-500 text-sm"><DecryptedText text="Loading…" speed={40} /></div>}
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
                onContextMenu={handleRowContextMenu}
                onSwipeDelete={uid => handleSwipeDelete(uid)}
                onSwipeToggleRead={msg => handleSwipeToggleRead(msg)}
              />
            ))
          : <AnimatedList key={`${folder}-${page}`}>
              {messages.map(msg => (
                <MessageRow key={msg.uid} msg={msg} active={activeUid === msg.uid} selected={selectedUids.has(msg.uid)} onSelect={onSelect} onToggleSelect={toggleOne} onContextMenu={handleRowContextMenu} onSwipeDelete={() => handleSwipeDelete(msg.uid)} onSwipeToggleRead={() => handleSwipeToggleRead(msg)} />
              ))}
            </AnimatedList>
        }
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] border-t border-zinc-800/60 text-xs text-zinc-500">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-30 hover:text-zinc-300 transition-colors px-3 py-2.5 min-h-[44px] flex items-center">← Prev</button>
          <span>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="disabled:opacity-30 hover:text-zinc-300 transition-colors px-3 py-2.5 min-h-[44px] flex items-center">Next →</button>
        </div>
      )}
      <ContextMenu {...menu} onClose={closeMenu} />
    </div>
  )
}
