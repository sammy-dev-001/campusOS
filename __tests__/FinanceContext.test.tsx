/**
 * Finance Context Tests
 * Tests for the FinanceContext provider and hooks
 */

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
}));

// Import after mocking
import { FinanceProvider, useFinance } from '../src/contexts/FinanceContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FinanceProvider>{children}</FinanceProvider>
);

describe('FinanceContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should provide initial state with default categories', () => {
        const { result } = renderHook(() => useFinance(), { wrapper });

        expect(result.current.categories).toBeDefined();
        expect(result.current.categories.length).toBeGreaterThan(0);
        expect(result.current.categories).toContain('Food');
        expect(result.current.categories).toContain('Transport');
    });

    it('should have empty transactions initially', () => {
        const { result } = renderHook(() => useFinance(), { wrapper });

        expect(result.current.transactions).toEqual([]);
    });

    it('should have empty budgets initially', () => {
        const { result } = renderHook(() => useFinance(), { wrapper });

        expect(result.current.budgets).toEqual([]);
    });

    it('should have empty savings goals initially', () => {
        const { result } = renderHook(() => useFinance(), { wrapper });

        expect(result.current.savingsGoals).toEqual([]);
    });

    it('should add a transaction', async () => {
        const { result } = renderHook(() => useFinance(), { wrapper });

        await act(async () => {
            await result.current.addTransaction({
                type: 'expense',
                amount: 5000,
                category: 'Food',
                date: new Date().toISOString(),
                note: 'Lunch',
            });
        });

        expect(result.current.transactions.length).toBe(1);
        expect(result.current.transactions[0].amount).toBe(5000);
        expect(result.current.transactions[0].category).toBe('Food');
    });

    it('should add a budget', () => {
        const { result } = renderHook(() => useFinance(), { wrapper });

        act(() => {
            result.current.addBudget({
                category: 'Food',
                amount: 50000,
                period: 'monthly',
            });
        });

        expect(result.current.budgets.length).toBe(1);
        expect(result.current.budgets[0].category).toBe('Food');
        expect(result.current.budgets[0].amount).toBe(50000);
    });

    it('should add a savings goal', () => {
        const { result } = renderHook(() => useFinance(), { wrapper });

        act(() => {
            result.current.addGoal({
                name: 'New Laptop',
                targetAmount: 500000,
                currentAmount: 0,
                targetDate: '2026-12-31',
                category: 'Education',
            });
        });

        expect(result.current.savingsGoals.length).toBe(1);
        expect(result.current.savingsGoals[0].name).toBe('New Laptop');
        expect(result.current.savingsGoals[0].targetAmount).toBe(500000);
    });
});
