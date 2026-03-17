# 地理围栏营销系统应用 (Geo-Fencing)

基于 WebGeoDB 的智能地理围栏营销系统，支持位置触发营销。

## ✨ 功能特性

- ✅ **围栏创建** - 创建圆形、多边形等多种形状的地理围栏
- ✅ **实时监控** - 实时监控用户进入/离开围栏
- ✅ **触发规则** - 设置进入/离开时的营销规则
- ✅ **用户分析** - 分析用户在围栏内的行为
- ✅ **营销统计** - 统计营销效果和转化率
- ✅ **批量管理** - 支持批量创建和管理围栏

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
- **Leaflet** - 地图渲染和绘制

## 📖 使用示例

### 初始化地理围栏系统

```typescript
import { WebGeoDB } from 'webgeodb-core';
import { GeoFenceService } from './services/geo-fence.service';
import { MarketingRuleEngine } from './services/marketing-rule-engine.service';

// 初始化数据库
const db = new WebGeoDB('geo-fencing', {
  stores: ['fences', 'users', 'events', 'rules']
});

// 创建围栏服务
const fenceService = new GeoFenceService(db);

// 创建营销规则引擎
const ruleEngine = new MarketingRuleEngine(db);
```

### 创建地理围栏

```typescript
// 创建圆形围栏
const circleFence = await fenceService.createFence({
  name: 'Store A - 1km Radius',
  type: 'circle',
  center: [116.404, 39.915],  // [lng, lat]
  radius: 1000,               // 1公里
  metadata: {
    storeId: 'store-a',
    category: 'retail'
  }
});

// 创建多边形围栏
const polygonFence = await fenceService.createFence({
  name: 'Downtown District',
  type: 'polygon',
  coordinates: [
    [116.400, 39.910],
    [116.410, 39.910],
    [116.410, 39.920],
    [116.400, 39.920],
    [116.400, 39.910]
  ]
});
```

### 设置营销规则

```typescript
// 创建进入围栏时的规则
await ruleEngine.createRule({
  name: 'Store A Welcome Offer',
  fenceId: circleFence.id,
  trigger: 'enter',
  actions: [
    {
      type: 'notification',
      title: '欢迎光临！',
      body: '凭此通知享受 8 折优惠',
      data: { discount: 20 }
    },
    {
      type: 'coupon',
      value: 'SAVE20',
      expiry: 3600  // 1小时后过期
    }
  ]
});
```

### 监控用户位置

```typescript
import { LocationTrackingService } from './services/location-tracking.service';

const trackingService = new LocationTrackingService(db, fenceService);

// 开始监控
trackingService.startMonitoring();

// 监听围栏事件
trackingService.on('enter', async (event) => {
  console.log(`用户进入 ${event.fence.name}`);
  
  // 执行营销规则
  await ruleEngine.execute(event.fence.id, event.userId);
});

trackingService.on('exit', (event) => {
  console.log(`用户离开 ${event.fence.name}`);
});
```

## 🌐 在线演示

部署后可访问：https://webgeodb.github.io/webgeodb-apps/apps/geo-fencing/

## 📂 项目结构

```
geo-fencing/
├── src/
│   ├── app.ts                                    # 应用入口
│   ├── components/
│   │   └── map.ts                                # 地图组件
│   ├── services/
│   │   ├── geo-fence.service.ts                  # 围栏服务
│   │   ├── location-tracking.service.ts          # 位置追踪服务
│   │   ├── marketing-rule-engine.service.ts      # 营销规则引擎
│   │   └── analytics.service.ts                  # 分析服务
│   └── types.ts                                  # 类型定义
├── index.html                                    # HTML 模板
├── vite.config.ts                                # Vite 配置
└── package.json                                  # 项目配置
```

## 📊 围栏类型

- **圆形** (Circle) - 基于中心点和半径
- **多边形** (Polygon) - 自定义边界
- **矩形** (Rectangle) - 简化矩形区域

## 📈 营销指标

- **触达人数** - 进入围栏的唯一用户数
- **转化率** - 触发营销后完成转化的比例
- **停留时间** - 用户在围栏内的平均停留时间
- **访问频次** - 用户进入围栏的次数

## 📝 开发注意事项

1. **定位精度** 建议设置合理的围栏大小缓冲
2. **电池优化** 避免过于频繁的位置更新
3. **隐私合规** 确保用户授权位置追踪

## 🔧 配置说明

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  base: '/webgeodb/apps/geo-fencing/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'webgeodb': ['webgeodb-core'],
          'leaflet': ['leaflet']
        }
      }
    }
  }
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
