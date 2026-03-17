import { WebGeoDB } from 'webgeodb-core';

/**
 * Cache Service - Multi-level caching strategy
 */
export class CacheService {
  private l1Cache: Map<string, { value: any; expiry: number }>;
  private l2Cache?: any; // Redis client

  constructor(l2Cache?: any) {
    this.l1Cache = new Map();
    this.l2Cache = l2Cache;

    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<any> {
    // Try L1 cache first
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && l1Entry.expiry > Date.now()) {
      return l1Entry.value;
    }

    // Try L2 cache
    if (this.l2Cache) {
      const value = await this.l2Cache.get(key);
      if (value) {
        // Set in L1 cache
        this.l1Cache.set(key, {
          value,
          expiry: Date.now() + 300000 // 5 minutes
        });
        return value;
      }
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    const expiry = Date.now() + (ttl * 1000);

    // Set in L1 cache
    this.l1Cache.set(key, { value, expiry });

    // Set in L2 cache
    if (this.l2Cache) {
      await this.l2Cache.setex(key, ttl, JSON.stringify(value));
    }
  }

  /**
   * Invalidate cache key
   */
  async invalidate(key: string): Promise<void> {
    // Remove from L1
    this.l1Cache.delete(key);

    // Remove from L2
    if (this.l2Cache) {
      await this.l2Cache.del(key);
    }
  }

  /**
   * Invalidate keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Clean L1 cache
    for (const key of this.l1Cache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.l1Cache.delete(key);
      }
    }

    // Clean L2 cache (Redis SCAN)
    if (this.l2Cache && this.l2Cache.scan) {
      let cursor = '0';
      do {
        const result = await this.l2Cache.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          await this.l2Cache.del(...keys);
        }
      } while (cursor !== '0');
    }
  }

  /**
   * Warm up cache with hot data
   */
  async warmUp(keys: string[]): Promise<void> {
    // Implementation depends on your use case
    // For example, preload popular places, active users, etc.
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.expiry <= now) {
        this.l1Cache.delete(key);
      }
    }
  }

  /**
   * Check if key matches pattern
   */
  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(key);
  }
}

/**
 * Rate Limiter - API rate limiting
 */
export class RateLimiter {
  private requests: Map<string, number[]>;

  constructor(
    private windowMs: number = 60000, // 1 minute
    private maxRequests: number = 100
  ) {
    this.requests = new Map();

    // Clean up old entries periodically
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Check if limit exceeded
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(
        timestamp => now - timestamp < this.windowMs
      );

      if (valid.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, valid);
      }
    }
  }
}

/**
 * Logger - Structured logging
 */
export class Logger {
  constructor(private context: string) {}

  info(message: string, meta?: any): void {
    console.log(JSON.stringify({
      level: 'info',
      context: this.context,
      message,
      ...meta
    }));
  }

  error(message: string, error?: Error): void {
    console.error(JSON.stringify({
      level: 'error',
      context: this.context,
      message,
      error: error?.message,
      stack: error?.stack
    }));
  }

  warn(message: string, meta?: any): void {
    console.warn(JSON.stringify({
      level: 'warn',
      context: this.context,
      message,
      ...meta
    }));
  }

  debug(message: string, meta?: any): void {
    console.debug(JSON.stringify({
      level: 'debug',
      context: this.context,
      message,
      ...meta
    }));
  }
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
  private timers: Map<string, number>;

  constructor() {
    this.timers = new Map();
  }

  start(label: string): void {
    this.timers.set(label, Date.now());
  }

  end(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      throw new Error(`Timer "${label}" not found`);
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);

    return duration;
  }

  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      return await fn();
    } finally {
      const duration = this.end(label);
      console.log(`[PERF] ${label}: ${duration}ms`);
    }
  }
}
