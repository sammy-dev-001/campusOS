import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { api } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/NewThemeContext';
import { biometricService } from '../src/services/BiometricService';
import { sessionManager } from '../src/services/SessionManager';

interface Session {
    sessionId: string;
    deviceName: string;
    platform: string;
    lastActivity: string;
    isCurrent?: boolean;
}

export default function SecuritySettingsScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const styles = getStyles(theme);

    const [loading, setLoading] = useState(true);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    useEffect(() => {
        loadSecuritySettings();
    }, []);

    const loadSecuritySettings = async () => {
        try {
            // Check biometric
            const supported = await biometricService.isSupported();
            setBiometricAvailable(supported);

            if (supported) {
                const types = await biometricService.getBiometricTypes();
                setBiometricTypes(types);
                const enabled = await biometricService.isEnabled();
                setBiometricEnabled(enabled);
            }

            // Load sessions
            const response = await api.get('/sessions');
            setSessions(response.data?.data?.sessions || []);
            setCurrentSessionId(response.data?.data?.currentSessionId);
        } catch (error) {
            console.error('Error loading security settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleBiometric = async () => {
        if (biometricEnabled) {
            Alert.alert(
                'Disable Biometric Login',
                `Are you sure you want to disable ${biometricTypes[0] || 'biometric'} login?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Disable',
                        style: 'destructive',
                        onPress: async () => {
                            await biometricService.disable();
                            setBiometricEnabled(false);
                        },
                    },
                ]
            );
        } else {
            const userId = await sessionManager.getCurrentSession().then(s => s?.userId);
            if (userId) {
                const success = await biometricService.enable(userId);
                if (success) {
                    setBiometricEnabled(true);
                    Alert.alert('Success', `${biometricTypes[0] || 'Biometric'} login enabled!`);
                }
            }
        }
    };

    const terminateSession = async (sessionId: string) => {
        Alert.alert(
            'End Session',
            'This will log out the device. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'End Session',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/sessions/${sessionId}`);
                            setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to terminate session');
                        }
                    },
                },
            ]
        );
    };

    const terminateAllSessions = async () => {
        Alert.alert(
            'Log Out Everywhere',
            'This will end all sessions except the current one. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete('/sessions?keepCurrentSession=true', {
                                data: { currentSessionId },
                            });
                            setSessions(prev => prev.filter(s => s.sessionId === currentSessionId));
                            Alert.alert('Success', 'All other sessions have been terminated');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to terminate sessions');
                        }
                    },
                },
            ]
        );
    };

    const formatLastActivity = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>Security</ThemedText>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Biometric Section */}
                {biometricAvailable && (
                    <View style={styles.section}>
                        <ThemedText style={styles.sectionTitle}>Biometric Login</ThemedText>
                        <View style={styles.card}>
                            <View style={styles.settingRow}>
                                <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                                    <Ionicons
                                        name={biometricTypes[0]?.includes('Face') ? 'scan-outline' : 'finger-print-outline'}
                                        size={22}
                                        color={theme.primary}
                                    />
                                </View>
                                <View style={styles.settingInfo}>
                                    <Text style={[styles.settingTitle, { color: theme.text }]}>
                                        {biometricTypes[0] || 'Biometric'} Login
                                    </Text>
                                    <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                                        Quick and secure access
                                    </Text>
                                </View>
                                <Switch
                                    value={biometricEnabled}
                                    onValueChange={toggleBiometric}
                                    trackColor={{ false: '#767577', true: `${theme.primary}80` }}
                                    thumbColor={biometricEnabled ? theme.primary : '#f4f3f4'}
                                />
                            </View>
                        </View>
                    </View>
                )}

                {/* Active Sessions Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionTitle}>Active Sessions</ThemedText>
                        {sessions.length > 1 && (
                            <TouchableOpacity onPress={terminateAllSessions}>
                                <Text style={[styles.logoutAll, { color: '#FF5630' }]}>Log out all</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.card}>
                        {sessions.map((session, index) => (
                            <React.Fragment key={session.sessionId}>
                                {index > 0 && <View style={styles.divider} />}
                                <View style={styles.sessionRow}>
                                    <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                                        <Ionicons
                                            name={session.platform === 'ios' ? 'phone-portrait-outline' : 'phone-portrait-outline'}
                                            size={20}
                                            color={theme.primary}
                                        />
                                    </View>
                                    <View style={styles.sessionInfo}>
                                        <View style={styles.sessionHeader}>
                                            <Text style={[styles.sessionName, { color: theme.text }]}>
                                                {session.deviceName}
                                            </Text>
                                            {session.sessionId === currentSessionId && (
                                                <View style={styles.currentBadge}>
                                                    <Text style={styles.currentBadgeText}>This device</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.sessionDetail, { color: theme.textSecondary }]}>
                                            {session.platform} • {formatLastActivity(session.lastActivity)}
                                        </Text>
                                    </View>
                                    {session.sessionId !== currentSessionId && (
                                        <TouchableOpacity
                                            onPress={() => terminateSession(session.sessionId)}
                                            style={styles.endButton}
                                        >
                                            <Text style={styles.endButtonText}>End</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </React.Fragment>
                        ))}
                        {sessions.length === 0 && (
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No active sessions
                            </Text>
                        )}
                    </View>
                </View>

                {/* Password Section */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Account Security</ThemedText>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.settingRow}>
                            <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                                <Ionicons name="lock-closed-outline" size={22} color={theme.primary} />
                            </View>
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingTitle, { color: theme.text }]}>Change Password</Text>
                                <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                                    Update your password
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </ThemedView>
    );
}

const getStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1 },
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: Platform.OS === 'android' ? 50 : 60,
            paddingBottom: 16,
        },
        backButton: { padding: 8 },
        headerTitle: { fontSize: 18, fontWeight: '600' },
        content: { flex: 1, paddingHorizontal: 16 },
        section: { marginTop: 24 },
        sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        sectionTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.textSecondary,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        logoutAll: { fontSize: 14, fontWeight: '600' },
        card: { backgroundColor: theme.card, borderRadius: 16, overflow: 'hidden' },
        settingRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: 10,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        settingInfo: { flex: 1 },
        settingTitle: { fontSize: 16, fontWeight: '500' },
        settingSubtitle: { fontSize: 13, marginTop: 2 },
        divider: { height: 1, backgroundColor: theme.border || '#333', marginLeft: 68 },
        sessionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
        },
        sessionInfo: { flex: 1 },
        sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        sessionName: { fontSize: 15, fontWeight: '500' },
        sessionDetail: { fontSize: 13, marginTop: 2 },
        currentBadge: {
            backgroundColor: '#4CAF50',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
        },
        currentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
        endButton: {
            backgroundColor: '#FF563020',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 8,
        },
        endButtonText: { color: '#FF5630', fontWeight: '600', fontSize: 13 },
        emptyText: { padding: 20, textAlign: 'center' },
    });
