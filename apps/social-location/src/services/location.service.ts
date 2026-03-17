import { WebGeoDB } from '@webgeodb/core';
import { GeoPoint, PrivacyLevel, UserLocation, NearbyQueryOptions } from '../models/types';

/**
 * Location Service - Manages user location updates and queries
 */
export class LocationService {
  constructor(
    private db: WebGeoDB,
    private cache?: any
  ) {}

  /**
   * Update user's current location
   */
  async updateLocation(
    userId: string,
    location: GeoPoint,
    options: {
      accuracy?: number;
      privacyLevel?: PrivacyLevel;
    } = {}
  ): Promise<UserLocation> {
    const userLocation: UserLocation = {
      userId,
      location,
      accuracy: options.accuracy || 10,
      timestamp: new Date(),
      privacyLevel: options.privacyLevel || 'city'
    };

    // Store in database
    await this.db.collection('user_locations').updateOne(
      { userId },
      { $set: userLocation },
      { upsert: true }
    );

    // Add to location history
    await this.db.collection('location_history').insertOne({
      userId,
      location,
      timestamp: new Date()
    });

    // Invalidate cache
    if (this.cache) {
      await this.cache.invalidate(`user:${userId}:location`);
    }

    return userLocation;
  }

  /**
   * Batch update locations for multiple users
   */
  async updateLocationsBatch(
    updates: Array<{
      userId: string;
      location: GeoPoint;
      accuracy?: number;
      privacyLevel?: PrivacyLevel;
    }>
  ): Promise<void> {
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { userId: update.userId },
        update: {
          $set: {
            userId: update.userId,
            location: update.location,
            accuracy: update.accuracy || 10,
            timestamp: new Date(),
            privacyLevel: update.privacyLevel || 'city'
          }
        },
        upsert: true
      }
    }));

    await this.db.collection('user_locations').bulkWrite(bulkOps);
  }

  /**
   * Get user's current location
   */
  async getLocation(userId: string): Promise<UserLocation | null> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get(`user:${userId}:location`);
      if (cached) return cached;
    }

    const result = await this.db.collection('user_locations').findOne({ userId });

    if (result && this.cache) {
      await this.cache.set(`user:${userId}:location`, result, 60);
    }

    return result;
  }

  /**
   * Find nearby users
   */
  async findNearbyUsers(
    center: GeoPoint,
    radius: number,
    options: NearbyQueryOptions = {}
  ): Promise<UserLocation[]> {
    const cacheKey = `nearby:${center.latitude}:${center.longitude}:${radius}:${JSON.stringify(options)}`;

    // Try cache
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const query: any = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [center.longitude, center.latitude]
          },
          $maxDistance: radius
        }
      }
    };

    // Add filters
    if (options.categories) {
      // Would need to join with user preferences
    }

    let cursor = this.db.collection('user_locations').find(query);

    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }

    const results = await cursor.toArray();

    if (this.cache) {
      await this.cache.set(cacheKey, results, 30); // Cache for 30s
    }

    return results;
  }

  /**
   * Find nearby users by IDs
   */
  async findNearbyUsersByIds(
    userIds: string[],
    center: GeoPoint,
    radius: number
  ): Promise<Map<string, UserLocation>> {
    const cacheKey = `nearby_batch:${userIds.join(',')}:${center.latitude}:${center.longitude}:${radius}`;

    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return new Map(cached);
    }

    const results = await this.db.collection('user_locations').find({
      userId: { $in: userIds },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [center.longitude, center.latitude]
          },
          $maxDistance: radius
        }
      }
    }).toArray();

    const resultMap = new Map(
      results.map(r => [r.userId, r])
    );

    if (this.cache) {
      await this.cache.set(cacheKey, Array.from(resultMap.entries()), 60);
    }

    return resultMap;
  }

  /**
   * Get user location history
   */
  async getLocationHistory(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<Array<{ location: GeoPoint; timestamp: Date }>> {
    const query: any = { userId };

    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = options.startDate;
      if (options.endDate) query.timestamp.$lte = options.endDate;
    }

    let cursor = this.db.collection('location_history')
      .find(query)
      .sort({ timestamp: -1 });

    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }

    return cursor.toArray();
  }
}
