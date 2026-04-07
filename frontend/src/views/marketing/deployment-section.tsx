'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'

const DeploymentSection = () => {
  return (
    <section className='bg-content1 py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='mb-16 max-w-2xl'>
          <span className='mb-3 block text-[11px] font-bold uppercase tracking-widest text-primary'>
            Deploy Your Way
          </span>
          <h2 className='mb-4 text-[clamp(1.5rem,3vw,2.5rem)] font-bold leading-tight text-foreground'>
            Self-host or use our cloud
          </h2>
          <p className='text-base leading-relaxed text-default-500'>
            Run Qorstack Report anywhere. Self-host with Docker for full control, or use our managed cloud API for
            zero-maintenance document generation.
          </p>
        </motion.div>

        <div className='grid gap-1 md:grid-cols-2'>
          {/* Self-host */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className='flex flex-col rounded-xl bg-background p-8 ring-1 ring-default-300/20 dark:bg-content2 lg:p-10'>
            <div className='mb-1 text-[11px] font-bold uppercase tracking-widest text-success'>Free Forever</div>
            <h3 className='mb-3 text-2xl font-bold text-foreground'>Self-hosted</h3>
            <p className='mb-8 leading-relaxed text-default-500'>
              Deploy with Docker on your own infrastructure. Unlimited documents, full privacy, no API limits.
              Everything you need, completely free.
            </p>
            <div className='mt-auto space-y-3'>
              <div className='rounded-lg bg-content1 p-4 font-mono text-[12px] text-default-300 dark:bg-content1'>
                <span className='text-default-500'># coming soon</span>
                <br />
                <span className='text-default-500'>$</span> docker pull qorstack/qorstack-report
                <br />
                <span className='text-default-500'>$</span> docker run -p 3000:3000 qorstack/qorstack-report
              </div>
              <a
                href='https://github.com/nicenathapong/qorstack-report'
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center justify-center gap-2 border-2 border-foreground bg-foreground px-6 py-3 text-sm font-bold text-white transition-all hover:bg-foreground/90'>
                <Icon icon='lucide:github' className='h-4 w-4' />
                Get Started
              </a>
            </div>
          </motion.div>

          {/* Cloud */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className='flex flex-col rounded-xl bg-background p-8 ring-1 ring-default-300/20 dark:bg-content2 lg:p-10'>
            <div className='mb-1 text-[11px] font-bold uppercase tracking-widest text-primary'>Managed Service</div>
            <h3 className='mb-3 text-2xl font-bold text-foreground'>Cloud API</h3>
            <p className='mb-8 leading-relaxed text-default-500'>
              Skip the infrastructure. Our managed cloud handles scaling, uptime, and updates. Supporters get exclusive
              monthly discounts.
            </p>
            <div className='mt-auto space-y-3'>
              <div className='space-y-2 rounded-lg bg-content1 p-4 dark:bg-content1'>
                {['Free tier included', 'Auto-scaling & 99.9% uptime', 'Supporter discount: up to 50% off'].map(
                  item => (
                    <div key={item} className='flex items-center gap-2 text-sm text-default-600'>
                      <Icon icon='lucide:check' className='h-3.5 w-3.5 text-primary' />
                      {item}
                    </div>
                  )
                )}
              </div>
              <button
                onClick={() => document.getElementById('supporters')?.scrollIntoView({ behavior: 'smooth' })}
                className='flex w-full items-center justify-center gap-2 bg-primary px-6 py-3 text-sm font-bold text-background transition-all hover:bg-primary/90'>
                View Cloud Plans
                <Icon icon='lucide:arrow-down' className='h-4 w-4' />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default DeploymentSection
