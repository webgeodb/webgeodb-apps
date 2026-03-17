/**
 * 图表管理器
 *
 * 负责管理 Chart.js 图表显示
 */

import Chart from 'chart.js/auto';

export class ChartManager {
  private speedChart: Chart | null = null;
  private maxDataPoints = 50;

  init(): void {
    const ctx = document.getElementById('speedChart') as HTMLCanvasElement;

    if (!ctx) {
      console.error('速度图表容器未找到');
      return;
    }

    this.speedChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: '速度 (km/h)',
          data: [],
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0
        },
        scales: {
          x: {
            display: false
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '速度 (km/h)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });

    console.log('✅ 速度图表初始化完成');
  }

  /**
   * 添加数据点
   */
  addDataPoint(timestamp: number, speed: number): void {
    if (!this.speedChart) return;

    const labels = this.speedChart.data.labels;
    const data = this.speedChart.data.datasets[0].data;

    // 添加新数据
    labels.push(new Date(timestamp).toLocaleTimeString());
    data.push(speed);

    // 限制数据点数量
    if (labels.length > this.maxDataPoints) {
      labels.shift();
      data.shift();
    }

    this.speedChart.update('none');
  }

  /**
   * 清除图表数据
   */
  clear(): void {
    if (!this.speedChart) return;

    this.speedChart.data.labels = [];
    this.speedChart.data.datasets[0].data = [];
    this.speedChart.update();
  }

  /**
   * 更新图表配置
   */
  updateConfig(color: string): void {
    if (!this.speedChart) return;

    this.speedChart.data.datasets[0].borderColor = color;
    this.speedChart.data.datasets[0].backgroundColor = this.hexToRgba(color, 0.1);
    this.speedChart.update();
  }

  /**
   * 十六进制颜色转 RGBA
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * 获取图表实例
   */
  getChart(): Chart | null {
    return this.speedChart;
  }
}
