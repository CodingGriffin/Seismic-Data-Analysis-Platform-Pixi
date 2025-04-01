import { createAsyncThunk } from "@reduxjs/toolkit";
import { createTexture } from "../../utils/plot-util";
import { 
  setTexture, 
  setIsLoading,
} from "../slices/plotSlice";
import { addToast } from "../slices/toastSlice";
import { RootState } from "../index";
import { flipHorizontal, flipVertical, rotateClockwise, rotateCounterClockwise } from "../../utils/matrix-util";
import { Matrix } from "../../types/record";

export const createWeightedTexture = createAsyncThunk(
  "plot/createWeightedTexture",
  async (_, { dispatch, getState }) => {
    try {
      dispatch(setIsLoading(true));
      
      const state = getState() as RootState;
      const { orderedIds, dataMap, stateMap } = state.record;
      const { selectedColorMap, colorMaps} = state.plot;
      
      const selectedRecords = orderedIds
        .filter(id => stateMap[id].enabled)
        .map(id => ({
          data: dataMap[id].data,
          weight: stateMap[id].weight,
          dimensions: dataMap[id].dimensions,
          min: dataMap[id].min,
          max: dataMap[id].max
        }));
      
      if (selectedRecords.length === 0) {
        dispatch(setTexture(null));
        return null;
      }
      
      const totalWeight = selectedRecords.reduce(
        (total, item) => total + item.weight,
        0
      );
      
      if (totalWeight === 0) {
        dispatch(addToast({
          message: "Total weight is zero. Please adjust weights.",
          type: "warning",
          duration: 5000
        }));
        dispatch(setTexture(null));
        return null;
      }
      
      let mainRecord = new Array(selectedRecords[0].data.flat().length).fill(0);
      
      for (const record of selectedRecords) {
        const flatData = record.data.flat();
        flatData.forEach((value: number, index: number) => {
          mainRecord[index] += value * record.weight / totalWeight;
        });
      }
      
      const min = Math.min(...mainRecord);
      const max = Math.max(...mainRecord);
      
      const newTexture = createTexture(
        mainRecord,
        selectedRecords[0].dimensions,
        { min, max },
        colorMaps[selectedColorMap]
      );
      
      dispatch(setTexture(newTexture));
      return newTexture;
      
    } catch (error) {
      console.error("Error creating weighted texture:", error);
      dispatch(addToast({
        message: "Failed to create texture from data",
        type: "error",
        duration: 7000
      }));
      return null;
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const updateImageTransformation = createAsyncThunk(
  "plot/updateImageTransformation",
  async (
    transformType: 'flipHorizontal' | 'flipVertical' | 'rotateClockwise' | 'rotateCounterClockwise',
    { dispatch, getState }
  ) => {
    try {
      dispatch(setIsLoading(true));
      
      const state = getState() as RootState;
      const { coordinateMatrix, plotDimensions } = state.plot;
      
      let newCoordinate: Matrix = { matrix: [], shape: [0, 0] };
      
      switch (transformType) {
        case 'flipHorizontal':
          newCoordinate = flipHorizontal([...coordinateMatrix.map(row => [...row])]);
          break;
        case 'flipVertical':
          newCoordinate = flipVertical([...coordinateMatrix.map(row => [...row])]);
          break;
        case 'rotateClockwise':
          newCoordinate = rotateClockwise([...coordinateMatrix.map(row => [...row])]);
          break;
        case 'rotateCounterClockwise':
          newCoordinate = rotateCounterClockwise([...coordinateMatrix.map(row => [...row])]);
          break;
      }
      
    //   dispatch(setImageTransform(newMatrix));
      
      dispatch(createWeightedTexture());
      console.log("Transformed Coordinate:", newCoordinate)
      
    } catch (error) {
      console.error(`Error applying ${transformType} transformation:`, error);
      dispatch(addToast({
        message: "Error transforming image. Please try again.",
        type: "error",
        duration: 5000
      }));
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);
