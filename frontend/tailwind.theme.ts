import tailwindConfig from './tailwind.config' // Adjust the path as needed

type TailwindTheme = typeof tailwindConfig.theme & {
  screens: {
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }
}

const theme: TailwindTheme = tailwindConfig.theme as TailwindTheme

export { theme }
