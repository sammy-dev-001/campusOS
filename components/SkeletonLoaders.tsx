/**
 * Skeleton Loading Components
 * Provides animated loading skeletons for various UI elements
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../src/contexts/NewThemeContext';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

/**
 * Base skeleton component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style,
}) => {
    const { theme } = useTheme();
    const shimmerValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [shimmerValue]);

    const opacity = shimmerValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: theme.card || '#2a2a2a',
                    opacity,
                },
                style,
            ]}
        />
    );
};

/**
 * Card skeleton for posts, events, etc.
 */
export const CardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: theme.card || '#1E1E1E' }, style]}>
            {/* Header with avatar and title */}
            <View style={styles.cardHeader}>
                <Skeleton width={48} height={48} borderRadius={24} />
                <View style={styles.cardHeaderText}>
                    <Skeleton width="60%" height={16} />
                    <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
                </View>
            </View>
            {/* Content */}
            <Skeleton width="100%" height={14} style={{ marginTop: 16 }} />
            <Skeleton width="90%" height={14} style={{ marginTop: 8 }} />
            <Skeleton width="70%" height={14} style={{ marginTop: 8 }} />
            {/* Image placeholder */}
            <Skeleton width="100%" height={180} borderRadius={12} style={{ marginTop: 16 }} />
            {/* Actions */}
            <View style={styles.cardActions}>
                <Skeleton width={60} height={24} borderRadius={12} />
                <Skeleton width={60} height={24} borderRadius={12} />
                <Skeleton width={60} height={24} borderRadius={12} />
            </View>
        </View>
    );
};

/**
 * List item skeleton
 */
export const ListItemSkeleton: React.FC<{ style?: ViewStyle; showImage?: boolean }> = ({
    style,
    showImage = true,
}) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.listItem, { backgroundColor: theme.card || '#1E1E1E' }, style]}>
            {showImage && <Skeleton width={56} height={56} borderRadius={12} />}
            <View style={[styles.listItemContent, { marginLeft: showImage ? 12 : 0 }]}>
                <Skeleton width="70%" height={16} />
                <Skeleton width="50%" height={12} style={{ marginTop: 6 }} />
            </View>
            <Skeleton width={24} height={24} borderRadius={12} />
        </View>
    );
};

/**
 * Profile skeleton
 */
export const ProfileSkeleton: React.FC = () => {
    const { theme } = useTheme();

    return (
        <View style={[styles.profile, { backgroundColor: theme.card || '#1E1E1E' }]}>
            {/* Cover photo */}
            <Skeleton width="100%" height={120} borderRadius={0} />
            {/* Avatar */}
            <View style={styles.profileAvatar}>
                <Skeleton width={100} height={100} borderRadius={50} />
            </View>
            {/* Info */}
            <View style={styles.profileInfo}>
                <Skeleton width="40%" height={24} />
                <Skeleton width="60%" height={14} style={{ marginTop: 8 }} />
                <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
            </View>
            {/* Stats */}
            <View style={styles.profileStats}>
                <View style={styles.profileStat}>
                    <Skeleton width={40} height={20} />
                    <Skeleton width={50} height={12} style={{ marginTop: 4 }} />
                </View>
                <View style={styles.profileStat}>
                    <Skeleton width={40} height={20} />
                    <Skeleton width={50} height={12} style={{ marginTop: 4 }} />
                </View>
                <View style={styles.profileStat}>
                    <Skeleton width={40} height={20} />
                    <Skeleton width={50} height={12} style={{ marginTop: 4 }} />
                </View>
            </View>
        </View>
    );
};

/**
 * Event card skeleton
 */
export const EventCardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.eventCard, { backgroundColor: theme.card || '#1E1E1E' }, style]}>
            <Skeleton width="100%" height={140} borderRadius={12} />
            <View style={styles.eventInfo}>
                <View style={styles.eventDate}>
                    <Skeleton width={40} height={20} />
                    <Skeleton width={30} height={14} style={{ marginTop: 4 }} />
                </View>
                <View style={styles.eventDetails}>
                    <Skeleton width="80%" height={18} />
                    <Skeleton width="60%" height={14} style={{ marginTop: 6 }} />
                    <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
                </View>
            </View>
        </View>
    );
};

/**
 * Chat list skeleton
 */
