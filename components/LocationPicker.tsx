/**
 * Location Picker Component
 * Allows users to select/view location when adding transactions
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import { TransactionLocation } from '../src/contexts/FinanceContext';
import { useTheme } from '../src/contexts/NewThemeContext';
import { getCurrentLocation, LocationData } from '../src/services/locationService';
import { EduFiColors } from '../src/theme/edufi';

interface LocationPickerProps {
    value?: TransactionLocation | null;
    onChange: (location: TransactionLocation | null) => void;
    disabled?: boolean;
}

export default function LocationPicker({ value, onChange, disabled }: LocationPickerProps) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [tempLocation, setTempLocation] = useState<TransactionLocation | null>(value || null);

    const handleGetCurrentLocation = async () => {
        setLoading(true);
        try {
            const location = await getCurrentLocation();
            if (location) {
                const newLocation: TransactionLocation = {
                    latitude: location.coordinates.latitude,
                    longitude: location.coordinates.longitude,
                    address: location.address,
                };
                onChange(newLocation);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMapPress = (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        setTempLocation({ latitude, longitude });
    };

    const handleConfirmLocation = () => {
        onChange(tempLocation);
        setShowMap(false);
    };

    const handleRemoveLocation = () => {
        onChange(null);
    };

    if (value) {
        // Show selected location
        return (
            <View style={[styles.container, { backgroundColor: theme.card }]}>
                <View style={styles.locationInfo}>
                    <Ionicons name="location" size={20} color={EduFiColors.primary} />
                    <View style={styles.locationText}>
                        <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                            {value.address || `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`}
                        </Text>
                        <Text style={[styles.coordsText, { color: theme.textSecondary }]}>
                            Location tagged
                        </Text>
                    </View>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => setShowMap(true)} style={styles.actionButton}>
                        <Ionicons name="map" size={18} color={EduFiColors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleRemoveLocation} style={styles.actionButton}>
                        <Ionicons name="close-circle" size={18} color="#F44336" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Show add location button
    return (
        <>
            <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.card }, disabled && styles.disabled]}
                onPress={handleGetCurrentLocation}
                disabled={disabled || loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={EduFiColors.primary} />
                ) : (
                    <>
                        <Ionicons name="location-outline" size={20} color={EduFiColors.primary} />
                        <Text style={[styles.addButtonText, { color: EduFiColors.primary }]}>
                            Add Location
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Map Modal */}
            <Modal visible={showMap} animationType="slide">
                <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <View style={[styles.modalHeader, { backgroundColor: theme.card }]}>
                        <TouchableOpacity onPress={() => setShowMap(false)}>
                            <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Select Location</Text>
                        <TouchableOpacity onPress={handleConfirmLocation}>
                            <Text style={{ color: EduFiColors.primary, fontWeight: '600' }}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <MapView
                        style={styles.map}
                        provider={PROVIDER_DEFAULT}
                        initialRegion={{
                            latitude: tempLocation?.latitude || 6.5244,
                            longitude: tempLocation?.longitude || 3.3792,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        onPress={handleMapPress}
                        showsUserLocation
                    >
                        <UrlTile
                            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                            maximumZ={19}
                        />
                        {tempLocation && (
                            <Marker
                                coordinate={{
                                    latitude: tempLocation.latitude,
                                    longitude: tempLocation.longitude,
                                }}
                                pinColor={EduFiColors.primary}
                            />
                        )}
                    </MapView>

                    <View style={[styles.mapHint, { backgroundColor: theme.card }]}>
                        <Ionicons name="information-circle" size={16} color={theme.textSecondary} />
                        <Text style={[styles.hintText, { color: theme.textSecondary }]}>
                            Tap on the map to select a location
                        </Text>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        marginVertical: 8,
    },
    locationInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        marginLeft: 10,
        flex: 1,
    },
    addressText: {
        fontSize: 14,
        fontWeight: '500',
    },
    coordsText: {
        fontSize: 12,
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 10,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: EduFiColors.primary,
        borderStyle: 'dashed',
    },
    addButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    disabled: {
        opacity: 0.5,
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 50,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    map: {
        flex: 1,
    },
    mapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
    },
    hintText: {
        marginLeft: 8,
        fontSize: 14,
    },
});
