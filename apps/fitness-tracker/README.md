# 第4章 示例3: 户外运动追踪器

本示例展示了如何使用 WebGeoDB 构建一个完整的户外运动追踪应用。

## 功能特性

- ✅ **运动记录** - 支持跑步、骑行、徒步、散步、滑雪等多种运动类型
- ✅ **实时追踪** - 实时记录运动轨迹、速度和距离
- ✅ **统计分析** - 计算平均速度、最大速度、卡路里消耗等
- ✅ **航点标记** - 在运动过程中标记重要地点
- ✅ **地图可视化** - 在地图上显示轨迹和航点
- ✅ **数据图表** - 使用 Chart.js 显示速度曲线
- ✅ **历史记录** - 保存和查看历史运动数据

## 技术要点

### 1. 运动类型配置

```typescript
const SPORT_CONFIGS = {
  running: {
    name: '跑步',
    icon: '🏃',
    color: '#FF5722',
    met: 9.8,  // 代谢当量
    unit: 'km'
  },
  // ... 其他运动类型
};
```

### 2. 卡路里计算

```typescript
// 卡路里 = MET × 体重(kg) × 时间(小时)
const calories = this.calculateCalories(duration);

private calculateCalories(duration: number): number {
  const weight = 70; // kg
  const hours = duration / 3600;
  return Math.round(this.sportConfig.met * weight * hours);
}
```

### 3. 航点管理

```typescript
// 添加航点
const waypoint = await tracker.addWaypoint(name);

// 保存到数据库
await db.waypoints.add({
  id: waypointId,
  workoutId: currentWorkoutId,
  name,
  geometry: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  timestamp: new Date()
});
```

### 4. 数据可视化

```typescript
// 使用 Chart.js 绘制速度曲线
const speedChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: '速度 (km/h)',
      data: [],
      borderColor: '#2196F3'
    }]
  }
});
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

应用将在 http://localhost:3003 启动

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 使用说明

1. **选择运动类型**
   - 从下拉菜单选择运动类型（跑步、骑行、徒步等）
   - 不同类型使用不同的颜色和卡路里计算

2. **开始运动**
   - 点击"开始"按钮
   - 允许浏览器访问位置信息
   - 应用开始记录运动数据

3. **标记航点**
   - 在运动过程中，输入航点名称
   - 点击"添加当前位置"按钮
   - 在列表中查看和管理航点

4. **暂停/继续**
   - 点击"暂停"按钮暂停记录
   - 再次点击继续记录

5. **停止运动**
   - 点击"停止"按钮结束运动
   - 自动保存运动记录
   - 查看运动统计和图表

6. **查看历史**
   - 在侧边栏底部查看历史运动记录
   - 点击记录查看详情

## 文件结构

```
03-fitness-tracker/
├── index.html              # HTML页面
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript配置
├── vite.config.ts          # Vite构建配置
└── src/
    ├── main.ts             # 主应用入口
    ├── fitness-tracker.ts  # 运动追踪器
    ├── map-controller.ts   # 地图控制器
    ├── chart-manager.ts    # 图表管理器
    ├── workout-manager.ts  # 运动管理器
    └── ui-service.ts       # UI服务类
```

## 关键概念

### MET (代谢当量)

MET (Metabolic Equivalent of Task) 是用于量化身体活动强度的指标：

- 静息状态：1 MET
- 散步：3.5 MET
- 跑步：9.8 MET
- 骑行：7.5 MET

卡路里计算公式：
```
卡路里 = MET × 体重(kg) × 时间(小时)
```

### 运动数据结构

```typescript
interface Workout {
  id: string;
  name: string;
  type: string;          // 运动类型
  startTime: Date;
  endTime: Date;
  distance: number;      // 距离（公里）
  duration: number;      // 时长（秒）
  avgSpeed: number;      // 平均速度
  maxSpeed: number;      // 最大速度
  calories: number;      // 卡路里消耗
}
```

### 数据管理

- **运动记录** (workouts) - 存储运动元数据
- **轨迹点** (trackPoints) - 存储详细轨迹数据
- **航点** (waypoints) - 存储标记的地点

## 扩展建议

1. **增强功能**
   - 连接心率计和速度传感器
   - 添加路线规划和导航
   - 支持间歇训练模式
   - 添加语音提醒

2. **数据分析**
   - 生成详细的运动报告
   - 显示海拔曲线图
   - 分析配速变化
   - 对比历史数据

3. **社交功能**
   - 分享运动路线到社交媒体
   - 创建和加入运动挑战
   - 与朋友实时共享位置

4. **健康集成**
   - 同步到 Apple Health / Google Fit
   - 设置运动目标和提醒
   - 生成健康周报

## 性能优化

1. **数据存储**
   - 批量写入轨迹点减少 I/O
   - 定期清理过期数据
   - 使用索引加速查询

2. **地图渲染**
   - 限制同时显示的轨迹点数量
   - 使用简化算法减少细节
   - 懒加载历史轨迹

3. **电池优化**
   - 降低位置更新频率
   - 使用后台同步 API
   - 暂停时停止位置追踪

## 相关文档

- [第4章教程](../../README.md#第4章-离线地图与位置追踪)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Turf.js 文档](https://turfjs.org/)
- [Chart.js 文档](https://www.chartjs.org/)
- [Leaflet 文档](https://leafletjs.com/reference.html)

## 常见问题

**Q: 为什么卡路里计算不准确？**

A: 卡路里计算使用简化的 MET 公式，实际消耗受年龄、性别、体重、心率等多种因素影响。如需精确计算，建议连接心率设备。

**Q: 如何提高定位精度？**

A: 在设置中启用高精度定位，确保设备 GPS 信号良好，避免在室内或高楼密集区域使用。

**Q: 数据会丢失吗？**

A: 所有数据存储在本地浏览器 IndexedDB 中，清除浏览器数据会丢失。建议定期导出重要数据备份。
