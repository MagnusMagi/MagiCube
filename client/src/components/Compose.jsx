import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { mail } from '../api/mail'

const UNDO_SECONDS = 10
const AUTO_SAVE_INTERVAL = 30000

const EMOJIS = [
  '😀','😂','😊','😍','🤔','😢','😎','🤝','👍','👎','❤️','🔥','✅','❌','⭐','🎉',
  '📧','📎','🗓️','⏰','💼','📊','📈','🚀','💡','🔑','🔒','⚠️','ℹ️','✏️','🗑️','📋',
  '🌟','💯','🎯','💬','📞','🏠','🌍','🤞','👋','🙏','💪','🤙','👏','🫡','🫂','🌈',
]

const COLORS = [
  { label: 'Default', value: null, cls: 'bg-zinc-400' },
  { label: 'Red',    value: '#FF453A', cls: 'bg-red-500' },
  { label: 'Orange', value: '#FF9F0A', cls: 'bg-orange-500' },
  { label: 'Green',  value: '#30D158', cls: 'bg-green-500' },
  { label: 'Blue',   value: '#0071E3', cls: 'bg-blue-500' },
  { label: 'Purple', value: '#BF5AF2', cls: 'bg-purple-500' },
]

const PRIORITIES = ['normal', 'high', 'low']
const PRIORITY_META = {
  normal: { label: 'Normal priority', symbol: '—',  cls: 'text-zinc-500 hover:text-zinc-300' },
  high:   { label: 'High priority',   symbol: '!',  cls: 'text-red-400 hover:text-red-300' },
  low:    { label: 'Low priority',    symbol: '↓',  cls: 'text-zinc-400 hover:text-zinc-300' },
}

function buildSignatureHtml(defaultBody) {
  if (defaultBody !== undefined) {
    if (/<[a-z][\s\S]*>/i.test(defaultBody)) return defaultBody
    return defaultBody.replace(/\n/g, '<br>')
  }
  const sig = localStorage.getItem('magicube:signature')
  return sig ? '<br><br>--<br>' + sig.replace(/\n/g, '<br>') : ''
}

