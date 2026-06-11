import { useRef, useCallback, useEffect } from 'react'

const THRESHOLD = 80
const MAX_DRAG  = 120

export function useSwipe({ onSwipeLeft, onSwipeRight }) {
  const startX  = useRef(null)
  const startY  = useRef(null)
  const locked  = useRef(null)
  const dragX   = useRef(0)
  const contentRef   = useRef(null)
  const leftHintRef  = useRef(null)  // shown when swiping right (read/unread)
  const rightHintRef = useRef(null)  // shown when swiping left (delete)

  const onSwipeLeftRef  = useRef(onSwipeLeft)
  const onSwipeRightRef = useRef(onSwipeRight)
  useEffect(() => { onSwipeLeftRef.current  = onSwipeLeft  }, [onSwipeLeft])
  useEffect(() => { onSwipeRightRef.current = onSwipeRight }, [onSwipeRight])

  const resetHints = useCallback(() => {
    if (leftHintRef.current)  leftHintRef.current.style.opacity  = '0'
    if (rightHintRef.current) rightHintRef.current.style.opacity = '0'
  }, [])

  const onTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return  // M3: ignore multi-touch
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    dragX.current  = 0
    locked.current = null
    const el = contentRef.current
    if (el) el.style.transition = 'none'
  }, [])

  // H2: non-passive touchmove so we can preventDefault for horizontal swipes
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    function handleTouchMove(e) {
      if (startX.current === null) return
      const dx = e.touches[0].clientX - startX.current
      const dy = e.touches[0].clientY - startY.current

      if (!locked.current) {
        if (Math.abs(dx) > Math.abs(dy)) locked.current = 'h'
        else { locked.current = 'v'; return }
      }
      if (locked.current === 'v') return

      e.preventDefault()

      // Show only the relevant hint based on swipe direction
      if (leftHintRef.current)  leftHintRef.current.style.opacity  = dx > 0 ? '1' : '0'
      if (rightHintRef.current) rightHintRef.current.style.opacity = dx < 0 ? '1' : '0'

      const clamped = Math.sign(dx) * Math.min(Math.abs(dx), MAX_DRAG)
      dragX.current = clamped
      el.style.transform = `translateX(${clamped}px)`
    }

    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', handleTouchMove)
  }, []) // uses refs — no stale closure

  const onTouchEnd = useCallback(() => {
    if (startX.current === null) return
    const dx = dragX.current
    const el = contentRef.current

    if (Math.abs(dx) >= THRESHOLD) {
      if (dx < 0 && onSwipeLeftRef.current) {
        if (el) {
          el.style.transition = 'transform 200ms ease-in'
          el.style.transform  = 'translateX(-120%)'
        }
        setTimeout(() => {
          onSwipeLeftRef.current?.()
          if (el) { el.style.transition = 'none'; el.style.transform = '' }
          resetHints()
        }, 180)
        return
      } else if (dx > 0 && onSwipeRightRef.current) {
        onSwipeRightRef.current?.()
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

    resetHints()
    startX.current = null
    dragX.current  = 0
    locked.current = null
  }, [resetHints])

  return { contentRef, leftHintRef, rightHintRef, onTouchStart, onTouchEnd }
}
