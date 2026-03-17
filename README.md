# WebGeoDB Apps

WebGeoDB 完整应用集合，包含 6 个独立的 Vite 应用。

## 应用列表

### 1. offline-map - 离线地图 PWA
- 路径：`apps/offline-map/`
- 功能：PWA 离线地图、Service Worker 缓存
- 技术：Vite + Leaflet

### 2. location-tracking - 实时位置追踪
- 路径：`apps/location-tracking/`
- 功能：Geolocation API、轨迹回放
- 技术：Vite + Leaflet

### 3. fitness-tracker - 运动追踪器
- 路径：`apps/fitness-tracker/`
- 功能：运动轨迹、速度计算
- 技术：Vite + Leaflet

### 4. geo-fencing - 地理围栏营销系统
- 路径：`apps/geo-fencing/`
- 功能：地理围栏、实时位置检测
- 技术：Vite + 自定义地图

### 5. environmental - 环境监测平台
- 路径：`apps/environmental/`
- 功能：空气质量监测、时空数据
- 技术：Vite + 数据可视化

### 6. social-location - 社交位置共享
- 路径：`apps/social-location/`
- 功能：隐私保护的位置社交
- 技术：Vite + 社交功能

## 本地运行

### 安装依赖
```bash
pnpm install
```

### 运行单个应用
```bash
# 开发模式
pnpm --filter offline-map dev
pnpm --filter location-tracking dev
pnpm --filter fitness-tracker dev
pnpm --filter geo-fencing dev
pnpm --filter environmental dev
pnpm --filter social-location dev

# 构建预览
pnpm --filter offline-map preview
```

### 构建所有应用
```bash
pnpm build
```

## 依赖关系

所有应用依赖 `@webgeodb/core` npm 包：

```json
{
  "dependencies": {
    "@webgeodb/core": "latest"
  }
}
```

## 技术栈

- **构建工具**：Vite 5.x
- **包管理**：pnpm + workspace
- **任务管理**：Turbopipe
- **地图库**：Leaflet 1.9.x
- **空间计算**：Turf.js 6.5.x

## 开发指南

### 添加新应用

1. 在 `apps/` 下创建新目录
2. 初始化 Vite 项目
3. 更新 `pnpm-workspace.yaml`
4. 添加依赖到 `package.json`

### 共享代码

将共享的类型定义、工具函数等放在 `shared/` 目录下。

## 部署

每个应用可以独立部署到 GitHub Pages、Vercel、Netlify 等平台。

## 许可证

MIT
