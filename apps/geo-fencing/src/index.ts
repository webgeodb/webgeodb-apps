/**
 * 电商地理围栏营销系统 - 演示示例
 *
 * 展示完整的围栏管理、规则配置和实时位置追踪功能
 */

import { GeoFencingApp, DEFAULT_CONFIG } from './app';
import { GeoFenceMap } from './components/map';
import type { GeoFence, MarketingRule, UserLocation } from './types';

// ============================================
// 演示类
// ============================================

class GeoFencingDemo {
  private app: GeoFencingApp;
  private map: GeoFenceMap;
  private currentUserId: string = 'user-demo-001';

  async init(): Promise<void> {
    console.log('=== 电商地理围栏营销系统演示 ===\n');

    // 1. 初始化应用
    console.log('步骤 1: 初始化应用...');
    this.app = new GeoFencingApp(DEFAULT_CONFIG);
    await this.app.init();

    // 2. 初始化地图
    console.log('步骤 2: 初始化地图...');
    this.map = new GeoFenceMap({
      container: 'map',
      editable: true,
      onFenceCreate: async (fence) => this.handleFenceCreate(fence),
      onFenceUpdate: async (fence) => this.handleFenceUpdate(fence),
      onFenceDelete: async (fenceId) => this.handleFenceDelete(fenceId)
    });

    // 3. 创建示例围栏
    console.log('\n步骤 3: 创建示例围栏...');
    await this.createSampleFences();

    // 4. 创建示例规则
    console.log('\n步骤 4: 创建示例规则...');
    await this.createSampleRules();

    // 5. 显示围栏
    console.log('\n步骤 5: 显示围栏...');
    const fences = await this.app.fences.getAllFences();
    this.map.displayFences(fences);
    this.map.fitAllFences();

    // 6. 模拟位置更新
    console.log('\n步骤 6: 模拟位置更新...');
    await this.simulateLocationUpdates();

    // 7. 生成热力图
    console.log('\n步骤 7: 生成热力图...');
    await this.generateAndShowHeatmap();

    // 8. 显示统计
    console.log('\n步骤 8: 显示统计数据...');
    await this.showStatistics();

    console.log('\n=== 演示完成 ===');
  }

