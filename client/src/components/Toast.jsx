import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'

function ToastItem({ toast, onDismiss }) {
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), toast.duration || 5000)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, toast.duration, onDismiss])

  const icons = {
    mail: (
      <svg className="w-4 h-4 text-violet-400 shrink-0" viewBox="0 0 16 16" fill="none">
        <path d="M2 5l6 4 6-4M2 3h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z"
          stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    success: (
      <svg className="w-4 h-4 text-green-400 shrink-0" viewBox="0 0 16 16" fill="none">
        <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
        <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 shadow-2xl max-w-sm w-full"
    >
      {icons[toast.type] || icons.mail}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-medium text-zinc-100 truncate">{toast.title}</p>
        )}
        {toast.body && (
          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{toast.body}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 rounded"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  )
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
