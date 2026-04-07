'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'
import { useRef, useState, useCallback } from 'react'

const demos = [
  {
    id: 'create',
    number: '01',
    title: 'Create Project',
    desc: 'Set up your workspace and generate API keys in seconds.',
    icon: 'lucide:folder-plus',
    video: '/videos/demo-create.mp4'
  },
  {
    id: 'upload',
    number: '02',
    title: 'Upload Template',
    desc: 'Drag & drop your .docx template — variables are auto-detected.',
    icon: 'lucide:upload',
    video: '/videos/demo-upload.mp4'
  },
  {
    id: 'build',
    number: '03',
    title: 'Build & Test',
    desc: 'Preview your report with sample data before going live.',
    icon: 'lucide:play-circle',
    video: '/videos/demo-build.mp4'
  },
  {
    id: 'api',
    number: '04',
    title: 'Call API',
    desc: 'Send JSON payload, receive pixel-perfect PDF back instantly.',
    icon: 'lucide:terminal',
    video: '/videos/demo-api.mp4'
  }
]

const easeExpoOut = [0.16, 1, 0.3, 1] as const

const VideoDemoSection = () => {
  const [activeDemo, setActiveDemo] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleDemoSwitch = useCallback((index: number) => {
    setActiveDemo(index)
    setIsPlaying(false)
    setProgress(0)
    // Video source changes via key prop, so it will reset
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setProgress((video.currentTime / (video.duration || 1)) * 100)
  }, [])

  return (
    <section id='demo' className='scroll-mt-20 py-24'>
      <div className='mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeExpoOut }}
          className='mb-12 text-center'>
          <span className='mb-4 inline-block rounded bg-primary-100 px-3 py-1.5 font-label text-[11px] font-bold uppercase tracking-[0.05em] text-primary dark:bg-content3'>
            See it in action
          </span>
          <h2
            className='mb-4 font-headline font-bold leading-tight tracking-tight text-foreground'
            style={{ fontSize: 'clamp(1.75rem, 1.25rem + 2vw, 2.5rem)' }}>
            From template to PDF in seconds
          </h2>
          <p className='mx-auto max-w-xl text-base leading-relaxed text-default-600'>
            Watch how Qorstack Report turns a Word template and JSON data into a pixel-perfect PDF document.
          </p>
        </motion.div>

        {/* 4-step selector + video player */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: easeExpoOut }}
          className='mx-auto max-w-5xl'>
          {/* Step cards */}
          <div className='mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {demos.map((demo, i) => (
              <button
                key={demo.id}
                onClick={() => handleDemoSwitch(i)}
                className={`group relative rounded-lg px-4 py-3.5 text-left transition-all duration-200 ${
                  activeDemo === i
                    ? 'bg-content2 dark:bg-content3'
                    : 'bg-content1 hover:bg-content2 dark:bg-content2 dark:hover:bg-content3'
                }`}>
                {/* Active indicator */}
                {activeDemo === i && (
                  <div className='absolute left-0 top-0 h-full w-[3px] rounded-l-lg bg-primary' />
                )}
                <div className='mb-2 flex items-center gap-2'>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded ${
                      activeDemo === i ? 'bg-primary text-primary-foreground' : 'bg-content4 text-default-600'
                    }`}>
                    <Icon icon={demo.icon} className='h-3.5 w-3.5' />
                  </div>
                  <span className={`font-label text-xl font-bold tabular-nums ${activeDemo === i ? 'text-primary' : 'text-default-400'}`}>{demo.number}</span>
                </div>
                <h4
                  className={`text-sm font-semibold leading-tight ${
                    activeDemo === i ? 'text-foreground' : 'text-default-600'
                  }`}>
                  {demo.title}
                </h4>
                <p className='mt-1 hidden text-xs leading-snug text-default-500 sm:block'>{demo.desc}</p>
              </button>
            ))}
          </div>

          {/* Video player */}
          <div className='overflow-hidden rounded-xl bg-content1 dark:bg-content2'>
            {/* Browser chrome */}
            <div className='flex items-center bg-default-100 px-4 py-2.5 dark:bg-content3'>
              <div className='flex space-x-1.5'>
                <div className='h-2.5 w-2.5 rounded-full bg-default-400' />
                <div className='h-2.5 w-2.5 rounded-full bg-default-400' />
                <div className='h-2.5 w-2.5 rounded-full bg-default-400' />
              </div>
              <div className='mx-auto font-label text-[11px] font-medium tracking-[0.02em] text-default-600'>
                qorstack.dev — {demos[activeDemo].title}
              </div>
              <div className='w-10' />
            </div>

            {/* Video area */}
            <div
              className='group relative aspect-video cursor-pointer bg-default-200 dark:bg-content1'
              onClick={togglePlay}>
              <video
                ref={videoRef}
                key={demos[activeDemo].id}
                className='h-full w-full object-contain'
                muted
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}>
                <source src={demos[activeDemo].video} type='video/mp4' />
              </video>

              {!isPlaying && (
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-default-200/90 dark:bg-content1/80'>
                  <div className='flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-105'>
                    <Icon icon='lucide:play' className='ml-1 h-6 w-6' />
                  </div>
                  <span className='mt-4 font-label text-[11px] font-bold uppercase tracking-[0.08em] text-default-600'>
                    {demos[activeDemo].title}
                  </span>
                </div>
              )}

              {/* Progress bar */}
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-default-200 dark:bg-content3'>
                <div className='h-full bg-primary transition-all' style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default VideoDemoSection
