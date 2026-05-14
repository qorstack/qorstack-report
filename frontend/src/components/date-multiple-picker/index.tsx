'use client'

import { Fragment, useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import dayjs from 'dayjs'
import { DayPicker } from 'react-day-picker'
import Calendar from '../calendar'
import { Input, Popover, PopoverContent, PopoverTrigger } from "@heroui/react"

type Props = {
  mode: 'multiple'
  label?: string | React.ReactNode
  placeholder?: string
  labelPlacement?: 'inside' | 'outside' | 'outside-left'
  variant?: 'bordered' | 'faded' | 'flat' | 'underlined'
  radius?: 'full' | 'lg' | 'md' | 'sm' | 'none'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  description?: React.ReactNode
  errorMessage?: React.ReactNode
  classNameInput?: string
}
type CalendarProps = React.ComponentProps<typeof DayPicker>

const DateMultiplePicker = ({
  label,
  placeholder,
  labelPlacement,
  variant,
  radius,
  color,
  size,
  isDisabled,
  isReadOnly,
  isRequired,
  isInvalid,
  description,
  errorMessage,
  classNameInput,
  ...props
}: CalendarProps & Props) => {
  const isMultipleDate = (selected: Date[] | undefined): selected is Date[] => Array.isArray(selected)
  const [isOpen, setIsOpen] = useState(false)
  const [textValue, setTextValue] = useState('')

  useEffect(() => {
    if (props.selected && isMultipleDate(props.selected)) {
      const formattedDates = props.selected.map(item => {
        return dayjs(item).format('DD/MM/YYYY')
      })
      setTextValue(formattedDates.join(', '))
    } else {
      setTextValue('')
    }
  }, [props.selected])

  return (
    <Fragment>
      <Popover
        placement='top'
        isOpen={!isDisabled && !isReadOnly && isOpen}
        onOpenChange={open => setIsOpen(open)}
        triggerScaleOnOpen={false}>
        <PopoverTrigger className='z-0'>
          <div>
            <Input
              type='text'
              label={label}
              placeholder={placeholder}
              labelPlacement={labelPlacement}
              variant={variant}
              radius={radius}
              color={color}
              size={size}
              isDisabled={isDisabled}
              isReadOnly={isReadOnly}
              isRequired={isRequired}
              isInvalid={isInvalid}
              description={description}
              errorMessage={errorMessage}
              value={textValue}
              startContent={
                <Icon
                  icon='solar:calendar-outline'
                  className='pointer-events-none flex-shrink-0 text-xl text-default-400'
                />
              }
              classNames={{
                mainWrapper: 'w-full'
              }}
              className={classNameInput}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0'>
          <Calendar {...props} />
        </PopoverContent>
      </Popover>
    </Fragment>
  )
}
export default DateMultiplePicker
