import { Matrix } from '../types/record';

export const npArrayToMatrix = (flatArray: number[], shape: number[]) => {
  const [rows, cols] = shape;
  let result: number[][] = [];

  for (let i = 0; i < rows; i++) {
    result.push(
      Array.from(flatArray.slice(i * cols, (i + 1) * cols), (value) =>
        Number(value)
      )
    );
  }

  return { matrix: result, shape };
};

export const rotateClockwise = (matrix: number[][]): Matrix => {
  const rows = matrix.length;
  const cols = matrix[0].length;

  let rotated: number[][] = Array.from({ length: cols }, () => Array(rows));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = matrix[r][c];
    }
  }

  return { matrix: rotated, shape: [cols, rows] };
};

export const rotateCounterClockwise = (matrix: number[][]): Matrix => {
  const rows = matrix.length;
  const cols = matrix[0].length;

  let rotated: number[][] = Array.from({ length: cols }, () => Array(rows));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[cols - 1 - c][r] = matrix[r][c];
    }
  }

  return { matrix: rotated, shape: [cols, rows] };
};

export const flipVertical = (matrix: number[][]): Matrix => {
  let flipped = [...matrix].reverse();
  return { matrix: flipped, shape: [matrix.length, matrix[0].length] };
};

export const flipHorizontal = (matrix: number[][]): Matrix => {
  let flipped = matrix.map((row) => [...row].reverse());
  return { matrix: flipped, shape: [matrix.length, matrix[0].length] };
};
