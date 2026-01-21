import { Transaction, Budget } from '../contexts/FinanceContext';

// Helper to get date range
function getDateRange(period: 'day' | 'week' | 'month'): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date;

    switch (period) {
        case 'day':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            break;
        case 'week':
            const dayOfWeek = now.getDay();
            start = new Date(now);
            start.setDate(now.getDate() - dayOfWeek);
            start.setHours(0, 0, 0, 0);
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            break;
    }

    return { start, end };
}

// Filter transactions by date range
function filterByDateRange(transactions: Transaction[], start: Date, end: Date): Transaction[] {
    return transactions.filter((t) => {
        const date = new Date(t.date);
        return date >= start && date <= end;
    });
}

// Spending Summary
export interface SpendingSummary {
    period: 'day' | 'week' | 'month';
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
    averageExpense: number;
}

export function getSpendingSummary(
    transactions: Transaction[],
    period: 'day' | 'week' | 'month'
): SpendingSummary {
    const { start, end } = getDateRange(period);
    const filtered = filterByDateRange(transactions, start, end);

    const income = filtered.filter((t) => t.amount >= 0);
    const expenses = filtered.filter((t) => t.amount < 0);

    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));
    const balance = totalIncome - totalExpense;
    const averageExpense = expenses.length > 0 ? totalExpense / expenses.length : 0;

    return {
        period,
        totalIncome,
        totalExpense,
        balance,
        transactionCount: filtered.length,
        averageExpense,
    };
}

// Category Breakdown
export interface CategoryBreakdown {
    category: string;
    amount: number;
    percentage: number;
    transactionCount: number;
}

export function getCategoryBreakdown(
    transactions: Transaction[],
    period: 'day' | 'week' | 'month',
    limit: number = 3
): CategoryBreakdown[] {
    const { start, end } = getDateRange(period);
    const filtered = filterByDateRange(transactions, start, end).filter((t) => t.amount < 0);

    const categoryMap = new Map<string, { amount: number; count: number }>();

    filtered.forEach((t) => {
        const existing = categoryMap.get(t.category) || { amount: 0, count: 0 };
        categoryMap.set(t.category, {
            amount: existing.amount + Math.abs(t.amount),
            count: existing.count + 1,
        });
    });

    const totalExpense = Array.from(categoryMap.values()).reduce((sum, v) => sum + v.amount, 0);

    const breakdown = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
            category,
            amount: data.amount,
            percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
            transactionCount: data.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);

    return breakdown;
}

// Compare periods for insights
export interface PeriodComparison {
    category: string;
    currentAmount: number;
    previousAmount: number;
    changeAmount: number;
    changePercentage: number;
}

export function comparePeriods(
    transactions: Transaction[],
    period: 'week' | 'month'
): PeriodComparison[] {
    const now = new Date();

    // Current period
    const { start: currentStart, end: currentEnd } = getDateRange(period);

    // Previous period
    let previousStart: Date;
    let previousEnd: Date;

    if (period === 'week') {
        previousEnd = new Date(currentStart);
        previousEnd.setMilliseconds(-1);
        previousStart = new Date(previousEnd);
        previousStart.setDate(previousEnd.getDate() - 6);
        previousStart.setHours(0, 0, 0, 0);
    } else {
        previousEnd = new Date(currentStart);
        previousEnd.setMilliseconds(-1);
        previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), 1, 0, 0, 0);
    }

    const currentTransactions = filterByDateRange(transactions, currentStart, currentEnd).filter(
        (t) => t.amount < 0
    );
    const previousTransactions = filterByDateRange(transactions, previousStart, previousEnd).filter(
        (t) => t.amount < 0
    );

    const currentMap = new Map<string, number>();
    const previousMap = new Map<string, number>();

    currentTransactions.forEach((t) => {
        currentMap.set(t.category, (currentMap.get(t.category) || 0) + Math.abs(t.amount));
    });

    previousTransactions.forEach((t) => {
        previousMap.set(t.category, (previousMap.get(t.category) || 0) + Math.abs(t.amount));
    });

    const allCategories = new Set([...currentMap.keys(), ...previousMap.keys()]);
    const comparisons: PeriodComparison[] = [];

    allCategories.forEach((category) => {
        const currentAmount = currentMap.get(category) || 0;
        const previousAmount = previousMap.get(category) || 0;
        const changeAmount = currentAmount - previousAmount;
        const changePercentage =
            previousAmount > 0 ? (changeAmount / previousAmount) * 100 : currentAmount > 0 ? 100 : 0;

        comparisons.push({
            category,
            currentAmount,
            previousAmount,
            changeAmount,
            changePercentage,
        });
    });

    return comparisons.sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage));
}

