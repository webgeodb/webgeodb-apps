/**
 * Environmental Monitoring Data Platform
 *
 * A comprehensive system for collecting, storing, analyzing, and visualizing
 * environmental monitoring data with spatiotemporal capabilities.
 */

import { WebGeoDB } from 'webgeodb-core';

// ============================================================================
// Type Definitions
// ============================================================================

interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

interface MonitoringStation {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  stationType: 'air' | 'water' | 'noise' | 'temperature';
  status: 'active' | 'inactive' | 'maintenance';
  metadata: {
    installationDate: string;
    operator: string;
    region: string;
  };
}

interface MonitoringData {
  stationId: string;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
  };
  measurements: {
    [key: string]: number;
  };
  quality: 'good' | 'fair' | 'poor';
}

interface InterpolationResult {
  timestamp: number;
  grid: {
    bounds: GeoBounds;
    resolution: number;
    values: number[][];
  };
  method: 'idw' | 'kriging';
  parameters: {
    power?: number;
    range?: number;
    sill?: number;
  };
}

// ============================================================================
// Environmental Monitor Core
// ============================================================================

export class EnvironmentalMonitor {
  private db: WebGeoDB;

  constructor() {
    this.db = new WebGeoDB({
      name: 'environmental-monitor',
      enableSpatialIndex: true,
      enableTimeIndex: true
    });
  }

  /**
   * Add a monitoring station
   */
  async addStation(station: MonitoringStation): Promise<void> {
    await this.db.insert('stations', {
      ...station,
      _geometry: {
        type: 'Point',
        coordinates: [
          station.location.longitude,
          station.location.latitude,
          station.location.altitude || 0
        ]
      }
    });
  }

  /**
   * Store monitoring data
   */
  async saveMonitoringData(data: MonitoringData): Promise<void> {
    await this.db.insert('monitoring_data', {
      ...data,
      _geometry: {
        type: 'Point',
        coordinates: [data.location.longitude, data.location.latitude]
      },
      _timestamp: data.timestamp,
      _spatiotemporal: true
    });
  }

  /**
   * Query spatiotemporal data
   */
  async querySpatiotemporalData(
    bounds: GeoBounds,
    startTime: number,
    endTime: number,
    limit: number = 1000
  ): Promise<MonitoringData[]> {
    return await this.db.search('monitoring_data', {
      where: {
        _geoWithin: bounds,
        _timestamp: { gte: startTime, lte: endTime }
      },
      orderBy: { _timestamp: 'asc' },
      limit
    });
  }

  /**
   * Get active stations
   */
  async getActiveStations(): Promise<MonitoringStation[]> {
    return await this.db.search('stations', {
      where: { status: 'active' }
    });
  }

  /**
   * Get latest data within bounds
   */
  async getLatestData(bounds?: GeoBounds): Promise<MonitoringData[]> {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    return await this.db.search('monitoring_data', {
      where: {
        _timestamp: { gte: oneHourAgo, lte: now },
        ...(bounds && { _geoWithin: bounds })
      },
      orderBy: { _timestamp: 'desc' },
      limit: 100
    });
  }

  /**
   * Query by station
   */
  async queryByStation(
    stationId: string,
    startTime: number,
    endTime: number
  ): Promise<MonitoringData[]> {
    return await this.db.search('monitoring_data', {
      where: {
        stationId,
        _timestamp: { gte: startTime, lte: endTime }
      },
      orderBy: { _timestamp: 'asc' }
    });
  }
}

// ============================================================================
// IDW Interpolation
// ============================================================================

