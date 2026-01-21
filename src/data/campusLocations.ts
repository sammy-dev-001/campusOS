/**
 * Campus Locations Data
 * Sample data for Nigerian university campuses
 */

export interface CampusLocation {
    id: string;
    name: string;
    type: 'building' | 'cafeteria' | 'library' | 'sports' | 'admin' | 'lecture' | 'hostel' | 'gate';
    coordinates: {
        latitude: number;
        longitude: number;
    };
    description?: string;
    iconName?: string;
}

export interface Campus {
    id: string;
    name: string;
    shortName: string;
    city: string;
    centerCoordinates: {
        latitude: number;
        longitude: number;
    };
    zoomLevel: number;
    locations: CampusLocation[];
}

// Sample campus data - University of Lagos (UNILAG)
export const SAMPLE_CAMPUSES: Campus[] = [
    {
        id: 'unilag',
        name: 'University of Lagos',
        shortName: 'UNILAG',
        city: 'Lagos',
        centerCoordinates: {
            latitude: 6.5195,
            longitude: 3.3970,
        },
        zoomLevel: 15,
        locations: [
            {
                id: 'unilag-main-gate',
                name: 'Main Gate',
                type: 'gate',
                coordinates: { latitude: 6.5175, longitude: 3.3965 },
                description: 'Main entrance to the university',
                iconName: 'business',
            },
            {
                id: 'unilag-library',
                name: 'Main Library',
                type: 'library',
                coordinates: { latitude: 6.5195, longitude: 3.3985 },
                description: 'Central library with study spaces',
                iconName: 'library',
            },
            {
                id: 'unilag-senate',
                name: 'Senate Building',
                type: 'admin',
                coordinates: { latitude: 6.5205, longitude: 3.3970 },
                description: 'Administrative headquarters',
                iconName: 'business',
            },
            {
                id: 'unilag-sci-lecture',
                name: 'Science Lecture Theatre',
                type: 'lecture',
                coordinates: { latitude: 6.5185, longitude: 3.3955 },
                description: 'Large lecture hall for science courses',
                iconName: 'school',
            },
            {
                id: 'unilag-cafeteria',
                name: 'Faculty Cafeteria',
                type: 'cafeteria',
                coordinates: { latitude: 6.5190, longitude: 3.3960 },
                description: 'Main student cafeteria',
                iconName: 'restaurant',
            },
            {
                id: 'unilag-sports',
                name: 'Sports Complex',
                type: 'sports',
                coordinates: { latitude: 6.5220, longitude: 3.3950 },
                description: 'Swimming pool, gym, and sports fields',
                iconName: 'football',
            },
            {
                id: 'unilag-moremi-hostel',
                name: 'Moremi Hall',
                type: 'hostel',
                coordinates: { latitude: 6.5210, longitude: 3.3990 },
                description: 'Female hostel',
                iconName: 'home',
            },
            {
                id: 'unilag-jaja-hostel',
                name: 'Jaja Hall',
                type: 'hostel',
                coordinates: { latitude: 6.5215, longitude: 3.3980 },
                description: 'Male hostel',
                iconName: 'home',
            },
        ],
    },
    {
        id: 'oau',
        name: 'Obafemi Awolowo University',
        shortName: 'OAU',
        city: 'Ile-Ife',
        centerCoordinates: {
            latitude: 7.5200,
            longitude: 4.5300,
        },
        zoomLevel: 14,
        locations: [
            {
                id: 'oau-main-gate',
                name: 'Main Gate',
                type: 'gate',
                coordinates: { latitude: 7.5180, longitude: 4.5280 },
                iconName: 'business',
            },
            {
                id: 'oau-library',
                name: 'Hezekiah Oluwasanmi Library',
                type: 'library',
                coordinates: { latitude: 7.5210, longitude: 4.5320 },
                description: 'Main university library',
                iconName: 'library',
            },
            {
                id: 'oau-oduduwa',
                name: 'Oduduwa Hall',
                type: 'lecture',
                coordinates: { latitude: 7.5220, longitude: 4.5310 },
                description: 'Large auditorium for events',
                iconName: 'school',
            },
        ],
    },
    {
        id: 'ui',
        name: 'University of Ibadan',
        shortName: 'UI',
        city: 'Ibadan',
        centerCoordinates: {
            latitude: 7.4400,
            longitude: 3.8990,
        },
        zoomLevel: 14,
        locations: [
            {
                id: 'ui-main-gate',
                name: 'Main Gate',
                type: 'gate',
                coordinates: { latitude: 7.4380, longitude: 3.8970 },
                iconName: 'business',
            },
            {
                id: 'ui-kenneth-dike',
                name: 'Kenneth Dike Library',
                type: 'library',
                coordinates: { latitude: 7.4410, longitude: 3.9000 },
                description: 'Main university library',
                iconName: 'library',
            },
        ],
    },
    {
        id: 'lasu',
        name: 'Lagos State University',
        shortName: 'LASU',
        city: 'Ojo, Lagos',
        centerCoordinates: {
            latitude: 6.4580,
            longitude: 3.1990,
        },
        zoomLevel: 15,
        locations: [
            {
                id: 'lasu-main-gate',
                name: 'Main Gate',
                type: 'gate',
                coordinates: { latitude: 6.4635, longitude: 3.1970 }, // Approximate update
                description: 'Main entrance to LASU',
                iconName: 'business',
            },
            // Removed other incorrect locations - users can now add their own correct spots!
        ],
    },
];

// Get campus by ID
export function getCampusById(campusId: string): Campus | undefined {
    return SAMPLE_CAMPUSES.find(c => c.id === campusId);
}

// Get all campus names for selection
export function getCampusOptions(): { id: string; name: string; city: string }[] {
    return SAMPLE_CAMPUSES.map(c => ({
        id: c.id,
        name: c.shortName,
        city: c.city,
    }));
}

// Get location type icon
export function getLocationTypeIcon(type: CampusLocation['type']): string {
    const icons: Record<CampusLocation['type'], string> = {
        building: 'business',
        cafeteria: 'restaurant',
        library: 'library',
        sports: 'football',
        admin: 'briefcase',
        lecture: 'school',
        hostel: 'home',
        gate: 'enter',
    };
    return icons[type] || 'location';
}

// Get location type color
export function getLocationTypeColor(type: CampusLocation['type']): string {
    const colors: Record<CampusLocation['type'], string> = {
        building: '#0B3C5D',
        cafeteria: '#FF6B6B',
        library: '#4CAF50',
        sports: '#FFD93D',
        admin: '#9C27B0',
        lecture: '#2196F3',
        hostel: '#FF9800',
        gate: '#607D8B',
    };
    return colors[type] || '#0B3C5D';
}

export default SAMPLE_CAMPUSES;
