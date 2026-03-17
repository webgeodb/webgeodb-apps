/**
 * 地图控制器
 *
 * 负责管理 Leaflet 地图显示和交互
 */

import L from 'leaflet';

export class MapController {
  private map: L.Map | null = null;
  private currentPositionMarker: L.Marker | null = null;
  private currentTrackPolyline: L.Polyline | null = null;
  private waypointMarkers: Map<string, L.Marker> = new Map();
  private trackColor = '#FF5722';

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
      html: `<div style="background-color: ${this.trackColor}; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    this.currentPositionMarker = L.marker([0, 0], { icon }).addTo(this.map);

    // 创建当前轨迹线
    this.currentTrackPolyline = L.polyline([], {
      color: this.trackColor,
      weight: 5,
      opacity: 0.8,
      lineJoin: 'round'
    }).addTo(this.map);
  }

  /**
   * 更新当前位置
   */
  updateCurrentPosition(lat: number, lng: number): void {
    if (!this.map || !this.currentPositionMarker) return;

    // 更新标记位置
    this.currentPositionMarker.setLatLng([lat, lng]);

    // 平移地图到当前位置
    this.map.panTo([lat, lng]);
  }

  /**
   * 添加轨迹点
   */
  addTrackPoint(lat: number, lng: number): void {
    if (!this.currentTrackPolyline) return;

    const latlngs = this.currentTrackPolyline.getLatLngs();
    latlngs.push([lat, lng]);
    this.currentTrackPolyline.setLatLngs(latlngs);
  }

  /**
   * 更新轨迹颜色
   */
  updateTrackColor(color: string): void {
    this.trackColor = color;

    if (this.currentTrackPolyline) {
      this.currentTrackPolyline.setStyle({ color });
    }

    if (this.currentPositionMarker) {
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      this.currentPositionMarker.setIcon(icon);
    }
  }

  /**
   * 添加航点标记
   */
  addWaypointMarker(waypoint: any): void {
    if (!this.map) return;

    const icon = L.divIcon({
      className: 'waypoint-marker',
      html: `<div style="background-color: #FFC107; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">📍</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([waypoint.latitude, waypoint.longitude], { icon })
      .addTo(this.map)
      .bindPopup(`<b>${waypoint.name}</b><br>${waypoint.latitude.toFixed(4)}, ${waypoint.longitude.toFixed(4)}`);

    this.waypointMarkers.set(waypoint.id, marker);
  }

  /**
   * 移除航点标记
   */
  removeWaypointMarker(waypointId: string): void {
    const marker = this.waypointMarkers.get(waypointId);
    if (marker) {
      marker.remove();
      this.waypointMarkers.delete(waypointId);
    }
  }

  /**
   * 清除当前轨迹
   */
  clearCurrentTrack(): void {
    if (this.currentTrackPolyline) {
      this.currentTrackPolyline.setLatLngs([]);
    }

    if (this.currentPositionMarker && this.map) {
      this.currentPositionMarker.setLatLng([0, 0]);
      this.map.setView([39.9042, 116.4074], 15);
    }
  }

  /**
   * 清除所有航点标记
   */
  clearWaypointMarkers(): void {
    this.waypointMarkers.forEach((marker) => marker.remove());
    this.waypointMarkers.clear();
  }

  /**
   * 添加历史轨迹
   */
  addHistoricalTrack(name: string, coordinates: [number, number][], color: string): void {
    if (!this.map) return;

    const polyline = L.polyline(coordinates, {
      color,
      weight: 4,
      opacity: 0.6,
      lineJoin: 'round',
      dashArray: '10, 10'
    }).addTo(this.map);

    polyline.bindPopup(`<b>${name}</b>`);

    // 调整视图以显示所有轨迹
    const allLatlngs: L.LatLng[] = coordinates.map(c => [c[0], c[1]] as [number, number]);
    const bounds = L.latLngBounds(allLatlngs);
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  /**
   * 获取地图实例
   */
  getMap(): L.Map | null {
    return this.map;
  }
}
