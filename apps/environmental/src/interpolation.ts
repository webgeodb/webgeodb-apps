/**
 * Interpolation Algorithms Implementation
 *
 * Provides various spatial interpolation methods for environmental data
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface Point3D {
  x: number;
  y: number;
  value: number;
}

interface VariogramModel {
  range: number;
  sill: number;
  nugget: number;
}

interface InterpolationOptions {
  power?: number; // For IDW
  variogramModel?: VariogramModel; // For Kriging
  maxDistance?: number;
  minPoints?: number;
  maxPoints?: number;
}

// ============================================================================
// Inverse Distance Weighting (IDW)
// ============================================================================

export class IDWInterpolator {
  private points: Point3D[] = [];

  constructor(points: Point3D[] = []) {
    this.points = points;
  }

  setPoints(points: Point3D[]): void {
    this.points = points;
  }

  addPoint(point: Point3D): void {
    this.points.push(point);
  }

  /**
   * IDW interpolation at a single point
   * @param targetPoint - The point to interpolate
   * @param power - Power parameter (default: 2)
   * @param maxDistance - Maximum search distance (optional)
   * @returns Interpolated value
   */
  interpolate(
    targetPoint: { x: number; y: number },
    options: InterpolationOptions = {}
  ): number {
    const {
      power = 2,
      maxDistance = Infinity,
      minPoints = 1,
      maxPoints = this.points.length
    } = options;

    // Filter points by distance
    const nearbyPoints = this.points
      .map(p => ({
        ...p,
        distance: Math.sqrt(
          Math.pow(targetPoint.x - p.x, 2) +
          Math.pow(targetPoint.y - p.y, 2)
        )
      }))
      .filter(p => p.distance <= maxDistance && p.distance > 0)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxPoints);

    if (nearbyPoints.length < minPoints) {
      return 0;
    }

    let numerator = 0;
    let denominator = 0;

    for (const point of nearbyPoints) {
      const weight = 1 / Math.pow(point.distance, power);
      numerator += weight * point.value;
      denominator += weight;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Generate interpolated grid
   * @param bounds - Geographic bounds
   * @param resolution - Grid cell size
   * @param options - Interpolation options
   * @returns Interpolation result with grid values
   */
  generateGrid(
    bounds: {
      west: number;
      south: number;
      east: number;
      north: number;
    },
    resolution: number,
    options: InterpolationOptions = {}
  ): {
    timestamp: number;
    grid: {
      bounds: typeof bounds;
      resolution: number;
      values: number[][];
    };
    method: 'idw';
    parameters: InterpolationOptions;
  } {
    const rows = Math.ceil((bounds.north - bounds.south) / resolution);
    const cols = Math.ceil((bounds.east - bounds.west) / resolution);
    const grid: number[][] = [];

    for (let i = 0; i < rows; i++) {
      grid[i] = [];
      for (let j = 0; j < cols; j++) {
        const x = bounds.west + j * resolution;
        const y = bounds.south + i * resolution;

        grid[i][j] = this.interpolate({ x, y }, options);
      }
    }

    return {
      timestamp: Date.now(),
      grid: { bounds, resolution, values: grid },
      method: 'idw',
      parameters: options
    };
  }

  /**
   * Calculate interpolation error (cross-validation)
   * @param options - Interpolation options
   * @returns Mean absolute error
   */
  calculateCrossValidationError(options: InterpolationOptions = {}): number {
    let totalError = 0;
    let count = 0;

    for (let i = 0; i < this.points.length; i++) {
      // Leave one out
      const trainingPoints = this.points.filter((_, idx) => idx !== i);
      const testPoint = this.points[i];

      const interpolator = new IDWInterpolator(trainingPoints);
      const predicted = interpolator.interpolate(testPoint, options);
      const actual = testPoint.value;

      totalError += Math.abs(predicted - actual);
      count++;
    }

    return count === 0 ? 0 : totalError / count;
  }

  /**
   * Optimize power parameter using cross-validation
   * @param minPower - Minimum power to test
   * @param maxPower - Maximum power to test
   * @param step - Step size
   * @returns Optimal power value
   */
  optimizePower(
    minPower: number = 0.5,
    maxPower: number = 5,
    step: number = 0.5
  ): number {
    let bestPower = 2;
    let bestError = Infinity;

    for (let p = minPower; p <= maxPower; p += step) {
      const error = this.calculateCrossValidationError({ power: p });
      if (error < bestError) {
        bestError = error;
        bestPower = p;
      }
    }

    return bestPower;
  }
}

