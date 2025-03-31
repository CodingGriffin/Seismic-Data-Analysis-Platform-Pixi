import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppThunk } from "../index";
import { updateDataLimits } from "./plotSlice";

interface SlowState {
  numSlow: number;
  maxSlow: number;
  slowData: number[];
}

const initialState: SlowState = {
  numSlow: 50,
  maxSlow: 0.015,
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

export const updateMaxSlow = (value: number): AppThunk => (dispatch, _) => {
  dispatch(setMaxSlow(value));
  
  dispatch(updateDataLimits({
    slowMax: value,
    slowMin: 0
  }));
};
