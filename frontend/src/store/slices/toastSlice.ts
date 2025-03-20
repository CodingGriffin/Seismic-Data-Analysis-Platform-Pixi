import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  messages: ToastMessage[];
}

const initialState: ToastState = {
  messages: [],
};

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    addToast: (state, action: PayloadAction<Omit<ToastMessage, "id">>) => {
      const id = Date.now().toString();
      state.messages.push({
        ...action.payload,
        id,
        duration: action.payload.duration || 5000,
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(
        (message) => message.id !== action.payload
      );
    },
  },
});

export const { addToast, removeToast } = toastSlice.actions;
export default toastSlice.reducer;