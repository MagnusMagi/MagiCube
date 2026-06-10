import { motion } from 'motion/react'

export default function Orb({ size = 180, color = '139,92,246' }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <motion.div
        style={{
          position: 'absolute',
          inset: -24,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${color},0.12) 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, rgba(${color},0.55), rgba(${color},0.12) 60%, transparent)`,
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
