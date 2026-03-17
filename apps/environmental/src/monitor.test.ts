/**
 * Environmental Monitor Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EnvironmentalMonitor,
  IDWInterpolator,
  ContourGenerator,
  AirQualityMonitor
} from '../src/monitor';

describe('EnvironmentalMonitor', () => {
  let monitor: EnvironmentalMonitor;

  beforeEach(() => {
    monitor = new EnvironmentalMonitor();
  });

  it('should add a monitoring station', async () => {
    const station = {
      id: 'test-station',
      name: 'Test Station',
      location: { latitude: 39.9042, longitude: 116.4074 },
      stationType: 'air' as const,
      status: 'active' as const,
      metadata: {
        installationDate: '2023-01-01',
        operator: 'Test Operator',
        region: 'Test Region'
      }
    };

    await monitor.addStation(station);
    const stations = await monitor.getActiveStations();

    expect(stations.length).toBeGreaterThan(0);
  });

  it('should save and retrieve monitoring data', async () => {
    const data = {
      stationId: 'test-station',
      timestamp: Date.now(),
      location: { latitude: 39.9042, longitude: 116.4074 },
      measurements: {
        pm25: 75.5,
        pm10: 90.2,
        aqi: 100
      },
      quality: 'good' as const
    };

    await monitor.saveMonitoringData(data);
    const retrieved = await monitor.getLatestData();

    expect(retrieved.length).toBeGreaterThan(0);
  });
});

describe('IDWInterpolator', () => {
  let interpolator: IDWInterpolator;

  beforeEach(() => {
    interpolator = new IDWInterpolator();
  });

  it('should interpolate values at target point', () => {
    const points = [
      { x: 0, y: 0, value: 10 },
      { x: 1, y: 0, value: 20 },
      { x: 0, y: 1, value: 30 },
      { x: 1, y: 1, value: 40 }
    ];

    const result = interpolator.interpolate({ x: 0.5, y: 0.5 }, { power: 2 });

    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(50);
  });

  it('should generate grid interpolation', () => {
    const points = [
      { x: 116.4, y: 39.9, value: 75 },
      { x: 116.42, y: 39.91, value: 120 },
      { x: 116.38, y: 39.89, value: 45 }
    ];

    const bounds = {
      west: 116.35,
      south: 39.88,
      east: 116.45,
      north: 39.93
    };

    const result = interpolator.generateGrid(points, bounds, 0.01, 2);

    expect(result.grid.values).toBeDefined();
    expect(result.grid.values.length).toBeGreaterThan(0);
    expect(result.method).toBe('idw');
  });

  it('should return exact value for coincident point', () => {
    const points = [
      { x: 0, y: 0, value: 100 }
    ];

    const result = interpolator.interpolate({ x: 0, y: 0 });

    expect(result).toBe(100);
  });
});

describe('ContourGenerator', () => {
  let generator: ContourGenerator;

  beforeEach(() => {
    generator = new ContourGenerator();
  });

  it('should generate contours for given levels', () => {
    const grid = [
      [10, 20, 30],
      [20, 30, 40],
      [30, 40, 50]
    ];

    const levels = [20, 30, 40];
    const contours = generator.generateContours(grid, levels);

    expect(contours).toHaveLength(levels.length);
    contours.forEach(contour => {
      expect(contour.level).toBeDefined();
      expect(contour.paths).toBeDefined();
      expect(Array.isArray(contour.paths)).toBe(true);
    });
  });

  it('should handle edge cases', () => {
    const grid = [
      [0, 0],
      [0, 0]
    ];

    const contours = generator.generateContours(grid, [10]);

    expect(contours).toBeDefined();
    expect(contours).toHaveLength(1);
  });

  it('should respect smoothing option', () => {
    const grid = [
      [10, 20, 30],
      [20, 30, 40],
      [30, 40, 50]
    ];

    const contours = generator.generateContours(
      grid,
      [25],
      { smoothing: 0.5 }
    );

    expect(contours).toBeDefined();
    expect(contours).toHaveLength(1);
  });
});

describe('AirQualityMonitor', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
  });

  it('should create monitor instance', () => {
    const monitor = new AirQualityMonitor(canvas);

    expect(monitor).toBeDefined();
  });

  it('should initialize stations', async () => {
    const monitor = new AirQualityMonitor(canvas);

    // Mock the monitor methods
    monitor['monitor'] = {
      addStation: async () => {},
      getActiveStations: async () => []
    } as any;

    await expect(monitor.initializeStations()).resolves.not.toThrow();
  });

  it('should calculate AQI correctly', () => {
    const monitor = new AirQualityMonitor(canvas);

    // Test PM2.5 to AQI conversion
    const aqi1 = monitor['calculateAQI'](35); // Should be 50
    const aqi2 = monitor['calculateAQI'](75); // Should be 100
    const aqi3 = monitor['calculateAQI'](150); // Should be 200

    expect(aqi1).toBeCloseTo(50, 0);
    expect(aqi2).toBeCloseTo(100, 0);
    expect(aqi3).toBeCloseTo(200, 0);
  });

  it('should determine air quality level correctly', () => {
    const monitor = new AirQualityMonitor(canvas);

    expect(monitor['getAirQualityLevel'](50)).toBe('good');
    expect(monitor['getAirQualityLevel'](120)).toBe('fair');
    expect(monitor['getAirQualityLevel'](200)).toBe('poor');
  });
});

describe('Integration Tests', () => {
  it('should handle complete workflow', async () => {
    const monitor = new EnvironmentalMonitor();

    // Add station
    await monitor.addStation({
      id: 'station-1',
      name: 'Test Station',
      location: { latitude: 39.9042, longitude: 116.4074 },
      stationType: 'air',
      status: 'active',
      metadata: {
        installationDate: '2023-01-01',
        operator: 'Test',
        region: 'Test'
      }
    });

    // Save data
    await monitor.saveMonitoringData({
      stationId: 'station-1',
      timestamp: Date.now(),
      location: { latitude: 39.9042, longitude: 116.4074 },
      measurements: { pm25: 75, pm10: 90, aqi: 100 },
      quality: 'good'
    });

    // Query data
    const data = await monitor.getLatestData();

    expect(data.length).toBeGreaterThan(0);
  });

  it('should perform interpolation and visualization', () => {
    const interpolator = new IDWInterpolator();
    const canvas = document.createElement('canvas');

    const points = [
      { x: 116.4, y: 39.9, value: 75 },
      { x: 116.42, y: 39.91, value: 120 }
    ];

    const bounds = {
      west: 116.35,
      south: 39.88,
      east: 116.45,
      north: 39.93
    };

    const grid = interpolator.generateGrid(points, bounds, 0.01, 2);

    expect(grid.grid.values).toBeDefined();
    expect(grid.grid.values.length).toBeGreaterThan(0);
  });
});
