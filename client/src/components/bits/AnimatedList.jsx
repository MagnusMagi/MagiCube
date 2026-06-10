import { motion } from 'motion/react'
import { Children } from 'react'

export default function AnimatedList({ children, className = '' }) {
  const items = Children.toArray(children)
  return (
    <div className={className}>
      {items.map((child, i) => (
        <motion.div
          key={child.key || i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, delay: Math.min(i * 0.025, 0.25), ease: 'easeOut' }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}
