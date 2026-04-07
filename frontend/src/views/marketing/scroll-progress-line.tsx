'use client'

import { motion, useScroll, useSpring } from 'framer-motion'

const ScrollProgressLine = () => {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  return <motion.div className='fixed left-0 top-0 z-[9999] h-0.5 w-full origin-left bg-primary' style={{ scaleX }} />
}

export default ScrollProgressLine
