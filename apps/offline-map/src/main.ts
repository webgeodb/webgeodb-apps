/**
 * WebGeoDB 教程示例
 *
 * 章节: 第4章 - 离线地图与位置追踪
 * 示例: 离线地图应用
 *
 * 学习目标:
 * 1. 使用Service Worker实现离线功能
 * 2. 下载并存储地图瓦片数据
 * 3. 在离线状态下查询和显示数据
 * 4. 实现在线时自动同步数据
 *
 * 前置要求:
 * - Node.js >= 16
 * - TypeScript >= 4.5
 * - 现代浏览器支持Service Worker
 */

import { WebGeoDB } from 'webgeodb-core';
import { OfflineMapManager } from './offline-map-manager';
import { UIService } from './ui-service';

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-04-01-offline-map',
  version: 1
};

const TILE_SERVER = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// ============================================
// 主类
// ============================================

class OfflineMapApp {
  private db: WebGeoDB;
  private map: L.Map | null = null;
  private tileLayer: L.TileLayer | null = null;
  private offlineManager: OfflineMapManager;
  private uiService: UIService;
  private featureLayer: L.GeoJSON | null = null;

  constructor() {
    this.db = new WebGeoDB(DB_CONFIG);
    this.offlineManager = new OfflineMapManager(this.db);
    this.uiService = new UIService();
  }

  async init(): Promise<void> {
    console.log('=== 离线地图应用初始化 ===');

    // 初始化数据库
    await this.initDatabase();

    // 初始化地图
    this.initMap();

    // 初始化Service Worker
    await this.initServiceWorker();

    // 设置事件监听
    this.setupEventListeners();

    // 监听在线/离线状态
    this.setupNetworkStatus();

    // 加载离线数据
    await this.loadOfflineData();

    console.log('✅ 应用初始化完成');
  }

