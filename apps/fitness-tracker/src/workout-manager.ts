/**
 * 运动管理器
 *
 * 负责管理运动记录的保存和查询
 */

import { WebGeoDB } from 'webgeodb-core';

export interface Workout {
  id?: string;
  name: string;
  type?: string;
  startTime: Date;
  endTime: Date;
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed: number;
  calories: number;
}

export class WorkoutManager {
  constructor(private db: WebGeoDB) {}

  /**
   * 保存运动记录
   */
  async saveWorkout(workout: Workout): Promise<void> {
    console.log('保存运动记录:', workout);

    await this.db.workouts.put({
      id: workout.id,
      name: workout.name,
      type: workout.type,
      startTime: workout.startTime,
      endTime: workout.endTime,
      distance: workout.distance,
      duration: workout.duration,
      avgSpeed: workout.avgSpeed,
      maxSpeed: workout.maxSpeed,
      calories: workout.calories,
      properties: {}
    });
  }

  /**
   * 获取最近的运动记录
   */
  async getRecentWorkouts(limit: number = 10): Promise<Workout[]> {
    const workouts = await this.db.workouts
      .orderBy('startTime')
      .reverse()
      .limit(limit)
      .toArray();

    return workouts.map(w => ({
      id: w.id,
      name: w.name,
      type: w.type,
      startTime: w.startTime,
      endTime: w.endTime as Date,
      distance: w.distance,
      duration: w.duration,
      avgSpeed: w.avgSpeed,
      maxSpeed: w.maxSpeed,
      calories: w.calories
    }));
  }

  /**
   * 获取指定运动的轨迹点
   */
  async getTrackPoints(workoutId: string): Promise<any[]> {
    return await this.db.trackPoints
      .where('workoutId')
      .equals(workoutId)
      .sortBy('timestamp');
  }

  /**
   * 获取指定运动的航点
   */
  async getWaypoints(workoutId: string): Promise<any[]> {
    return await this.db.waypoints
      .where('workoutId')
      .equals(workoutId)
      .sortBy('timestamp');
  }

  /**
   * 删除运动记录
   */
  async deleteWorkout(workoutId: string): Promise<void> {
    await this.db.workouts.delete(workoutId);
    await this.db.trackPoints.where('workoutId').equals(workoutId).delete();
    await this.db.waypoints.where('workoutId').equals(workoutId).delete();
  }

  /**
   * 获取运动统计
   */
  async getStats(): Promise<{
    totalWorkouts: number;
    totalDistance: number;
    totalDuration: number;
    totalCalories: number;
    avgSpeed: number;
  }> {
    const workouts = await this.db.workouts.toArray();

    const totalDistance = workouts.reduce((sum, w) => sum + w.distance, 0);
    const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
    const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0);
    const avgSpeed = totalDuration > 0 ? (totalDistance / totalDuration) * 3600 : 0;

    return {
      totalWorkouts: workouts.length,
      totalDistance,
      totalDuration,
      totalCalories,
      avgSpeed
    };
  }

  /**
   * 按运动类型统计
   */
  async getStatsByType(): Promise<Record<string, {
    count: number;
    totalDistance: number;
    totalDuration: number;
  }>> {
    const workouts = await this.db.workouts.toArray();

    const stats: Record<string, any> = {};

    workouts.forEach(workout => {
      const type = workout.type || 'unknown';

      if (!stats[type]) {
        stats[type] = {
          count: 0,
          totalDistance: 0,
          totalDuration: 0
        };
      }

      stats[type].count++;
      stats[type].totalDistance += workout.distance;
      stats[type].totalDuration += workout.duration;
    });

    return stats;
  }

  /**
   * 导出运动记录为 GeoJSON
   */
  async exportToGeoJSON(workoutId: string): Promise<any> {
    const workout = await this.db.workouts.get(workoutId);
    const trackPoints = await this.getTrackPoints(workoutId);
    const waypoints = await this.getWaypoints(workoutId);

    const coordinates = trackPoints.map(p => p.geometry.coordinates);

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates
          },
          properties: {
            ...workout,
            featureType: 'track'
          }
        },
        ...waypoints.map(wp => ({
          type: 'Feature',
          geometry: wp.geometry,
          properties: {
            ...wp,
            featureType: 'waypoint'
          }
        }))
      ]
    };
  }
}
