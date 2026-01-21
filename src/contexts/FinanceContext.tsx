import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useReducer } from 'react';

// Storage key
const STORAGE_KEY = 'edufi_finance_state_v1';

// Default categories for Nigerian students
const defaultCategories = [
    'Food',
    'Transport',
    'Data',
    'Bills',
    'Shopping',
    'Health',
    'Entertainment',
    'Education',
    'Other',
];

// Types
export interface TransactionLocation {
    latitude: number;
    longitude: number;
    address?: string;
}

export interface Transaction {
    id: string;
    userId?: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    date: string;
    note?: string;
    source?: 'manual' | 'sms' | 'email';
    rawMessage?: string;
    location?: TransactionLocation;
}

export interface Budget {
    id: string;
    category: string;
    amount: number;
    period: 'weekly' | 'monthly';
    createdAt: string;
}

export interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    category: string;
    createdAt: string;
}

interface FinanceState {
    categories: string[];
    transactions: Transaction[];
    budgets: Budget[];
    savingsGoals: SavingsGoal[];
}

type FinanceAction =
    | { type: 'ADD_TRANSACTION'; payload: Transaction }
    | { type: 'REMOVE_TRANSACTION'; payload: string }
    | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
    | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
    | { type: 'ADD_BUDGET'; payload: Budget }
    | { type: 'UPDATE_BUDGET'; payload: Budget }
    | { type: 'DELETE_BUDGET'; payload: string }
    | { type: 'ADD_GOAL'; payload: SavingsGoal }
    | { type: 'UPDATE_GOAL'; payload: SavingsGoal }
    | { type: 'DELETE_GOAL'; payload: string }
    | { type: 'CLEAR_ALL' };

// Reducer
function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
    switch (action.type) {
        case 'ADD_TRANSACTION': {
            const transactions = [action.payload, ...state.transactions].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            return { ...state, transactions };
        }

        case 'REMOVE_TRANSACTION': {
            return {
                ...state,
                transactions: state.transactions.filter((t) => t.id !== action.payload),
            };
        }

        case 'UPDATE_TRANSACTION': {
            const transactions = state.transactions
                .map((t) => (t.id === action.payload.id ? { ...t, ...action.payload } : t))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return { ...state, transactions };
        }

        case 'SET_TRANSACTIONS': {
            const transactions = action.payload
                .filter((t) => t && typeof t === 'object')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return { ...state, transactions };
        }

        case 'ADD_BUDGET': {
            return { ...state, budgets: [...state.budgets, action.payload] };
        }

        case 'UPDATE_BUDGET': {
            const budgets = state.budgets.map((b) =>
                b.id === action.payload.id ? { ...b, ...action.payload } : b
            );
            return { ...state, budgets };
        }

        case 'DELETE_BUDGET': {
            return { ...state, budgets: state.budgets.filter((b) => b.id !== action.payload) };
        }

        case 'ADD_GOAL': {
            return { ...state, savingsGoals: [...state.savingsGoals, action.payload] };
        }

        case 'UPDATE_GOAL': {
            const goals = state.savingsGoals.map((g) =>
                g.id === action.payload.id ? { ...g, ...action.payload } : g
            );
            return { ...state, savingsGoals: goals };
        }

        case 'DELETE_GOAL': {
            return { ...state, savingsGoals: state.savingsGoals.filter((g) => g.id !== action.payload) };
        }

        case 'CLEAR_ALL': {
            return { ...state, transactions: [] };
        }

        default:
            return state;
    }
}

// Initial state
const initialState: FinanceState = {
    categories: defaultCategories,
    transactions: [],
    budgets: [],
    savingsGoals: [],
};

// Context type
interface FinanceContextType extends FinanceState {
    // Transaction actions
    addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
    removeTransaction: (id: string) => void;
    updateTransaction: (transaction: Transaction) => void;
    replaceTransactions: (transactions: Transaction[]) => void;
    clearAll: () => void;

