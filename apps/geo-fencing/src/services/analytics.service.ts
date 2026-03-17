/**
 * 分析服务
 *
 * 负责热力图生成、数据聚合和统计分析
 */

import type {
  HeatmapPoint,
  FenceStatistics,
  UserBehaviorAnalysis,
  CampaignMetrics
} from './types';
import type { WebGeoDB } from '@webgeodb/core';
import type { Polygon } from '@webgeodb/core';

export class AnalyticsService {
  constructor(private db: WebGeoDB) {}

  /**
   * 生成热力图数据
   */
  async generateHeatmap(
    bbox: [number, number, number, number],
    cellSize: number = 0.01,
    startTime?: number,
    endTime?: number
  ): Promise<HeatmapPoint[]> {
    // 生成网格
    const cells = this.createGrid(bbox, cellSize);

    // 获取时间范围内的用户位置
    let query = this.db.userLocations;

    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }

    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }

    const locations = await query.toArray();

    // 为每个网格计数
    for (const cell of cells) {
      cell.count = locations.filter(loc =>
        this.isPointInCell(loc.geometry.coordinates, cell)
      ).length;
    }

    // 计算强度
    const maxCount = Math.max(...cells.map(c => c.count), 1);

    return cells
      .filter(cell => cell.count > 0)
      .map(cell => ({
        lat: cell.center[1],
        lng: cell.center[0],
        count: cell.count,
        intensity: cell.count / maxCount
      }));
  }

  /**
   * 生成围栏热力图
   */
  async generateFenceHeatmap(
    fenceId: string,
    cellSize: number = 0.001
  ): Promise<HeatmapPoint[]> {
    const fence = await this.db.fences.get(fenceId);
    if (!fence) {
      throw new Error(`Fence not found: ${fenceId}`);
    }

    // 获取围栏边界框
    const bbox = this.getBBox(fence.geometry);

    // 生成网格
    const cells = this.createGrid(bbox, cellSize);

    // 获取该围栏的所有事件
    const events = await this.db.fenceEvents
      .where('fenceId', '=', fenceId)
      .toArray();

    // 为每个网格计数
    for (const cell of cells) {
      cell.count = events.filter(event => {
        const [lng, lat] = event.location.coordinates;
        return (
          lng >= cell.bounds[0] &&
          lng <= cell.bounds[2] &&
          lat >= cell.bounds[1] &&
          lat <= cell.bounds[3]
        );
      }).length;
    }

    // 计算强度
    const maxCount = Math.max(...cells.map(c => c.count), 1);

    return cells
      .filter(cell => cell.count > 0)
      .map(cell => ({
        lat: cell.center[1],
        lng: cell.center[0],
        count: cell.count,
        intensity: cell.count / maxCount
      }));
  }

  /**
   * 获取围栏统计
   */
  async getFenceStatistics(fenceId: string): Promise<FenceStatistics> {
    const events = await this.db.fenceEvents
      .where('fenceId', '=', fenceId)
      .toArray();

    const uniqueUsers = new Set(events.map(e => e.userId)).size;

    // 计算平均停留时间
    const exitEvents = events.filter(e => e.eventType === 'exit');
    const totalDwellTime = exitEvents.reduce((sum, e) => {
      return sum + (e.location.properties?.dwellTime || 0);
    }, 0);

    const avgDwellTime = exitEvents.length > 0 ? totalDwellTime / exitEvents.length : 0;

    // 获取触发的规则统计
    const ruleStats = new Map<string, { triggers: number; conversions: number }>();

    for (const event of events) {
      for (const ruleId of event.triggeredRules) {
        if (!ruleStats.has(ruleId)) {
          ruleStats.set(ruleId, { triggers: 0, conversions: 0 });
        }
        const stats = ruleStats.get(ruleId)!;
        stats.triggers++;

        // 检查是否有转化
        const hasConversion = await this.db.userInteractions
          .where('userId', '=', event.userId)
          .where('action', '=', 'converted')
          .where('timestamp', '>=', event.timestamp)
          .count() > 0;

        if (hasConversion) {
          stats.conversions++;
        }
      }
    }

    const topRules = Array.from(ruleStats.entries())
      .map(([ruleId, stats]) => ({ ruleId, ...stats }))
      .sort((a, b) => b.triggers - a.triggers)
      .slice(0, 10);

    // 时间分布（按小时）
    const timeDistribution = new Array(24).fill(0).map((_, hour) => ({
      hour,
      count: 0
    }));

    for (const event of events) {
      const hour = new Date(event.timestamp).getHours();
      timeDistribution[hour].count++;
    }

    // 计算转化率
    const totalConversions = Array.from(ruleStats.values()).reduce(
      (sum, stats) => sum + stats.conversions,
      0
    );

    const conversionRate =
      uniqueUsers > 0 ? (totalConversions / uniqueUsers) * 100 : 0;

    return {
      fenceId,
      totalUsers: uniqueUsers,
      uniqueUsers,
      totalEvents: events.length,
      avgDwellTime,
      conversionRate,
      topRules,
      timeDistribution
    };
  }

  /**
   * 获取用户行为分析
   */
  async getUserBehaviorAnalysis(userId: string): Promise<UserBehaviorAnalysis> {
    const events = await this.db.fenceEvents
      .where('userId', '=', userId)
      .toArray();

    const enterEvents = events.filter(e => e.eventType === 'enter');
    const exitEvents = events.filter(e => e.eventType === 'exit');

    const totalVisits = enterEvents.length;

    // 计算总停留时间
    const totalDwellTime = exitEvents.reduce((sum, e) => {
      return sum + (e.location.properties?.dwellTime || 0);
    }, 0);

    const avgDwellTime = totalVisits > 0 ? totalDwellTime / totalVisits : 0;

    // 统计访问最多的围栏
    const fenceVisits = new Map<string, number>();

    for (const event of events) {
      const count = fenceVisits.get(event.fenceId) || 0;
      fenceVisits.set(event.fenceId, count + 1);
    }

    const favoriteFences = Array.from(fenceVisits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([fenceId]) => fenceId);

    // 最后访问时间
    const lastVisit =
      events.length > 0
        ? Math.max(...events.map(e => e.timestamp))
        : 0;

    // 转化历史
    const conversions = await this.db.userInteractions
      .where('userId', '=', userId)
      .where('action', '=', 'converted')
      .toArray();

    const conversionHistory = conversions.map(c => ({
      fenceId: c.metadata?.fenceId || '',
      timestamp: c.timestamp,
      value: c.value || 0
    }));

    return {
      userId,
      totalVisits,
      totalDwellTime,
      avgDwellTime,
      favoriteFences,
      lastVisit,
      conversionHistory
    };
  }

  /**
   * 获取营销活动指标
   */
  async getCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
    const campaign = await this.db.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const interactions = await this.db.userInteractions
      .where('campaignId', '=', campaignId)
      .toArray();

    const impressions = interactions.filter(i => i.action === 'impressed').length;
    const clicks = interactions.filter(i => i.action === 'clicked').length;
    const conversions = interactions.filter(i => i.action === 'converted').length;

    const revenue = conversions.reduce((sum, c) => sum + (c.value || 0), 0);

    const cost = campaign.budget || 0;
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

    return {
      impressions,
      clicks,
      conversions,
      revenue,
      cost,
      roi
    };
  }

  /**
   * 获取时间序列数据
   */
  async getTimeSeriesData(
    fenceId: string,
    interval: 'hour' | 'day' | 'week' = 'day',
    startTime?: number,
    endTime?: number
  ): Promise<Array<{ timestamp: number; count: number }>> {
    let query = this.db.fenceEvents.where('fenceId', '=', fenceId);

    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }

    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }

    const events = await query.toArray();

    // 确定时间间隔（毫秒）
    const intervalMs =
      interval === 'hour'
        ? 3600000
        : interval === 'day'
        ? 86400000
        : 604800000;

    // 按时间间隔分组
    const buckets = new Map<number, number>();

    for (const event of events) {
      const bucket =
        Math.floor(event.timestamp / intervalMs) * intervalMs;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([timestamp, count]) => ({ timestamp, count }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 对比分析
   */
  async compareFences(
    fenceIds: string[]
  ): Promise<
    Array<{
      fenceId: string;
      fenceName: string;
      totalUsers: number;
      totalEvents: number;
      avgDwellTime: number;
      conversionRate: number;
    }>
  > {
    const results = await Promise.all(
      fenceIds.map(async fenceId => {
        const fence = await this.db.fences.get(fenceId);
        const stats = await this.getFenceStatistics(fenceId);

        return {
          fenceId,
          fenceName: fence?.name || 'Unknown',
          totalUsers: stats.uniqueUsers,
          totalEvents: stats.totalEvents,
          avgDwellTime: stats.avgDwellTime,
          conversionRate: stats.conversionRate
        };
      })
    );

    return results.sort((a, b) => b.totalUsers - a.totalUsers);
  }

  // ============================================
  // 私有辅助方法
  // ============================================

  /**
   * 创建网格
   */
  private createGrid(
    bbox: [number, number, number, number],
    cellSize: number
  ) {
    const [minX, minY, maxX, maxY] = bbox;
    const cells = [];

    for (let x = minX; x < maxX; x += cellSize) {
      for (let y = minY; y < maxY; y += cellSize) {
        const cellBbox: [number, number, number, number] = [
          x,
          y,
          Math.min(x + cellSize, maxX),
          Math.min(y + cellSize, maxY)
        ];

        cells.push({
          bounds: cellBbox,
          center: [(cellBbox[0] + cellBbox[2]) / 2, (cellBbox[1] + cellBbox[3]) / 2],
          count: 0
        });
      }
    }

    return cells;
  }

  /**
   * 检查点是否在网格单元内
   */
  private isPointInCell(
    coordinates: [number, number],
    cell: { bounds: [number, number, number, number] }
  ): boolean {
    const [lng, lat] = coordinates;
    const [minX, minY, maxX, maxY] = cell.bounds;

    return lng >= minX && lng <= maxX && lat >= minY && lat <= maxY;
  }

  /**
   * 获取多边形边界框
   */
  private getBBox(polygon: Polygon): [number, number, number, number] {
    const [coordinates] = polygon.coordinates;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const [x, y] of coordinates) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return [minX, minY, maxX, maxY];
  }
}
