// App Configuration
export const APP_NAME = 'EduFi';

// API Configuration - Base URL with /api/v1 included
export const API_BASE_URL = 'https://campusos-backend.onrender.com/api/v1';

// Feature Flags
export const FEATURES = {
  ENABLE_CHAT: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_LOCATION: true,
  ENABLE_FINANCE: true,
  ENABLE_SMS_DETECTION: true,
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

// EduFi Theme Colors
export const EDUFI_COLORS = {
  PRIMARY: '#0B3C5D',
  SECONDARY: '#4CAF50',
  BACKGROUND: '#FFFFFF',
  TEXT: '#333333',
};