import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SlowState {
  numSlow: number;
  maxSlow: number;
  slowData: number[];
}

const initialState: SlowState = {
  numSlow: 0,
  maxSlow: 0,
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
  },
});

export const { setNumSlow, setMaxSlow } = slowSlice.actions;
export default slowSlice.reducer;
