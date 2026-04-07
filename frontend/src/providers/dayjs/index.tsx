'use client'
import { Fragment } from 'react'
import dayjs, { Dayjs, PluginFunc } from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

const customYear: PluginFunc = (option, dayjsClass, dayjsFactory) => {
  const originalFormat = dayjsClass.prototype.format
  dayjsClass.prototype.format = function (formatStr: string): string {
    const locale = this.locale()
    if (formatStr.includes('!YYYY') || formatStr.includes('!YY')) {
      formatStr = formatStr.replace('!YYYY', 'YYYY').replace('!YY', 'YY')
    } else {
      if (locale === 'th') {
        formatStr = formatStr.replace('YYYY', 'BBBB').replace('YY', 'BB')
      }
    }
    return originalFormat.call(this, formatStr)
  }
}

type Props = {
  children: React.ReactNode
}

const DayjsProvider = (props: Props) => {
  dayjs.locale('en')
  dayjs.extend(buddhistEra)
  dayjs.extend(customYear)

  return <Fragment>{props.children}</Fragment>
}

export default DayjsProvider