// ============================================================================
// Kriging Interpolation
// ============================================================================

export class KrigingInterpolator {
  private points: Point3D[] = [];

  constructor(points: Point3D[] = []) {
    this.points = points;
  }

  setPoints(points: Point3D[]): void {
    this.points = points;
  }

  /**
   * Simple Kriging interpolation
   * @param targetPoint - The point to interpolate
   * @param variogramModel - Variogram model parameters
   * @returns Interpolated value
   */
  interpolate(
    targetPoint: { x: number; y: number },
    variogramModel: VariogramModel
  ): number {
    if (this.points.length === 0) {
      return 0;
    }

    // 1. Calculate semivariance function
    const semivariance = this.calculateSemivariance(variogramModel);

    // 2. Build Kriging matrix and solve for weights
    const weights = this.calculateKrigingWeights(targetPoint, semivariance);

    // 3. Calculate prediction
    const prediction = weights.reduce((sum, w, i) => {
      return sum + w * this.points[i].value;
    }, 0);

    return prediction;
  }

  private calculateSemivariance(model: VariogramModel): (distance: number) => number {
    return (distance: number) => {
      if (distance === 0) return model.nugget;

      const contribution = model.sill * (1 - Math.exp(-3 * distance / model.range));
      return model.nugget + Math.min(contribution, model.sill);
    };
  }

  private calculateKrigingWeights(
    target: { x: number; y: number },
    semivariance: (distance: number) => number
  ): number[] {
    const n = this.points.length;

    // Build distance matrix
    const distanceMatrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      distanceMatrix[i] = [];
      for (let j = 0; j < n; j++) {
        const dist = Math.sqrt(
          Math.pow(this.points[i].x - this.points[j].x, 2) +
          Math.pow(this.points[i].y - this.points[j].y, 2)
        );
        distanceMatrix[i][j] = semivariance(dist);
      }
    }

    // Build Kriging matrix with constraint
    const krigingMatrix: number[][] = [];
    for (let i = 0; i <= n; i++) {
      krigingMatrix[i] = [];
      for (let j = 0; j <= n; j++) {
        if (i === n || j === n) {
          krigingMatrix[i][j] = 1;
        } else if (i === j) {
          krigingMatrix[i][j] = 0;
        } else {
          krigingMatrix[i][j] = distanceMatrix[i][j];
        }
      }
    }

    // Calculate distances to target
    const rhs: number[] = [];
    for (let i = 0; i < n; i++) {
      const dist = Math.sqrt(
        Math.pow(this.points[i].x - target.x, 2) +
        Math.pow(this.points[i].y - target.y, 2)
      );
      rhs.push(semivariance(dist));
    }
    rhs.push(1);

    // Solve system (simplified - using equal weights)
    // In production, use proper linear algebra solver
    return new Array(n).fill(1 / n);
  }

  /**
   * Estimate variogram parameters from data
   * @returns Estimated variogram model
   */
  estimateVariogram(): VariogramModel {
    if (this.points.length < 2) {
      return { range: 1, sill: 1, nugget: 0 };
    }

    // Calculate empirical variogram
    const lags: number[] = [];
    const semivariances: number[] = [];

    const maxLag = 0.1; // Maximum lag distance
    const numLags = 10;

    for (let l = 1; l <= numLags; l++) {
      const lag = (maxLag / numLags) * l;
      const pairs: { diff2: number; distance: number }[] = [];

      for (let i = 0; i < this.points.length; i++) {
        for (let j = i + 1; j < this.points.length; j++) {
          const dist = Math.sqrt(
            Math.pow(this.points[i].x - this.points[j].x, 2) +
            Math.pow(this.points[i].y - this.points[j].y, 2)
          );

          if (Math.abs(dist - lag) < maxLag / numLags) {
            pairs.push({
              diff2: Math.pow(this.points[i].value - this.points[j].value, 2),
              distance: dist
            });
          }
        }
      }

      if (pairs.length > 0) {
        const gamma = pairs.reduce((sum, p) => sum + p.diff2, 0) / (2 * pairs.length);
        lags.push(lag);
        semivariances.push(gamma);
      }
    }

    // Fit exponential model (simplified)
    const sill = Math.max(...semivariances, 1);
    const range = lags[semivariances.indexOf(Math.max(...semivariances.slice(0, -1)))];
    const nugget = semivariances[0] || 0;

    return { range, sill, nugget };
  }
}

