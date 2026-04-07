import React, { useRef, useEffect, useState } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onValueChange: (value: string) => void
  isInvalid?: boolean
  errorMessage?: string
  autoFocus?: boolean
}

const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onValueChange,
  isInvalid = false,
  errorMessage,
  autoFocus = true
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  // Convert string value to array
  const otp = value.split('').concat(Array(length - value.length).fill(''))

  // Auto focus first input on mount
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  const handleChange = (element: HTMLInputElement, index: number) => {
    const inputValue = element.value

    // Only accept numbers
    if (inputValue && Number.isNaN(Number(inputValue))) return

    // Update the OTP value
    const newOtp = [...otp]
    newOtp[index] = inputValue.slice(-1) // Only take the last character
    const newValue = newOtp.join('').slice(0, length)
    onValueChange(newValue)

    // Focus next input if value entered
    if (inputValue !== '' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        // Focus previous input if current is empty
        inputRefs.current[index - 1]?.focus()
      } else {
        // Clear current input
        const newOtp = [...otp]
        newOtp[index] = ''
        onValueChange(newOtp.join(''))
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleFocus = (index: number) => {
    setFocusedIndex(index)
    // Select the input content on focus
    inputRefs.current[index]?.select()
  }

  const handleBlur = () => {
    setFocusedIndex(null)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pastedData) {
      onValueChange(pastedData)
      // Focus the last filled input or the next empty one
      const focusIndex = Math.min(pastedData.length, length - 1)
      inputRefs.current[focusIndex]?.focus()
    }
  }

  return (
    <div className='flex flex-col items-center gap-2'>
      <div className='flex items-center justify-center gap-2'>
        {otp.map((data, index) => {
          const isFocused = focusedIndex === index
          const hasValue = data !== ''

          return (
            <input
              key={index}
              ref={el => {
                inputRefs.current[index] = el
              }}
              type='text'
              maxLength={1}
              style={{ caretColor: 'hsl(var(--heroui-primary))' }}
              className={`
                border-2 bg-white text-center text-xl font-bold text-foreground
                transition-all duration-200 ease-out
                focus:outline-none focus:ring-1 focus:ring-primary
                ${
                  isFocused
                    ? 'h-14 w-14 scale-100 border-2 border-primary'
                    : hasValue
                      ? 'h-12 w-12 border-2 border-primary'
                      : 'h-12 w-12 border-2 border-default-200 hover:border-default-300'
                }
                ${isInvalid ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}
              `}
              value={data}
              onChange={e => handleChange(e.target, index)}
              onKeyDown={e => handleKeyDown(e, index)}
              onFocus={() => handleFocus(index)}
              onBlur={handleBlur}
              onPaste={handlePaste}
              inputMode='numeric'
              autoComplete='one-time-code'
            />
          )
        })}
      </div>
      {isInvalid && errorMessage && <span className='text-xs text-danger'>{errorMessage}</span>}
    </div>
  )
}

export default OtpInput
