import { useState, useCallback } from 'react'

export function useContextMenu() {
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, items: [] })

  const openMenu = useCallback((e, items) => {
    e.preventDefault()
    e.stopPropagation()
    // L4: extract coordinates from touch events on iOS
    const touch = e.changedTouches?.[0] ?? e.touches?.[0]
    const x = touch ? touch.clientX : e.clientX
    const y = touch ? touch.clientY : e.clientY
    setMenu({ open: true, x, y, items })
  }, [])

  const closeMenu = useCallback(() => {
    setMenu(prev => ({ ...prev, open: false }))
  }, [])

  return { menu, openMenu, closeMenu }
}