  /**
   * 创建示例围栏
   */
  private async createSampleFences(): Promise<void> {
    // 商场围栏
    const mallFence: GeoFence = {
      id: 'fence-mall-001',
      name: '朝阳大悦城',
      description: '北京朝阳区大型购物中心',
      type: 'store',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [116.4830, 39.9210],
            [116.4870, 39.9210],
            [116.4870, 39.9250],
            [116.4830, 39.9250],
            [116.4830, 39.9210]
          ]
        ]
      },
      properties: {
        address: '北京市朝阳区朝阳北路101号',
        phone: '010-12345678',
        businessHours: '10:00-22:00'
      },
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 配送区域围栏
    const deliveryFence: GeoFence = {
      id: 'fence-delivery-001',
      name: '三环内配送区',
      description: '北京市三环内免费配送区域',
      type: 'delivery-zone',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [116.3800, 39.9000],
            [116.4400, 39.9000],
            [116.4400, 39.9500],
            [116.3800, 39.9500],
            [116.3800, 39.9000]
          ]
        ]
      },
      properties: {
        deliveryFee: 0,
        deliveryTime: '30分钟'
      },
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.app.fences.createFence(mallFence);
    await this.app.fences.createFence(deliveryFence);

    console.log('✅ 创建了 2 个示例围栏');
  }

  /**
   * 创建示例规则
   */
  private async createSampleRules(): Promise<void> {
    // 进入商场推送优惠券规则
    const enterRule = {
      id: 'rule-enter-001',
      name: '进店优惠券推送',
      description: '用户进入商场时推送8折优惠券',
      fenceId: 'fence-mall-001',
      trigger: 'enter' as const,
      action: {
        type: 'push-notification' as const,
        content: {
          title: '欢迎光临朝阳大悦城！',
          message: '您有一张8折优惠券，快来使用吧！',
          discountCode: 'MALL80OFF',
          discountAmount: 0.8,
          validUntil: Date.now() + 7 * 24 * 3600 * 1000
        },
        channel: 'mobile' as const
      },
      conditions: [
        {
          type: 'time' as const,
          operator: 'in' as const,
          value: [10, 11, 12, 14, 15, 16, 18, 19, 20]
        },
        {
          type: 'frequency' as const,
          operator: 'less-than' as const,
          value: { timeWindow: 86400000, maxCount: 3 }
        }
      ],
      priority: 10,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 离开配送区规则
    const exitRule = {
      id: 'rule-exit-001',
      name: '离开配送区提醒',
      description: '用户离开配送区时提醒配送服务',
      fenceId: 'fence-delivery-001',
      trigger: 'exit' as const,
      action: {
        type: 'in-app-message' as const,
        content: {
          title: '配送服务提醒',
          message: '您已离开免费配送区，下次订单将收取配送费'
        },
        channel: 'mobile' as const
      },
      conditions: [],
      priority: 5,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.app.rules.createRule(enterRule);
    await this.app.rules.createRule(exitRule);

    console.log('✅ 创建了 2 个示例规则');
  }

  /**
   * 模拟位置更新
   */
  private async simulateLocationUpdates(): Promise<void> {
    const locations: Array<[number, number]> = [
      [116.4850, 39.9230], // 商场内
      [116.4840, 39.9220], // 商场内
      [116.4200, 39.9200], // 配送区内
      [116.3700, 39.9100]  // 配送区外
    ];

    for (let i = 0; i < locations.length; i++) {
      const [lng, lat] = locations[i];

      const result = await this.app.tracking.handleLocationUpdate({
        userId: this.currentUserId,
        location: {
          type: 'Point',
          coordinates: [lng, lat],
          properties: { accuracy: 10 }
        },
        timestamp: Date.now() + i * 60000
      });

      console.log(`位置 ${i + 1}: [${lng.toFixed(4)}, ${lat.toFixed(4)}]`);
      console.log(`  在围栏内: ${result.insideFences.length} 个`);
      console.log(`  触发动作: ${result.triggeredActions.length} 个`);

      if (result.insideFences.length > 0) {
        result.insideFences.forEach(f => {
          console.log(`    - ${f.fenceName} (停留: ${Math.floor((f.dwellTime || 0) / 1000)}秒)`);
        });
      }
    }

    console.log('✅ 模拟了 4 次位置更新');
  }

  /**
   * 生成并显示热力图
   */
  private async generateAndShowHeatmap(): Promise<void> {
    const bbox: [number, number, number, number] = [
      116.38, 39.90, 116.49, 39.93
    ];

    const heatmapData = await this.app.analytics.generateHeatmap(
      bbox,
      0.005,
      Date.now() - 86400000,
      Date.now()
    );

    console.log(`✅ 生成了 ${heatmapData.length} 个热力图数据点`);

    if (heatmapData.length > 0) {
      this.map.displayHeatmap(heatmapData);
    }
  }

  /**
   * 显示统计信息
   */
  private async showStatistics(): Promise<void> {
    // 系统统计
    const systemStats = await this.app.getSystemStats();
    console.log('\n系统统计:');
    console.log(`  围栏总数: ${systemStats.totalFences}`);
    console.log(`  激活围栏: ${systemStats.activeFences}`);
    console.log(`  规则总数: ${systemStats.totalRules}`);
    console.log(`  激活规则: ${systemStats.activeRules}`);
    console.log(`  事件总数: ${systemStats.totalEvents}`);

    // 围栏统计
    const fences = await this.app.fences.getAllFences();
    for (const fence of fences) {
      const stats = await this.app.fences.getFenceStats(fence.id);
      console.log(`\n围栏 "${fence.name}" 统计:`);
      console.log(`  总事件: ${stats.totalEvents}`);
      console.log(`  独立用户: ${stats.uniqueUsers}`);
      console.log(`  平均停留: ${Math.floor(stats.avgDwellTime / 1000)}秒`);
      console.log(`  今日事件: ${stats.todayEvents}`);
    }
  }

  /**
   * 处理围栏创建
   */
  private async handleFenceCreate(fence: GeoFence): Promise<void> {
    console.log('\n创建新围栏:', fence.name);
    await this.app.fences.createFence(fence);
  }

  /**
   * 处理围栏更新
   */
  private async handleFenceUpdate(fence: GeoFence): Promise<void> {
    console.log('\n更新围栏:', fence.name);
    await this.app.fences.updateFence(fence.id, fence);
  }

  /**
   * 处理围栏删除
   */
  private async handleFenceDelete(fenceId: string): Promise<void> {
    console.log('\n删除围栏:', fenceId);
    await this.app.fences.deleteFence(fenceId);
  }
}

// ============================================
// 导出
// ============================================

export { GeoFencingDemo };
export type { GeoFence, MarketingRule, UserLocation };

// ============================================
// 如果在浏览器环境中运行
// ============================================

if (typeof window !== 'undefined') {
  (window as any).GeoFencingDemo = GeoFencingDemo;
  (window as any).startDemo = async function() {
    const demo = new GeoFencingDemo();
    await demo.init();
    return demo;
  };
}

// ============================================
// 如果在Node.js环境中运行
// ============================================

if (typeof process !== 'undefined' && require.main === module) {
  GeoFencingDemo.prototype.init.call(new GeoFencingDemo()).catch(console.error);
}
