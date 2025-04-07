import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RecordItem, RecordData, RecordState } from "../../types/record";

const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
};

interface RecordStoreState {
  dataMap: { [key: string]: RecordData };
  stateMap: { [key: string]: RecordState };
  orderedIds: string[];
  showAddRecord: boolean;
  showEditRecord: boolean;
}

const initialState: RecordStoreState = {
  dataMap: {},
  stateMap: {},
  orderedIds: [],
  showAddRecord: false,
  showEditRecord: false,
};

const recordSlice = createSlice({
  name: "record",
  initialState,
  reducers: {
    addRecord: (state, action: PayloadAction<RecordItem[]>) => {
      action.payload.forEach((item) => {
        const id = generateId();
        const { enabled, weight, ...data } = item;
        
        state.dataMap[id] = data;
        state.stateMap[id] = { enabled, weight };
        state.orderedIds.push(id);
      });
    },
    setRecords: (state, action: PayloadAction<RecordItem[]>) => {
      state.dataMap = {};
      state.stateMap = {};
      state.orderedIds = [];
      action.payload.forEach((item) => {
        const id = generateId();
        const { enabled, weight, ...data } = item;
        
        state.dataMap[id] = data;
        state.stateMap[id] = { enabled, weight };
        state.orderedIds.push(id);
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
    updateRecordState: (
      state,
      action: PayloadAction<{ id: string; state: Partial<RecordState> }>
    ) => {
      if (action.payload.id in state.stateMap) {
        state.stateMap[action.payload.id] = {
          ...state.stateMap[action.payload.id],
          ...action.payload.state
        };
      }
    },
    
    updateRecord: (
      state,
      action: PayloadAction<{ id: string; data: RecordItem }>
    ) => {
      if (action.payload.id in state.dataMap) {
        const { enabled, weight, ...data } = action.payload.data;
        state.dataMap[action.payload.id] = data;
        state.stateMap[action.payload.id] = { enabled, weight };
      }
    },
    deleteRecord: (state, action: PayloadAction<string>) => {
      delete state.dataMap[action.payload];
      delete state.stateMap[action.payload];
      state.orderedIds = state.orderedIds.filter((id) => id !== action.payload);
    },
    reorderRecords: (state, action: PayloadAction<string[]>) => {
      state.orderedIds = action.payload;
    },
    setShowAddRecord: (state, action: PayloadAction<boolean>) => {
      state.showAddRecord = action.payload;
    },
    setShowEditRecord: (state, action: PayloadAction<boolean>) => {
      state.showEditRecord = action.payload;
    },
    setStateMap: (state, action: PayloadAction<{ [key: string]: RecordState }>) => {
      state.stateMap = action.payload;
    },
    setDataMap: (state, action: PayloadAction<{ [key: string]: RecordData }>) => {
      state.dataMap = action.payload;
    },
    setOrderedIds: (state, action: PayloadAction<string[]>) => {
      state.orderedIds = action.payload;
    },
  },
});

export const {
  setRecords,
  setShowAddRecord,
  setShowEditRecord,
  addRecord,
  deleteRecord,
  updateRecord,
  updateRecordData,
  updateRecordState,
  reorderRecords,
  setStateMap,
  setDataMap,
  setOrderedIds,
} = recordSlice.actions;

export default recordSlice.reducer;
