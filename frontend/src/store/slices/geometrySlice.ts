import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { GeometryItem } from '../../types/geometry'

interface GeometryState {
  items: GeometryItem[];
}

const initialState: GeometryState = {
  items: [],
}

const geometrySlice = createSlice({
  name: 'geometry',
  initialState,
  reducers: {
    setGeometry: (state, action: PayloadAction<GeometryItem[]>) => {
      state.items = action.payload;
    },
  },
})

export const { setGeometry } = geometrySlice.actions
export default geometrySlice.reducer