import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { updateUserPushToken } from '../services/userService';
import { useAuth } from './AuthContext';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  } as Notifications.NotificationBehavior),
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
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Request permissions on mount
    registerForPushNotifications();

    // Handle notifications received while the app is in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Handle the notification
      console.log('Notification received:', notification);
      return; // Explicit return to satisfy TypeScript
    });

    // Handle user interaction with the notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('Notification response:', data);
      return; // Explicit return to satisfy TypeScript
      // Handle navigation based on notification type
      // You can add navigation logic here
    });

    // Clean up listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id]);

  const registerForPushNotifications = async () => {
    try {
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
        Alert.alert(
          'Notifications Blocked',
          'Please enable notifications in your device settings to receive important updates.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get the token that uniquely identifies this device
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: '4db3bf0f-f0fc-4892-b786-3ff8f17744b0'
      })).data;
      console.log('Push token:', token);

      // Send the token to the server if user is authenticated
      if (user?.id) {
        try {
          const result = await updateUserPushToken(user.id.toString(), token);
          if (!result.success) {
            console.error('Failed to update push token on server:', result.error);
            // Don't show error to user, as this doesn't affect core functionality
          } else {
            console.log('Push token successfully updated on server');
          }
        } catch (error) {
          console.error('Error updating push token on server:', error);
        }
      } else {
        console.log('User not authenticated, skipping push token update');
      }
    } catch (error) {
      console.error('Error in registerForPushNotifications:', error);
    }
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
