import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RecordItem } from "../../types/record";

const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
};

interface RecordState {
  itemsMap: { [key: string]: RecordItem };
  orderedIds: string[];
  showAddRecord: boolean;
  showEditRecord: boolean;
}

const initialState: RecordState = {
  itemsMap: {},
  orderedIds: [],
  showAddRecord: false,
  showEditRecord: false,
};

const recordSlice = createSlice({
  name: "record",
  initialState,
  reducers: {
    addRecord: (state, action: PayloadAction<RecordItem>) => {
      const id = generateId();
      state.itemsMap[id] = action.payload;
      state.orderedIds.push(id);
    },
    setRecords: (state, action: PayloadAction<RecordItem[]>) => {
      state.itemsMap = {};
      state.orderedIds = [];
      action.payload.forEach((item) => {
        const id = generateId();
        state.itemsMap[id] = item;
        state.orderedIds.push(id);
      });
    },
    updateRecord: (
      state,
      action: PayloadAction<{ id: string; data: RecordItem }>
    ) => {
      if (action.payload.id in state.itemsMap) {
        state.itemsMap[action.payload.id] = action.payload.data;
      }
    },
    deleteRecord: (state, action: PayloadAction<string>) => {
      delete state.itemsMap[action.payload];
      state.orderedIds = state.orderedIds.filter(id => id !== action.payload);
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
  },
});

export const {
  setRecords,
  setShowAddRecord,
  setShowEditRecord,
  addRecord,
  deleteRecord,
  updateRecord,
  reorderRecords,
} = recordSlice.actions;

export default recordSlice.reducer;