export class IDWInterpolator {
  interpolate(
    points: Array<{ x: number; y: number; value: number }>,
    targetPoint: { x: number; y: number },
    power: number = 2
  ): number {
    let numerator = 0;
    let denominator = 0;

    for (const point of points) {
      const distance = Math.sqrt(
        Math.pow(targetPoint.x - point.x, 2) +
        Math.pow(targetPoint.y - point.y, 2)
      );

      if (distance === 0) {
        return point.value;
      }

      const weight = 1 / Math.pow(distance, power);
      numerator += weight * point.value;
      denominator += weight;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  generateGrid(
    points: Array<{ x: number; y: number; value: number }>,
    bounds: GeoBounds,
    resolution: number,
    power: number = 2
  ): InterpolationResult {
    const rows = Math.ceil((bounds.north - bounds.south) / resolution);
    const cols = Math.ceil((bounds.east - bounds.west) / resolution);
    const grid: number[][] = [];

    for (let i = 0; i < rows; i++) {
      grid[i] = [];
      for (let j = 0; j < cols; j++) {
        const x = bounds.west + j * resolution;
        const y = bounds.south + i * resolution;

        grid[i][j] = this.interpolate(points, { x, y }, power);
      }
    }

    return {
      timestamp: Date.now(),
      grid: { bounds, resolution, values: grid },
      method: 'idw',
      parameters: { power }
    };
  }
}

// ============================================================================
// Contour Generator
// ============================================================================

export class ContourGenerator {
  generateContours(
    grid: number[][],
    contourLevels: number[]
  ): Array<{ level: number; paths: Array<Array<[number, number]>> }> {
    const results = [];

    for (const level of contourLevels) {
      const paths = this.marchingSquares(grid, level);
      results.push({ level, paths });
    }

    return results;
  }

  private marchingSquares(
    grid: number[][],
    level: number
  ): Array<Array<[number, number]>> {
    const paths: Array<Array<[number, number]>> = [];
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = new Set<string>();

    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const key = `${i},${j}`;
        if (visited.has(key)) continue;

        const contour = this.traceContour(grid, i, j, level, visited);
        if (contour.length > 0) {
          paths.push(contour);
        }
      }
    }

    return paths;
  }

  private traceContour(
    grid: number[][],
    startRow: number,
    startCol: number,
    level: number,
    visited: Set<string>
  ): Array<[number, number]> {
    const path: Array<[number, number]> = [];
    let currentRow = startRow;
    let currentCol = startCol;

    while (true) {
      const key = `${currentRow},${currentCol}`;
      if (visited.has(key)) break;
      visited.add(key);

      const config = this.getSquareConfig(grid, currentRow, currentCol, level);

      if (config === 0 || config === 15) break;

      const point = this.interpolateEdgePoint(grid, currentRow, currentCol, level);
      if (point) {
        path.push(point);
      }

      const next = this.getNextSquare(currentRow, currentCol, config);
      if (!next) break;

      currentRow = next.row;
      currentCol = next.col;

      if (path.length > 10000) break;
    }

    return path;
  }

  private getSquareConfig(
    grid: number[][],
    row: number,
    col: number,
    level: number
  ): number {
    let config = 0;

    if (grid[row][col] >= level) config |= 1;
    if (grid[row][col + 1] >= level) config |= 2;
    if (grid[row + 1][col + 1] >= level) config |= 4;
    if (grid[row + 1][col] >= level) config |= 8;

    return config;
  }

  private interpolateEdgePoint(
    grid: number[][],
    row: number,
    col: number,
    level: number
  ): [number, number] | null {
    return [col + 0.5, row + 0.5];
  }

  private getNextSquare(
    row: number,
    col: number,
    config: number
  ): { row: number; col: number } | null {
    return { row, col: col + 1 };
  }
}

// ============================================================================
// Heatmap Visualizer
// ============================================================================

