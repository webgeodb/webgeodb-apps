# 实时位置追踪应用 (Location Tracking)

基于 WebGeoDB 的实时位置追踪应用，支持轨迹记录和回放。

## ✨ 功能特性

- ✅ **实时位置追踪** - 使用 Geolocation API 持续追踪用户位置
- ✅ **轨迹记录** - 将位置数据保存到 IndexedDB
- ✅ **轨迹回放** - 可视化回放历史轨迹
- ✅ **统计分析** - 计算总距离、平均速度等
- ✅ **地图可视化** - 在地图上实时显示位置和轨迹
- ✅ **导出功能** - 支持 GPX、JSON 格式导出

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

### 初始化位置追踪器

```typescript
import { WebGeoDB } from 'webgeodb-core';
import { LocationTracker } from './location-tracker';

// 初始化数据库
const db = new WebGeoDB('location-tracking', {
  stores: ['tracks', 'waypoints']
});

// 创建位置追踪器
const tracker = new LocationTracker(db, {
  minAccuracy: 50,      // 最小精度（米）
  updateInterval: 1000  // 更新间隔（毫秒）
});
```

### 开始追踪

```typescript
// 开始追踪
await tracker.startTracking('morning-run');

// 监听位置更新
tracker.on('location', (location) => {
  console.log(`纬度: ${location.latitude}, 经度: ${location.longitude}`);
  console.log(`精度: ${location.accuracy}米`);
  console.log(`速度: ${location.speed}m/s`);
});

// 停止追踪
await tracker.stopTracking();
```

### 查询历史轨迹

```typescript
// 查询所有轨迹
const tracks = await db.tracks.toArray();

// 查询特定日期的轨迹
const todayTracks = await db.tracks
  .where('timestamp')
  .above(today)
  .toArray();
```

## 🌐 在线演示

部署后可访问：https://webgeodb.github.io/webgeodb-apps/apps/location-tracking/

## 📂 项目结构

```
location-tracking/
├── src/
│   ├── main.ts                  # 应用入口
│   ├── location-tracker.ts      # 位置追踪器
│   ├── map-manager.ts           # 地图管理器
│   └── ui-service.ts            # UI 服务
├── index.html                   # HTML 模板
├── vite.config.ts               # Vite 配置
└── package.json                 # 项目配置
```

## 📝 开发注意事项

1. **位置权限** 需要用户授权才能访问位置信息
2. **电池消耗** 持续追踪会消耗较多电量
3. **隐私保护** 位置数据仅存储在本地

## 🔧 配置说明

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  base: '/webgeodb/apps/location-tracking/',
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
