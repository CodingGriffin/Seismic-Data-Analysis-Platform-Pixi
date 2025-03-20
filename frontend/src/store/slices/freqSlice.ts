import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FreqState {
  numFreq: number;
  maxFreq: number;
  freqData: number[];
}

const initialState: FreqState = {
  numFreq: 50,
  maxFreq: 50,
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
    setFreqData: (state, action: PayloadAction<number[]>) => {
      state.freqData = action.payload;
    },
  },
});

export const { setNumFreq, setMaxFreq, setFreqData } = freqSlice.actions;
export default freqSlice.reducer;
