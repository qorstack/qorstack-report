import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { Socket, io } from 'socket.io-client'

type Props = {
  socket: Socket | null
  isUseSocket: boolean
  isConnect: boolean
}

const initialState: Props = {
  socket: null,
  isUseSocket: false,
  isConnect: false
}

const socketSlice = createSlice({
  name: 'socketSlice',
  initialState,
  reducers: {
    updateState: (state, action: PayloadAction<Props>) => ({
      ...state,
      ...action.payload
    }),
    resetState: () => initialState,
    initSocket: state => {
      if (!state.socket) {
        const socket = io(process.env.NEXT_PUBLIC_SERVICE)
        return {
          ...state,
          socket: socket,
          isConnect: true
        }
      }
    },
    disconnectSocket: state => {
      if (state.socket) {
        state.socket.close()
      }
      return {
        ...state,
        socket: null,
        isConnect: false
      }
    }
  }
})

export const socketAction = socketSlice.actions
export const socketReducer = socketSlice.reducer
