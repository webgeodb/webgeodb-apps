# 快速启动指南

## 5分钟上手社交位置分享应用

### 前置要求

- Node.js 18+
- WebGeoDB 实例
- Redis (可选，用于缓存)

### 安装步骤

1. **安装依赖**
```bash
cd examples/projects/social-location
npm install
```

2. **配置环境**
```bash
cp .env.example .env
# 编辑 .env 文件，设置数据库连接
```

3. **初始化数据库**
```bash
npm run dev
# 或使用 ts-node 直接运行示例
npx ts-node examples/usage.ts
```

### 快速示例

```typescript
import { SocialLocationApp } from './src/index';

// 初始化应用
const app = new SocialLocationApp({
  webgeodbUrl: 'webgeodb://localhost:27017/social_location'
});

await app.initialize();

// 更新位置
const locationService = app.getLocationService();
await locationService.updateLocation('user1', {
  latitude: 39.9042,
  longitude: 116.4074
});

// 查找附近用户
const nearby = await locationService.findNearbyUsers(
  { latitude: 39.9042, longitude: 116.4074 },
  5000
);

console.log(`找到 ${nearby.length} 个附近用户`);
```

### 运行测试

```bash
npm test
```

### 查看演示页面

在浏览器中打开 `demo/index.html` 查看交互式演示。

### 下一步

- 阅读完整文档: `/docs/tutorials/zh/projects/social-location.md`
- 查看更多示例: `/examples/projects/social-location/examples/`
- 了解 API 参考: `/docs/api/`

### 常见问题

**Q: 如何部署到生产环境？**
A: 使用 Docker 部署，参考 README.md 中的部署章节。

**Q: 如何扩展功能？**
A: 参考源代码，基于现有的服务架构进行扩展。

**Q: 性能优化建议？**
A: 启用 Redis 缓存，使用批量查询，创建合适的索引。

## 联系方式

- GitHub: https://github.com/webgeodb/webgeodb
- 文档: https://docs.webgeodb.io
- 问题反馈: https://github.com/webgeodb/webgeodb/issues
