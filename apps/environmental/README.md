# 环境监测数据平台示例

> Environmental Monitoring Data Platform - WebGeoDB 实战项目

## 项目简介

这是一个基于 WebGeoDB 的环境监测数据平台示例，展示了如何使用 WebGeoDB 处理三维时空数据（经度、纬度、时间），并进行空间插值、等值线生成和动态可视化。

## 核心功能

### 1. 时空数据存储
- 高效管理监测点的时间序列数据
- R-tree + 时间轴复合索引
- 支持时空范围查询

### 2. 空间插值分析
- **IDW (反距离权重)**: 简单高效的插值方法
- **Kriging (克里金)**: 考虑空间相关性的高级插值
- **Spline (样条)**: 平滑插值方法
- **Natural Neighbor (自然邻域)**: 基于邻域的插值

### 3. 等值线生成
- Marching Squares 算法
- 支持平滑处理
- 自动标注

### 4. 动态可视化
- 实时热力图
- 时间序列动画
- 监测站点叠加
- 图例和交互提示

### 5. 数据查询和导出
- 按站点查询
- 按区域查询
- 按时间范围查询
- 多种导出格式（JSON、CSV、GeoJSON）

## 项目结构

```
environmental-monitoring/
├── src/
│   ├── monitor.ts           # 核心监测类
│   ├── interpolation.ts     # 插值算法实现
│   ├── contours.ts          # 等值线生成
│   └── visualizer.ts        # 可视化组件
├── demo.html                # 交互式演示页面
├── README.md                # 本文件
└── package.json             # 项目配置
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行演示

```bash
# 启动开发服务器
npm run dev

# 或直接在浏览器中打开 demo.html
open demo.html
```

### 运行测试

```bash
npm test
```

## 使用示例

### 基本使用

```typescript
import { AirQualityMonitor } from './src/monitor';

// 创建监测器实例
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const monitor = new AirQualityMonitor(canvas);

// 初始化监测站点
await monitor.initializeStations();

// 采集实时数据
await monitor.collectRealtimeData();

// 生成 PM2.5 分布图
await monitor.generatePM25Distribution();

// 播放时间序列动画
await monitor.playTimeSeriesAnimation(
  startTime,
  endTime,
  3600000 // 1小时间隔
);
```

### 自定义插值

```typescript
import { IDWInterpolator } from './src/interpolation';

// 创建插值器
const interpolator = new IDWInterpolator();

// 准备数据点
const points = [
  { x: 116.4074, y: 39.9042, value: 75 },
  { x: 116.4374, y: 39.9142, value: 120 },
  { x: 116.3874, y: 39.8942, value: 45 }
];

// 在目标点进行插值
const result = interpolator.interpolate(
  { x: 116.42, y: 39.91 },
  { power: 2 } // 幂参数
);

console.log(`插值结果: ${result}`);
```

### 生成等值线

```typescript
import { ContourGenerator } from './src/contours';

// 创建等值线生成器
const generator = new ContourGenerator();

// 生成等值线
const contours = generator.generateContours(
  grid,           // 2D 数组
  [35, 75, 115, 150, 250], // 等值线级别
  { smoothing: 0.3 } // 选项
);

// 渲染等值线
contours.forEach(contour => {
  console.log(`级别 ${contour.level} 有 ${contour.paths.length} 条等值线`);
});
```

## API 文档

### EnvironmentalMonitor

核心监测类，提供完整的环境监测功能。

#### 方法

- `addStation(station)`: 添加监测站点
- `saveMonitoringData(data)`: 保存监测数据
- `querySpatiotemporalData(bounds, startTime, endTime)`: 查询时空数据
- `getActiveStations()`: 获取活跃站点
- `getLatestData(bounds)`: 获取最新数据

### IDWInterpolator

反距离权重插值器。

#### 方法

- `interpolate(targetPoint, options)`: 单点插值
- `generateGrid(bounds, resolution, options)`: 生成网格插值
- `calculateCrossValidationError(options)`: 交叉验证
- `optimizePower(min, max, step)`: 优化幂参数

### ContourGenerator

等值线生成器。

#### 方法

- `generateContours(grid, levels, options)`: 生成等值线

### HeatmapVisualizer

热力图可视化器。

#### 方法

- `renderHeatmap(grid, bounds, colorScale)`: 渲染热力图
- `playAnimation(frames, bounds, colorScale, fps)`: 播放动画
- `drawStations(data, bounds)`: 绘制监测站点
- `createColorScale(min, max, colors)`: 创建颜色标尺

## 数据模型

### MonitoringStation

监测站点数据结构。

```typescript
interface MonitoringStation {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  stationType: 'air' | 'water' | 'noise' | 'temperature';
  status: 'active' | 'inactive' | 'maintenance';
  metadata: {
    installationDate: string;
    operator: string;
    region: string;
  };
}
```

### MonitoringData

时间序列监测数据。

```typescript
interface MonitoringData {
  stationId: string;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
  };
  measurements: {
    [key: string]: number; // 指标名 -> 值
  };
  quality: 'good' | 'fair' | 'poor';
}
```

## 插值算法对比

| 算法 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| IDW | 简单快速，易于理解 | 受异常值影响大 | 数据点分布均匀 |
| Kriging | 考虑空间相关性，精度高 | 计算复杂，参数调整难 | 空间自相关数据 |
| Spline | 结果平滑美观 | 可能出现过拟合 | 需要平滑表面的场景 |
| Natural Neighbor | 自适应邻域，结果稳定 | 计算量大 | 不规则分布数据 |

## 性能优化建议

### 1. 数据分区

按时间或空间分区存储数据：

```typescript
// 按月份分区
const partitionKey = `monitoring_data_${year}_${month}`;

