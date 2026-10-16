'use client'

import { useState, type JSX } from 'react'
import { cn } from '@/utils/cn'

export interface FaqItem {
  question: string
  answer: string
}

/** 06 accordion: numbered questions, square +/× toggles, answers expand with a grid-rows transition. */
export const FaqAccordion = ({ items }: { items: FaqItem[] }): JSX.Element => {
  const [open, setOpen] = useState<Set<number>>(() => new Set())

  const toggle = (i: number): void => {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className='border-t border-default-300'>
      {items.map((item, i) => {
        const isOpen = open.has(i)
        const n = String(i + 1).padStart(2, '0')
        return (
          <div key={item.question} className='group border-b border-default-300'>
            <h3>
              <button
                type='button'
                id={`faq-q-${n}`}
                aria-expanded={isOpen}
                aria-controls={`faq-a-${n}`}
                onClick={() => toggle(i)}
                className='grid w-full grid-cols-[60px_1fr_40px] items-center py-[26px] text-left text-[clamp(20px,2vw,26px)] font-bold uppercase [font-variation-settings:"wdth"_84]'>
                <span className='font-mono text-[12px] font-normal text-default-400'>Q.{n}</span>
                <span>{item.question}</span>
                <span
                  aria-hidden='true'
                  className={cn(
                    'grid h-9 w-9 place-items-center border font-mono text-[18px] transition-[transform,background-color,border-color] duration-300',
                    isOpen
                      ? 'rotate-45 border-primary bg-primary text-white'
                      : 'border-default-300 group-hover:border-foreground'
                  )}>
                  +
                </span>
              </button>
            </h3>
            <div
              id={`faq-a-${n}`}
              role='region'
              aria-labelledby={`faq-q-${n}`}
              className={cn('lp-ans', isOpen && 'is-open')}>
              <div className='overflow-hidden'>
                <p className='mb-7 ml-[60px] max-w-[720px] text-[18px] text-default-500' aria-hidden={!isOpen}>
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FaqAccordion
