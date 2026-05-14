'use client'
import React, { Fragment } from 'react'
//Use React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: Infinity
    }
  }
})

type Props = {
  children: React.ReactNode
}

const ReactQueryProvider = (props: Props) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Fragment>{props.children}</Fragment>
    </QueryClientProvider>
  )
}

export default ReactQueryProvider
