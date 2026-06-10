import { useState, useEffect } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export default function DecryptedText({ text, speed = 50, className = '' }) {
  const [display, setDisplay] = useState(() =>
    text.split('').map(c => c === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  )

  useEffect(() => {
    let idx = 0
    const id = setInterval(() => {
      setDisplay(
        text.split('').map((c, i) => {
          if (c === ' ') return ' '
          if (i <= idx) return c
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        }).join('')
      )
      idx++
      if (idx >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])

  return <span className={className}>{display}</span>
}
