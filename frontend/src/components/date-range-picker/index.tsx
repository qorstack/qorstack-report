'use client'

import { Fragment } from 'react'
import { Icon } from '@iconify/react'
import dayjs from 'dayjs'
import { DateRange, DayPicker } from 'react-day-picker'
import { Input, Popover, PopoverContent, PopoverTrigger } from "@heroui/react"
import { useEffect, useState } from 'react'
import Calendar from '../calendar'

type Props = {
  mode: 'range'
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

const DateRangePicker = ({
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
  const [isOpen, setIsOpen] = useState(false)
  const [countSelected, setCountSelected] = useState(0)
  const isDateRange = (selected: DateRange | undefined) =>
    selected && !(selected instanceof Date) && !Array.isArray(selected) && selected.from && selected.to
  const [textValue, setTextValue] = useState('')

  useEffect(() => {
    if (props.selected && isDateRange(props.selected)) {
      const formattedDates = `${dayjs(props.selected?.from).format('DD/MM/YYYY')} - ${dayjs(props.selected?.to).format('DD/MM/YYYY')}`
      setTextValue(formattedDates)
      const updateConut = countSelected + 1
      setCountSelected(updateConut)
      if (countSelected > 0) {
        setIsOpen(false)
        setCountSelected(0)
      }
    } else {
      setTextValue('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
export default DateRangePicker
