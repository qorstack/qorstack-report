import { useMediaQuery } from 'usehooks-ts'
import { theme } from '../../tailwind.theme'

const useBreakpoint = () => {
  const sm = theme?.screens?.sm
  const lg = theme?.screens?.lg

  const isMobile = useMediaQuery(`(max-width: ${sm})`)
  const isIpad = useMediaQuery(`(min-width: ${sm}) and (max-width: ${lg})`)
  const isDesktop = useMediaQuery(`(min-width: ${lg})`)

  return {
    isMobile,
    isIpad,
    isDesktop
  }
}

export default useBreakpoint