// 按空间分区
const latZone = Math.floor(latitude / 0.1);
const lonZone = Math.floor(longitude / 0.1);
const partitionKey = `monitoring_data_${latZone}_${lonZone}`;
```

### 2. 插值优化

- 使用 KD 树加速邻近点查找
- 限制搜索半径和点数
- 并行计算网格插值

### 3. 缓存策略

- 缓存插值结果（设置 TTL）
- 缓存查询结果
- 使用 IndexedDB 持久化缓存

## 扩展功能

### 1. 实时预警

```typescript
class AlertSystem {
  setupAlerts(metric, thresholds) {
    // 监听数据变化
    this.db.on('dataInserted', async (data) => {
      const value = data.measurements[metric];

      if (value >= thresholds.critical) {
        await this.sendCriticalAlert(data, metric, value);
      }
    });
  }
}
```

### 2. 趋势预测

```typescript
class TrendPredictor {
  async predictMovingAverage(stationId, metric, windowSize, steps) {
    // 移动平均预测
    const historicalData = await this.queryService.queryByStation(
      stationId,
      Date.now() - windowSize * 3600000,
      Date.now()
    );

    // 计算预测值
    const predictions = [];
    // ... 预测逻辑

    return predictions;
  }
}
```

### 3. 数据质量评估

```typescript
class DataQualityAssessor {
  async assessQuality(stationId) {
    // 评估完整性
    const completeness = this.checkCompleteness(data);

    // 评估一致性
    const consistency = this.checkConsistency(data);

    // 评估有效性
    const validity = this.checkValidity(data);

    return {
      completeness,
      consistency,
      validity,
      overall: (completeness + consistency + validity) / 3
    };
  }
}
```

## 应用场景

### 1. 空气质量监测

- PM2.5、PM10、AQI 实时监测
- 污染源追踪
- 空气质量预报

### 2. 水质监测

- pH值、溶解氧、浊度监测
- 水质等级评估
- 污染扩散分析

### 3. 噪声监测

- 城市噪声地图
- 噪声源识别
- 噪声影响评估

### 4. 温度监测

- 城市热岛效应分析
- 气温分布图
- 温度变化趋势

## 技术亮点

- ✅ **高效的时空索引**: R-tree + 时间轴复合索引
- ✅ **多种插值算法**: IDW、Kriging、Spline、Natural Neighbor
- ✅ **等值线生成**: Marching Squares 算法
- ✅ **动态可视化**: 实时热力图、时间序列动画
- ✅ **灵活的查询**: 站点、区域、时间范围查询
- ✅ **数据导出**: 多种格式导出支持

## 常见问题

### Q: 如何选择合适的插值算法？

A:
- **IDW**: 数据点分布均匀，计算速度要求高
- **Kriging**: 需要考虑空间相关性，精度要求高
- **Spline**: 需要平滑表面，可视化效果好
- **Natural Neighbor**: 数据点不规则分布，结果稳定性要求高

### Q: 如何提高插值性能？

A:
1. 使用 KD 树或空间索引加速邻近点查找
2. 限制搜索半径和最大点数
3. 降低网格分辨率
4. 使用 Web Worker 并行计算
5. 启用结果缓存

### Q: 如何处理大量监测数据？

A:
1. 按时间或空间分区存储
2. 使用数据压缩（Delta 编码、Gorilla 压缩）
3. 实现数据聚合和降采样
4. 定期清理过期数据

### Q: 如何实现实时预警？

A:
1. 监听数据库数据插入事件
2. 设置预警阈值
3. 超过阈值时触发告警
4. 支持多种通知方式（邮件、短信、推送）

## 相关文档

- [WebGeoDB 核心文档](https://webgeodb.org)
- [中文教程](../../docs/tutorials/zh/)
- [英文教程](../../docs/tutorials/en/)
- [API 参考](../../docs/api/)
- [更多示例](../../examples/)

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- 项目主页: https://webgeodb.org
- GitHub: https://github.com/webgeodb/webgeodb
- Email: support@webgeodb.org
