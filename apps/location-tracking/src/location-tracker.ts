/**
 * 位置追踪器
 *
 * 负责管理位置追踪、数据记录和轨迹计算
 */

import { WebGeoDB } from '@webgeodb/core';
import * as turf from '@turf/turf';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface TrackStats {
  pointCount: number;
  totalDistance: number; // 米
  duration: number; // 秒
  avgSpeed: number; // km/h
}

export class LocationTracker {
  private db: WebGeoDB;
  private watchId: number | null = null;
  private currentTrackId: string | null = null;
  private trackingStartTime: number | null = null;
  private lastLocation: LocationData | null = null;
  private totalDistance = 0;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  /**
   * 开始追踪
   */
  async startTracking(options: PositionOptions = {}): Promise<void> {
    console.log('开始位置追踪...');

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const mergedOptions = { ...defaultOptions, ...options };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionSuccess(position),
      (error) => this.handlePositionError(error),
      mergedOptions
    );

    this.trackingStartTime = Date.now();
    this.totalDistance = 0;
    this.lastLocation = null;

    this.emit('tracking', true);
  }

  /**
   * 停止追踪
   */
  async stopTracking(): Promise<void> {
    console.log('停止位置追踪...');

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.emit('tracking', false);
  }

  /**
   * 创建新轨迹记录
   */
  async createTrack(): Promise<string> {
    const trackId = `track-${Date.now()}`;
    const now = new Date();

    await this.db.tracks.add({
      id: trackId,
      name: `轨迹 ${now.toLocaleString()}`,
      startTime: now,
      endTime: null as any,
      distance: 0,
      pointCount: 0,
      properties: {}
    });

    this.currentTrackId = trackId;
    return trackId;
  }

  /**
   * 完成轨迹记录
   */
  async finishTrack(): Promise<any | null> {
    if (!this.currentTrackId) {
      return null;
    }

    const track = await this.db.tracks.get(this.currentTrackId);

    if (track) {
      await this.db.tracks.update(this.currentTrackId, {
        endTime: new Date(),
        distance: this.totalDistance
      });
    }

    const result = { ...track, distance: this.totalDistance };
    this.currentTrackId = null;

    return result;
  }

  /**
   * 处理位置更新
   */
  private async handlePositionSuccess(position: GeolocationPosition): Promise<void> {
    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    };

    // 计算距离
    if (this.lastLocation) {
      const distance = this.calculateDistance(
        this.lastLocation.latitude,
        this.lastLocation.longitude,
        locationData.latitude,
        locationData.longitude
      );
      this.totalDistance += distance;
    }

    // 保存位置点
    if (this.currentTrackId) {
      await this.saveTrackPoint(locationData);
    }

    this.lastLocation = locationData;

    // 发送事件
    this.emit('location', {
      ...locationData,
      distance: this.totalDistance
    });
  }

  /**
   * 处理位置错误
   */
  private handlePositionError(error: GeolocationPositionError): void {
    console.error('位置获取错误:', error);

    const errorMessages: Record<number, string> = {
      1: '位置访问被拒绝',
      2: '位置不可用',
      3: '请求超时'
    };

    const message = errorMessages[error.code] || '未知错误';
    this.emit('error', { code: error.code, message });
  }

  /**
   * 保存轨迹点
   */
  private async saveTrackPoint(location: LocationData): Promise<void> {
    if (!this.currentTrackId) return;

    const pointId = `${this.currentTrackId}-${location.timestamp}`;

    await this.db.trackPoints.add({
      id: pointId,
      trackId: this.currentTrackId,
      geometry: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      timestamp: new Date(location.timestamp),
      accuracy: location.accuracy,
      speed: location.speed || 0,
      heading: location.heading || 0,
      properties: {
        altitude: location.altitude,
        altitudeAccuracy: location.altitudeAccuracy
      }
    });

    // 更新轨迹点数
    const track = await this.db.tracks.get(this.currentTrackId);
    if (track) {
      await this.db.tracks.update(this.currentTrackId, {
        pointCount: (track.pointCount || 0) + 1
      });
    }
  }

  /**
   * 计算两点间距离（米）
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const from = turf.point([lon1, lat1]);
    const to = turf.point([lon2, lat2]);
    const distance = turf.distance(from, to, { units: 'kilometers' });
    return distance * 1000;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<TrackStats> {
    let duration = 0;

    if (this.trackingStartTime) {
      duration = (Date.now() - this.trackingStartTime) / 1000;
    }

    const avgSpeed = duration > 0 ? (this.totalDistance / 1000) / (duration / 3600) : 0;

    const pointCount = this.currentTrackId
      ? await this.db.trackPoints.where('trackId').equals(this.currentTrackId).count()
      : 0;

    return {
      pointCount,
      totalDistance: this.totalDistance,
      duration,
      avgSpeed
    };
  }

  /**
   * 获取轨迹历史
   */
  async getTrackHistory(trackId: string): Promise<LocationData[]> {
    const points = await this.db.trackPoints
      .where('trackId')
      .equals(trackId)
      .sortBy('timestamp');

    return points.map(point => ({
      latitude: point.geometry.coordinates[1],
      longitude: point.geometry.coordinates[0],
      accuracy: point.accuracy,
      altitude: point.properties?.altitude || null,
      altitudeAccuracy: point.properties?.altitudeAccuracy || null,
      heading: point.heading,
      speed: point.speed,
      timestamp: new Date(point.timestamp).getTime()
    }));
  }

  /**
   * 事件监听
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * 发送事件
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}
