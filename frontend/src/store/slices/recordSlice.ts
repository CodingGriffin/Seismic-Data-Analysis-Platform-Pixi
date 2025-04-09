import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RecordData, RecordOption } from "../../types/record";

interface RecordStoreState {
  dataMap: { [key: string]: RecordData };
  options: RecordOption[];
}

const initialState: RecordStoreState = {
  dataMap: {},
  options: [],
};

const recordSlice = createSlice({
  name: "record",
  initialState,
  reducers: {
    setRecords: (state, action: PayloadAction<{ data: RecordData, option: RecordOption }[]>) => {
      action.payload.forEach((item) => {
        state.dataMap[item.option.id] = item.data;
        state.options.push(item.option);
      });
    },
    updateRecordData: (
      state,
      action: PayloadAction<{ id: string; data: RecordData }>
    ) => {
      if (action.payload.id in state.dataMap) {
        state.dataMap[action.payload.id] = action.payload.data;
      }
    },
    updateRecordOption: (
      state,
      action: PayloadAction<any> 
    ) => {
      const optionIndex = state.options.findIndex(opt => opt.id === action.payload.id);
      if (optionIndex !== -1) {
        state.options[optionIndex] = {
          ...state.options[optionIndex],
          ...action.payload
        };
      }
    },
    deleteRecord: (state, action: PayloadAction<string>) => {
      delete state.dataMap[action.payload];
      state.options = state.options.filter(opt => opt.id !== action.payload);
    },
    deleteRecordOption: (state, action: PayloadAction<string>) => {
      state.options = state.options.filter(opt => opt.id !== action.payload);
    },
    reorderRecords: (state, action: PayloadAction<string[]>) => {
      const newOptions: RecordOption[] = [];
      action.payload.forEach(id => {
        const option = state.options.find(opt => opt.id === id);
        if (option) {
          newOptions.push(option);
        }
      });
      state.options = newOptions;
    },
    setOptions: (state, action: PayloadAction<RecordOption[]>) => {
      state.options = action.payload;
    },
    setDataMap: (state, action: PayloadAction<{ [key: string]: RecordData }>) => {
      state.dataMap = action.payload;
    },
  },
});

export const {
  setRecords,
  setOptions,
  setDataMap,
  deleteRecord,
  updateRecordData,
  updateRecordOption,
  reorderRecords,
} = recordSlice.actions;

export default recordSlice.reducer;