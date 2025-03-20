import { configureStore } from "@reduxjs/toolkit";
import geometryReducer from "./slices/geometrySlice";
import recordReducer from "./slices/recordSlice";
import freqReducer from "./slices/freqSlice";
import slowReducer from "./slices/slowSlice";
import toastReducer from "./slices/toastSlice";
import cacheReducer from "./slices/cacheSlice";

export const store = configureStore({
  reducer: {
    geometry: geometryReducer,
    record: recordReducer,
    freq: freqReducer,
    slow: slowReducer,
    toast: toastReducer,
    cache: cacheReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["record/setRecords"],
        ignoredActionPaths: ["meta.arg", "payload.timestamp"],
        ignoredPaths: ["record.itemsMap"],
        warnAfter: 500,
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
