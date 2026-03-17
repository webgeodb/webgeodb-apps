import { WebGeoDB } from '@webgeodb/core';
import { LocationService } from './services/location.service';
import { PrivacyService } from './services/privacy.service';
import { PlaceService } from './services/place.service';
import { RecommendationService } from './services/recommendation.service';
import { CacheService, RateLimiter, Logger } from './utils/helpers';

/**
 * Main application class for Social Location Sharing
 */
export class SocialLocationApp {
  private db: WebGeoDB;
  private locationService: LocationService;
  private privacyService: PrivacyService;
  private placeService: PlaceService;
  private recommendationService: RecommendationService;
  private cache: CacheService;
  private rateLimiter: RateLimiter;
  private logger: Logger;

  constructor(config: {
    webgeodbUrl: string;
    redisUrl?: string;
  }) {
    // Initialize database
    this.db = new WebGeoDB({ url: config.webgeodbUrl });

    // Initialize cache
    this.cache = new CacheService(); // Add Redis client if needed

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(60000, 100);

    // Initialize logger
    this.logger = new Logger('SocialLocationApp');

    // Initialize services
    this.locationService = new LocationService(this.db, this.cache);
    this.privacyService = new PrivacyService(this.db, this.cache);
    this.placeService = new PlaceService(this.db, this.cache);
    this.recommendationService = new RecommendationService(
      this.db,
      this.placeService,
      this.cache
    );
  }

  /**
   * Initialize database indexes
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing database indexes...');

    // Create geospatial indexes
    await this.db.createIndex('user_locations', { location: '2dsphere' });
    await this.db.createIndex('places', { location: '2dsphere' });
    await this.db.createIndex('location_history', { location: '2dsphere' });

    // Create other indexes
    await this.db.createIndex('user_locations', { userId: 1 });
    await this.db.createIndex('places', { category: 1 });
    await this.db.createIndex('location_history', { userId: 1, timestamp: -1 });
    await this.db.createIndex('social_relations', { userId: 1, friendId: 1 });

    this.logger.info('Database indexes created successfully');
  }

  /**
   * Get location service
   */
  getLocationService(): LocationService {
    return this.locationService;
  }

  /**
   * Get privacy service
   */
  getPrivacyService(): PrivacyService {
    return this.privacyService;
  }

  /**
   * Get place service
   */
  getPlaceService(): PlaceService {
    return this.placeService;
  }

  /**
   * Get recommendation service
   */
  getRecommendationService(): RecommendationService {
    return this.recommendationService;
  }

  /**
   * Get cache service
   */
  getCache(): CacheService {
    return this.cache;
  }

  /**
   * Get rate limiter
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.close();
    this.logger.info('Database connection closed');
  }
}

// Export all services and utilities
export { LocationService } from './services/location.service';
export { PrivacyService } from './services/privacy.service';
export { PlaceService } from './services/place.service';
export { RecommendationService } from './services/recommendation.service';
export { CacheService, RateLimiter, Logger, PerformanceMonitor } from './utils/helpers';
export * from './models/types';
