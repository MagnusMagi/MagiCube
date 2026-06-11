import './FadeContent.css'

export default function FadeContent({ children, className = '', duration = 200 }) {
  return (
    <div
      className={`fade-content ${className}`}
      style={{ '--fade-duration': `${duration}ms` }}
    >
      {children}
    </div>
  )
}
