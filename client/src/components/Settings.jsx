import { useState } from 'react'

const TABS = ['Compose', 'Reading', 'Shortcuts']

const SHORTCUTS = [
  { key: 'r',      desc: 'Reply' },
  { key: 'a',      desc: 'Reply All' },
  { key: 'f',      desc: 'Forward' },
  { key: 'd',      desc: 'Delete message' },
  { key: 'u',      desc: 'Mark as unread' },
  { key: 'j / ↓',  desc: 'Next message' },
  { key: 'k / ↑',  desc: 'Previous message' },
  { key: 'Esc',    desc: 'Close compose / settings' },
]

function readPref(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    if (typeof fallback === 'boolean') return v === 'true'
    if (typeof fallback === 'number') return Number(v) || fallback
    return v
  } catch { return fallback }
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ width: 40, height: 22 }}
      className={`shrink-0 relative rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${value ? 'bg-violet-600' : 'bg-zinc-700'}`}
    >
      <span className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
    </button>
  )
}

function ToggleSetting({ label, description, value, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

export function Settings({ onClose }) {
  const [tab, setTab] = useState('Compose')
  const [displayName, setDisplayName]   = useState(() => readPref('magicube:displayName', ''))
  const [signature, setSignature]       = useState(() => readPref('magicube:signature', ''))
  const [perPage, setPerPage]           = useState(() => readPref('magicube:perPage', 50))
  const [blockImages, setBlockImages]   = useState(() => readPref('magicube:blockImages', true))
  const [autoMarkRead, setAutoMarkRead] = useState(() => readPref('magicube:autoMarkRead', true))
  const [saved, setSaved] = useState(false)

  function handleSave() {
    localStorage.setItem('magicube:displayName', displayName)
    localStorage.setItem('magicube:signature', signature)
    localStorage.setItem('magicube:perPage', String(perPage))
    localStorage.setItem('magicube:blockImages', String(blockImages))
    localStorage.setItem('magicube:autoMarkRead', String(autoMarkRead))
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 700)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <span className="text-sm font-medium text-zinc-200">Settings</span>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded">
            <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left nav */}
          <nav className="w-36 shrink-0 border-r border-zinc-800 p-2 flex flex-col gap-0.5">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${tab === t ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                {t}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">

            {tab === 'Compose' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">Shown in the From field when sending mail</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Signature</label>
                  <textarea
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    rows={6}
                    placeholder={"--\nYour Name\nyour@email.com"}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none font-mono"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">Appended to every new message automatically</p>
                </div>
              </div>
            )}

            {tab === 'Reading' && (
              <div className="space-y-6">
                <ToggleSetting
                  label="Block external images"
                  description="Images from external URLs are hidden until you click 'Show images'"
                  value={blockImages}
                  onChange={setBlockImages}
                />
                <div className="border-t border-zinc-800/60" />
                <ToggleSetting
                  label="Auto-mark as read"
                  description="Automatically mark messages as read when you open them"
                  value={autoMarkRead}
                  onChange={setAutoMarkRead}
                />
                <div className="border-t border-zinc-800/60" />
                <div>
                  <p className="text-sm text-zinc-200 mb-0.5">Messages per page</p>
                  <p className="text-xs text-zinc-500 mb-3">How many messages to load in the list at once</p>
                  <div className="flex gap-2">
                    {[25, 50, 100].map(n => (
                      <button key={n} onClick={() => setPerPage(n)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${perPage === n ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'Shortcuts' && (
              <div>
                <p className="text-xs text-zinc-500 mb-4">Active when focus is outside a text field</p>
                <div className="space-y-0.5">
                  {SHORTCUTS.map(s => (
                    <div key={s.key} className="flex items-center gap-4 py-2.5 border-b border-zinc-800/50 last:border-0">
                      <kbd className="shrink-0 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono px-2.5 py-1 rounded min-w-[3rem] text-center">
                        {s.key}
                      </kbd>
                      <span className="text-sm text-zinc-400">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer — hidden on Shortcuts tab */}
        {tab !== 'Shortcuts' && (
          <div className="flex items-center gap-3 px-5 py-3.5 border-t border-zinc-800 shrink-0">
            <button onClick={handleSave}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors min-w-[5rem]">
              {saved ? 'Saved ✓' : 'Save'}
            </button>
            <button onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
