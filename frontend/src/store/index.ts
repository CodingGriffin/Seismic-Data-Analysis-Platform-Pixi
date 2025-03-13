import { configureStore } from '@reduxjs/toolkit'
import geometryReducer from './slices/geometrySlice'

export const store = configureStore({
  reducer: {
    geometry: geometryReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch