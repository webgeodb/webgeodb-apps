/**
 * 位置追踪和事件检测服务
 *
 * 负责实时位置追踪和围栏事件检测
 */

import type {
  UserLocation,
  FenceEvent,
  LocationCheckRequest,
  LocationCheckResponse,
  Point
} from './types';
import type { WebGeoDB } from '@webgeodb/core';

interface UserFenceState {
  fenceId: string;
  inside: boolean;
  enterTime?: number;
  lastCheckTime: number;
}

export class LocationTrackingService {
  private userStates: Map<string, Map<string, UserFenceState>> = new Map();

  constructor(private db: WebGeoDB) {}

  /**
   * 处理位置更新
   */
  async handleLocationUpdate(request: LocationCheckRequest): Promise<LocationCheckResponse> {
    // 保存位置记录
    const location: UserLocation = {
      id: crypto.randomUUID(),
      userId: request.userId,
      timestamp: request.timestamp,
      geometry: request.location,
      accuracy: request.location.properties?.accuracy || 0
    };

    await this.db.userLocations.insert(location);

    // 获取所有激活的围栏
    const fences = await this.db.fences
      .where('active', '=', true)
      .toArray();

    // 检查每个围栏
    const insideFences: Array<{
      fenceId: string;
      fenceName: string;
      entered: boolean;
      dwellTime?: number;
    }> = [];

    const triggeredActions: Array<{
      ruleId: string;
      action: any;
    }> = [];

    // 获取用户当前状态
    const userState = this.getUserState(request.userId);

    for (const fence of fences) {
      const inside = await this.isPointInPolygon(
        request.location,
        fence.geometry
      );

      const fenceState = userState.get(fence.id);

      if (inside) {
        const dwellTime = fenceState?.enterTime
          ? request.timestamp - fenceState.enterTime
          : 0;

        insideFences.push({
          fenceId: fence.id,
          fenceName: fence.name,
          entered: true,
          dwellTime
        });

        // 检测进入事件
        if (!fenceState?.inside) {
          await this.createEnterEvent(fence.id, request.userId, request.location, request.timestamp);
        }

        // 更新状态
        userState.set(fence.id, {
          fenceId: fence.id,
          inside: true,
          enterTime: fenceState?.enterTime || request.timestamp,
          lastCheckTime: request.timestamp
        });

        // 检测停留事件
        if (fenceState?.enterTime && dwellTime > 0) {
          const dwellEvent = await this.createDwellEvent(
            fence.id,
            request.userId,
            request.location,
            request.timestamp,
            dwellTime
          );

          // 这里可以触发规则评估
          // actions = await ruleEngine.evaluateEvent(dwellEvent)
        }
      } else {
        // 检测离开事件
        if (fenceState?.inside) {
          await this.createExitEvent(
            fence.id,
            request.userId,
            request.location,
            request.timestamp,
            fenceState.enterTime
          );
        }

        // 更新状态
        userState.set(fence.id, {
          fenceId: fence.id,
          inside: false,
          lastCheckTime: request.timestamp
        });
      }
    }

    return {
      insideFences,
      triggeredActions
    };
  }

  /**
   * 创建进入事件
   */
  private async createEnterEvent(
    fenceId: string,
    userId: string,
    location: Point,
    timestamp: number
  ): Promise<FenceEvent> {
    const event: FenceEvent = {
      id: crypto.randomUUID(),
      fenceId,
      userId,
      eventType: 'enter',
      timestamp,
      location,
      triggeredRules: [],
      processed: false
    };

    await this.db.fenceEvents.insert(event);
    return event;
  }

  /**
   * 创建离开事件
   */
  private async createExitEvent(
    fenceId: string,
    userId: string,
    location: Point,
    timestamp: number,
    enterTime?: number
  ): Promise<FenceEvent> {
    const dwellTime = enterTime ? timestamp - enterTime : 0;

    const event: FenceEvent = {
      id: crypto.randomUUID(),
      fenceId,
      userId,
      eventType: 'exit',
      timestamp,
      location: {
        ...location,
        properties: {
          ...location.properties,
          dwellTime
        }
      },
      triggeredRules: [],
      processed: false
    };

    await this.db.fenceEvents.insert(event);
    return event;
  }

