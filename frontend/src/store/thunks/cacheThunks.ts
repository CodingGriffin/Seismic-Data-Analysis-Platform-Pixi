import { createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "..";
import {
  setPreviewFreqData,
  setPreviewSlowData,
  setIsLoading
} from "../slices/cacheSlice";
import { addToast } from "../slices/toastSlice";
import { rotateClockwise, flipVertical, getMatrixShape } from "../../utils/matrix-util";
import { setRecords } from "../slices/recordSlice";
import { setNumFreq, setMaxFreq } from "../slices/freqSlice";
import { setMaxSlow, setNumSlow } from "../slices/slowSlice";
import { setGeometry } from "../slices/geometrySlice";
import { setOptions } from "../slices/recordSlice";
import { setPoints } from "../slices/plotSlice";
import { updateDataLimits } from "../slices/plotSlice";
import { 
  getOptions,
  getPicks,
  getGrids,
  processGrids,
  savePicks,
  saveOptions
} from "../../services/api";

export const processGridsForPreview = createAsyncThunk(
  "cache/processGridsForPreview",
  async (
    {
      projectId,
      sgyFiles,
      geometryData,
      maxSlowness,
      maxFrequency,
      numSlowPoints,
      numFreqPoints,
      returnFreqAndSlow = true,
    }: {
      projectId: string;
      sgyFiles: File[];
      geometryData: string;
      maxSlowness: number;
      maxFrequency: number;
      numSlowPoints: number;
      numFreqPoints: number;
      returnFreqAndSlow?: boolean;
    },
    { dispatch }
  ) => {
    try {
      dispatch(setIsLoading(true));

      const response = await processGrids(
        projectId,
        sgyFiles,
        geometryData,
        maxSlowness,
        maxFrequency,
        numSlowPoints,
        numFreqPoints,
        returnFreqAndSlow
      );

      const { grids, freq, slow } = response.data.data;

      if (freq) {
        dispatch(setPreviewFreqData(freq.data));
      }

      if (slow) {
        dispatch(setPreviewSlowData(slow.data));
      }

      const recordDataArray = grids.map((grid: any) => {
        const { data, shape, name } = grid;
        const flatData = data.flat();
        const rotated = rotateClockwise(data);
        const transformed = flipVertical(rotated);
        const transformedShape = getMatrixShape(transformed);
        return {
          id: name,
          data: {
            data: transformed,
            dimensions: {
              width: transformedShape[1],
              height: transformedShape[0],
            },
            shape: shape,
            min: Math.min(...flatData),
            max: Math.max(...flatData),
          }
        }
      });

      dispatch(setRecords(recordDataArray))
      dispatch(addToast({
        message: "Record Data updated successfully",
        type: "success"
      }));

      return recordDataArray;
    } catch (error) {
      console.error("Error processing grids:", error);
      dispatch(addToast({
        message: "Error processing files. Please try again.",
        type: "error",
        duration: 7000
      }));
      throw error;
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const fetchGridsByProjectId = createAsyncThunk(
  "cache/processGridsForPreview",
  async (
      projectId: string,
    { dispatch }
  ) => {
    try {
      dispatch(setIsLoading(true));

      const response = await getGrids(projectId)

      const { grids, freq, slow } = response.data.data;

      if (freq) {
        dispatch(setPreviewFreqData(freq.data));
      }

      if (slow) {
        dispatch(setPreviewSlowData(slow.data));
      }

      const recordDataArray = grids.map((grid: any) => {
        const { data, shape, name } = grid;
        const flatData = data.flat();
        const rotated = rotateClockwise(data);
        const transformed = flipVertical(rotated);
        const transformedShape = getMatrixShape(transformed);
        return {
          id: name,
          data: {
            data: transformed,
            dimensions: {
              width: transformedShape[1],
              height: transformedShape[0],
            },
            shape: shape,
            min: Math.min(...flatData),
            max: Math.max(...flatData),
          }
        }
      });

      dispatch(setRecords(recordDataArray))
      dispatch(addToast({
        message: "Record Data updated successfully",
        type: "success"
      }));

      return recordDataArray;
    } catch (error) {
      console.error("Error processing grids:", error);
      dispatch(addToast({
        message: "Error processing files. Please try again.",
        type: "error",
        duration: 7000
      }));
      throw error;
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);

export const fetchOptionsByProjectId = createAsyncThunk(
  "cache/fetchOptionsByProjectId",
  async (
    projectId: string,
    { dispatch }
  ) => {
    if (!projectId) return;

    try {
      // Fetch options
      const optionsResponse = await getOptions(projectId);
      if (optionsResponse.data) {
        console.log("Options from backend:", optionsResponse.data);
        dispatch(setGeometry(optionsResponse.data.geometry));
        dispatch(setOptions(optionsResponse.data.records));
        dispatch(setNumFreq(optionsResponse.data.plotLimits.numFreq));
        dispatch(setMaxFreq(optionsResponse.data.plotLimits.maxFreq));
        dispatch(setNumSlow(optionsResponse.data.plotLimits.numSlow));
        dispatch(setMaxSlow(optionsResponse.data.plotLimits.maxSlow));
        dispatch(updateDataLimits({
          freqMax: optionsResponse.data.plotLimits.maxFreq,
          freqMin: 0,
          slowMax: optionsResponse.data.plotLimits.maxSlow,
          slowMin:0,
        }));
      }

      return {
        options: optionsResponse.data
      };
    } catch (error) {
      console.error("Error fetching options:", error);
      dispatch(addToast({
        message: "Failed to load options data",
        type: "error",
        duration: 5000
      }));
      throw error;
    }
  }
);

export const fetchPicksByProjectId = createAsyncThunk(
  "cache/fetchPicksByProjectId",
  async (
    projectId: string,
    { dispatch }
  ) => {
    if (!projectId) return;

    try {
      // Fetch picks
      const picksResponse = await getPicks(projectId);
      if (picksResponse.data) {
        console.log("Picks from backend:", picksResponse.data);
        dispatch(setPoints(picksResponse.data));
      }

      return {
        picks: picksResponse.data
      };
    } catch (error) {
      console.error("Error fetching picks:", error);
      dispatch(addToast({
        message: "Failed to load picks data",
        type: "error",
        duration: 5000
      }));
      throw error;
    }
  }
);

export const savePicksByProjectId = createAsyncThunk(
  "cache/savePicksByProjectId",
  async (
    projectId: string | undefined,
    { dispatch, getState }
  ) => {
    if (!projectId) {
      dispatch(addToast({
        message: "No project ID available",
        type: "error",
        duration: 5000
      }));
      return;
    }

    const state = getState() as RootState;
    const points = state.plot.points;
    
    if (points.length === 0) {
      dispatch(addToast({
        message: "No points to save",
        type: "warning",
        duration: 5000
      }));
      return;
    }

    try {
      const response = await savePicks(projectId, points);
      dispatch(addToast({
        message: "Points saved successfully",
        type: "success",
        duration: 5000
      }));
      return response.data;
    } catch (error) {
      console.error("Error saving picks:", error);
      dispatch(addToast({
        message: "Failed to save points",
        type: "error",
        duration: 5000
      }));
      throw error;
    }
  }
);

export const saveOptionsByProjectId = createAsyncThunk(
  "cache/saveOptionsByProjectId",
  async (
    projectId: string | undefined,
    { dispatch, getState }
  ) => {
    if (!projectId) {
      dispatch(addToast({
        message: "No project ID available",
        type: "error",
        duration: 5000
      }));
      return;
    }

    try {
      const state = getState() as RootState;
      const geometry = state.geometry.items;
      const records = state.record.options;
      const plotLimits = {
        numFreq: state.freq.numFreq,
        maxFreq: state.freq.maxFreq,
        numSlow: state.slow.numSlow,
        maxSlow: state.slow.maxSlow
      };

      const response = await saveOptions(projectId, geometry, records, plotLimits);
      dispatch(addToast({
        message: "Options saved successfully",
        type: "success",
        duration: 5000
      }));
      return response.data;
    } catch (error) {
      console.error("Error saving options:", error);
      dispatch(addToast({
        message: "Failed to save options",
        type: "error",
        duration: 5000
      }));
      throw error;
    }
  }
);
