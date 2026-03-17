# 环境监测平台应用 (Environmental Monitoring)

基于 WebGeoDB 的环境数据监测和可视化平台。

## ✨ 功能特性

- ✅ **多源数据采集** - 支持手动输入、API 导入、传感器数据
- ✅ **空间插值** - 使用 IDW、克里金等算法生成等值线
- ✅ **实时监测** - 实时显示环境数据变化
- ✅ **可视化展示** - 热力图、等值线、三维渲染
- ✅ **历史查询** - 按时间、空间查询历史数据
- ✅ **数据导出** - 支持多种格式导出

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 运行开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:5173 启动

### 构建生产版本

```bash
pnpm build
```

### 预览生产构建

```bash
pnpm preview
```

## 📦 安装核心库

```bash
pnpm add webgeodb-core@beta
```

## 💻 技术栈

- **WebGeoDB Core** - 空间数据库引擎
- **Vite** - 构建工具
- **TypeScript** - 类型安全
- **Leaflet** - 地图渲染

## 📖 使用示例

### 初始化监测平台

```typescript
import { WebGeoDB } from 'webgeodb-core';
import { EnvironmentalMonitor } from './monitor';

// 初始化数据库
const db = new WebGeoDB('environmental-monitoring', {
  stores: ['sensors', 'readings', 'interpolations']
});

// 创建监测器
const monitor = new EnvironmentalMonitor(db, {
  interpolation: {
    method: 'idw',      // 反距离加权
    power: 2,           // 幂次
    maxDistance: 10000  // 最大距离（米）
  }
});
```

### 添加监测点

```typescript
// 添加传感器
await monitor.addSensor({
  id: 'sensor-001',
  name: 'PM2.5 监测站 #1',
  location: {
    type: 'Point',
    coordinates: [116.404, 39.915]  // [lng, lat]
  },
  parameters: ['pm25', 'pm10', 'temperature', 'humidity']
});
```

### 记录观测数据

```typescript
// 记录观测数据
await monitor.recordReading({
  sensorId: 'sensor-001',
  timestamp: Date.now(),
  values: {
    pm25: 35.5,
    pm10: 58.2,
    temperature: 22.3,
    humidity: 65.4
  }
});
```

### 空间插值

```typescript
// 获取监测区域
const bbox = {
  minLng: 116.350,
  minLat: 39.880,
  maxLng: 116.460,
  maxLat: 39.950
};

// 执行空间插值
const grid = await monitor.interpolate('pm25', {
  bbox,
  resolution: 0.001  // 网格分辨率（度）
});

// 生成等值线
const contours = monitor.generateContours(grid, {
  interval: 10,  // 等值线间隔
  smoothing: true
});
```

### 查询历史数据

```typescript
// 查询特定区域的数据
const readings = await db.readings
  .where('location')
  .within([bbox])  // GeoJSON 格式的边界框
  .and(r => r.timestamp >= startTime && r.timestamp <= endTime)
  .toArray();
```

## 🌐 在线演示

部署后可访问：https://webgeodb.github.io/webgeodb-apps/apps/environmental/

## 📂 项目结构

```
environmental/
├── src/
│   ├── monitor.ts              # 环境监测器
│   ├── interpolation.ts        # 插值算法
│   └── contours.ts             # 等值线生成
├── demo.html                   # 演示页面
├── vite.config.ts              # Vite 配置
└── package.json                # 项目配置
```

## 📊 支持的环境参数

- **PM2.5** - 细颗粒物
- **PM10** - 可吸入颗粒物
- **温度** (Temperature)
- **湿度** (Humidity)
- **噪声** (Noise Level)
- **其他自定义参数**

## 🔬 插值算法

- **IDW** (Inverse Distance Weighting) - 反距离加权
- **Kriging** - 克里金插值
- **Spline** - 样条插值
- **Natural Neighbor** - 自然邻域插值

## 📝 开发注意事项

1. **数据质量** 插值结果取决于监测点的分布和数据质量
2. **计算性能** 大范围高分辨率插值可能较慢
3. **边界效应** 插值在边界处可能不准确

## 🔧 配置说明

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  base: '/webgeodb/apps/environmental/',
  // ... 其他配置
});
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

## 🔗 相关链接

- [WebGeoDB 核心库](https://github.com/webgeodb/webgeodb)
- [WebGeoDB 文档](https://github.com/webgeodb/webgeodb/tree/main/docs)
- [npm 包](https://www.npmjs.com/package/webgeodb-core)
