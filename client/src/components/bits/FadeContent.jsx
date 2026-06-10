import { motion } from 'motion/react'

export default function FadeContent({ children, className = '', style, duration = 200, blur = false, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: blur ? 'blur(8px)' : 'blur(0px)', y: 3 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ duration: duration / 1000, ease: 'easeOut' }}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  )
}
