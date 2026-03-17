import { GeoPoint, PrivacyLevel, PrivacySettings, PrivacyZone } from '../models/types';

/**
 * Privacy Service - Manages location privacy and fuzzing
 */
export class PrivacyService {
  private readonly privacyPrecision: Record<PrivacyLevel, number> = {
    exact: 0,
    neighborhood: 500,    // 500m
    city: 3000,          // 3km
    region: 10000       // 10km
  };

  constructor(
    private db: any,
    private cache?: any
  ) {}

  /**
   * Fuzzy location based on privacy level
   */
  fuzzyLocation(location: GeoPoint, level: PrivacyLevel): GeoPoint {
    const precision = this.privacyPrecision[level];

    if (precision === 0) {
      return location;
    }

    // Add random offset within precision range
    const randomAngle = Math.random() * 2 * Math.PI;
    const randomDistance = Math.random() * precision;

    const earthRadius = 6371000; // Earth's radius in meters

    const lat1 = location.latitude * Math.PI / 180;
    const lng1 = location.longitude * Math.PI / 180;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(randomDistance / earthRadius) +
      Math.cos(lat1) * Math.sin(randomDistance / earthRadius) * Math.cos(randomAngle)
    );

    const lng2 = lng1 + Math.atan2(
      Math.sin(randomAngle) * Math.sin(randomDistance / earthRadius) * Math.cos(lat1),
      Math.cos(randomDistance / earthRadius) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      latitude: lat2 * 180 / Math.PI,
      longitude: lng2 * 180 / Math.PI
    };
  }

  /**
   * Set user's privacy level
   */
  async setPrivacyLevel(
    userId: string,
    settings: PrivacySettings
  ): Promise<void> {
    await this.db.collection('user_privacy').updateOne(
      { userId },
      { $set: settings },
      { upsert: true }
    );

    if (this.cache) {
      await this.cache.invalidate(`user:${userId}:privacy`);
    }
  }

  /**
   * Get user's privacy settings
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    if (this.cache) {
      const cached = await this.cache.get(`user:${userId}:privacy`);
      if (cached) return cached;
    }

    const result = await this.db.collection('user_privacy').findOne({ userId });

    if (result && this.cache) {
      await this.cache.set(`user:${userId}:privacy`, result, 300);
    }

    return result;
  }

  /**
   * Set privacy zones
   */
  async setPrivacyZones(userId: string, zones: PrivacyZone[]): Promise<void> {
    await this.db.collection('privacy_zones').updateOne(
      { userId },
      { $set: { zones } },
      { upsert: true }
    );

    if (this.cache) {
      await this.cache.invalidate(`user:${userId}:privacy_zones`);
    }
  }

  /**
   * Get privacy zones for user
   */
  async getPrivacyZones(userId: string): Promise<PrivacyZone[]> {
    if (this.cache) {
      const cached = await this.cache.get(`user:${userId}:privacy_zones`);
      if (cached) return cached;
    }

    const result = await this.db.collection('privacy_zones').findOne({ userId });

    if (result && this.cache) {
      await this.cache.set(`user:${userId}:privacy_zones`, result.zones || [], 300);
    }

    return result?.zones || [];
  }

  /**
   * Check if location is in privacy zone
   */
  async isInPrivacyZone(userId: string, location: GeoPoint): Promise<boolean> {
    const zones = await this.getPrivacyZones(userId);

    for (const zone of zones) {
      const distance = this.calculateDistance(location, zone.location);
      if (distance <= zone.radius) {
        return true;
      }
    }

    return false;
  }

  /**
   * Apply privacy to location
   */
  async applyPrivacy(
    userId: string,
    location: GeoPoint,
    requesterId?: string
  ): Promise<GeoPoint> {
    // Check if in privacy zone
    const inZone = await this.isInPrivacyZone(userId, location);

    if (inZone) {
      // Apply region-level privacy
      return this.fuzzyLocation(location, 'region');
    }

    // Get user's privacy settings
    const settings = await this.getPrivacySettings(userId);
    const level = settings?.level || 'city';

    // Check if requester has exception (e.g., close friends)
    if (requesterId && settings?.exceptions?.includes(requesterId)) {
      return location;
    }

    return this.fuzzyLocation(location, level);
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
