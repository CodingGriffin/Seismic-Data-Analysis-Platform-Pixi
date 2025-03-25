import { createAsyncThunk } from "@reduxjs/toolkit";
import { processGrids } from "../../services/api";
import {
  setPreviewFreqData,
  setPreviewSlowData,
  setIsLoading
} from "../slices/cacheSlice";
import { addToast } from "../slices/toastSlice";
import { rotateClockwise, flipVertical, getMatrixShape } from "../../utils/matrix-util";
import { setRecords} from "../slices/recordSlice";

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