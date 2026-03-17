/**
 * 电商地理围栏营销系统 - 主应用类
 *
 * 集成所有服务，提供统一的API接口
 */

import { WebGeoDB } from '@webgeodb/core';
import type { GeoFencingConfig } from './types';
import { GeoFenceService } from './services/geo-fence.service';
import { MarketingRuleEngine } from './services/marketing-rule-engine.service';
import { LocationTrackingService } from './services/location-tracking.service';
import { AnalyticsService } from './services/analytics.service';

export class GeoFencingApp {
  private db: WebGeoDB;
  private config: GeoFencingConfig;

  // 服务实例
  public fences: GeoFenceService;
  public rules: MarketingRuleEngine;
  public tracking: LocationTrackingService;
  public analytics: AnalyticsService;

  constructor(config: GeoFencingConfig) {
    this.config = config;

    // 初始化数据库
    this.db = new WebGeoDB({
      name: config.dbName,
      version: config.dbVersion
    });

    // 初始化服务
    this.fences = new GeoFenceService(this.db);
    this.rules = new MarketingRuleEngine(this.db);
    this.tracking = new LocationTrackingService(this.db);
    this.analytics = new AnalyticsService(this.db);
  }

  /**
   * 初始化应用
   */
  async init(): Promise<void> {
    console.log('初始化地理围栏营销系统...');

    // 打开数据库
    await this.db.open();

    // 定义表结构
    this.setupSchema();

    console.log('✅ 系统初始化完成');
  }

  /**
   * 设置数据库表结构
   */
  private setupSchema(): void {
    this.db.schema({
      // 地理围栏表
      fences: {
        id: 'string',
        name: 'string',
        description: 'string',
        type: 'string',
        geometry: 'geometry',
        properties: 'json',
        active: 'boolean',
        createdAt: 'number',
        updatedAt: 'number'
      },

      // 营销规则表
      rules: {
        id: 'string',
        name: 'string',
        description: 'string',
        fenceId: 'string',
        trigger: 'string',
        dwellTime: 'number',
        action: 'json',
        conditions: 'json',
        priority: 'number',
        active: 'boolean',
        createdAt: 'number',
        updatedAt: 'number'
      },

      // 用户位置表
      userLocations: {
        id: 'string',
        userId: 'string',
        timestamp: 'number',
        geometry: 'geometry',
        accuracy: 'number',
        speed: 'number',
        heading: 'number',
        deviceId: 'string'
      },

      // 围栏事件表
      fenceEvents: {
        id: 'string',
        fenceId: 'string',
        userId: 'string',
        eventType: 'string',
        timestamp: 'number',
        location: 'geometry',
        triggeredRules: 'json',
        processed: 'boolean'
      },

      // 用户表
      users: {
        id: 'string',
        name: 'string',
        email: 'string',
        phone: 'string',
        segment: 'string',
        properties: 'json',
        createdAt: 'number',
        updatedAt: 'number'
      },

      // 营销活动表
      campaigns: {
        id: 'string',
        name: 'string',
        description: 'string',
        ruleIds: 'json',
        startTime: 'number',
        endTime: 'number',
        budget: 'number',
        metrics: 'json',
        status: 'string',
        createdAt: 'number',
        updatedAt: 'number'
      },

      // 用户交互表
      userInteractions: {
        id: 'string',
        campaignId: 'string',
        userId: 'string',
        action: 'string',
        timestamp: 'number',
        value: 'number',
        metadata: 'json'
      }
    });

    // 创建索引
    this.createIndexes();
  }

  /**
   * 创建索引
   */
  private createIndexes(): void {
    // 围栏表索引
    this.db.fences.createIndex('active');
    this.db.fences.createIndex('type');
    this.db.fences.createIndex('geometry', { auto: true });

    // 规则表索引
    this.db.rules.createIndex('fenceId');
    this.db.rules.createIndex('active');
    this.db.rules.createIndex('priority');

    // 用户位置表索引
    this.db.userLocations.createIndex('userId');
    this.db.userLocations.createIndex('timestamp');
    this.db.userLocations.createIndex('geometry', { auto: true });

    // 围栏事件表索引
    this.db.fenceEvents.createIndex('fenceId');
    this.db.fenceEvents.createIndex('userId');
    this.db.fenceEvents.createIndex('eventType');
    this.db.fenceEvents.createIndex('timestamp');

    // 用户表索引
    this.db.users.createIndex('email');
    this.db.users.createIndex('segment');

    // 营销活动表索引
    this.db.campaigns.createIndex('status');
    this.db.campaigns.createIndex('startTime');
    this.db.campaigns.createIndex('endTime');

    // 用户交互表索引
    this.db.userInteractions.createIndex('campaignId');
    this.db.userInteractions.createIndex('userId');
    this.db.userInteractions.createIndex('action');
    this.db.userInteractions.createIndex('timestamp');
  }

  /**
   * 关闭应用
   */
  async close(): Promise<void> {
    await this.db.close();
    console.log('系统已关闭');
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    await this.db.clear();
    console.log('所有数据已清空');
  }

  /**
   * 获取数据库实例
   */
  getDatabase(): WebGeoDB {
    return this.db;
  }

  /**
   * 导出所有数据
   */
  async exportData(): Promise<{
    fences: any[];
    rules: any[];
    users: any[];
    campaigns: any[];
  }> {
    const [fences, rules, users, campaigns] = await Promise.all([
      this.db.fences.toArray(),
      this.db.rules.toArray(),
      this.db.users.toArray(),
      this.db.campaigns.toArray()
    ]);

    return { fences, rules, users, campaigns };
  }

  /**
   * 获取系统统计
   */
  async getSystemStats(): Promise<{
    totalFences: number;
    activeFences: number;
    totalRules: number;
    activeRules: number;
    totalUsers: number;
    totalEvents: number;
    totalCampaigns: number;
  }> {
    const [totalFences, activeFences, totalRules, activeRules, totalUsers, totalEvents, totalCampaigns] =
      await Promise.all([
        this.db.fences.count(),
        this.db.fences.where('active', '=', true).count(),
        this.db.rules.count(),
        this.db.rules.where('active', '=', true).count(),
        this.db.users.count(),
        this.db.fenceEvents.count(),
        this.db.campaigns.count()
      ]);

    return {
      totalFences,
      activeFences,
      totalRules,
      activeRules,
      totalUsers,
      totalEvents,
      totalCampaigns
    };
  }
}

// ============================================
// 默认配置
// ============================================

export const DEFAULT_CONFIG: GeoFencingConfig = {
  dbName: 'geo-fencing-marketing',
  dbVersion: 1,
  checkInterval: 5000, // 5秒
  maxDwellTime: 3600000, // 1小时
  enableRealtime: true,
  enableHeatmap: true,
  mapConfig: {
    defaultCenter: [116.4074, 39.9042], // 北京
    defaultZoom: 13,
    minZoom: 10,
    maxZoom: 18
  }
};
