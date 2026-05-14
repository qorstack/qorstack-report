import { AxiosRequestConfig } from 'axios'

export type ApiType = {
  config?: AxiosRequestConfig | undefined
  url: string
}
