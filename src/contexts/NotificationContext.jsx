import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';

// Create context
const NotificationContext = createContext();

// Provider component
export const NotificationProvider = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser, isAuthenticated } = useAuth();
  
  // State for notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preferences, setPreferences] = useState({
    email: true,
    push: true,
    inApp: true,
    eventUpdates: true,
    eventReminders: true,
    rsvpUpdates: true,
    newEvents: true,
  });

  // Fetch notifications from the server
  const fetchNotifications = useCallback(async (params = {}) => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(params);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');
      enqueueSnackbar('Failed to load notifications', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, enqueueSnackbar]);

  // Fetch notification preferences
  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const data = await notificationService.getPreferences();
      setPreferences(data);
    } catch (err) {
      console.error('Failed to fetch notification preferences:', err);
    }
  }, [isAuthenticated]);

  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const updatedNotification = await notificationService.markAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return updatedNotification;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      enqueueSnackbar('Failed to mark notification as read', { variant: 'error' });
      throw err;
    }
  }, [enqueueSnackbar]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      
      setNotifications(prev => 
        prev.map(n => ({
          ...n,
          read: true
        }))
      );
      
      setUnreadCount(0);
      
      enqueueSnackbar('All notifications marked as read', { variant: 'success' });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      enqueueSnackbar('Failed to mark all notifications as read', { variant: 'error' });
      throw err;
    }
  }, [enqueueSnackbar]);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      setNotifications(prev => 
        prev.filter(n => n._id !== notificationId)
      );
      
      // Update unread count if the deleted notification was unread
      const notification = notifications.find(n => n._id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      enqueueSnackbar('Notification deleted', { variant: 'success' });
    } catch (err) {
      console.error('Failed to delete notification:', err);
      enqueueSnackbar('Failed to delete notification', { variant: 'error' });
      throw err;
    }
  }, [notifications, enqueueSnackbar]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    try {
      await notificationService.clearAll();
      setNotifications([]);
      setUnreadCount(0);
      enqueueSnackbar('All notifications cleared', { variant: 'success' });
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      enqueueSnackbar('Failed to clear notifications', { variant: 'error' });
      throw err;
    }
  }, [enqueueSnackbar]);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences) => {
    try {
      const updatedPrefs = await notificationService.updatePreferences(newPreferences);
      setPreferences(updatedPrefs);
      enqueueSnackbar('Notification preferences updated', { variant: 'success' });
      return updatedPrefs;
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      enqueueSnackbar('Failed to update notification preferences', { variant: 'error' });
      throw err;
    }
  }, [enqueueSnackbar]);

  // Handle real-time notifications (WebSocket or polling)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initial fetch
    fetchNotifications();
    fetchPreferences();
    
    // Set up polling for new notifications (in a real app, you'd use WebSockets)
    const pollInterval = setInterval(() => {
      fetchNotifications({ unreadOnly: true });
    }, 300000); // Poll every 5 minutes
    
    // Cleanup
    return () => clearInterval(pollInterval);
  }, [isAuthenticated, fetchNotifications, fetchPreferences]);

  // Handle push notifications (if supported)
  useEffect(() => {
    if (!isAuthenticated || !('Notification' in window)) return;
    
    const requestNotificationPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    };
    
    requestNotificationPermission();
    
    // Handle incoming push notifications
    const handlePushNotification = (event) => {
      const { title, options } = event.data.json();
      
      // Show notification
      const notification = new Notification(title, options);
      
      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        // Handle navigation based on the notification
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
      };
    };
    
    // Listen for push events
    navigator.serviceWorker.addEventListener('message', handlePushNotification);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handlePushNotification);
    };
  }, [isAuthenticated]);

  // Handle new notifications from WebSocket or other real-time sources
  const handleNewNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show a snackbar for the new notification
    enqueueSnackbar(notification.title, {
      variant: notification.type || 'info',
      autoHideDuration: 5000,
      action: (key) => (
        <Button 
          color="inherit" 
          size="small" 
          onClick={() => {
            // Mark as read when clicked
            markAsRead(notification._id);
            // Close the snackbar
            enqueueSnackbar.close(key);
            
            // Handle navigation if needed
            if (notification.action?.target) {
              // Navigate to the target
              window.location.href = notification.action.target;
            }
          }}
        >
          View
        </Button>
      ),
    });
    
    // Show a browser notification if enabled
    if (preferences.push && Notification.permission === 'granted') {
      const notificationOptions = {
        body: notification.message,
        icon: '/logo192.png', // Your app icon
        data: {
          url: notification.action?.target || '/notifications',
          notificationId: notification._id,
        },
      };
      
      new Notification(notification.title, notificationOptions);
    }
  }, [enqueueSnackbar, markAsRead, preferences.push]);

  // Context value
  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll: clearAllNotifications,
    updatePreferences,
    handleNewNotification,
  }), [
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updatePreferences,
    handleNewNotification,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
