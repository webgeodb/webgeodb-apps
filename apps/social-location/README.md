# 社交位置共享应用 (Social Location)

基于 WebGeoDB 的社交位置共享平台，注重隐私保护。

> ⚠️ **注意**: 此应用需要后端服务支持（Redis、WebSocket），当前版本仅作为架构示例。

## ✨ 功能特性

- ✅ **位置共享** - 与好友实时共享位置
- ✅ **隐私控制** - 精细化的隐私设置
- ✅ **地点推荐** - 基于位置的好友和地点推荐
- ✅ **附近的人** - 查找附近的朋友
- ✅ **签到功能** - 在地点签到并分享
- ✅ **消息推送** - 实时接收位置更新通知

## 🏗️ 架构说明

### 前端应用

- **WebGeoDB Core** - 空间数据库引擎
- **TypeScript** - 类型安全
- **Node.js** - 后端运行时

### 后端依赖

应用原本依赖以下后端服务：
- **Redis** - 缓存和实时数据
- **WebSocket** - 实时通信
- **Express** - HTTP 服务器

由于这些依赖尚未独立发布，当前应用无法直接构建运行。

## 🚀 快速开始（当前版本）

```bash
# 应用当前需要后端支持
# 此处仅作为架构示例展示

pnpm install
pnpm build  # ⚠️ 构建可能失败
```

## 📖 代码示例

### 位置服务

```typescript
import { LocationService } from './services/location.service';

// 位置服务需要后端支持
const locationService = new LocationService(db);

// 更新用户位置
await locationService.updateLocation(userId, {
  latitude: 39.915,
  longitude: 116.404,
  accuracy: 10
});

// 查找附近的好友
const nearbyFriends = await locationService.findNearbyFriends(
  userId,
  5000  // 5公里半径
);
```

### 推荐服务

```typescript
import { RecommendationService } from './services/recommendation.service';

const recommendationService = new RecommendationService(db);

// 推荐可能认识的人
const recommendations = await recommendationService.recommendPeople(
  userId,
  { limit: 20 }
);

// 推荐附近地点
const places = await recommendationService.recommendPlaces(
  userId,
  {
    latitude: 39.915,
    longitude: 116.404
  },
  { limit: 10 }
);
```

## 📂 项目结构

```
social-location/
├── src/
│   ├── index.ts                              # 应用入口
│   ├── services/
│   │   ├── location.service.ts               # 位置服务
│   │   ├── place.service.ts                  # 地点服务
│   │   ├── recommendation.service.ts         # 推荐服务
│   │   └── privacy.service.ts                # 隐私服务
│   └── utils/
│       └── helpers.ts                        # 辅助函数
├── demo/                                     # 演示文件
├── examples/                                 # 使用示例
├── jest.config.js                            # Jest 配置
└── package.json                              # 项目配置
```

## ⚠️ 已知问题

1. **缺少 @webgeodb/drivers** - 该包尚未发布到 npm
2. **后端依赖** - 需要 Redis、WebSocket 等后端服务
3. **类型错误** - 部分代码需要添加类型注解

## 🔧 后续计划

### 方案 A: 创建独立后端服务

将后端功能迁移到独立的仓库：

```
webgeodb-server/
├── src/
│   ├── server.ts          # Express 服务器
│   ├── redis/             # Redis 集成
│   ├── websocket/         # WebSocket 服务
│   └── api/               # REST API
└── package.json
```

### 方案 B: 简化为纯前端应用

移除后端依赖，改为纯前端示例：

- 移除 Redis 依赖，使用浏览器缓存
- 移除 WebSocket，使用轮询或 Web Workers
- 简化为数据展示和演示应用

### 方案 C: 集成到 webgeodb-core

将驱动功能直接集成到核心包中。

## 📝 代码审查要点

当前代码展示了以下设计模式：

1. **服务层架构** - 清晰的服务分层
2. **依赖注入** - 通过构造函数注入依赖
3. **空间查询** - 使用 WebGeoDB 的空间查询能力
4. **推荐算法** - 基于位置的推荐算法
5. **隐私保护** - 细粒度的隐私控制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

当前最需要的是：
- 确定后端架构方案
- 补充类型定义
- 添加单元测试

## 📄 许可证

MIT

## 🔗 相关链接

- [WebGeoDB 核心库](https://github.com/webgeodb/webgeodb)
- [WebGeoDB 文档](https://github.com/webgeodb/webgeodb/tree/main/docs)
- [npm 包](https://www.npmjs.com/package/webgeodb-core)

---

**状态**: ⚠️ 需要后端服务支持，当前仅作为架构示例

**更新**: 2026-03-17 - 移除不存在的 @webgeodb/drivers 依赖
