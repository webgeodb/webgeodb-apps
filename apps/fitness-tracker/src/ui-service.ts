/**
 * UI服务类
 *
 * 负责更新用户界面
 */

import { Workout } from './workout-manager';

// 运动类型配置
const SPORT_TYPES: Record<string, { name: string; icon: string; color: string }> = {
  running: { name: '跑步', icon: '🏃', color: '#FF5722' },
  cycling: { name: '骑行', icon: '🚴', color: '#2196F3' },
  hiking: { name: '徒步', icon: '🥾', color: '#4CAF50' },
  walking: { name: '散步', icon: '🚶', color: '#9C27B0' },
  skiing: { name: '滑雪', icon: '⛷️', color: '#00BCD4' }
};

export class UIService {
  private waypoints: any[] = [];

  /**
   * 更新运动状态
   */
  updateWorkoutStatus(isActive: boolean, isPaused: boolean): void {
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    const statusBadge = document.getElementById('statusBadge') as HTMLDivElement;
    const sportTypeSelect = document.getElementById('sportType') as HTMLSelectElement;

    if (startBtn) startBtn.disabled = isActive;
    if (stopBtn) stopBtn.disabled = !isActive;
    if (sportTypeSelect) sportTypeSelect.disabled = isActive;

    if (pauseBtn) {
      pauseBtn.disabled = !isActive;
      pauseBtn.textContent = isPaused ? '继续' : '暂停';
    }

    if (statusBadge) {
      if (isActive) {
        statusBadge.className = 'status-badge ' + (isPaused ? 'active' : 'active');
        statusBadge.textContent = isPaused ? '已暂停' : '进行中';
        statusBadge.style.background = isPaused ? '#FFC107' : '#4CAF50';
      } else {
        statusBadge.className = 'status-badge inactive';
        statusBadge.textContent = '未开始';
        statusBadge.style.background = '#f44336';
      }
    }
  }

  /**
   * 更新统计信息
   */
  updateStats(stats: {
    distance: number;
    duration: number;
    speed: number;
    avgSpeed: number;
    calories: number;
  }): void {
    const distanceEl = document.getElementById('distance');
    const durationEl = document.getElementById('duration');
    const speedEl = document.getElementById('speed');
    const caloriesEl = document.getElementById('calories');

    if (distanceEl) distanceEl.textContent = stats.distance.toFixed(2);
    if (speedEl) speedEl.textContent = stats.avgSpeed.toFixed(1);
    if (caloriesEl) caloriesEl.textContent = Math.round(stats.calories).toString();

    if (durationEl) {
      const hours = Math.floor(stats.duration / 3600);
      const minutes = Math.floor((stats.duration % 3600) / 60);
      const seconds = Math.floor(stats.duration % 60);
      durationEl.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * 添加航点到列表
   */
  addWaypointToList(waypoint: any): void {
    this.waypoints.push(waypoint);
    this.renderWaypointsList();
  }

  /**
   * 渲染航点列表
   */
  private renderWaypointsList(): void {
    const listEl = document.getElementById('waypointsList');
    if (!listEl) return;

    if (this.waypoints.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: #999; padding: 20px;">
          暂无航点
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.waypoints.map(wp => `
      <div class="waypoint-item" data-id="${wp.id}">
        <div class="waypoint-name">${wp.name}</div>
        <div class="waypoint-coords">
          ${wp.latitude.toFixed(4)}, ${wp.longitude.toFixed(4)}
        </div>
        <div class="waypoint-actions">
          <button class="waypoint-btn" onclick="window.focusWaypoint('${wp.id}')">定位</button>
          <button class="waypoint-btn delete" onclick="window.deleteWaypoint('${wp.id}')">删除</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * 渲染运动记录列表
   */
  renderWorkoutList(workouts: Workout[]): void {
    const listEl = document.getElementById('workoutList');
    if (!listEl) return;

    if (workouts.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: #999; padding: 20px;">
          暂无运动记录
        </div>
      `;
      return;
    }

    listEl.innerHTML = workouts.map(workout => {
      const sportType = SPORT_TYPES[workout.type || 'running'];
      const date = new Date(workout.startTime);
      const hours = Math.floor(workout.duration / 3600);
      const minutes = Math.floor((workout.duration % 3600) / 60);
      const seconds = Math.floor(workout.duration % 60);

      return `
        <div class="workout-item" data-id="${workout.id}">
          <div class="workout-header">
            <div class="workout-name">${workout.name}</div>
            <div class="workout-type" style="background: ${sportType.color}">
              ${sportType.icon} ${sportType.name}
            </div>
          </div>
          <div class="workout-stats">
            <span>📍 ${workout.distance.toFixed(2)} km</span>
            <span>⏱️ ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</span>
            <span>🔥 ${workout.calories} kcal</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 显示提示信息
   */
  showToast(message: string, duration: number = 3000): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      z-index: 10000;
      animation: fadeIn 0.3s;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  /**
   * 清除航点列表
   */
  clearWaypoints(): void {
    this.waypoints = [];
    this.renderWaypointsList();
  }
}
