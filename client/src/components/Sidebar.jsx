import { useFolders } from '../hooks/useMail'
import { mail } from '../api/mail'

const FOLDER_ICONS = {
  INBOX: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M2 5l6 4 6-4M2 3h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Sent: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M14 2L2 7l5 2 2 5 5-12z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Drafts: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M11 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5l-2-3z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 2v3h3M6 9h4M6 12h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>,
  Trash: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M13 4H3M6 4V3h4v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Spam: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25"/><path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
}

function folderLabel(path) {
  return path.split(/[./]/).pop()
}

const EMPTIED_LABELS = ['trash', 'spam', 'junk', 'deleted']

function FolderItem({ folder, active, onClick, onEmpty }) {
  const label = folderLabel(folder.path)
  const icon = FOLDER_ICONS[label] || FOLDER_ICONS.INBOX
  const canEmpty = EMPTIED_LABELS.some(k => label.toLowerCase().includes(k))

  return (
    <div className="group flex items-center gap-1">
      <button onClick={() => onClick(folder.path)}
        className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${active ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
        <span className={active ? 'text-violet-400' : 'text-zinc-500'}>{icon}</span>
        <span className="truncate flex-1">{label}</span>
        {folder.unseen > 0 && (
          <span className="bg-violet-600 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
            {folder.unseen > 99 ? '99+' : folder.unseen}
          </span>
        )}
      </button>
      {canEmpty && (
        <button onClick={() => onEmpty(folder.path)} title={`Empty ${label}`}
          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-zinc-400 transition-all rounded">
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4 3V2h4v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </button>
      )}
    </div>
  )
}

export function Sidebar({ activeFolder, onFolderSelect, user, onLogout, onCompose, onSettings }) {
  const { folders } = useFolders()

  const topOrder = ['INBOX', 'Sent', 'Drafts']
  const bottomOrder = ['Trash', 'Spam', 'Junk']

  const sorted = [
    ...topOrder.map(n => folders.find(f => folderLabel(f.path) === n)).filter(Boolean),
    ...folders.filter(f => !topOrder.includes(folderLabel(f.path)) && !bottomOrder.includes(folderLabel(f.path))),
    ...bottomOrder.map(n => folders.find(f => folderLabel(f.path) === n)).filter(Boolean),
  ]

  async function handleEmpty(path) {
    try { await mail.emptyFolder(path) } catch (_) {}
  }

  return (
    <aside className="w-full md:w-56 shrink-0 h-full bg-zinc-950 border-r border-zinc-800/60 flex flex-col">
      <div className="p-4 border-b border-zinc-800/60">
        <div className="text-base font-semibold text-white mb-3">MagiCube</div>
        <button onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg py-2 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          Compose
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sorted.map(f => (
          <FolderItem key={f.path} folder={f} active={activeFolder === f.path} onClick={onFolderSelect} onEmpty={handleEmpty} />
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