export class HeatmapVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
  }

  renderHeatmap(
    grid: number[][],
    bounds: GeoBounds,
    colorScale: (value: number) => string
  ): void {
    const { width, height } = this.canvas;
    const rows = grid.length;
    const cols = grid[0].length;
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    this.ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const value = grid[i][j];
        this.ctx.fillStyle = colorScale(value);
        this.ctx.fillRect(
          j * cellWidth,
          i * cellHeight,
          cellWidth + 1,
          cellHeight + 1
        );
      }
    }
  }

  async playAnimation(
    dataFrames: Array<{ timestamp: number; grid: number[][] }>,
    bounds: GeoBounds,
    colorScale: (value: number) => string,
    fps: number = 30
  ): Promise<void> {
    const frameDelay = 1000 / fps;

    for (const frame of dataFrames) {
      this.renderHeatmap(frame.grid, bounds, colorScale);

      this.ctx.fillStyle = 'white';
      this.ctx.font = '16px sans-serif';
      this.ctx.fillText(
        new Date(frame.timestamp).toLocaleString(),
        10,
        20
      );

      await new Promise(resolve => setTimeout(resolve, frameDelay));
    }
  }

  static createColorScale(
    min: number,
    max: number,
    colors: Array<{ value: number; color: string }>
  ): (value: number) => string {
    return (value: number) => {
      const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

      for (let i = 0; i < colors.length - 1; i++) {
        if (t >= colors[i].value && t <= colors[i + 1].value) {
          return colors[i].color;
        }
      }

      return colors[colors.length - 1].color;
    };
  }

  drawContours(
    contours: Array<{ level: number; paths: Array<Array<[number, number]>> }>,
    bounds: GeoBounds
  ): void {
    const { width, height } = this.canvas;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 2;

    for (const contour of contours) {
      for (const path of contour.paths) {
        this.ctx.beginPath();

        for (let i = 0; i < path.length; i++) {
          const [x, y] = path[i];
          const screenX = ((x - bounds.west) / (bounds.east - bounds.west)) * width;
          const screenY = ((bounds.north - y) / (bounds.north - bounds.south)) * height;

          if (i === 0) {
            this.ctx.moveTo(screenX, screenY);
          } else {
            this.ctx.lineTo(screenX, screenY);
          }
        }

        this.ctx.stroke();
      }
    }
  }

  async drawStations(data: MonitoringData[]): Promise<void> {
    const { width, height } = this.canvas;
    const bounds = {
      west: Math.min(...data.map(d => d.location.longitude)),
      south: Math.min(...data.map(d => d.location.latitude)),
      east: Math.max(...data.map(d => d.location.longitude)),
      north: Math.max(...data.map(d => d.location.latitude))
    };

    for (const d of data) {
      const x = ((d.location.longitude - bounds.west) / (bounds.east - bounds.west)) * width;
      const y = ((bounds.north - d.location.latitude) / (bounds.north - bounds.south)) * height;

      // Draw station marker
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Draw value label
      const value = d.measurements.pm25 || 0;
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText(value.toFixed(1), x + 10, y);
    }
  }
}

// ============================================================================
// Air Quality Monitor (Complete Implementation)
// ============================================================================

export class AirQualityMonitor {
  private monitor: EnvironmentalMonitor;
  private interpolator: IDWInterpolator;
  private contourGen: ContourGenerator;
  private visualizer: HeatmapVisualizer;

  constructor(canvas: HTMLCanvasElement) {
    this.monitor = new EnvironmentalMonitor();
    this.interpolator = new IDWInterpolator();
    this.contourGen = new ContourGenerator();
    this.visualizer = new HeatmapVisualizer(canvas);
  }

