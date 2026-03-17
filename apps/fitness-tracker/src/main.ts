/**
 * WebGeoDB 教程示例
 *
 * 章节: 第4章 - 离线地图与位置追踪
 * 示例: 户外运动追踪器
 *
 * 学习目标:
 * 1. 记录运动轨迹和统计信息
 * 2. 计算距离、速度和卡路里消耗
 * 3. 标记和管理航点
 * 4. 生成运动报告和图表
 *
 * 前置要求:
 * - Node.js >= 16
 * - TypeScript >= 4.5
 * - 支持 Geolocation API 的浏览器
 */

import { WebGeoDB } from '@webgeodb/core';
import { FitnessTracker } from './fitness-tracker';
import { MapController } from './map-controller';
import { ChartManager } from './chart-manager';
import { WorkoutManager } from './workout-manager';
import { UIService } from './ui-service';

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-04-03-fitness-tracker',
  version: 1
};

// 运动类型配置
const SPORT_CONFIGS: Record<string, {
  name: string;
  icon: string;
  color: string;
  met: number; // 代谢当量
  unit: 'km' | 'mi';
}> = {
  running: { name: '跑步', icon: '🏃', color: '#FF5722', met: 9.8, unit: 'km' },
  cycling: { name: '骑行', icon: '🚴', color: '#2196F3', met: 7.5, unit: 'km' },
  hiking: { name: '徒步', icon: '🥾', color: '#4CAF50', met: 6.0, unit: 'km' },
  walking: { name: '散步', icon: '🚶', color: '#9C27B0', met: 3.5, unit: 'km' },
  skiing: { name: '滑雪', icon: '⛷️', color: '#00BCD4', met: 8.0, unit: 'km' }
};

// ============================================
// 主类
// ============================================

class FitnessTrackerApp {
  private db: WebGeoDB;
  private tracker: FitnessTracker;
  private mapController: MapController;
  private chartManager: ChartManager;
  private workoutManager: WorkoutManager;
  private uiService: UIService;
  private currentSportType = 'running';
  private isPaused = false;

  constructor() {
    this.db = new WebGeoDB(DB_CONFIG);
    this.tracker = new FitnessTracker(this.db);
    this.mapController = new MapController();
    this.chartManager = new ChartManager();
    this.workoutManager = new WorkoutManager(this.db);
    this.uiService = new UIService();
  }

  async init(): Promise<void> {
    console.log('=== 户外运动追踪器初始化 ===');

    // 初始化数据库
    await this.initDatabase();

    // 初始化地图
    this.mapController.init();

    // 初始化图表
    this.chartManager.init();

    // 设置事件监听
    this.setupEventListeners();

    // 加载历史记录
    await this.loadWorkoutHistory();

    console.log('✅ 应用初始化完成');
  }

  private async initDatabase(): Promise<void> {
    console.log('初始化数据库...');

    this.db.schema({
      workouts: {
        id: 'string',
        name: 'string',
        type: 'string',
        startTime: 'datetime',
        endTime: 'datetime',
        distance: 'number',
        duration: 'number',
        avgSpeed: 'number',
        maxSpeed: 'number',
        calories: 'number',
        properties: 'json'
      },
      trackPoints: {
        id: 'string',
        workoutId: 'string',
        geometry: 'geometry',
        timestamp: 'datetime',
        speed: 'number',
        heartRate: 'number',
        elevation: 'number',
        properties: 'json'
      },
      waypoints: {
        id: 'string',
        workoutId: 'string',
        name: 'string',
        geometry: 'geometry',
        timestamp: 'datetime',
        properties: 'json'
      }
    });

    await this.db.open();

    // 创建索引
    this.db.workouts.createIndex('startTime');
    this.db.trackPoints.createIndex('workoutId');
    this.db.waypoints.createIndex('workoutId');

    console.log('✅ 数据库初始化完成');
  }

  private setupEventListeners(): void {
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    const addWaypointBtn = document.getElementById('addWaypointBtn') as HTMLButtonElement;
    const sportTypeSelect = document.getElementById('sportType') as HTMLSelectElement;

    startBtn.addEventListener('click', () => this.startWorkout());
    pauseBtn.addEventListener('click', () => this.pauseWorkout());
    stopBtn.addEventListener('click', () => this.stopWorkout());
    addWaypointBtn.addEventListener('click', () => this.addWaypoint());

    sportTypeSelect.addEventListener('change', (e) => {
      this.currentSportType = (e.target as HTMLSelectElement).value;
      this.mapController.updateTrackColor(SPORT_CONFIGS[this.currentSportType].color);
    });
  }

