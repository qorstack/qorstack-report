import { motion, useInView } from 'framer-motion'
import React, { useRef } from 'react'

const ScrollReveal = ({
  children,
  delay = 0,
  className
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}>
      {children}
    </motion.div>
  )
}

export default ScrollReveal
