/**
 * Contour Generation and Visualization
 *
 * Implements the Marching Squares algorithm for generating contour lines
 * from interpolated grid data
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface ContourLevel {
  level: number;
  paths: Array<Array<[number, number]>>;
}

interface ContourOptions {
  smoothing?: number;
  minPathLength?: number;
  simplify?: boolean;
}

// ============================================================================
// Contour Generator
// ============================================================================

export class ContourGenerator {
  /**
   * Generate contours for multiple levels
   * @param grid - 2D array of values
   * @param contourLevels - Array of contour level values
   * @param options - Generation options
   * @returns Array of contour objects
   */
  generateContours(
    grid: number[][],
    contourLevels: number[],
    options: ContourOptions = {}
  ): ContourLevel[] {
    const results: ContourLevel[] = [];

    for (const level of contourLevels) {
      const paths = this.marchingSquares(grid, level, options);

      // Filter paths by minimum length
      const filteredPaths = options.minPathLength
        ? paths.filter(p => p.length >= options.minPathLength!)
        : paths;

      // Apply smoothing if requested
      const smoothedPaths = options.smoothing
        ? filteredPaths.map(p => this.smoothPath(p, options.smoothing!))
        : filteredPaths;

      results.push({
        level,
        paths: smoothedPaths
      });
    }

    return results;
  }

  /**
   * Marching Squares algorithm
   * @param grid - 2D array of values
   * @param level - Contour level
   * @param options - Algorithm options
   * @returns Array of contour paths
   */
  private marchingSquares(
    grid: number[][],
    level: number,
    options: ContourOptions = {}
  ): Array<Array<[number, number]>> {
    const paths: Array<Array<[number, number]>> = [];
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = new Set<string>();

    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const key = `${i},${j}`;
        if (visited.has(key)) continue;

        const path = this.traceContour(grid, i, j, level, visited);

        if (path.length > 1) {
          paths.push(path);
        }
      }
    }

    return paths;
  }

  /**
   * Trace a single contour path
   * @param grid - 2D array of values
   * @param startRow - Starting row
   * @param startCol - Starting column
   * @param level - Contour level
   * @param visited - Set of visited cells
   * @returns Contour path
   */
  private traceContour(
    grid: number[][],
    startRow: number,
    startCol: number,
    level: number,
    visited: Set<string>
  ): Array<[number, number]> {
    const path: Array<[number, number]> = [];
    let currentRow = startRow;
    let currentCol = startCol;
    let maxIterations = grid.length * grid[0].length;
    let iterations = 0;

    while (iterations < maxIterations) {
      const key = `${currentRow},${currentCol}`;

      if (visited.has(key)) break;
      visited.add(key);

      const config = this.getSquareConfig(grid, currentRow, currentCol, level);

      if (config === 0 || config === 15) {
        break;
      }

      const point = this.interpolateEdgePoint(
        grid,
        currentRow,
        currentCol,
        level,
        config
      );

      if (point) {
        path.push(point);
      }

      const next = this.getNextSquare(currentRow, currentCol, config);
      if (!next) break;

      currentRow = next.row;
      currentCol = next.col;

      iterations++;
    }

    return path;
  }

  /**
   * Determine square configuration (0-15)
   * @param grid - 2D array of values
   * @param row - Row index
   * @param col - Column index
   * @param level - Contour level
   * @returns Configuration number (0-15)
   */
  private getSquareConfig(
    grid: number[][],
    row: number,
    col: number,
    level: number
  ): number {
    let config = 0;

    // Check each corner (bottom-left, bottom-right, top-right, top-left)
    if (grid[row][col] >= level) config |= 1;
    if (grid[row][col + 1] >= level) config |= 2;
    if (grid[row + 1][col + 1] >= level) config |= 4;
    if (grid[row + 1][col] >= level) config |= 8;

    return config;
  }

  /**
   * Interpolate edge point for contour
   * @param grid - 2D array of values
   * @param row - Row index
   * @param col - Column index
   * @param level - Contour level
   * @param config - Square configuration
   * @returns Interpolated point or null
   */
  private interpolateEdgePoint(
    grid: number[][],
    row: number,
    col: number,
    level: number,
    config: number
  ): [number, number] | null {
    const bl = grid[row][col];
    const br = grid[row][col + 1];
    const tr = grid[row + 1][col + 1];
    const tl = grid[row + 1][col];

    let x = col + 0.5;
    let y = row + 0.5;

    // Determine edge based on configuration
    switch (config) {
      case 1:
      case 14:
        // Left edge
        y = row + this.linearInterp(tl, bl, level);
        x = col;
        break;
      case 2:
      case 13:
        // Bottom edge
        y = row;
        x = col + this.linearInterp(bl, br, level);
        break;
      case 3:
      case 12:
        // Left and bottom edges
        y = row + this.linearInterp(tl, bl, level);
        x = col;
        break;
      case 4:
      case 11:
        // Right edge
        y = row + this.linearInterp(tr, br, level);
        x = col + 1;
        break;
      case 5:
        // Saddle point
        x = col + this.linearInterp(bl, br, level);
        y = row;
        break;
      case 6:
      case 9:
        // Bottom and right edges
        x = col + this.linearInterp(bl, br, level);
        y = row;
        break;
      case 7:
      case 8:
        // Left edge
        y = row + this.linearInterp(tl, bl, level);
        x = col;
        break;
      case 10:
        // Bottom and right edges
        x = col + 1;
        y = row + this.linearInterp(tr, br, level);
        break;
    }

    return [x, y];
  }

  /**
   * Linear interpolation
   * @param v1 - First value
   * @param v2 - Second value
   * @param level - Target level
   * @returns Interpolated position (0-1)
   */
  private linearInterp(v1: number, v2: number, level: number): number {
    if (Math.abs(v2 - v1) < 0.0001) {
      return 0.5;
    }
    return (level - v1) / (v2 - v1);
  }

  /**
   * Get next square in contour path
   * @param row - Current row
   * @param col - Current column
   * @param config - Square configuration
   * @returns Next square position or null
   */
  private getNextSquare(
    row: number,
    col: number,
    config: number
  ): { row: number; col: number } | null {
    // Simplified implementation
    // In production, should use proper lookup table based on configuration
    const moves: Record<number, { dr: number; dc: number }> = {
      1: { dr: 0, dc: -1 },
      2: { dr: -1, dc: 0 },
      3: { dr: 0, dc: -1 },
      4: { dr: 0, dc: 1 },
      5: { dr: -1, dc: 0 },
      6: { dr: -1, dc: 0 },
      7: { dr: 0, dc: -1 },
      8: { dr: 0, dc: -1 },
      9: { dr: -1, dc: 0 },
      10: { dr: 0, dc: 1 },
      11: { dr: 0, dc: 1 },
      12: { dr: 0, dc: -1 },
      13: { dr: -1, dc: 0 },
      14: { dr: 0, dc: -1 }
    };

    const move = moves[config];
    if (!move) return null;

    return {
      row: row + move.dr,
      col: col + move.dc
    };
  }

  /**
   * Apply smoothing to a path
   * @param path - Original path
   * @param smoothing - Smoothing factor (0-1)
   * @returns Smoothed path
   */
  private smoothPath(
    path: Array<[number, number]>,
    smoothing: number
  ): Array<[number, number]> {
    if (path.length < 3) return path;

    const smoothed: Array<[number, number]> = [];

    for (let i = 0; i < path.length; i++) {
      const prev = path[(i - 1 + path.length) % path.length];
      const curr = path[i];
      const next = path[(i + 1) % path.length];

      const x = (1 - smoothing) * curr[0] + smoothing * (prev[0] + next[0]) / 2;
      const y = (1 - smoothing) * curr[1] + smoothing * (prev[1] + next[1]) / 2;

      smoothed.push([x, y]);
    }

    return smoothed;
  }
}

