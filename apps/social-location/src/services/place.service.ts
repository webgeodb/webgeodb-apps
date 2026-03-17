import { WebGeoDB } from '@webgeodb/core';
import { GeoPoint, Place, NearbyQueryOptions } from '../models/types';

/**
 * Place Service - Manages places and location-based search
 */
export class PlaceService {
  constructor(
    private db: WebGeoDB,
    private cache?: any
  ) {}

  /**
   * Create a new place
   */
  async createPlace(place: Omit<Place, 'placeId' | 'createdAt'>): Promise<Place> {
    const newPlace: Place = {
      ...place,
      placeId: this.generateId(),
      createdAt: new Date()
    };

    await this.db.collection('places').insertOne(newPlace);

    // Invalidate cache
    if (this.cache) {
      await this.cache.invalidate('places:*');
    }

    return newPlace;
  }

  /**
   * Get place by ID
   */
  async getPlace(placeId: string): Promise<Place | null> {
    if (this.cache) {
      const cached = await this.cache.get(`place:${placeId}`);
      if (cached) return cached;
    }

    const place = await this.db.collection('places').findOne({ placeId });

    if (place && this.cache) {
      await this.cache.set(`place:${placeId}`, place, 300);
    }

    return place;
  }

  /**
   * Search nearby places
   */
  async searchNearby(
    center: GeoPoint,
    radius: number,
    options: NearbyQueryOptions = {}
  ): Promise<Place[]> {
    const cacheKey = `places_nearby:${center.latitude}:${center.longitude}:${radius}:${JSON.stringify(options)}`;

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

    if (options.categories) {
      query.category = { $in: options.categories };
    }

    if (options.minRating) {
      query.rating = { $gte: options.minRating };
    }

    let cursor = this.db.collection('places').find(query);

    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }

    const results = await cursor.toArray();

    if (this.cache) {
      await this.cache.set(cacheKey, results, 60);
    }

    return results;
  }

  /**
   * Search places by text
   */
  async searchByText(
    query: string,
    options: {
      limit?: number;
      categories?: string[];
    } = {}
  ): Promise<Place[]> {
    const searchQuery: any = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };

    if (options.categories) {
      searchQuery.category = { $in: options.categories };
    }

    let cursor = this.db.collection('places').find(searchQuery);

    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }

    return cursor.toArray();
  }

  /**
   * Update place rating
   */
  async updateRating(placeId: string, rating: number): Promise<void> {
    await this.db.collection('places').updateOne(
      { placeId },
      { $set: { rating } }
    );

    if (this.cache) {
      await this.cache.invalidate(`place:${placeId}`);
    }
  }

  /**
   * Add photo to place
   */
  async addPhoto(placeId: string, photoUrl: string): Promise<void> {
    await this.db.collection('places').updateOne(
      { placeId },
      { $push: { photos: photoUrl } }
    );

    if (this.cache) {
      await this.cache.invalidate(`place:${placeId}`);
    }
  }

  /**
   * Add tag to place
   */
  async addTag(placeId: string, tag: string): Promise<void> {
    await this.db.collection('places').updateOne(
      { placeId },
      { $addToSet: { tags: tag } }
    );

    if (this.cache) {
      await this.cache.invalidate(`place:${placeId}`);
    }
  }

  /**
   * Get popular places
   */
  async getPopularPlaces(options: {
    limit?: number;
    category?: string;
    minRating?: number;
  } = {}): Promise<Place[]> {
    const query: any = {};

    if (options.category) {
      query.category = options.category;
    }

    if (options.minRating) {
      query.rating = { $gte: options.minRating };
    }

    let cursor = this.db.collection('places')
      .find(query)
      .sort({ rating: -1 });

    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }

    return cursor.toArray();
  }

  /**
   * Get places by category
   */
  async getPlacesByCategory(
    category: string,
    options: { limit?: number } = {}
  ): Promise<Place[]> {
    const cacheKey = `places_category:${category}:${options.limit || 0}`;

    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    let cursor = this.db.collection('places')
      .find({ category })
      .sort({ rating: -1 });

    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }

    const results = await cursor.toArray();

    if (this.cache) {
      await this.cache.set(cacheKey, results, 300);
    }

    return results;
  }

  /**
   * Delete place
   */
  async deletePlace(placeId: string): Promise<boolean> {
    const result = await this.db.collection('places').deleteOne({ placeId });

    if (this.cache) {
      await this.cache.invalidate(`place:${placeId}`);
      await this.cache.invalidate('places:*');
    }

    return result.deletedCount > 0;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `place_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