  async initializeStations(): Promise<void> {
    const stations: MonitoringStation[] = [
      {
        id: 'station-001',
        name: 'City Center Station',
        location: { latitude: 39.9042, longitude: 116.4074 },
        stationType: 'air',
        status: 'active',
        metadata: {
          installationDate: '2023-01-01',
          operator: 'EPA',
          region: 'City Center'
        }
      },
      {
        id: 'station-002',
        name: 'Industrial Park Station',
        location: { latitude: 39.9142, longitude: 116.4374 },
        stationType: 'air',
        status: 'active',
        metadata: {
          installationDate: '2023-01-01',
          operator: 'EPA',
          region: 'Industrial Park'
        }
      },
      {
        id: 'station-003',
        name: 'Residential Area Station',
        location: { latitude: 39.8942, longitude: 116.3874 },
        stationType: 'air',
        status: 'active',
        metadata: {
          installationDate: '2023-01-01',
          operator: 'EPA',
          region: 'Residential Area'
        }
      },
      {
        id: 'station-004',
        name: 'Suburban Station',
        location: { latitude: 39.9242, longitude: 116.4674 },
        stationType: 'air',
        status: 'active',
        metadata: {
          installationDate: '2023-01-01',
          operator: 'EPA',
          region: 'Suburban'
        }
      }
    ];

    for (const station of stations) {
      await this.monitor.addStation(station);
    }
  }

  async collectRealtimeData(): Promise<void> {
    const stations = await this.monitor.getActiveStations();
    const timestamp = Date.now();

    for (const station of stations) {
      const pm25 = 20 + Math.random() * 150;
      const pm10 = pm25 * (1.2 + Math.random() * 0.5);
      const aqi = this.calculateAQI(pm25);

      const data: MonitoringData = {
        stationId: station.id,
        timestamp,
        location: station.location,
        measurements: {
          pm25: Math.round(pm25 * 10) / 10,
          pm10: Math.round(pm10 * 10) / 10,
          aqi: Math.round(aqi)
        },
        quality: this.getAirQualityLevel(aqi)
      };

      await this.monitor.saveMonitoringData(data);
    }
  }

  private calculateAQI(pm25: number): number {
    if (pm25 <= 35) return (pm25 / 35) * 50;
    if (pm25 <= 75) return 50 + ((pm25 - 35) / 40) * 50;
    if (pm25 <= 115) return 100 + ((pm25 - 75) / 40) * 50;
    if (pm25 <= 150) return 150 + ((pm25 - 115) / 35) * 50;
    if (pm25 <= 250) return 200 + ((pm25 - 150) / 100) * 100;
    return 300 + ((pm25 - 250) / 100) * 200;
  }

  private getAirQualityLevel(aqi: number): 'good' | 'fair' | 'poor' {
    if (aqi <= 100) return 'good';
    if (aqi <= 150) return 'fair';
    return 'poor';
  }

  async generatePM25Distribution(): Promise<void> {
    const bounds: GeoBounds = {
      west: 116.35,
      south: 39.88,
      east: 116.45,
      north: 39.93
    };

    const latestData = await this.monitor.getLatestData(bounds);
    const points = latestData.map(d => ({
      x: d.location.longitude,
      y: d.location.latitude,
      value: d.measurements.pm25 || 0
    }));

    const grid = this.interpolator.generateGrid(points, bounds, 0.001, 2);

    const contours = this.contourGen.generateContours(grid.grid.values, [
      35, 75, 115, 150, 250
    ]);

    const colorScale = HeatmapVisualizer.createColorScale(
      0,
      300,
      [
        { value: 0, color: '#00e400' },
        { value: 0.17, color: '#ffff00' },
        { value: 0.33, color: '#ff7e00' },
        { value: 0.5, color: '#ff0000' },
        { value: 0.67, color: '#99004c' },
        { value: 0.83, color: '#7e0023' },
        { value: 1, color: '#7e0023' }
      ]
    );

    this.visualizer.renderHeatmap(grid.grid.values, bounds, colorScale);
    this.visualizer.drawContours(contours, bounds);
    await this.visualizer.drawStations(latestData);
  }

