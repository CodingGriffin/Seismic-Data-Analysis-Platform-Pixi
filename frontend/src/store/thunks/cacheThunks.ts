import { createAsyncThunk } from "@reduxjs/toolkit";
import { processGrids, processSingleGrid } from "../../services/api";
import { RecordItem } from "../../types/record";
import {
  setPreviewRecords,
  setPreviewFreqData,
  setPreviewSlowData,
  setIsLoading
} from "../slices/cacheSlice";
import { addToast } from "../slices/toastSlice";
import { rotateClockwise, flipVertical } from "../../utils/matrix-util";

export const processGridsForPreview = createAsyncThunk(
  "cache/processGridsForPreview",
  async (
    {
      sgyFiles,
      geometryData,
      maxSlowness,
      maxFrequency,
      numSlowPoints,
      numFreqPoints,
      returnFreqAndSlow = true,
    }: {
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

      const recordItems: RecordItem[] = grids.map((grid: any) => {
        const { data, shape, name } = grid;
        const flatData = data.flat();
        let { matrix: rotated } = rotateClockwise(data);
        let { matrix: transformed, shape:transformedShape } = flipVertical(rotated);

        return {
          fileName: name,
          enabled: false,
          weight: 0,
          data: transformed,
          dimensions: {
            width: transformedShape[1],
            height: transformedShape[0],
          },
          shape: shape,
          min: Math.min(...flatData),
          max: Math.max(...flatData),
        };
      });

      dispatch(setPreviewRecords(recordItems));

      dispatch(addToast({
        message: "Files processed successfully",
        type: "success"
      }));

      return recordItems;
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

export const processSingleGridForPreview = createAsyncThunk(
  "cache/processSingleGridForPreview",
  async (
    {
      sgyFile,
      geometryData,
      maxSlowness,
      maxFrequency,
      numSlowPoints,
      numFreqPoints,
    }: {
      sgyFile: File;
      geometryData: string;
      maxSlowness: number;
      maxFrequency: number;
      numSlowPoints: number;
      numFreqPoints: number;
    },
    { dispatch }
  ) => {
    try {
      dispatch(setIsLoading(true));

      const response = await processSingleGrid(
        sgyFile,
        geometryData,
        maxSlowness,
        maxFrequency,
        numSlowPoints,
        numFreqPoints
      );

      const { grid, freq, slow } = response.data.data;

      if (freq) {
        dispatch(setPreviewFreqData(freq.data));
      }

      if (slow) {
        dispatch(setPreviewSlowData(slow.data));
      }

      const { data, shape, name } = grid;
      const flatData = data.flat();

      const recordItem: RecordItem = {
        fileName: name,
        enabled: false,
        weight: 0,
        data: data,
        dimensions: {
          width: shape[1],
          height: shape[0],
        },
        shape: shape,
        min: Math.min(...flatData),
        max: Math.max(...flatData),
      };

      dispatch(setPreviewRecords([recordItem]));

      dispatch(addToast({
        message: "File processed successfully",
        type: "success"
      }));

      return recordItem;
    } catch (error) {
      console.error("Error processing grid:", error);
      dispatch(addToast({
        message: "Error processing file. Please try again.",
        type: "error",
        duration: 7000
      }));
      throw error;
    } finally {
      dispatch(setIsLoading(false));
    }
  }
);