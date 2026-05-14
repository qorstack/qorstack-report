import { PayloadAction, createSlice } from '@reduxjs/toolkit'

type Props = {
  loadingList: string[]
}

const initialState: Props = {
  loadingList: []
}

const loadingScreenSlice = createSlice({
  name: 'loadingScreenSlice',
  initialState,
  reducers: {
    updateState: (state, action: PayloadAction<Partial<Props>>) => ({
      ...state,
      ...action.payload
    }),
    resetState: () => initialState

    // start: state => ({ ...state, loader: state.loader + 1 }),
    // stop: state => ({
    //   ...state,
    //   loader: state.loader > 0 ? state.loader - 1 : 0
    // })
  }
})

export const loadingScreenAction = loadingScreenSlice.actions
export const loadingScreenReducer = loadingScreenSlice.reducer
