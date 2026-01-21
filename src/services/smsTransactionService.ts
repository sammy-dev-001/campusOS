/**
 * SMS Transaction Detection Service
 * Detects and parses bank transaction SMS on Android
 * 
 * IMPORTANT: This service only works on Android and requires explicit user permission
 * iOS does not allow access to SMS, so manual entry is the fallback
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const SMS_PERMISSION_KEY = 'edufi_sms_permission_granted';
const LAST_SMS_CHECK_KEY = 'edufi_last_sms_check';
const PROCESSED_SMS_KEY = 'edufi_processed_sms_ids';

// Bank SMS patterns for Nigerian banks
export interface BankPattern {
    name: string;
    keywords: string[];
    creditPatterns: RegExp[];
    debitPatterns: RegExp[];
    amountPattern: RegExp;
}

export const NIGERIAN_BANK_PATTERNS: BankPattern[] = [
    {
        name: 'GTBank',
        keywords: ['gtbank', 'gtb', 'guaranty'],
        creditPatterns: [
            /cr[ei]d[ie]t?\.?\s*(of\s*)?NGN?\s*([\d,]+\.?\d*)/i,
            /received\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        debitPatterns: [
            /deb[ie]t\.?\s*(of\s*)?NGN?\s*([\d,]+\.?\d*)/i,
            /withdrawal\s*(of\s*)?NGN?\s*([\d,]+\.?\d*)/i,
            /sent\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        amountPattern: /NGN?\s*([\d,]+\.?\d*)/i,
    },
    {
        name: 'Access Bank',
        keywords: ['access bank', 'accessbank', 'diamond'],
        creditPatterns: [
            /cr[ei]d[ie]t?\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        debitPatterns: [
            /deb[ie]t\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        amountPattern: /(NGN?)?\s*([\d,]+\.?\d*)/i,
    },
    {
        name: 'First Bank',
        keywords: ['firstbank', 'first bank', 'fbn'],
        creditPatterns: [
            /cr[ei]d[ie]t?\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        debitPatterns: [
            /deb[ie]t\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        amountPattern: /(NGN?)?\s*([\d,]+\.?\d*)/i,
    },
    {
        name: 'UBA',
        keywords: ['uba', 'united bank'],
        creditPatterns: [
            /cr[ei]d[ie]t?\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        debitPatterns: [
            /deb[ie]t\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        amountPattern: /(NGN?)?\s*([\d,]+\.?\d*)/i,
    },
    {
        name: 'Zenith Bank',
        keywords: ['zenith', 'zenithbank'],
        creditPatterns: [
            /cr[ei]d[ie]t?\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        debitPatterns: [
            /deb[ie]t\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        amountPattern: /(NGN?)?\s*([\d,]+\.?\d*)/i,
    },
    {
        name: 'Opay',
        keywords: ['opay', 'opera'],
        creditPatterns: [
            /received\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
            /cr[ei]d[ie]t?\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        debitPatterns: [
            /sent\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
            /paid\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
            /deb[ie]t\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        amountPattern: /(NGN?)?\s*([\d,]+\.?\d*)/i,
    },
    {
        name: 'Kuda',
        keywords: ['kuda'],
        creditPatterns: [
            /received\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        debitPatterns: [
            /sent\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
            /spent\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        amountPattern: /(NGN?)?\s*([\d,]+\.?\d*)/i,
    },
    {
        name: 'Palmpay',
        keywords: ['palmpay', 'palm pay'],
        creditPatterns: [
            /received\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        debitPatterns: [
            /sent\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
            /paid\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        amountPattern: /(NGN?)?\s*([\d,]+\.?\d*)/i,
    },
];

// Parsed transaction from SMS
export interface ParsedSmsTransaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    bank: string;
    rawMessage: string;
    timestamp: Date;
    suggestedCategory?: string;
}

/**
 * Check if SMS permissions are available (Android only)
 */
export function isSmsAvailable(): boolean {
    return Platform.OS === 'android';
}

/**
 * Check if user has previously granted SMS permission
 */
export async function hasSmsPermissionGranted(): Promise<boolean> {
    if (!isSmsAvailable()) return false;

    try {
        const granted = await AsyncStorage.getItem(SMS_PERMISSION_KEY);
        return granted === 'true';
    } catch {
        return false;
    }
}

/**
 * Request SMS read permission with proper explanation
 */
export async function requestSmsPermission(): Promise<boolean> {
    if (!isSmsAvailable()) {
        return false;
    }

    try {
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            {
                title: 'SMS Permission Required',
                message:
                    'EduFi needs access to read your SMS messages to automatically detect bank transactions. ' +
                    'Your messages are processed locally on your device and never sent to any server.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
                buttonNeutral: 'Ask Later',
            }
        );

        const granted = result === PermissionsAndroid.RESULTS.GRANTED;

        if (granted) {
            await AsyncStorage.setItem(SMS_PERMISSION_KEY, 'true');
        }

        return granted;
    } catch (error) {
        console.error('Error requesting SMS permission:', error);
        return false;
    }
}

/**
 * Revoke SMS permission (user opt-out)
 */
export async function revokeSmsPermission(): Promise<void> {
    await AsyncStorage.removeItem(SMS_PERMISSION_KEY);
    await AsyncStorage.removeItem(LAST_SMS_CHECK_KEY);
    await AsyncStorage.removeItem(PROCESSED_SMS_KEY);
}