    // Budget actions
    addBudget: (data: Omit<Budget, 'id' | 'createdAt'>) => void;
    updateBudget: (budget: Budget) => void;
    deleteBudget: (id: string) => void;

    // Savings goal actions
    addGoal: (data: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
    updateGoal: (goal: SavingsGoal) => void;
    deleteGoal: (id: string) => void;

    // Loading state
    isLoading: boolean;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(financeReducer, initialState);
    const [isLoading, setIsLoading] = React.useState(true);

    // Load state from storage on mount
    useEffect(() => {
        loadFinanceData();
    }, []);

    // Save state to storage whenever it changes
    useEffect(() => {
        if (!isLoading) {
            saveFinanceData(state);
        }
    }, [state, isLoading]);

    const loadFinanceData = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as FinanceState;
                dispatch({ type: 'SET_TRANSACTIONS', payload: parsed.transactions || [] });
                if (parsed.budgets?.length) {
                    parsed.budgets.forEach((b) => dispatch({ type: 'ADD_BUDGET', payload: b }));
                }
                if (parsed.savingsGoals?.length) {
                    parsed.savingsGoals.forEach((g) => dispatch({ type: 'ADD_GOAL', payload: g }));
                }
            }
        } catch (error) {
            console.error('Error loading finance data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveFinanceData = async (data: FinanceState) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving finance data:', error);
        }
    };

    // Transaction actions
    const addTransaction = async (data: Omit<Transaction, 'id'>) => {
        const id = `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const normalizedAmount = Number(data.amount);

        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            throw new Error('Invalid transaction amount');
        }

        const value = data.type === 'income' ? Math.abs(normalizedAmount) : -Math.abs(normalizedAmount);

        const transaction: Transaction = {
            ...data,
            id,
            amount: value,
            date: data.date || new Date().toISOString(),
            note: data.note || '',
            source: data.source || 'manual',
        };

        dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
    };

    const removeTransaction = (id: string) => {
        dispatch({ type: 'REMOVE_TRANSACTION', payload: id });
    };

    const updateTransaction = (transaction: Transaction) => {
        dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
    };

    const replaceTransactions = (transactions: Transaction[]) => {
        dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
    };

    const clearAll = () => {
        dispatch({ type: 'CLEAR_ALL' });
    };

    // Budget actions
    const addBudget = (data: Omit<Budget, 'id' | 'createdAt'>) => {
        const id = `budget_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const budget: Budget = {
            ...data,
            id,
            amount: Number(data.amount),
            createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_BUDGET', payload: budget });
    };

    const updateBudget = (budget: Budget) => {
        dispatch({ type: 'UPDATE_BUDGET', payload: budget });
    };

    const deleteBudget = (id: string) => {
        dispatch({ type: 'DELETE_BUDGET', payload: id });
    };

    // Savings goal actions
    const addGoal = (data: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
        const id = `goal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const goal: SavingsGoal = {
            ...data,
            id,
            targetAmount: Number(data.targetAmount),
            currentAmount: Number(data.currentAmount),
            targetDate: new Date(data.targetDate).toISOString(),
            createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_GOAL', payload: goal });
    };

    const updateGoal = (goal: SavingsGoal) => {
        dispatch({ type: 'UPDATE_GOAL', payload: goal });
    };

    const deleteGoal = (id: string) => {
        dispatch({ type: 'DELETE_GOAL', payload: id });
    };

    const value = useMemo<FinanceContextType>(
        () => ({
            categories: state.categories,
            transactions: state.transactions,
            budgets: state.budgets,
            savingsGoals: state.savingsGoals,
            addTransaction,
            removeTransaction,
            updateTransaction,
            replaceTransactions,
            clearAll,
            addBudget,
            updateBudget,
            deleteBudget,
            addGoal,
            updateGoal,
            deleteGoal,
            isLoading,
        }),
        [state, isLoading]
    );

    return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};
