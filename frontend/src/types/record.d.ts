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

export interface RecordState {
  enabled: boolean;
  weight: number;
}

export interface RecordData {
  fileName: string;
  data: number[][];
  shape: number[];
  dimensions: { width: number; height: number };
  min: number;
  max: number;
}

export interface RecordItem extends RecordData, RecordState {}
export type RGB = { r: number; g: number; b: number };
export type ColorStop = { color: RGB; position: number };