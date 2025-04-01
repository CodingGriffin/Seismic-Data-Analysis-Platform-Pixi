import { Matrix } from '../types/record';

export const getMatrixShape = (matrix: Matrix): [number, number] => {
  if (!matrix || matrix.length === 0) {
    return [0, 0];
  }
  return [matrix.length, matrix[0].length];
};

export const npArrayToMatrix = (flatArray: number[], shape: number[]) => {
  const [rows, cols] = shape;
  let result: Matrix = [];

  for (let i = 0; i < rows; i++) {
    result.push(
      Array.from(flatArray.slice(i * cols, (i + 1) * cols), (value) =>
        Number(value)
      )
    );
  }

  return result;
};

export const rotateClockwise = (matrix: Matrix): Matrix => {
  const rows = matrix.length;
  const cols = matrix[0].length;

  let rotated: Matrix = Array.from({ length: cols }, () => Array(rows));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = matrix[r][c];
    }
  }

  return rotated;
};

export const rotateCounterClockwise = (matrix: Matrix): Matrix => {
  const rows = matrix.length;
  const cols = matrix[0].length;

  let rotated: Matrix = Array.from({ length: cols }, () => Array(rows));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[cols - 1 - c][r] = matrix[r][c];
    }
  }

  return rotated;
};

export const flipVertical = (matrix: Matrix): Matrix => {
  return [...matrix].reverse();
};

export const flipHorizontal = (matrix: Matrix): Matrix => {
  return matrix.map(row => [...row].reverse());
};

export const multiplyScalar = (matrix: Matrix, multiFactor: number): Matrix => {
  return matrix.map(row => row.map(value => value * multiFactor))
}

export const addMatrices = (matrix1: Matrix, matrix2: Matrix): Matrix => {
  if (matrix1.length !== matrix2.length || matrix1[0].length !== matrix2[0].length) {
    throw new Error("Matrices must have the same dimensions for addition.");
  }

  return matrix1.map((row, rowIndex) => 
    row.map((value, colIndex) => value + matrix2[rowIndex][colIndex])
  );

};

export const multiplyMatrices = (A: Matrix, B: Matrix): Matrix => {
  const rowsA = A.length, colsA = A[0].length;
  const rowsB = B.length, colsB = B[0].length;
  if (colsA !== rowsB) throw new Error("Matrix dimensions do not match for multiplication");

  let result = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
};

const expandTo3x3 = (T: Matrix, rows: number, cols: number): Matrix => {
  return [
    [T[0][0], T[0][1], (T[0][0] === -1 ? rows - 1 : 0) + (T[0][1] === -1 ? cols - 1 : 0)],
    [T[1][0], T[1][1], (T[1][0] === -1 ? rows - 1 : 0) + (T[1][1] === -1 ? cols - 1 : 0)],
    [0, 0, 1]
  ];
};

export const applyTransformation = (matrix: Matrix, transformations: string[]): Matrix => {
  const rows = matrix.length;
  const cols = matrix[0].length;

  const ROTATE_CW = [[0, 1], [-1, 0]];
  const ROTATE_CCW = [[0, -1], [1, 0]];
  const FLIP_VERTICAL = [[1, 0], [0, -1]];
  const FLIP_HORIZONTAL = [[-1, 0], [0, 1]];

  let T = [[1, 0], [0, 1]];

  for (let transform of transformations) {
    if (transform === 'rotateClockwise') T = multiplyMatrices(ROTATE_CW, T);
    if (transform === 'rotateCounterClockwise') T = multiplyMatrices(ROTATE_CCW, T);
    if (transform === 'flipVertical') T = multiplyMatrices(FLIP_VERTICAL, T);
    if (transform === 'flipHorizontal') T = multiplyMatrices(FLIP_HORIZONTAL, T);
  }

  let T3 = expandTo3x3(T, rows, cols);
  let newMatrix: Matrix =
    transformations.includes('rotateCW') || transformations.includes('rotateCCW')
      ? Array.from({ length: cols }, () => Array(rows).fill(0))
      : Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let [x, y, _] = multiplyMatrixVector(T3, [[i], [j], [1]]).map(row => row[0]);
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && x < newMatrix.length && y >= 0 && y < newMatrix[0].length) {
        newMatrix[x][y] = matrix[i][j];
      }
    }
  }

  return newMatrix;
};

const multiplyMatrixVector = (matrix: Matrix, vector: Matrix): Matrix => {
  return multiplyMatrices(matrix, vector);
};