/**
 * Budget Alerts Service
 * Monitors spending against budgets and triggers alerts when thresholds are reached
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Budget, Transaction } from '../contexts/FinanceContext';

// Alert thresholds
export const BUDGET_THRESHOLDS = {
    WARNING: 80,  // 80% of budget used
    DANGER: 100,  // 100% of budget used
} as const;

// Alert types
export interface BudgetAlert {
    id: string;
    budgetId: string;
    category: string;
    type: 'warning' | 'exceeded';
    percentage: number;
    spent: number;
    budget: number;
    message: string;
    createdAt: string;
    dismissed: boolean;
}

// Storage key for dismissed alerts
const DISMISSED_ALERTS_KEY = 'edufi_dismissed_budget_alerts';

/**
 * Calculate spending for a category within a given period
 */
export function calculateCategorySpending(
    transactions: Transaction[],
    category: string,
    period: 'weekly' | 'monthly'
): number {
    const now = new Date();
    let startDate: Date;

    if (period === 'weekly') {
        // Start of current week (Sunday)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
    } else {
        // Start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return Math.abs(
        transactions
            .filter(t => {
                const txDate = new Date(t.date);
                return t.category === category &&
                    t.amount < 0 &&
                    txDate >= startDate;
            })
            .reduce((sum, t) => sum + t.amount, 0)
    );
}

/**
 * Check a single budget and generate alert if needed
 */
export function checkBudgetStatus(
    budget: Budget,
    transactions: Transaction[]
): { percentage: number; status: 'safe' | 'warning' | 'exceeded'; spent: number } {
    const spent = calculateCategorySpending(transactions, budget.category, budget.period);
    const percentage = (spent / budget.amount) * 100;

    let status: 'safe' | 'warning' | 'exceeded' = 'safe';
    if (percentage >= BUDGET_THRESHOLDS.DANGER) {
        status = 'exceeded';
    } else if (percentage >= BUDGET_THRESHOLDS.WARNING) {
        status = 'warning';
    }

    return { percentage, status, spent };
}

/**
 * Generate alerts for all budgets that need attention
 */
export function generateBudgetAlerts(
    budgets: Budget[],
    transactions: Transaction[]
): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];

    budgets.forEach(budget => {
        const { percentage, status, spent } = checkBudgetStatus(budget, transactions);

        if (status === 'warning') {
            alerts.push({
                id: `alert_${budget.id}_${Date.now()}`,
                budgetId: budget.id,
                category: budget.category,
                type: 'warning',
                percentage: Math.round(percentage),
                spent,
                budget: budget.amount,
                message: `You've used ${Math.round(percentage)}% of your ${budget.category} budget. ₦${(budget.amount - spent).toLocaleString()} remaining.`,
                createdAt: new Date().toISOString(),
                dismissed: false,
            });
        } else if (status === 'exceeded') {
            const overspent = spent - budget.amount;
            alerts.push({
                id: `alert_${budget.id}_${Date.now()}`,
                budgetId: budget.id,
                category: budget.category,
                type: 'exceeded',
                percentage: Math.round(percentage),
                spent,
                budget: budget.amount,
                message: `Budget exceeded! You've overspent your ${budget.category} budget by ₦${overspent.toLocaleString()}.`,
                createdAt: new Date().toISOString(),
                dismissed: false,
            });
        }
    });

    return alerts;
}

/**
 * Get dismissed alert IDs from storage
 */
export async function getDismissedAlertIds(): Promise<string[]> {
    try {
        const stored = await AsyncStorage.getItem(DISMISSED_ALERTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error getting dismissed alerts:', error);
        return [];
    }
}

/**
 * Dismiss an alert (save to storage)
 */
export async function dismissAlert(alertId: string): Promise<void> {
    try {
        const dismissed = await getDismissedAlertIds();
        if (!dismissed.includes(alertId)) {
            dismissed.push(alertId);
            await AsyncStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(dismissed));
        }
    } catch (error) {
        console.error('Error dismissing alert:', error);
    }
}

/**
 * Clear old dismissed alerts (older than 7 days)
 */
export async function clearOldDismissedAlerts(): Promise<void> {
    try {
        // For now, just clear all - in a more robust implementation,
        // you'd track timestamps and remove only old ones
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        // Since we don't store timestamps, we'll just limit to last 50
        const dismissed = await getDismissedAlertIds();
        if (dismissed.length > 50) {
            const trimmed = dismissed.slice(-50);
            await AsyncStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(trimmed));
        }
    } catch (error) {
        console.error('Error clearing old alerts:', error);
    }
}

/**
 * Format currency in Naira
 */
export function formatNaira(amount: number): string {
    return `₦${Math.abs(amount).toLocaleString('en-NG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
}

/**
 * Get alert severity color
 */
export function getAlertColor(type: 'warning' | 'exceeded'): string {
    return type === 'exceeded' ? '#FF4444' : '#FFA500';
}

/**
 * Get alert icon name
 */
export function getAlertIcon(type: 'warning' | 'exceeded'): string {
    return type === 'exceeded' ? 'alert-circle' : 'warning';
}
