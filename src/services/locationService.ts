/**
 * Location Service
 * Handles GPS permissions and location utilities for EduFi
 */

import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface LocationData {
    coordinates: Coordinates;
    address?: string;
    timestamp: Date;
}

// Permission status
export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Check if location permissions are granted
 */
export async function checkLocationPermission(): Promise<LocationPermissionStatus> {
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        return status as LocationPermissionStatus;
    } catch (error) {
        console.error('Error checking location permission:', error);
        return 'undetermined';
    }
}

/**
 * Request location permission with explanation
 */
export async function requestLocationPermission(): Promise<boolean> {
    try {
        const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

        if (existingStatus === 'granted') {
            return true;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
            return true;
        }

        // Show alert if permission denied
        Alert.alert(
            'Location Permission Required',
            'EduFi uses your location to tag where you spend money. This helps you track spending by location. Your location data stays on your device.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open Settings',
                    onPress: () => Linking.openSettings()
                },
            ]
        );

        return false;
    } catch (error) {
        console.error('Error requesting location permission:', error);
        return false;
    }
}

/**
 * Get current location
 */
export async function getCurrentLocation(): Promise<LocationData | null> {
    try {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
            return null;
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        const coordinates: Coordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };

        // Try to get address (reverse geocoding)
        let address: string | undefined;
        try {
            const [geocode] = await Location.reverseGeocodeAsync(coordinates);
            if (geocode) {
                const parts = [
                    geocode.street,
                    geocode.city,
                    geocode.region,
                ].filter(Boolean);
                address = parts.join(', ');
            }
        } catch (geocodeError) {
            console.log('Reverse geocoding failed:', geocodeError);
        }

        return {
            coordinates,
            address,
            timestamp: new Date(),
        };
    } catch (error) {
        console.error('Error getting current location:', error);
        return null;
    }
}

/**
 * Get last known location (faster, less accurate)
 */
export async function getLastKnownLocation(): Promise<LocationData | null> {
    try {
        const hasPermission = await checkLocationPermission();
        if (hasPermission !== 'granted') {
            return null;
        }

        const location = await Location.getLastKnownPositionAsync();
        if (!location) {
            return null;
        }

        return {
            coordinates: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            },
            timestamp: new Date(location.timestamp),
        };
    } catch (error) {
        console.error('Error getting last known location:', error);
        return null;
    }
}

/**
 * Calculate distance between two coordinates (in meters)
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}

export const LocationService = {
    checkLocationPermission,
    requestLocationPermission,
    getCurrentLocation,
    getLastKnownLocation,
    calculateDistance,
    formatDistance,
};

export default LocationService;
