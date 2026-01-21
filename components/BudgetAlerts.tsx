/**
 * Budget Alerts Component
 * Displays budget alerts on the Finance screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    BudgetAlert,
    generateBudgetAlerts,
    getDismissedAlertIds,
    dismissAlert as dismissAlertService,
    getAlertColor
} from '../src/services/budgetAlerts';
import { useFinance } from '../src/contexts/FinanceContext';
import { EduFiSpacing, EduFiFonts, formatNaira } from '../src/theme/edufi';

interface BudgetAlertsProps {
    textColor?: string;
    onViewBudgets?: () => void;
}

export default function BudgetAlerts({ textColor = '#333', onViewBudgets }: BudgetAlertsProps) {
    const { budgets, transactions } = useFinance();
    const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    useEffect(() => {
        loadAlerts();
    }, [budgets, transactions]);

    const loadAlerts = async () => {
        const dismissed = await getDismissedAlertIds();
        setDismissedIds(dismissed);

        const newAlerts = generateBudgetAlerts(budgets, transactions);
        // Filter out previously dismissed alerts for the same budget
        const filteredAlerts = newAlerts.filter(
            alert => !dismissed.some(id => id.includes(alert.budgetId))
        );
        setAlerts(filteredAlerts);
    };

    const handleDismiss = async (alert: BudgetAlert) => {
        await dismissAlertService(alert.budgetId);
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
    };

    if (alerts.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {alerts.map((alert) => (
                <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => handleDismiss(alert)}
                    onViewBudgets={onViewBudgets}
                />
            ))}
        </View>
    );
}

interface AlertCardProps {
    alert: BudgetAlert;
    onDismiss: () => void;
    onViewBudgets?: () => void;
}

function AlertCard({ alert, onDismiss, onViewBudgets }: AlertCardProps) {
    const color = getAlertColor(alert.type);
    const bgColor = color + '15'; // 15% opacity

    return (
        <View style={[styles.alertCard, { backgroundColor: bgColor, borderLeftColor: color }]}>
            <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                    <Ionicons
                        name={alert.type === 'exceeded' ? 'alert-circle' : 'warning'}
                        size={20}
                        color={color}
                    />
                    <Text style={[styles.alertTitle, { color }]}>
                        {alert.type === 'exceeded' ? 'Budget Exceeded!' : 'Budget Warning'}
                    </Text>
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <View style={styles.alertActions}>
                    {onViewBudgets && (
                        <TouchableOpacity
                            style={[styles.alertButton, { backgroundColor: color }]}
                            onPress={onViewBudgets}
                        >
                            <Text style={styles.alertButtonText}>View Budget</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.dismissButton}
                        onPress={onDismiss}
                    >
                        <Text style={[styles.dismissText, { color }]}>Dismiss</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
                <Ionicons name="close" size={18} color="#999" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: EduFiSpacing.md,
        marginBottom: EduFiSpacing.md,
        gap: EduFiSpacing.sm,
    },
    alertCard: {
        flexDirection: 'row',
        borderRadius: 12,
        borderLeftWidth: 4,
        padding: EduFiSpacing.md,
        position: 'relative',
    },
    alertContent: {
        flex: 1,
        paddingRight: 24,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    alertTitle: {
        fontSize: EduFiFonts.sizes.md,
        fontWeight: EduFiFonts.weights.semibold,
    },
    alertMessage: {
        fontSize: EduFiFonts.sizes.sm,
        color: '#555',
        lineHeight: 18,
        marginBottom: 10,
    },
    alertActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    alertButton: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
    },
    alertButtonText: {
        color: '#fff',
        fontSize: EduFiFonts.sizes.sm,
        fontWeight: EduFiFonts.weights.medium,
    },
    dismissButton: {
        paddingVertical: 6,
    },
    dismissText: {
        fontSize: EduFiFonts.sizes.sm,
        fontWeight: EduFiFonts.weights.medium,
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 4,
    },
});
