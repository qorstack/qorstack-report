import store from '@/store'
import { loadingScreenAction } from '@/store/reducers/loading-screen'
import { useDispatch } from 'react-redux'

const useLoadingScreen = () => {
  const dispatch = useDispatch()

  const getLoadingList = () => {
    return store.getState().loadingScreenReducer.loadingList
  }

  const start = (props: { key: string }) => {
    const loadingList = getLoadingList()
    if (!loadingList.includes(props.key)) {
      dispatch(
        loadingScreenAction.updateState({
          loadingList: [...loadingList, props.key]
        })
      )
    }
  }

  const stop = (props: { key: string }) => {
    const loadingList = getLoadingList()
    const updatedList = loadingList.filter(loadingKey => loadingKey !== props.key)
    dispatch(
      loadingScreenAction.updateState({
        loadingList: updatedList
      })
    )
  }

  return {
    start,
    stop
  }
}

export default useLoadingScreen
