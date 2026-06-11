import { useState, useEffect, useRef, useCallback } from 'react'
import { useFolders } from '../hooks/useMail'
import { mail } from '../api/mail'
import ShinyText from './bits/ShinyText'
import ClickSpark from './bits/ClickSpark'
import CountUp from './bits/CountUp'

const FOLDER_ICONS = {
  INBOX: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M2 5l6 4 6-4M2 3h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Sent: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M14 2L2 7l5 2 2 5 5-12z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Drafts: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M11 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5l-2-3z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 2v3h3M6 9h4M6 12h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>,
  Trash: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M13 4H3M6 4V3h4v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Spam: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25"/><path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
}

const SYSTEM_FOLDERS = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam', 'Junk']
const EMPTIED_LABELS = ['trash', 'spam', 'junk', 'deleted']

function folderLabel(path) {
  const raw = path.split(/[./]/).pop()
  return raw === raw.toUpperCase() ? raw[0] + raw.slice(1).toLowerCase() : raw
}

function isSystemFolder(label) {
  return SYSTEM_FOLDERS.includes(label)
}

function FolderItem({ folder, active, onClick, onEmpty, onRename, onDelete }) {
  const label = folderLabel(folder.path)
  const icon = FOLDER_ICONS[label] || FOLDER_ICONS.INBOX
  const canEmpty = EMPTIED_LABELS.some(k => label.toLowerCase().includes(k))
  const isSystem = isSystemFolder(label)

  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(label)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const renameInputRef = useRef(null)

  function handleRenameStart() {
    setRenameValue(label)
    setRenaming(true)
  }

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renaming])

  async function handleRenameConfirm() {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === label) {
      setRenaming(false)
      return
    }
    setRenaming(false)
    await onRename(folder.path, trimmed)
  }

  function handleRenameKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRenameConfirm()
    } else if (e.key === 'Escape') {
      setRenaming(false)
    }
  }

  async function handleDeleteConfirm() {
    setConfirmDelete(false)
    await onDelete(folder.path)
  }

  if (renaming) {
    return (
      <div className="flex items-center gap-1 px-1">
        <input
          ref={renameInputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={() => setRenaming(false)}
          className="flex-1 bg-zinc-800 text-zinc-200 text-sm rounded px-2 py-1.5 border border-violet-600/50 outline-none min-w-0"
        />
        <button
          onMouseDown={e => { e.preventDefault(); handleRenameConfirm() }}
          className="p-1 text-violet-400 hover:text-violet-300 transition-colors rounded shrink-0"
          title="Confirm rename"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    )
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800/80">
        <span className="text-xs text-zinc-400 flex-1 truncate">Delete "{label}"?</span>
        <button
          onClick={handleDeleteConfirm}
          className="text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors px-1"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirmDelete(false)}
          className="text-[10px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors px-1"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-1">
      <button
        onClick={() => onClick(folder.path)}
        className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${active ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
      >
        <span className={active ? 'text-violet-400' : 'text-zinc-500'}>{icon}</span>
        <span className="truncate flex-1">{label}</span>
        {folder.unseen > 0 && (
          <span className="bg-violet-600 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
            {folder.unseen > 99 ? '99+' : <CountUp key={folder.unseen} from={0} to={folder.unseen} duration={0.6} />}
          </span>
        )}
      </button>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
        {canEmpty && (
          <button
            onClick={() => onEmpty(folder.path)}
            title={`Empty ${label}`}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors rounded"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4 3V2h4v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
        )}
        {!isSystem && (
          <>
            <button
              onClick={handleRenameStart}
              title={`Rename ${label}`}
              className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors rounded"
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              title={`Delete ${label}`}
              className="p-1 text-zinc-600 hover:text-red-500 transition-colors rounded"
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function NewFolderInput({ onConfirm, onCancel }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  async function handleConfirm() {
    const trimmed = value.trim()
    if (!trimmed) {
      onCancel()
      return
    }
    await onConfirm(trimmed)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder="Folder name"
        className="flex-1 bg-zinc-800 text-zinc-200 text-sm rounded px-2 py-1.5 border border-violet-600/50 outline-none placeholder-zinc-600 min-w-0"
      />
      <button
        onMouseDown={e => { e.preventDefault(); handleConfirm() }}
        className="p-1 text-violet-400 hover:text-violet-300 transition-colors rounded shrink-0"
        title="Create folder"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  )
}

export function Sidebar({ activeFolder, onFolderSelect, user, onLogout, onCompose, onSettings }) {
  const { folders, refresh } = useFolders()
  const [creatingFolder, setCreatingFolder] = useState(false)
  const sseRetryRef = useRef(null)

  const topOrder = ['INBOX', 'Sent', 'Drafts']
  const bottomOrder = ['Trash', 'Spam', 'Junk']

  const sorted = [
    ...topOrder.map(n => folders.find(f => folderLabel(f.path) === n)).filter(Boolean),
    ...folders.filter(f => !topOrder.includes(folderLabel(f.path)) && !bottomOrder.includes(folderLabel(f.path))),
    ...bottomOrder.map(n => folders.find(f => folderLabel(f.path) === n)).filter(Boolean),
  ]

  const connectSSE = useCallback(() => {
    const es = new EventSource('/api/sse')

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'folders') {
          refresh()
        }
      } catch (_) {}
    }

    es.onerror = () => {
      es.close()
      sseRetryRef.current = setTimeout(() => {
        connectSSE()
      }, 30000)
    }

    return es
  }, [refresh])

  useEffect(() => {
    const es = connectSSE()
    return () => {
      es.close()
      if (sseRetryRef.current) {
        clearTimeout(sseRetryRef.current)
      }
    }
  }, [connectSSE])

  async function handleEmpty(path) {
    try { await mail.emptyFolder(path) } catch (_) {}
  }

  async function handleCreateFolder(name) {
    setCreatingFolder(false)
    try {
      await mail.createFolder(name)
      refresh()
    } catch (_) {}
  }

  async function handleRenameFolder(path, newName) {
    try {
      await mail.renameFolder(path, newName)
      refresh()
    } catch (_) {}
  }

  async function handleDeleteFolder(path) {
    try {
      await mail.deleteFolder(path)
      refresh()
    } catch (_) {}
  }

  return (
    <aside className="w-full md:w-56 shrink-0 h-full bg-zinc-950 border-r border-zinc-800/60 flex flex-col">
      <div className="p-4 border-b border-zinc-800/60">
        <ShinyText text="MagiCube" speed={4} color="#71717a" shineColor="#e4e4e7" className="text-base font-semibold mb-3 block" />
        <ClickSpark sparkColor="#a78bfa" sparkCount={8} sparkSize={8} sparkRadius={24} duration={500}>
          <button
            onClick={onCompose}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg py-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Compose
          </button>
        </ClickSpark>
      </div>

      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Folders</span>
        <button
          onClick={() => setCreatingFolder(true)}
          title="New folder"
          className="p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors rounded"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {creatingFolder && (
          <NewFolderInput
            onConfirm={handleCreateFolder}
            onCancel={() => setCreatingFolder(false)}
          />
        )}
        {sorted.map(f => (
          <FolderItem
            key={f.path}
            folder={f}
            active={activeFolder === f.path}
            onClick={onFolderSelect}
            onEmpty={handleEmpty}
            onRename={handleRenameFolder}
            onDelete={handleDeleteFolder}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-zinc-800/60">
        <div className="text-xs text-zinc-500 truncate mb-2 px-1">{user}</div>
        <div className="flex items-center gap-2">
          <button onClick={onLogout} className="flex-1 text-left text-xs text-zinc-500 hover:text-zinc-300 px-1 py-1 transition-colors">Sign out</button>
          <button onClick={onSettings} title="Settings" className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors rounded">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
