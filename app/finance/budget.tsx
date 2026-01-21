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
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFinance, Budget } from '../../src/contexts/FinanceContext';
import { EduFiColors, formatNaira, EduFiSpacing, EduFiFonts, categoryColors, categoryEmojis } from '../../src/theme/edufi';
import { useTheme } from '../../src/contexts/NewThemeContext';

export default function BudgetScreen() {
    const { budgets, categories, addBudget, updateBudget, deleteBudget, transactions } = useFinance();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const router = useRouter();
    const { theme } = useTheme();

    // Dynamic theme colors
    const backgroundColor = theme?.background || EduFiColors.background;
    const cardBackground = theme?.card || EduFiColors.card;
    const textColor = theme?.text || EduFiColors.text.primary;
    const textSecondary = theme?.textSecondary || EduFiColors.text.secondary;

    // Calculate spending per category for current month
    const getMonthlySpending = (category: string): number => {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return Math.abs(
            transactions
                .filter(t => {
                    const txDate = new Date(t.date);
                    return t.category === category &&
                        t.amount < 0 &&
                        txDate >= firstOfMonth;
                })
                .reduce((sum, t) => sum + t.amount, 0)
        );
    };

    // Get budget status
    const getBudgetStatus = (budget: Budget) => {
        const spent = getMonthlySpending(budget.category);
        const percentage = (spent / budget.amount) * 100;

        if (percentage >= 100) return { status: 'exceeded', color: EduFiColors.expense, label: 'Exceeded!' };
        if (percentage >= 80) return { status: 'warning', color: '#FFA500', label: 'Almost there' };
        return { status: 'safe', color: EduFiColors.income, label: 'On track' };
    };

    const handleDeleteBudget = (id: string) => {
        Alert.alert(
            'Delete Budget',
            'Are you sure you want to delete this budget?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteBudget(id)
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={textColor} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.title, { color: EduFiColors.primary }]}>Budgets</Text>
                        <Text style={[styles.subtitle, { color: textSecondary }]}>
                            Set spending limits by category
                        </Text>
                    </View>
                </View>

                {/* Budget Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: EduFiColors.primary }]}>
                    <Text style={styles.summaryLabel}>Total Monthly Budget</Text>
                    <Text style={styles.summaryAmount}>
                        {formatNaira(budgets.reduce((sum, b) => sum + b.amount, 0))}
                    </Text>
                    <Text style={styles.summarySubtext}>
                        {budgets.length} {budgets.length === 1 ? 'category' : 'categories'} tracked
                    </Text>
                </View>

                {/* Budget List */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Your Budgets</Text>

                    {budgets.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: cardBackground }]}>
                            <Ionicons name="wallet-outline" size={48} color={EduFiColors.disabled} />
                            <Text style={[styles.emptyText, { color: textSecondary }]}>
                                No budgets set yet
                            </Text>
                            <Text style={[styles.emptySubtext, { color: textSecondary }]}>
                                Tap the button below to create your first budget
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.budgetList}>
                            {budgets.map((budget) => {
                                const spent = getMonthlySpending(budget.category);
                                const percentage = Math.min((spent / budget.amount) * 100, 100);
                                const { status, color, label } = getBudgetStatus(budget);
                                const emoji = categoryEmojis[budget.category as keyof typeof categoryEmojis] || '📦';

                                return (
                                    <TouchableOpacity
                                        key={budget.id}
                                        style={[styles.budgetCard, { backgroundColor: cardBackground }]}
                                        onPress={() => {
                                            setEditingBudget(budget);
                                            setShowAddModal(true);
                                        }}
                                    >
                                        <View style={styles.budgetHeader}>
                                            <View style={styles.budgetCategory}>
                                                <Text style={styles.categoryEmoji}>{emoji}</Text>
                                                <Text style={[styles.categoryName, { color: textColor }]}>
                                                    {budget.category}
                                                </Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                                                <Text style={[styles.statusText, { color }]}>{label}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.budgetProgress}>
                                            <View style={styles.progressBar}>
                                                <View
                                                    style={[
                                                        styles.progressFill,
                                                        { width: `${percentage}%`, backgroundColor: color }
                                                    ]}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.budgetFooter}>
                                            <Text style={[styles.spentText, { color: textSecondary }]}>
                                                {formatNaira(spent)} of {formatNaira(budget.amount)}
                                            </Text>
                                            <Text style={[styles.percentText, { color }]}>
                                                {percentage.toFixed(0)}%
                                            </Text>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => handleDeleteBudget(budget.id)}
                                        >
                                            <Ionicons name="trash-outline" size={18} color={EduFiColors.expense} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Bottom spacing */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Add Budget FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    setEditingBudget(null);
                    setShowAddModal(true);
                }}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Add/Edit Budget Modal */}
            <AddBudgetModal
                visible={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setEditingBudget(null);
                }}
                categories={categories}
                existingBudgets={budgets}
                editingBudget={editingBudget}
                onSave={(data) => {
                    if (editingBudget) {
                        updateBudget({ ...editingBudget, ...data });
                    } else {
                        addBudget(data);
                    }
                    setShowAddModal(false);
                    setEditingBudget(null);
                }}
                theme={theme}
            />
        </View>
    );
}

