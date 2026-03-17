# 运动追踪器应用 (Fitness Tracker)

基于 WebGeoDB 的运动追踪应用，支持多种运动类型的轨迹记录和分析。

## ✨ 功能特性

- ✅ **多种运动类型** - 支持跑步、骑行、徒步等多种运动
- ✅ **实时数据** - 实时显示距离、速度、配速、卡路里等
- ✅ **轨迹可视化** - 在地图上显示运动轨迹
- ✅ **历史记录** - 查看和分析历史运动记录
- ✅ **图表统计** - 可视化展示运动数据趋势
- ✅ **数据导出** - 支持导出 GPX、TCX、JSON 格式

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
- **Chart.js** - 图表可视化

## 📖 使用示例

### 初始化运动追踪器

```typescript
import { WebGeoDB } from 'webgeodb-core';
import { FitnessTracker } from './fitness-tracker';

// 初始化数据库
const db = new WebGeoDB('fitness-tracker', {
  stores: ['workouts', 'routes', 'stats']
});

// 创建运动追踪器
const tracker = new FitnessTracker(db, {
  autoPause: true,      // 自动暂停
  voiceFeedback: true   // 语音反馈
});
```

### 开始运动

```typescript
// 开始跑步
const workout = await tracker.startWorkout({
  type: 'running',
  name: 'Morning Run'
});

// 监听实时数据
tracker.on('data', (data) => {
  console.log(`距离: ${data.distance}km`);
  console.log(`配速: ${data.pace}/km`);
  console.log(`卡路里: ${data.calories}kcal`);
});

// 完成运动
await tracker.finishWorkout();
```

### 查询运动记录

```typescript
// 获取所有运动记录
const workouts = await db.workouts.toArray();

// 查询本周运动记录
const thisWeek = await db.workouts
  .where('startTime')
  .above(startOfWeek)
  .toArray();

// 统计总距离
const totalDistance = thisWeek.reduce(
  (sum, w) => sum + w.distance, 
  0
);
```

## 🌐 在线演示

部署后可访问：https://webgeodb.github.io/webgeodb-apps/apps/fitness-tracker/

## 📂 项目结构

```
fitness-tracker/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── fitness-tracker.ts         # 运动追踪器
│   ├── workout-manager.ts         # 运动管理器
│   ├── map-controller.ts          # 地图控制器
│   ├── chart-manager.ts           # 图表管理器
│   └── ui-service.ts              # UI 服务
├── index.html                     # HTML 模板
├── vite.config.ts                 # Vite 配置
└── package.json                   # 项目配置
```

## 📊 运动类型

- 🏃 **跑步** (running)
- 🚴 **骑行** (cycling)
- 🥾 **徒步** (hiking)
- 🏊 **游泳** (swimming)
- ⛷️ **滑雪** (skiing)
- 其他自定义运动类型

## 📝 开发注意事项

1. **传感器数据** 需要设备支持 GPS 传感器
2. **后台运行** 移动设备可能限制后台定位
3. **数据精度** 受 GPS 信号质量影响

## 🔧 配置说明

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  base: '/webgeodb/apps/fitness-tracker/',
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
