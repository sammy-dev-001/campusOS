/**
 * Skeleton Loader Component
 * Provides loading placeholders for various content types
 */

import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../src/contexts/NewThemeContext';

interface SkeletonProps {
    width?: DimensionValue;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
    const { theme } = useTheme();
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const shimmer = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        shimmer.start();
        return () => shimmer.stop();
    }, []);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: theme.border,
                    opacity,
                },
                style,
            ]}
        />
    );
}

// Transaction List Skeleton
export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <View style={styles.container}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={styles.transactionItem}>
                    <Skeleton width={40} height={40} borderRadius={20} />
                    <View style={styles.transactionDetails}>
                        <Skeleton width="60%" height={16} />
                        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
                    </View>
                    <Skeleton width={80} height={20} />
                </View>
            ))}
        </View>
    );
}

// Budget Card Skeleton
export function BudgetCardSkeleton({ count = 3 }: { count?: number }) {
    return (
        <View style={styles.container}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={styles.budgetCard}>
                    <View style={styles.budgetHeader}>
                        <Skeleton width={100} height={18} />
                        <Skeleton width={60} height={16} />
                    </View>
                    <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 12 }} />
                    <View style={styles.budgetFooter}>
                        <Skeleton width={80} height={14} />
                        <Skeleton width={80} height={14} />
                    </View>
                </View>
            ))}
        </View>
    );
}

// Post/Feed Skeleton
export function FeedSkeleton({ count = 3 }: { count?: number }) {
    return (
        <View style={styles.container}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={styles.feedItem}>
                    <View style={styles.feedHeader}>
                        <Skeleton width={40} height={40} borderRadius={20} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Skeleton width="50%" height={16} />
                            <Skeleton width="30%" height={12} style={{ marginTop: 4 }} />
                        </View>
                    </View>
                    <Skeleton width="100%" height={14} style={{ marginTop: 12 }} />
                    <Skeleton width="90%" height={14} style={{ marginTop: 6 }} />
                    <Skeleton width="100%" height={200} borderRadius={12} style={{ marginTop: 12 }} />
                </View>
            ))}
        </View>
    );
}

// Analytics Card Skeleton
export function AnalyticsSkeleton() {
    return (
        <View style={styles.container}>
            <View style={styles.analyticsCard}>
                <Skeleton width={120} height={40} />
                <View style={styles.analyticsRow}>
                    <Skeleton width="45%" height={80} borderRadius={12} />
                    <Skeleton width="45%" height={80} borderRadius={12} />
                </View>
                <Skeleton width="100%" height={200} borderRadius={12} style={{ marginTop: 16 }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    skeleton: {
        overflow: 'hidden',
    },
    container: {
        padding: 16,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    transactionDetails: {
        flex: 1,
        marginLeft: 12,
    },
    budgetCard: {
        padding: 16,
        marginBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 12,
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    budgetFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    feedItem: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 12,
    },
    feedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    analyticsCard: {
        padding: 16,
    },
    analyticsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
});

export default Skeleton;
