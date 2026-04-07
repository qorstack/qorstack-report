'use client'

import Icon from '@/components/icon'
import { useAuth } from '@/providers/AuthContext'
import { motion } from 'framer-motion'

const CTASection = () => {
  const { openAuthModal, user, navigateHome } = useAuth()

  return (
    <section className='bg-background py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='mb-14 text-center'>
          <h2 className='font-headline mb-3 text-3xl font-bold text-foreground md:text-4xl'>Get Started</h2>
          <p className='mx-auto max-w-lg text-sm text-default-600'>
            Self-host for free or use our managed cloud. Same engine, your choice.
          </p>
        </motion.div>

        <div className='mx-auto grid max-w-4xl gap-6 md:grid-cols-2'>
          {/* Self-host */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className='flex flex-col rounded-2xl border border-default-200 bg-content2 p-8'>
            <div className='mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-default-300 bg-content3'>
              <Icon icon='lucide:container' className='h-5 w-5 text-default-600' />
            </div>
            <h3 className='mb-1 text-lg font-bold text-foreground'>Self-Hosted</h3>
            <p className='font-label mb-1 text-[11px] font-bold uppercase tracking-widest text-primary'>Free forever</p>
            <p className='mb-6 text-sm leading-relaxed text-default-600'>
              Full control over your data and infrastructure. Perfect for highly regulated industries.
            </p>

            {/* Benefits */}
            <div className='mb-6 mt-auto space-y-2.5'>
              {['Docker Image Support', 'Air-gapped installation', 'Unlimited documents'].map(item => (
                <div key={item} className='flex items-center gap-2.5 text-[13px] text-default-600'>
                  <Icon icon='lucide:check' className='h-3.5 w-3.5 shrink-0 text-primary' />
                  {item}
                </div>
              ))}
              <div className='flex items-center gap-2.5 text-[13px] text-primary'>
                <Icon icon='lucide:alert-triangle' className='h-3.5 w-3.5 shrink-0' />
                Fonts require manual install
              </div>
            </div>

            <a
              href='https://github.com/nicenathapong/qorstack-report'
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center justify-center gap-3 rounded-xl border border-default-300 px-6 py-3.5 text-sm font-medium text-foreground transition-all hover:border-default-400 hover:bg-content3'>
              <Icon icon='lucide:github' className='h-4 w-4' />
              Self-Hosted
            </a>
          </motion.div>

          {/* Cloud */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className='from-primary/8 flex flex-col rounded-2xl border border-primary/20 bg-gradient-to-b to-transparent p-8'>
            <div className='mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary'>
              <Icon icon='lucide:cloud' className='h-5 w-5 text-primary-foreground' />
            </div>
            <h3 className='mb-1 text-lg font-bold text-foreground'>Qorstack Cloud</h3>
            <p className='font-label mb-1 text-[11px] font-bold uppercase tracking-widest text-default-500'>
              Managed service
            </p>
            <p className='mb-6 text-sm leading-relaxed text-default-600'>
              Serverless document generation. Zero maintenance, infinite scale. Start building in minutes.
            </p>

            {/* Benefits */}
            <div className='mb-6 mt-auto space-y-2.5 rounded-xl border border-primary/20 bg-primary/5 p-4'>
              {['High Availability API', 'Visual Template Editor', 'Performance Insights'].map(item => (
                <div key={item} className='flex items-center gap-2.5 text-[13px] text-default-600'>
                  <Icon icon='lucide:check' className='h-3.5 w-3.5 shrink-0 text-primary' />
                  {item}
                </div>
              ))}
            </div>

            <button
              onClick={() => (user ? navigateHome() : openAuthModal('login'))}
              className='flex items-center justify-center gap-3 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90'>
              {user ? 'Go to Dashboard' : 'Create Account'}
              <Icon icon='lucide:arrow-right' className='h-4 w-4' />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default CTASection
