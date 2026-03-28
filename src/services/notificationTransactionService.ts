/**
 * Notification Transaction Service
 * Refactored from SMS-based detection to NotificationListenerService
 * 
 * Detects and parses bank transaction notifications on Android
 * This avoids Google Play Protect warnings triggered by READ_SMS permission
 */

import { Platform, Alert, Linking, NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const NOTIFICATION_PERMISSION_KEY = 'edufi_notification_permission_granted';
const LAST_CHECK_KEY = 'edufi_last_notification_check';
const PROCESSED_NOTIFICATIONS_KEY = 'edufi_processed_notification_ids';

// Nigerian Bank App Package Names - filter notifications by these
export const NIGERIAN_BANK_PACKAGES: Record<string, string> = {
    'com.gtbank.gtworld': 'GTBank',
    'com.kuda.android': 'Kuda',
    'team.opay.pay': 'OPay',
    'com.palmpay.app': 'PalmPay',
    'com.accessbank.nextgen': 'Access Bank',
    'com.zenithBank.mobile': 'Zenith Bank',
    'com.uba.mobile': 'UBA',
    'com.firstbank.mobile': 'First Bank',
    'com.stanbicibtc.android': 'Stanbic IBTC',
    'com.wemabank.alat': 'Wema Bank (ALAT)',
    'com.unionbankng.unionmobile': 'Union Bank',
    'com.fidelitybank.mobile': 'Fidelity Bank',
};

// Bank notification patterns for transaction detection
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
        name: 'OPay',
        keywords: ['opay', 'opera'],
        creditPatterns: [
            /received\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
            /cr[ei]d[ie]t?\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        debitPatterns: [
            /sent\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
            /paid\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
            /deb[ie]t\.?\s*(of\s*)?(NGN?)?\s*([\d,]+\.?\d*)/i,
            /transfer\s+to/i,
        ],
        amountPattern: /(NGN?|₦)\s*([\d,]+\.?\d*)/i,
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
        amountPattern: /(NGN?|₦)\s*([\d,]+\.?\d*)/i,
    },
    {
        name: 'PalmPay',
        keywords: ['palmpay', 'palm pay'],
        creditPatterns: [
            /received\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        debitPatterns: [
            /sent\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
            /paid\s*(NGN?)?\s*([\d,]+\.?\d*)/i,
        ],
        amountPattern: /(NGN?|₦)\s*([\d,]+\.?\d*)/i,
    },
];

// Parsed transaction from notification
export interface ParsedTransaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    bank: string;
    rawMessage: string;
    timestamp: Date;
    suggestedCategory?: string;
    source: 'notification';
}

// Notification data structure from the listener
export interface NotificationData {
    app: string;          // Package name
    title: string;        // Notification title
    text: string;         // Notification body text
    time: number;         // Timestamp
    groupedMessages?: string[];  // Grouped notification messages
}

/**
 * Check if notification listening is available (Android only)
 */
export function isNotificationListenerAvailable(): boolean {
    return Platform.OS === 'android';
}

/**
 * Check if user has enabled notification access in system settings
 */
export async function hasNotificationPermission(): Promise<boolean> {
    if (!isNotificationListenerAvailable()) return false;

    try {
        // Check if we have stored that permission was granted
        const stored = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
        if (stored !== 'true') return false;

        // Try to verify with native module if available
        if (NativeModules.RNAndroidNotificationListener) {
            const status = await NativeModules.RNAndroidNotificationListener.getPermissionStatus();
            return status === 'authorized';
        }

        return stored === 'true';
    } catch (error) {
        console.log('Error checking notification permission:', error);
        return false;
    }
}

