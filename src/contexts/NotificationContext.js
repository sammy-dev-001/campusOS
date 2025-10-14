import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { webSocketService } from '../services/websocket.service';
import { getUnreadCount, markAllAsRead, markAsRead } from '../services/notification.service';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(webSocketService.isConnected);

  // Load initial unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle new notifications from WebSocket
  useEffect(() => {
    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Play notification sound if enabled
      if (notification.soundEnabled) {
        playNotificationSound();
      }
      
      // Show desktop notification if enabled and page is not focused
      if (notification.showDesktopNotification && document.visibilityState !== 'visible') {
        showDesktopNotification(notification);
      }
    };

    const handleUnreadCount = ({ count }) => {
      setUnreadCount(count);
    };

    const handleConnect = () => {
      setIsConnected(true);
      loadUnreadCount();
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Subscribe to WebSocket events
    webSocketService.on('notification', handleNewNotification);
    webSocketService.on('unreadCount', handleUnreadCount);
    webSocketService.on('connect', handleConnect);
    webSocketService.on('disconnect', handleDisconnect);

    // Initial load
    loadUnreadCount();

    // Cleanup
    return () => {
      webSocketService.off('notification', handleNewNotification);
      webSocketService.off('unreadCount', handleUnreadCount);
      webSocketService.off('connect', handleConnect);
      webSocketService.off('disconnect', handleDisconnect);
    };
  }, [loadUnreadCount]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(e => console.warn('Failed to play notification sound:', e));
    } catch (e) {
      console.warn('Error with notification sound:', e);
    }
  };

  const showDesktopNotification = (notification) => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      const notificationOptions = {
        body: notification.message,
        icon: notification.icon || '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        data: {
          url: notification.action?.target || '/notifications',
          ...notification
        }
      };

      const desktopNotification = new Notification(notification.title, notificationOptions);

      desktopNotification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (notification.action?.target) {
          window.location.href = notification.action.target;
        }
        desktopNotification.close();
      };
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      throw err;
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev =>
        prev.map(n => (n.read ? n : { ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      throw err;
    }
  };

  const value = {
    notifications,
    unreadCount,
    isLoading,
    error,
    isConnected,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    refresh: loadUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
