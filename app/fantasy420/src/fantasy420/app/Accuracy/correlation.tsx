function euclideanDistance(point1: number[], point2: number[]) {
  let sumSquaredDiffs = 0;
  for (let i = 0; i < point1.length; i++) {
    sumSquaredDiffs += Math.pow(point1[i] - point2[i], 2);
  }
  return Math.sqrt(sumSquaredDiffs);
}

function mean(array: number[]) {
  return array.reduce((sum, value) => sum + value, 0) / array.length;
}

type Matrix = number[][];

function centeredMatrix(matrix: Matrix) {
  const numRows = matrix.length;
  const numCols = matrix[0].length;

  const rowMeans = [];
  const colMeans = [];

  for (let i = 0; i < numRows; i++) {
    const rowSum = matrix[i].reduce((sum, value) => sum + value, 0);
    rowMeans.push(rowSum / numCols);
  }

  for (let j = 0; j < numCols; j++) {
    const colSum = matrix.reduce((sum, row) => sum + row[j], 0);
    colMeans.push(colSum / numRows);
  }

  const centered = [];

  for (let i = 0; i < numRows; i++) {
    const centeredRow = [];
    for (let j = 0; j < numCols; j++) {
      centeredRow.push(
        matrix[i][j] -
          rowMeans[i] -
          colMeans[j] +
          mean(matrix.map((array) => mean(array)))
      );
    }
    centered.push(centeredRow);
  }

  return centered;
}

function distanceCovariance(matrix1: Matrix, matrix2: Matrix) {
  const numRows = matrix1.length;
  const numCols = matrix1[0].length;

  let cov = 0;

  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      cov += matrix1[i][j] * matrix2[i][j];
    }
  }

  return cov / (numRows * numCols);
}

export default function distanceCorrelation(data: number[][]) {
  const numRows = data.length;
  const numCols = data[0].length;

  const distances = new Array(numRows);

  for (let i = 0; i < numRows; i++) {
    distances[i] = new Array(numRows);
    for (let j = 0; j < numCols; j++) {
      distances[i][j] = euclideanDistance(data[i], data[j]);
    }
  }

  const centeredDistances = centeredMatrix(distances);

  const covXY = distanceCovariance(centeredDistances, centeredDistances);
  const covXX = distanceCovariance(centeredDistances, centeredDistances);
  const covYY = distanceCovariance(centeredDistances, centeredDistances);

  const dCor =
    Math.sqrt(covXY) / Math.sqrt(Math.sqrt(covXX) * Math.sqrt(covYY));

  return dCor;
}
