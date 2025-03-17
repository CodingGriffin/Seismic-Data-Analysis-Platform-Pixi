export interface NpyData {
  data: number[][];
  shape: number[];
  min: number;
  max: number;
}

export interface Matrix {
  matrix: number[][];
  shape: [number, number];
}

interface RecordItem {
  fileName:string;
  enabled:boolean;
  weight:number;
  data: number[][];
  shape: number[];
  dimensions: { width: number; height: number };
  min: number;
  max: number;
}

export type RGB = { r: number; g: number; b: number };
export type ColorStop = { color: RGB; position: number };