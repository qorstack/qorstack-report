import React from 'react'
import { Card, Button, Chip } from '@heroui/react'
import Icon from '@/components/icon'
import ScrollReveal from '@/components/scroll-reveal'

const PricingSection = () => {
  const plans = [
    {
      name: 'Beta Plan',
      price: '$0',
      period: '/mo',
      desc: 'Get full access during our public beta period.',
      features: [
        'Unlimited PDF Generations',
        'Unlimited Projects',
        'HTML/CSS to PDF Converter',
        'Full API Access',
        'Priority Support'
      ],
      buttonText: 'Join Beta',
      buttonVariant: 'primary' as const,
      highlight: true,
      badge: 'BETA ACCESS'
    }
  ]

  return (
    <section id='pricing' className='bg-content2 py-24'>
      <div className='container mx-auto px-6'>
        <ScrollReveal>
          <div className='mb-16 text-center'>
            <Chip color='primary' variant='flat' className='mb-4 font-bold uppercase'>
              Pricing
            </Chip>
            <h2 className='text-3xl font-bold tracking-tight text-foreground md:text-5xl'>Simple, Transparent Pricing</h2>
            <p className='mx-auto mt-4 max-w-2xl text-lg text-default-600'>
              Join our Beta program today and enjoy unlimited access to all features.
            </p>
          </div>
        </ScrollReveal>

        <div className='flex justify-center'>
          {plans.map((plan, i) => (
            <ScrollReveal key={i} delay={i * 0.1} className='w-full max-w-md'>
              <Card
                className={`relative h-full w-full border-2 p-8 shadow-xl ${plan.highlight ? 'border-primary' : 'border-default-200'}`}
                shadow='none'
                radius='none'>
                {plan.badge && (
                  <div className='absolute -top-4 left-1/2 -translate-x-1/2'>
                    <div className='flex items-center gap-2 bg-foreground px-4 py-1 text-xs font-bold uppercase tracking-wider text-background shadow-lg'>
                      <Icon icon='lucide:sparkles' className='h-3 w-3 text-yellow-400' />
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className='text-center'>
                  <h3 className='text-xl font-bold text-foreground'>{plan.name}</h3>
                  <div className='mt-6 flex items-baseline justify-center gap-1'>
                    <span className='text-4xl font-bold text-foreground'>{plan.price}</span>
                    <span className='text-default-500'>{plan.period}</span>
                  </div>
                  <p className='mt-4 text-sm text-default-500'>{plan.desc}</p>
                </div>

                <div className='my-8 space-y-4'>
                  {plan.features.map((feature, j) => (
                    <div key={j} className='flex items-center gap-3'>
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.highlight ? 'bg-primary-50 text-primary-600' : 'bg-content3 text-default-600'}`}>
                        <Icon icon='lucide:check' className='h-3 w-3' />
                      </div>
                      <span className='text-sm font-medium text-default-700'>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className='mt-auto pt-4'>
                  <Button
                    size='lg'
                    color={plan.buttonVariant === 'primary' ? 'primary' : 'default'}
                    variant={plan.buttonVariant === 'primary' ? 'solid' : 'bordered'}
                    className={`w-full font-bold ${plan.highlight ? 'shadow-lg shadow-primary/20' : ''}`}
                    radius='none'>
                    {plan.buttonText}
                  </Button>
                  {plan.highlight && (
                    <p className='mt-4 text-center text-xs text-default-400'>Free during public beta period</p>
                  )}
                </div>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PricingSection
