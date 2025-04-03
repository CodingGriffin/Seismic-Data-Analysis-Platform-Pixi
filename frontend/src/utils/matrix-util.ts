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

  let rotated: Matrix = Array.from({ length: cols }, () => Array(rows).fill(0));

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

  let rotated: Matrix = Array.from({ length: cols }, () => Array(rows).fill(0));

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
  return matrix.map(row => row.map(value => value * multiFactor));
};

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

  let result: Matrix = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));
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

  const ROTATE_CW = [[0, 1], [-1, 0]]; // Rotate 90 degrees clockwise
  const ROTATE_CCW = [[0, -1], [1, 0]]; // Rotate 90 degrees counterclockwise
  const FLIP_HORIZONTAL = [[1, 0], [0, -1]]; // Flip vertically
  const FLIP_VERTICAL = [[-1, 0], [0, 1]]; // Flip horizontally

  const transformationsMap: Record<string, Matrix> = {
    rotateClockwise: ROTATE_CW,
    rotateCounterClockwise: ROTATE_CCW,
    flipVertical: FLIP_VERTICAL,
    flipHorizontal: FLIP_HORIZONTAL
  };

  // Start with an identity matrix for the transformation
  let T = [[1, 0], [0, 1]];

  let rotateCount = 0; // To track the number of rotations

  // Apply all transformations to the matrix in sequence
  for (let transform of transformations) {
    if (transform in transformationsMap) {
      if (transform === 'rotateClockwise') {
        rotateCount += 1; // Increment for clockwise rotation
      } else if (transform === 'rotateCounterClockwise') {
        rotateCount -= 1; // Decrement for counterclockwise rotation
      } else {
        T = multiplyMatrices(transformationsMap[transform], T);
      }
    }
  }

  // Normalize rotation count (modulo 4 because 4 rotations result in no change)
  rotateCount = ((rotateCount % 4) + 4) % 4; // Ensures the value stays within 0-3

  // Apply the net rotation (rotateCount could be 1, 2, or 3)
  for (let i = 0; i < rotateCount; i++) {
    T = multiplyMatrices(ROTATE_CW, T); // Apply 90-degree clockwise rotation
  }

  // Convert the 2x2 matrix to a 3x3 matrix for homogeneous coordinates
  let T3 = expandTo3x3(T, rows, cols);

  // Adjust matrix dimensions based on the number of rotations
  let newMatrix: Matrix = Array.from({ length: rotateCount === 2 ? rows : cols }, () =>
    Array(rotateCount === 2 ? cols : rows).fill(0)
  );

  // Apply the final transformation
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

/**
 * Compares two matrices for equality
 * @param matrix1 First matrix to compare
 * @param matrix2 Second matrix to compare
 * @param epsilon Optional tolerance for floating point comparison (default: 0)
 * @returns True if matrices have same dimensions and all elements are equal
 */
export const areMatricesEqual = (
  matrix1: Matrix, 
  matrix2: Matrix, 
  epsilon: number = 0
): boolean => {
  // Check if dimensions match
  if (matrix1.length !== matrix2.length) {
    return false;
  }
  
  if (matrix1.length === 0) {
    return matrix2.length === 0;
  }
  
  if (matrix1[0].length !== matrix2[0].length) {
    return false;
  }
  
  // Check each element
  for (let i = 0; i < matrix1.length; i++) {
    for (let j = 0; j < matrix1[0].length; j++) {
      if (epsilon === 0) {
        // Exact comparison
        if (matrix1[i][j] !== matrix2[i][j]) {
          return false;
        }
      } else {
        // Comparison with tolerance for floating point
        if (Math.abs(matrix1[i][j] - matrix2[i][j]) > epsilon) {
          return false;
        }
      }
    }
  }
  
  return true;
};
