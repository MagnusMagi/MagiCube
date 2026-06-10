import { useState, useEffect, useCallback } from 'react'
import { useMessage } from '../hooks/useMail'
import { mail } from '../api/mail'

function AddressChip({ addr }) {
  const label = addr.name ? `${addr.name} <${addr.address}>` : addr.address
  return (
    <span className="inline-block bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-0.5 mr-1 mb-1">{label}</span>
  )
}

function blockImages(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src')
    if (src && (src.startsWith('http') || src.startsWith('//'))) {
      img.setAttribute('data-src', src)
      img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
      img.removeAttribute('srcset')
    }
  })
  return doc.documentElement.outerHTML
}

function hasExternalImages(html) {
  return /src=["'](https?:\/\/|\/\/)/.test(html)
}

export function MessageView({ uid, folder, folders, onDeleted, onRefreshList, onCompose }) {
  const { message, loading, error } = useMessage(uid, folder)
  const [starred, setStarred] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showImages, setShowImages] = useState(() => localStorage.getItem('magicube:blockImages') === 'false')
  const [showSource, setShowSource] = useState(false)
  const [rawSource, setRawSource] = useState(null)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  useEffect(() => { if (message) setStarred(message.starred) }, [message])
  useEffect(() => { setShowImages(false); setShowSource(false); setRawSource(null); setConfirmDelete(false) }, [uid])

  useEffect(() => {
    const autoMarkRead = localStorage.getItem('magicube:autoMarkRead') !== 'false'
    if (message && !message.read && autoMarkRead) {
      mail.flags(uid, folder, ['\\Seen'], []).catch(() => {})
    }
  }, [message, uid, folder])

  // Keyboard shortcuts
  useEffect(() => {
    if (!uid || !message) return
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if (e.key === 'r') handleReply()
      if (e.key === 'a') handleReplyAll()
      if (e.key === 'f') handleForward()
      if (e.key === 'd') setConfirmDelete(true)
      if (e.key === 'u') handleMarkUnread()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  function quoteMessage() {
    const date = message.date ? new Date(message.date).toLocaleString() : ''
    const from = message.from?.[0] ? `${message.from[0].name || ''} <${message.from[0].address}>` : ''
    const quoted = (message.text || '').split('\n').map(l => `> ${l}`).join('\n')
    return `\n\n---\nOn ${date}, ${from} wrote:\n${quoted}`
  }

  function handleReply() {
    if (!message) return
    const from = message.from?.[0]
    onCompose({
      defaultTo: from ? (from.name ? `${from.name} <${from.address}>` : from.address) : '',
      defaultSubject: message.subject?.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
      defaultBody: quoteMessage(),
      inReplyTo: message.messageId,
      references: message.messageId,
    })
  }

  function handleReplyAll() {
    if (!message) return
    const from = message.from?.[0]
    const allTo = [from, ...(message.to || []), ...(message.cc || [])]
      .filter(Boolean)
      .map(a => a.name ? `${a.name} <${a.address}>` : a.address)
      .join(', ')
    onCompose({
      defaultTo: allTo,
      defaultSubject: message.subject?.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
      defaultBody: quoteMessage(),
      inReplyTo: message.messageId,
      references: message.messageId,
    })
  }

  function handleForward() {
    if (!message) return
    const from = message.from?.[0]
    const fwdHeader = [
      '---------- Forwarded message ----------',
      `From: ${from ? (from.name ? `${from.name} <${from.address}>` : from.address) : ''}`,
      `Date: ${message.date ? new Date(message.date).toLocaleString() : ''}`,
      `Subject: ${message.subject || ''}`,
      '', message.text || '',
    ].join('\n')
    onCompose({
      defaultTo: '',
      defaultSubject: message.subject?.startsWith('Fwd:') ? message.subject : `Fwd: ${message.subject}`,
      defaultBody: `\n\n${fwdHeader}`,
    })
  }

  function handleMarkUnread() {
    mail.flags(uid, folder, [], ['\\Seen']).catch(() => {})
    onDeleted()
    onRefreshList()
  }

  async function handleDelete() {
    setDeleteError('')
    try {
      await mail.delete(uid, folder)
      setConfirmDelete(false); onDeleted(); onRefreshList()
    } catch (e) { setDeleteError(e.message) }
  }

  async function handleToggleStar() {
    if (!message) return
    const next = !starred
    setStarred(next)
    try {
      await mail.flags(uid, folder, next ? ['\\Flagged'] : [], next ? [] : ['\\Flagged'])
    } catch (_) { setStarred(!next) }
  }

  async function handleMove(destination) {
    setShowMoveMenu(false)
    try {
      await mail.move(uid, folder, destination)
      onDeleted(); onRefreshList()
    } catch (_) {}
  }

  async function handleShowSource() {
    if (rawSource !== null) { setShowSource(v => !v); return }
    const src = await mail.source(uid, folder).catch(() => '')
    setRawSource(src)
    setShowSource(true)
  }

  if (!uid) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M6 16l18 12 18-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="text-sm">Select a message to read</p>
          <p className="text-xs mt-1 text-zinc-700">r=reply · f=forward · d=delete · j/k=navigate</p>
        </div>
      </div>
    )
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Loading…</div>
  if (error) return <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{error}</div>
  if (!message) return null

  const displayHtml = showImages ? message.html : blockImages(message.html || '')
  const needsImageWarning = message.html && hasExternalImages(message.html)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {confirmDelete && (
        <div className="bg-zinc-800 border-b border-zinc-700 px-6 py-3 flex items-center gap-3">
          <span className="text-sm text-zinc-300 flex-1">Delete this message permanently?</span>
          {deleteError && <span className="text-xs text-red-400">{deleteError}</span>}
          <button onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">Delete</button>
          <button onClick={() => { setConfirmDelete(false); setDeleteError('') }} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 transition-colors">Cancel</button>
        </div>
      )}

      <div className="px-6 py-4 border-b border-zinc-800/60 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-white mb-2 leading-tight">{message.subject}</h2>
          <div className="flex flex-wrap gap-1 text-xs text-zinc-500">
            <span className="text-zinc-400 mr-1">From:</span>
            {message.from.map((a, i) => <AddressChip key={i} addr={a} />)}
          </div>
          {message.to?.length > 0 && (
            <div className="flex flex-wrap gap-1 text-xs text-zinc-500 mt-1">
              <span className="text-zinc-400 mr-1">To:</span>
              {message.to.map((a, i) => <AddressChip key={i} addr={a} />)}
            </div>
          )}
          {message.cc?.length > 0 && (
            <div className="flex flex-wrap gap-1 text-xs text-zinc-500 mt-1">
              <span className="text-zinc-400 mr-1">Cc:</span>
              {message.cc.map((a, i) => <AddressChip key={i} addr={a} />)}
            </div>
          )}
          {message.date && <p className="text-xs text-zinc-500 mt-1.5">{new Date(message.date).toLocaleString()}</p>}
        </div>

        <div className="flex items-center gap-0.5 shrink-0 flex-wrap justify-end">
          <ActionBtn onClick={handleReply} title="Reply (r)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M5 3L1 7l4 4M1 7h8a4 4 0 010 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </ActionBtn>
          <ActionBtn onClick={handleReplyAll} title="Reply All (a)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M5 3L1 7l4 4M1 7h7M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </ActionBtn>
          <ActionBtn onClick={handleForward} title="Forward (f)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M9 3l4 4-4 4M13 7H5a4 4 0 000 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </ActionBtn>
          <ActionBtn onClick={handleMarkUnread} title="Mark as unread (u)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="7" cy="7" r="2.5" fill="currentColor"/></svg>
          </ActionBtn>
          <div className="relative">
            <ActionBtn onClick={() => setShowMoveMenu(v => !v)} title="Move to folder">
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M1 3h5l2 2h5v7H1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </ActionBtn>
            {showMoveMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
                {folders.filter(f => f.path !== folder).map(f => (
                  <button key={f.path} onClick={() => handleMove(f.path)}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors truncate">
                    {f.path.split(/[./]/).pop()}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ActionBtn onClick={handleToggleStar} title={starred ? 'Unstar' : 'Star'}>
            <svg className={`w-3.5 h-3.5 ${starred ? 'text-yellow-400 fill-yellow-400' : ''}`} viewBox="0 0 16 16">
              <path d="M8 1l1.9 3.9 4.1.6-3 2.9.7 4.1L8 10.4l-3.7 2.1.7-4.1-3-2.9 4.1-.6L8 1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </ActionBtn>
          <ActionBtn onClick={() => setConfirmDelete(true)} title="Delete (d)" danger>
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M13 4H3M6 4V3h4v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </ActionBtn>
          <ActionBtn onClick={handleShowSource} title="Show source">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M4 3L1 7l3 4M10 3l3 4-3 4M8 2l-2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </ActionBtn>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {showSource ? (
          <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-900 rounded p-4 overflow-x-auto">
            {rawSource}
          </pre>
        ) : message.html ? (
          <>
            {needsImageWarning && !showImages && (
              <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-zinc-800/80 rounded-lg text-xs text-zinc-400">
                <span className="flex-1">External images are blocked</span>
                <button onClick={() => setShowImages(true)} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Show images</button>
              </div>
            )}
            <iframe srcDoc={displayHtml} sandbox="" referrerPolicy="no-referrer"
              className="w-full border-0 bg-white rounded-lg" style={{ minHeight: 400 }} title="Email content"
              onLoad={e => { const d = e.target.contentDocument; if (d) e.target.style.height = d.documentElement.scrollHeight + 'px' }} />
          </>
        ) : (
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{message.text}</pre>
        )}

        {message.attachments?.length > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {message.attachments.map(a => (
                <a key={a.index} href={mail.attachment(uid, folder, a.index)} download={a.filename}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 transition-colors">
                  <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" viewBox="0 0 14 14" fill="none">
                    <path d="M8 1H3a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5L8 1z" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 1v4h4" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  <span>{a.filename}</span>
                  <span className="text-zinc-500">{(a.size / 1024).toFixed(0)}KB</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded transition-colors ${danger ? 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
      {children}
    </button>
  )
}
