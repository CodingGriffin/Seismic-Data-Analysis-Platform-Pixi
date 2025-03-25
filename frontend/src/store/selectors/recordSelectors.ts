import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { RecordData, RecordOption } from '../../types/record';

export const selectRecordState = (state: RootState) => state.record;

export const selectOptions = (state: RootState) => state.record.options;

export const selectDataMap = (state: RootState) => state.record.dataMap;

export const selectRecordOption = (state: RootState, id: string): RecordOption | undefined => 
  state.record.options.find(option => option.id === id);

export const selectRecordData = (state: RootState, id: string): RecordData | undefined => {
  const fileName = state.record.options.find(option => option.id === id)?.fileName;
  if (fileName)
    return state.record.dataMap[fileName]
}

export const selectRecordById = createSelector(
  [
    (state: RootState, id: string) => selectRecordData(state, id),
    (state: RootState, id: string) => selectRecordOption(state, id)
  ],
  (data, option) => {
    if (!data || !option) return undefined;
    
    return {
      ...data,
      ...option
    };
  }
);

export const selectRecordItems = createSelector(
  [selectDataMap, selectOptions],
  (dataMap, options) => {
    const records = options
      .map(option => {
        const data = dataMap[option.fileName];
        
        if (data) {
          return {
            ...data,
            ...option
          };
        }
        return null;
      })
      .filter(item => item !== null); 
    return records;
  }
);

export const selectEnabledRecords = createSelector(
  [selectRecordItems],
  (records) => {
    return records.filter(record => record && record.enabled);
  }
);

export const selectRecordCount = createSelector(
  [selectOptions],
  (options) => options.length
);

export const selectEnabledRecordCount = createSelector(
  [selectOptions],
  (options) => options.filter(option => option.enabled).length
);
