# Social Location Sharing Application

Privacy-focused location-based social platform built with WebGeoDB.

## Features

- **Privacy Protection**: Multi-level location privacy with automatic fuzzing
- **High Concurrency**: Optimized for high-traffic scenarios with caching
- **Smart Recommendations**: Location-based friend and place recommendations
- **Place Management**: Create, rate, and discover places
- **Real-time Updates**: WebSocket support for live location sharing

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Usage

### Initialize Application

```typescript
import { SocialLocationApp } from '@webgeodb/example-social-location';

const app = new SocialLocationApp({
  webgeodbUrl: 'webgeodb://localhost:27017/social_location',
  redisUrl: 'redis://localhost:6379'
});

await app.initialize();
```

### Update User Location

```typescript
const locationService = app.getLocationService();

await locationService.updateLocation('user1', {
  latitude: 39.9042,
  longitude: 116.4074
}, {
  accuracy: 10,
  privacyLevel: 'neighborhood'
});
```

### Set Privacy Settings

```typescript
const privacyService = app.getPrivacyService();

await privacyService.setPrivacyLevel('user1', {
  level: 'city',
  precision: 3000,
  exceptions: ['friend1', 'friend2']
});
```

### Search Nearby Places

```typescript
const placeService = app.getPlaceService();

const nearby = await placeService.searchNearby(
  { latitude: 39.9042, longitude: 116.4074 },
  5000, // 5km radius
  { limit: 10, minRating: 4.0 }
);
```

### Get Recommendations

```typescript
const recommendationService = app.getRecommendationService();

const recommendations = await recommendationService.recommendPlaces({
  userId: 'user1',
  location: { latitude: 39.9042, longitude: 116.4074 },
  limit: 5
});
```

## Running Examples

```bash
npm run dev
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## API Documentation

See the [full tutorial](/docs/tutorials/zh/projects/social-location.md) for detailed API documentation.

## License

MIT
