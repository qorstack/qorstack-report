'use client'

import { StateType } from '@/store'
import React, { Fragment, ReactNode } from 'react'
import { useSelector } from 'react-redux'
import LoadingScreen from '@/components/loading-screen'

type Props = {
  children: ReactNode
  title?: string
}

const RootLayout = (props: Props) => {
  const loadingScreenReducer = useSelector((state: StateType) => state.loadingScreenReducer)

  return (
    <Fragment>
      <main>
        <LoadingScreen isLoading={loadingScreenReducer.loadingList.length > 0} />
        {props.children}
      </main>
    </Fragment>
  )
}

export default RootLayout
