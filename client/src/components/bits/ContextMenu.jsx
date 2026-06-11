import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function MenuItem({ item, onClose }) {
  const [submenuOpen, setSubmenuOpen] = useState(false)

  if (item.separator) return <div className="my-1 mx-2 border-t border-zinc-700/60" />

  if (item.header) return (
    <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider select-none">
      {item.header}
    </div>
  )

  const hasSubmenu = item.submenu?.length > 0

  return (
    <div
      className="relative mx-1"
      onMouseEnter={() => hasSubmenu && setSubmenuOpen(true)}
      onMouseLeave={() => hasSubmenu && setSubmenuOpen(false)}
    >
      <button
        type="button"
        onClick={hasSubmenu ? undefined : () => { item.onClick?.(); onClose() }}
        disabled={item.disabled}
        className={[
          'w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg transition-colors text-left select-none',
          item.danger
            ? 'text-red-400 hover:bg-red-500/10'
            : 'text-zinc-300 hover:bg-zinc-700/60',
          item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-default',
        ].join(' ')}
      >
        {item.icon && (
          <span className="shrink-0 w-4 flex items-center justify-center text-zinc-500">
            {item.icon}
          </span>
        )}
        <span className="flex-1 truncate">{item.label}</span>
        {hasSubmenu && (
          <svg className="w-3 h-3 text-zinc-600 shrink-0" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {hasSubmenu && submenuOpen && (
        <div className="absolute left-full top-0 ml-0.5 w-48 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl shadow-black/60 py-1.5 z-[10001]">
          {item.submenu.map((sub, i) => (
            <MenuItem key={i} item={sub} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ContextMenu({ open, x, y, items, onClose }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x, y })
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    if (!open) { setVisible(false); return }
    setPos({ x, y })
    setVisible(false)
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      const { width, height } = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      setPos({
        x: x + width > vw - 8 ? Math.max(8, x - width) : x,
        y: y + height > vh - 8 ? Math.max(8, y - height) : y,
      })
      setVisible(true)
    })
  }, [open, x, y])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    const onScroll = () => onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transform: `scale(${visible ? 1 : 0.95})`,
        transformOrigin: 'top left',
        transition: visible ? 'opacity 120ms ease, transform 120ms ease' : 'none',
      }}
      className="w-52 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl shadow-black/70 py-1.5"
    >
      {items.map((item, i) => (
        <MenuItem key={i} item={item} onClose={onClose} />
      ))}
    </div>,
    document.body
  )
}