  private async startWorkout(): Promise<void> {
    console.log('开始运动...');

    try {
      if (!navigator.geolocation) {
        throw new Error('您的浏览器不支持地理位置功能');
      }

      // 创建新的运动记录
      const sportConfig = SPORT_CONFIGS[this.currentSportType];
      await this.tracker.startWorkout(this.currentSportType, sportConfig);

      // 监听数据更新
      this.tracker.on('update', (data) => {
        this.handleWorkoutUpdate(data);
      });

      this.isPaused = false;
      this.uiService.updateWorkoutStatus(true, false);

    } catch (error) {
      console.error('开始运动失败:', error);
      alert('开始运动失败: ' + (error as Error).message);
    }
  }

  private async pauseWorkout(): Promise<void> {
    console.log('暂停运动...');

    if (this.isPaused) {
      // 恢复
      await this.tracker.resumeWorkout();
      this.isPaused = false;
      this.uiService.updateWorkoutStatus(true, false);
    } else {
      // 暂停
      await this.tracker.pauseWorkout();
      this.isPaused = true;
      this.uiService.updateWorkoutStatus(true, true);
    }
  }

  private async stopWorkout(): Promise<void> {
    console.log('停止运动...');

    try {
      const workout = await this.tracker.stopWorkout();

      if (workout) {
        console.log('运动完成:', workout);
        this.uiService.showToast(`运动完成！距离: ${workout.distance.toFixed(2)} km`);

        // 保存到历史记录
        await this.workoutManager.saveWorkout(workout);

        // 刷新历史列表
        await this.loadWorkoutHistory();
      }

    } catch (error) {
      console.error('停止运动失败:', error);
      alert('停止运动失败: ' + (error as Error).message);
    }
  }

  private async addWaypoint(): Promise<void> {
    const nameInput = document.getElementById('waypointName') as HTMLInputElement;
    const name = nameInput.value.trim() || `航点 ${Date.now()}`;

    try {
      const waypoint = await this.tracker.addWaypoint(name);

      if (waypoint) {
        this.mapController.addWaypointMarker(waypoint);
        this.uiService.addWaypointToList(waypoint);
        nameInput.value = '';
        this.uiService.showToast(`已添加航点: ${name}`);
      }

    } catch (error) {
      console.error('添加航点失败:', error);
      alert('添加航点失败: ' + (error as Error).message);
    }
  }

  private handleWorkoutUpdate(data: any): void {
    // 更新地图
    if (data.latitude && data.longitude) {
      this.mapController.updateCurrentPosition(data.latitude, data.longitude);
      this.mapController.addTrackPoint(data.latitude, data.longitude);
    }

    // 更新统计信息
    this.uiService.updateStats(data);

    // 更新图表
    if (data.speed !== undefined) {
      this.chartManager.addDataPoint(data.timestamp, data.speed);
    }
  }

  private async loadWorkoutHistory(): Promise<void> {
    console.log('加载运动历史...');

    try {
      const workouts = await this.workoutManager.getRecentWorkouts(10);
      this.uiService.renderWorkoutList(workouts);

      // 在地图上显示最近的轨迹
      if (workouts.length > 0) {
        const latestWorkout = workouts[0];
        const trackPoints = await this.workoutManager.getTrackPoints(latestWorkout.id!);

        if (trackPoints.length > 0) {
          const coordinates = trackPoints.map(p => {
            const coords = p.geometry.coordinates;
            return [coords[1], coords[0]] as [number, number];
          });

          const sportConfig = SPORT_CONFIGS[latestWorkout.type!];
          this.mapController.addHistoricalTrack(latestWorkout.name!, coordinates, sportConfig.color);
        }
      }
    } catch (error) {
      console.error('加载运动历史失败:', error);
    }
  }
}

// ============================================
// 初始化应用
// ============================================

const app = new FitnessTrackerApp();
app.init().catch((error) => {
  console.error('应用初始化失败:', error);
  alert('应用初始化失败: ' + error.message);
});

export { FitnessTrackerApp };
