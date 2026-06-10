import { useState } from 'react'

export function Settings({ onClose }) {
  const [signature, setSignature] = useState(
    () => localStorage.getItem('magicube:signature') || ''
  )
  const [saved, setSaved] = useState(false)

  function handleSave() {
    localStorage.setItem('magicube:signature', signature)
    setSaved(true)
    setTimeout(onClose, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-200">Settings</span>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded">
            <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Email Signature</label>
            <textarea
              value={signature}
              onChange={e => setSignature(e.target.value)}
              rows={5}
              placeholder="-- &#10;Your Name&#10;your@email.com"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
            <p className="mt-1.5 text-xs text-zinc-500">Appended to new messages automatically</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-zinc-800">
          <button
            onClick={handleSave}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
          <button onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
