# 第4章 示例2: 实时位置追踪

本示例展示了如何使用 WebGeoDB 和 Geolocation API 构建实时位置追踪应用。

## 功能特性

- ✅ **实时位置追踪** - 使用 Geolocation API 持续获取位置更新
- ✅ **轨迹记录** - 自动记录移动轨迹到数据库
- ✅ **距离计算** - 实时计算移动距离和速度
- ✅ **地图可视化** - 在 Leaflet 地图上显示轨迹和当前位置
- ✅ **历史轨迹** - 加载和显示历史追踪记录
- ✅ **数据导出** - 导出轨迹数据为 GeoJSON 格式

## 技术要点

### 1. Geolocation API

```typescript
// 开始位置监听
const watchId = navigator.geolocation.watchPosition(
  (position) => handlePositionSuccess(position),
  (error) => handlePositionError(error),
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
);

// 停止监听
navigator.geolocation.clearWatch(watchId);
```

### 2. 轨迹记录

```typescript
// 保存轨迹点
await db.trackPoints.add({
  id: pointId,
  trackId: currentTrackId,
  geometry: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  timestamp: new Date(),
  accuracy: position.coords.accuracy,
  speed: position.coords.speed || 0,
  heading: position.coords.heading || 0
});
```

### 3. 距离计算

```typescript
import * as turf from '@turf/turf';

// 计算两点间距离
const from = turf.point([lon1, lat1]);
const to = turf.point([lon2, lat2]);
const distance = turf.distance(from, to, { units: 'kilometers' });
```

### 4. 地图可视化

```typescript
// 更新当前位置标记
currentPositionMarker.setLatLng([lat, lng]);

// 添加轨迹线
const polyline = L.polyline(coordinates, {
  color: '#4285f4',
  weight: 4,
  opacity: 0.8
}).addTo(map);
```

## 运行方式

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

应用将在 http://localhost:3002 启动

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 使用说明

1. **开始追踪**
   - 点击"开始"按钮
   - 允许浏览器访问位置信息
   - 应用开始记录位置

2. **调整更新频率**
   - 使用滑块调整位置更新频率（1-10秒）
   - 频率越高越精确，但消耗更多电量

3. **查看统计**
   - 实时查看轨迹点数、总距离、持续时间
   - 查看平均速度

4. **导出数据**
   - 点击"导出"按钮
   - 下载 GeoJSON 格式的轨迹数据

5. **清除数据**
   - 点击"清除"按钮
   - 删除所有轨迹记录

## 文件结构

```
02-location-tracking/
├── index.html              # HTML页面
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript配置
├── vite.config.ts          # Vite构建配置
└── src/
    ├── main.ts             # 主应用入口
    ├── location-tracker.ts # 位置追踪器
    ├── map-manager.ts      # 地图管理器
    └── ui-service.ts       # UI服务类
```

## 关键概念

### Geolocation API

- **watchPosition** - 持续监听位置变化
- **getCurrentPosition** - 获取当前位置
- **clearWatch** - 停止监听

### 位置数据结构

```typescript
interface GeolocationPosition {
  coords: {
    latitude: number;        // 纬度
    longitude: number;       // 经度
    accuracy: number;        // 精度（米）
    altitude: number | null; // 海拔（米）
    altitudeAccuracy: number | null; // 海拔精度
    heading: number | null;  // 方向（度）
    speed: number | null;    // 速度（米/秒）
  };
  timestamp: number;         // 时间戳
}
```

### 距离计算

- 使用 Turf.js 计算地理距离
- 支持 Haversine 公式计算球面距离
- 单位可配置（公里、米、英里等）

### 轨迹管理

- 轨迹记录包含元数据（名称、时间、距离）
- 轨迹点包含位置、精度、速度等信息
- 支持批量查询和导出

## 隐私和权限

1. **位置权限**
   - 首次使用需要用户授权
   - 可以在浏览器设置中撤销权限

2. **数据存储**
   - 所有数据存储在本地浏览器
   - 不会上传到服务器

3. **精度控制**
   - enableHighAccuracy 提供更高精度
   - 但会消耗更多电量

## 扩展建议

1. **增强功能**
   - 添加轨迹回放功能
   - 支持轨迹标注和照片
   - 实现轨迹编辑和优化

2. **数据分析**
   - 添加速度曲线图
   - 计算海拔变化
   - 生成运动报告

3. **社交功能**
   - 分享轨迹到社交媒体
   - 与朋友实时共享位置
   - 创建和加入活动

## 相关文档

- [第4章教程](../../README.md#第4章-离线地图与位置追踪)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Turf.js 文档](https://turfjs.org/)
- [Leaflet 文档](https://leafletjs.com/reference.html)
