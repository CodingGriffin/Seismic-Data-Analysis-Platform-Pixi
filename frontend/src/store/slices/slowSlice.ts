import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SlowState {
  numSlow: number;
  maxSlow: number;
  slowData: number[];
}

const initialState: SlowState = {
  numSlow: 50,
  maxSlow: 0.004,
  slowData: [],
};

const slowSlice = createSlice({
  name: "slow",
  initialState,
  reducers: {
    setNumSlow: (state, action: PayloadAction<number>) => {
      state.numSlow = action.payload;
    },
    setMaxSlow: (state, action: PayloadAction<number>) => {
      state.maxSlow = action.payload;
    },
    setSlowData: (state, action: PayloadAction<number[]>) => {
      state.slowData = action.payload;
    },
  },
});

export const { setNumSlow, setMaxSlow, setSlowData } = slowSlice.actions;
export default slowSlice.reducer;
