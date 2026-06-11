import { useState, useCallback } from 'react'

export function useContextMenu() {
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, items: [] })

  const openMenu = useCallback((e, items) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ open: true, x: e.clientX, y: e.clientY, items })
  }, [])

  const closeMenu = useCallback(() => {
    setMenu(prev => ({ ...prev, open: false }))
  }, [])

  return { menu, openMenu, closeMenu }
}
