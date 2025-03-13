import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { GeometryItem } from '../../types/geometry'

interface GeometryState {
  items: GeometryItem[];
  showAddGeometry: boolean;
  showEditGeometry: boolean;
}

const initialState: GeometryState = {
  items: [],
  showAddGeometry: false,
  showEditGeometry: false,
}

const geometrySlice = createSlice({
  name: 'geometry',
  initialState,
  reducers: {
    setGeometry: (state, action: PayloadAction<GeometryItem[]>) => {
      state.items = action.payload;
    },
    setShowAddGeometry: (state, action: PayloadAction<boolean>) => {
      state.showAddGeometry = action.payload;
    },
    setShowEditGeometry: (state, action: PayloadAction<boolean>) => {
      state.showEditGeometry = action.payload;
    },
  },
})

export const { setGeometry, setShowAddGeometry, setShowEditGeometry } = geometrySlice.actions
export default geometrySlice.reducer