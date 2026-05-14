import { PayloadAction, createSlice } from '@reduxjs/toolkit'

type Props = {
  isCompact: boolean
}

const initialState: Props = {
  isCompact: false
}

const appSettingSlice = createSlice({
  name: 'appSettingSlice',
  initialState,
  reducers: {
    updateState: (state, action: PayloadAction<Partial<Props>>) => ({
      ...state,
      ...action.payload
    }),
    resetState: () => initialState,
    onToggleCompact: state => ({ ...state, isCompact: !state.isCompact })
  }
})

export const appSettingAction = appSettingSlice.actions
export const appSettingReducer = appSettingSlice.reducer
