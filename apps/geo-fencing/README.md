# 电商地理围栏营销系统

> 基于 WebGeoDB 的实时位置营销平台，提供完整的围栏管理、规则配置和营销自动化功能。

## 📋 项目概述

电商地理围栏营销系统是一个生产级的地理位置营销解决方案，帮助企业：

- 🎯 **精准定位**: 基于用户位置触发个性化营销活动
- 📊 **数据分析**: 实时追踪用户行为，生成热力图和统计报表
- 🚀 **营销自动化**: 配置灵活的规则引擎，自动执行营销动作
- 🗺️ **可视化**: 直观的地图界面，轻松管理地理围栏

## ✨ 核心功能

### 1. 地理围栏管理

- ✅ 创建、编辑、删除多边形围栏
- ✅ 支持多种围栏类型（商场、仓库、配送区等）
- ✅ 围栏激活/停用控制
- ✅ 地图可视化绘制和编辑

### 2. 实时位置追踪

- ✅ 检测用户进入/离开围栏事件
- ✅ 计算停留时间
- ✅ 支持多围栏同时检测
- ✅ 用户轨迹记录和回放

### 3. 营销规则引擎

- ✅ 灵活的规则配置（进入/离开/停留触发）
- ✅ 多种条件判断（时间、频率、用户分群等）
- ✅ 优先级控制
- ✅ 多渠道营销动作（推送、邮件、短信等）

### 4. 数据分析

- ✅ 围栏统计（用户数、事件数、停留时间）
- ✅ 热力图生成
- ✅ 用户行为分析
- ✅ 营销效果评估

## 🏗️ 技术架构

```
┌─────────────────────────────────────────┐
│         UI Layer (HTML + Leaflet)       │
├─────────────────────────────────────────┤
│         Application Layer               │
│  ┌──────────┬──────────┬──────────────┐ │
│  │ GeoFence │  Rules   │   Tracking   │ │
│  │ Service  │  Engine  │   Service    │ │
│  └──────────┴──────────┴──────────────┘ │
│  ┌──────────────────────────────────┐  │
│  │      Analytics Service           │  │
│  └──────────────────────────────────┘  │
├─────────────────────────────────────────┤
│         WebGeoDB (IndexedDB)            │
├─────────────────────────────────────────┤
│         Browser Storage                 │
└─────────────────────────────────────────┘
```

## 🚀 快速开始

### 安装依赖

```bash
cd /Users/zhangyuting/github/zhyt1985/webgeodb/examples/projects/geo-fencing
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000 查看演示。

### 构建生产版本

```bash
npm run build
```

## 📖 使用示例

### 初始化应用

```typescript
import { GeoFencingApp, DEFAULT_CONFIG } from './src/app';

// 创建应用实例
const app = new GeoFencingApp(DEFAULT_CONFIG);

// 初始化
await app.init();
```

### 创建地理围栏

```typescript
// 创建商场围栏
const fence = await app.fences.createFence({
  name: '朝阳大悦城',
  description: '北京朝阳区大型购物中心',
  type: 'store',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [116.4830, 39.9210],
      [116.4870, 39.9210],
      [116.4870, 39.9250],
      [116.4830, 39.9250],
      [116.4830, 39.9210]
    ]]
  },
  properties: {
    address: '北京市朝阳区朝阳北路101号',
    phone: '010-12345678'
  }
});
```

### 创建营销规则

```typescript
// 创建进入围栏推送优惠券规则
const rule = await app.rules.createRule({
  name: '进店优惠券推送',
  description: '用户进入商场时推送8折优惠券',
  fenceId: 'fence-mall-001',
  trigger: 'enter',
  action: {
    type: 'push-notification',
    content: {
      title: '欢迎光临！',
      message: '您有一张8折优惠券',
      discountCode: 'MALL80OFF'
    },
    channel: 'mobile'
  },
  conditions: [
    {
      type: 'time',
      operator: 'in',
      value: [10, 11, 12, 14, 15, 16, 18, 19, 20]
    }
  ],
  priority: 10
});
```

### 处理位置更新

```typescript
// 更新用户位置并检测围栏事件
const result = await app.tracking.handleLocationUpdate({
  userId: 'user-001',
  location: {
    type: 'Point',
    coordinates: [116.4850, 39.9230]
  },
  timestamp: Date.now()
});

