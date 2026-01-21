import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Platform,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFinance } from '../../src/contexts/FinanceContext';
import { EduFiColors, formatNaira, EduFiSpacing, EduFiFonts } from '../../src/theme/edufi';
import { useTheme } from '../../src/contexts/NewThemeContext';
import BudgetAlerts from '../../components/BudgetAlerts';

export default function FinanceScreen() {
    const { transactions, budgets, addTransaction, categories } = useFinance();
    const [showAddModal, setShowAddModal] = useState(false);
    const router = useRouter();
    const { theme } = useTheme();

    // Calculate summary
    const last30Days = transactions.filter((t) => {
        const date = new Date(t.date);
        const daysDiff = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30;
    });

    const totalIncome = last30Days
        .filter((t) => t.amount >= 0)
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = Math.abs(
        last30Days.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
    );

    const balance = totalIncome - totalExpense;

    // Dynamic background based on theme
    const backgroundColor = theme?.background || EduFiColors.background;
    const cardBackground = theme?.card || EduFiColors.card;
    const textColor = theme?.text || EduFiColors.text.primary;
    const textSecondary = theme?.textSecondary || EduFiColors.text.secondary;

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: EduFiColors.primary }]}>Finance</Text>
                    <Text style={[styles.subtitle, { color: textSecondary }]}>Manage your student budget</Text>
                </View>

                {/* Budget Alerts */}
                <BudgetAlerts
                    textColor={textColor}
                    onViewBudgets={() => router.push('/finance/budget')}
                />

                {/* Balance Cards */}
                <View style={styles.balanceCards}>
                    <View style={[styles.balanceCard, styles.primaryCard]}>
                        <Text style={styles.balanceLabel}>Current Balance</Text>
                        <Text style={styles.balanceAmount}>{formatNaira(balance)}</Text>
                        <Text style={styles.balancePeriod}>Last 30 days</Text>
                    </View>

                    <View style={styles.balanceRow}>
                        <View style={[styles.balanceCard, styles.incomeCard, { backgroundColor: cardBackground }]}>
                            <Ionicons name="arrow-down-circle" size={24} color={EduFiColors.income} />
                            <Text style={[styles.smallLabel, { color: textSecondary }]}>Income</Text>
                            <Text style={[styles.smallAmount, { color: textColor }]}>{formatNaira(totalIncome)}</Text>
                        </View>

                        <View style={[styles.balanceCard, styles.expenseCard, { backgroundColor: cardBackground }]}>
                            <Ionicons name="arrow-up-circle" size={24} color={EduFiColors.expense} />
                            <Text style={[styles.smallLabel, { color: textSecondary }]}>Expenses</Text>
                            <Text style={[styles.smallAmount, { color: textColor }]}>{formatNaira(totalExpense)}</Text>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowAddModal(true)}
                    >
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.actionText}>Add Transaction</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButtonSecondary, { backgroundColor: cardBackground }]}
                        onPress={() => router.push('/finance/analytics')}
                    >
                        <Ionicons name="stats-chart" size={20} color={EduFiColors.primary} />
                        <Text style={styles.actionTextSecondary}>Analytics</Text>
                    </TouchableOpacity>
                </View>

                {/* Budget Button */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={[styles.actionButtonSecondary, { backgroundColor: cardBackground, flex: 1 }]}
                        onPress={() => router.push('/finance/budget')}
                    >
                        <Ionicons name="wallet" size={20} color={EduFiColors.primary} />
                        <Text style={styles.actionTextSecondary}>Set Budgets</Text>
                    </TouchableOpacity>

                    {Platform.OS === 'android' && (
                        <TouchableOpacity
                            style={[styles.actionButtonSecondary, { backgroundColor: cardBackground, flex: 1 }]}
                            onPress={() => router.push('/finance/sms-permission')}
                        >
                            <Ionicons name="mail-unread" size={20} color={EduFiColors.primary} />
                            <Text style={styles.actionTextSecondary}>Auto-Detect</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* AI Insights Card */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>AI Insights</Text>
                    <View style={[styles.aiInsightsCard, { backgroundColor: cardBackground }]}>
                        <View style={styles.aiInsightsHeader}>
                            <View style={[styles.aiIconBadge, { backgroundColor: EduFiColors.primary }]}>
                                <Ionicons name="sparkles" size={20} color="#fff" />
                            </View>
                            <View style={styles.aiInsightsText}>
                                <Text style={[styles.aiInsightsTitle, { color: textColor }]}>
                                    Eddy
                                </Text>
                                <Text style={[styles.aiInsightsSubtitle, { color: textSecondary }]}>
                                    {totalExpense > totalIncome
                                        ? "⚠️ You've spent more than you earned this month"
                                        : totalExpense > 0
                                            ? `💰 You've saved ${formatNaira(totalIncome - totalExpense)} this month`
                                            : "📊 Add transactions to get insights"}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.askAiButton}
                            onPress={() => router.push('/finance-ai')}
                        >
                            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                            <Text style={styles.askAiButtonText}>Ask AI for Advice</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Transactions */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Transactions</Text>
                    {transactions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="wallet-outline" size={48} color={EduFiColors.disabled} />
                            <Text style={[styles.emptyText, { color: textSecondary }]}>No transactions yet</Text>
                            <Text style={[styles.emptySubtext, { color: textSecondary }]}>Tap the button above to add your first transaction</Text>
                        </View>
                    ) : (
                        <View style={styles.transactionList}>
                            {transactions.slice(0, 10).map((transaction) => (
                                <TransactionItem key={transaction.id} transaction={transaction} />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Add Transaction Modal */}
            <AddTransactionModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={addTransaction}
                categories={categories}
            />
        </View>
    );
}

// Transaction Item Component
function TransactionItem({ transaction }: { transaction: any }) {
    const isIncome = transaction.amount >= 0;
    const categoryColor = EduFiColors.categories[transaction.category as keyof typeof EduFiColors.categories] || EduFiColors.text.secondary;

    return (
        <View style={styles.transactionItem}>
            <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '20' }]}>
                <Text style={styles.categoryEmoji}>{getCategoryEmoji(transaction.category)}</Text>
            </View>

            <View style={styles.transactionInfo}>
                <Text style={styles.transactionCategory}>{transaction.category}</Text>
                <Text style={styles.transactionNote} numberOfLines={1}>
                    {transaction.note || 'No description'}
                </Text>
                <Text style={styles.transactionDate}>
                    {new Date(transaction.date).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                    })}
                </Text>
            </View>

            <Text style={[styles.transactionAmount, isIncome ? styles.incomeAmount : styles.expenseAmount]}>
                {isIncome ? '+' : ''}{formatNaira(transaction.amount)}
            </Text>
        </View>
    );
}

