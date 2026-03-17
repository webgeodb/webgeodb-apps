import { SocialLocationApp } from '../src/index';
import { GeoPoint, PrivacyLevel } from '../src/models/types';

describe('SocialLocationApp', () => {
  let app: SocialLocationApp;

  beforeAll(async () => {
    app = new SocialLocationApp({
      webgeodbUrl: 'webgeodb://localhost:27017/social_location_test'
    });

    await app.initialize();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('LocationService', () => {
    it('should update user location', async () => {
      const locationService = app.getLocationService();

      await locationService.updateLocation('user1', {
        latitude: 39.9042,
        longitude: 116.4074
      }, {
        accuracy: 10,
        privacyLevel: 'city'
      });

      const location = await locationService.getLocation('user1');
      expect(location).toBeDefined();
      expect(location?.userId).toBe('user1');
      expect(location?.location.latitude).toBeCloseTo(39.9042);
      expect(location?.location.longitude).toBeCloseTo(116.4074);
    });

    it('should find nearby users', async () => {
      const locationService = app.getLocationService();

      // Create multiple users at different locations
      await locationService.updateLocation('user2', {
        latitude: 39.9050,
        longitude: 116.4080
      });

      await locationService.updateLocation('user3', {
        latitude: 40.0042,
        longitude: 116.5074
      });

      const nearby = await locationService.findNearbyUsers(
        { latitude: 39.9042, longitude: 116.4074 },
        5000, // 5km
        { limit: 10 }
      );

      expect(nearby.length).toBeGreaterThan(0);
      expect(nearby.some(u => u.userId === 'user2')).toBe(true);
    });

    it('should get location history', async () => {
      const locationService = app.getLocationService();

      const history = await locationService.getLocationHistory('user1', {
        limit: 10
      });

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('PrivacyService', () => {
    it('should fuzzy location based on privacy level', () => {
      const privacyService = app.getPrivacyService();

      const original: GeoPoint = {
        latitude: 39.9042,
        longitude: 116.4074
      };

      const exact = privacyService.fuzzyLocation(original, 'exact');
      expect(exact.latitude).toBe(original.latitude);
      expect(exact.longitude).toBe(original.longitude);

      const city = privacyService.fuzzyLocation(original, 'city');
      expect(city.latitude).not.toBe(original.latitude);
      expect(city.longitude).not.toBe(original.longitude);
    });

    it('should set and get privacy settings', async () => {
      const privacyService = app.getPrivacyService();

      await privacyService.setPrivacyLevel('user1', {
        level: 'neighborhood',
        precision: 500
      });

      const settings = await privacyService.getPrivacySettings('user1');
      expect(settings).toBeDefined();
      expect(settings?.level).toBe('neighborhood');
      expect(settings?.precision).toBe(500);
    });

    it('should manage privacy zones', async () => {
      const privacyService = app.getPrivacyService();

      await privacyService.setPrivacyZones('user1', [
        {
          name: 'Home',
          location: { latitude: 39.9042, longitude: 116.4074 },
          radius: 200,
          privacyLevel: 'region'
        }
      ]);

      const zones = await privacyService.getPrivacyZones('user1');
      expect(zones).toHaveLength(1);
      expect(zones[0].name).toBe('Home');
    });
  });

  describe('PlaceService', () => {
    it('should create and retrieve place', async () => {
      const placeService = app.getPlaceService();

      const place = await placeService.createPlace({
        name: 'Test Place',
        location: { latitude: 39.9042, longitude: 116.4074 },
        category: 'restaurant',
        rating: 4.5,
        description: 'A test restaurant',
        createdBy: 'user1'
      });

      expect(place).toBeDefined();
      expect(place.placeId).toBeDefined();
      expect(place.name).toBe('Test Place');

      const retrieved = await placeService.getPlace(place.placeId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Place');
    });

    it('should search nearby places', async () => {
      const placeService = app.getPlaceService();

      const nearby = await placeService.searchNearby(
        { latitude: 39.9042, longitude: 116.4074 },
        5000,
        { limit: 10 }
      );

      expect(nearby).toBeDefined();
      expect(Array.isArray(nearby)).toBe(true);
    });

    it('should search places by text', async () => {
      const placeService = app.getPlaceService();

      const results = await placeService.searchByText('Test', {
        limit: 10
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('RecommendationService', () => {
    it('should recommend places', async () => {
      const recommendationService = app.getRecommendationService();

      const recommendations = await recommendationService.recommendPlaces({
        userId: 'user1',
        location: { latitude: 39.9042, longitude: 116.4074 },
        limit: 5
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should recommend friends', async () => {
      const recommendationService = app.getRecommendationService();

      const friends = await recommendationService.recommendFriends(
        'user1',
        { latitude: 39.9042, longitude: 116.4074 },
        5
      );

      expect(friends).toBeDefined();
      expect(Array.isArray(friends)).toBe(true);
    });

    it('should update user preferences', async () => {
      const recommendationService = app.getRecommendationService();

      await recommendationService.updateUserPreferences('user1', {
        categories: ['restaurant', 'cafe', 'park'],
        favoritePlaces: ['place1', 'place2']
      });

      const preferences = await recommendationService.getUserPreferences('user1');
      expect(preferences).toBeDefined();
      expect(preferences?.categories).toContain('restaurant');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete location sharing workflow', async () => {
      const locationService = app.getLocationService();
      const privacyService = app.getPrivacyService();

      // User 1 shares location
      await locationService.updateLocation('user1', {
        latitude: 39.9042,
        longitude: 116.4074
      });

      // Set privacy level
      await privacyService.setPrivacyLevel('user1', {
        level: 'city',
        precision: 3000
      });

      // User 2 queries nearby
      await locationService.updateLocation('user2', {
        latitude: 39.9050,
        longitude: 116.4080
      });

      const nearby = await locationService.findNearbyUsers(
        { latitude: 39.9050, longitude: 116.4080 },
        5000
      );

      expect(nearby.length).toBeGreaterThan(0);
    });
  });
});
