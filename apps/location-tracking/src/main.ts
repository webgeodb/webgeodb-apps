/**
 * WebGeoDB 教程示例
 *
 * 章节: 第4章 - 离线地图与位置追踪
 * 示例: 实时位置追踪
 *
 * 学习目标:
 * 1. 使用 Geolocation API 获取位置
 * 2. 记录和存储移动轨迹
 * 3. 计算距离和速度
 * 4. 回放轨迹数据
 *
 * 前置要求:
 * - Node.js >= 16
 * - TypeScript >= 4.5
 * - 支持 Geolocation API 的浏览器
 */

import { WebGeoDB } from 'webgeodb-core';
import { LocationTracker } from './location-tracker';
import { MapManager } from './map-manager';
import { UIService } from './ui-service';

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-04-02-location-tracking',
  version: 1
};

const TRACKING_CONFIG = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
};

// ============================================
// 主类
// ============================================

class LocationTrackingApp {
  private db: WebGeoDB;
  private tracker: LocationTracker;
  private mapManager: MapManager;
  private uiService: UIService;
  private isTracking = false;

  constructor() {
    this.db = new WebGeoDB(DB_CONFIG);
    this.tracker = new LocationTracker(this.db);
    this.mapManager = new MapManager();
    this.uiService = new UIService();
  }

  async init(): Promise<void> {
    console.log('=== 实时位置追踪应用初始化 ===');

    // 初始化数据库
    await this.initDatabase();

    // 初始化地图
    this.mapManager.init();

    // 设置事件监听
    this.setupEventListeners();

    // 加载历史轨迹
    await this.loadHistoricalTracks();

    console.log('✅ 应用初始化完成');
  }

  private async initDatabase(): Promise<void> {
    console.log('初始化数据库...');

    this.db.schema({
      tracks: {
        id: 'string',
        name: 'string',
        startTime: 'datetime',
        endTime: 'datetime',
        distance: 'number',
        pointCount: 'number',
        properties: 'json'
      },
      trackPoints: {
        id: 'string',
        trackId: 'string',
        geometry: 'geometry',
        timestamp: 'datetime',
        accuracy: 'number',
        speed: 'number',
        heading: 'number',
        properties: 'json'
      }
    });

    await this.db.open();

    // 创建索引
    this.db.tracks.createIndex('startTime');
    this.db.trackPoints.createIndex('trackId');
    this.db.trackPoints.createIndex('timestamp');

    console.log('✅ 数据库初始化完成');
  }