/**
 * Open system settings for notification access
 * Unlike SMS, notification access requires user to manually enable in settings
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (!isNotificationListenerAvailable()) {
        return false;
    }

    try {
        // Show explanation alert first
        return new Promise((resolve) => {
            Alert.alert(
                'Enable Notification Access',
                'To automatically detect bank transactions, EduFi needs access to read notifications.\n\n' +
                'You will be taken to Settings. Find "EduFi" in the list and toggle it ON.',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => resolve(false),
                    },
                    {
                        text: 'Open Settings',
                        onPress: async () => {
                            try {
                                // Open notification listener settings
                                await Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
                                // Mark as pending - user needs to come back
                                await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'pending');
                                resolve(true);
                            } catch (error) {
                                console.error('Error opening settings:', error);
                                // Fallback to general app settings
                                await Linking.openSettings();
                                resolve(false);
                            }
                        },
                    },
                ]
            );
        });
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

/**
 * Mark notification permission as granted (called when user returns to app)
 */
export async function confirmNotificationPermission(): Promise<void> {
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
}

/**
 * Revoke notification permission (user opt-out)
 */
export async function revokeNotificationPermission(): Promise<void> {
    await AsyncStorage.removeItem(NOTIFICATION_PERMISSION_KEY);
    await AsyncStorage.removeItem(LAST_CHECK_KEY);
    await AsyncStorage.removeItem(PROCESSED_NOTIFICATIONS_KEY);
}

/**
 * Check if a notification is from a Nigerian bank app
 */
export function isBankNotification(packageName: string): boolean {
    return packageName in NIGERIAN_BANK_PACKAGES;
}

/**
 * Get bank name from package name
 */
export function getBankNameFromPackage(packageName: string): string {
    return NIGERIAN_BANK_PACKAGES[packageName] || 'Unknown Bank';
}

/**
 * Parse a notification for transaction data
 */
