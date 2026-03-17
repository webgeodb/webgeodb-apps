/**
 * 地图管理器
 *
 * 负责管理 Leaflet 地图显示和交互
 */

import L from 'leaflet';

export class MapManager {
  private map: L.Map | null = null;
  private currentPositionMarker: L.Marker | null = null;
  private currentTrackPolyline: L.Polyline | null = null;
  private trackPolylines: Map<string, L.Polyline> = new Map();

  init(): void {
    // 创建地图实例
    this.map = L.map('map').setView([39.9042, 116.4074], 15);

    // 添加瓦片层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // 创建当前位置标记
    const icon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #4285f4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    this.currentPositionMarker = L.marker([0, 0], { icon }).addTo(this.map);

    // 创建当前轨迹线
    this.currentTrackPolyline = L.polyline([], {
      color: '#4285f4',
      weight: 4,
      opacity: 0.8
    }).addTo(this.map);
  }

  /**
   * 更新当前位置
   */
  updateCurrentPosition(lat: number, lng: number): void {
    if (!this.map || !this.currentPositionMarker) return;

    // 更新标记位置
    this.currentPositionMarker.setLatLng([lat, lng]);

    // 添加到当前轨迹
    if (this.currentTrackPolyline) {
      const latlngs = this.currentTrackPolyline.getLatLngs();
      latlngs.push([lat, lng]);
      this.currentTrackPolyline.setLatLngs(latlngs);
    }

    // 平移地图到当前位置
    this.map.panTo([lat, lng]);
  }

  /**
   * 添加历史轨迹
   */
  addTrack(name: string, coordinates: [number, number][]): void {
    if (!this.map) return;

    const polyline = L.polyline(coordinates, {
      color: this.getRandomColor(),
      weight: 3,
      opacity: 0.6
    }).addTo(this.map);

    this.trackPolylines.set(name, polyline);

    // 添加弹出信息
    polyline.bindPopup(`<b>${name}</b>`);

    // 调整视图以显示所有轨迹
    this.fitAllTracks();
  }

  /**
   * 清除所有轨迹
   */
  clearTracks(): void {
    // 清除历史轨迹
    this.trackPolylines.forEach((polyline) => {
      polyline.remove();
    });
    this.trackPolylines.clear();

    // 清除当前轨迹
    if (this.currentTrackPolyline) {
      this.currentTrackPolyline.setLatLngs([]);
    }

    // 重置当前位置标记
    if (this.currentPositionMarker && this.map) {
      this.currentPositionMarker.setLatLng([0, 0]);
      this.map.setView([39.9042, 116.4074], 15);
    }
  }

  /**
   * 调整视图以显示所有轨迹
   */
  private fitAllTracks(): void {
    if (!this.map) return;

    const allLatlngs: L.LatLng[] = [];

    // 收集所有轨迹点
    this.trackPolylines.forEach((polyline) => {
      allLatlngs.push(...polyline.getLatLngs());
    });

    if (this.currentTrackPolyline) {
      allLatlngs.push(...this.currentTrackPolyline.getLatLngs());
    }

    if (allLatlngs.length > 0) {
      const bounds = L.latLngBounds(allLatlngs);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  /**
   * 生成随机颜色
   */
  private getRandomColor(): string {
    const colors = [
      '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db',
      '#9b59b6', '#34495e', '#16a085', '#27ae60', '#2980b9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 获取地图实例
   */
  getMap(): L.Map | null {
    return this.map;
  }
}
