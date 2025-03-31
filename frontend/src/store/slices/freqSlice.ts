import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppThunk } from "../index";
import { updateDataLimits } from "./plotSlice";

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

export const updateMaxFreq = (value: number): AppThunk => (dispatch, _) => {
  dispatch(setMaxFreq(value));
  dispatch(updateDataLimits({
    freqMax: value,
    freqMin: 0
  }));
};
