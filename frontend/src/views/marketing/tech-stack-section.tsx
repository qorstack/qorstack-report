'use client'

import Icon from '@/components/icon'

const stackItems: { name: string; icon?: string; badge?: string }[] = [
  { name: 'Node.js', icon: 'fa6-brands:node-js' },
  { name: 'Python', icon: 'fa6-brands:python' },
  { name: 'React', icon: 'fa6-brands:react' },
  { name: 'PHP', icon: 'fa6-brands:php' },
  { name: 'Go', icon: 'fa6-brands:golang' },
  { name: 'Java', icon: 'fa6-brands:java' },
  { name: '.NET', icon: 'simple-icons:dotnet' },
  { name: 'Rust', icon: 'fa6-brands:rust' },
  { name: 'REST API', badge: 'JSON' }
]

const StackItemList = () => (
  <div className='flex shrink-0 items-center'>
    {stackItems.map(item => (
      <div key={item.name} className='mx-10 flex items-center gap-2 text-xl font-bold text-default-500'>
        {item.badge ? (
          <span className='rounded border-2 border-default-400 px-2 font-mono text-sm'>{item.badge}</span>
        ) : (
          <Icon icon={item.icon!} className='shrink-0 text-3xl text-default-500' />
        )}
        <span className='whitespace-nowrap'>{item.name}</span>
      </div>
    ))}
  </div>
)

const TechStackSection = () => {
  return (
    <section className='overflow-hidden bg-content1 py-10'>
      <div className='mx-auto mb-6 max-w-7xl px-4 text-center'>
        <p className='font-label text-sm font-semibold uppercase tracking-wider text-default-500'>
          Works with any language or framework
        </p>
      </div>

      <div className='relative flex w-full overflow-hidden'>
        <div className='pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-24 bg-gradient-to-r from-content1 to-transparent' />
        <div className='pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-24 bg-gradient-to-l from-content1 to-transparent' />

        <div className='flex animate-scroll items-center py-4 hover:[animation-play-state:paused]'>
          <StackItemList />
          <StackItemList />
        </div>
      </div>
    </section>
  )
}

export default TechStackSection
