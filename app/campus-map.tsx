/**
 * Campus Map Screen
 * Interactive map showing campus buildings and navigation
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../src/contexts/NewThemeContext';
import {
    Campus,
    CampusLocation,
    getCampusById,
    getCampusOptions,
    getLocationTypeColor,
    getLocationTypeIcon,
    SAMPLE_CAMPUSES,
} from '../src/data/campusLocations';
import { EduFiColors } from '../src/theme/edufi';
import {
    CustomLocation,
    getCustomLocations,
    saveCustomLocation,
    deleteCustomLocation,
    LOCATION_TYPE_OPTIONS,
} from '../src/services/customLocationsService';

const { width, height } = Dimensions.get('window');

export default function CampusMapScreen() {
    const { theme } = useTheme();
    const router = useRouter();

    const [selectedCampus, setSelectedCampus] = useState<Campus>(SAMPLE_CAMPUSES[0]);
    const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCampusPicker, setShowCampusPicker] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    // Custom locations state
    const [customLocations, setCustomLocations] = useState<CustomLocation[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newLocation, setNewLocation] = useState({
        name: '',
        type: 'building' as CampusLocation['type'],
        description: '',
        coordinates: { latitude: 0, longitude: 0 },
    });

    // Load custom locations when campus changes
    useEffect(() => {
        loadCustomLocations();
    }, [selectedCampus.id]);

    const loadCustomLocations = async () => {
        const locs = await getCustomLocations(selectedCampus.id);
        setCustomLocations(locs);
    };

    // Combine built-in and custom locations
    const allLocations = [...selectedCampus.locations, ...customLocations];

    const filteredLocations = allLocations.filter(loc =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleMarkerPress = (location: CampusLocation) => {
        setSelectedLocation(location);
    };

    // Handle long press on map to get coordinates for new location
    const handleMapLongPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setNewLocation(prev => ({
            ...prev,
            coordinates: { latitude, longitude },
        }));
        setShowAddModal(true);
    };

    // Use current GPS location for new place
    const handleUseMyLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is needed to use this feature');
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            setNewLocation(prev => ({
                ...prev,
                coordinates: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                },
            }));
            Alert.alert('📍 Got it!', 'Your current position has been marked');
        } catch (error) {
            Alert.alert('Error', 'Could not get your location. Make sure GPS is enabled.');
        }
    };

    // Save a new custom location
    const handleSaveLocation = async () => {
        if (!newLocation.name.trim()) {
            Alert.alert('Error', 'Please enter a location name');
            return;
        }
        if (newLocation.coordinates.latitude === 0 && newLocation.coordinates.longitude === 0) {
            // Use campus center as default
            setNewLocation(prev => ({
                ...prev,
                coordinates: selectedCampus.centerCoordinates,
            }));
        }

        try {
            await saveCustomLocation(selectedCampus.id, {
                name: newLocation.name,
                type: newLocation.type,
                description: newLocation.description,
                coordinates: newLocation.coordinates.latitude === 0
                    ? selectedCampus.centerCoordinates
                    : newLocation.coordinates,
            });

            // Reload and reset
            await loadCustomLocations();
            setNewLocation({
                name: '',
                type: 'building',
                description: '',
                coordinates: { latitude: 0, longitude: 0 },
            });
            setShowAddModal(false);
            Alert.alert('Success', 'Location added! It will appear on the map.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save location');
        }
    };

    // Open Google Maps or Apple Maps for directions
    const openDirections = async (location: CampusLocation) => {
        const { latitude, longitude } = location.coordinates;
        const label = encodeURIComponent(location.name);

        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${label}`;
        const appleMapsUrl = `maps://app?daddr=${latitude},${longitude}&q=${label}`;
        const googleMapsDeepLink = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;

        try {
            if (Platform.OS === 'ios') {
                // Try Apple Maps first on iOS
                const canOpenApple = await Linking.canOpenURL(appleMapsUrl);
                if (canOpenApple) {
                    await Linking.openURL(appleMapsUrl);
                    return;
                }
            }

            // Try Google Maps deep link on Android
            if (Platform.OS === 'android') {
                const canOpenGeo = await Linking.canOpenURL(googleMapsDeepLink);
                if (canOpenGeo) {
                    await Linking.openURL(googleMapsDeepLink);
                    return;
                }
            }

            // Fallback to web Google Maps
            await Linking.openURL(googleMapsUrl);
        } catch (error) {
            Alert.alert('Error', 'Could not open maps application');
        }
    };

    // Share location
    const handleShareLocation = async (location: CampusLocation) => {
        const { latitude, longitude } = location.coordinates;
        // Create a universal Google Maps link
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

        try {
            await Share.share({
                message: `Check out ${location.name} at ${selectedCampus.shortName}! \n${url}`,
                url: url, // iOS adds this as a link
                title: `Share ${location.name}`, // Android title
            });
        } catch (error) {
            Alert.alert('Error', 'Could not share location');
        }
    };

    const renderLocationCard = ({ item }: { item: CampusLocation }) => (
        <TouchableOpacity
            style={[styles.locationCard, { backgroundColor: theme.card }]}
            onPress={() => handleMarkerPress(item)}
        >
            <View style={[styles.locationIcon, { backgroundColor: getLocationTypeColor(item.type) }]}>
                <Ionicons
                    name={getLocationTypeIcon(item.type) as any}
                    size={20}
                    color="#fff"
                />
            </View>
            <View style={styles.locationInfo}>
                <Text style={[styles.locationName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.locationType, { color: theme.textSecondary }]}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Campus Map</Text>
                <TouchableOpacity
                    onPress={() => setShowCampusPicker(true)}
                    style={styles.campusSelector}
                >
                    <Text style={[styles.campusName, { color: EduFiColors.primary }]}>
                        {selectedCampus.shortName}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={EduFiColors.primary} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
                <Ionicons name="search" size={20} color={theme.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search buildings..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Map View */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={{
                        latitude: selectedCampus.centerCoordinates.latitude,
                        longitude: selectedCampus.centerCoordinates.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    region={{
                        latitude: selectedLocation?.coordinates.latitude || selectedCampus.centerCoordinates.latitude,
                        longitude: selectedLocation?.coordinates.longitude || selectedCampus.centerCoordinates.longitude,
                        latitudeDelta: selectedLocation ? 0.005 : 0.01,
                        longitudeDelta: selectedLocation ? 0.005 : 0.01,
                    }}
                    onMapReady={() => setMapReady(true)}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    mapType="standard"
                    onLongPress={handleMapLongPress}
                >

                    {/* Campus Location Markers */}
                    {filteredLocations.map(location => (
                        <Marker
                            key={location.id}
                            coordinate={location.coordinates}
                            title={location.name}
                            description={location.description}
                            onPress={() => handleMarkerPress(location)}
                            pinColor={getLocationTypeColor(location.type)}
                        />
                    ))}
                </MapView>

                {!mapReady && (
                    <View style={styles.mapLoading}>
                        <ActivityIndicator size="large" color={EduFiColors.primary} />
                        <Text style={{ color: theme.text, marginTop: 10 }}>Loading map...</Text>
                    </View>
                )}
            </View>

            {/* Location List */}
            <View style={[styles.listContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.listTitle, { color: theme.text }]}>
                    {searchQuery ? `Search Results (${filteredLocations.length})` : 'Campus Locations'}
                </Text>
                <FlatList
                    data={filteredLocations}
                    renderItem={renderLocationCard}
                    keyExtractor={item => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            </View>

            {/* Selected Location Detail */}
            {selectedLocation && (
                <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                    <View style={styles.detailHeader}>
                        <View style={[styles.detailIcon, { backgroundColor: getLocationTypeColor(selectedLocation.type) }]}>
                            <Ionicons
                                name={getLocationTypeIcon(selectedLocation.type) as any}
                                size={24}
                                color="#fff"
                            />
                        </View>
                        <View style={styles.detailInfo}>
                            <Text style={[styles.detailName, { color: theme.text }]}>
                                {selectedLocation.name}
                            </Text>
                            <Text style={[styles.detailType, { color: theme.textSecondary }]}>
                                {selectedLocation.type.charAt(0).toUpperCase() + selectedLocation.type.slice(1)}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedLocation(null)}>
                            <Ionicons name="close" size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    {selectedLocation.description && (
                        <Text style={[styles.detailDescription, { color: theme.text }]}>
                            {selectedLocation.description}
                        </Text>
                    )}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: EduFiColors.primary }]}
                            onPress={() => openDirections(selectedLocation)}
                        >
                            <Ionicons name="navigate" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Directions</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
                            onPress={() => handleShareLocation(selectedLocation)}
                        >
                            <Ionicons name="share-social" size={18} color={theme.text} />
                            <Text style={[styles.actionButtonText, { color: theme.text }]}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Campus Picker Modal */}
            <Modal visible={showCampusPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Select Campus</Text>
                        <ScrollView>
                            {SAMPLE_CAMPUSES.map(campus => (
                                <TouchableOpacity
                                    key={campus.id}
                                    style={[
                                        styles.campusOption,
                                        selectedCampus.id === campus.id && styles.campusOptionSelected,
                                    ]}
                                    onPress={() => {
                                        setSelectedCampus(campus);
                                        setSelectedLocation(null);
                                        setShowCampusPicker(false);
                                    }}
                                >
                                    <Text style={[styles.campusOptionName, { color: theme.text }]}>
                                        {campus.name}
                                    </Text>
                                    <Text style={[styles.campusOptionCity, { color: theme.textSecondary }]}>
                                        {campus.city}
                                    </Text>
                                    {selectedCampus.id === campus.id && (
                                        <Ionicons name="checkmark" size={20} color={EduFiColors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.modalClose, { backgroundColor: EduFiColors.primary }]}
                            onPress={() => setShowCampusPicker(false)}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add Location Modal */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Place</Text>

                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                            {newLocation.coordinates.latitude !== 0
                                ? '📍 Location selected on map'
                                : '💡 Tip: Long-press on map to pick exact location'}
                        </Text>

                        <TouchableOpacity
                            style={[styles.useLocationButton, { borderColor: EduFiColors.primary }]}
                            onPress={handleUseMyLocation}
                        >
                            <Ionicons name="locate" size={18} color={EduFiColors.primary} />
                            <Text style={{ color: EduFiColors.primary, fontWeight: '600', marginLeft: 8 }}>
                                Use My Current Location
                            </Text>
                        </TouchableOpacity>

                        <TextInput
                            style={[styles.formInput, { color: theme.text, borderColor: theme.border }]}
                            placeholder="Place name *"
                            placeholderTextColor={theme.textSecondary}
                            value={newLocation.name}
                            onChangeText={(text) => setNewLocation(prev => ({ ...prev, name: text }))}
                        />

                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            {LOCATION_TYPE_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.typeChip,
                                        { borderColor: theme.border },
                                        newLocation.type === opt.value && { backgroundColor: EduFiColors.primary },
                                    ]}
                                    onPress={() => setNewLocation(prev => ({ ...prev, type: opt.value }))}
                                >
                                    <Text style={[
                                        styles.typeChipText,
                                        { color: newLocation.type === opt.value ? '#fff' : theme.text }
                                    ]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput
                            style={[styles.formInput, styles.textArea, { color: theme.text, borderColor: theme.border }]}
                            placeholder="Description (optional)"
                            placeholderTextColor={theme.textSecondary}
                            value={newLocation.description}
                            onChangeText={(text) => setNewLocation(prev => ({ ...prev, description: text }))}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor: theme.border }]}
                                onPress={() => setShowAddModal(false)}
                            >
                                <Text style={{ color: theme.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: EduFiColors.primary }]}
                                onPress={handleSaveLocation}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Save Place</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Place FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: EduFiColors.primary }]}
                onPress={() => setShowAddModal(true)}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? 40 : 12,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        marginLeft: 8,
    },
    campusSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    campusName: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
    },
    mapContainer: {
        flex: 1,
        minHeight: height * 0.35,
    },
    map: {
        flex: 1,
    },
    mapLoading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    listContainer: {
        paddingVertical: 12,
        paddingBottom: 80, // Above phone nav area
        marginBottom: 20,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 16,
        marginBottom: 8,
    },
    listContent: {
        paddingHorizontal: 12,
        paddingBottom: 16,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 4,
        borderRadius: 12,
        width: 200,
    },
    locationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationInfo: {
        flex: 1,
        marginLeft: 12,
    },
    locationName: {
        fontSize: 14,
        fontWeight: '600',
    },
    locationType: {
        fontSize: 12,
        marginTop: 2,
    },
    detailCard: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        borderRadius: 16,
        padding: 16,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        zIndex: 100,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailInfo: {
        flex: 1,
        marginLeft: 12,
    },
    detailName: {
        fontSize: 18,
        fontWeight: '600',
    },
    detailType: {
        fontSize: 14,
    },
    detailDescription: {
        fontSize: 14,
        marginTop: 12,
        lineHeight: 20,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        marginHorizontal: 6,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: height * 0.6,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    campusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    campusOptionSelected: {
        backgroundColor: 'rgba(11, 60, 93, 0.1)',
    },
    campusOptionName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    campusOptionCity: {
        fontSize: 14,
        marginRight: 8,
    },
    modalClose: {
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 16,
        alignItems: 'center',
    },
    modalCloseText: {
        color: '#fff',
        fontWeight: '600',
    },
    // Add Location modal styles
    inputLabel: {
        fontSize: 12,
        marginBottom: 8,
        marginTop: 4,
    },
    formInput: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 12,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    typeChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    typeChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
    },
    fab: {
        position: 'absolute',
        bottom: 180,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    useLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 12,
    },
});
