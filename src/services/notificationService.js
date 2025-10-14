import api from './api';

const notificationService = {
  // Get all notifications for the current user
  getNotifications: async (params = {}) => {
    try {
      const response = await api.get('/api/notifications', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Get unread notifications count
  getUnreadCount: async () => {
    try {
      const response = await api.get('/api/notifications/unread/count');
      return response.data.count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  // Mark a notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await api.patch(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await api.patch('/api/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete a notification
  deleteNotification: async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Clear all notifications
  clearAll: async () => {
    try {
      await api.delete('/api/notifications');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  },

  // Subscribe to real-time notifications
  subscribe: (callback) => {
    // This would typically connect to a WebSocket or similar real-time service
    console.log('Subscribing to real-time notifications');
    // Return a function to unsubscribe
    return () => console.log('Unsubscribed from notifications');
  },

  // Event-specific notification methods
  notifyEventCreated: async (event) => {
    try {
      const response = await api.post('/api/notifications/event-created', { eventId: event._id });
      return response.data;
    } catch (error) {
      console.error('Error sending event created notification:', error);
      throw error;
    }
  },

  notifyEventUpdated: async (event, changes) => {
    try {
      const response = await api.post('/api/notifications/event-updated', { 
        eventId: event._id,
        changes
      });
      return response.data;
    } catch (error) {
      console.error('Error sending event updated notification:', error);
      throw error;
    }
  },

  notifyEventCancelled: async (event, reason = '') => {
    try {
      const response = await api.post('/api/notifications/event-cancelled', { 
        eventId: event._id,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Error sending event cancelled notification:', error);
      throw error;
    }
  },

  notifyRSVPUpdate: async (event, userId, status) => {
    try {
      const response = await api.post('/api/notifications/rsvp-update', {
        eventId: event._id,
        userId,
        status
      });
      return response.data;
    } catch (error) {
      console.error('Error sending RSVP update notification:', error);
      throw error;
    }
  },

  notifyEventReminder: async (event, minutesBefore = 30) => {
    try {
      const response = await api.post('/api/notifications/event-reminder', {
        eventId: event._id,
        minutesBefore
      });
      return response.data;
    } catch (error) {
      console.error('Error sending event reminder:', error);
      throw error;
    }
  },

  // Get notification preferences
  getPreferences: async () => {
    try {
      const response = await api.get('/api/notifications/preferences');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  },

  // Update notification preferences
  updatePreferences: async (preferences) => {
    try {
      const response = await api.patch('/api/notifications/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }
};

export default notificationService;
