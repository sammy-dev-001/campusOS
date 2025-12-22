import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { api } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/NewThemeContext';

interface Match {
    id: string;
    user: {
        _id: string;
        displayName: string;
        username: string;
        profilePic?: string;
    };
    matchScore: number;
    sharedSubjects: Array<{ courseCode: string; name: string }>;
    scheduleOverlap: Array<{ day: string; startTime: string; endTime: string }>;
    studyStyle?: string;
    preferredEnvironment?: string;
    bio?: string;
    major?: string;
    year?: string;
}

interface Buddy {
    id: string;
    displayName: string;
    username: string;
    profilePic?: string;
    onlineStatus?: string;
    connectedAt: string;
    matchScore?: number;
}

interface PendingRequest {
    _id: string;
    sender: {
        _id: string;
        displayName: string;
        username: string;
        profilePic?: string;
    };
    message?: string;
    matchScore?: number;
    sharedSubjects?: Array<{ courseCode: string; name: string }>;
    createdAt: string;
}

type TabType = 'matches' | 'buddies' | 'requests';

export default function StudyBuddyScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const styles = getStyles(theme);

    const [activeTab, setActiveTab] = useState<TabType>('matches');
    const [matches, setMatches] = useState<Match[]>([]);
    const [buddies, setBuddies] = useState<Buddy[]>([]);
    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasProfile, setHasProfile] = useState<boolean | null>(null);

    useEffect(() => {
        checkProfile();
    }, []);

    useEffect(() => {
        if (hasProfile === true) {
            loadData();
        }
    }, [activeTab, hasProfile]);

    const checkProfile = async () => {
        try {
            const response = await api.get('/study-buddy/profile');
            setHasProfile(!!response.data?.data?.profile);
        } catch (error) {
            console.error('Error checking profile:', error);
            setHasProfile(false);
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            switch (activeTab) {
                case 'matches':
                    const matchesRes = await api.get('/study-buddy/matches');
                    setMatches(matchesRes.data?.data?.matches || []);
                    break;
                case 'buddies':
                    const buddiesRes = await api.get('/study-buddy/buddies');
                    setBuddies(buddiesRes.data?.data?.buddies || []);
                    break;
                case 'requests':
                    const requestsRes = await api.get('/study-buddy/requests');
                    setRequests(requestsRes.data?.data?.requests || []);
                    break;
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [activeTab]);

    const sendRequest = async (userId: string) => {
        try {
            await api.post(`/study-buddy/request/${userId}`);
            Alert.alert('Success', 'Study buddy request sent!');
            // Remove from matches list
            setMatches((prev) => prev.filter((m) => m.id !== userId));
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to send request');
        }
    };

    const handleRequest = async (requestId: string, action: 'accept' | 'reject') => {
        try {
            await api.patch(`/study-buddy/requests/${requestId}`, { action });
            Alert.alert('Success', action === 'accept' ? 'Study buddy added!' : 'Request declined');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to process request');
        }
    };

    const renderMatch = ({ item }: { item: Match }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                {item.user.profilePic ? (
                    <Image source={{ uri: item.user.profilePic }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                            {item.user.displayName?.charAt(0) || item.user.username?.charAt(0) || '?'}
                        </Text>
                    </View>
                )}
                <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: theme.text }]}>
                        {item.user.displayName || item.user.username}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                        {item.major} {item.year && `• ${item.year}`}
                    </Text>
                </View>
                <View style={styles.matchBadge}>
                    <Text style={styles.matchScore}>{item.matchScore}%</Text>
                    <Text style={styles.matchLabel}>Match</Text>
                </View>
            </View>

            {item.sharedSubjects.length > 0 && (
                <View style={styles.tagContainer}>
                    {item.sharedSubjects.slice(0, 3).map((subject, index) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{subject.courseCode || subject.name}</Text>
                        </View>
                    ))}
                    {item.sharedSubjects.length > 3 && (
                        <Text style={[styles.moreText, { color: theme.textSecondary }]}>
                            +{item.sharedSubjects.length - 3} more
                        </Text>
                    )}
                </View>
            )}

            {item.bio && (
                <Text style={[styles.bio, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.bio}
                </Text>
            )}

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => sendRequest(item.id)}
                >
                    <Ionicons name="person-add-outline" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>Connect</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
                    <Ionicons name="chatbubble-outline" size={18} color={theme.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderBuddy = ({ item }: { item: Buddy }) => (
        <TouchableOpacity style={styles.buddyItem}>
            {item.profilePic ? (
                <Image source={{ uri: item.profilePic }} style={styles.buddyAvatar} />
            ) : (
                <View style={[styles.buddyAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                        {item.displayName?.charAt(0) || item.username?.charAt(0) || '?'}
                    </Text>
                </View>
            )}
            <View style={styles.buddyInfo}>
                <Text style={[styles.buddyName, { color: theme.text }]}>
                    {item.displayName || item.username}
                </Text>
                <View style={styles.statusRow}>
                    <View
                        style={[
                            styles.statusDot,
                            { backgroundColor: item.onlineStatus === 'online' ? '#4CAF50' : '#888' },
                        ]}
                    />
                    <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                        {item.onlineStatus === 'online' ? 'Online' : 'Offline'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity style={styles.chatButton}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderRequest = ({ item }: { item: PendingRequest }) => (
        <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
                {item.sender.profilePic ? (
                    <Image source={{ uri: item.sender.profilePic }} style={styles.requestAvatar} />
                ) : (
                    <View style={[styles.requestAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                            {item.sender.displayName?.charAt(0) || item.sender.username?.charAt(0) || '?'}
                        </Text>
                    </View>
                )}
                <View style={styles.requestInfo}>
                    <Text style={[styles.requestName, { color: theme.text }]}>
                        {item.sender.displayName || item.sender.username}
                    </Text>
                    {item.matchScore && (
                        <Text style={[styles.requestMatch, { color: theme.primary }]}>
                            {item.matchScore}% match
                        </Text>
                    )}
                </View>
            </View>
            {item.message && (
                <Text style={[styles.requestMessage, { color: theme.textSecondary }]}>"{item.message}"</Text>
            )}
            <View style={styles.requestActions}>
                <TouchableOpacity
                    style={[styles.requestButton, styles.acceptButton]}
                    onPress={() => handleRequest(item._id, 'accept')}
                >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.requestButton, styles.declineButton]}
                    onPress={() => handleRequest(item._id, 'reject')}
                >
                    <Text style={[styles.declineButtonText, { color: theme.textSecondary }]}>Decline</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Setup profile prompt
    if (hasProfile === false) {
        return (
            <ThemedView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <ThemedText style={styles.headerTitle}>Study Buddy</ThemedText>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="account-group-outline" size={80} color={theme.primary} />
                    <ThemedText style={styles.emptyTitle}>Find Your Study Partners</ThemedText>
                    <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                        Set up your study profile to get matched with students who share your courses and study
                        style.
                    </ThemedText>
                    <TouchableOpacity
                        style={[styles.setupButton, { backgroundColor: theme.primary }]}
                        onPress={() => router.push('/study-buddy-setup' as any)}
                    >
                        <Text style={styles.setupButtonText}>Set Up Profile</Text>
                    </TouchableOpacity>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>Study Buddy</ThemedText>
                <TouchableOpacity onPress={() => router.push('/study-buddy-setup' as any)}>
                    <Ionicons name="settings-outline" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {(['matches', 'buddies', 'requests'] as TabType[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                { color: activeTab === tab ? theme.primary : theme.textSecondary },
                            ]}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                        {tab === 'requests' && requests.length > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{requests.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'matches' ? matches : activeTab === 'buddies' ? buddies : requests}
                    renderItem={
                        activeTab === 'matches'
                            ? renderMatch
                            : activeTab === 'buddies'
                                ? renderBuddy
                                : renderRequest
                    }
                    keyExtractor={(item: any) => item.id || item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyList}>
                            <Ionicons
                                name={
                                    activeTab === 'matches'
                                        ? 'search-outline'
                                        : activeTab === 'buddies'
                                            ? 'people-outline'
                                            : 'mail-outline'
                                }
                                size={48}
                                color={theme.textSecondary}
                            />
                            <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>
                                {activeTab === 'matches'
                                    ? 'No matches found. Try updating your profile!'
                                    : activeTab === 'buddies'
                                        ? "You don't have any study buddies yet."
                                        : 'No pending requests.'}
                            </Text>
                        </View>
                    }
                />
            )}
        </ThemedView>
    );
}

const getStyles = (theme: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: Platform.OS === 'android' ? 50 : 60,
            paddingBottom: 16,
        },
        backButton: {
            padding: 8,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: '700',
        },
        tabs: {
            flexDirection: 'row',
            marginHorizontal: 16,
            marginBottom: 8,
            borderRadius: 12,
            backgroundColor: theme.card,
            padding: 4,
        },
        tab: {
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            borderRadius: 8,
        },
        activeTab: {
            backgroundColor: `${theme.primary}20`,
        },
        tabText: {
            fontSize: 14,
            fontWeight: '600',
        },
        badge: {
            backgroundColor: theme.primary,
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 2,
            marginLeft: 6,
        },
        badgeText: {
            color: '#fff',
            fontSize: 12,
            fontWeight: '600',
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        listContent: {
            paddingHorizontal: 16,
            paddingBottom: 24,
        },
        card: {
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        avatar: {
            width: 56,
            height: 56,
            borderRadius: 28,
        },
        avatarPlaceholder: {
            backgroundColor: theme.primary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        avatarText: {
            color: '#fff',
            fontSize: 20,
            fontWeight: '700',
        },
        cardInfo: {
            flex: 1,
            marginLeft: 12,
        },
        cardName: {
            fontSize: 17,
            fontWeight: '600',
        },
        cardSubtitle: {
            fontSize: 14,
            marginTop: 2,
        },
        matchBadge: {
            alignItems: 'center',
            backgroundColor: `${theme.primary}20`,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },
        matchScore: {
            color: theme.primary,
            fontSize: 18,
            fontWeight: '700',
        },
        matchLabel: {
            color: theme.primary,
            fontSize: 11,
        },
        tagContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: 12,
            alignItems: 'center',
        },
        tag: {
            backgroundColor: '#333',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginRight: 6,
            marginBottom: 4,
        },
        tagText: {
            color: '#fff',
            fontSize: 12,
        },
        moreText: {
            fontSize: 12,
        },
        bio: {
            marginTop: 10,
            fontSize: 14,
            lineHeight: 20,
        },
        cardActions: {
            flexDirection: 'row',
            marginTop: 14,
            gap: 10,
        },
        actionButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            borderRadius: 10,
            gap: 6,
        },
        primaryButton: {
            flex: 1,
            backgroundColor: theme.primary,
        },
        primaryButtonText: {
            color: '#fff',
            fontWeight: '600',
        },
        secondaryButton: {
            paddingHorizontal: 14,
            backgroundColor: `${theme.primary}20`,
        },
        buddyItem: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.card,
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
        },
        buddyAvatar: {
            width: 48,
            height: 48,
            borderRadius: 24,
        },
        buddyInfo: {
            flex: 1,
            marginLeft: 12,
        },
        buddyName: {
            fontSize: 16,
            fontWeight: '600',
        },
        statusRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 4,
        },
        statusDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            marginRight: 6,
        },
        statusText: {
            fontSize: 13,
        },
        chatButton: {
            padding: 8,
        },
        requestCard: {
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
        },
        requestHeader: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        requestAvatar: {
            width: 48,
            height: 48,
            borderRadius: 24,
        },
        requestInfo: {
            flex: 1,
            marginLeft: 12,
        },
        requestName: {
            fontSize: 16,
            fontWeight: '600',
        },
        requestMatch: {
            fontSize: 13,
            marginTop: 2,
        },
        requestMessage: {
            marginTop: 10,
            fontStyle: 'italic',
            fontSize: 14,
        },
        requestActions: {
            flexDirection: 'row',
            marginTop: 14,
            gap: 10,
        },
        requestButton: {
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
        },
        acceptButton: {
            backgroundColor: theme.primary,
        },
        acceptButtonText: {
            color: '#fff',
            fontWeight: '600',
        },
        declineButton: {
            backgroundColor: '#333',
        },
        declineButtonText: {
            fontWeight: '600',
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 32,
        },
        emptyTitle: {
            fontSize: 22,
            fontWeight: '700',
            marginTop: 20,
            textAlign: 'center',
        },
        emptyText: {
            fontSize: 15,
            textAlign: 'center',
            marginTop: 10,
            lineHeight: 22,
        },
        setupButton: {
            marginTop: 24,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 12,
        },
        setupButtonText: {
            color: '#fff',
            fontWeight: '700',
            fontSize: 16,
        },
        emptyList: {
            alignItems: 'center',
            paddingTop: 60,
        },
        emptyListText: {
            marginTop: 16,
            fontSize: 15,
            textAlign: 'center',
        },
    });