// Add Budget Modal Component
interface AddBudgetModalProps {
    visible: boolean;
    onClose: () => void;
    categories: string[];
    existingBudgets: Budget[];
    editingBudget: Budget | null;
    onSave: (data: { category: string; amount: number; period: 'weekly' | 'monthly' }) => void;
    theme: any;
}

function AddBudgetModal({
    visible,
    onClose,
    categories,
    existingBudgets,
    editingBudget,
    onSave,
    theme
}: AddBudgetModalProps) {
    const [selectedCategory, setSelectedCategory] = useState(editingBudget?.category || '');
    const [amount, setAmount] = useState(editingBudget?.amount?.toString() || '');
    const [period, setPeriod] = useState<'weekly' | 'monthly'>(editingBudget?.period || 'monthly');

    const cardBackground = theme?.card || EduFiColors.card;
    const textColor = theme?.text || EduFiColors.text.primary;
    const textSecondary = theme?.textSecondary || EduFiColors.text.secondary;

    // Reset form when modal opens
    React.useEffect(() => {
        if (visible) {
            setSelectedCategory(editingBudget?.category || '');
            setAmount(editingBudget?.amount?.toString() || '');
            setPeriod(editingBudget?.period || 'monthly');
        }
    }, [visible, editingBudget]);

    // Filter out categories that already have budgets (unless editing)
    const availableCategories = categories.filter(cat =>
        !existingBudgets.some(b => b.category === cat) ||
        (editingBudget && editingBudget.category === cat)
    );

    const handleSave = () => {
        if (!selectedCategory || !amount) {
            Alert.alert('Error', 'Please select a category and enter an amount');
            return;
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        onSave({ category: selectedCategory, amount: numAmount, period });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: cardBackground }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: textColor }]}>
                            {editingBudget ? 'Edit Budget' : 'Add Budget'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Category Selection */}
                    <Text style={[styles.inputLabel, { color: textSecondary }]}>Category</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoryScroll}
                    >
                        {availableCategories.map((cat) => {
                            const emoji = categoryEmojis[cat as keyof typeof categoryEmojis] || '📦';
                            const isSelected = selectedCategory === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryChip,
                                        isSelected && styles.categoryChipActive
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={styles.categoryChipEmoji}>{emoji}</Text>
                                    <Text style={[
                                        styles.categoryChipText,
                                        isSelected && styles.categoryChipTextActive
                                    ]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Amount Input */}
                    <Text style={[styles.inputLabel, { color: textSecondary, marginTop: 20 }]}>
                        Budget Amount (₦)
                    </Text>
                    <TextInput
                        style={[styles.amountInput, { color: textColor, backgroundColor: theme?.background || '#f5f5f5' }]}
                        placeholder="0"
                        placeholderTextColor={textSecondary}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    {/* Period Selection */}
                    <Text style={[styles.inputLabel, { color: textSecondary, marginTop: 20 }]}>Period</Text>
                    <View style={styles.periodRow}>
                        <TouchableOpacity
                            style={[
                                styles.periodButton,
                                period === 'weekly' && styles.periodButtonActive
                            ]}
                            onPress={() => setPeriod('weekly')}
                        >
                            <Text style={[
                                styles.periodText,
                                period === 'weekly' && styles.periodTextActive
                            ]}>Weekly</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.periodButton,
                                period === 'monthly' && styles.periodButtonActive
                            ]}
                            onPress={() => setPeriod('monthly')}
                        >
                            <Text style={[
                                styles.periodText,
                                period === 'monthly' && styles.periodTextActive
                            ]}>Monthly</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            (!selectedCategory || !amount) && styles.saveButtonDisabled
                        ]}
                        onPress={handleSave}
                        disabled={!selectedCategory || !amount}
                    >
                        <Text style={styles.saveButtonText}>
                            {editingBudget ? 'Update Budget' : 'Create Budget'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: EduFiSpacing.md,
        paddingTop: Platform.OS === 'ios' ? 60 : EduFiSpacing.lg,
        paddingBottom: EduFiSpacing.md,
        gap: 12,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: EduFiFonts.sizes.xxl,
        fontWeight: EduFiFonts.weights.bold,
    },
    subtitle: {
        fontSize: EduFiFonts.sizes.sm,
        marginTop: 2,
    },
    summaryCard: {
        marginHorizontal: EduFiSpacing.md,
        padding: EduFiSpacing.lg,
        borderRadius: 16,
        marginBottom: EduFiSpacing.lg,
    },
    summaryLabel: {
        fontSize: EduFiFonts.sizes.sm,
        color: '#fff',
        opacity: 0.8,
    },
    summaryAmount: {
        fontSize: EduFiFonts.sizes.xxxl,
        fontWeight: EduFiFonts.weights.bold,
        color: '#fff',
        marginVertical: 4,
    },
    summarySubtext: {
        fontSize: EduFiFonts.sizes.xs,
        color: '#fff',
        opacity: 0.7,
    },
    section: {
        paddingHorizontal: EduFiSpacing.md,
    },
    sectionTitle: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.semibold,
        marginBottom: EduFiSpacing.md,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: EduFiSpacing.xxl,
        borderRadius: 16,
    },
    emptyText: {
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.medium,
        marginTop: EduFiSpacing.md,
    },
    emptySubtext: {
        fontSize: EduFiFonts.sizes.sm,
        marginTop: 8,
        textAlign: 'center',
    },
    budgetList: {
        gap: EduFiSpacing.sm,
    },
    budgetCard: {
        padding: EduFiSpacing.md,
        borderRadius: 12,
        position: 'relative',
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    budgetCategory: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryEmoji: {
        fontSize: 24,
    },
    categoryName: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: EduFiFonts.sizes.xs,
        fontWeight: EduFiFonts.weights.semibold,
    },
    budgetProgress: {
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    budgetFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    spentText: {
        fontSize: EduFiFonts.sizes.sm,
    },
    percentText: {
        fontSize: EduFiFonts.sizes.sm,
        fontWeight: EduFiFonts.weights.semibold,
    },
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: EduFiColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: EduFiSpacing.lg,
        maxHeight: '80%',
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
    },
    inputLabel: {
        fontSize: EduFiFonts.sizes.sm,
        fontWeight: EduFiFonts.weights.medium,
        marginBottom: 8,
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
        color: EduFiColors.text.secondary,
    },
    categoryChipTextActive: {
        color: '#fff',
    },
    amountInput: {
        fontSize: EduFiFonts.sizes.xxl,
        fontWeight: EduFiFonts.weights.bold,
        padding: EduFiSpacing.md,
        borderRadius: 12,
        textAlign: 'center',
    },
    periodRow: {
        flexDirection: 'row',
        gap: EduFiSpacing.sm,
    },
    periodButton: {
        flex: 1,
        paddingVertical: EduFiSpacing.md,
        borderRadius: 12,
        backgroundColor: EduFiColors.divider,
        alignItems: 'center',
    },
    periodButtonActive: {
        backgroundColor: EduFiColors.primary,
    },
    periodText: {
        fontSize: EduFiFonts.sizes.md,
        color: EduFiColors.text.secondary,
    },
    periodTextActive: {
        color: '#fff',
        fontWeight: EduFiFonts.weights.semibold,
    },
    saveButton: {
        backgroundColor: EduFiColors.primary,
        paddingVertical: EduFiSpacing.md,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: EduFiSpacing.lg,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: EduFiFonts.sizes.lg,
        fontWeight: EduFiFonts.weights.semibold,
    },
});
