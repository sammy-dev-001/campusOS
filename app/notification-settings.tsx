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
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { api } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/NewThemeContext';
import {
    arePushNotificationsEnabled,
    registerForPushNotificationsAsync,
    registerTokenWithBackend,
    removeTokenFromBackend,
} from '../src/services/PushNotificationManager';

interface NotificationPreferences {
    push: boolean;
    email: boolean;
    messages: boolean;
    mentions: boolean;
    classReminders: boolean;
    assignmentReminders: boolean;
    eventReminders: boolean;
    studyBuddyUpdates: boolean;
    announcements: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
}

const defaultPreferences: NotificationPreferences = {
    push: true,
    email: true,
    messages: true,
    mentions: true,
    classReminders: true,
    assignmentReminders: true,
    eventReminders: true,
    studyBuddyUpdates: true,
    announcements: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
};

export default function NotificationSettingsScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);

    useEffect(() => {
        loadPreferences();
        checkPushStatus();
    }, []);

    const checkPushStatus = async () => {
        const enabled = await arePushNotificationsEnabled();
        setPushEnabled(enabled);
    };

    const loadPreferences = async () => {
        try {
            const response = await api.get('/notifications/preferences');
            if (response.data?.data?.preferences) {
                setPreferences({ ...defaultPreferences, ...response.data.data.preferences });
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePreference = async (key: keyof NotificationPreferences, value: boolean | string) => {
        // Optimistic update
        setPreferences((prev) => ({ ...prev, [key]: value }));

        try {
            await api.put('/notifications/preferences', { [key]: value });
        } catch (error) {
            console.error('Error updating preference:', error);
            // Revert on error
            setPreferences((prev) => ({ ...prev, [key]: !value }));
            Alert.alert('Error', 'Failed to update preference. Please try again.');
        }
    };

    const handleEnablePush = async () => {
        if (pushEnabled) {
            // Disable push
            Alert.alert(
                'Disable Push Notifications',
                'Are you sure you want to disable push notifications?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Disable',
                        style: 'destructive',
                        onPress: async () => {
                            await removeTokenFromBackend();
                            setPushEnabled(false);
                            updatePreference('push', false);
                        },
                    },
                ]
            );
        } else {
            // Enable push
            const token = await registerForPushNotificationsAsync();
            if (token) {
                const success = await registerTokenWithBackend(token);
                if (success) {
                    setPushEnabled(true);
                    updatePreference('push', true);
                } else {
                    Alert.alert('Error', 'Failed to register for push notifications.');
                }
            } else {
                Alert.alert(
                    'Permission Required',
                    'Please enable notifications in your device settings to receive push notifications.'
                );
            }
        }
    };

    const sendTestNotification = async () => {
        setSaving(true);
        try {
            await api.post('/notifications/test');
            Alert.alert('Success', 'Test notification sent! You should receive it shortly.');
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to send test notification.'
            );
        } finally {
            setSaving(false);
        }
    };

    const styles = getStyles(theme);

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
                <ThemedText style={styles.headerTitle}>Notification Settings</ThemedText>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Push Notifications Section */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Push Notifications</ThemedText>
                    <View style={styles.card}>
                        <SettingRow
                            icon="notifications"
                            title="Enable Push Notifications"
                            subtitle={pushEnabled ? 'Notifications are enabled' : 'Tap to enable'}
                            value={pushEnabled}
                            onToggle={handleEnablePush}
                            theme={theme}
                        />
                        {pushEnabled && (
                            <TouchableOpacity
                                style={styles.testButton}
                                onPress={sendTestNotification}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                                        <ThemedText style={styles.testButtonText}>Send Test Notification</ThemedText>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Notification Types Section */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Notification Types</ThemedText>
                    <View style={styles.card}>
                        <SettingRow
                            icon="school-outline"
                            title="Class Reminders"
                            subtitle="Get notified before classes start"
                            value={preferences.classReminders}
                            onToggle={(value) => updatePreference('classReminders', value)}
                            theme={theme}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="document-text-outline"
                            title="Assignment Reminders"
                            subtitle="Deadline reminders for assignments"
                            value={preferences.assignmentReminders}
                            onToggle={(value) => updatePreference('assignmentReminders', value)}
                            theme={theme}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="calendar-outline"
                            title="Event Reminders"
                            subtitle="Upcoming event notifications"
                            value={preferences.eventReminders}
                            onToggle={(value) => updatePreference('eventReminders', value)}
                            theme={theme}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="chatbubble-outline"
                            title="Messages"
                            subtitle="New message notifications"
                            value={preferences.messages}
                            onToggle={(value) => updatePreference('messages', value)}
                            theme={theme}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="at-outline"
                            title="Mentions"
                            subtitle="When someone mentions you"
                            value={preferences.mentions}
                            onToggle={(value) => updatePreference('mentions', value)}
                            theme={theme}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="people-outline"
                            title="Study Buddy Updates"
                            subtitle="Match requests and updates"
                            value={preferences.studyBuddyUpdates}
                            onToggle={(value) => updatePreference('studyBuddyUpdates', value)}
                            theme={theme}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="megaphone-outline"
                            title="Announcements"
                            subtitle="Campus announcements"
                            value={preferences.announcements}
                            onToggle={(value) => updatePreference('announcements', value)}
                            theme={theme}
                        />
                    </View>
                </View>

                {/* Quiet Hours Section */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Quiet Hours</ThemedText>
                    <View style={styles.card}>
                        <SettingRow
                            icon="moon-outline"
                            title="Enable Quiet Hours"
                            subtitle={
                                preferences.quietHoursEnabled
                                    ? `${preferences.quietHoursStart} - ${preferences.quietHoursEnd}`
                                    : 'Silence notifications during set hours'
                            }
                            value={preferences.quietHoursEnabled}
                            onToggle={(value) => updatePreference('quietHoursEnabled', value)}
                            theme={theme}
                        />
                    </View>
                </View>

                {/* Email Notifications Section */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Email Notifications</ThemedText>
                    <View style={styles.card}>
                        <SettingRow
                            icon="mail-outline"
                            title="Email Notifications"
                            subtitle="Receive important updates via email"
                            value={preferences.email}
                            onToggle={(value) => updatePreference('email', value)}
                            theme={theme}
                        />
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </ThemedView>
    );
}

interface SettingRowProps {
    icon: string;
    title: string;
    subtitle: string;
    value: boolean;
    onToggle: (value: boolean) => void;
    theme: any;
}

const SettingRow: React.FC<SettingRowProps> = ({
    icon,
    title,
    subtitle,
    value,
    onToggle,
    theme,
}) => (
    <View style={rowStyles.container}>
        <View style={[rowStyles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
            <Ionicons name={icon as any} size={22} color={theme.primary} />
        </View>
        <View style={rowStyles.textContainer}>
            <ThemedText style={rowStyles.title}>{title}</ThemedText>
            <ThemedText style={[rowStyles.subtitle, { color: theme.textSecondary }]}>{subtitle}</ThemedText>
        </View>
        <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: '#767577', true: `${theme.primary}80` }}
            thumbColor={value ? theme.primary : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
        />
    </View>
);

const rowStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
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
    textContainer: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
});

const getStyles = (theme: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: Platform.OS === 'android' ? 50 : 60,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border || '#333',
        },
        backButton: {
            padding: 8,
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '600',
        },
        content: {
            flex: 1,
            paddingHorizontal: 16,
        },
        section: {
            marginTop: 24,
        },
        sectionTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.textSecondary,
            marginBottom: 12,
            paddingHorizontal: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        card: {
            backgroundColor: theme.card,
            borderRadius: 16,
            overflow: 'hidden',
        },
        divider: {
            height: 1,
            backgroundColor: theme.border || '#333',
            marginLeft: 68,
        },
        testButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.primary || '#4D96FF',
            marginHorizontal: 16,
            marginBottom: 16,
            paddingVertical: 12,
            borderRadius: 10,
            gap: 8,
        },
        testButtonText: {
            color: '#fff',
            fontWeight: '600',
            fontSize: 15,
        },
    });