export function parseNotification(notification: NotificationData): ParsedTransaction | null {
    const { app, title, text, time, groupedMessages } = notification;

    // Only process bank notifications
    if (!isBankNotification(app)) {
        return null;
    }

    const bankName = getBankNameFromPackage(app);

    // Combine title and text for parsing
    const fullMessage = `${title || ''} ${text || ''} ${(groupedMessages || []).join(' ')}`;
    const lowerMessage = fullMessage.toLowerCase();

    // Find matching bank pattern
    let matchedPattern: BankPattern | null = null;
    for (const pattern of NIGERIAN_BANK_PATTERNS) {
        const hasKeyword = pattern.keywords.some(kw => lowerMessage.includes(kw));
        if (hasKeyword) {
            matchedPattern = pattern;
            break;
        }
    }

    // Use generic pattern if no specific match
    if (!matchedPattern) {
        matchedPattern = {
            name: bankName,
            keywords: [],
            creditPatterns: [/received\s*(NGN?|₦)?\s*([\d,]+\.?\d*)/i, /credit/i],
            debitPatterns: [
                /deb[ie]t/i,
                /sent\s*(NGN?|₦)?\s*([\d,]+\.?\d*)/i,
                /transfer\s+to/i,
                /paid\s*(NGN?|₦)?\s*([\d,]+\.?\d*)/i,
            ],
            amountPattern: /(NGN?|₦)\s*([\d,]+\.?\d*)/i,
        };
    }

    // Determine transaction type
    let type: 'income' | 'expense' | null = null;
    let amount = 0;

    // Check for debit/expense patterns first (more common)
    const debitKeywords = ['debit', 'dr', 'sent', 'transfer to', 'paid', 'spent', 'withdrew', 'withdrawal'];
    const isDebit = debitKeywords.some(kw => lowerMessage.includes(kw));

    const creditKeywords = ['credit', 'cr', 'received', 'deposit'];
    const isCredit = creditKeywords.some(kw => lowerMessage.includes(kw));

    if (isDebit && !isCredit) {
        type = 'expense';
    } else if (isCredit && !isDebit) {
        type = 'income';
    } else if (isDebit && isCredit) {
        // If both keywords present, check which comes first
        const debitPos = Math.min(...debitKeywords.map(kw => {
            const pos = lowerMessage.indexOf(kw);
            return pos >= 0 ? pos : Infinity;
        }));
        const creditPos = Math.min(...creditKeywords.map(kw => {
            const pos = lowerMessage.indexOf(kw);
            return pos >= 0 ? pos : Infinity;
        }));
        type = debitPos < creditPos ? 'expense' : 'income';
    }

    // Extract amount - look for Naira symbol or NGN
    const amountPatterns = [
        /(NGN|₦)\s*([\d,]+(?:\.\d{2})?)/i,
        /N\s*([\d,]+(?:\.\d{2})?)/i,
        /([\d,]+(?:\.\d{2})?)\s*naira/i,
    ];

    for (const pattern of amountPatterns) {
        const match = fullMessage.match(pattern);
        if (match) {
            const amountStr = match[2] || match[1];
            if (amountStr) {
                amount = parseFloat(amountStr.replace(/,/g, ''));
                if (!isNaN(amount) && amount > 0) break;
            }
        }
    }

    // Skip if no valid transaction detected
    if (!type || amount <= 0) {
        return null;
    }

    return {
        id: `notif_${time}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        amount,
        bank: bankName,
        rawMessage: fullMessage.trim(),
        timestamp: new Date(time),
        suggestedCategory: suggestCategory(fullMessage, type),
        source: 'notification',
    };
}

/**
 * Suggest a category based on notification content
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
    if (lower.includes('airtime') || lower.includes('data') || lower.includes('mtn') ||
        lower.includes('glo') || lower.includes('airtel') || lower.includes('9mobile')) return 'Data';
    if (lower.includes('uber') || lower.includes('bolt') || lower.includes('transport')) return 'Transport';
    if (lower.includes('jumia') || lower.includes('konga')) return 'Shopping';
    if (lower.includes('dstv') || lower.includes('gotv') || lower.includes('netflix') ||
        lower.includes('showmax')) return 'Entertainment';
    if (lower.includes('nepa') || lower.includes('electricity') || lower.includes('phcn') ||
        lower.includes('ikedc') || lower.includes('ekedc') || lower.includes('prepaid')) return 'Bills';
    if (lower.includes('school') || lower.includes('tuition') || lower.includes('fee')) return 'Education';
    if (lower.includes('pharmacy') || lower.includes('hospital') || lower.includes('clinic')) return 'Health';
    if (lower.includes('restaurant') || lower.includes('food') || lower.includes('eat') ||
        lower.includes('chicken republic') || lower.includes('kfc')) return 'Food';

    return 'Other';
}

/**
 * Suggest a category using Gemini AI (with rule-based fallback)
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
 * Get processed notification IDs to avoid duplicates
 */
async function getProcessedNotificationIds(): Promise<Set<string>> {
    try {
        const stored = await AsyncStorage.getItem(PROCESSED_NOTIFICATIONS_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
        return new Set();
    }
}

/**
 * Mark notification as processed
 */
async function markNotificationAsProcessed(ids: string[]): Promise<void> {
    try {
        const existing = await getProcessedNotificationIds();
        ids.forEach(id => existing.add(id));

        // Keep only last 1000 IDs to prevent storage bloat
        const arr = Array.from(existing);
        const trimmed = arr.slice(-1000);

        await AsyncStorage.setItem(PROCESSED_NOTIFICATIONS_KEY, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Error marking notification as processed:', error);
    }
}

/**
 * Export for use in components
 */
export const NotificationTransactionService = {
    isNotificationListenerAvailable,
    hasNotificationPermission,
    requestNotificationPermission,
    confirmNotificationPermission,
    revokeNotificationPermission,
    isBankNotification,
    getBankNameFromPackage,
    parseNotification,
    getProcessedNotificationIds,
    markNotificationAsProcessed,
    suggestCategoryWithAI,
    NIGERIAN_BANK_PACKAGES,
};

export default NotificationTransactionService;
