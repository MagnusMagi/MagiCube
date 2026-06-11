import { useState, useEffect, useCallback } from 'react'
import { useMessage } from '../hooks/useMail'
import { mail } from '../api/mail'
import Orb from './bits/Orb'
import DecryptedText from './bits/DecryptedText'

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

function collectContacts(message) {
  if (!message) return
  const existing = JSON.parse(localStorage.getItem('magicube:contacts') || '[]')
  const byAddress = new Map(existing.map(c => [c.address, c]))
  const addrs = [...(message.from || []), ...(message.to || []), ...(message.cc || [])]
  for (const a of addrs) {
    if (a.address && !byAddress.has(a.address)) byAddress.set(a.address, { name: a.name || '', address: a.address })
  }
  const updated = [...byAddress.values()].slice(-200)
  localStorage.setItem('magicube:contacts', JSON.stringify(updated))
}

function PdfIcon() {
  return (
    <svg className="w-8 h-8 text-red-400 shrink-0" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="2" width="18" height="24" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="6" y="20" fontSize="7" fill="currentColor" fontFamily="sans-serif" fontWeight="bold">PDF</text>
    </svg>
  )
}

function AttachmentItem({ a, uid, folder }) {
  const url = mail.attachment(uid, folder, a.index)
  const isImage = a.contentType && a.contentType.startsWith('image/')
  const isPdf = a.contentType === 'application/pdf'

  if (isImage) {
    return (
      <div className="flex flex-col items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 transition-colors cursor-pointer group"
        style={{ maxWidth: 120 }}>
        <a href={url} download={a.filename} className="block">
          <img
            src={url}
            alt={a.filename}
            className="rounded object-cover group-hover:opacity-90 transition-opacity"
            style={{ maxHeight: 80, maxWidth: 96 }}
            loading="lazy"
          />
        </a>
        <span className="text-xs text-zinc-400 text-center break-all leading-tight" style={{ maxWidth: 96 }}>{a.filename}</span>
        <span className="text-xs text-zinc-500">{(a.size / 1024).toFixed(0)}KB</span>
      </div>
    )
  }

  if (isPdf) {
    return (
      <div className="flex flex-col items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 transition-colors"
        style={{ maxWidth: 120 }}>
        <PdfIcon />
        <span className="text-xs text-zinc-400 text-center break-all leading-tight" style={{ maxWidth: 96 }}>{a.filename}</span>
        <span className="text-xs text-zinc-500">{(a.size / 1024).toFixed(0)}KB</span>
        <div className="flex gap-1.5 mt-0.5">
          <a href={url} download={a.filename}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Download
          </a>
          <span className="text-zinc-600">·</span>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Preview
          </a>
        </div>
      </div>
    )
  }

  return (
    <a key={a.index} href={url} download={a.filename}
      className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 transition-colors">
      <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" viewBox="0 0 14 14" fill="none">
        <path d="M8 1H3a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5L8 1z" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M8 1v4h4" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
      <span>{a.filename}</span>
      <span className="text-zinc-500">{(a.size / 1024).toFixed(0)}KB</span>
    </a>
  )
}

