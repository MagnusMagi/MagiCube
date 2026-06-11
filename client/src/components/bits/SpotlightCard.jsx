import { useRef } from 'react'
import './SpotlightCard.css'

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(139, 92, 246, 0.06)', ...rest }) {
  const divRef = useRef(null)

  const handleMouseMove = e => {
    const rect = divRef.current.getBoundingClientRect()
    divRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    divRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    divRef.current.style.setProperty('--spotlight-color', spotlightColor)
  }

  return (
    <div ref={divRef} onMouseMove={handleMouseMove} className={`card-spotlight ${className}`} {...rest}>
      {children}
    </div>
  )
}