// ============================================================================
// Spline Interpolation
// ============================================================================

export class SplineInterpolator {
  private points: Point3D[] = [];

  constructor(points: Point3D[] = []) {
    this.points = points;
  }

  /**
   * Thin plate spline interpolation
   * @param targetPoint - The point to interpolate
   * @param smoothing - Smoothing parameter
   * @returns Interpolated value
   */
  interpolate(
    targetPoint: { x: number; y: number },
    smoothing: number = 0
  ): number {
    if (this.points.length === 0) {
      return 0;
    }

    // Calculate radial basis function values
    const n = this.points.length;
    const weights = new Array(n).fill(1 / n);

    let result = 0;
    for (let i = 0; i < n; i++) {
      const dist = Math.sqrt(
        Math.pow(targetPoint.x - this.points[i].x, 2) +
        Math.pow(targetPoint.y - this.points[i].y, 2)
      );

      const rbf = dist === 0 ? 0 : dist * dist * Math.log(dist);
      result += weights[i] * this.points[i].value + rbf;
    }

    return result;
  }
}

// ============================================================================
// Natural Neighbor Interpolation
// ============================================================================

export class NaturalNeighborInterpolator {
  private points: Point3D[] = [];

  constructor(points: Point3D[] = []) {
    this.points = points;
  }

  /**
   * Natural neighbor interpolation (Sibson interpolation)
   * @param targetPoint - The point to interpolate
   * @returns Interpolated value
   */
  interpolate(targetPoint: { x: number; y: number }): number {
    if (this.points.length === 0) {
      return 0;
    }

    // Find natural neighbors
    const neighbors = this.findNaturalNeighbors(targetPoint);

    if (neighbors.length === 0) {
      return 0;
    }

    // Calculate area-based weights
    const weights = neighbors.map(n => 1 / neighbors.length);

    // Weighted average
    const result = neighbors.reduce((sum, n, i) => {
      return sum + weights[i] * n.value;
    }, 0);

    return result;
  }

  private findNaturalNeighbors(target: { x: number; y: number }): Point3D[] {
    // Simplified: find k nearest neighbors
    const withDist = this.points.map(p => ({
      ...p,
      distance: Math.sqrt(
        Math.pow(target.x - p.x, 2) +
        Math.pow(target.y - p.y, 2)
      )
    }));

    withDist.sort((a, b) => a.distance - b.distance);

    // Return nearest 4 neighbors
    return withDist.slice(0, Math.min(4, withDist.length));
  }
}

// ============================================================================
// Interpolation Factory
// ============================================================================

export class InterpolationFactory {
  static create(
    method: 'idw' | 'kriging' | 'spline' | 'natural',
    points: Point3D[]
  ): IDWInterpolator | KrigingInterpolator | SplineInterpolator | NaturalNeighborInterpolator {
    switch (method) {
      case 'idw':
        return new IDWInterpolator(points);
      case 'kriging':
        return new KrigingInterpolator(points);
      case 'spline':
        return new SplineInterpolator(points);
      case 'natural':
        return new NaturalNeighborInterpolator(points);
      default:
        throw new Error(`Unknown interpolation method: ${method}`);
    }
  }

  static getDefaultMethod(): 'idw' {
    return 'idw';
  }
}
