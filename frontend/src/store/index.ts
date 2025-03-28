import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import geometryReducer from "./slices/geometrySlice";
import recordReducer from "./slices/recordSlice";
import freqReducer from "./slices/freqSlice";
import slowReducer from "./slices/slowSlice";
import toastReducer from "./slices/toastSlice";
import cacheReducer from "./slices/cacheSlice";
import plotReducer from "./slices/plotSlice";

export const store = configureStore({
  reducer: {
    geometry: geometryReducer,
    record: recordReducer,
    freq: freqReducer,
    slow: slowReducer,
    toast: toastReducer,
    cache: cacheReducer,
    plot: plotReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Add the plot/setTexture action to ignored actions
        ignoredActions: [
          "record/setRecords", 
          "plot/setTexture"
        ],
        ignoredActionPaths: ["meta.arg", "payload.timestamp"],
        // Add texture to ignored paths
        ignoredPaths: [
          "record.itemsMap", 
          "plot.texture"
        ],
        warnAfter: 500,
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
