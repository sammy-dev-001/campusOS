/**
 * Gemini AI Categorization Service
 * Uses Google Gemini to intelligently categorize transactions from SMS
 * Falls back to rule-based categorization if API fails
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../constants/Config';

// Gemini API endpoint (now points to our own backend)
const CATEGORIZE_API_URL = `${API_BASE_URL}/ai/categorize`;

// Valid categories
export const TRANSACTION_CATEGORIES = [
    'Food',
    'Transport',
    'Data',
    'Bills',
    'Shopping',
    'Health',
    'Entertainment',
    'Education',
    'Salary',
    'Transfer',
    'Other',
] as const;

export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];

// Cache for API responses to reduce API calls
const categoryCache = new Map<string, TransactionCategory>();

/**
 * Check if Gemini API is configured (Always true now as it uses backend)
 */
export async function isGeminiConfigured(): Promise<boolean> {
    return true;
}

export async function categorizeWithGemini(
    smsText: string,
    transactionType: 'income' | 'expense',
    amount: number
): Promise<TransactionCategory> {
    // Check cache first
    const cacheKey = `${smsText.substring(0, 50)}_${transactionType}`;
    if (categoryCache.has(cacheKey)) {
        return categoryCache.get(cacheKey)!;
    }

    try {
        const authData = await AsyncStorage.getItem('authData');
        const token = authData ? JSON.parse(authData).token : null;

        const response = await fetch(CATEGORIZE_API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                smsText,
                type: transactionType,
                amount
            }),
        });

        if (!response.ok) {
            console.error('Categorization API error:', response.status);
            return ruleBasedCategorization(smsText, transactionType);
        }

        const resData = await response.json();
        const category = resData.data?.category as TransactionCategory || 'Other';

        // Cache the result
        categoryCache.set(cacheKey, category);

        return category;
    } catch (error) {
        console.error('Categorization failed:', error);
        return ruleBasedCategorization(smsText, transactionType);
    }
}



/**
 * Rule-based categorization fallback
 */
export function ruleBasedCategorization(
    message: string,
    type: 'income' | 'expense'
): TransactionCategory {
    const lower = message.toLowerCase();

    if (type === 'income') {
        if (lower.includes('salary') || lower.includes('wage')) return 'Salary';
        if (lower.includes('transfer from')) return 'Transfer';
        return 'Other';
    }

    // Expense categories
    if (lower.includes('pos') || lower.includes('atm')) return 'Shopping';
    if (lower.includes('airtime') || lower.includes('data') || lower.includes('mtn') ||
        lower.includes('glo') || lower.includes('airtel') || lower.includes('9mobile')) return 'Data';
    if (lower.includes('uber') || lower.includes('bolt') || lower.includes('transport') ||
        lower.includes('bus') || lower.includes('taxi')) return 'Transport';
    if (lower.includes('jumia') || lower.includes('konga') || lower.includes('shop')) return 'Shopping';
    if (lower.includes('dstv') || lower.includes('gotv') || lower.includes('netflix') ||
        lower.includes('spotify') || lower.includes('cinema')) return 'Entertainment';
    if (lower.includes('nepa') || lower.includes('electricity') || lower.includes('phcn') ||
        lower.includes('ikedc') || lower.includes('ekedc') || lower.includes('rent')) return 'Bills';
    if (lower.includes('school') || lower.includes('tuition') || lower.includes('fee') ||
        lower.includes('university') || lower.includes('college')) return 'Education';
    if (lower.includes('pharmacy') || lower.includes('hospital') || lower.includes('clinic') ||
        lower.includes('doctor') || lower.includes('medical')) return 'Health';
    if (lower.includes('restaurant') || lower.includes('food') || lower.includes('eat') ||
        lower.includes('chicken republic') || lower.includes('mr biggs') || lower.includes('kilimanjaro')) return 'Food';

    return 'Other';
}

/**
 * Batch categorize multiple transactions
 */
export async function batchCategorize(
    transactions: Array<{ smsText: string; type: 'income' | 'expense'; amount: number }>
): Promise<TransactionCategory[]> {
    const results: TransactionCategory[] = [];

    for (const tx of transactions) {
        const category = await categorizeWithGemini(tx.smsText, tx.type, tx.amount);
        results.push(category);

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
    }

    return results;
}

/**
 * Clear the category cache
 */
export function clearCategoryCache(): void {
    categoryCache.clear();
}

export const GeminiCategorizationService = {
    isGeminiConfigured,
    categorizeWithGemini,
    ruleBasedCategorization,
    batchCategorize,
    clearCategoryCache,
    TRANSACTION_CATEGORIES,
};

export default GeminiCategorizationService;
