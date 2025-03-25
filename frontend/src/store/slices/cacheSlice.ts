import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CacheState {
  previewFreqData: number[];
  previewSlowData: number[];
  isLoading: boolean;
}

const initialState: CacheState = {
  previewFreqData: [],
  previewSlowData: [],
  isLoading: false,
};

const cacheSlice = createSlice({
  name: "cache",
  initialState,
  reducers: {
    setPreviewFreqData: (state, action: PayloadAction<number[]>) => {
      state.previewFreqData = action.payload;
    },
    setPreviewSlowData: (state, action: PayloadAction<number[]>) => {
      state.previewSlowData = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearCache: (state) => {
      state.previewFreqData = [];
      state.previewSlowData = [];
      state.isLoading = false;
    },
  },
});

export const {
  setPreviewFreqData,
  setPreviewSlowData,
  setIsLoading,
  clearCache,
} = cacheSlice.actions;

export default cacheSlice.reducer;