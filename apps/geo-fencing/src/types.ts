/**
 * 地理围栏营销系统 - 类型定义
 */

import type { Polygon, Point, Feature } from '@webgeodb/core';

// ============================================
// 核心实体
// ============================================

/**
 * 地理围栏
 */
export interface GeoFence {
  id: string;
  name: string;
  description?: string;
  type: 'store' | 'warehouse' | 'delivery-zone' | 'custom';
  geometry: Polygon;
  properties: {
    address?: string;
    phone?: string;
    businessHours?: string;
    [key: string]: any;
  };
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 用户位置记录
 */
export interface UserLocation {
  id: string;
  userId: string;
  timestamp: number;
  geometry: Point;
  accuracy: number;
  speed?: number;
  heading?: number;
  deviceId?: string;
}

/**
 * 营销规则
 */
export interface MarketingRule {
  id: string;
  name: string;
  description?: string;
  fenceId: string;
  trigger: 'enter' | 'exit' | 'dwell';
  dwellTime?: number; // 停留时间阈值（毫秒）
  action: MarketingAction;
  conditions: RuleCondition[];
  priority: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 营销动作
 */
export interface MarketingAction {
  type: 'push-notification' | 'email' | 'sms' | 'in-app-message' | 'discount';
  content: {
    title: string;
    message: string;
    discountCode?: string;
    discountAmount?: number;
    validUntil?: number;
    [key: string]: any;
  };
  channel: 'mobile' | 'web' | 'all';
}

/**
 * 规则条件
 */
export interface RuleCondition {
  type: 'time' | 'day-of-week' | 'user-segment' | 'frequency' | 'custom';
  operator: 'equals' | 'not-equals' | 'in' | 'not-in' | 'greater-than' | 'less-than';
  value: any;
}

// ============================================
// 事件和日志
// ============================================

/**
 * 围栏事件
 */
export interface FenceEvent {
  id: string;
  fenceId: string;
  userId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  timestamp: number;
  location: Point;
  triggeredRules: string[]; // 被触发的规则ID列表
  processed: boolean;
}

/**
 * 营销活动记录
 */
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  ruleIds: string[];
  startTime: number;
  endTime: number;
  budget?: number;
  metrics: CampaignMetrics;
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: number;
  updatedAt: number;
}

/**
 * 营销活动指标
 */
export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  roi: number; // 投资回报率
}

/**
 * 用户交互记录
 */
export interface UserInteraction {
  id: string;
  campaignId: string;
  userId: string;
  action: 'impressed' | 'clicked' | 'converted' | 'dismissed';
  timestamp: number;
  value?: number;
  metadata?: Record<string, any>;
}

// ============================================
// 分析和统计
// ============================================

/**
 * 热力图数据点
 */
export interface HeatmapPoint {
  lat: number;
  lng: number;
  count: number;
  intensity: number;
}

/**
 * 围栏统计
 */
export interface FenceStatistics {
  fenceId: string;
  totalUsers: number;
  uniqueUsers: number;
  totalEvents: number;
  avgDwellTime: number;
  conversionRate: number;
  topRules: Array<{
    ruleId: string;
    triggers: number;
    conversions: number;
  }>;
  timeDistribution: Array<{
    hour: number;
    count: number;
  }>;
}

/**
 * 用户行为分析
 */
export interface UserBehaviorAnalysis {
  userId: string;
  totalVisits: number;
  totalDwellTime: number;
  avgDwellTime: number;
  favoriteFences: string[];
  lastVisit: number;
  conversionHistory: Array<{
    fenceId: string;
    timestamp: number;
    value: number;
  }>;
}

// ============================================
// API请求和响应
// ============================================

/**
 * 创建围栏请求
 */
export interface CreateFenceRequest {
  name: string;
  description?: string;
  type: GeoFence['type'];
  geometry: Polygon;
  properties?: Record<string, any>;
}

/**
 * 创建规则请求
 */
export interface CreateRuleRequest {
  name: string;
  description?: string;
  fenceId: string;
  trigger: MarketingRule['trigger'];
  dwellTime?: number;
  action: MarketingAction;
  conditions: RuleCondition[];
  priority?: number;
}

/**
 * 位置检查请求
 */
export interface LocationCheckRequest {
  userId: string;
  location: Point;
  timestamp: number;
}

/**
 * 位置检查响应
 */
export interface LocationCheckResponse {
  insideFences: Array<{
    fenceId: string;
    fenceName: string;
    entered: boolean;
    dwellTime?: number;
  }>;
  triggeredActions: Array<{
    ruleId: string;
    action: MarketingAction;
  }>;
}

// ============================================
// 配置
// ============================================

/**
 * 系统配置
 */
export interface GeoFencingConfig {
  dbName: string;
  dbVersion: number;
  checkInterval: number; // 位置检查间隔（毫秒）
  maxDwellTime: number; // 最大停留时间（毫秒）
  enableRealtime: boolean;
  enableHeatmap: boolean;
  mapConfig: {
    defaultCenter: [number, number];
    defaultZoom: number;
    minZoom: number;
    maxZoom: number;
  };
}

/**
 * 地图选项
 */
export interface MapOptions {
  container: string;
  center?: [number, number];
  zoom?: number;
  editable?: boolean;
  onFenceCreate?: (fence: GeoFence) => void;
  onFenceUpdate?: (fence: GeoFence) => void;
  onFenceDelete?: (fenceId: string) => void;
}

// ============================================
// 工具类型
// ============================================

/**
 * 分页选项
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 查询过滤器
 */
export interface QueryFilter {
  fenceId?: string;
  userId?: string;
  startTime?: number;
  endTime?: number;
  eventType?: FenceEvent['eventType'];
}