function loadContacts() {
  try {
    const raw = localStorage.getItem('magicube:contacts')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function lastToken(value) {
  const parts = value.split(/[,\s]+/)
  return parts[parts.length - 1].trim()
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function AddressInput({ value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const contacts = useRef(loadContacts())
  const wrapperRef = useRef(null)
  const dropdownRef = useRef(null)

  function updateDropdownPos() {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (rect) setDropdownStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: Math.max(288, rect.width), zIndex: 10000 })
  }

  function getSuggestions(token) {
    if (!contacts.current.length) return []
    if (!token) return contacts.current.slice(0, 8)
    return contacts.current
      .filter(c => c.name.toLowerCase().includes(token.toLowerCase()) || c.address.toLowerCase().includes(token.toLowerCase()))
      .slice(0, 8)
  }

  function handleChange(e) {
    onChange(e.target.value)
    const filtered = getSuggestions(lastToken(e.target.value))
    setSuggestions(filtered)
    setActiveIdx(-1)
    if (filtered.length > 0) updateDropdownPos()
    setOpen(filtered.length > 0)
  }

  function handleFocus() {
    const filtered = getSuggestions(lastToken(value))
    if (filtered.length > 0) {
      updateDropdownPos()
      setSuggestions(filtered)
      setOpen(true)
    }
  }

  function handleSelect(contact) {
    const token = lastToken(value)
    const prefix = value.slice(0, value.length - token.length)
    onChange(prefix + contact.address + ', ')
    setSuggestions([])
    setActiveIdx(-1)
    setOpen(false)
  }

  useEffect(() => {
    function onDown(e) {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <input
        type="text" value={value} onChange={handleChange} onFocus={handleFocus}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); return }
          if (!open) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIdx(i => Math.max(i - 1, -1))
          } else if (e.key === 'Enter' && activeIdx >= 0 && suggestions[activeIdx]) {
            e.preventDefault()
            handleSelect(suggestions[activeIdx])
          }
        }}
        placeholder={placeholder} spellCheck="true"
        className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
      />
      {open && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map((c, i) => (
            <button key={i} type="button"
              onPointerDown={e => { e.preventDefault(); handleSelect(c) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors flex flex-col ${i === activeIdx ? 'bg-zinc-700' : 'hover:bg-zinc-700'}`}>
              <span className="text-zinc-200 font-medium">{c.name}</span>
              <span className="text-zinc-500 text-xs">{c.address}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

function ToolbarButton({ onMouseDown, title, children }) {
  return (
    <button type="button"
      onMouseDown={onMouseDown}
      onTouchEnd={e => onMouseDown?.(e)}  // C2: fire on touch too (iOS doesn't reliably fire mousedown)
      title={title}
      className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors font-medium select-none">
      {children}
    </button>
  )
}

function EmojiPicker({ onSelect }) {
  return (
    <div className="absolute bottom-full right-0 mb-1 z-50 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl p-2 w-60">
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJIS.map((emoji, i) => (
          <button key={i} type="button"
            onMouseDown={e => { e.preventDefault(); onSelect(emoji) }}
            className="text-base p-1 rounded hover:bg-zinc-700 transition-colors text-center leading-none">
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

function ColorPicker({ onSelect }) {
  return (
    <div className="absolute bottom-full left-0 mb-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-1.5 flex gap-1.5">
      {COLORS.map(c => (
        <button key={c.label} type="button" title={c.label}
          onMouseDown={e => { e.preventDefault(); onSelect(c.value) }}
          className={`w-5 h-5 rounded-full ${c.cls} hover:scale-110 transition-transform border border-zinc-600`} />
      ))}
    </div>
  )
}

function RichToolbar({ editorRef }) {
  const [showEmoji, setShowEmoji] = useState(false)
  const [showColor, setShowColor] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const savedRangeRef = useRef(null)

  // C2: wrap execCommand in try/catch — unreliable on iOS 17+
  function exec(cmd, val) {
    return e => {
      e.preventDefault()
      editorRef.current?.focus()
      try { document.execCommand(cmd, false, val ?? null) } catch (_) {}
    }
  }

  // L3: inline link input instead of window.prompt (blocked on iOS)
  function handleLink(e) {
    e.preventDefault()
    const sel = window.getSelection()
    if (sel?.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    setLinkUrl('https://')
    setShowLinkInput(true)
  }

  function commitLink() {
    if (linkUrl) {
      editorRef.current?.focus()
      const sel = window.getSelection()
      if (savedRangeRef.current) { sel?.removeAllRanges(); sel?.addRange(savedRangeRef.current) }
      try { document.execCommand('createLink', false, linkUrl) } catch (_) {}
    }
    setShowLinkInput(false)
    setLinkUrl('')
    savedRangeRef.current = null
  }

  function handleColor(value) {
    editorRef.current?.focus()
    try {
      if (value) document.execCommand('foreColor', false, value)
      else document.execCommand('removeFormat', false, null)
    } catch (_) {}
    setShowColor(false)
  }

  function insertEmoji(emoji) {
    editorRef.current?.focus()
    try { document.execCommand('insertText', false, emoji) } catch (_) {}
    setShowEmoji(false)
  }

  return (
    <>
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700 bg-zinc-800/50">
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitLink() }
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl('') }
            }}
            autoFocus
            placeholder="https://"
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
          />
          <button type="button" onMouseDown={e => { e.preventDefault(); commitLink() }} onTouchEnd={e => { e.preventDefault(); commitLink() }}
            className="text-xs text-violet-400 hover:text-violet-300 px-2">Insert</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); setShowLinkInput(false); setLinkUrl('') }} onTouchEnd={e => { e.preventDefault(); setShowLinkInput(false); setLinkUrl('') }}
            className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
        </div>
      )}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-zinc-800/70 bg-zinc-800/20 flex-wrap">
      <ToolbarButton onMouseDown={exec('bold')} title="Bold (Ctrl+B)"><strong>B</strong></ToolbarButton>
      <ToolbarButton onMouseDown={exec('italic')} title="Italic (Ctrl+I)"><em>I</em></ToolbarButton>
      <ToolbarButton onMouseDown={exec('underline')} title="Underline (Ctrl+U)"><span className="underline">U</span></ToolbarButton>
      <ToolbarButton onMouseDown={exec('strikeThrough')} title="Strikethrough"><span className="line-through">S</span></ToolbarButton>
      <div className="w-px h-4 bg-zinc-700 mx-1" />
      <ToolbarButton onMouseDown={exec('formatBlock', 'h1')} title="Heading 1">H1</ToolbarButton>
      <ToolbarButton onMouseDown={exec('formatBlock', 'h2')} title="Heading 2">H2</ToolbarButton>
      <ToolbarButton onMouseDown={exec('formatBlock', 'pre')} title="Code block">
        <svg className="w-3.5 h-3.5 inline" viewBox="0 0 16 16" fill="none">
          <path d="M5 4L1 8l4 4M11 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </ToolbarButton>
      <div className="w-px h-4 bg-zinc-700 mx-1" />
      <ToolbarButton onMouseDown={handleLink} title="Insert link">
        <svg className="w-3.5 h-3.5 inline" viewBox="0 0 16 16" fill="none">
          <path d="M6.5 9.5a4 4 0 005.657 0l1.5-1.5a4 4 0 00-5.657-5.657L7.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M9.5 6.5a4 4 0 00-5.657 0L2.343 8A4 4 0 008 13.657L8.5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </ToolbarButton>
      <div className="w-px h-4 bg-zinc-700 mx-1" />
      <div className="relative">
        <ToolbarButton onMouseDown={e => { e.preventDefault(); setShowColor(v => !v); setShowEmoji(false) }} title="Text color">
          <svg className="w-4 h-4 inline" viewBox="0 0 16 16" fill="none">
            <path d="M4.5 13L8 3.5l3.5 9.5M5.5 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="3" y="14" width="10" height="1.2" fill="#FF453A" rx="0.6"/>
          </svg>
        </ToolbarButton>
        {showColor && <ColorPicker onSelect={handleColor} />}
      </div>
      <div className="w-px h-4 bg-zinc-700 mx-1" />
      <ToolbarButton onMouseDown={exec('insertOrderedList')} title="Numbered list">1.</ToolbarButton>
      <ToolbarButton onMouseDown={exec('insertUnorderedList')} title="Bullet list">
        <svg className="w-3.5 h-3.5 inline" viewBox="0 0 16 16" fill="none">
          <circle cx="2.5" cy="4" r="1" fill="currentColor"/>
          <circle cx="2.5" cy="8" r="1" fill="currentColor"/>
          <circle cx="2.5" cy="12" r="1" fill="currentColor"/>
          <path d="M6 4h8M6 8h8M6 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </ToolbarButton>
      <div className="w-px h-4 bg-zinc-700 mx-1" />
      <div className="relative">
        <ToolbarButton onMouseDown={e => { e.preventDefault(); setShowEmoji(v => !v); setShowColor(false) }} title="Insert emoji">
          <span className="text-sm leading-none">😊</span>
        </ToolbarButton>
        {showEmoji && <EmojiPicker onSelect={insertEmoji} />}
      </div>
    </div>
    </>
  )
}

export function Compose({ onClose, defaultTo = '', defaultSubject = '', defaultBody, inReplyTo, references, draftFolder = 'Drafts' }) {
  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [priority, setPriority] = useState('normal')
  const [readReceipt, setReadReceipt] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState('')

  const [undoState, setUndoState] = useState(null)
  const undoIntervalRef = useRef(null)
  const undoCancelledRef = useRef(false)

  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDropdown, setScheduleDropdown] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduling, setScheduling] = useState(false)

  const [size, setSize] = useState({ width: 672, height: 520 })
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isMobile = windowWidth < 768

  const fileRef = useRef(null)
  const editorRef = useRef(null)
  const isDirtyRef = useRef(false)
  const composeValuesRef = useRef({ to, cc, bcc, subject })

  useEffect(() => {
    composeValuesRef.current = { to, cc, bcc, subject }
    isDirtyRef.current = true
  }, [to, cc, bcc, subject])

  // Auto-save every 30s when dirty
  useEffect(() => {
    const id = setInterval(async () => {
      if (!isDirtyRef.current) return
      const { html, text } = getEditorContent()
      const vals = composeValuesRef.current
      if (!vals.to && !vals.subject && !text.trim()) return
      try {
        await mail.draft({ ...vals, cc: vals.cc || undefined, bcc: vals.bcc || undefined, html, text, folder: draftFolder })
        isDirtyRef.current = false
        setAutoSaveStatus('Auto-saved')
        setTimeout(() => setAutoSaveStatus(''), 2000)
      } catch (_) {}
    }, AUTO_SAVE_INTERVAL)
    return () => clearInterval(id)
  }, [draftFolder])

  // Cmd/Ctrl+Enter to send
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    return () => clearInterval(undoIntervalRef.current)
  }, [])

  function getEditorContent() {
    return {
      html: editorRef.current?.innerHTML ?? '',
      text: editorRef.current?.innerText ?? '',
    }
  }

  function handleEditorInput() {
    isDirtyRef.current = true
    const text = editorRef.current?.innerText ?? ''
    setWordCount(countWords(text))
  }

  // Paste images inline as base64
  function handleEditorPaste(e) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        const reader = new FileReader()
        reader.onload = ev => {
          try { document.execCommand('insertHTML', false, `<img src="${ev.target.result}" style="max-width:100%" />`) } catch (_) {}
        }
        reader.readAsDataURL(file)
        return
      }
    }
  }

  function handleDragOver(e) {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      setIsDragging(true)
    }
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) setFiles(prev => [...prev, ...dropped])
  }

  function handleResizeStart(e) {
    e.preventDefault()
    const startX = e.clientX, startY = e.clientY
    const startW = size.width, startH = size.height
    function onMove(ev) {
      setSize({
        width:  Math.max(480, Math.min(window.innerWidth  - 64, startW + ev.clientX - startX)),
        height: Math.max(380, Math.min(window.innerHeight - 64, startH + ev.clientY - startY)),
      })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const initialHtml = buildSignatureHtml(defaultBody)

  function buildPayload() {
    const { html, text } = getEditorContent()
    return {
      to, cc: cc || undefined, bcc: bcc || undefined,
      subject, html, text, inReplyTo, references,
      ...(priority !== 'normal' && { priority }),
      ...(readReceipt && { readReceipt: true }),
    }
  }

  async function executeSend(payload) {
    setSending(true)
    setStatus('')
    try {
      await mail.send(payload, files)
      setStatus('Sent!')
      setTimeout(onClose, 800)
    } catch (e) {
      setStatus(e.message)
    } finally {
      setSending(false)
    }
  }

  function handleSend() {
    if (!to || !subject) { setStatus('To and Subject are required.'); return }
    const payload = buildPayload()
    undoCancelledRef.current = false
    let countdown = UNDO_SECONDS
    setUndoState({ countdown })
    undoIntervalRef.current = setInterval(() => {
      countdown -= 1
      if (undoCancelledRef.current) {
        clearInterval(undoIntervalRef.current)
        setUndoState(null)
        return
      }
      if (countdown <= 0) {
        clearInterval(undoIntervalRef.current)
        setUndoState(null)
        executeSend(payload)
        return
      }
      setUndoState({ countdown })
    }, 1000)
  }

  function handleCancelUndo() {
    undoCancelledRef.current = true
    clearInterval(undoIntervalRef.current)
    setUndoState(null)
    setStatus('')
  }

  async function handleSaveDraft() {
    setStatus('Saving…')
    const { html, text } = getEditorContent()
    try {
      await mail.draft({ to, cc: cc || undefined, bcc: bcc || undefined, subject, html, text, folder: draftFolder })
      isDirtyRef.current = false
      setStatus('Draft saved')
      setTimeout(onClose, 800)
    } catch (e) { setStatus(e.message) }
  }

  async function handleScheduleSend() {
    if (!to || !subject) { setStatus('To and Subject are required.'); return }
    if (!scheduledAt) { setStatus('Please pick a date and time.'); return }
    setScheduling(true)
    setStatus('')
    const { html, text } = getEditorContent()
    try {
      await mail.scheduleSend({
        to, cc: cc || undefined, bcc: bcc || undefined, subject, html, text,
        inReplyTo, references, scheduledAt: new Date(scheduledAt).toISOString(),
      })
      setStatus('Scheduled!')
      setTimeout(onClose, 800)
    } catch (e) { setStatus(e.message) }
    finally { setScheduling(false); setShowSchedule(false); setScheduleDropdown(false) }
  }

  function handleFileChange(e) {
    setFiles(prev => [...prev, ...Array.from(e.target.files)])
    e.target.value = ''
  }

  function cyclePriority() {
    const idx = PRIORITIES.indexOf(priority)
    setPriority(PRIORITIES[(idx + 1) % PRIORITIES.length])
  }

  const isSuccess = status === 'Sent!' || status === 'Draft saved' || status === 'Scheduled!'
  const pMeta = PRIORITY_META[priority]

  return (
    <div className={`fixed inset-0 z-50 flex ${isMobile ? '' : 'items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 bg-black/60 backdrop-blur-sm'}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col overflow-hidden ${isMobile ? 'w-full h-full bg-zinc-950' : 'bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl'}`}
        style={isMobile ? undefined : { width: size.width, height: size.height, maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100dvh - 2rem)' }}
      >
        {/* Drag-and-drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-900/80 border-2 border-dashed border-violet-500 rounded-2xl pointer-events-none">
            <div className="text-center">
              <svg className="w-10 h-10 text-violet-400 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v10M7 10l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <p className="text-zinc-300 text-sm font-medium">Drop files to attach</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium text-zinc-200">
              {inReplyTo ? 'Reply' : defaultSubject?.startsWith('Fwd:') ? 'Forward' : 'New message'}
            </span>
            {priority === 'high' && (
              <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5 font-medium">High priority</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded">
            <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Address fields */}
        <div className="border-b border-zinc-800">
          <div className="flex items-center gap-3 px-5 py-2.5">
            <label className="text-xs text-zinc-500 w-12 shrink-0">To</label>
            <AddressInput value={to} onChange={setTo} placeholder="recipient@example.com" />
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setShowCc(v => !v)}
                className={`text-xs transition-colors ${showCc ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Cc</button>
              <button onClick={() => setShowBcc(v => !v)}
                className={`text-xs transition-colors ${showBcc ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Bcc</button>
            </div>
          </div>

          {showCc && (
            <div className="flex items-center gap-3 px-5 py-2.5 border-t border-zinc-800/60">
              <label className="text-xs text-zinc-500 w-12 shrink-0">Cc</label>
              <AddressInput value={cc} onChange={setCc} placeholder="cc@example.com" />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center gap-3 px-5 py-2.5 border-t border-zinc-800/60">
              <label className="text-xs text-zinc-500 w-12 shrink-0">Bcc</label>
              <AddressInput value={bcc} onChange={setBcc} placeholder="bcc@example.com" />
            </div>
          )}

          <div className="flex items-center gap-3 px-5 py-2.5 border-t border-zinc-800/60">
            <label className="text-xs text-zinc-500 w-12 shrink-0">Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Subject" spellCheck="true"
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none" />
          </div>
        </div>

        {/* Editor */}
        <div className="flex flex-col flex-1 min-h-0">
          <RichToolbar editorRef={editorRef} />
          <div
            ref={editorRef}
            contentEditable
            role="textbox"
            aria-label="Message body"
            aria-multiline="true"
            spellCheck="true"
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: initialHtml }}
            onInput={handleEditorInput}
            onPaste={handleEditorPaste}
            data-placeholder="Write your message…"
            className={[
              'flex-1 overflow-y-auto px-5 py-4 text-sm text-zinc-300 focus:outline-none min-h-[160px]',
              '[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-zinc-500 [&:empty]:before:pointer-events-none',
              '[&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-zinc-100 [&_h1]:my-2',
              '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-100 [&_h2]:my-1.5',
              '[&_pre]:bg-zinc-800 [&_pre]:rounded [&_pre]:px-3 [&_pre]:py-2 [&_pre]:text-xs [&_pre]:font-mono [&_pre]:my-2',
              '[&_a]:text-violet-400 [&_a]:underline',
            ].join(' ')}
            style={{ wordBreak: 'break-word' }}
          />
        </div>

        {/* Attachments */}
        {files.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-zinc-800 text-xs text-zinc-300 rounded px-2.5 py-1">
                <svg className="w-3 h-3 text-zinc-500 shrink-0" viewBox="0 0 12 12" fill="none">
                  <path d="M7 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V4L7 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                  <path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="truncate max-w-[120px]">{f.name}</span>
                <span className="text-zinc-600 tabular-nums">{(f.size / 1024).toFixed(0)}k</span>
                <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-zinc-500 hover:text-zinc-200 ml-0.5">✕</button>
              </span>
            ))}
          </div>
        )}

        {/* Undo send toast */}
        {undoState && (
          <div className="mx-4 mb-2 flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm">
            <span className="text-zinc-300">
              Sending in <span className="text-violet-400 font-medium tabular-nums">{undoState.countdown}s</span>…
            </span>
            <button onClick={handleCancelUndo}
              className="text-sm text-zinc-200 bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded-md transition-colors font-medium">
              Cancel
            </button>
          </div>
        )}

        {/* Scheduled send picker */}
        {showSchedule && (
          <div className="mx-4 mb-2 flex flex-col sm:flex-row sm:items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3">
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleScheduleSend} disabled={scheduling}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
                {scheduling ? 'Scheduling…' : 'Schedule'}
              </button>
              <button onClick={() => { setShowSchedule(false); setScheduleDropdown(false) }}
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`flex items-center gap-2 px-5 border-t border-zinc-800 ${isMobile ? 'pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]' : 'py-3.5'}`}>
          <div className="flex items-stretch relative shrink-0">
            <button onClick={handleSend} disabled={sending || !!undoState}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-l-lg transition-colors"
              title="Send (Ctrl+Enter)">
              {sending ? 'Sending…' : 'Send'}
            </button>
            <button onClick={() => setScheduleDropdown(v => !v)} disabled={sending || !!undoState}
              className="bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white text-sm px-2 py-2 rounded-r-lg border-l border-violet-500 transition-colors"
              title="Schedule send">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {scheduleDropdown && !showSchedule && (
              <div className="absolute left-0 bottom-full mb-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                <button type="button" onClick={() => { setShowSchedule(true); setScheduleDropdown(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <path d="M8 9.5v2.5M6.5 11H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Schedule send
                </button>
              </div>
            )}
          </div>

          <button onClick={handleSaveDraft} disabled={sending || !!undoState}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 shrink-0">
            Save draft
          </button>

          <div className="w-px h-4 bg-zinc-800 mx-0.5 shrink-0" />

          {/* Priority cycle button */}
          <button onClick={cyclePriority} title={pMeta.label} aria-label={pMeta.label}
            className={`px-2 py-1.5 rounded text-sm font-bold transition-colors shrink-0 ${pMeta.cls}`}>
            {pMeta.symbol}
          </button>

          {/* Read receipt toggle */}
          <button onClick={() => setReadReceipt(v => !v)}
            title={readReceipt ? 'Read receipt requested' : 'Request read receipt'}
            aria-label={readReceipt ? 'Read receipt requested' : 'Request read receipt'}
            aria-pressed={readReceipt}
            className={`p-1.5 rounded transition-colors shrink-0 ${readReceipt ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M1 9l4 4L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 9l4 4 4-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={readReceipt ? 1 : 0.25}/>
            </svg>
          </button>

          <div className="flex-1" />

          {/* Auto-save / word count */}
          {autoSaveStatus ? (
            <span className="text-xs text-zinc-500 shrink-0">{autoSaveStatus}</span>
          ) : (
            <span className="text-xs text-zinc-600 tabular-nums shrink-0">{wordCount}w</span>
          )}

          {/* Attach file */}
          <button onClick={() => fileRef.current?.click()}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded shrink-0"
            title={isMobile ? 'Attach file' : 'Attach file (or drag & drop)'}>
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 8l-5.5 5.5a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.535 3.535L6 11.243a1 1 0 01-1.414-1.414L10 4.414" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />

          {status && !undoState && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-md shrink-0 ${isSuccess ? 'text-emerald-300 bg-emerald-500/10' : 'text-red-300 bg-red-500/10 border border-red-500/20'}`}>
              {status}
            </span>
          )}
        </div>

        {/* Resize handle — desktop only */}
        {!isMobile && (
          <div onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-1 text-zinc-700 hover:text-zinc-500 transition-colors">
            <svg viewBox="0 0 8 8" className="w-2.5 h-2.5" fill="none">
              <path d="M7 1L1 7M7 4L4 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
