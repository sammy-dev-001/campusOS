/**
 * Campus Map - Web Version
 * Fallback for web platform since react-native-maps is native-only
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/NewThemeContext';

export default function CampusMapWeb() {
    const { theme } = useTheme();
    const router = useRouter();

    const campuses = [
        {
            name: 'University of Lagos (UNILAG)',
            address: 'Akoka, Yaba, Lagos',
            mapUrl: 'https://www.google.com/maps/place/University+of+Lagos/@6.5158431,3.3895163,17z',
        },
        {
            name: 'Lagos State University (LASU)',
            address: 'Ojo, Lagos',
            mapUrl: 'https://www.google.com/maps/place/Lagos+State+University/@6.4525039,3.2071828,17z',
        },
        {
            name: 'University of Ibadan (UI)',
            address: 'Ibadan, Oyo State',
            mapUrl: 'https://www.google.com/maps/place/University+of+Ibadan/@7.4455886,3.8921046,17z',
        },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Campus Map</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Info Banner */}
            <View style={[styles.infoBanner, { backgroundColor: '#FFF3CD' }]}>
                <Ionicons name="information-circle" size={20} color="#856404" />
                <Text style={styles.infoText}>
                    Interactive maps are only available on mobile. Use the links below to open in Google Maps.
                </Text>
            </View>

            {/* Campus List */}
            <ScrollView style={styles.content} contentContainerStyle={{ padding: 16 }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Your Campus</Text>

                {campuses.map((campus, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.campusCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => window.open(campus.mapUrl, '_blank')}
                    >
                        <View style={styles.campusIcon}>
                            <Ionicons name="location" size={28} color="#2196F3" />
                        </View>
                        <View style={styles.campusInfo}>
                            <Text style={[styles.campusName, { color: theme.text }]}>{campus.name}</Text>
                            <Text style={[styles.campusAddress, { color: theme.textSecondary }]}>
                                {campus.address}
                            </Text>
                        </View>
                        <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                ))}

                <View style={[styles.tipCard, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="bulb" size={20} color="#1976D2" />
                    <Text style={[styles.tipText, { color: '#1976D2' }]}>
                        💡 Tip: For the full interactive campus map experience with navigation, location sharing, and custom markers, please use the mobile app.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 8,
        margin: 16,
        borderRadius: 8,
    },
    infoText: { flex: 1, fontSize: 13, color: '#856404' },
    content: { flex: 1 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
    campusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        gap: 12,
    },
    campusIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    campusInfo: { flex: 1 },
    campusName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    campusAddress: { fontSize: 13 },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
        gap: 12,
    },
    tipText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
