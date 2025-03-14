import { configureStore } from '@reduxjs/toolkit'
import geometryReducer from './slices/geometrySlice'
import recordReducer from './slices/recordSlice'

export const store = configureStore({
  reducer: {
    geometry: geometryReducer,
    record: recordReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['record/setRecords'],
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['record.itemsMap'],
        warnAfter: 500
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
