import { WebGeoDB } from 'webgeodb-core';
import { GeoPoint, Place, RecommendationRequest, UserPreference } from '../models/types';
import { PlaceService } from './place.service';

/**
 * Recommendation Service - Location-based recommendations
 */
export class RecommendationService {
  constructor(
    private db: WebGeoDB,
    private placeService: PlaceService,
    private cache?: any
  ) {}

  /**
   * Recommend places based on user location and preferences
   */
  async recommendPlaces(request: RecommendationRequest): Promise<Place[]> {
    const { userId, location, limit = 10, categories } = request;

    // Get user preferences
    const preferences = await this.getUserPreferences(userId);
    const userCategories = categories || preferences?.categories || [];

    // Get user's visited places
    const visitedPlaceIds = await this.getVisitedPlaceIds(userId);

    // Search nearby places
    const nearbyPlaces = await this.placeService.searchNearby(
      location,
      5000, // 5km radius
      {
        limit: limit * 3, // Get more candidates
        categories: userCategories.length > 0 ? userCategories : undefined,
        minRating: 3.5
      }
    );

    // Filter out visited places
    const unvisited = nearbyPlaces.filter(
      place => !visitedPlaceIds.includes(place.placeId)
    );

    // Rank by collaborative filtering
    const ranked = await this.rankByCollaborativeFiltering(
      unvisited,
      userId
    );

    return ranked.slice(0, limit);
  }

  /**
   * Recommend friends based on location proximity
   */
  async recommendFriends(
    userId: string,
    location: GeoPoint,
    limit: number = 10
  ): Promise<string[]> {
    // Get user's existing friends
    const existingFriends = await this.getFriendIds(userId);

    // Find nearby users
    const nearbyUsers = await this.db.collection('user_locations').find({
      userId: { $ne: userId },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          },
          $maxDistance: 10000 // 10km
        }
      }
    }).limit(limit * 2).toArray();

    // Filter out existing friends
    const potentialFriends = nearbyUsers
      .filter((u: any) => !existingFriends.includes(u.userId))
      .map((u: any) => u.userId);

    // Rank by similarity
    const ranked = await this.rankUsersBySimilarity(
      userId,
      potentialFriends
    );

    return ranked.slice(0, limit);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreference | null> {
    if (this.cache) {
      const cached = await this.cache.get(`user:${userId}:preferences`);
      if (cached) return cached;
    }

    const preferences = await this.db.collection('user_preferences').findOne({ userId });

    if (preferences && this.cache) {
      await this.cache.set(`user:${userId}:preferences`, preferences, 300);
    }

    return preferences;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreference>
  ): Promise<void> {
    await this.db.collection('user_preferences').updateOne(
      { userId },
      { $set: preferences },
      { upsert: true }
    );

    if (this.cache) {
      await this.cache.invalidate(`user:${userId}:preferences`);
    }
  }

  /**
   * Rank places by collaborative filtering
   */
  private async rankByCollaborativeFiltering(
    places: Place[],
    userId: string
  ): Promise<Place[]> {
    // Find similar users
    const similarUsers = await this.findSimilarUsers(userId);

    // Calculate scores for each place
    const scores = await Promise.all(
      places.map(async place => {
        let score = place.rating; // Base score from rating

        // Boost score if similar users visited this place
        const visitsBySimilarUsers = await this.db.collection('location_history')
          .countDocuments({
            userId: { $in: similarUsers.map(u => u.userId) },
            placeId: place.placeId
          });

        score += visitsBySimilarUsers * 0.5;

        // Boost score if place is in user's preferred categories
        const preferences = await this.getUserPreferences(userId);
        if (preferences?.categories.includes(place.category)) {
          score += 1.0;
        }

        return { place, score };
      })
    );

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return scores.map(s => s.place);
  }

  /**
   * Find similar users based on location history
   */
  private async findSimilarUsers(userId: string): Promise<Array<{ userId: string; similarity: number }>> {
    // Get user's visited places
    const userPlaces = await this.db.collection('location_history')
      .distinct('placeId', { userId });

    // Find other users who visited similar places
    const otherUsers = await this.db.collection('location_history')
      .aggregate([
        { $match: { placeId: { $in: userPlaces }, userId: { $ne: userId } } },
        { $group: { _id: '$userId', commonPlaces: { $sum: 1 } } },
        { $sort: { commonPlaces: -1 } },
        { $limit: 20 }
      ]).toArray();

    return otherUsers.map((u: any) => ({
      userId: u._id,
      similarity: u.commonPlaces
    }));
  }

  /**
   * Rank users by similarity
   */
  private async rankUsersBySimilarity(
    userId: string,
    candidateIds: string[]
  ): Promise<string[]> {
    const similarities = await Promise.all(
      candidateIds.map(async candidateId => {
        const similarity = await this.calculateUserSimilarity(userId, candidateId);
        return { userId: candidateId, similarity };
      })
    );

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.map(s => s.userId);
  }

  /**
   * Calculate similarity between two users
   */
  private async calculateUserSimilarity(
    userId1: string,
    userId2: string
  ): Promise<number> {
    // Get place categories visited by both users
    const places1 = await this.db.collection('location_history')
      .aggregate([
        { $match: { userId: userId1 } },
        { $lookup: { from: 'places', localField: 'placeId', foreignField: 'placeId', as: 'place' } },
        { $unwind: '$place' },
        { $group: { _id: '$place.category' } }
      ]).toArray();

    const categories1 = new Set(places1.map((p: any) => p._id));

    const places2 = await this.db.collection('location_history')
      .aggregate([
        { $match: { userId: userId2 } },
        { $lookup: { from: 'places', localField: 'placeId', foreignField: 'placeId', as: 'place' } },
        { $unwind: '$place' },
        { $group: { _id: '$place.category' } }
      ]).toArray();

    const categories2 = new Set(places2.map((p: any) => p._id));

    // Calculate Jaccard similarity
    const intersection = new Set([...categories1].filter(x => categories2.has(x)));
    const union = new Set([...categories1, ...categories2]);

    return intersection.size / union.size;
  }

  /**
   * Get user's visited place IDs
   */
  private async getVisitedPlaceIds(userId: string): Promise<string[]> {
    return this.db.collection('location_history')
      .distinct('placeId', { userId });
  }

  /**
   * Get user's friend IDs
   */
  private async getFriendIds(userId: string): Promise<string[]> {
    const relations = await this.db.collection('social_relations')
      .find({ userId, locationSharingEnabled: true })
      .toArray();

    return relations.map((r: any) => r.friendId);
  }
}
