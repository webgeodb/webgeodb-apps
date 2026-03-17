export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type PrivacyLevel = 'exact' | 'neighborhood' | 'city' | 'region';

export interface PrivacySettings {
  level: PrivacyLevel;
  precision: number; // meters
  exceptions?: string[]; // place IDs to always show exact location
}

export interface PrivacyZone {
  name: string;
  location: GeoPoint;
  radius: number;
  privacyLevel: PrivacyLevel;
}

export interface UserLocation {
  userId: string;
  location: GeoPoint;
  accuracy: number;
  timestamp: Date;
  privacyLevel: PrivacyLevel;
}

export interface Place {
  placeId: string;
  name: string;
  location: GeoPoint;
  category: string;
  rating: number;
  description: string;
  createdBy: string;
  createdAt: Date;
  photos?: string[];
  tags?: string[];
}

export interface SocialRelation {
  userId: string;
  friendId: string;
  locationSharingEnabled: boolean;
  privacyLevel: PrivacyLevel;
  createdAt: Date;
}

export interface LocationHistory {
  userId: string;
  location: GeoPoint;
  placeId?: string;
  timestamp: Date;
}

export interface UserPreference {
  userId: string;
  categories: string[];
  favoritePlaces: string[];
  privacySettings: PrivacySettings;
}

export interface RecommendationRequest {
  userId: string;
  location: GeoPoint;
  limit?: number;
  categories?: string[];
}

export interface NearbyQueryOptions {
  limit?: number;
  radius?: number;
  categories?: string[];
  minRating?: number;
}