export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
    return (
        <View>
            {Array.from({ length: count }).map((_, index) => (
                <ListItemSkeleton key={index} style={{ marginBottom: 8 }} />
            ))}
        </View>
    );
};

/**
 * Class schedule skeleton
 */
export const ClassSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.classCard, { backgroundColor: theme.card || '#1E1E1E' }, style]}>
            <View style={styles.classTime}>
                <Skeleton width={70} height={28} borderRadius={14} />
            </View>
            <Skeleton width="70%" height={20} style={{ marginTop: 12 }} />
            <Skeleton width="50%" height={14} style={{ marginTop: 6 }} />
            <View style={styles.classLocation}>
                <Skeleton width={16} height={16} borderRadius={8} />
                <Skeleton width={80} height={14} style={{ marginLeft: 6 }} />
            </View>
            <Skeleton width="100%" height={40} borderRadius={10} style={{ marginTop: 12 }} />
        </View>
    );
};

/**
 * Study group skeleton
 */
export const StudyGroupSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.studyGroup, { backgroundColor: theme.card || '#1E1E1E' }, style]}>
            <View style={styles.studyGroupHeader}>
                <Skeleton width={40} height={40} borderRadius={10} />
                <Skeleton width="60%" height={16} style={{ marginLeft: 10 }} />
            </View>
            <View style={styles.studyGroupMembers}>
                <Skeleton width={16} height={16} borderRadius={8} />
                <Skeleton width={80} height={12} style={{ marginLeft: 6 }} />
            </View>
            <Skeleton width="100%" height={36} style={{ marginTop: 6 }} />
            <Skeleton width="100%" height={40} borderRadius={10} style={{ marginTop: 12 }} />
        </View>
    );
};

/**
 * Feed skeleton - multiple cards
 */
export const FeedSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
    return (
        <View style={styles.feed}>
            {Array.from({ length: count }).map((_, index) => (
                <CardSkeleton key={index} style={{ marginBottom: 16 }} />
            ))}
        </View>
    );
};

/**
 * Home screen skeleton
 */
export const HomeSkeleton: React.FC = () => {
    return (
        <View style={styles.home}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
                {Array.from({ length: 4 }).map((_, index) => (
                    <View key={index} style={styles.quickAction}>
                        <Skeleton width={60} height={60} borderRadius={15} />
                        <Skeleton width={50} height={12} style={{ marginTop: 8 }} />
                    </View>
                ))}
            </View>

            {/* Today's Classes */}
            <Skeleton width={140} height={20} style={{ marginTop: 24, marginBottom: 12 }} />
            <View style={styles.classesRow}>
                <ClassSkeleton style={{ width: 250, marginRight: 15 }} />
                <ClassSkeleton style={{ width: 250 }} />
            </View>

            {/* Study Groups */}
            <Skeleton width={120} height={20} style={{ marginTop: 24, marginBottom: 12 }} />
            <View style={styles.studyGroupsRow}>
                <StudyGroupSkeleton style={{ width: '48%' }} />
                <StudyGroupSkeleton style={{ width: '48%' }} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardHeaderText: {
        flex: 1,
        marginLeft: 12,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    listItemContent: {
        flex: 1,
    },
    profile: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    profileAvatar: {
        alignItems: 'center',
        marginTop: -50,
    },
    profileInfo: {
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 12,
    },
    profileStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    profileStat: {
        alignItems: 'center',
    },
    eventCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    eventInfo: {
        flexDirection: 'row',
        padding: 12,
    },
    eventDate: {
        alignItems: 'center',
        marginRight: 12,
    },
    eventDetails: {
        flex: 1,
    },
    classCard: {
        borderRadius: 20,
        padding: 15,
    },
    classTime: {
        alignSelf: 'flex-start',
    },
    classLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    studyGroup: {
        borderRadius: 20,
        padding: 15,
    },
    studyGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    studyGroupMembers: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    feed: {
        paddingHorizontal: 16,
    },
    home: {
        paddingHorizontal: 16,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
    },
    quickAction: {
        alignItems: 'center',
    },
    classesRow: {
        flexDirection: 'row',
    },
    studyGroupsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});

export default {
    Skeleton,
    CardSkeleton,
    ListItemSkeleton,
    ProfileSkeleton,
    EventCardSkeleton,
    ChatListSkeleton,
    ClassSkeleton,
    StudyGroupSkeleton,
    FeedSkeleton,
    HomeSkeleton,
};
