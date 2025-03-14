import { NpyData } from '../types/record';
import { npArrayToJS } from './matrix-util';
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

  const { matrix: jsMatrix, shape } = npArrayToJS(data, npyData.shape)

  return {
    data: jsMatrix,
    shape: shape,
    min,
    max
  };
};
