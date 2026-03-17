/**
 * 地理围栏管理服务
 *
 * 负责围栏的CRUD操作和空间查询
 */

import type {
  GeoFence,
  CreateFenceRequest,
  PaginatedResponse,
  QueryFilter
} from './types';
import type { WebGeoDB } from 'webgeodb-core';
import type { Polygon, Point } from 'webgeodb-core';

export class GeoFenceService {
  constructor(private db: WebGeoDB) {}

  /**
   * 创建围栏
   */
  async createFence(request: CreateFenceRequest): Promise<GeoFence> {
    const fence: GeoFence = {
      id: crypto.randomUUID(),
      name: request.name,
      description: request.description,
      type: request.type,
      geometry: request.geometry,
      properties: request.properties || {},
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.db.fences.insert(fence);
    return fence;
  }

  /**
   * 更新围栏
   */
  async updateFence(
    fenceId: string,
    updates: Partial<Omit<GeoFence, 'id' | 'createdAt'>>
  ): Promise<GeoFence> {
    const fence = await this.db.fences.get(fenceId);
    if (!fence) {
      throw new Error(`Fence not found: ${fenceId}`);
    }

    const updated = {
      ...fence,
      ...updates,
      updatedAt: Date.now()
    };

    await this.db.fences.update(fenceId, updated);
    return updated;
  }

  /**
   * 删除围栏
   */
  async deleteFence(fenceId: string): Promise<void> {
    // 删除关联的规则
    const rules = await this.db.rules
      .where('fenceId', '=', fenceId)
      .toArray();

    if (rules.length > 0) {
      await this.db.rules.bulkDelete(rules.map(r => r.id));
    }

    // 删除围栏
    await this.db.fences.delete(fenceId);
  }

  /**
   * 获取围栏
   */
  async getFence(fenceId: string): Promise<GeoFence | undefined> {
    return await this.db.fences.get(fenceId);
  }

  /**
   * 获取所有围栏
   */
  async getAllFences(options?: {
    active?: boolean;
    type?: GeoFence['type'];
  }): Promise<GeoFence[]> {
    let query = this.db.fences;

    if (options?.active !== undefined) {
      query = query.where('active', '=', options.active);
    }

    if (options?.type) {
      query = query.where('type', '=', options.type);
    }

    return await query.toArray();
  }

  /**
   * 检查点是否在围栏内
   */
  async isPointInFences(
    point: Point,
    fenceIds?: string[]
  ): Promise<Array<{ fence: GeoFence; inside: boolean }>> {
    const fences = fenceIds
      ? await this.db.fences.where('id', 'in', fenceIds).toArray()
      : await this.db.fences.where('active', '=', true).toArray();

    const results = await Promise.all(
      fences.map(async fence => ({
        fence,
        inside: await this.db.fences
          .where('id', '=', fence.id)
          .contains('geometry', point)
          .count() > 0
      }))
    );

    return results.filter(r => r.inside);
  }

  /**
   * 查找包含指定位置的围栏
   */
  async findFencesContainingPoint(
    point: Point
  ): Promise<GeoFence[]> {
    const fences = await this.db.fences
      .where('active', '=', true)
      .toArray();

    const insideFences: GeoFence[] = [];

    for (const fence of fences) {
      const contains = await this.checkPolygonContainsPoint(
        fence.geometry,
        point
      );
      if (contains) {
        insideFences.push(fence);
      }
    }

    return insideFences;
  }

  /**
   * 查找与指定区域相交的围栏
   */
  async findFencesIntersecting(
    polygon: Polygon
  ): Promise<GeoFence[]> {
    const fences = await this.db.fences
      .where('active', '=', true)
      .toArray();

    const intersecting: GeoFence[] = [];

    for (const fence of fences) {
      const intersects = await this.checkPolygonsIntersect(
        fence.geometry,
        polygon
      );
      if (intersects) {
        intersecting.push(fence);
      }
    }

    return intersecting;
  }

  /**
   * 分页查询围栏
   */
  async getFencesPaginated(options: {
    page: number;
    limit: number;
    sortBy?: keyof GeoFence;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<GeoFence>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    let query = this.db.fences.orderBy(sortBy, sortOrder);

    const total = await query.count();
    const data = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .toArray();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 搜索围栏
   */
  async searchFences(keyword: string): Promise<GeoFence[]> {
    const fences = await this.db.fences.toArray();

    const lowerKeyword = keyword.toLowerCase();

    return fences.filter(
      fence =>
        fence.name.toLowerCase().includes(lowerKeyword) ||
        fence.description?.toLowerCase().includes(lowerKeyword) ||
        fence.properties.address?.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 获取围栏统计
   */
  async getFenceStats(fenceId: string): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    avgDwellTime: number;
    todayEvents: number;
  }> {
    const events = await this.db.fenceEvents
      .where('fenceId', '=', fenceId)
      .toArray();

    const uniqueUsers = new Set(events.map(e => e.userId)).size;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEvents = events.filter(
      e => e.timestamp >= todayStart.getTime()
    ).length;

    // 计算平均停留时间
    const dwellEvents = await this.db.fenceEvents
      .where('fenceId', '=', fenceId)
      .where('eventType', '=', 'dwell')
      .toArray();

    const avgDwellTime =
      dwellEvents.length > 0
        ? dwellEvents.reduce((sum, e) => {
            const dwellTime = e.location.properties?.dwellTime || 0;
            return sum + dwellTime;
          }, 0) / dwellEvents.length
        : 0;

    return {
      totalEvents: events.length,
      uniqueUsers,
      avgDwellTime,
      todayEvents
    };
  }

  /**
   * 批量导入围栏
   */
  async importFences(fences: CreateFenceRequest[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < fences.length; i++) {
      try {
        await this.createFence(fences[i]);
        success++;
      } catch (error) {
        failed++;
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { success, failed, errors };
  }

  /**
   * 导出围栏为GeoJSON
   */
  async exportFencesAsGeoJSON(fenceIds?: string[]): Promise<{
    type: 'FeatureCollection';
    features: any[];
  }> {
    const fences = fenceIds
      ? await this.db.fences.where('id', 'in', fenceIds).toArray()
      : await this.db.fences.toArray();

    return {
      type: 'FeatureCollection',
      features: fences.map(fence => ({
        type: 'Feature',
        id: fence.id,
        geometry: fence.geometry,
        properties: {
          name: fence.name,
          description: fence.description,
          type: fence.type,
          active: fence.active,
          createdAt: fence.createdAt,
          ...fence.properties
        }
      }))
    };
  }

  // ============================================
  // 私有辅助方法
  // ============================================

  /**
   * 检查多边形是否包含点（射线法）
   */
  private async checkPolygonContainsPoint(
    polygon: Polygon,
    point: Point
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
   * 检查两个多边形是否相交
   */
  private async checkPolygonsIntersect(
    poly1: Polygon,
    poly2: Polygon
  ): Promise<boolean> {
    // 简化实现：检查边界框相交
    const bbox1 = this.getBBox(poly1);
    const bbox2 = this.getBBox(poly2);

    return !(
      bbox1.maxX < bbox2.minX ||
      bbox1.minX > bbox2.maxX ||
      bbox1.maxY < bbox2.minY ||
      bbox1.minY > bbox2.maxY
    );
  }

  /**
   * 获取多边形边界框
   */
  private getBBox(polygon: Polygon): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
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

    return { minX, minY, maxX, maxY };
  }
}
