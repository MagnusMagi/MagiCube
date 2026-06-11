import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { Login } from './components/Login'
import { Sidebar } from './components/Sidebar'
import FadeContent from './components/bits/FadeContent'
import { MessageList } from './components/MessageList'
import { MessageView } from './components/MessageView'
import { Compose } from './components/Compose'
import { Settings } from './components/Settings'
import { useFolders } from './hooks/useMail'

export default function App() {
  const { user, loading, login, logout } = useAuth()
  const { folders } = useFolders()
  const [folder, setFolder] = useState('INBOX')
  const [activeUid, setActiveUid] = useState(null)
  const [compose, setCompose] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [listKey, setListKey] = useState(0)
  const [mobilePanel, setMobilePanel] = useState('sidebar')
  const [theme, setTheme] = useState(() => localStorage.getItem('magicube:theme') || 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('magicube:theme', theme)
  }, [theme])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { setCompose(null); setShowSettings(false) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Login onLogin={login} />

  function handleFolderSelect(path) {
    setFolder(path)
    setActiveUid(null)
    setMobilePanel('list')
  }

  function handleMessageSelect(uid) {
    setActiveUid(uid)
    setMobilePanel('message')
  }

  function handleMessageDeleted() {
    setActiveUid(null)
    setMobilePanel('list')
  }

  function handleRefreshList() { setListKey(k => k + 1) }

  const draftFolder = folders.find(f => f.path.split(/[./]/).pop() === 'Drafts')?.path || 'Drafts'
  const folderLabel = folder.split(/[./]/).pop()

  return (
    <div className="h-screen bg-zinc-950 flex overflow-hidden">
      {/* Sidebar panel */}
      <div className={`h-full ${mobilePanel === 'sidebar' ? 'flex flex-col flex-1' : 'hidden'} md:flex md:flex-col md:flex-none`}>
        <Sidebar
          activeFolder={folder}
          onFolderSelect={handleFolderSelect}
          user={user}
          onLogout={logout}
          onCompose={() => setCompose({})}
          onSettings={() => setShowSettings(true)}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        />
      </div>

      {/* Message list panel */}
      <div className={`h-full flex flex-col ${mobilePanel === 'list' ? 'flex-1' : 'hidden'} md:flex md:flex-none`}>
        <div className="md:hidden shrink-0 flex items-center h-12 gap-3 px-3 border-b border-zinc-800 bg-zinc-950">
          <button onClick={() => setMobilePanel('sidebar')}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors rounded">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
              <path d="M12 15L7 10l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="text-sm font-semibold text-zinc-200 truncate">{folderLabel}</span>
        </div>
        <FadeContent key={folder} className="flex-1 min-h-0 flex flex-col" duration={180}>
          <MessageList key={listKey} folder={folder} activeUid={activeUid} onSelect={handleMessageSelect} />
        </FadeContent>
      </div>

      {/* Message view panel */}
      <div className={`h-full flex flex-col ${mobilePanel === 'message' ? 'flex-1' : 'hidden'} md:flex md:flex-1`}>
        <div className="md:hidden shrink-0 flex items-center h-12 gap-3 px-3 border-b border-zinc-800 bg-zinc-950">
          <button onClick={() => setMobilePanel('list')}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors rounded">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
              <path d="M12 15L7 10l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="text-sm font-semibold text-zinc-200 truncate">{folderLabel}</span>
        </div>
        <FadeContent key={activeUid || 'empty'} className="flex-1 min-h-0 flex flex-col" duration={180}>
          <MessageView
            uid={activeUid}
            folder={folder}
            folders={folders}
            onDeleted={handleMessageDeleted}
            onRefreshList={handleRefreshList}
            onCompose={setCompose}
            theme={theme}
          />
        </FadeContent>
      </div>

      {compose !== null && (
        <Compose {...compose} draftFolder={draftFolder} onClose={() => setCompose(null)} />
      )}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
