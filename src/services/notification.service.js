import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/notifications`;

// Set up axios instance with auth token
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific status codes
      if (error.response.status === 401) {
        // Handle unauthorized (e.g., redirect to login)
        console.error('Unauthorized - Please log in again');
      } else if (error.response.status === 403) {
        console.error('Forbidden - You do not have permission');
      } else if (error.response.status === 404) {
        console.error('Not Found - The requested resource was not found');
      } else if (error.response.status >= 500) {
        console.error('Server Error - Please try again later');
      }
    } else if (error.request) {
      console.error('Network Error - Please check your connection');
    } else {
      console.error('Error', error.message);
    }
    return Promise.reject(error);
  }
);

// Notification API functions
export const getNotifications = async (params = {}) => {
  try {
    const response = await api.get('/', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUnreadCount = async () => {
  try {
    const response = await api.get('/unread-count');
    return response.data.count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

export const markAsRead = async (notificationId) => {
  try {
    await api.patch(`/${notificationId}/read`);
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllAsRead = async () => {
  try {
    await api.patch('/mark-all-read');
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const deleteNotification = async (notificationId) => {
  try {
    await api.delete(`/${notificationId}`);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

export const clearAllNotifications = async () => {
  try {
    await api.delete('/');
    return true;
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    throw error;
  }
};

// Push notification functions
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notifications have been blocked by the user');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser');
    return null;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service Worker registered');

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Get public key from server
      const response = await fetch(`${API_BASE_URL}/api/notifications/vapid-public-key`);
      const vapidPublicKey = await response.text();
      
      // Convert VAPID key to Uint8Array
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      
      // Send subscription to server
      await api.post('/subscribe', { subscription });
      console.log('Push notification subscription successful');
    }
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Export default object with all functions
export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  requestNotificationPermission,
  subscribeToPushNotifications,
};
