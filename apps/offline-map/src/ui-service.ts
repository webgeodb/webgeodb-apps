/**
 * UI服务类
 *
 * 负责更新用户界面
 */

export class UIService {
  /**
   * 更新在线状态显示
   */
  updateOnlineStatus(isOnline: boolean): void {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.className = `status ${isOnline ? 'online' : 'offline'}`;
      statusEl.textContent = `状态: ${isOnline ? '在线' : '离线'}`;
    }
  }

  /**
   * 更新统计信息
   */
  updateStats(stats: {
    featureCount: number;
    dataSize: number;
  }): void {
    const featureCountEl = document.getElementById('featureCount');
    const dataSizeEl = document.getElementById('dataSize');

    if (featureCountEl) {
      featureCountEl.textContent = stats.featureCount.toString();
    }

    if (dataSizeEl) {
      dataSizeEl.textContent = `${stats.dataSize} KB`;
    }
  }

  /**
   * 更新最后同步时间
   */
  updateLastSync(date: Date): void {
    const lastSyncEl = document.getElementById('lastSync');
    if (lastSyncEl) {
      lastSyncEl.textContent = date.toLocaleTimeString();
    }
  }

  /**
   * 显示/隐藏进度条
   */
  showProgress(show: boolean): void {
    const container = document.getElementById('progressContainer');
    const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

    if (container) {
      container.style.display = show ? 'block' : 'none';
    }

    if (downloadBtn) {
      downloadBtn.disabled = show;
    }
  }

  /**
   * 更新进度
   */
  updateProgress(percent: number, text: string): void {
    const fillEl = document.getElementById('progressFill');
    const textEl = document.getElementById('loadingText');

    if (fillEl) {
      fillEl.style.width = `${percent}%`;
    }

    if (textEl) {
      textEl.textContent = text;
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
        document.body.removeChild(toast);
      }, 300);
    }, duration);
  }
}