  async playTimeSeriesAnimation(
    startTime: number,
    endTime: number,
    interval: number = 3600000
  ): Promise<void> {
    const bounds: GeoBounds = {
      west: 116.35,
      south: 39.88,
      east: 116.45,
      north: 39.93
    };

    const frames = [];

    for (let t = startTime; t <= endTime; t += interval) {
      const data = await this.monitor.querySpatiotemporalData(
        bounds,
        t,
        t + interval
      );

      if (data.length === 0) continue;

      const points = data.map(d => ({
        x: d.location.longitude,
        y: d.location.latitude,
        value: d.measurements.pm25 || 0
      }));

      const grid = this.interpolator.generateGrid(points, bounds, 0.001, 2);

      frames.push({
        timestamp: t,
        grid: grid.grid.values
      });
    }

    const colorScale = HeatmapVisualizer.createColorScale(0, 300, [
      { value: 0, color: '#00e400' },
      { value: 0.5, color: '#ffff00' },
      { value: 1, color: '#ff0000' }
    ]);

    await this.visualizer.playAnimation(frames, bounds, colorScale, 10);
  }

  async exportData(
    bounds: GeoBounds,
    startTime: number,
    endTime: number,
    format: 'json' | 'csv' | 'geojson'
  ): Promise<string> {
    const data = await this.monitor.querySpatiotemporalData(
      bounds,
      startTime,
      endTime
    );

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv':
        const headers = ['timestamp', 'stationId', 'latitude', 'longitude', 'pm25', 'pm10', 'aqi', 'quality'];
        const rows = data.map(d =>
          [
            d.timestamp,
            d.stationId,
            d.location.latitude,
            d.location.longitude,
            d.measurements.pm25 || 0,
            d.measurements.pm10 || 0,
            d.measurements.aqi || 0,
            d.quality
          ].join(',')
        );

        return [headers.join(','), ...rows].join('\n');

      case 'geojson':
        const features = data.map(d => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [d.location.longitude, d.location.latitude]
          },
          properties: {
            timestamp: d.timestamp,
            stationId: d.stationId,
            measurements: d.measurements,
            quality: d.quality
          }
        }));

        return JSON.stringify({
          type: 'FeatureCollection',
          features
        }, null, 2);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}

// ============================================================================
// Data Query Service
// ============================================================================

export class DataQueryService {
  constructor(private db: WebGeoDB) {}

  async queryByRegion(
    bounds: GeoBounds,
    startTime: number,
    endTime: number
  ): Promise<MonitoringData[]> {
    return await this.db.search('monitoring_data', {
      where: {
        _geoWithin: bounds,
        _timestamp: { gte: startTime, lte: endTime }
      },
      orderBy: { _timestamp: 'asc' }
    });
  }

  async aggregateData(
    bounds: GeoBounds,
    startTime: number,
    endTime: number,
    metric: string,
    aggregation: 'avg' | 'min' | 'max' | 'sum' | 'count'
  ): Promise<number> {
    const data = await this.queryByRegion(bounds, startTime, endTime);

    if (data.length === 0) return 0;

    const values = data
      .map(d => d.measurements[metric])
      .filter(v => v !== undefined);

    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'count':
        return values.length;
      default:
        throw new Error(`Unknown aggregation: ${aggregation}`);
    }
  }

  async aggregateByTimeBucket(
    bounds: GeoBounds,
    startTime: number,
    endTime: number,
    bucketSize: number,
    metric: string,
    aggregation: 'avg' | 'min' | 'max'
  ): Promise<Array<{ timestamp: number; value: number }>> {
    const allData = await this.queryByRegion(bounds, startTime, endTime);
    const buckets = new Map<number, number[]>();

    for (const data of allData) {
      const bucketKey = Math.floor(data.timestamp / bucketSize) * bucketSize;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }

      const value = data.measurements[metric];
      if (value !== undefined) {
        buckets.get(bucketKey)!.push(value);
      }
    }

    const result = [];
    for (const [timestamp, values] of buckets) {
      let aggregated: number;
      switch (aggregation) {
        case 'avg':
          aggregated = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          aggregated = Math.min(...values);
          break;
        case 'max':
          aggregated = Math.max(...values);
          break;
      }

      result.push({ timestamp, value: aggregated });
    }

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }
}
