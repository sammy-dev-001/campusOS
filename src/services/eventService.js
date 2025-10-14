import axios from 'axios';
import { API_BASE_URL } from '../config';

// Create axios instance with base URL and headers
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/events`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
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

// Event API functions
const eventService = {
  /**
   * Get all events with optional filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} - List of events
   */
  getEvents: async (filters = {}) => {
    try {
      const response = await api.get('/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  /**
   * Get a single event by ID
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} - Event details
   */
  getEvent: async (eventId) => {
    try {
      const response = await api.get(`/${eventId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching event ${eventId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @param {File} [image] - Optional event image file
   * @returns {Promise<Object>} - Created event
   */
  createEvent: async (eventData, image = null) => {
    try {
      const formData = new FormData();
      
      // Append all event data fields to form data
      Object.entries(eventData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      
      // Append image if provided
      if (image) {
        formData.append('image', image);
      }

      const response = await api.post('/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  /**
   * Update an existing event
   * @param {string} eventId - Event ID
   * @param {Object} updates - Fields to update
   * @param {File} [image] - Optional new event image
   * @returns {Promise<Object>} - Updated event
   */
  updateEvent: async (eventId, updates, image = null) => {
    try {
      const formData = new FormData();
      
      // Append all update fields to form data
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      
      // Append new image if provided
      if (image) {
        formData.append('image', image);
      }

      const response = await api.put(`/${eventId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error updating event ${eventId}:`, error);
      throw error;
    }
  },

  /**
   * Delete an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} - Success message
   */
  deleteEvent: async (eventId) => {
    try {
      const response = await api.delete(`/${eventId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting event ${eventId}:`, error);
      throw error;
    }
  },

  /**
   * Update user's attendance status for an event
   * @param {string} eventId - Event ID
   * @param {string} status - 'going', 'interested', or 'not_going'
   * @returns {Promise<Object>} - Updated attendance info
   */
  updateAttendance: async (eventId, status) => {
    try {
      const response = await api.put(`/${eventId}/rsvp`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating attendance for event ${eventId}:`, error);
      throw error;
    }
  },

  /**
   * Get events created by the current user
   * @returns {Promise<Array>} - List of user's events
   */
  getMyEvents: async () => {
    try {
      const response = await api.get('/my/events');
      return response.data;
    } catch (error) {
      console.error('Error fetching user\'s events:', error);
      throw error;
    }
  },

  /**
   * Get events the current user is attending
   * @returns {Promise<Array>} - List of attending events
   */
  getAttendingEvents: async () => {
    try {
      const response = await api.get('/my/attending');
      return response.data;
    } catch (error) {
      console.error('Error fetching attending events:', error);
      throw error;
    }
  },

  /**
   * Search events by keyword
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} - List of matching events
   */
  searchEvents: async (query, filters = {}) => {
    try {
      const response = await api.get('/search', {
        params: { q: query, ...filters },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching events:', error);
      throw error;
    }
  },
};

export default eventService;
