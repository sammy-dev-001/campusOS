import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../../src/contexts/FinanceContext';
import {
    getSpendingSummary,
    getCategoryBreakdown,
    generateInsights,
    getBudgetProgress,
} from '../../src/utils/analyticsUtils';
import { EduFiColors, formatNaira, EduFiSpacing, EduFiFonts } from '../../src/theme/edufi';

type Period = 'day' | 'week' | 'month';

export default function AnalyticsScreen() {
    const { transactions, budgets } = useFinance();
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');

    // Calculate data
    const summary = getSpendingSummary(transactions, selectedPeriod);
    const categoryBreakdown = getCategoryBreakdown(transactions, selectedPeriod, 3);
    const insights = generateInsights(transactions, budgets);
    const budgetProgress = getBudgetProgress(transactions, budgets);

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Analytics</Text>
                    <Text style={styles.subtitle}>Your spending insights</Text>
                </View>

                {/* Period Selector */}
                <View style={styles.periodSelector}>
                    <TouchableOpacity
                        style={[styles.periodButton, selectedPeriod === 'day' && styles.periodButtonActive]}
                        onPress={() => setSelectedPeriod('day')}
                    >
                        <Text
                            style={[styles.periodText, selectedPeriod === 'day' && styles.periodTextActive]}
                        >
                            Today
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
                        onPress={() => setSelectedPeriod('week')}
                    >
                        <Text
                            style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}
                        >
                            This Week
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
                        onPress={() => setSelectedPeriod('month')}
                    >
                        <Text
                            style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}
                        >
                            This Month
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Summary Stats */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Summary</Text>
                    <View style={styles.statsGrid}>
                        <StatCard
                            label="Total Spent"
                            value={formatNaira(summary.totalExpense)}
                            color={EduFiColors.expense}
                            icon="trending-down"
                        />
                        <StatCard
                            label="Total Income"
                            value={formatNaira(summary.totalIncome)}
                            color={EduFiColors.income}
                            icon="trending-up"
                        />
                        <StatCard
                            label="Balance"
                            value={formatNaira(summary.balance)}
                            color={summary.balance >= 0 ? EduFiColors.income : EduFiColors.expense}
                            icon={summary.balance >= 0 ? 'checkmark-circle' : 'alert-circle'}
                        />
                        <StatCard
                            label="Transactions"
                            value={summary.transactionCount.toString()}
                            color={EduFiColors.primary}
                            icon="receipt"
                        />
                    </View>
                </View>

                {/* Insights */}
                {insights.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Insights</Text>
                        {insights.map((insight, index) => (
                            <InsightCard key={index} insight={insight} />
                        ))}
                    </View>
                )}

                {/* Top Categories */}
                {categoryBreakdown.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Top Spending Categories</Text>
                        {categoryBreakdown.map((category, index) => (
                            <CategoryCard key={index} category={category} rank={index + 1} />
                        ))}
                    </View>
                )}

                {/* Budget Progress */}
                {budgetProgress.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Budget Progress</Text>
                        {budgetProgress.map((progress, index) => (
                            <BudgetProgressCard key={index} progress={progress} />
                        ))}
                    </View>
                )}

                {/* Empty State */}
                {transactions.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="analytics-outline" size={64} color={EduFiColors.disabled} />
                        <Text style={styles.emptyText}>No data yet</Text>
                        <Text style={styles.emptySubtext}>
                            Start tracking your spending to see insights
                        </Text>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

// Stat Card Component
function StatCard({
    label,
    value,
    color,
    icon,
}: {
    label: string;
    value: string;
    color: string;
    icon: any;
}) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
    );
}

