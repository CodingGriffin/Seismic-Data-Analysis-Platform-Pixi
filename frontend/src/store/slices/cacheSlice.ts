import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RecordItem } from "../../types/record";

interface CacheState {
  previewRecords: RecordItem[];
  previewFreqData: number[];
  previewSlowData: number[];
  isLoading: boolean;
}

const initialState: CacheState = {
  previewRecords: [],
  previewFreqData: [],
  previewSlowData: [],
  isLoading: false,
};

const cacheSlice = createSlice({
  name: "cache",
  initialState,
  reducers: {
    setPreviewRecords: (state, action: PayloadAction<RecordItem[]>) => {
      state.previewRecords = action.payload;
    },
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
      state.previewRecords = [];
      state.previewFreqData = [];
      state.previewSlowData = [];
      state.isLoading = false;
    },
  },
});

export const {
  setPreviewRecords,
  setPreviewFreqData,
  setPreviewSlowData,
  setIsLoading,
  clearCache,
} = cacheSlice.actions;

export default cacheSlice.reducer;