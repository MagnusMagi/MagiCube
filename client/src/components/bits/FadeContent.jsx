import { useState, useEffect } from 'react'

export default function FadeContent({ children, className = '', style, duration = 200, blur = false }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(3px)',
        transition: `opacity ${duration}ms ease, transform ${duration}ms ease`,
        ...(blur ? { filter: visible ? 'blur(0)' : 'blur(8px)' } : {}),
      }}
    >
      {children}
    </div>
  )
}
