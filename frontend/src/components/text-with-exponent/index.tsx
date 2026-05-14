import { ReactNode } from 'react'

export const TextWithExponent = (text?: string | ReactNode, unitExponent?: string[]) => {
  if (typeof text !== 'string') {
    return text
  }
  return text.split('').map((char, index) => {
    if (unitExponent && unitExponent.includes(char)) {
      return (
        <span key={index} className='exponent'>
          {char}
        </span>
      )
    }
    return <span key={index}>{char}</span>
  })
}