  /**
   * 创建停留事件
   */
  private async createDwellEvent(
    fenceId: string,
    userId: string,
    location: Point,
    timestamp: number,
    dwellTime: number
  ): Promise<FenceEvent> {
    const event: FenceEvent = {
      id: crypto.randomUUID(),
      fenceId,
      userId,
      eventType: 'dwell',
      timestamp,
      location: {
        ...location,
        properties: {
          ...location.properties,
          dwellTime
        }
      },
      triggeredRules: [],
      processed: false
    };

    await this.db.fenceEvents.insert(event);
    return event;
  }

  /**
   * 获取用户轨迹
   */
  async getUserTrajectory(
    userId: string,
    startTime?: number,
    endTime?: number
  ): Promise<UserLocation[]> {
    let query = this.db.userLocations.where('userId', '=', userId);

    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }

    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }

    return await query.orderBy('timestamp', 'asc').toArray();
  }

  /**
   * 获取用户在围栏内的停留历史
   */
  async getUserFenceHistory(
    userId: string,
    fenceId: string,
    startTime?: number,
    endTime?: number
  ): Promise<Array<{
    eventType: 'enter' | 'exit' | 'dwell';
    timestamp: number;
    dwellTime?: number;
  }>> {
    let query = this.db.fenceEvents
      .where('userId', '=', userId)
      .where('fenceId', '=', fenceId);

    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }

    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }

    const events = await query.orderBy('timestamp', 'asc').toArray();

    return events.map(e => ({
      eventType: e.eventType,
      timestamp: e.timestamp,
      dwellTime: e.location.properties?.dwellTime
    }));
  }

  /**
   * 获取围栏内的当前用户
   */
  async getCurrentUsersInFence(fenceId: string): Promise<string[]> {
    const userIds: string[] = [];

    for (const [userId, fenceStates] of this.userStates.entries()) {
      const fenceState = fenceStates.get(fenceId);
      if (fenceState?.inside) {
        userIds.push(userId);
      }
    }

    return userIds;
  }

  /**
   * 获取围栏事件统计
   */
  async getFenceEventStats(
    fenceId: string,
    startTime?: number,
    endTime?: number
  ): Promise<{
    total: number;
    enter: number;
    exit: number;
    dwell: number;
    uniqueUsers: number;
    avgDwellTime: number;
  }> {
    let query = this.db.fenceEvents.where('fenceId', '=', fenceId);

    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }

    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }

    const events = await query.toArray();

    const enter = events.filter(e => e.eventType === 'enter').length;
    const exit = events.filter(e => e.eventType === 'exit').length;
    const dwell = events.filter(e => e.eventType === 'dwell').length;

    const uniqueUsers = new Set(events.map(e => e.userId)).size;

    const dwellEvents = events.filter(e => e.eventType === 'dwell');
    const avgDwellTime =
      dwellEvents.length > 0
        ? dwellEvents.reduce((sum, e) => {
            const dt = e.location.properties?.dwellTime || 0;
            return sum + dt;
          }, 0) / dwellEvents.length
        : 0;

    return {
      total: events.length,
      enter,
      exit,
      dwell,
      uniqueUsers,
      avgDwellTime
    };
  }

  /**
   * 清理过期位置数据
   */
  async cleanupOldLocations(maxAge: number = 7 * 24 * 3600 * 1000): Promise<number> {
    const cutoffTime = Date.now() - maxAge;

    const oldLocations = await this.db.userLocations
      .where('timestamp', '<', cutoffTime)
      .toArray();

    if (oldLocations.length > 0) {
      await this.db.userLocations.bulkDelete(oldLocations.map(l => l.id));
    }

    return oldLocations.length;
  }

  /**
   * 获取用户状态
   */
  private getUserState(userId: string): Map<string, UserFenceState> {
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, new Map());
    }
    return this.userStates.get(userId)!;
  }

  /**
   * 检查点是否在多边形内
   */
  private async isPointInPolygon(
    point: Point,
    polygon: any
  ): Promise<boolean> {
    const [lng, lat] = point.coordinates;
    const [coordinates] = polygon.coordinates;

    let inside = false;

    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      const [xi, yi] = coordinates[i];
      const [xj, yj] = coordinates[j];

      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * 重置用户状态
   */
  resetUserState(userId: string): void {
    this.userStates.delete(userId);
  }

  /**
   * 重置所有状态
   */
  resetAllStates(): void {
    this.userStates.clear();
  }

  /**
   * 获取当前所有用户状态
   */
  getAllUserStates(): Map<string, Map<string, UserFenceState>> {
    return this.userStates;
  }
}
