/**
 * Custom Locations Service
 * Allows users to add custom POIs that aren't on Google Maps
 * Stores locations in AsyncStorage per campus
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CampusLocation } from '../data/campusLocations';

const CUSTOM_LOCATIONS_KEY = 'edufi_custom_locations';

export interface CustomLocation extends CampusLocation {
    isCustom: true;
    addedBy?: string;
    addedAt: number;
}

/**
 * Get all custom locations for a campus
 */
export async function getCustomLocations(campusId: string): Promise<CustomLocation[]> {
    try {
        const stored = await AsyncStorage.getItem(CUSTOM_LOCATIONS_KEY);
        if (!stored) return [];

        const allLocations: Record<string, CustomLocation[]> = JSON.parse(stored);
        return allLocations[campusId] || [];
    } catch (error) {
        console.error('Error loading custom locations:', error);
        return [];
    }
}

/**
 * Save a custom location
 */
export async function saveCustomLocation(
    campusId: string,
    location: Omit<CustomLocation, 'id' | 'isCustom' | 'addedAt'>
): Promise<CustomLocation> {
    try {
        const stored = await AsyncStorage.getItem(CUSTOM_LOCATIONS_KEY);
        const allLocations: Record<string, CustomLocation[]> = stored
            ? JSON.parse(stored)
            : {};

        const newLocation: CustomLocation = {
            ...location,
            id: `custom-${campusId}-${Date.now()}`,
            isCustom: true,
            addedAt: Date.now(),
        };

        if (!allLocations[campusId]) {
            allLocations[campusId] = [];
        }
        allLocations[campusId].push(newLocation);

        await AsyncStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(allLocations));
        return newLocation;
    } catch (error) {
        console.error('Error saving custom location:', error);
        throw error;
    }
}

/**
 * Delete a custom location
 */
export async function deleteCustomLocation(campusId: string, locationId: string): Promise<void> {
    try {
        const stored = await AsyncStorage.getItem(CUSTOM_LOCATIONS_KEY);
        if (!stored) return;

        const allLocations: Record<string, CustomLocation[]> = JSON.parse(stored);
        if (!allLocations[campusId]) return;

        allLocations[campusId] = allLocations[campusId].filter(loc => loc.id !== locationId);
        await AsyncStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(allLocations));
    } catch (error) {
        console.error('Error deleting custom location:', error);
        throw error;
    }
}

/**
 * Location type options for the picker
 */
export const LOCATION_TYPE_OPTIONS: { value: CampusLocation['type']; label: string }[] = [
    { value: 'building', label: 'Building' },
    { value: 'lecture', label: 'Lecture Hall' },
    { value: 'library', label: 'Library' },
    { value: 'cafeteria', label: 'Cafeteria/Food' },
    { value: 'sports', label: 'Sports' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'admin', label: 'Admin Office' },
    { value: 'gate', label: 'Gate/Entrance' },
];

export default {
    getCustomLocations,
    saveCustomLocation,
    deleteCustomLocation,
    LOCATION_TYPE_OPTIONS,
};
