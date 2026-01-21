
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import offlineManager from '../src/services/OfflineManager';

export const OfflineBanner = () => {
    const [isOffline, setIsOffline] = useState(!offlineManager.getNetworkStatus());
    const insets = useSafeAreaInsets();

    useEffect(() => {
        // Initial check
        setIsOffline(!offlineManager.getNetworkStatus());

        // Listen for changes
        const unsubscribe = offlineManager.addNetworkListener((isConnected) => {
            setIsOffline(!isConnected);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    if (!isOffline) return null;

    return (
        <View style={[styles.container, { top: insets.top + 45 }]}>
            <Ionicons name="cloud-offline" size={20} color="#fff" />
            <Text style={styles.text}>You are currently offline</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: '#FF6B6B',
        paddingVertical: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        gap: 8,
    },
    text: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});