// Insight Card Component
function InsightCard({ insight }: { insight: any }) {
    const getIconName = (type: string) => {
        switch (type) {
            case 'warning':
                return 'warning';
            case 'success':
                return 'checkmark-circle';
            case 'info':
                return 'information-circle';
            case 'tip':
                return 'bulb';
            default:
                return 'information-circle';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'warning':
                return EduFiColors.warning;
            case 'success':
                return EduFiColors.success;
            case 'info':
                return EduFiColors.info;
            case 'tip':
                return EduFiColors.accent;
            default:
                return EduFiColors.text.secondary;
        }
    };

    const color = getColor(insight.type);

    return (
        <View style={[styles.insightCard, { borderLeftColor: color }]}>
            <View style={[styles.insightIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={getIconName(insight.type)} size={20} color={color} />
            </View>
            <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightMessage}>{insight.message}</Text>
            </View>
        </View>
    );
}

// Category Card Component
function CategoryCard({ category, rank }: { category: any; rank: number }) {
    const getCategoryEmoji = (cat: string): string => {
        const emojis: { [key: string]: string } = {
            Food: '🍔',
            Transport: '🚗',
            Data: '📱',
            Bills: '💡',
            Shopping: '🛍️',
            Health: '🏥',
            Entertainment: '🎮',
            Education: '📚',
            Savings: '💰',
            Other: '📦',
        };
        return emojis[cat] || '📦';
    };

    const categoryColor = EduFiColors.categories[category.category as keyof typeof EduFiColors.categories] || EduFiColors.text.secondary;

    return (
        <View style={styles.categoryCard}>
            <View style={styles.categoryLeft}>
                <View style={styles.categoryRank}>
                    <Text style={styles.categoryRankText}>{rank}</Text>
                </View>
                <View style={[styles.categoryIconSmall, { backgroundColor: categoryColor + '20' }]}>
                    <Text style={styles.categoryEmojiSmall}>{getCategoryEmoji(category.category)}</Text>
                </View>
                <View>
                    <Text style={styles.categoryName}>{category.category}</Text>
                    <Text style={styles.categoryCount}>{category.transactionCount} transactions</Text>
                </View>
            </View>
            <View style={styles.categoryRight}>
                <Text style={styles.categoryAmount}>{formatNaira(category.amount)}</Text>
                <Text style={styles.categoryPercentage}>{Math.round(category.percentage)}%</Text>
            </View>
        </View>
    );
}

// Budget Progress Card Component
function BudgetProgressCard({ progress }: { progress: any }) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'safe':
                return EduFiColors.budgetOn;
            case 'warning':
                return EduFiColors.budgetWarning;
            case 'danger':
                return EduFiColors.budgetOver;
            default:
                return EduFiColors.text.secondary;
        }
    };

    const statusColor = getStatusColor(progress.status);
    const percentage = Math.min(progress.percentage, 100);

    return (
        <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
                <Text style={styles.budgetCategory}>{progress.budget.category}</Text>
                <Text style={[styles.budgetPercentage, { color: statusColor }]}>
                    {Math.round(percentage)}%
                </Text>
            </View>
            <View style={styles.budgetBar}>
                <View
                    style={[
                        styles.budgetBarFill,
                        { width: `${percentage}%`, backgroundColor: statusColor },
                    ]}
                />
            </View>
            <View style={styles.budgetFooter}>
                <Text style={styles.budgetText}>
                    {formatNaira(progress.spent)} / {formatNaira(progress.budget.amount)}
                </Text>
                <Text style={styles.budgetRemaining}>
                    {formatNaira(progress.remaining)} left
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: EduFiColors.background,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        paddingHorizontal: EduFiSpacing.md,
        paddingTop: Platform.OS === 'ios' ? 60 : EduFiSpacing.lg,
        paddingBottom: EduFiSpacing.md,
    },
    title: {
        fontSize: EduFiFonts.sizes.xxxl,
        fontWeight: EduFiFonts.weights.bold,
        color: EduFiColors.primary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: EduFiFonts.sizes.md,
        color: EduFiColors.text.secondary,
    },
    periodSelector: {
        flexDirection: 'row',
        paddingHorizontal: EduFiSpacing.md,
        marginBottom: EduFiSpacing.lg,
        gap: EduFiSpacing.sm,
    },
    periodButton: {
        flex: 1,
        paddingVertical: EduFiSpacing.sm,
        borderRadius: 8,
        backgroundColor: EduFiColors.divider,
        alignItems: 'center',
    },
    periodButtonActive: {
        backgroundColor: EduFiColors.primary,
    },
    periodText: {
        fontSize: EduFiFonts.sizes.sm,
        fontWeight: EduFiFonts.weights.medium,
        color: EduFiColors.text.secondary,
    },
    periodTextActive: {
        color: EduFiColors.background,
    },
    section: {
        paddingHorizontal: EduFiSpacing.md,
        marginBottom: EduFiSpacing.lg,
    },
    sectionTitle: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.semibold,
        color: EduFiColors.text.primary,
        marginBottom: EduFiSpacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: EduFiSpacing.sm,
    },
    statCard: {
        width: '48%',
        backgroundColor: EduFiColors.card,
        borderRadius: 12,
        padding: EduFiSpacing.md,
        shadowColor: EduFiColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: EduFiSpacing.sm,
    },
    statLabel: {
        fontSize: EduFiFonts.sizes.xs,
        color: EduFiColors.text.secondary,
        marginBottom: 4,
    },
    statValue: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.bold,
    },
    insightCard: {
        flexDirection: 'row',
        backgroundColor: EduFiColors.card,
        borderRadius: 12,
        padding: EduFiSpacing.md,
        marginBottom: EduFiSpacing.sm,
        borderLeftWidth: 4,
        shadowColor: EduFiColors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    insightIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: EduFiSpacing.md,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
        color: EduFiColors.text.primary,
        marginBottom: 4,
    },
    insightMessage: {
        fontSize: EduFiFonts.sizes.sm,
        color: EduFiColors.text.secondary,
        lineHeight: 20,
    },
    categoryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: EduFiColors.card,
        borderRadius: 12,
        padding: EduFiSpacing.md,
        marginBottom: EduFiSpacing.sm,
        shadowColor: EduFiColors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryRank: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: EduFiColors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: EduFiSpacing.sm,
    },
    categoryRankText: {
        fontSize: EduFiFonts.sizes.xs,
        fontWeight: EduFiFonts.weights.bold,
        color: EduFiColors.primary,
    },
    categoryIconSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: EduFiSpacing.sm,
    },
    categoryEmojiSmall: {
        fontSize: 18,
    },
    categoryName: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
        color: EduFiColors.text.primary,
    },
    categoryCount: {
        fontSize: EduFiFonts.sizes.xs,
        color: EduFiColors.text.light,
        marginTop: 2,
    },
    categoryRight: {
        alignItems: 'flex-end',
    },
    categoryAmount: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.bold,
        color: EduFiColors.text.primary,
    },
    categoryPercentage: {
        fontSize: EduFiFonts.sizes.xs,
        color: EduFiColors.text.secondary,
        marginTop: 2,
    },
    budgetCard: {
        backgroundColor: EduFiColors.card,
        borderRadius: 12,
        padding: EduFiSpacing.md,
        marginBottom: EduFiSpacing.sm,
        shadowColor: EduFiColors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: EduFiSpacing.sm,
    },
    budgetCategory: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
        color: EduFiColors.text.primary,
    },
    budgetPercentage: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.bold,
    },
    budgetBar: {
        height: 8,
        backgroundColor: EduFiColors.divider,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: EduFiSpacing.sm,
    },
    budgetBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    budgetFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    budgetText: {
        fontSize: EduFiFonts.sizes.sm,
        color: EduFiColors.text.secondary,
    },
    budgetRemaining: {
        fontSize: EduFiFonts.sizes.sm,
        color: EduFiColors.text.secondary,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: EduFiSpacing.xxl * 2,
    },
    emptyText: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.medium,
        color: EduFiColors.text.secondary,
        marginTop: EduFiSpacing.md,
    },
    emptySubtext: {
        fontSize: EduFiFonts.sizes.sm,
        color: EduFiColors.text.light,
        marginTop: 8,
        textAlign: 'center',
    },
});
