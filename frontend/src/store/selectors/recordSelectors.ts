import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { RecordItem } from '../../types/record';

export const selectRecordItems = createSelector(
  [(state: RootState) => state.record.dataMap, 
   (state: RootState) => state.record.stateMap,
   (state: RootState) => state.record.orderedIds],
  (dataMap, stateMap, orderedIds) => {
    const itemsMap: { [key: string]: RecordItem } = {};
    
    orderedIds.forEach(id => {
      if (dataMap[id] && stateMap[id]) {
        itemsMap[id] = {
          ...dataMap[id],
          ...stateMap[id]
        };
      }
    });
    
    return { itemsMap, orderedIds };
  }
);

export const selectRecordState = (state: RootState, id: string) => 
  state.record.stateMap[id];

export const selectRecordData = (state: RootState, id: string) => 
  state.record.dataMap[id];