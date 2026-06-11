import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useAuth } from './hooks/useAuth'
import { Login } from './components/Login'
import { Sidebar } from './components/Sidebar'
import FadeContent from './components/bits/FadeContent'
import { MessageList } from './components/MessageList'
import { MessageView } from './components/MessageView'
import { Compose } from './components/Compose'
import { Settings } from './components/Settings'
import { useFolders } from './hooks/useMail'

// Viewport zones:
//   mobile  < 768  : 3-panel GSAP  (sidebar | content-area)  +  (list | message) within content
//   tablet  768-1023: sidebar fixed + 2-panel GSAP (list | message) within content-area
//   desktop ≥ 1024 : full 3-panel static

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

  const sidebarRef  = useRef(null) // mobile: GSAP panel; tablet+: static (in flow)
  const contentRef  = useRef(null) // mobile: GSAP panel; tablet+: static flex-1
  const listRef     = useRef(null) // mobile+tablet: GSAP; desktop: static
  const messageRef  = useRef(null) // mobile+tablet: GSAP; desktop: static
  const prevPanelRef = useRef('sidebar')

  function applyPositions(panel, animate) {
    const w = window.innerWidth
    if (w >= 1024) return // desktop — CSS handles layout

    const dur = 0.34
    const ease = 'power2.inOut'
    const to = (el, props) => animate
      ? gsap.to(el, { ...props, duration: dur, ease })
      : gsap.set(el, props)

    if (w < 768) {
      // Mobile: sidebar vs content-area at top level
      const sidebarActive = panel === 'sidebar'
      to(sidebarRef.current,  { x: sidebarActive ? '0%'   : '-100%' })
      to(contentRef.current,  { x: sidebarActive ? '100%' : '0%'    })
      // List/message within content-area (never animate when sidebar is involved)
      const listActive = panel !== 'message'
      if (!animate || (prevPanelRef.current !== 'sidebar' && panel !== 'sidebar')) {
        gsap.to(listRef.current,    { x: listActive ? '0%' : '-100%', duration: dur, ease })
        gsap.to(messageRef.current, { x: listActive ? '100%' : '0%', duration: dur, ease })
      } else {
        gsap.set(listRef.current,    { x: listActive ? '0%' : '-100%' })
        gsap.set(messageRef.current, { x: listActive ? '100%' : '0%' })
      }
    } else {
      // Tablet: sidebar/content in flow — only animate list and message
      const listActive = panel !== 'message'
      to(listRef.current,    { x: listActive ? '0%' : '-100%' })
      to(messageRef.current, { x: listActive ? '100%' : '0%'  })
    }
  }

  // Initial positions — before first paint, after panels mount
  useLayoutEffect(() => {
    if (!listRef.current) return
    applyPositions(mobilePanel, false)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Animate on panel change
  useEffect(() => {
    if (!listRef.current) return
    applyPositions(mobilePanel, true)
    prevPanelRef.current = mobilePanel
  }, [mobilePanel]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resize: switch between zones
  useEffect(() => {
    function onResize() {
      if (!listRef.current) return
      const w = window.innerWidth
      if (w >= 1024) {
        ;[sidebarRef, contentRef, listRef, messageRef].forEach(r => r.current && gsap.set(r.current, { clearProps: 'transform' }))
      } else if (w >= 768) {
        // Entering tablet: sidebar/content back in flow, position list/message
        ;[sidebarRef, contentRef].forEach(r => r.current && gsap.set(r.current, { clearProps: 'transform' }))
        applyPositions(mobilePanel, false)
      } else {
        applyPositions(mobilePanel, false)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [mobilePanel]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="min-h-dvh bg-zinc-950 flex items-center justify-center">
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

  const sidebarProps = {
    activeFolder: folder,
    onFolderSelect: handleFolderSelect,
    user,
    onLogout: logout,
    onCompose: () => setCompose({}),
    onSettings: () => setShowSettings(true),
    theme,
    onToggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
  }

  return (
    <div className="h-dvh bg-zinc-950 flex overflow-hidden">
      {/* Outer wrapper: full-width block on mobile; flex row on md+ */}
      <div className="relative flex-1 overflow-hidden md:flex md:flex-row md:overflow-visible">

        {/* Sidebar panel:
            mobile  — absolute inset-0, part of GSAP stack
            tablet+ — relative flex-item, always visible */}
        <div ref={sidebarRef} className="absolute inset-0 flex flex-col md:relative md:inset-auto md:flex-none md:w-44 md:shrink-0 lg:w-56">
          <Sidebar {...sidebarProps} />
        </div>

        {/* Content area: list + message panels
            mobile  — absolute inset-0, GSAP moves as unit vs sidebar
            tablet+ — relative flex-1, list/message slide within
            desktop — lg:contents so list/message become direct flex items of outer wrapper */}
        <div ref={contentRef} className="absolute inset-0 flex md:relative md:inset-auto md:flex-1 md:overflow-hidden lg:contents">

          {/* List panel */}
          <div ref={listRef} className="absolute inset-0 flex flex-col lg:relative lg:inset-auto lg:flex-none">
            {/* Back button: mobile only — tablet has sidebar visible */}
            <div className="md:hidden shrink-0 flex items-center h-12 gap-3 px-3 border-b border-zinc-800/60 bg-zinc-950">
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

          {/* Message panel */}
          <div ref={messageRef} className="absolute inset-0 flex flex-col lg:relative lg:inset-auto lg:flex-1">
            {/* Back button: mobile + tablet — go back to list */}
            <div className="lg:hidden shrink-0 flex items-center h-12 gap-3 px-3 border-b border-zinc-800/60 bg-zinc-950">
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

        </div>
      </div>

      {compose !== null && (
        <Compose {...compose} draftFolder={draftFolder} onClose={() => setCompose(null)} />
      )}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
