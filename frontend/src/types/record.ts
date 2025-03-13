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