// Generate rule-based insights
export interface Insight {
    type: 'warning' | 'success' | 'info' | 'tip';
    title: string;
    message: string;
    category?: string;
}

export function generateInsights(
    transactions: Transaction[],
    budgets: Budget[]
): Insight[] {
    const insights: Insight[] = [];

    // Weekly comparison insights
    const weeklyComparisons = comparePeriods(transactions, 'week');
    const significantChanges = weeklyComparisons.filter(
        (c) => Math.abs(c.changePercentage) > 25 && c.currentAmount > 1000
    );

    if (significantChanges.length > 0) {
        const top = significantChanges[0];
        if (top.changePercentage > 0) {
            insights.push({
                type: 'warning',
                title: 'Increased Spending Alert',
                message: `You spent ${Math.round(top.changePercentage)}% more on ${top.category} this week`,
                category: top.category,
            });
        } else {
            insights.push({
                type: 'success',
                title: 'Great Savings!',
                message: `You spent ${Math.round(Math.abs(top.changePercentage))}% less on ${top.category} this week`,
                category: top.category,
            });
        }
    }

    // Budget insights
    const weeklySummary = getSpendingSummary(transactions, 'week');
    const weeklyBreakdown = getCategoryBreakdown(transactions, 'week', 10);

    budgets.forEach((budget) => {
        const categorySpend = weeklyBreakdown.find((b) => b.category === budget.category);
        if (categorySpend) {
            const spent = budget.period === 'weekly' ? categorySpend.amount : categorySpend.amount * 4.33;
            const percentage = (spent / budget.amount) * 100;

            if (percentage >= 90) {
                insights.push({
                    type: 'warning',
                    title: 'Budget Almost Exhausted',
                    message: `You've used ${Math.round(percentage)}% of your ${budget.category} budget`,
                    category: budget.category,
                });
            } else if (percentage >= 70) {
                insights.push({
                    type: 'info',
                    title: 'Budget Update',
                    message: `You've used ${Math.round(percentage)}% of your ${budget.category} budget`,
                    category: budget.category,
                });
            }
        }
    });

    // Spending pattern insights
    if (weeklySummary.totalExpense > weeklySummary.totalIncome && weeklySummary.totalIncome > 0) {
        insights.push({
            type: 'warning',
            title: 'Spending Exceeds Income',
            message: `Your weekly expenses are ₦${Math.round(weeklySummary.totalExpense - weeklySummary.totalIncome).toLocaleString()} more than your income`,
        });
    } else if (weeklySummary.balance > 0 && weeklySummary.totalIncome > 0) {
        const savingsRate = (weeklySummary.balance / weeklySummary.totalIncome) * 100;
        if (savingsRate > 20) {
            insights.push({
                type: 'success',
                title: 'Excellent Savings Rate',
                message: `You're saving ${Math.round(savingsRate)}% of your income this week!`,
            });
        }
    }

    // Top spending category tip
    const topCategory = weeklyBreakdown[0];
    if (topCategory && topCategory.percentage > 40) {
        insights.push({
            type: 'tip',
            title: 'High Category Spending',
            message: `${topCategory.category} accounts for ${Math.round(topCategory.percentage)}% of your expenses. Consider setting a budget.`,
            category: topCategory.category,
        });
    }

    return insights.slice(0, 3); // Return top 3 insights
}

// Budget progress calculation
export interface BudgetProgress {
    budget: Budget;
    spent: number;
    remaining: number;
    percentage: number;
    status: 'safe' | 'warning' | 'danger';
}

export function getBudgetProgress(transactions: Transaction[], budgets: Budget[]): BudgetProgress[] {
    return budgets.map((budget) => {
        const period = budget.period === 'weekly' ? 'week' : 'month';
        const breakdown = getCategoryBreakdown(transactions, period, 100);
        const categorySpend = breakdown.find((b) => b.category === budget.category);
        const spent = categorySpend ? categorySpend.amount : 0;
        const remaining = Math.max(0, budget.amount - spent);
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        let status: 'safe' | 'warning' | 'danger';
        if (percentage >= 90) {
            status = 'danger';
        } else if (percentage >= 70) {
            status = 'warning';
        } else {
            status = 'safe';
        }

        return {
            budget,
            spent,
            remaining,
            percentage,
            status,
        };
    });
}
