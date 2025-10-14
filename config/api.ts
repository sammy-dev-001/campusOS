// API base URL for the Render backend server
export const API_BASE_URL = 'https://campusos-backend.onrender.com/api';

// Common API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
  },
  GROUPS: {
    BASE: '/groups',
    JOIN: '/groups/join',
  },
  // Add more endpoints as needed
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
};
