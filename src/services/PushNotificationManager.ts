/**
 * Push Notification Manager
 * Handles push notification permissions, token registration, and notification handling
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../contexts/AuthContext';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
});

const PUSH_TOKEN_KEY = '@push_token';

/**
 * Register for push notifications and get the token
 * @returns {Promise<string|null>} - The push token or null if failed
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    let token: string | null = null;

    // Check if we're on a physical device
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
    }

    // Create notification channels for Android
    if (Platform.OS === 'android') {
        await createNotificationChannels();
    }

    // Check existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
    }

    try {
        // Get the Expo push token
        const pushTokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '4db3bf0f-f0fc-4892-b786-3ff8f17744b0', // From app.json
        });
        token = pushTokenData.data;

        // Store token locally
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

        console.log('Push token obtained:', token);
        return token;
    } catch (error) {
        console.error('Error getting push token:', error);
        return null;
    }
};

/**
 * Create Android notification channels
 */
const createNotificationChannels = async () => {
    await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4D96FF',
    });

    await Notifications.setNotificationChannelAsync('class-reminders', {
        name: 'Class Reminders',
        description: 'Reminders for upcoming classes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4D96FF',
    });

    await Notifications.setNotificationChannelAsync('assignments', {
        name: 'Assignments',
        description: 'Assignment deadline reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
    });

    await Notifications.setNotificationChannelAsync('events', {
        name: 'Events',
        description: 'Event reminders and updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#FFD93D',
    });

    await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        description: 'New message notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100, 100, 100],
        lightColor: '#6BCB77',
    });

    await Notifications.setNotificationChannelAsync('social', {
        name: 'Social',
        description: 'Study buddy matches and requests',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#BA68C8',
    });

    await Notifications.setNotificationChannelAsync('announcements', {
        name: 'Announcements',
        description: 'Campus announcements',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
    });

    await Notifications.setNotificationChannelAsync('academics', {
        name: 'Academics',
        description: 'Grades and academic updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4D96FF',
    });
};

/**
 * Register push token with the backend
 * @param {string} token - The push token to register
 * @returns {Promise<boolean>} - Success status
 */
export const registerTokenWithBackend = async (token: string): Promise<boolean> => {
    try {
        await api.post('/notifications/register-push-token', {
            pushToken: token,
            deviceType: Platform.OS,
        });
        console.log('Push token registered with backend');
        return true;
    } catch (error) {
        console.error('Error registering push token with backend:', error);
        return false;
    }
};

/**
 * Remove push token from backend
 * @returns {Promise<boolean>} - Success status
 */
export const removeTokenFromBackend = async (): Promise<boolean> => {
    try {
        await api.delete('/notifications/push-token');
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        console.log('Push token removed from backend');
        return true;
    } catch (error) {
        console.error('Error removing push token:', error);
        return false;
    }
};

/**
 * Get stored push token
 * @returns {Promise<string|null>} - The stored token or null
 */
export const getStoredPushToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    } catch (error) {
        console.error('Error getting stored push token:', error);
        return null;
    }
};

/**
 * Check if push notifications are enabled
 * @returns {Promise<boolean>} - Whether notifications are enabled
 */
export const arePushNotificationsEnabled = async (): Promise<boolean> => {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
};

/**
 * Add notification received listener
 * @param {function} handler - Handler for received notifications
 * @returns {Subscription} - Subscription to remove listener
 */
export const addNotificationReceivedListener = (
    handler: (notification: Notifications.Notification) => void
) => {
    return Notifications.addNotificationReceivedListener(handler);
};

/**
 * Add notification response listener (when user taps notification)
 * @param {function} handler - Handler for notification response
 * @returns {Subscription} - Subscription to remove listener
 */
export const addNotificationResponseListener = (
    handler: (response: Notifications.NotificationResponse) => void
) => {
    return Notifications.addNotificationResponseReceivedListener(handler);
};

/**
 * Schedule a local notification
 * @param {object} notification - Notification content
 * @param {object} trigger - Trigger options
 * @returns {Promise<string>} - Notification identifier
 */
export const scheduleLocalNotification = async (
    notification: {
        title: string;
        body: string;
        data?: Record<string, unknown>;
    },
    trigger: Notifications.NotificationTriggerInput
): Promise<string> => {
    return await Notifications.scheduleNotificationAsync({
        content: {
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            sound: 'default',
        },
        trigger,
    });
};

/**
 * Cancel a scheduled notification
 * @param {string} notificationId - The notification identifier
 */
export const cancelScheduledNotification = async (notificationId: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllScheduledNotifications = async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Get all scheduled notifications
 * @returns {Promise<Array>} - Array of scheduled notifications
 */
export const getAllScheduledNotifications = async () => {
    return await Notifications.getAllScheduledNotificationsAsync();
};

/**
 * Set badge count
 * @param {number} count - Badge count
 */
export const setBadgeCount = async (count: number): Promise<void> => {
    await Notifications.setBadgeCountAsync(count);
};

/**
 * Get badge count
 * @returns {Promise<number>} - Current badge count
 */
export const getBadgeCount = async (): Promise<number> => {
    return await Notifications.getBadgeCountAsync();
};

export default {
    registerForPushNotificationsAsync,
    registerTokenWithBackend,
    removeTokenFromBackend,
    getStoredPushToken,
    arePushNotificationsEnabled,
    addNotificationReceivedListener,
    addNotificationResponseListener,
    scheduleLocalNotification,
    cancelScheduledNotification,
    cancelAllScheduledNotifications,
    getAllScheduledNotifications,
    setBadgeCount,
    getBadgeCount,
};
