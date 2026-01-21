/**
 * Gemini AI Categorization Service
 * Uses Google Gemini to intelligently categorize transactions from SMS
 * Falls back to rule-based categorization if API fails
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Cache key for API key
const API_KEY_STORAGE = 'edufi_gemini_api_key';

// Environment variable key (from .env)
const ENV_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

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
 * Set the Gemini API key
 */
export async function setGeminiApiKey(apiKey: string): Promise<void> {
    await AsyncStorage.setItem(API_KEY_STORAGE, apiKey);
}

/**
 * Get the stored Gemini API key (checks env first, then AsyncStorage)
 */
export async function getGeminiApiKey(): Promise<string | null> {
    // Check environment variable first
    if (ENV_API_KEY) {
        return ENV_API_KEY;
    }
    // Fall back to AsyncStorage
    return await AsyncStorage.getItem(API_KEY_STORAGE);
}

/**
 * Check if Gemini API is configured
 */
export async function isGeminiConfigured(): Promise<boolean> {
    const key = await getGeminiApiKey();
    return !!key;
}

/**
 * Categorize a transaction using Gemini AI
 */
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

    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
        console.log('Gemini API key not configured, using rule-based categorization');
        return ruleBasedCategorization(smsText, transactionType);
    }

    try {
        const prompt = buildCategorizationPrompt(smsText, transactionType, amount);

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 100,
                },
            }),
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status);
            return ruleBasedCategorization(smsText, transactionType);
        }

        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse the category from response
        const category = parseGeminiCategory(resultText);

        // Cache the result
        categoryCache.set(cacheKey, category);

        return category;
    } catch (error) {
        console.error('Gemini categorization failed:', error);
        return ruleBasedCategorization(smsText, transactionType);
    }
}

/**
 * Build the categorization prompt for Gemini
 */
function buildCategorizationPrompt(smsText: string, type: 'income' | 'expense', amount: number): string {
    const categories = type === 'income'
        ? ['Salary', 'Transfer', 'Other']
        : ['Food', 'Transport', 'Data', 'Bills', 'Shopping', 'Health', 'Entertainment', 'Education', 'Other'];

    return `You are a Nigerian bank transaction categorizer. Analyze this bank SMS and respond with ONLY the category name.

SMS: "${smsText}"
Transaction Type: ${type}
Amount: ₦${amount.toLocaleString()}

Valid categories: ${categories.join(', ')}

Consider common Nigerian transaction patterns:
- POS/ATM withdrawals → Shopping
- MTN/Glo/Airtel → Data
- Uber/Bolt → Transport
- DStv/Netflix → Entertainment
- NEPA/PHCN/electricity → Bills
- School/tuition → Education
- Pharmacy/hospital → Health
- Restaurant/food vendors → Food
- Salary/wages → Salary
- Transfer from others → Transfer

Respond with ONLY the category name, nothing else:`;
}

/**
 * Parse Gemini response to extract category
 */
function parseGeminiCategory(response: string): TransactionCategory {
    const cleaned = response.trim().toLowerCase();

    for (const category of TRANSACTION_CATEGORIES) {
        if (cleaned.includes(category.toLowerCase())) {
            return category;
        }
    }

    return 'Other';
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
    setGeminiApiKey,
    getGeminiApiKey,
    isGeminiConfigured,
    categorizeWithGemini,
    ruleBasedCategorization,
    batchCategorize,
    clearCategoryCache,
    TRANSACTION_CATEGORIES,
};

export default GeminiCategorizationService;