console.log('在围栏内:', result.insideFences);
console.log('触发动作:', result.triggeredActions);
```

### 生成热力图

```typescript
// 生成指定区域的热力图数据
const heatmapData = await app.analytics.generateHeatmap(
  [116.38, 39.90, 116.49, 39.93], // bbox
  0.005, // 网格大小
  Date.now() - 86400000, // 开始时间
  Date.now() // 结束时间
);

// 在地图上显示
map.displayHeatmap(heatmapData);
```

## 📊 数据模型

### GeoFence（地理围栏）

```typescript
interface GeoFence {
  id: string;
  name: string;
  description?: string;
  type: 'store' | 'warehouse' | 'delivery-zone' | 'custom';
  geometry: Polygon;
  properties: Record<string, any>;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### MarketingRule（营销规则）

```typescript
interface MarketingRule {
  id: string;
  name: string;
  fenceId: string;
  trigger: 'enter' | 'exit' | 'dwell';
  dwellTime?: number;
  action: MarketingAction;
  conditions: RuleCondition[];
  priority: number;
  active: boolean;
}
```

### FenceEvent（围栏事件）

```typescript
interface FenceEvent {
  id: string;
  fenceId: string;
  userId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  timestamp: number;
  location: Point;
  triggeredRules: string[];
}
```

## 🧪 测试

```bash
# 运行测试
npm test

# 测试覆盖率
npm run coverage

# UI测试模式
npm run test:ui
```

## 📚 项目结构

```
geo-fencing/
├── public/
│   └── index.html          # 演示页面
├── src/
│   ├── app.ts              # 主应用类
│   ├── index.ts            # 入口文件和演示
│   ├── types.ts            # TypeScript类型定义
│   ├── components/
│   │   └── map.ts          # Leaflet地图组件
│   └── services/
│       ├── geo-fence.service.ts
│       ├── marketing-rule-engine.service.ts
│       ├── location-tracking.service.ts
│       └── analytics.service.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎯 应用场景

### 1. 零售商场

- ✅ 用户进店推送优惠券
- ✅ 停留时间分析与营销
- ✅ 竞品门店围栏对比

### 2. 配送服务

- ✅ 配送区域自动检测
- ✅ 离开服务区提醒
- ✅ 配送费用动态计算

### 3. O2O平台

- ✅ 服务范围管理
- ✅ 商家推荐（基于位置）
- ✅ 用户行为分析

### 4. 智慧营销

- ✅ 位置定向广告
- � 附近用户群发
- ✅ 营销效果追踪

## 🔧 配置选项

```typescript
interface GeoFencingConfig {
  dbName: string;              // 数据库名称
  dbVersion: number;           // 数据库版本
  checkInterval: number;       // 位置检查间隔（毫秒）
  maxDwellTime: number;        // 最大停留时间（毫秒）
  enableRealtime: boolean;     // 启用实时追踪
  enableHeatmap: boolean;      // 启用热力图
  mapConfig: {
    defaultCenter: [number, number];
    defaultZoom: number;
    minZoom: number;
    maxZoom: number;
  };
}
```

## 📈 性能优化

- ✅ 空间索引加速查询
- ✅ 批量操作减少IO
- ✅ 数据分页和限制
- ✅ 定期清理过期数据

## 🛠️ 开发指南

### 添加新的规则条件类型

在 `MarketingRuleEngine` 类中扩展 `checkCondition` 方法：

```typescript
private async checkCondition(
  condition: RuleCondition,
  event: FenceEvent
): Promise<boolean> {
  switch (condition.type) {
    case 'your-custom-type':
      return this.checkCustomCondition(condition, event);
    // ...
  }
}
```

### 添加新的营销动作类型

扩展 `MarketingAction` 类型并在规则引擎中处理。

### 自定义地图样式

修改 `GeoFenceMap` 类中的 `getFenceStyle` 方法。

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

- 项目地址: https://github.com/zhyt1985/webgeodb
- 文档: https://webgeodb.dev

---

**Built with ❤️ using WebGeoDB**