  private setupEventListeners(): void {
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    const intervalSlider = document.getElementById('intervalSlider') as HTMLInputElement;

    startBtn.addEventListener('click', () => this.startTracking());
    stopBtn.addEventListener('click', () => this.stopTracking());
    clearBtn.addEventListener('click', () => this.clearTracks());
    exportBtn.addEventListener('click', () => this.exportTracks());

    intervalSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.uiService.updateIntervalLabel(value);
    });
  }

  private async startTracking(): Promise<void> {
    console.log('开始位置追踪...');

    try {
      // 检查是否支持 Geolocation API
      if (!navigator.geolocation) {
        throw new Error('您的浏览器不支持地理位置功能');
      }

      // 获取更新间隔
      const interval = parseInt(
        (document.getElementById('intervalSlider') as HTMLInputElement).value
      ) * 1000;

      // 开始追踪
      await this.tracker.startTracking({
        ...TRACKING_CONFIG,
        interval
      });

      this.isTracking = true;
      this.uiService.updateTrackingStatus(true);

      // 监听位置更新
      this.tracker.on('location', (data) => {
        this.handleLocationUpdate(data);
      });

      // 监听追踪状态
      this.tracker.on('tracking', (isTracking) => {
        this.uiService.updateTrackingStatus(isTracking);
      });

      // 创建新轨迹记录
      const trackId = await this.tracker.createTrack();
      console.log(`创建新轨迹: ${trackId}`);

      this.uiService.showToast('开始追踪位置');

    } catch (error) {
      console.error('开始追踪失败:', error);
      alert('开始追踪失败: ' + (error as Error).message);
    }
  }

  private async stopTracking(): Promise<void> {
    console.log('停止位置追踪...');

    try {
      await this.tracker.stopTracking();

      this.isTracking = false;
      this.uiService.updateTrackingStatus(false);

      // 完成轨迹记录
      const track = await this.tracker.finishTrack();

      if (track) {
        console.log('轨迹完成:', track);
        this.uiService.showToast(`追踪停止！距离: ${(track.distance / 1000).toFixed(2)} km`);
      }

    } catch (error) {
      console.error('停止追踪失败:', error);
      alert('停止追踪失败: ' + (error as Error).message);
    }
  }

  private handleLocationUpdate(data: any): void {
    console.log('位置更新:', data);

    // 更新UI
    this.uiService.updateLocationInfo(data);

    // 更新地图
    this.mapManager.updateCurrentPosition(data.latitude, data.longitude);

    // 更新统计信息
    this.tracker.getStats().then((stats) => {
      this.uiService.updateStats(stats);
    });

    // 添加到时间线
    this.uiService.addTimelineItem(data);
  }

  private async clearTracks(): Promise<void> {
    if (!confirm('确定要清除所有轨迹数据吗？此操作不可恢复。')) {
      return;
    }

    try {
      // 清除数据库
      await this.db.tracks.clear();
      await this.db.trackPoints.clear();

      // 清除地图
      this.mapManager.clearTracks();

      // 清除时间线
      this.uiService.clearTimeline();

      // 重置统计
      this.uiService.updateStats({
        pointCount: 0,
        totalDistance: 0,
        duration: 0,
        avgSpeed: 0
      });

      this.uiService.showToast('已清除所有轨迹数据');
    } catch (error) {
      console.error('清除失败:', error);
      alert('清除失败: ' + (error as Error).message);
    }
  }

  private async exportTracks(): Promise<void> {
    try {
      const tracks = await this.db.tracks.toArray();

      if (tracks.length === 0) {
        alert('没有可导出的轨迹数据');
        return;
      }

      // 导出为 GeoJSON
      const geojson = {
        type: 'FeatureCollection',
        features: tracks.map(track => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [] // 需要查询轨迹点
          },
          properties: {
            id: track.id,
            name: track.name,
            startTime: track.startTime,
            endTime: track.endTime,
            distance: track.distance,
            pointCount: track.pointCount
          }
        }))
      };

      // 下载文件
      const blob = new Blob([JSON.stringify(geojson, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracks-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      this.uiService.showToast(`已导出 ${tracks.length} 条轨迹`);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败: ' + (error as Error).message);
    }
  }

  private async loadHistoricalTracks(): Promise<void> {
    console.log('加载历史轨迹...');

    try {
      const tracks = await this.db.tracks
        .orderBy('startTime')
        .reverse()
        .limit(10)
        .toArray();

      console.log(`加载了 ${tracks.length} 条历史轨迹`);

      // 在地图上显示
      for (const track of tracks) {
        const points = await this.db.trackPoints
          .where('trackId')
          .equals(track.id!)
          .toArray();

        if (points.length > 0) {
          const coordinates = points.map(p => {
            const coords = p.geometry.coordinates;
            return [coords[1], coords[0]] as [number, number];
          });

          this.mapManager.addTrack(track.name!, coordinates);
        }
      }
    } catch (error) {
      console.error('加载历史轨迹失败:', error);
    }
  }
}

// ============================================
// 初始化应用
// ============================================

const app = new LocationTrackingApp();
app.init().catch((error) => {
  console.error('应用初始化失败:', error);
  alert('应用初始化失败: ' + error.message);
});

export { LocationTrackingApp };
