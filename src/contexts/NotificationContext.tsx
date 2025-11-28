import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type NotificationType = 'like' | 'comment' | 'message' | 'class' | 'post';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface NotificationContextType {
  scheduleNotification: (type: NotificationType, payload: NotificationPayload) => Promise<string>;
  cancelNotification: (notificationId: string) => Promise<void>;
  getPushToken: () => Promise<string | null>;
  registerForPushNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Request permissions on mount
    registerForPushNotifications();

    // Handle notifications received while the app is in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Handle the notification
      console.log('Notification received:', notification);
    });

    // Handle user interaction with the notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification response:', data);
      // Handle navigation based on notification type
      // You can add navigation logic here
    });

    // Clean up listeners on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);

  const registerForPushNotifications = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    // Get the token that uniquely identifies this device
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);
    
    // TODO: Send the token to your server
    // await api.updateUserPushToken(user.id, token);
  };

  const scheduleNotification = async (type: NotificationType, { title, body, data = {} }: NotificationPayload) => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type, ...data },
          sound: 'default',
        },
        trigger: null, // Send immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  };

  const cancelNotification = async (notificationId: string) => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  };

  const getPushToken = async (): Promise<string | null> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        scheduleNotification,
        cancelNotification,
        getPushToken,
        registerForPushNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
