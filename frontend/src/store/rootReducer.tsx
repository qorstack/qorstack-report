import { combineReducers } from 'redux'
import { loadingScreenReducer } from './reducers/loading-screen'
import { appSettingReducer } from './reducers/app-setting'
import { socketReducer } from './reducers/socket'

const rootReducer = combineReducers({
  loadingScreenReducer,
  appSettingReducer,
  socketReducer
})
export default rootReducer
