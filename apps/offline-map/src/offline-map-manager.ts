/**
 * 离线地图管理器
 *
 * 负责管理离线瓦片下载、存储和查询
 */

import { WebGeoDB } from '@webgeodb/core';
import L from 'leaflet';

export interface OfflineRegion {
  bounds: string;
  zoomLevels: number[];
  tileCount: number;
  downloadedAt: Date;
}

export class OfflineMapManager {
  constructor(private db: WebGeoDB) {}

  /**
   * 下载指定区域的地图瓦片
   */
  async downloadTiles(
    bounds: L.LatLngBounds,
    minZoom: number,
    maxZoom: number,
    onProgress?: (percent: number) => void
  ): Promise<number> {
    const tiles = this.getTilesInBounds(bounds, minZoom, maxZoom);
    let downloaded = 0;
    const total = tiles.length;

    console.log(`开始下载 ${total} 个瓦片...`);

    for (const tile of tiles) {
      try {
        const data = await this.downloadTile(tile.z, tile.x, tile.y);

        // 保存到数据库
        await this.db.tiles.put({
          id: `${tile.z}-${tile.x}-${tile.y}`,
          url: this.getTileUrl(tile.z, tile.x, tile.y),
          data,
          createdAt: new Date()
        });

        downloaded++;
        const percent = (downloaded / total) * 100;
        onProgress?.(percent);

      } catch (error) {
        console.warn(`瓦片下载失败: ${tile.z}/${tile.x}/${tile.y}`, error);
      }
    }

    console.log(`瓦片下载完成: ${downloaded}/${total}`);
    return downloaded;
  }

  /**
   * 获取指定边界内的所有瓦片坐标
   */
  private getTilesInBounds(
    bounds: L.LatLngBounds,
    minZoom: number,
    maxZoom: number
  ): Array<{ z: number; x: number; y: number }> {
    const tiles: Array<{ z: number; x: number; y: number }> = [];

    for (let z = minZoom; z <= maxZoom; z++) {
      const minX = this.lonToTile(bounds.getWest(), z);
      const maxX = this.lonToTile(bounds.getEast(), z);
      const minY = this.latToTile(bounds.getNorth(), z);
      const maxY = this.latToTile(bounds.getSouth(), z);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tiles.push({ z, x, y });
        }
      }
    }

    return tiles;
  }

  /**
   * 下载单个瓦片
   */
  private async downloadTile(z: number, x: number, y: number): Promise<Blob> {
    const url = this.getTileUrl(z, x, y);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * 获取瓦片URL
   */
  private getTileUrl(z: number, x: number, y: number): string {
    return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }

  /**
   * 经度转瓦片X坐标
   */
  private lonToTile(lon: number, zoom: number): number {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  }

  /**
   * 纬度转瓦片Y坐标
   */
  private latToTile(lat: number, zoom: number): number {
    return Math.floor(
      (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 *
      Math.pow(2, zoom)
    );
  }

  /**
   * 保存离线区域记录
   */
  async saveOfflineRegion(region: OfflineRegion): Promise<void> {
    const id = `region-${Date.now()}`;
    await this.db.features.put({
      id,
      name: `离线区域 ${new Date().toLocaleString()}`,
      type: 'offline-region',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [parseFloat(region.bounds.split(',')[0]), parseFloat(region.bounds.split(',')[1])],
          [parseFloat(region.bounds.split(',')[2]), parseFloat(region.bounds.split(',')[1])],
          [parseFloat(region.bounds.split(',')[2]), parseFloat(region.bounds.split(',')[3])],
          [parseFloat(region.bounds.split(',')[0]), parseFloat(region.bounds.split(',')[3])],
          [parseFloat(region.bounds.split(',')[0]), parseFloat(region.bounds.split(',')[1])]
        ]]
      },
      properties: {
        ...region,
        synced: false
      },
      createdAt: new Date(),
      synced: false
    });
  }

  /**
   * 查询离线瓦片
   */
  async getTile(z: number, x: number, y: number): Promise<Blob | undefined> {
    const tile = await this.db.tiles.get(`${z}-${x}-${y}`);
    return tile?.data;
  }

  /**
   * 获取所有离线区域
   */
  async getOfflineRegions(): Promise<OfflineRegion[]> {
    const features = await this.db.features
      .where('type')
      .equals('offline-region')
      .toArray();

    return features.map(f => f.properties as OfflineRegion);
  }
}
