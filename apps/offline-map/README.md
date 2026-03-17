# 第4章 示例1: 离线地图应用

本示例展示了如何使用 WebGeoDB 和 Service Worker 构建一个离线地图应用。

## 功能特性

- ✅ **Service Worker 离线支持** - 注册和管理 Service Worker 实现离线功能
- ✅ **地图瓦片下载** - 下载并缓存指定区域的地图瓦片
- ✅ **离线数据存储** - 使用 IndexedDB 存储离线地图数据
- ✅ **在线/离线检测** - 自动检测网络状态并切换模式
- ✅ **数据同步** - 在线时自动同步离线数据到服务器
- ✅ **Leaflet 集成** - 使用 Leaflet 地图库显示地图和数据

## 技术要点

### 1. Service Worker 配置

```typescript
// 注册 Service Worker
const registration = await navigator.serviceWorker.register(
  new URL('./service-worker.ts', import.meta.url),
  { type: 'module' }
);
```

### 2. 瓦片下载和存储

```typescript
// 下载指定区域的瓦片
const tileCount = await offlineManager.downloadTiles(
  bounds,
  minZoom,
  maxZoom,
  (progress) => console.log(`进度: ${progress}%`)
);
```

### 3. 离线数据查询

```typescript
// 查询离线POI数据
const features = await db.features.toArray();
```

### 4. 网络状态监听

```typescript
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
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

应用将在 http://localhost:3001 启动

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 使用说明

1. **下载离线地图**
   - 在地图上移动到需要离线的区域
   - 点击"下载当前区域"按钮
   - 等待瓦片和POI数据下载完成

2. **测试离线功能**
   - 断开网络连接或使用开发者工具的离线模式
   - 刷新页面，应用仍可正常使用
   - 查看已下载的离线数据

3. **同步数据**
   - 重新连接网络
   - 点击"同步到服务器"按钮
   - 等待数据同步完成

## 文件结构

```
01-offline-map/
├── index.html              # HTML页面
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript配置
├── vite.config.ts          # Vite构建配置
└── src/
    ├── main.ts             # 主应用入口
    ├── offline-map-manager.ts    # 离线地图管理器
    ├── service-worker.ts   # Service Worker
    └── ui-service.ts       # UI服务类
```

## 关键概念

### Service Worker 生命周期

1. **安装 (install)** - 预缓存核心资源
2. **激活 (activate)** - 清理旧缓存
3. **拦截 (fetch)** - 拦截网络请求，返回缓存或网络数据

### 离线策略

- **网络优先** - 优先尝试网络请求，失败时使用缓存
- **缓存优先** - 对于瓦片等静态资源，优先使用缓存
- **动态缓存** - 下载的瓦片自动缓存到本地

### 数据同步

- 记录数据同步状态 (`synced` 字段)
- 在线时批量上传未同步数据
- 使用乐观更新提升用户体验

## 扩展建议

1. **增强离线功能**
   - 支持多个离线区域管理
   - 实现瓦片预加载策略
   - 添加离线导航功能

2. **优化性能**
   - 使用 Web Worker 处理大量数据
   - 实现瓦片加载优先级队列
   - 添加数据压缩

3. **用户体验**
   - 添加离线地图管理界面
   - 显示下载速度和剩余时间
   - 支持增量更新

## 相关文档

- [第4章教程](../../README.md#第4章-离线地图与位置追踪)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Leaflet 文档](https://leafletjs.com/reference.html)
