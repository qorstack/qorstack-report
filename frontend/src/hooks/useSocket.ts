import { useMediaQuery } from 'usehooks-ts'
import { theme } from '../../tailwind.theme'
import { useSelector } from 'react-redux'
import { StateType } from '@/store'

const useSocket = () => {
  const socket = useSelector((state: StateType) => state.socketReducer.socket)
  const isConnectSocket = useSelector((state: StateType) => state.socketReducer.isConnect)
  return { socket, isConnectSocket }
}

export default useSocket
