export interface Point {
  x: number;
  y: number;
  
 
  value: number;
  color: number;
}

export interface PickData {
  d1: number;
  d2: number;
  frequency: number;
  d3: number;
  slowness: number;
  d4: number;
  d5: number;
}

export type RGB = { r: number; g: number; b: number };
export type ColorStop = { color: RGB; position: number };

export interface AxisData {
  data: Float32Array | Float64Array;
  shape: number[];
}

export interface NpyData {
  data: number[][];
  shape: number[];
  min: number;
  max: number;
}

export interface Matrix {
  matrix:number[][],
  shape:[number, number]
}