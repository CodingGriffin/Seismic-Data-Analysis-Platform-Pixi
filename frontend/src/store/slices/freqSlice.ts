import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FreqState {
  numFreq: number;
  maxFreq: number;
  freqData: number[];
}

const initialState: FreqState = {
  numFreq: 0,
  maxFreq: 0,
  freqData: [],
};

const freqSlice = createSlice({
  name: "freq",
  initialState,
  reducers: {
    setNumFreq: (state, action: PayloadAction<number>) => {
      state.numFreq = action.payload;
    },
    setMaxFreq: (state, action: PayloadAction<number>) => {
      state.maxFreq = action.payload;
    },
  },
});

export const { setNumFreq, setMaxFreq } = freqSlice.actions;
export default freqSlice.reducer;