/**
 * Parse a single SMS message for transaction data
 */
export function parseSmsMessage(body: string, sender: string, timestamp: Date): ParsedSmsTransaction | null {
    const lowerBody = body.toLowerCase();
    const lowerSender = sender.toLowerCase();

    // Find matching bank
    let matchedBank: BankPattern | null = null;
    for (const bank of NIGERIAN_BANK_PATTERNS) {
        const hasKeyword = bank.keywords.some(kw =>
            lowerBody.includes(kw) || lowerSender.includes(kw)
        );
        if (hasKeyword) {
            matchedBank = bank;
            break;
        }
    }

    if (!matchedBank) {
        return null; // Not a recognized bank SMS
    }

    // Determine transaction type and extract amount
    let type: 'income' | 'expense' | null = null;
    let amount = 0;

    // Check for credit/income patterns
    for (const pattern of matchedBank.creditPatterns) {
        const match = body.match(pattern);
        if (match) {
            type = 'income';
            // Try to extract amount from the match
            const amountStr = match.find(m => /[\d,]+/.test(m || ''));
            if (amountStr) {
                amount = parseFloat(amountStr.replace(/,/g, ''));
            }
            break;
        }
    }

    // Check for debit/expense patterns if not already matched
    if (!type) {
        for (const pattern of matchedBank.debitPatterns) {
            const match = body.match(pattern);
            if (match) {
                type = 'expense';
                const amountStr = match.find(m => /[\d,]+/.test(m || ''));
                if (amountStr) {
                    amount = parseFloat(amountStr.replace(/,/g, ''));
                }
                break;
            }
        }
    }

    // If still no amount, try general amount pattern
    if (amount === 0) {
        const amountMatch = body.match(matchedBank.amountPattern);
        if (amountMatch) {
            const amountStr = amountMatch[1] || amountMatch[2];
            if (amountStr) {
                amount = parseFloat(amountStr.replace(/,/g, ''));
            }
        }
    }

    // Skip if no valid transaction detected
    if (!type || amount <= 0) {
        return null;
    }

    return {
        id: `sms_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        amount,
        bank: matchedBank.name,
        rawMessage: body,
        timestamp,
        suggestedCategory: suggestCategory(body, type),
    };
}

/**
 * Suggest a category based on SMS content (rule-based fallback)
 */
function suggestCategory(message: string, type: 'income' | 'expense'): string {
    const lower = message.toLowerCase();

    if (type === 'income') {
        if (lower.includes('salary') || lower.includes('wage')) return 'Salary';
        if (lower.includes('transfer from')) return 'Transfer';
        return 'Other Income';
    }

    // Expense categories
    if (lower.includes('pos') || lower.includes('atm')) return 'Shopping';
    if (lower.includes('airtime') || lower.includes('data') || lower.includes('mtn') || lower.includes('glo') || lower.includes('airtel')) return 'Data';
    if (lower.includes('uber') || lower.includes('bolt') || lower.includes('transport')) return 'Transport';
    if (lower.includes('jumia') || lower.includes('konga')) return 'Shopping';
    if (lower.includes('dstv') || lower.includes('gotv') || lower.includes('netflix')) return 'Entertainment';
    if (lower.includes('nepa') || lower.includes('electricity') || lower.includes('phcn') || lower.includes('ikedc')) return 'Bills';
    if (lower.includes('school') || lower.includes('tuition') || lower.includes('fee')) return 'Education';
    if (lower.includes('pharmacy') || lower.includes('hospital') || lower.includes('clinic')) return 'Health';
    if (lower.includes('restaurant') || lower.includes('food') || lower.includes('eat')) return 'Food';

    return 'Other';
}

/**
 * Suggest a category using Gemini AI (with rule-based fallback)
 * Import is dynamic to avoid circular dependencies
 */
export async function suggestCategoryWithAI(
    message: string,
    type: 'income' | 'expense',
    amount: number
): Promise<string> {
    try {
        const { categorizeWithGemini } = await import('./geminiCategorization');
        return await categorizeWithGemini(message, type, amount);
    } catch (error) {
        console.log('Gemini categorization failed, using rule-based:', error);
        return suggestCategory(message, type);
    }
}

/**
 * Get processed SMS IDs to avoid duplicates
 */
async function getProcessedSmsIds(): Promise<Set<string>> {
    try {
        const stored = await AsyncStorage.getItem(PROCESSED_SMS_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
        return new Set();
    }
}

/**
 * Mark SMS as processed
 */
async function markSmsAsProcessed(ids: string[]): Promise<void> {
    try {
        const existing = await getProcessedSmsIds();
        ids.forEach(id => existing.add(id));

        // Keep only last 1000 IDs to prevent storage bloat
        const arr = Array.from(existing);
        const trimmed = arr.slice(-1000);

        await AsyncStorage.setItem(PROCESSED_SMS_KEY, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Error marking SMS as processed:', error);
    }
}

/**
 * Export for use in components
 */
export const SmsTransactionService = {
    isSmsAvailable,
    hasSmsPermissionGranted,
    requestSmsPermission,
    revokeSmsPermission,
    parseSmsMessage,
    getProcessedSmsIds,
    markSmsAsProcessed,
    suggestCategoryWithAI,
};

export default SmsTransactionService;
