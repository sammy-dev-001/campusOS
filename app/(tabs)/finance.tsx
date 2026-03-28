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
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFinance } from '../../src/contexts/FinanceContext';
import { EduFiColors, BrandColors, formatNaira, EduFiSpacing, EduFiFonts } from '../../src/theme/edufi';
import { useTheme } from '../../src/contexts/NewThemeContext';
import BudgetAlerts from '../../components/BudgetAlerts';
import QuickAddInput from '../../components/finance/QuickAddInput';
import { ParsedTransaction } from '../../src/utils/transactionParser';

const { width } = Dimensions.get('window');

export default function FinanceScreen() {
    const { transactions, addTransaction, categories } = useFinance();
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* 1. Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: BrandColors.brandGreen }]}>Finance</Text>
                        <Text style={[styles.subtitle, { color: textSecondary }]}>Manage your student budget</Text>
                    </View>

                    {/* Budget Alerts */}
                    <BudgetAlerts
                        textColor={textColor}
                        onViewBudgets={() => router.push('/finance/budget')}
                    />

                    {/* 2. & 3. Balance Card & Stats */}
                    <View style={styles.balanceContainer}>
                        <View style={[styles.balanceCard, styles.primaryCard]}>
                            <Text style={styles.balanceLabel}>Current Balance</Text>
                            <Text style={styles.balanceAmount}>{formatNaira(Math.abs(balance))}</Text>

                            <TouchableOpacity
                                style={styles.addIncomeButton}
                                onPress={() => setShowAddModal(true)}
                            >
                                <Text style={styles.addIncomeText}>Add Income</Text>
                            </TouchableOpacity>

                            <Text style={styles.balancePeriod}>Last 30 days</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={[styles.statCard, { backgroundColor: cardBackground }]}>
                                <Ionicons name="arrow-down-circle" size={24} color={EduFiColors.income} />
                                <Text style={[styles.statLabel, { color: textSecondary }]}>Income</Text>
                                <Text style={[styles.statAmount, { color: textColor }]}>{formatNaira(totalIncome)}</Text>
                            </View>

                            <View style={[styles.statCard, { backgroundColor: cardBackground }]}>
                                <Ionicons name="arrow-up-circle" size={24} color={EduFiColors.expense} />
                                <Text style={[styles.statLabel, { color: textSecondary }]}>Expenses</Text>
                                <Text style={[styles.statAmount, { color: textColor }]}>{formatNaira(totalExpense)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* 4. Log Expense Input */}
                    <View style={styles.inputSection}>
                        <QuickAddInput
                            variant="inline"
                            label="LOG EXPENSE"
                            onTransactionSaved={(parsed: ParsedTransaction) => {
                                addTransaction({
                                    amount: Math.abs(parsed.amount),
                                    category: parsed.category,
                                    note: parsed.remark,
                                    date: parsed.date.toISOString(),
                                    type: 'expense',
                                    source: 'manual',
                                });
                            }}
                            theme={{
                                background: backgroundColor,
                                card: cardBackground,
                                text: textColor,
                                textSecondary: textSecondary,
                                primary: theme.action,
                                border: theme?.border || '#333',
                            }}
                        />
                    </View>

                    {/* 5. AI Insights (Under Log Expense) */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>AI Insights</Text>
                        <View style={[styles.aiCard, { backgroundColor: cardBackground }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                                <View style={[styles.aiIconBadge, { backgroundColor: EduFiColors.primary }]}>
                                    <Ionicons name="sparkles" size={20} color="#FFF" />
                                </View>
                                <View style={styles.aiContent}>
                                    <Text style={[styles.aiName, { color: textColor }]}>Eddy</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <Ionicons name="warning" size={16} color="#FFD700" style={{ marginRight: 6 }} />
                                        <Text style={[styles.aiText, { color: textSecondary, flex: 1 }]}>
                                            You've spent more than you earned this month
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.askAiButton, { backgroundColor: theme.action }]}
                                onPress={() => router.push('/ai-chat')}
                            >
                                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.askAiButtonText}>Ask AI for Advice</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 6. Action Buttons (Also using brandGreen for actions) */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.outlinedButton, { borderColor: theme.action }]}
                            onPress={() => router.push('/finance/budget')}
                        >
                            <Text style={[styles.outlinedButtonText, { color: theme.action }]}>Set Budgets</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.outlinedButton, { borderColor: theme.action }]}
                            onPress={() => {
                                if (Platform.OS === 'android') {
                                    router.push('/finance/notification-permission');
                                }
                            }}
                        >
                            <Text style={[styles.outlinedButtonText, { color: theme.action }]}>Auto-Detect</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 7. Recent Transactions (Bottom) */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Transactions</Text>
                        {transactions.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="wallet-outline" size={48} color={EduFiColors.disabled} />
                                <Text style={[styles.emptyText, { color: textSecondary }]}>No transactions yet</Text>
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
            </KeyboardAvoidingView>

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
                <Text style={styles.transactionNote} numberOfLines={1}>{transaction.note || 'No description'}</Text>
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
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Transaction</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close" size={24} color={EduFiColors.text.primary} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.typeToggle}>
                                    <TouchableOpacity
                                        style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
                                        onPress={() => setType('expense')}
                                    >
                                        <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>Expense</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
                                        onPress={() => setType('income')}
                                    >
                                        <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>Income</Text>
                                    </TouchableOpacity>
                                </View>
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
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Category</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                                        {categories.map((cat: string) => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                                                onPress={() => setCategory(cat)}
                                            >
                                                <Text style={styles.categoryChipEmoji}>{getCategoryEmoji(cat)}</Text>
                                                <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>{cat}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
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

function getCategoryEmoji(category: string): string {
    const emojis: { [key: string]: string } = {
        Food: '🍔', Transport: '🚗', Data: '📱', Bills: '💡', Shopping: '🛍️',
        Health: '🏥', Entertainment: '🎮', Education: '📚', Savings: '💰', Other: '📦',
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
    scrollContent: {
        paddingBottom: 100,
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
        marginBottom: 8,
    },
    balanceContainer: {
        paddingHorizontal: EduFiSpacing.md,
        gap: EduFiSpacing.sm,
        marginBottom: EduFiSpacing.md,
    },
    balanceCard: {
        backgroundColor: EduFiColors.card,
        borderRadius: 16,
        padding: EduFiSpacing.md,
        shadowColor: EduFiColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryCard: {
        backgroundColor: BrandColors.brandGreen,
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
        marginBottom: 8,
    },
    addIncomeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    addIncomeText: {
        fontSize: EduFiFonts.sizes.sm,
        fontWeight: EduFiFonts.weights.semibold,
        color: EduFiColors.background,
    },
    balancePeriod: {
        fontSize: EduFiFonts.sizes.xs,
        color: EduFiColors.background,
        opacity: 0.7,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        gap: EduFiSpacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: EduFiColors.card,
        borderRadius: 16,
        padding: EduFiSpacing.md,
        shadowColor: EduFiColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    statLabel: {
        fontSize: EduFiFonts.sizes.xs,
        marginTop: 8,
    },
    statAmount: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.semibold,
        marginTop: 4,
    },
    aiCard: {
        borderRadius: 16,
        padding: EduFiSpacing.md,
        shadowColor: EduFiColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    aiIconBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    aiContent: {
        flex: 1,
        justifyContent: 'center',
    },
    aiTitle: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.semibold,
        marginBottom: 4,
    },
    aiName: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.bold,
    },
    aiText: {
        fontSize: EduFiFonts.sizes.sm,
        lineHeight: 18,
    },
    askAiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        width: '100%',
    },
    askAiButtonText: {
        color: '#FFF',
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
    },
    inputSection: {
        paddingHorizontal: EduFiSpacing.md,
        marginVertical: 20,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: EduFiSpacing.md,
        paddingHorizontal: EduFiSpacing.md,
        marginBottom: 20,
    },
    outlinedButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlinedButtonText: {
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
        marginBottom: EduFiSpacing.md,
    },
    transactionList: {
        gap: EduFiSpacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: EduFiSpacing.lg,
    },
    emptyText: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.medium,
        marginTop: EduFiSpacing.md,
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
