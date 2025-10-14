import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, subscribeToPushNotifications } from '../services/notification.service';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(isPushSupported);
      
      if (isPushSupported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Request permission for notifications
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await requestNotificationPermission();
      setPermission(Notification.permission);
      return result;
    } catch (err) {
      setError('Failed to request notification permission');
      console.error('Error requesting notification permission:', err);
      return false;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return null;
    }

    if (permission !== 'granted') {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setError('Notification permission not granted');
        return null;
      }
    }

    try {
      const sub = await subscribeToPushNotifications();
      setSubscription(sub);
      return sub;
    } catch (err) {
      setError('Failed to subscribe to push notifications');
      console.error('Error subscribing to push notifications:', err);
      return null;
    }
  }, [isSupported, permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      return true;
    } catch (err) {
      setError('Failed to unsubscribe from push notifications');
      console.error('Error unsubscribing from push notifications:', err);
      return false;
    }
  }, [subscription]);

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    if (!isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const currentSubscription = await registration.pushManager.getSubscription();
      setSubscription(currentSubscription);
      return currentSubscription;
    } catch (err) {
      setError('Failed to check subscription status');
      console.error('Error checking subscription status:', err);
      return null;
    }
  }, [isSupported]);

  // Send a test notification
  const sendTestNotification = useCallback(async (title = 'Test Notification', options = {}) => {
    if (!isSupported || permission !== 'granted') {
      setError('Cannot send test notification - check permissions');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body: 'This is a test notification',
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        ...options,
      });
      return true;
    } catch (err) {
      setError('Failed to send test notification');
      console.error('Error sending test notification:', err);
      return false;
    }
  }, [isSupported, permission]);

  // Check subscription status on mount
  useEffect(() => {
    if (isSupported && permission === 'granted') {
      checkSubscription();
    }
  }, [isSupported, permission, checkSubscription]);

  return {
    isSupported,
    permission,
    isSubscribed: !!subscription,
    subscription,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
    sendTestNotification,
  };
};

export default usePushNotifications;
