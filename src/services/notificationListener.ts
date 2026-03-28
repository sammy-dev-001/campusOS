/**
 * Notification Listener Wrapper
 * Wraps react-native-android-notification-listener for bank transaction detection
 */

import { NativeModules, NativeEventEmitter, Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    NotificationTransactionService,
    ParsedTransaction,
    NotificationData,
    isBankNotification
} from './notificationTransactionService';

// Event name for notification received
const NOTIFICATION_RECEIVED_EVENT = 'onNotificationReceived';

// Listener state
let isListening = false;
let eventEmitter: NativeEventEmitter | null = null;
let notificationSubscription: any = null;
let appStateSubscription: any = null;

// Callback type for transaction detection
type TransactionCallback = (transaction: ParsedTransaction) => void;
let transactionCallbacks: TransactionCallback[] = [];

/**
 * Initialize the notification listener module
 */
function getNotificationListenerModule() {
    if (Platform.OS !== 'android') {
        return null;
    }

    try {
        // Try to get the native module
        const RNAndroidNotificationListener = NativeModules.RNAndroidNotificationListener;
        if (!RNAndroidNotificationListener) {
            console.log('RNAndroidNotificationListener module not found');
            return null;
        }
        return RNAndroidNotificationListener;
    } catch (error) {
        console.error('Error getting notification listener module:', error);
        return null;
    }
}

/**
 * Handle incoming notification
 */
function handleNotification(notification: NotificationData) {
    try {
        // Only process bank notifications
        if (!isBankNotification(notification.app)) {
            return;
        }

        console.log('[NotificationListener] Bank notification received:', notification.app);

        // Parse the notification for transaction data
        const transaction = NotificationTransactionService.parseNotification(notification);

        if (transaction) {
            console.log('[NotificationListener] Transaction detected:', {
                type: transaction.type,
                amount: transaction.amount,
                bank: transaction.bank,
            });

            // Notify all registered callbacks
            transactionCallbacks.forEach(callback => {
                try {
                    callback(transaction);
                } catch (error) {
                    console.error('[NotificationListener] Callback error:', error);
                }
            });

            // Mark as processed
            NotificationTransactionService.markNotificationAsProcessed([transaction.id]);
        }
    } catch (error) {
        console.error('[NotificationListener] Error handling notification:', error);
    }
}

/**
 * Start listening for notifications
 */
export async function startListening(): Promise<boolean> {
    if (Platform.OS !== 'android') {
        console.log('[NotificationListener] Not available on this platform');
        return false;
    }

    if (isListening) {
        console.log('[NotificationListener] Already listening');
        return true;
    }

    try {
        const module = getNotificationListenerModule();
        if (!module) {
            console.log('[NotificationListener] Native module not available');
            return false;
        }

        // Check permission first
        const hasPermission = await NotificationTransactionService.hasNotificationPermission();
        if (!hasPermission) {
            console.log('[NotificationListener] No permission granted');
            return false;
        }

        // Create event emitter if needed
        if (!eventEmitter) {
            eventEmitter = new NativeEventEmitter(module);
        }

        // Subscribe to notifications
        notificationSubscription = eventEmitter.addListener(
            NOTIFICATION_RECEIVED_EVENT,
            (notification: NotificationData) => {
                handleNotification(notification);
            }
        );

        // Monitor app state to re-check permission when returning
        appStateSubscription = AppState.addEventListener('change', async (nextState) => {
            if (nextState === 'active') {
                // User might have changed permission in settings
                const stillHasPermission = await NotificationTransactionService.hasNotificationPermission();
                if (!stillHasPermission && isListening) {
                    console.log('[NotificationListener] Permission revoked, stopping listener');
                    stopListening();
                } else if (stillHasPermission) {
                    // Confirm permission if pending
                    await NotificationTransactionService.confirmNotificationPermission();
                }
            }
        });

        isListening = true;
        console.log('[NotificationListener] Started listening for bank notifications');
        return true;

    } catch (error) {
        console.error('[NotificationListener] Error starting listener:', error);
        return false;
    }
}

/**
 * Stop listening for notifications
 */
export function stopListening(): void {
    if (notificationSubscription) {
        notificationSubscription.remove();
        notificationSubscription = null;
    }

    if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
    }

    isListening = false;
    console.log('[NotificationListener] Stopped listening');
}

/**
 * Register a callback for when a transaction is detected
 */
export function onTransactionDetected(callback: TransactionCallback): () => void {
    transactionCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
        transactionCallbacks = transactionCallbacks.filter(cb => cb !== callback);
    };
}

/**
 * Check if currently listening
 */
export function isCurrentlyListening(): boolean {
    return isListening;
}

/**
 * Get list of supported bank apps
 */
export function getSupportedBankApps(): string[] {
    return Object.values(NotificationTransactionService.NIGERIAN_BANK_PACKAGES);
}

/**
 * Export the listener service
 */
export const NotificationListener = {
    startListening,
    stopListening,
    onTransactionDetected,
    isCurrentlyListening,
    getSupportedBankApps,
};

export default NotificationListener;
