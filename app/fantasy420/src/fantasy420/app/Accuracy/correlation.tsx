export default function correlation(points: number[][]) {
  // Calculate the mean of y values
  const sumY = points.reduce((sum, point) => sum + point[1], 0);
  const meanY = sumY / points.length;

  // Calculate the sum of squared differences
  const ssTotal = points.reduce(
    (ss, point) => ss + Math.pow(point[1] - meanY, 2),
    0
  );

  // Calculate the sum of squared residuals
  const regression = linearRegression(points);
  const ssResidual = points.reduce(
    (ss, point) =>
      ss + Math.pow(point[1] - (regression.m * point[0] + regression.b), 2),
    0
  );

  // Calculate R-squared value
  const r2 = 1 - ssResidual / ssTotal;

  return r2;
}

function linearRegression(points: number[][]) {
  const sumX = points.reduce((sum, point) => sum + point[0], 0);
  const sumY = points.reduce((sum, point) => sum + point[1], 0);
  const meanX = sumX / points.length;
  const meanY = sumY / points.length;

  const numerator = points.reduce(
    (sum, point) => sum + (point[0] - meanX) * (point[1] - meanY),
    0
  );
  const denominator = points.reduce(
    (sum, point) => sum + Math.pow(point[0] - meanX, 2),
    0
  );

  const m = numerator / denominator;
  const b = meanY - m * meanX;

  return { m, b };
}
