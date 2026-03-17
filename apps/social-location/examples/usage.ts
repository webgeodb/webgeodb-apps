import { SocialLocationApp } from './index';
import { GeoPoint, PrivacyLevel } from './models/types';

/**
 * Usage Examples for Social Location Sharing Application
 */

async function main() {
  // Initialize the application
  const app = new SocialLocationApp({
    webgeodbUrl: 'webgeodb://localhost:27017/social_location',
    redisUrl: 'redis://localhost:6379'
  });

  await app.initialize();

  // Get services
  const locationService = app.getLocationService();
  const privacyService = app.getPrivacyService();
  const placeService = app.getPlaceService();
  const recommendationService = app.getRecommendationService();

  console.log('=== Social Location Sharing Examples ===\n');

  // Example 1: Update User Location
  console.log('1. Update User Location');
  await locationService.updateLocation('alice', {
    latitude: 39.9042,
    longitude: 116.4074
  }, {
    accuracy: 10,
    privacyLevel: 'neighborhood'
  });
  console.log('✓ Alice\'s location updated\n');

  // Example 2: Set Privacy Settings
  console.log('2. Set Privacy Settings');
  await privacyService.setPrivacyLevel('alice', {
    level: 'city',
    precision: 3000,
    exceptions: ['bob'] // Bob can see exact location
  });

  // Set privacy zones
  await privacyService.setPrivacyZones('alice', [
    {
      name: 'Home',
      location: { latitude: 39.9042, longitude: 116.4074 },
      radius: 200,
      privacyLevel: 'region'
    }
  ]);
  console.log('✓ Privacy settings configured\n');

  // Example 3: Create Places
  console.log('3. Create Places');
  const forbiddenCity = await placeService.createPlace({
    name: 'Forbidden City',
    location: { latitude: 39.9163, longitude: 116.3971 },
    category: 'museum',
    rating: 4.8,
    description: 'Imperial palace of Ming and Qing dynasties',
    createdBy: 'admin'
  });
  console.log(`✓ Created place: ${forbiddenCity.name}\n`);

  // Example 4: Search Nearby Places
  console.log('4. Search Nearby Places');
  const nearbyPlaces = await placeService.searchNearby(
    { latitude: 39.9042, longitude: 116.4074 },
    5000, // 5km
    { limit: 10, minRating: 4.0 }
  );
  console.log(`✓ Found ${nearbyPlaces.length} nearby places\n`);

  // Example 5: Find Nearby Users
  console.log('5. Find Nearby Users');
  await locationService.updateLocation('bob', {
    latitude: 39.9050,
    longitude: 116.4080
  });

  const nearbyUsers = await locationService.findNearbyUsers(
    { latitude: 39.9042, longitude: 116.4074 },
    5000,
    { limit: 20 }
  );
  console.log(`✓ Found ${nearbyUsers.length} nearby users\n`);

  // Example 6: Apply Privacy to Location
  console.log('6. Apply Privacy to Location');
  const aliceLocation = await locationService.getLocation('alice');
  if (aliceLocation) {
    const fuzzyLocation = await privacyService.applyPrivacy(
      'alice',
      aliceLocation.location,
      'charlie' // Not in exceptions
    );
    console.log(`✓ Original: ${aliceLocation.location.latitude}, ${aliceLocation.location.longitude}`);
    console.log(`✓ Fuzzy: ${fuzzyLocation.latitude}, ${fuzzyLocation.longitude}\n`);
  }

  // Example 7: Recommend Places
  console.log('7. Recommend Places');
  await recommendationService.updateUserPreferences('alice', {
    categories: ['museum', 'park', 'restaurant'],
    favoritePlaces: [forbiddenCity.placeId]
  });

  const recommendations = await recommendationService.recommendPlaces({
    userId: 'alice',
    location: { latitude: 39.9042, longitude: 116.4074 },
    limit: 5
  });
  console.log(`✓ Generated ${recommendations.length} place recommendations\n`);

  // Example 8: Recommend Friends
  console.log('8. Recommend Friends');
  const friendRecommendations = await recommendationService.recommendFriends(
    'alice',
    { latitude: 39.9042, longitude: 116.4074 },
    5
  );
  console.log(`✓ Generated ${friendRecommendations.length} friend recommendations\n`);

  // Example 9: Get Location History
  console.log('9. Get Location History');
  const history = await locationService.getLocationHistory('alice', {
    limit: 10
  });
  console.log(`✓ Retrieved ${history.length} location history entries\n`);

  // Example 10: Search Places by Category
  console.log('10. Search Places by Category');
  const museums = await placeService.getPlacesByCategory('museum', {
    limit: 5
  });
  console.log(`✓ Found ${museums.length} museums\n`);

  // Example 11: Batch Update Locations
  console.log('11. Batch Update Locations');
  await locationService.updateLocationsBatch([
    { userId: 'user1', location: { latitude: 39.91, longitude: 116.41 } },
    { userId: 'user2', location: { latitude: 39.92, longitude: 116.42 } },
    { userId: 'user3', location: { latitude: 39.93, longitude: 116.43 } }
  ]);
  console.log('✓ Batch updated 3 user locations\n');

  // Example 12: Get Popular Places
  console.log('12. Get Popular Places');
  const popularPlaces = await placeService.getPopularPlaces({
    limit: 5,
    minRating: 4.5
  });
  console.log(`✓ Found ${popularPlaces.length} popular places\n`);

  console.log('=== Examples Complete ===');

  // Close connection
  await app.close();
}

// Run examples
if (require.main === module) {
  main().catch(console.error);
}

export { main };
