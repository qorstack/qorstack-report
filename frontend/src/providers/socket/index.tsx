'use client'
import { socketAction } from '@/store/reducers/socket'
import React, { Fragment, useEffect } from 'react'
import { useDispatch } from 'react-redux'

type Props = {
  children: React.ReactNode
}

const SocketProvider = (props: Props) => {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(socketAction.initSocket())
  }, [dispatch])

  return <Fragment>{props.children}</Fragment>
}

export default SocketProvider
