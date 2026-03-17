/**
 * Leaflet地图集成
 *
 * 提供围栏绘制、编辑和可视化功能
 */

import L from 'leaflet';
import type { GeoFence, MapOptions } from './types';

// 修复Leaflet默认图标问题
import 'leaflet/dist/leaflet.css';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

export class GeoFenceMap {
  private map: L.Map;
  private drawLayer: L.FeatureGroup;
  private fenceLayer: L.GeoJSON;
  private heatLayer: L.HeatLayer | null = null;
  private currentDrawing: L.Polygon | null = null;
  private editMode: boolean = false;

  private options: MapOptions;

  constructor(options: MapOptions) {
    this.options = options;

    // 初始化地图
    this.map = L.map(options.container, {
      center: options.center || [116.4074, 39.9042],
      zoom: options.zoom || 13,
      minZoom: 10,
      maxZoom: 18
    });

    // 添加底图
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // 创建绘图图层
    this.drawLayer = L.featureGroup().addTo(this.map);

    // 创建围栏图层
    this.fenceLayer = L.geoJSON(undefined, {
      style: this.getFenceStyle.bind(this),
      onEachFeature: this.onEachFenceFeature.bind(this)
    }).addTo(this.map);

    // 设置绘图工具
    if (options.editable) {
      this.setupDrawTools();
    }
  }

  /**
   * 设置绘图工具
   */
  private setupDrawTools(): void {
    // 简单实现：点击地图添加多边形顶点
    let points: L.LatLng[] = [];
    let tempLine: L.Polyline | null = null;
    let tempMarkers: L.Marker[] = [];

    const onClick = (e: L.LeafletMouseEvent) => {
      if (!this.editMode) return;

      points.push(e.latlng);

      // 添加标记
      const marker = L.circleMarker(e.latlng, {
        radius: 6,
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 1
      }).addTo(this.drawLayer);

      tempMarkers.push(marker);

      // 绘制临时线
      if (tempLine) {
        this.drawLayer.removeLayer(tempLine);
      }

      tempLine = L.polyline(points, {
        color: '#3388ff',
        dashArray: '5, 10'
      }).addTo(this.drawLayer);
    };

    const onDoubleClick = () => {
      if (!this.editMode || points.length < 3) return;

      // 完成多边形
      if (tempLine) {
        this.drawLayer.removeLayer(tempLine);
      }

      tempMarkers.forEach(m => this.drawLayer.removeLayer(m));

      const polygon = L.polygon(points, {
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.2
      }).addTo(this.drawLayer);

      this.currentDrawing = polygon;
      this.onFenceComplete(polygon);

      // 重置
      points = [];
      tempLine = null;
      tempMarkers = [];
    };

    this.map.on('click', onClick);
    this.map.on('dblclick', onDoubleClick);
  }

