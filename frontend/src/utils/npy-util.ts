import { NpyData } from '../types/record';
import { getMatrixShape, npArrayToMatrix } from './matrix-util';
import NpyJs from 'npyjs';

export const extractDataFromNpy = async (file: File): Promise<NpyData> => {
  const npyjs = new NpyJs();
  const arrayBuffer = await file.arrayBuffer();
  const npyData = await npyjs.load(arrayBuffer);

  const data = new Array(npyData.data.length);
  for (let i = 0; i < npyData.data.length; i++) {
    data[i] = Number(npyData.data[i]);
  }

  let min = Number(npyData.data[0]);
  let max = min;
  for (let i = 1; i < npyData.data.length; i++) {
    const val = Number(npyData.data[i]);
    if (val < min) min = val;
    if (val > max) max = val;
  }

  const jsMatrix = npArrayToMatrix(data, npyData.shape)
  const shape = getMatrixShape(jsMatrix);

  return {
    data: jsMatrix,
    shape: shape,
    min,
    max
  };
};