// ============================================================================
// Contour Renderer
// ============================================================================

export class ContourRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
  }

  /**
   * Render contours on canvas
   * @param contours - Array of contour levels
   * @param bounds - Geographic bounds
   * @param options - Rendering options
   */
  render(
    contours: ContourLevel[],
    bounds: {
      west: number;
      south: number;
      east: number;
      north: number;
    },
    options: {
      lineWidth?: number;
      color?: string;
      labels?: boolean;
      fontSize?: number;
    } = {}
  ): void {
    const {
      lineWidth = 2,
      color = 'rgba(255, 255, 255, 0.8)',
      labels = true,
      fontSize = 12
    } = options;

    const { width, height } = this.canvas;

    for (const contour of contours) {
      // Draw contour lines
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth;

      for (const path of contour.paths) {
        this.ctx.beginPath();

        for (let i = 0; i < path.length; i++) {
          const [x, y] = path[i];
          const screenX = this.worldToScreenX(x, bounds, width);
          const screenY = this.worldToScreenY(y, bounds, height);

          if (i === 0) {
            this.ctx.moveTo(screenX, screenY);
          } else {
            this.ctx.lineTo(screenX, screenY);
          }
        }

        this.ctx.stroke();
      }

      // Draw labels
      if (labels && contour.paths.length > 0) {
        this.drawContourLabel(contour, bounds, width, height, fontSize);
      }
    }
  }

  /**
   * Draw contour level labels
   * @param contour - Contour level
   * @param bounds - Geographic bounds
   * @param canvasWidth - Canvas width
   * @param canvasHeight - Canvas height
   * @param fontSize - Font size
   */
  private drawContourLabel(
    contour: ContourLevel,
    bounds: { west: number; south: number; east: number; north: number },
    canvasWidth: number,
    canvasHeight: number,
    fontSize: number
  ): void {
    // Find a suitable point for label (middle of longest path)
    const longestPath = contour.paths.reduce((longest, path) =>
      path.length > longest.length ? path : longest
    , contour.paths[0]);

    if (!longestPath) return;

    const midPoint = longestPath[Math.floor(longestPath.length / 2)];
    const [x, y] = midPoint;

    const screenX = this.worldToScreenX(x, bounds, canvasWidth);
    const screenY = this.worldToScreenY(y, bounds, canvasHeight);

    // Draw background for label
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillRect(screenX - 20, screenY - 10, 40, 20);

    // Draw label text
    this.ctx.fillStyle = '#000';
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(contour.level.toString(), screenX, screenY);
  }

  /**
   * Convert world X coordinate to screen X
   * @param worldX - World X coordinate
   * @param bounds - Geographic bounds
   * @param canvasWidth - Canvas width
   * @returns Screen X coordinate
   */
  private worldToScreenX(
    worldX: number,
    bounds: { west: number; south: number; east: number; north: number },
    canvasWidth: number
  ): number {
    return ((worldX - bounds.west) / (bounds.east - bounds.west)) * canvasWidth;
  }

  /**
   * Convert world Y coordinate to screen Y
   * @param worldY - World Y coordinate
   * @param bounds - Geographic bounds
   * @param canvasHeight - Canvas height
   * @returns Screen Y coordinate
   */
  private worldToScreenY(
    worldY: number,
    bounds: { west: number; south: number; east: number; north: number },
    canvasHeight: number
  ): number {
    return ((bounds.north - worldY) / (bounds.north - bounds.south)) * canvasHeight;
  }

  /**
   * Generate color scale for contour levels
   * @param contours - Array of contour levels
   * @param minColor - Color for minimum level
   * @param maxColor - Color for maximum level
   * @returns Array of colors for each level
   */
  generateContourColors(
    contours: ContourLevel[],
    minColor: string = '#00e400',
    maxColor: string = '#7e0023'
  ): string[] {
    if (contours.length === 0) return [];

    const levels = contours.map(c => c.level);
    const minLevel = Math.min(...levels);
    const maxLevel = Math.max(...levels);

    return contours.map(contour => {
      const t = (contour.level - minLevel) / (maxLevel - minLevel);
      return this.interpolateColor(minColor, maxColor, t);
    });
  }

  /**
   * Interpolate between two colors
   * @param color1 - First color (hex)
   * @param color2 - Second color (hex)
   * @param t - Interpolation factor (0-1)
   * @returns Interpolated color
   */
  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Convert hex color to RGB
   * @param hex - Hex color string
   * @returns RGB object
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  }
}

