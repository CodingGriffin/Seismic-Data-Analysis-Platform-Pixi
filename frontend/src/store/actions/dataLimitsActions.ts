import { createAction } from "@reduxjs/toolkit";
import { AppThunk } from "../store";
import { updateDataLimits } from "../slices/plotSlice";
import { RootState } from "../rootReducer";

// Thunk action to update dataLimits when maxFreq or maxSlow changes
export const syncDataLimits = (): AppThunk => (dispatch, getState) => {
  const state: RootState = getState();
  const { maxFreq } = state.freq;
  const { maxSlow } = state.slow;
  
  dispatch(updateDataLimits({
    freqMin: 0,
    freqMax: maxFreq,
    slowMin: 0,
    slowMax: maxSlow
  }));
};