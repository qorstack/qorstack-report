namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SERVICE: string
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: string
    NEXT_PUBLIC_GITHUB_CLIENT_ID: string
    GITHUB_CLIENT_SECRET: string
  }
}

declare module '*.css' {
  const content: any
  export default content
}

// Swiper CSS modules
declare module 'swiper/css'
declare module 'swiper/css/pagination'
declare module 'swiper/css/navigation'

// Lightbox CSS modules
declare module 'lightbox.js-react/dist/index.css'