export function MessageView({ uid, folder, folders, onDeleted, onRefreshList, onCompose, theme }) {
  const { message, loading, error } = useMessage(uid, folder)
  const [starred, setStarred] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showImages, setShowImages] = useState(() => localStorage.getItem('magicube:blockImages') === 'false')
  const [showSource, setShowSource] = useState(false)
  const [rawSource, setRawSource] = useState(null)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [actionError, setActionError] = useState('')

  function showError(msg) {
    setActionError(msg)
    setTimeout(() => setActionError(''), 3000)
  }

  useEffect(() => { if (message) setStarred(message.starred) }, [message])
  useEffect(() => { setShowImages(false); setShowSource(false); setRawSource(null); setConfirmDelete(false) }, [uid])

  useEffect(() => {
    const autoMarkRead = localStorage.getItem('magicube:autoMarkRead') !== 'false'
    if (message && !message.read && autoMarkRead) {
      mail.flags(uid, folder, ['\\Seen'], []).catch(() => {})
    }
  }, [message, uid, folder])

  useEffect(() => {
    collectContacts(message)
  }, [message])

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

  async function handleMarkUnread() {
    try {
      await mail.flags(uid, folder, [], ['\\Seen'])
      onDeleted()
      onRefreshList()
    } catch (_) {
      showError('Failed to mark as unread')
    }
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
    } catch (_) {
      showError('Failed to move message')
    }
  }

  async function handleShowSource() {
    if (rawSource !== null) { setShowSource(v => !v); return }
    try {
      const src = await mail.source(uid, folder)
      setRawSource(src)
      setShowSource(true)
    } catch (_) {
      showError('Failed to load message source')
    }
  }

  if (!uid) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-5">
        <Orb size={160} color={theme === 'light' ? '14,116,144' : '139,92,246'} />
        <div className="text-center">
          <p className="text-sm">Select a message to read</p>
          <p className="text-xs mt-1 text-zinc-700">r=reply · f=forward · d=delete · j/k=navigate</p>
        </div>
      </div>
    )
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm"><DecryptedText text="Loading…" speed={40} /></div>
  if (error) return <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{error}</div>
  if (!message) return null

  const displayHtml = showImages ? message.html : blockImages(message.html || '')
  const needsImageWarning = message.html && hasExternalImages(message.html)

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {confirmDelete && (
        <div className="bg-zinc-800 border-b border-zinc-700 px-4 py-3 flex flex-wrap items-center gap-2 lg:gap-3">
          <span className="text-sm text-zinc-300 flex-1">Delete this message permanently?</span>
          {deleteError && <span className="text-xs text-red-400">{deleteError}</span>}
          <button onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">Delete</button>
          <button onClick={() => { setConfirmDelete(false); setDeleteError('') }} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 transition-colors">Cancel</button>
        </div>
      )}

      {actionError && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2.5 text-xs text-red-400">
          {actionError}
        </div>
      )}

      <div className="px-4 lg:px-6 py-4 border-b border-zinc-800/60 flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2 leading-tight tracking-tight">{message.subject}</h2>
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

        <div className="flex items-center gap-0.5 lg:shrink-0 flex-wrap">
          <ActionBtn onClick={handleReply} title="Reply (r)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M5 3L1 7l4 4M1 7h6a3 3 0 013 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </ActionBtn>
          <ActionBtn onClick={handleReplyAll} title="Reply All (a)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M5 3L1 7l4 4M1 7h7M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </ActionBtn>
          <ActionBtn onClick={handleForward} title="Forward (f)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M9 3l4 4-4 4M13 7H7a3 3 0 00-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </ActionBtn>
          <ActionBtn onClick={handleMarkUnread} title="Mark as unread (u)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><rect x="1" y="5" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6l5 3.5 5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14" cy="3" r="2.5" fill="currentColor"/></svg>
          </ActionBtn>
          <div className="relative">
            <ActionBtn onClick={() => setShowMoveMenu(v => !v)} title="Move to folder">
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M1 3h5l2 2h5v7H1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </ActionBtn>
            {showMoveMenu && (
              <div className="absolute left-0 lg:left-auto lg:right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
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
          <ActionBtn onClick={() => window.print()} title="Print">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M3 5V2h8v3M3 10H1V5h12v5h-2M3 8h8v4H3z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </ActionBtn>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-6">
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
            <iframe
              srcDoc={displayHtml}
              sandbox="allow-same-origin"
              referrerPolicy="no-referrer"
              className="w-full border-0 rounded-lg ring-1 ring-zinc-700/50"
              style={{ minHeight: 400 }}
              title="Email content"
              onLoad={e => {
                const frame = e.target
                const measure = () => {
                  try {
                    const h = frame.contentDocument?.documentElement?.scrollHeight
                    if (h > 0) frame.style.height = h + 'px'
                  } catch (_) {}
                }
                measure()
                setTimeout(measure, 300)
                setTimeout(measure, 1200)
              }}
            />
          </>
        ) : (
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{message.text}</pre>
        )}

        {message.attachments?.length > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Attachments</p>
              {message.attachments.length > 1 && (
                <a href={mail.attachmentsZipUrl(uid, folder)} download="attachments.zip"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  Download all (.zip)
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              {message.attachments.map(a => (
                <AttachmentItem key={a.index} a={a} uid={uid} folder={folder} />
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
      className={`p-2 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 flex items-center justify-center rounded transition-colors ${danger ? 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
      {children}
    </button>
  )
}
