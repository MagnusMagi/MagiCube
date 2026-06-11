import { useRef, useCallback } from 'react'

const THRESHOLD = 80   // px to trigger action
const MAX_DRAG  = 120  // px max visual travel

export function useSwipe({ onSwipeLeft, onSwipeRight }) {
  const startX  = useRef(null)
  const startY  = useRef(null)
  const locked  = useRef(null) // 'h' | 'v' | null
  const dragX   = useRef(0)
  const contentRef = useRef(null)

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    dragX.current  = 0
    locked.current = null
    const el = contentRef.current
    if (el) el.style.transition = 'none'
  }, [])

  const onTouchMove = useCallback((e) => {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    if (!locked.current) {
      if (Math.abs(dx) > Math.abs(dy)) locked.current = 'h'
      else { locked.current = 'v'; return }
    }
    if (locked.current === 'v') return

    const clamped = Math.sign(dx) * Math.min(Math.abs(dx), MAX_DRAG)
    dragX.current = clamped
    const el = contentRef.current
    if (el) el.style.transform = `translateX(${clamped}px)`
  }, [])

  const onTouchEnd = useCallback(() => {
    if (startX.current === null) return
    const dx = dragX.current
    const el = contentRef.current

    if (Math.abs(dx) >= THRESHOLD) {
      if (dx < 0 && onSwipeLeft) {
        if (el) {
          el.style.transition = 'transform 200ms ease-in'
          el.style.transform  = 'translateX(-120%)'
        }
        setTimeout(() => {
          onSwipeLeft()
          if (el) { el.style.transition = 'none'; el.style.transform = '' }
        }, 180)
      } else if (dx > 0 && onSwipeRight) {
        onSwipeRight()
        if (el) {
          el.style.transition = 'transform 280ms cubic-bezier(0.34,1.56,0.64,1)'
          el.style.transform  = ''
        }
      }
    } else {
      if (el) {
        el.style.transition = 'transform 280ms cubic-bezier(0.34,1.56,0.64,1)'
        el.style.transform  = ''
      }
    }

    startX.current = null
    dragX.current  = 0
    locked.current = null
  }, [onSwipeLeft, onSwipeRight])

  return { contentRef, onTouchStart, onTouchMove, onTouchEnd }
}
