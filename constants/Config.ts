// App Configuration
export const APP_NAME = 'CampusOS';

// API Configuration
export const API_BASE_URL = 'http://172.26.95.216:3001'; // Updated to new IP and port 3001

// Feature Flags
export const FEATURES = {
  ENABLE_CHAT: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_LOCATION: true,
};

// Cache Configuration
export const CACHE_CONFIG = {
  CHAT_MESSAGES_TTL: 5 * 60 * 1000, // 5 minutes
  USER_PROFILE_TTL: 30 * 60 * 1000, // 30 minutes
};

// Pagination Configuration
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};