// Add Transaction Modal Component
function AddTransactionModal({ visible, onClose, onAdd, categories }: any) {
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(categories[0]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            await onAdd({
                type,
                amount: parseFloat(amount),
                category,
                note,
                date: new Date().toISOString(),
            });
            // Reset form
            setAmount('');
            setNote('');
            setCategory(categories[0]);
            onClose();
        } catch (error) {
            alert('Error adding transaction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardAvoidingView}
                    >
                        <View style={styles.modalContent}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Transaction</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close" size={24} color={EduFiColors.text.primary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Type Toggle */}
                                <View style={styles.typeToggle}>
                                    <TouchableOpacity
                                        style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
                                        onPress={() => setType('expense')}
                                    >
                                        <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>
                                            Expense
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
                                        onPress={() => setType('income')}
                                    >
                                        <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>
                                            Income
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Amount Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Amount (₦)</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        value={amount}
                                        onChangeText={setAmount}
                                        placeholder="0"
                                        keyboardType="decimal-pad"
                                        placeholderTextColor={EduFiColors.text.light}
                                    />
                                </View>

                                {/* Category Selector */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Category</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.categoryScroll}
                                    >
                                        {categories.map((cat: string) => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                                                onPress={() => setCategory(cat)}
                                            >
                                                <Text style={styles.categoryChipEmoji}>{getCategoryEmoji(cat)}</Text>
                                                <Text
                                                    style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}
                                                >
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Note Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Note (Optional)</Text>
                                    <TextInput
                                        style={styles.noteInput}
                                        value={note}
                                        onChangeText={setNote}
                                        placeholder="What was this for?"
                                        placeholderTextColor={EduFiColors.text.light}
                                        multiline
                                    />
                                </View>

                                {/* Submit Button */}
                                <TouchableOpacity
                                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    <Text style={styles.submitButtonText}>
                                        {loading ? 'Adding...' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// Helper function for category emojis
function getCategoryEmoji(category: string): string {
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
    return emojis[category] || '📦';
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
    balanceCards: {
        paddingHorizontal: EduFiSpacing.md,
        marginBottom: EduFiSpacing.lg,
    },
    balanceCard: {
        backgroundColor: EduFiColors.card,
        borderRadius: 16,
        padding: EduFiSpacing.md,
        marginBottom: EduFiSpacing.sm,
        shadowColor: EduFiColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryCard: {
        backgroundColor: EduFiColors.primary,
    },
    balanceLabel: {
        fontSize: EduFiFonts.sizes.sm,
        color: EduFiColors.background,
        opacity: 0.8,
        marginBottom: 4,
    },
    balanceAmount: {
        fontSize: EduFiFonts.sizes.xxxl,
        fontWeight: EduFiFonts.weights.bold,
        color: EduFiColors.background,
    },
    balancePeriod: {
        fontSize: EduFiFonts.sizes.xs,
        color: EduFiColors.background,
        opacity: 0.7,
        marginTop: 4,
    },
    balanceRow: {
        flexDirection: 'row',
        gap: EduFiSpacing.sm,
    },
    incomeCard: {
        flex: 1,
    },
    expenseCard: {
        flex: 1,
    },
    smallLabel: {
        fontSize: EduFiFonts.sizes.xs,
        color: EduFiColors.text.secondary,
        marginTop: 8,
    },
    smallAmount: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.semibold,
        color: EduFiColors.text.primary,
        marginTop: 4,
    },
    quickActions: {
        flexDirection: 'row',
        gap: EduFiSpacing.sm,
        paddingHorizontal: EduFiSpacing.md,
        marginBottom: EduFiSpacing.lg,
    },
    actionButton: {
        flex: 1,
        backgroundColor: EduFiColors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: EduFiSpacing.md,
        borderRadius: 12,
        gap: 8,
    },
    actionText: {
        color: EduFiColors.background,
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
    },
    actionButtonSecondary: {
        flex: 1,
        backgroundColor: EduFiColors.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: EduFiSpacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: EduFiColors.primary,
        gap: 8,
    },
    actionTextSecondary: {
        color: EduFiColors.primary,
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
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
    // AI Insights Card Styles
    aiInsightsCard: {
        borderRadius: 16,
        padding: EduFiSpacing.md,
        shadowColor: EduFiColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    aiInsightsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    aiIconBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    aiInsightsText: {
        flex: 1,
    },
    aiInsightsTitle: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.semibold,
        marginBottom: 4,
    },
    aiInsightsSubtitle: {
        fontSize: EduFiFonts.sizes.sm,
        lineHeight: 18,
    },
    aiInsightsActions: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    askAiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: EduFiColors.primary,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginTop: 16,
        gap: 8,
        shadowColor: EduFiColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    askAiButtonText: {
        color: '#fff',
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.bold,
    },
    askAiText: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: EduFiSpacing.xxl,
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
    transactionList: {
        gap: EduFiSpacing.sm,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: EduFiColors.card,
        padding: EduFiSpacing.md,
        borderRadius: 12,
        shadowColor: EduFiColors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: EduFiSpacing.md,
    },
    categoryEmoji: {
        fontSize: 20,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionCategory: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
        color: EduFiColors.text.primary,
    },
    transactionNote: {
        fontSize: EduFiFonts.sizes.sm,
        color: EduFiColors.text.secondary,
        marginTop: 2,
    },
    transactionDate: {
        fontSize: EduFiFonts.sizes.xs,
        color: EduFiColors.text.light,
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.bold,
    },
    incomeAmount: {
        color: EduFiColors.income,
    },
    expenseAmount: {
        color: EduFiColors.expense,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    keyboardAvoidingView: {
        width: '100%',
    },
    modalContent: {
        backgroundColor: EduFiColors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: EduFiSpacing.lg,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: EduFiSpacing.lg,
    },
    modalTitle: {
        fontSize: EduFiFonts.sizes.xl,
        fontWeight: EduFiFonts.weights.bold,
        color: EduFiColors.text.primary,
    },
    typeToggle: {
        flexDirection: 'row',
        backgroundColor: EduFiColors.divider,
        borderRadius: 12,
        padding: 4,
        marginBottom: EduFiSpacing.lg,
    },
    typeButton: {
        flex: 1,
        paddingVertical: EduFiSpacing.sm,
        alignItems: 'center',
        borderRadius: 8,
    },
    typeButtonActive: {
        backgroundColor: EduFiColors.primary,
    },
    typeText: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.medium,
        color: EduFiColors.text.secondary,
    },
    typeTextActive: {
        color: EduFiColors.background,
    },
    inputGroup: {
        marginBottom: EduFiSpacing.lg,
    },
    inputLabel: {
        fontSize: EduFiFonts.sizes.sm,
        fontWeight: EduFiFonts.weights.medium,
        color: EduFiColors.text.primary,
        marginBottom: 8,
    },
    amountInput: {
        fontSize: EduFiFonts.sizes.xxxl,
        fontWeight: EduFiFonts.weights.bold,
        color: EduFiColors.text.primary,
        padding: EduFiSpacing.md,
        backgroundColor: EduFiColors.divider,
        borderRadius: 12,
    },
    categoryScroll: {
        marginHorizontal: -EduFiSpacing.lg,
        paddingHorizontal: EduFiSpacing.lg,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: EduFiSpacing.md,
        paddingVertical: EduFiSpacing.sm,
        borderRadius: 20,
        backgroundColor: EduFiColors.divider,
        marginRight: EduFiSpacing.sm,
    },
    categoryChipActive: {
        backgroundColor: EduFiColors.primary,
    },
    categoryChipEmoji: {
        fontSize: 16,
        marginRight: 6,
    },
    categoryChipText: {
        fontSize: EduFiFonts.sizes.sm,
        fontWeight: EduFiFonts.weights.medium,
        color: EduFiColors.text.secondary,
    },
    categoryChipTextActive: {
        color: EduFiColors.background,
    },
    noteInput: {
        fontSize: EduFiFonts.sizes.md,
        color: EduFiColors.text.primary,
        padding: EduFiSpacing.md,
        backgroundColor: EduFiColors.divider,
        borderRadius: 12,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: EduFiColors.primary,
        paddingVertical: EduFiSpacing.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: EduFiColors.background,
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.semibold,
    },
});
