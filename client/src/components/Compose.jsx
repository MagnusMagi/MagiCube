import { useState, useRef, useEffect, useCallback } from 'react'
import { mail } from '../api/mail'

const UNDO_SECONDS = 10

function buildSignatureHtml(defaultBody) {
  if (defaultBody !== undefined) {
    // If it looks like HTML already, use it as-is; otherwise convert plain text
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
  } catch {
    return []
  }
}

// Extract the last token being typed (after last comma or space)
function lastToken(value) {
  const parts = value.split(/[,\s]+/)
  return parts[parts.length - 1].trim()
}

function AddressInput({ label, value, onChange, placeholder, onFocus, onBlur }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const contacts = useRef(loadContacts())
  const wrapperRef = useRef(null)

  function handleChange(e) {
    onChange(e.target.value)
    const token = lastToken(e.target.value)
    if (token.length >= 1) {
      const filtered = contacts.current
        .filter(c =>
          c.name.toLowerCase().includes(token.toLowerCase()) ||
          c.address.toLowerCase().includes(token.toLowerCase())
        )
        .slice(0, 5)
      setSuggestions(filtered)
      setOpen(filtered.length > 0)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }

  function handleSelect(contact) {
    const token = lastToken(value)
    // Replace the last token with the chosen address
    const prefix = value.slice(0, value.length - token.length)
    const separator = prefix.length > 0 && !prefix.trimEnd().endsWith(',') ? '' : ''
    onChange(prefix + contact.address + ', ')
    setSuggestions([])
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false) }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        spellCheck="true"
        className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
      />
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map((c, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(c) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 transition-colors flex flex-col"
            >
              <span className="text-zinc-200 font-medium">{c.name}</span>
              <span className="text-zinc-500 text-xs">{c.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ToolbarButton({ onMouseDown, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      title={title}
      className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors font-medium select-none"
    >
      {children}
    </button>
  )
}

function RichToolbar({ editorRef }) {
  function exec(command, value) {
    return e => {
      e.preventDefault()
      editorRef.current?.focus()
      document.execCommand(command, false, value ?? null)
    }
  }

  function handleLink(e) {
    e.preventDefault()
    editorRef.current?.focus()
    const url = window.prompt('Enter URL:', 'https://')
    if (url) document.execCommand('createLink', false, url)
  }

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-zinc-800/70 bg-zinc-800/20 flex-wrap">
      <ToolbarButton onMouseDown={exec('bold')} title="Bold (Ctrl+B)">
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton onMouseDown={exec('italic')} title="Italic (Ctrl+I)">
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton onMouseDown={exec('underline')} title="Underline (Ctrl+U)">
        <span className="underline">U</span>
      </ToolbarButton>
      <div className="w-px h-4 bg-zinc-700 mx-1" />
      <ToolbarButton onMouseDown={handleLink} title="Insert link">
        <svg className="w-3.5 h-3.5 inline" viewBox="0 0 16 16" fill="none">
          <path d="M6.5 9.5a4 4 0 005.657 0l1.5-1.5a4 4 0 00-5.657-5.657L7.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M9.5 6.5a4 4 0 00-5.657 0L2.343 8A4 4 0 008 13.657L8.5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </ToolbarButton>
      <div className="w-px h-4 bg-zinc-700 mx-1" />
      <ToolbarButton onMouseDown={exec('insertOrderedList')} title="Ordered list">
        <svg className="w-3.5 h-3.5 inline" viewBox="0 0 16 16" fill="none">
          <path d="M6 4h8M6 8h8M6 12h8M2 4h.01M2 8h.01M2 12h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <text x="1.5" y="4.5" fontSize="3.5" fill="currentColor">1.</text>
        </svg>
        1.
      </ToolbarButton>
      <ToolbarButton onMouseDown={exec('insertUnorderedList')} title="Unordered list">
        <svg className="w-3.5 h-3.5 inline" viewBox="0 0 16 16" fill="none">
          <circle cx="2.5" cy="4" r="1" fill="currentColor"/>
          <circle cx="2.5" cy="8" r="1" fill="currentColor"/>
          <circle cx="2.5" cy="12" r="1" fill="currentColor"/>
          <path d="M6 4h8M6 8h8M6 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </ToolbarButton>
    </div>
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

  // Undo send state
  const [undoState, setUndoState] = useState(null) // { countdown, payloadRef }
  const undoIntervalRef = useRef(null)
  const undoCancelledRef = useRef(false)

  // Scheduled send state
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDropdown, setScheduleDropdown] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduling, setScheduling] = useState(false)

  const [size, setSize] = useState({ width: 672, height: 520 })

  const fileRef = useRef(null)
  const editorRef = useRef(null)

  function handleResizeStart(e) {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startW = size.width
    const startH = size.height
    function onMove(ev) {
      setSize({
        width: Math.max(480, Math.min(window.innerWidth - 64, startW + ev.clientX - startX)),
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

  // Initialize editor content once
  const initialHtml = buildSignatureHtml(defaultBody)

  function getEditorContent() {
    const html = editorRef.current?.innerHTML ?? ''
    const text = editorRef.current?.innerText ?? ''
    return { html, text }
  }

  function buildPayload() {
    const { html, text } = getEditorContent()
    return {
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      html,
      text,
      inReplyTo,
      references,
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

  // Cleanup interval on unmount
  useEffect(() => {
    return () => clearInterval(undoIntervalRef.current)
  }, [])

  async function handleSaveDraft() {
    setStatus('Saving…')
    const { html, text } = getEditorContent()
    try {
      await mail.draft({
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        html,
        text,
        folder: draftFolder,
      })
      setStatus('Draft saved')
      setTimeout(onClose, 800)
    } catch (e) {
      setStatus(e.message)
    }
  }

  async function handleScheduleSend() {
    if (!to || !subject) { setStatus('To and Subject are required.'); return }
    if (!scheduledAt) { setStatus('Please pick a date and time.'); return }
    setScheduling(true)
    setStatus('')
    const { html, text } = getEditorContent()
    try {
      await mail.scheduleSend({
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        html,
        text,
        inReplyTo,
        references,
        scheduledAt: new Date(scheduledAt).toISOString(),
      })
      setStatus('Scheduled!')
      setTimeout(onClose, 800)
    } catch (e) {
      setStatus(e.message)
    } finally {
      setScheduling(false)
      setShowSchedule(false)
      setScheduleDropdown(false)
    }
  }

  function handleFileChange(e) {
    setFiles(prev => [...prev, ...Array.from(e.target.files)])
    e.target.value = ''
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  const isSuccess = status === 'Sent!' || status === 'Draft saved' || status === 'Scheduled!'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: size.width, height: size.height, maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-200">
            {inReplyTo ? 'Reply' : defaultSubject?.startsWith('Fwd:') ? 'Forward' : 'New message'}
          </span>
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
            <AddressInput
              value={to}
              onChange={setTo}
              placeholder="recipient@example.com"
            />
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setShowCc(v => !v)}
                className={`text-xs transition-colors ${showCc ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Cc
              </button>
              <button
                onClick={() => setShowBcc(v => !v)}
                className={`text-xs transition-colors ${showBcc ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Bcc
              </button>
            </div>
          </div>

          {showCc && (
            <div className="flex items-center gap-3 px-5 py-2.5 border-t border-zinc-800/60">
              <label className="text-xs text-zinc-500 w-12 shrink-0">Cc</label>
              <AddressInput
                value={cc}
                onChange={setCc}
                placeholder="cc@example.com"
              />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center gap-3 px-5 py-2.5 border-t border-zinc-800/60">
              <label className="text-xs text-zinc-500 w-12 shrink-0">Bcc</label>
              <AddressInput
                value={bcc}
                onChange={setBcc}
                placeholder="bcc@example.com"
              />
            </div>
          )}

          <div className="flex items-center gap-3 px-5 py-2.5 border-t border-zinc-800/60">
            <label className="text-xs text-zinc-500 w-12 shrink-0">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              spellCheck="true"
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Rich text editor */}
        <div className="flex flex-col flex-1 min-h-0">
          <RichToolbar editorRef={editorRef} />
          <div
            ref={editorRef}
            contentEditable
            spellCheck="true"
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: initialHtml }}
            data-placeholder="Write your message…"
            className={[
              'flex-1 overflow-y-auto px-5 py-4 text-sm text-zinc-300 focus:outline-none min-h-[160px]',
              'prose prose-invert prose-sm max-w-none',
              '[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-zinc-600 [&:empty]:before:pointer-events-none',
            ].join(' ')}
            style={{ wordBreak: 'break-word' }}
          />
        </div>

        {/* Attachments */}
        {files.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-zinc-800 text-xs text-zinc-300 rounded px-2.5 py-1">
                <span className="truncate max-w-[140px]">{f.name}</span>
                <button onClick={() => removeFile(i)} className="text-zinc-500 hover:text-zinc-200 ml-1">✕</button>
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
            <button
              onClick={handleCancelUndo}
              className="text-sm text-zinc-200 bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded-md transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Scheduled send picker */}
        {showSchedule && (
          <div className="mx-4 mb-2 flex flex-col sm:flex-row sm:items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleScheduleSend}
                disabled={scheduling}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                {scheduling ? 'Scheduling…' : 'Schedule'}
              </button>
              <button
                onClick={() => { setShowSchedule(false); setScheduleDropdown(false) }}
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-zinc-800">
          {/* Send + schedule dropdown group */}
          <div className="flex items-stretch relative">
            <button
              onClick={handleSend}
              disabled={sending || !!undoState}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-l-lg transition-colors"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
            <button
              onClick={() => setScheduleDropdown(v => !v)}
              disabled={sending || !!undoState}
              className="bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white text-sm px-2 py-2 rounded-r-lg border-l border-violet-500 transition-colors"
              title="Schedule send"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {scheduleDropdown && !showSchedule && (
              <div className="absolute left-0 bottom-full mb-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                <button
                  type="button"
                  onClick={() => { setShowSchedule(true); setScheduleDropdown(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
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

          <button
            onClick={handleSaveDraft}
            disabled={sending || !!undoState}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            Save draft
          </button>

          {/* Attach file */}
          <button
            onClick={() => fileRef.current?.click()}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded ml-auto"
            title="Attach file"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 8l-5.5 5.5a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.535 3.535L6 11.243a1 1 0 01-1.414-1.414L10 4.414" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />

          {status && !undoState && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${isSuccess ? 'text-emerald-300 bg-emerald-500/10' : 'text-red-300 bg-red-500/10 border border-red-500/20'}`}>
              {status}
            </span>
          )}
        </div>

        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-1 text-zinc-700 hover:text-zinc-500 transition-colors"
        >
          <svg viewBox="0 0 8 8" className="w-2.5 h-2.5" fill="none">
            <path d="M7 1L1 7M7 4L4 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
