/**
 * 运动追踪器
 *
 * 负责管理运动记录、数据计算和统计
 */

import { WebGeoDB } from '@webgeodb/core';
import * as turf from '@turf/turf';

export interface SportConfig {
  name: string;
  icon: string;
  color: string;
  met: number;
  unit: 'km' | 'mi';
}

export interface WorkoutStats {
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed: number;
  calories: number;
}

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export class FitnessTracker {
  private db: WebGeoDB;
  private watchId: number | null = null;
  private currentWorkoutId: string | null = null;
  private sportType: string | null = null;
  private sportConfig: SportConfig | null = null;
  private startTime: number | null = null;
  private lastLocation: { lat: number; lng: number; time: number } | null = null;
  private totalDistance = 0;
  private maxSpeed = 0;
  private isPaused = false;
  private pausedTime = 0;
  private pauseStartTime: number | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  /**
   * 开始运动
   */
  async startWorkout(sportType: string, sportConfig: SportConfig): Promise<void> {
    console.log('开始运动:', sportConfig.name);

    this.sportType = sportType;
    this.sportConfig = sportConfig;
    this.startTime = Date.now();
    this.totalDistance = 0;
    this.maxSpeed = 0;
    this.pausedTime = 0;
    this.lastLocation = null;

    // 创建运动记录
    this.currentWorkoutId = `workout-${Date.now()}`;
    await this.db.workouts.add({
      id: this.currentWorkoutId,
      name: `${sportConfig.name} ${new Date().toLocaleString()}`,
      type: sportType,
      startTime: new Date(),
      endTime: null as any,
      distance: 0,
      duration: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      calories: 0,
      properties: {}
    });

    // 开始位置追踪
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    this.emit('started', { workoutId: this.currentWorkoutId });
  }

  /**
   * 暂停运动
   */
  async pauseWorkout(): Promise<void> {
    console.log('暂停运动');
    this.isPaused = true;
    this.pauseStartTime = Date.now();

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.emit('paused', {});
  }

  /**
   * 恢复运动
   */
  async resumeWorkout(): Promise<void> {
    console.log('恢复运动');

    if (this.pauseStartTime) {
      this.pausedTime += Date.now() - this.pauseStartTime;
      this.pauseStartTime = null;
    }

    this.isPaused = false;

    // 重新开始位置追踪
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    this.emit('resumed', {});
  }

  /**
   * 停止运动
   */
  async stopWorkout(): Promise<any | null> {
    console.log('停止运动');

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (!this.currentWorkoutId) {
      return null;
    }

    const endTime = new Date();
    const duration = (endTime.getTime() - this.startTime! - this.pausedTime) / 1000;
    const avgSpeed = duration > 0 ? (this.totalDistance / 1000) / (duration / 3600) : 0;
    const calories = this.calculateCalories(duration);

    // 更新运动记录
    const workout = {
      id: this.currentWorkoutId,
      name: `${this.sportConfig!.name} ${new Date().toLocaleString()}`,
      type: this.sportType,
      startTime: new Date(this.startTime!),
      endTime,
      distance: this.totalDistance / 1000, // 转换为公里
      duration,
      avgSpeed,
      maxSpeed: this.maxSpeed,
      calories,
      properties: {
        pausedTime: this.pausedTime
      }
    };

    await this.db.workouts.update(this.currentWorkoutId, workout);

    const result = { ...workout };
    this.currentWorkoutId = null;
    this.sportType = null;
    this.sportConfig = null;

    this.emit('stopped', workout);

    return result;
  }

  /**
   * 添加航点
   */
  async addWaypoint(name: string): Promise<Waypoint | null> {
    if (!this.currentWorkoutId) {
      throw new Error('没有活动的运动记录');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const waypointId = `waypoint-${Date.now()}`;
          const waypoint: Waypoint = {
            id: waypointId,
            name,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp
          };

          await this.db.waypoints.add({
            id: waypointId,
            workoutId: this.currentWorkoutId!,
            name,
            geometry: {
              type: 'Point',
              coordinates: [position.coords.longitude, position.coords.latitude]
            },
            timestamp: new Date(position.timestamp),
            properties: {}
          });

          this.emit('waypoint-added', waypoint);
          resolve(waypoint);
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  /**
   * 处理位置更新
   */
  private async handlePositionUpdate(position: GeolocationPosition): Promise<void> {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const time = position.timestamp;

    let speed = position.coords.speed || 0;
    let distance = 0;

    // 计算距离和速度
    if (this.lastLocation) {
      distance = this.calculateDistance(
        this.lastLocation.lat,
        this.lastLocation.lng,
        lat,
        lng
      );

      const timeDiff = (time - this.lastLocation.time) / 1000; // 秒
      if (timeDiff > 0) {
        speed = (distance / timeDiff) * 3.6; // 转换为 km/h
      }
    }

    // 更新累计距离
    this.totalDistance += distance;

    // 更新最大速度
    if (speed > this.maxSpeed) {
      this.maxSpeed = speed;
    }

    // 保存轨迹点
    if (this.currentWorkoutId) {
      const pointId = `${this.currentWorkoutId}-${time}`;
      await this.db.trackPoints.add({
        id: pointId,
        workoutId: this.currentWorkoutId,
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        timestamp: new Date(time),
        speed,
        heartRate: 0, // 可以连接心率计
        elevation: position.coords.altitude || 0,
        properties: {}
      });
    }

    this.lastLocation = { lat, lng, time };

    // 发送更新事件
    const duration = this.startTime ? (Date.now() - this.startTime - this.pausedTime) / 1000 : 0;
    const calories = this.calculateCalories(duration);

    this.emit('update', {
      latitude: lat,
      longitude: lng,
      distance: this.totalDistance / 1000, // 转换为公里
      duration,
      speed,
      avgSpeed: duration > 0 ? (this.totalDistance / 1000) / (duration / 3600) : 0,
      maxSpeed: this.maxSpeed,
      calories,
      timestamp: time
    });
  }

  /**
   * 处理位置错误
   */
  private handlePositionError(error: GeolocationPositionError): void {
    console.error('位置获取错误:', error);
    this.emit('error', { code: error.code, message: error.message });
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
   * 计算卡路里消耗
   */
  private calculateCalories(duration: number): number {
    if (!this.sportConfig) return 0;

    // 简化的卡路里计算公式
    // 卡路里 = MET × 体重(kg) × 时间(小时)
    // 这里假设体重为 70kg
    const weight = 70; // kg
    const hours = duration / 3600;
    return Math.round(this.sportConfig.met * weight * hours);
  }

  /**
   * 获取当前统计
   */
  getCurrentStats(): WorkoutStats {
    const duration = this.startTime ? (Date.now() - this.startTime - this.pausedTime) / 1000 : 0;
    const avgSpeed = duration > 0 ? (this.totalDistance / 1000) / (duration / 3600) : 0;

    return {
      distance: this.totalDistance / 1000,
      duration,
      avgSpeed,
      maxSpeed: this.maxSpeed,
      calories: this.calculateCalories(duration)
    };
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
