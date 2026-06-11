import { useState, useEffect } from 'react'
import { mail } from '../api/mail'

const TABS = ['Compose', 'Reading', 'Accounts', 'Vacation', 'Rules', 'Scheduled', 'Labels', 'Templates', 'Shortcuts']

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

const RULE_FIELDS    = ['from', 'to', 'subject']
const RULE_OPERATORS = ['contains', 'equals', 'starts with', 'ends with']
const RULE_ACTIONS   = ['move', 'flag', 'markRead', 'delete']
const RULE_FLAGS     = ['Starred', 'Important']

function readPref(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    if (typeof fallback === 'boolean') return v === 'true'
    if (typeof fallback === 'number') return Number(v) || fallback
    return v
  } catch { return fallback }
}

function Toggle({ value, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!value)}
      aria-pressed={value}
      aria-label={label}
      className={`shrink-0 relative w-10 h-[22px] p-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${value ? 'bg-violet-600' : 'bg-zinc-600'}`}
    >
      <span className={`absolute top-[2px] left-0 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
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
      <Toggle value={value} onChange={onChange} label={label} />
    </div>
  )
}

function inputCls(extra = '') {
  return `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors ${extra}`
}

function StyledSelect({ className = '', children, ...props }) {
  return (
    <div className={`relative ${className}`}>
      <select
        className="w-full appearance-none pr-8 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  )
}

// ─── Accounts Tab ────────────────────────────────────────────────────────────

function AccountsTab({ mail }) {
  const [accounts, setAccounts]   = useState([])
  const [newEmail, setNewEmail]   = useState('')
  const [newPass, setNewPass]     = useState('')
  const [status, setStatus]       = useState(null)   // { ok, msg }

  function loadAccounts() {
    if (!mail?.getAccounts) return
    try {
      const list = mail.getAccounts()
      setAccounts(Array.isArray(list) ? list : [])
    } catch (e) {
      setStatus({ ok: false, msg: String(e) })
    }
  }

  useEffect(() => { loadAccounts() }, [])

  function showStatus(ok, msg) {
    setStatus({ ok, msg })
    setTimeout(() => setStatus(null), 3000)
  }

  async function handleSwitch(index) {
    try {
      await mail.switchAccount(index)
      window.location.reload()
    } catch (e) {
      showStatus(false, String(e))
    }
  }

  async function handleRemove(index) {
    try {
      await mail.removeAccount(index)
      loadAccounts()
      showStatus(true, 'Account removed')
    } catch (e) {
      showStatus(false, String(e))
    }
  }

  async function handleAdd() {
    if (!newEmail.trim() || !newPass.trim()) {
      showStatus(false, 'Email and password are required')
      return
    }
    try {
      await mail.addAccount(newEmail.trim(), newPass)
      setNewEmail('')
      setNewPass('')
      loadAccounts()
      showStatus(true, 'Account added')
    } catch (e) {
      showStatus(false, String(e))
    }
  }

  return (
    <div className="space-y-6">
      {/* Account list */}
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Configured accounts</p>
        {accounts.length === 0 && (
          <p className="text-sm text-zinc-500 italic">No accounts found</p>
        )}
        <div className="space-y-1.5">
          {accounts.map((acc, i) => {
            const isActive = acc.active ?? i === 0
            return (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border ${isActive ? 'border-zinc-700/50 bg-zinc-800' : 'border-zinc-800 bg-zinc-800/40'}`}
              >
                <span className={`text-sm truncate ${isActive ? 'text-zinc-100 font-medium' : 'text-zinc-300'}`}>
                  {acc.email ?? acc}
                  {isActive && <span className="ml-2 text-xs text-zinc-500">(active)</span>}
                </span>
                {!isActive && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSwitch(i)}
                      className="text-xs px-2.5 py-1 rounded bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 transition-colors"
                    >
                      Switch
                    </button>
                    <button
                      onClick={() => handleRemove(i)}
                      className="text-xs px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-zinc-800/60" />

      {/* Add account */}
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Add account</p>
        <div className="space-y-2">
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="Email address"
            className={inputCls()}
          />
          <input
            type="password"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="Password / App password"
            className={inputCls()}
          />
          <button
            onClick={handleAdd}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {status && (
        <p className={`text-sm ${status.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {status.msg}
        </p>
      )}
    </div>
  )
}

// ─── Vacation Tab ─────────────────────────────────────────────────────────────

function VacationTab({ mail }) {
  const [active, setActive]         = useState(false)
  const [startDate, setStartDate]   = useState('')
  const [endDate, setEndDate]       = useState('')
  const [subject, setSubject]       = useState('Re: {subject}')
  const [body, setBody]             = useState('')
  const [status, setStatus]         = useState(null)

  useEffect(() => {
    if (!mail?.getVacation) return
    try {
      const v = mail.getVacation()
      if (v) {
        setActive(!!v.active)
        setStartDate(v.startDate ?? '')
        setEndDate(v.endDate ?? '')
        setSubject(v.subject ?? 'Re: {subject}')
        setBody(v.body ?? '')
      }
    } catch (e) {
      setStatus({ ok: false, msg: String(e) })
    }
  }, [])

  async function handleSave() {
    try {
      await mail.saveVacation({ active, subject, body, startDate, endDate })
      setStatus({ ok: true, msg: 'Vacation settings saved' })
      setTimeout(() => setStatus(null), 3000)
    } catch (e) {
      setStatus({ ok: false, msg: String(e) })
    }
  }

  return (
    <div className="space-y-5">
      <ToggleSetting
        label="Vacation responder"
        description="Automatically reply to incoming messages while you're away"
        value={active}
        onChange={setActive}
      />

      <div className="border-t border-zinc-800/60" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className={inputCls()}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className={inputCls()}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Subject template</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Re: {subject}"
          className={inputCls()}
        />
        <p className="mt-1.5 text-xs text-zinc-500">Use <code className="bg-zinc-800 px-1 rounded">{'{subject}'}</code> to include the original subject</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Message body</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={6}
          placeholder="I'm currently away and will reply when I return..."
          className={inputCls('resize-none')}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          Save
        </button>
        {status && (
          <p className={`text-sm ${status.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {status.msg}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────

function emptyNewRule() {
  return {
    name: '',
    condField: 'from',
    condOp: 'contains',
    condValue: '',
    actionType: 'move',
    actionFolder: '',
    actionFlag: 'Starred',
  }
}

function conditionSummary(rule) {
  return `${rule.condField} ${rule.condOp} "${rule.condValue}"`
}

function actionSummary(rule) {
  if (rule.actionType === 'move')     return `Move to "${rule.actionFolder}"`
  if (rule.actionType === 'flag')     return `Flag as ${rule.actionFlag}`
  if (rule.actionType === 'markRead') return 'Mark as read'
  if (rule.actionType === 'delete')   return 'Delete'
  return rule.actionType
}

function RulesTab({ mail }) {
  const [rules, setRules]   = useState([])
  const [form, setForm]     = useState(emptyNewRule)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!mail?.getRules) return
    try {
      const list = mail.getRules()
      setRules(Array.isArray(list) ? list : [])
    } catch (e) {
      setStatus({ ok: false, msg: String(e) })
    }
  }, [])

  function showStatus(ok, msg) {
    setStatus({ ok, msg })
    setTimeout(() => setStatus(null), 3000)
  }

  async function persist(updated) {
    try {
      await mail.saveRules(updated)
      setRules(updated)
    } catch (e) {
      showStatus(false, String(e))
    }
  }

  async function handleDelete(id) {
    await persist(rules.filter(r => r.id !== id))
    showStatus(true, 'Rule deleted')
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      showStatus(false, 'Rule name is required')
      return
    }
    if (!form.condValue.trim()) {
      showStatus(false, 'Condition value is required')
      return
    }
    if (form.actionType === 'move' && !form.actionFolder.trim()) {
      showStatus(false, 'Folder is required for move action')
      return
    }
    const newRule = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
      name: form.name.trim(),
      condField: form.condField,
      condOp: form.condOp,
      condValue: form.condValue.trim(),
      actionType: form.actionType,
      actionFolder: form.actionFolder.trim(),
      actionFlag: form.actionFlag,
    }
    await persist([...rules, newRule])
    setForm(emptyNewRule())
    showStatus(true, 'Rule added')
  }

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Rule list */}
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Active rules</p>
        {rules.length === 0 && (
          <p className="text-sm text-zinc-500 italic">No rules configured</p>
        )}
        <div className="space-y-1.5">
          {rules.map(rule => (
            <div
              key={rule.id}
              className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-800/40"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{rule.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">If {conditionSummary(rule)}</p>
                <p className="text-xs text-zinc-500">Then {actionSummary(rule)}</p>
              </div>
              <button
                onClick={() => handleDelete(rule.id)}
                className="shrink-0 text-xs px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-800/60" />

      {/* Add rule form */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Add rule</p>

        <input
          type="text"
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="Rule name"
          className={inputCls()}
        />

        {/* Condition row */}
        <div className="flex flex-wrap gap-2">
          <StyledSelect
            className="flex-1 min-w-[6rem]"
            value={form.condField}
            onChange={e => setField('condField', e.target.value)}
          >
            {RULE_FIELDS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </StyledSelect>
          <StyledSelect
            className="flex-1 min-w-[7rem]"
            value={form.condOp}
            onChange={e => setField('condOp', e.target.value)}
          >
            {RULE_OPERATORS.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </StyledSelect>
          <input
            type="text"
            value={form.condValue}
            onChange={e => setField('condValue', e.target.value)}
            placeholder="Value"
            className={inputCls('flex-1 min-w-[8rem]')}
          />
        </div>

        {/* Action row */}
        <div className="flex flex-wrap gap-2">
          <StyledSelect
            value={form.actionType}
            onChange={e => setField('actionType', e.target.value)}
          >
            {RULE_ACTIONS.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </StyledSelect>
          {form.actionType === 'move' && (
            <input
              type="text"
              value={form.actionFolder}
              onChange={e => setField('actionFolder', e.target.value)}
              placeholder="Folder name"
              className={inputCls('flex-1')}
            />
          )}
          {form.actionType === 'flag' && (
            <StyledSelect
              className="flex-1"
              value={form.actionFlag}
              onChange={e => setField('actionFlag', e.target.value)}
            >
              {RULE_FLAGS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </StyledSelect>
          )}
        </div>

        <button
          onClick={handleAdd}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Add rule
        </button>
      </div>

      {status && (
        <p className={`text-sm ${status.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {status.msg}
        </p>
      )}
    </div>
  )
}

// ─── Scheduled Queue Tab ─────────────────────────────────────────────────────

function ScheduledTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    mail.getQueue().then(d => { setItems(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function cancel(id) {
    await mail.cancelScheduled(id).catch(() => {})
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <div className="text-sm text-zinc-500 py-4">Loading…</div>
  if (!items.length) return <div className="text-sm text-zinc-500 py-4">No scheduled messages.</div>

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.id} className="flex items-start justify-between gap-3 bg-zinc-800 rounded-lg px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-zinc-200 truncate font-medium">{item.subject}</p>
            <p className="text-xs text-zinc-500 mt-0.5">To: {item.to}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{new Date(item.scheduledAt).toLocaleString()}</p>
          </div>
          <button onClick={() => cancel(item.id)} className="text-xs text-red-400 hover:text-red-300 shrink-0 transition-colors">Cancel</button>
        </div>
      ))}
    </div>
  )
}

// ─── Labels Tab ──────────────────────────────────────────────────────────────

const LABEL_COLORS = ['#a78bfa','#60a5fa','#34d399','#fbbf24','#f87171','#fb923c']

function LabelsTab() {
  const [defs, setDefs] = useState([])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(LABEL_COLORS[0])

  useEffect(() => {
    mail.getLabelDefs().then(setDefs).catch(() => {})
  }, [])

  async function save(next) {
    setDefs(next)
    await mail.saveLabelDefs(next).catch(() => {})
  }

  async function addLabel() {
    if (!newName.trim()) return
    const next = [...defs, { id: Math.random().toString(36).slice(2), name: newName.trim(), color: newColor }]
    await save(next)
    setNewName('')
  }

  async function remove(id) {
    await save(defs.filter(d => d.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {defs.map(d => (
          <div key={d.id} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-sm text-zinc-200 flex-1">{d.name}</span>
            <button onClick={() => remove(d.id)} className="text-xs text-zinc-600 hover:text-red-400 transition-colors">Remove</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
        <div className="flex gap-1">
          {LABEL_COLORS.map(c => (
            <button key={c} onClick={() => setNewColor(c)} aria-label={c} aria-pressed={newColor === c}
              className={`w-4 h-4 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-violet-400' : 'hover:scale-110'}`}
              style={{ background: c }} />
          ))}
        </div>
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLabel()}
          placeholder="Label name…" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500" />
        <button onClick={addLabel} className="text-xs text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 bg-zinc-800 rounded border border-zinc-700">Add</button>
      </div>
    </div>
  )
}

// ─── Templates Tab ───────────────────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState({ name: '', subject: '', body: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    mail.getTemplates().then(setTemplates).catch(() => {})
  }, [])

  async function create() {
    if (!form.name.trim()) return
    const res = await mail.createTemplate(form).catch(() => null)
    if (res?.ok) { setTemplates(prev => [...prev, res.template]); setForm({ name: '', subject: '', body: '' }); setCreating(false) }
  }

  async function remove(id) {
    await mail.deleteTemplate(id).catch(() => {})
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="space-y-3">
      {templates.map(t => (
        <div key={t.id} className="bg-zinc-800 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-zinc-200 font-medium">{t.name}</p>
            {t.subject && <p className="text-xs text-zinc-500 mt-0.5 truncate">Subject: {t.subject}</p>}
          </div>
          <button onClick={() => remove(t.id)} className="text-xs text-zinc-600 hover:text-red-400 transition-colors shrink-0">Remove</button>
        </div>
      ))}
      {creating ? (
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Template name" className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500" />
          <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject (optional)" className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500" />
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4} placeholder="Body…" className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none" />
          <div className="flex gap-2">
            <button onClick={create} className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded transition-colors">Save</button>
            <button onClick={() => setCreating(false)} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors border border-dashed border-zinc-700 rounded-lg px-4 py-2.5 w-full hover:border-violet-700">
          + New template
        </button>
      )}
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export function Settings({ onClose, mail: _mailProp }) {
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

  const showFooter = tab === 'Compose' || tab === 'Reading'

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
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Nav — horizontal scroll on mobile, vertical on desktop */}
          <nav className="shrink-0 lg:w-36 flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible border-b lg:border-b-0 lg:border-r border-zinc-800 px-2 py-1.5 lg:p-2 [mask-image:linear-gradient(to_right,transparent_0,black_8px,black_calc(100%-24px),transparent_100%)] lg:[mask-image:none]">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`shrink-0 lg:w-full text-left px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${tab === t ? 'bg-gradient-to-r from-zinc-800 to-zinc-700/50 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                {t}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-5">

            {tab === 'Compose' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your Name"
                    className={inputCls()}
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">Shown in the From field when sending mail</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Email Signature</label>
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

            {tab === 'Accounts' && <AccountsTab mail={mail} />}

            {tab === 'Vacation' && <VacationTab mail={mail} />}

            {tab === 'Rules' && <RulesTab mail={mail} />}

            {tab === 'Scheduled' && <ScheduledTab />}

            {tab === 'Labels' && <LabelsTab />}

            {tab === 'Templates' && <TemplatesTab />}

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

        {/* Footer — only for tabs with localStorage-backed save */}
        {showFooter && (
          <div className="flex items-center gap-3 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-zinc-800 shrink-0">
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
