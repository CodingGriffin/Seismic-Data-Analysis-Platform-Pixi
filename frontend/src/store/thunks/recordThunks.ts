import { AppThunk } from '../index';
import { updateRecordState } from '../slices/recordSlice';

const DEBOUNCE_TIME = 50;

const weightUpdateQueue: {
  [recordId: string]: {
    latestValue: number;
    timeoutId: number | null;
  };
} = {};

export const updateRecordWeightDebounced = 
  (recordId: string, weight: number): AppThunk => 
  (dispatch) => {
    if (weightUpdateQueue[recordId]?.timeoutId) {
      clearTimeout(weightUpdateQueue[recordId].timeoutId);
    }

    if (!weightUpdateQueue[recordId]) {
      weightUpdateQueue[recordId] = { latestValue: weight, timeoutId: null };
    } else {
      weightUpdateQueue[recordId].latestValue = weight;
    }

    const timeoutId = setTimeout(() => {
      const currentValue = weightUpdateQueue[recordId].latestValue;
      
      dispatch(updateRecordState({
        id: recordId,
        state: { weight: currentValue }
      }));
      
      weightUpdateQueue[recordId].timeoutId = null;
    }, DEBOUNCE_TIME);

    weightUpdateQueue[recordId].timeoutId = timeoutId;
  };