// ============================================================================
// Legend Generator
// ============================================================================

export class LegendGenerator {
  /**
   * Generate legend HTML
   * @param contours - Array of contour levels
   * @param colors - Array of colors for each level
   * @param title - Legend title
   * @returns HTML string
   */
  generateLegendHTML(
    contours: ContourLevel[],
    colors: string[],
    title: string = 'Contour Levels'
  ): string {
    const items = contours.map((contour, i) => `
      <div class="legend-item">
        <div class="legend-color" style="background-color: ${colors[i]}"></div>
        <div class="legend-label">${contour.level}</div>
      </div>
    `).join('');

    return `
      <div class="legend">
        <div class="legend-title">${title}</div>
        ${items}
      </div>
    `;
  }

  /**
   * Generate legend on canvas
   * @param canvas - Canvas element
   * @param contours - Array of contour levels
   * @param colors - Array of colors for each level
   * @param options - Legend options
   */
  renderLegend(
    canvas: HTMLCanvasElement,
    contours: ContourLevel[],
    colors: string[],
    options: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      title?: string;
      backgroundColor?: string;
    } = {}
  ): void {
    const {
      x = 10,
      y = 10,
      width = 150,
      height = contours.length * 30 + 40,
      title = 'Contour Levels',
      backgroundColor = 'rgba(255, 255, 255, 0.9)'
    } = options;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(x, y, width, height);

    // Draw title
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 10, y + 20);

    // Draw legend items
    const itemHeight = 25;
    ctx.font = '12px sans-serif';

    contours.forEach((contour, i) => {
      const itemY = y + 35 + i * itemHeight;

      // Draw color box
      ctx.fillStyle = colors[i];
      ctx.fillRect(x + 10, itemY, 20, 15);

      // Draw label
      ctx.fillStyle = '#000';
      ctx.textAlign = 'left';
      ctx.fillText(contour.level.toString(), x + 40, itemY + 12);
    });
  }
}