  /**
   * 围栏完成回调
   */
  private onFenceComplete(polygon: L.Polygon): void {
    const latlngs = polygon.getLatLngs()[0] as L.LatLng[];
    const coordinates = latlngs.map(ll => [ll.lng, ll.lat]);

    // 闭合多边形
    coordinates.push(coordinates[0]);

    const geoJSON: any = {
      type: 'Polygon',
      coordinates: [coordinates]
    };

    if (this.options.onFenceCreate) {
      this.options.onFenceCreate({
        id: crypto.randomUUID(),
        name: '新围栏',
        geometry: geoJSON,
        type: 'custom',
        active: true,
        properties: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    // 清除绘图
    this.drawLayer.clearLayers();
    this.currentDrawing = null;
    this.toggleEditMode(false);
  }

  /**
   * 显示围栏
   */
  displayFences(fences: GeoFence[]): void {
    const features = fences.map(fence => ({
      type: 'Feature',
      id: fence.id,
      geometry: fence.geometry,
      properties: {
        name: fence.name,
        type: fence.type,
        active: fence.active,
        description: fence.description
      }
    }));

    this.fenceLayer.clearLayers();
    this.fenceLayer.addData({
      type: 'FeatureCollection',
      features
    });
  }

  /**
   * 添加围栏
   */
  addFence(fence: GeoFence): void {
    this.fenceLayer.addData({
      type: 'Feature',
      id: fence.id,
      geometry: fence.geometry,
      properties: {
        name: fence.name,
        type: fence.type,
        active: fence.active,
        description: fence.description
      }
    });
  }

  /**
   * 更新围栏
   */
  updateFence(fence: GeoFence): void {
    this.removeFence(fence.id);
    this.addFence(fence);
  }

  /**
   * 删除围栏
   */
  removeFence(fenceId: string): void {
    this.fenceLayer.eachLayer(layer => {
      // @ts-ignore
      if (layer.feature.id === fenceId) {
        this.fenceLayer.removeLayer(layer);
      }
    });
  }

  /**
   * 清除所有围栏
   */
  clearFences(): void {
    this.fenceLayer.clearLayers();
  }

  /**
   * 缩放到围栏
   */
  fitFence(fence: GeoFence): void {
    const bounds = this.geoJsonToBounds(fence.geometry);
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  /**
   * 缩放到所有围栏
   */
  fitAllFences(): void {
    const bounds = this.fenceLayer.getBounds();
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  /**
   * 显示热力图
   */
  displayHeatmap(heatmapData: Array<{ lat: number; lng: number; intensity: number }>): void {
    // 注意：需要安装 leaflet.heat 插件
    // import 'leaflet.heat';

    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
    }

    const heatData = heatmapData.map(p => [p.lat, p.lng, p.intensity]);

    // @ts-ignore
    this.heatLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.3: 'cyan',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red'
      }
    }).addTo(this.map);
  }

  /**
   * 清除热力图
   */
  clearHeatmap(): void {
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = null;
    }
  }

  /**
   * 切换编辑模式
   */
  toggleEditMode(enabled?: boolean): void {
    this.editMode = enabled !== undefined ? enabled : !this.editMode;

    if (this.editMode) {
      this.map.getContainer().style.cursor = 'crosshair';
      this.map.doubleClickZoom.disable();
    } else {
      this.map.getContainer().style.cursor = '';
      this.map.doubleClickZoom.enable();
      this.drawLayer.clearLayers();
    }
  }

  /**
   * 获取地图实例
   */
  getMap(): L.Map {
    return this.map;
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 获取围栏样式
   */
  private getFenceStyle(feature: any): L.PathOptions {
    const properties = feature.properties || {};
    const active = properties.active !== false;

    const colors = {
      store: '#ff6b6b',
      warehouse: '#4ecdc4',
      'delivery-zone': '#45b7d1',
      custom: '#96ceb4'
    };

    const color = colors[properties.type as keyof typeof colors] || '#3388ff';

    return {
      color: active ? color : '#999999',
      weight: 2,
      opacity: active ? 1 : 0.5,
      fillOpacity: active ? 0.2 : 0.1
    };
  }

  /**
   * 围栏要素事件处理
   */
  private onEachFenceFeature(
    feature: any,
    layer: L.GeoJSON | L.Layer
  ): void {
    const properties = feature.properties || {};

    // 弹出信息
    const popupContent = `
      <div class="fence-popup">
        <h3>${properties.name || '未命名围栏'}</h3>
        <p><strong>类型:</strong> ${properties.type || 'custom'}</p>
        ${properties.description ? `<p>${properties.description}</p>` : ''}
        <p><strong>状态:</strong> ${properties.active ? '激活' : '未激活'}</p>
      </div>
    `;

    layer.bindPopup(popupContent);

    // 点击事件
    layer.on('click', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      this.map.fitBounds(layer.getBounds(), { padding: [50, 50] });
    });
  }

  /**
   * GeoJSON转边界
   */
  private geoJsonToBounds(geoJSON: any): L.LatLngBounds {
    const coordinates = geoJSON.coordinates[0];
    const latlngs = coordinates.map((c: number[]) => L.latLng(c[1], c[0]));
    return L.latLngBounds(latlngs);
  }
}
