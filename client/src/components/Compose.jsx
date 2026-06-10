import { useState, useRef } from 'react'
import { mail } from '../api/mail'

function buildSignatureBody(defaultBody) {
  if (defaultBody !== undefined) return defaultBody
  const sig = localStorage.getItem('magicube:signature')
  return sig ? `\n\n--\n${sig}` : ''
}

export function Compose({ onClose, defaultTo = '', defaultSubject = '', defaultBody, inReplyTo, references, draftFolder = 'Drafts' }) {
  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(() => buildSignatureBody(defaultBody))
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const fileRef = useRef(null)

  async function handleSend() {
    if (!to || !subject) { setStatus('To and Subject are required.'); return }
    setSending(true); setStatus('')
    try {
      await mail.send({ to, cc: cc || undefined, bcc: bcc || undefined, subject, text: body, inReplyTo, references }, files)
      setStatus('Sent!')
      setTimeout(onClose, 800)
    } catch (e) {
      setStatus(e.message)
    } finally {
      setSending(false)
    }
  }

  async function handleSaveDraft() {
    setStatus('Saving…')
    try {
      await mail.draft({ to, cc: cc || undefined, bcc: bcc || undefined, subject, text: body, folder: draftFolder })
      setStatus('Draft saved')
      setTimeout(onClose, 800)
    } catch (e) {
      setStatus(e.message)
    }
  }

  function handleFileChange(e) {
    setFiles(prev => [...prev, ...Array.from(e.target.files)])
    e.target.value = ''
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '88vh' }}>

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

        <div className="border-b border-zinc-800">
          <div className="flex items-center gap-3 px-5 py-2.5">
            <label className="text-xs text-zinc-500 w-12 shrink-0">To</label>
            <input type="text" value={to} onChange={e => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none" />
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
              <input type="text" value={cc} onChange={e => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none" />
            </div>
          )}
          {showBcc && (
            <div className="flex items-center gap-3 px-5 py-2.5 border-t border-zinc-800/60">
              <label className="text-xs text-zinc-500 w-12 shrink-0">Bcc</label>
              <input type="text" value={bcc} onChange={e => setBcc(e.target.value)}
                placeholder="bcc@example.com"
                className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none" />
            </div>
          )}
          <div className="flex items-center gap-3 px-5 py-2.5 border-t border-zinc-800/60">
            <label className="text-xs text-zinc-500 w-12 shrink-0">Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none" />
          </div>
        </div>

        <textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder="Write your message…"
          className="flex-1 bg-transparent px-5 py-4 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none resize-none min-h-[180px]" />

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

        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-zinc-800">
          <button onClick={handleSend} disabled={sending}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            {sending ? 'Sending…' : 'Send'}
          </button>
          <button onClick={handleSaveDraft} disabled={sending}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50">
            Save draft
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded ml-auto" title="Attach file">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 8l-5.5 5.5a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.535 3.535L6 11.243a1 1 0 01-1.414-1.414L10 4.414" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          {status && (
            <span className={`text-xs ${status === 'Sent!' || status === 'Draft saved' ? 'text-emerald-400' : 'text-red-400'}`}>
              {status}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
