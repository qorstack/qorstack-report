'use client'

import Icon from '@/components/icon'
import { motion } from 'framer-motion'

const roadmapPhases = [
  {
    status: 'live' as const,
    label: 'Released',
    title: 'Phase 1: Core Engine',
    items: [
      'Open Source (MIT)',
      'Cloud API (REST)',
      'Docker self-hosting',
      'Word templates (DOCX)',
      'PDF output',
      'Dynamic variables & tables',
      'Sorting, grouping & aggregates',
      'Image injection',
      'QR Code & Barcode',
      '1,500+ Google Fonts',
      'Thai language support',
      'Template version control',
      'Live PDF preview',
      'Node.js & .NET SDK',
      'Analytics dashboard'
    ]
  },
  {
    status: 'next' as const,
    label: 'In Progress',
    title: 'Phase 2: Visual Designer',
    items: ['DOCX & Excel output', 'Python & Go SDK', 'Batch generation API', 'Helm chart for K8s']
  },
  {
    status: 'later' as const,
    label: 'Planned',
    title: 'Phase 3: AI Document Logic',
    items: ['On-premise enterprise', 'Webhooks & callbacks', 'Template marketplace']
  }
]

const RoadmapSection = () => (
  <section className='bg-background py-24'>
    <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className='mb-14'>
        <h2 className='font-headline mb-3 text-2xl font-bold text-foreground md:text-3xl'>Looking forward.</h2>
        <p className='max-w-xl text-sm text-default-600'>
          Qorstack Report is actively developed in the open. Supporters get to vote on what ships first.
        </p>
      </motion.div>

      {/* Timeline */}
      <div className='relative'>
        <div className='absolute bottom-0 left-[15px] top-0 w-px bg-default-300 sm:left-[19px]' />

        <div className='space-y-12'>
          {roadmapPhases.map((phase, pi) => (
            <motion.div
              key={phase.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: pi * 0.1 }}
              className='relative pl-10 sm:pl-12'>
              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-0.5 flex h-[31px] w-[31px] items-center justify-center rounded-full border-2 bg-background sm:h-[39px] sm:w-[39px] ${
                  phase.status === 'live' ? 'border-primary' : 'border-default-300'
                }`}>
                <Icon
                  icon={
                    phase.status === 'live'
                      ? 'lucide:check'
                      : phase.status === 'next'
                        ? 'lucide:loader'
                        : 'lucide:circle'
                  }
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                    phase.status === 'live'
                      ? 'text-primary'
                      : phase.status === 'next'
                        ? 'text-default-500'
                        : 'text-default-400'
                  }`}
                />
              </div>

              <div>
                <div className='mb-3 flex items-center gap-3'>
                  <h3
                    className={`text-base font-bold ${phase.status === 'live' ? 'text-foreground' : 'text-default-600'}`}>
                    {phase.title}
                  </h3>
                  <span
                    className={`font-label rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      phase.status === 'live' ? 'bg-primary text-primary-foreground' : 'bg-content3 text-default-500'
                    }`}>
                    {phase.label}
                  </span>
                </div>

                {phase.status === 'live' ? (
                  <div className='flex flex-wrap gap-1.5'>
                    {phase.items.map(item => (
                      <span
                        key={item}
                        className='inline-flex items-center gap-1 rounded-md border border-default-200 bg-content2 px-2.5 py-1 text-[12px] text-default-600'>
                        <Icon icon='lucide:check' className='h-3 w-3 text-default-500' />
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <ul className='space-y-2'>
                    {phase.items.map(item => (
                      <li key={item} className='flex items-center gap-2 text-[13px] text-default-600'>
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            phase.status === 'next' ? 'bg-default-500' : 'bg-default-400'
                          }`}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

export default RoadmapSection