  private async initDatabase(): Promise<void> {
    console.log('初始化数据库...');

    this.db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        geometry: 'geometry',
        properties: 'json',
        createdAt: 'datetime',
        synced: 'boolean'
      },
      tiles: {
        id: 'string',
        url: 'string',
        data: 'blob',
        createdAt: 'datetime'
      }
    });

    await this.db.open();

    // 创建索引
    this.db.features.createIndex('geometry', { auto: true });
    this.db.tiles.createIndex('url', { unique: true });

    console.log('✅ 数据库初始化完成');
  }

  private initMap(): void {
    console.log('初始化地图...');

    // 创建地图实例
    this.map = L.map('map').setView([39.9042, 116.4074], 13); // 北京

    // 添加在线瓦片层
    this.tileLayer = L.tileLayer(TILE_SERVER, {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // 创建要素图层
    this.featureLayer = L.geoJSON(undefined, {
      onEachFeature: (feature, layer) => {
        if (feature.properties) {
          const popup = `
            <div>
              <h3>${feature.properties.name || '未命名'}</h3>
              <p>类型: ${feature.properties.type || '未知'}</p>
              <p>ID: ${feature.properties.id || 'N/A'}</p>
              <p>同步: ${feature.properties.synced ? '是' : '否'}</p>
            </div>
          `;
          layer.bindPopup(popup);
        }
      }
    }).addTo(this.map);

    console.log('✅ 地图初始化完成');
  }

  private async initServiceWorker(): Promise<void> {
    console.log('注册Service Worker...');

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          new URL('./service-worker.ts', import.meta.url),
          { type: 'module' }
        );

        console.log('✅ Service Worker注册成功:', registration.scope);
      } catch (error) {
        console.error('❌ Service Worker注册失败:', error);
      }
    } else {
      console.warn('⚠️ 浏览器不支持Service Worker');
    }
  }

  private setupEventListeners(): void {
    const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
    const syncBtn = document.getElementById('syncBtn') as HTMLButtonElement;

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.handleDownload());
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.handleSync());
    }
  }

  private setupNetworkStatus(): void {
    const updateStatus = () => {
      const isOnline = navigator.onLine;
      this.uiService.updateOnlineStatus(isOnline);

      const syncBtn = document.getElementById('syncBtn') as HTMLButtonElement;
      if (syncBtn) {
        syncBtn.disabled = !isOnline;
      }

      if (isOnline) {
        console.log('🌐 网络已连接');
        // 恢复在线瓦片
        if (this.tileLayer && this.map) {
          this.tileLayer.setUrl(TILE_SERVER);
        }
      } else {
        console.log('📡 网络已断开，切换到离线模式');
        // 使用离线瓦片
        if (this.tileLayer && this.map) {
          this.tileLayer.setUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
        }
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // 初始状态
    updateStatus();
  }

  private async handleDownload(): Promise<void> {
    console.log('开始下载区域数据...');

    const bounds = this.map?.getBounds();
    if (!bounds) {
      alert('无法获取地图边界');
      return;
    }

    try {
      this.uiService.showProgress(true);

      // 下载瓦片
      const tileCount = await this.offlineManager.downloadTiles(
        bounds,
        10,
        15,
        (progress) => {
          this.uiService.updateProgress(progress, `下载瓦片: ${progress.toFixed(1)}%`);
        }
      );

      // 模拟下载POI数据
      this.uiService.updateProgress(50, '下载POI数据...');

      const poiData = await this.fetchPOIData(bounds);
      await this.savePOIData(poiData);

      // 保存离线区域记录
      await this.offlineManager.saveOfflineRegion({
        bounds: bounds.toBBoxString(),
        zoomLevels: [10, 11, 12, 13, 14, 15],
        tileCount,
        downloadedAt: new Date()
      });

      this.uiService.updateProgress(100, '下载完成！');

      // 更新统计信息
      await this.updateStats();

      setTimeout(() => {
        this.uiService.showProgress(false);
        alert(`下载完成！\n瓦片数: ${tileCount}\nPOI数: ${poiData.length}`);
      }, 500);

    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败: ' + (error as Error).message);
      this.uiService.showProgress(false);
    }
  }

  private async fetchPOIData(bounds: L.LatLngBounds): Promise<any[]> {
    // 模拟POI数据
    const center = bounds.getCenter();
    const pois: any[] = [];

    for (let i = 0; i < 20; i++) {
      const lat = center.lat + (Math.random() - 0.5) * 0.02;
      const lng = center.lng + (Math.random() - 0.5) * 0.02;

      pois.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          id: `poi-${i}`,
          name: `POI ${i + 1}`,
          type: ['餐厅', '酒店', '景点', '购物中心'][Math.floor(Math.random() * 4)],
          synced: false
        }
      });
    }

    return pois;
  }

  private async savePOIData(features: any[]): Promise<void> {
    for (const feature of features) {
      await this.db.features.put({
        id: feature.properties.id,
        name: feature.properties.name,
        type: feature.properties.type,
        geometry: feature.geometry,
        properties: feature.properties,
        createdAt: new Date(),
        synced: false
      });
    }
  }

  private async handleSync(): Promise<void> {
    console.log('开始同步数据到服务器...');

    try {
      // 获取未同步的数据
      const unsyncedFeatures = await this.db.features
        .where('synced')
        .equals(false)
        .toArray();

      console.log(`找到 ${unsyncedFeatures.length} 条未同步数据`);

      // 模拟同步到服务器
      for (const feature of unsyncedFeatures) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 模拟网络延迟

        // 标记为已同步
        await this.db.features.update(feature.id!, { synced: true });
      }

      // 更新最后同步时间
      const now = new Date();
      localStorage.setItem('lastSync', now.toISOString());
      this.uiService.updateLastSync(now);

      alert(`同步完成！\n同步了 ${unsyncedFeatures.length} 条数据`);
    } catch (error) {
      console.error('同步失败:', error);
      alert('同步失败: ' + (error as Error).message);
    }
  }

  private async loadOfflineData(): Promise<void> {
    console.log('加载离线数据...');

    try {
      // 查询所有POI数据
      const features = await this.db.features.toArray();

      console.log(`加载了 ${features.length} 条离线POI数据`);

      // 显示在地图上
      if (this.featureLayer) {
        const geojsonData = {
          type: 'FeatureCollection',
          features: features.map(f => ({
            type: 'Feature',
            geometry: f.geometry,
            properties: f.properties
          }))
        };

        this.featureLayer.addData(geojsonData);
      }

      // 更新统计信息
      await this.updateStats();
    } catch (error) {
      console.error('加载离线数据失败:', error);
    }
  }

  private async updateStats(): Promise<void> {
    try {
      const featureCount = await this.db.features.count();
      const tiles = await this.db.tiles.toArray();
      const dataSize = tiles.reduce((sum, tile) => sum + (tile.data?.size || 0), 0);

      this.uiService.updateStats({
        featureCount,
        dataSize: Math.round(dataSize / 1024) // 转换为KB
      });
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  }
}

// ============================================
// UI服务类
// ============================================

export class UIService {
  updateOnlineStatus(isOnline: boolean): void {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.className = `status ${isOnline ? 'online' : 'offline'}`;
      statusEl.textContent = `状态: ${isOnline ? '在线' : '离线'}`;
    }
  }

  updateStats(stats: { featureCount: number; dataSize: number }): void {
    const featureCountEl = document.getElementById('featureCount');
    const dataSizeEl = document.getElementById('dataSize');

    if (featureCountEl) featureCountEl.textContent = stats.featureCount.toString();
    if (dataSizeEl) dataSizeEl.textContent = `${stats.dataSize} KB`;
  }

  updateLastSync(date: Date): void {
    const lastSyncEl = document.getElementById('lastSync');
    if (lastSyncEl) {
      lastSyncEl.textContent = date.toLocaleTimeString();
    }
  }

  showProgress(show: boolean): void {
    const container = document.getElementById('progressContainer');
    const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

    if (container) container.style.display = show ? 'block' : 'none';
    if (downloadBtn) downloadBtn.disabled = show;
  }

  updateProgress(percent: number, text: string): void {
    const fillEl = document.getElementById('progressFill');
    const textEl = document.getElementById('loadingText');

    if (fillEl) fillEl.style.width = `${percent}%`;
    if (textEl) textEl.textContent = text;
  }
}

// ============================================
// 初始化应用
// ============================================

const app = new OfflineMapApp();
app.init().catch((error) => {
  console.error('应用初始化失败:', error);
  alert('应用初始化失败: ' + error.message);
});

export { OfflineMapApp };
