/**
 * Empty State Component
 * Provides helpful empty state displays with CTAs
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '../src/contexts/NewThemeContext';
import { EduFiColors } from '../src/theme/edufi';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
    icon?: IconName;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    style?: ViewStyle;
}

export default function EmptyState({
    icon = 'document-outline',
    title,
    message,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    style,
}: EmptyStateProps) {
    const { theme } = useTheme();

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.card }]}>
                <Ionicons name={icon} size={48} color={EduFiColors.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>

            {actionLabel && onAction && (
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: EduFiColors.primary }]}
                    onPress={onAction}
                >
                    <Text style={styles.primaryButtonText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}

            {secondaryActionLabel && onSecondaryAction && (
                <TouchableOpacity style={styles.secondaryButton} onPress={onSecondaryAction}>
                    <Text style={[styles.secondaryButtonText, { color: EduFiColors.primary }]}>
                        {secondaryActionLabel}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// Pre-built empty states for common scenarios
export function NoTransactionsEmpty({ onAddTransaction }: { onAddTransaction?: () => void }) {
    return (
        <EmptyState
            icon="wallet-outline"
            title="No Transactions Yet"
            message="Start tracking your spending by adding your first transaction."
            actionLabel="Add Transaction"
            onAction={onAddTransaction}
        />
    );
}

export function NoBudgetsEmpty({ onCreateBudget }: { onCreateBudget?: () => void }) {
    return (
        <EmptyState
            icon="pie-chart-outline"
            title="No Budgets Set"
            message="Create budgets to track your spending limits and stay on top of your finances."
            actionLabel="Create Budget"
            onAction={onCreateBudget}
        />
    );
}

export function NoPostsEmpty({ onCreatePost }: { onCreatePost?: () => void }) {
    return (
        <EmptyState
            icon="chatbubbles-outline"
            title="No Posts Yet"
            message="Be the first to share something with your campus community!"
            actionLabel="Create Post"
            onAction={onCreatePost}
        />
    );
}

export function NoEventsEmpty({ onExplore }: { onExplore?: () => void }) {
    return (
        <EmptyState
            icon="calendar-outline"
            title="No Upcoming Events"
            message="There are no events scheduled right now. Check back later!"
            actionLabel="Explore Campus"
            onAction={onExplore}
        />
    );
}

export function NoSearchResultsEmpty({ onClearSearch }: { onClearSearch?: () => void }) {
    return (
        <EmptyState
            icon="search-outline"
            title="No Results Found"
            message="Try adjusting your search terms or filters."
            actionLabel="Clear Search"
            onAction={onClearSearch}
        />
    );
}

export function NetworkErrorEmpty({ onRetry }: { onRetry?: () => void }) {
    return (
        <EmptyState
            icon="cloud-offline-outline"
            title="Connection Error"
            message="We couldn't load this content. Please check your internet connection."
            actionLabel="Try Again"
            onAction={onRetry}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        minHeight: 300,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        maxWidth: 280,
    },
    primaryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        paddingHorizontal: 24,
        paddingVertical: 8,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
