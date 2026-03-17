/**
 * UI服务类
 *
 * 负责更新用户界面
 */

export class UIService {
  /**
   * 更新追踪状态
   */
  updateTrackingStatus(isTracking: boolean): void {
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    const statusEl = document.getElementById('trackingStatus');
    const indicatorEl = document.getElementById('trackingIndicator');

    if (startBtn) startBtn.disabled = isTracking;
    if (stopBtn) stopBtn.disabled = !isTracking;
    if (statusEl) statusEl.textContent = isTracking ? '追踪中' : '已停止';
    if (indicatorEl) {
      indicatorEl.className = isTracking ? 'tracking-indicator' : 'tracking-indicator stopped';
    }
  }

  /**
   * 更新位置信息
   */
  updateLocationInfo(data: any): void {
    const latEl = document.getElementById('currentLat');
    const lngEl = document.getElementById('currentLng');
    const accuracyEl = document.getElementById('accuracy');

    if (latEl) latEl.textContent = data.latitude.toFixed(6);
    if (lngEl) lngEl.textContent = data.longitude.toFixed(6);
    if (accuracyEl) accuracyEl.textContent = `±${data.accuracy.toFixed(0)}m`;
  }

  /**
   * 更新统计信息
   */
  updateStats(stats: {
    pointCount: number;
    totalDistance: number;
    duration: number;
    avgSpeed: number;
  }): void {
    const pointCountEl = document.getElementById('pointCount');
    const distanceEl = document.getElementById('totalDistance');
    const durationEl = document.getElementById('duration');
    const speedEl = document.getElementById('avgSpeed');

    if (pointCountEl) pointCountEl.textContent = stats.pointCount.toString();

    if (distanceEl) {
      if (stats.totalDistance < 1000) {
        distanceEl.textContent = `${stats.totalDistance.toFixed(0)} m`;
      } else {
        distanceEl.textContent = `${(stats.totalDistance / 1000).toFixed(2)} km`;
      }
    }

    if (durationEl) {
      const hours = Math.floor(stats.duration / 3600);
      const minutes = Math.floor((stats.duration % 3600) / 60);
      const seconds = Math.floor(stats.duration % 60);
      durationEl.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    if (speedEl) speedEl.textContent = `${stats.avgSpeed.toFixed(1)} km/h`;
  }

  /**
   * 更新间隔标签
   */
  updateIntervalLabel(seconds: number): void {
    const labelEl = document.getElementById('intervalValue');
    if (labelEl) labelEl.textContent = `${seconds}秒`;
  }

  /**
   * 添加时间线项目
   */
  addTimelineItem(data: any): void {
    const timelineEl = document.getElementById('timeline');
    if (!timelineEl) return;

    // 移除占位文本
    const placeholder = timelineEl.querySelector('[style*="text-align: center"]');
    if (placeholder) placeholder.remove();

    const item = document.createElement('div');
    item.className = 'timeline-item';

    const time = new Date(data.timestamp).toLocaleTimeString();
    const coords = `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`;
    const accuracy = data.accuracy.toFixed(0);

    item.innerHTML = `
      <div class="timeline-time">${time}</div>
      <div class="timeline-coords">${coords} (±${accuracy}m)</div>
    `;

    timelineEl.insertBefore(item, timelineEl.firstChild);

    // 限制时间线项目数量
    while (timelineEl.children.length > 50) {
      timelineEl.removeChild(timelineEl.lastChild!);
    }
  }

  /**
   * 清除时间线
   */
  clearTimeline(): void {
    const timelineEl = document.getElementById('timeline');
    if (timelineEl) {
      timelineEl.innerHTML = `
        <div style="text-align: center; color: #999; padding: 20px;">
          暂无轨迹记录
        </div>
      `;
    }
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
}
