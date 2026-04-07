namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SERVICE: string
    NEXT_PUBLIC_TOKEN: string
    NEXT_PUBLIC_LIGHTBOX_PLAN_TYPE: string
    NEXT_PUBLIC_LIGHTBOX_LICENSE_KEY: string
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
