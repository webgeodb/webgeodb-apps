# 离线地图应用 (Offline Map)

基于 WebGeoDB 的离线地图 PWA 应用，支持地图瓦片下载和离线访问。

## ✨ 功能特性

- ✅ **Service Worker 离线支持** - 注册和管理 Service Worker 实现离线功能
- ✅ **地图瓦片下载** - 下载并缓存指定区域的地图瓦片
- ✅ **离线数据存储** - 使用 IndexedDB 存储离线地图数据
- ✅ **在线/离线检测** - 自动检测网络状态并切换模式
- ✅ **数据同步** - 在线时自动同步离线数据到服务器
- ✅ **Leaflet 集成** - 使用 Leaflet 地图库显示地图和数据

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

构建产物在 `dist/` 目录

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
- **PWA** - 渐进式 Web 应用

## 📖 使用示例

### 初始化离线地图管理器

```typescript
import { WebGeoDB } from 'webgeodb-core';
import { OfflineMapManager } from './offline-map-manager';

// 初始化数据库
const db = new WebGeoDB('offline-maps', {
  stores: ['tiles', 'features']
});

// 创建离线地图管理器
const offlineManager = new OfflineMapManager(db, {
  minZoom: 10,
  maxZoom: 16,
  tileSize: 256
});
```

### 下载地图瓦片

```typescript
// 下载指定区域的瓦片
const result = await offlineManager.downloadTiles(
  centerCoords,  // 中心点 [lng, lat]
  zoomLevels,    // 缩放级别 [10, 11, 12, 13, 14, 15, 16]
  radius         // 半径（公里）
);

console.log(`下载了 ${result.tilesDownloaded} 个瓦片`);
```

## 🌐 在线演示

部署后可访问：https://webgeodb.github.io/webgeodb-apps/apps/offline-map/

## 📂 项目结构

```
offline-map/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── offline-map-manager.ts     # 离线地图管理器
│   ├── ui-service.ts              # UI 服务
│   └── service-worker.ts          # Service Worker
├── index.html                     # HTML 模板
├── vite.config.ts                 # Vite 配置
└── package.json                   # 项目配置
```

## 🔧 配置说明

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  base: '/webgeodb/apps/offline-map/',
  // ... 其他配置
});
```

## 📝 开发注意事项

1. **Service Worker** 需要 HTTPS 环境（localhost 除外）
2. **瓦片缓存** 会占用大量存储空间，建议设置合理的缓存限制
3. **离线模式** 下只能访问已缓存的区域

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

## 🔗 相关链接

- [WebGeoDB 核心库](https://github.com/webgeodb/webgeodb)
- [WebGeoDB 文档](https://github.com/webgeodb/webgeodb/tree/main/docs)
- [npm 包](https://www.npmjs.com/package/webgeodb-core)
