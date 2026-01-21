import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../src/constants/Config';

// Interface for token refresh response
interface TokenRefreshResponse {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

// Clean up the base URL by ensuring it ends with exactly one slash
const cleanBaseUrl = (url: string) => {
  // Remove trailing slashes
  let cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  return cleanUrl;
};

// Create axios instance with the cleaned base URL
const apiClient = axios.create({
  baseURL: cleanBaseUrl(API_BASE_URL),
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Important for cookies/sessions
});

// Add a request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Skip token check for auth routes
      const isAuthRoute = ['/auth/login', '/auth/register', '/auth/refresh-token'].some(route =>
        config.url?.includes(route)
      );

      if (!isAuthRoute) {
        // First try to get token from authData (where it's actually stored)
        const authData = await AsyncStorage.getItem('authData');
        let token;

        if (authData) {
          try {
            const parsedAuthData = JSON.parse(authData);
            token = parsedAuthData.token;
          } catch (e) {
            console.error('[API] Error parsing auth data:', e);
          }
        }

        // Fallback to userToken for backward compatibility
        if (!token) {
          token = await AsyncStorage.getItem('userToken');
        }

        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn('[API] No authentication token found');
        }
      }

      // Ensure URL is defined before manipulating it
      if (config.url) {
        // Remove any leading slashes to prevent double slashes
        config.url = config.url.replace(/^\/+/, '');

        // Log the final URL for debugging
        console.log(`[API] ${config.method?.toUpperCase() || 'GET'} ${config.baseURL}/${config.url}`);
      }

      // Log request data if present
      if (config.data) {
        console.log('[API] Request data:', config.data);
      }

      return config;
    } catch (error) {
      console.error('[API] Error in request interceptor:', error);
      return Promise.reject(error);
    }
  },
  (error: any) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Unified response interceptor - handles logging, response transformation, and auth refresh
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (__DEV__) {
      console.log(`[API] Response ${response.status} for ${response.config.url}`);
    }

    // Return the full response object for posts endpoint (needs response.data access)
    if (response.config.url?.includes('/posts')) {
      return response;
    }

    // For other endpoints, return just the data for convenience
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log errors
    if (error.response) {
      console.error(
        `[API] Error response: ${error.response.status}`,
        error.response.data
      );

      // Handle 401 Unauthorized errors with token refresh
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (!refreshToken) {
            // No refresh token available - clear auth and reject
            await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userData', 'token', 'authData']);
            return Promise.reject(error);
          }

          // Call the refresh token endpoint
          const response = await axios.post<TokenRefreshResponse>(
            `${cleanBaseUrl(API_BASE_URL)}/auth/refresh-token`,
            { refreshToken }
          );

          const { token } = response.data;

          // Store the new token
          await AsyncStorage.setItem('token', token);

          // Also update authData to keep in sync
          const authDataRaw = await AsyncStorage.getItem('authData');
          if (authDataRaw) {
            try {
              const authData = JSON.parse(authDataRaw);
              authData.token = token;
              await AsyncStorage.setItem('authData', JSON.stringify(authData));
            } catch (e) {
              // Ignore parse errors
            }
          }

          // Update the authorization header and retry
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          console.error('[API] Token refresh failed:', refreshError);
          // Clear all auth data on refresh failure
          await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userData', 'token', 'authData']);
          return Promise.reject(refreshError);
        }
      }

      // Handle error with message from response
      if (error.response.data?.message) {
        return Promise.reject(new Error(error.response.data.message));
      }
    } else if (error.request) {
      console.error('[API] No response received:', error.request);
    } else {
      console.error('[API] Request error:', error.message);
    }

    return Promise.reject(error);
  }
);
interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  isGroup: boolean;
}

interface User {
  id: string;
  name: string;
}

// Chat API
const chatApi = {
  getChats: () => apiClient.get<Chat[]>('/chats'),
  getMessages: (chatId: string) => apiClient.get(`/chats/${chatId}/messages`),
  sendMessage: (chatId: string, content: string) =>
    apiClient.post(`/chats/${chatId}/messages`, { content }),
  createChat: (userId: string) =>
    apiClient.post<Chat>('/chats', { userId }),
  getChatDetails: (chatId: string) =>
    apiClient.get<Chat>(`/chats/${chatId}`),
  getGroups: () =>
    apiClient.get<Chat[]>('/chats/groups'),
  getDirectMessageConversations: () =>
    apiClient.get<Chat[]>('/chats/direct'),
  createDirectMessage: (userId: string) =>
    apiClient.post<Chat>('/chats/direct', { userId }),
  createGroup: (name: string, userIds: string[]) =>
    apiClient.post<Chat>('/chats/groups', { name, userIds }),
  addUserToGroup: (groupId: string, userId: string) =>
    apiClient.post(`/chats/groups/${groupId}/users`, { userId }),
};

// User API - Updated to match backend routes
const userApi = {
  // Get current user's profile
  getProfile: () => apiClient.get<User>('/users/me'),
  // Update current user's profile
  updateProfile: (data: Partial<User>) => apiClient.put<User>('/users/me', data),
  // Search users
  searchUsers: (query: string) => apiClient.get<User[]>(`/users/search?q=${query}`),
  // Get user by ID or username
  getUser: (identifier: string) => apiClient.get<User>(`/users/${identifier}`),
  // Update profile picture
  updateProfilePicture: (imageUri: string) => {
    const formData = new FormData();
    formData.append('profile_picture', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);
    return apiClient.put<User>('/users/me/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Auth API
const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (data: any) => apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout')
};

// Define the backend post type
interface BackendPost {
  _id: string;
  author: { _id: string; username: string } | string;
  content: string;
  media?: Array<{ url: string }>;
  createdAt?: string;
  likeCount?: number;
  commentCount?: number;
  likes?: any[];
}

// Posts API
const postsApi = {
  getPosts: async (page = 1, limit = 10) => {
    console.log(`[API] Fetching posts - page: ${page}, limit: ${limit}`);
    try {
      // The response is already the array of posts, not wrapped in a data property
      const response = await apiClient.get<BackendPost[]>(`/posts?page=${page}&limit=${limit}`);

      console.log('[API] Posts response:', {
        status: response.status,
        dataLength: response.data?.length || 0,
        firstPost: response.data?.[0] || 'No posts'
      });

      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.error('[API] Error fetching posts:', {
        error: errorMessage,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(errorMessage);
    }
  },
  getPost: (id: string) => apiClient.get(`/posts/${id}`),
  createPost: (data: { content: string, media?: string[] }) =>
    apiClient.post('/posts', data),
  updatePost: (id: string, data: { content?: string, media?: string[] }) =>
    apiClient.put(`/posts/${id}`, data),
  deletePost: (id: string) => apiClient.delete(`/posts/${id}`),
  likePost: (postId: string, data: { userId: string }) =>
    apiClient.post(`/posts/${postId}/like`, data),
  getComments: (postId: number) =>
    apiClient.get(`/posts/${postId}/comments`),
  commentOnPost: async (postId: number | string, data: { content: string, userId: string | number }) => {
    try {
      const postIdStr = typeof postId === 'number' ? postId.toString() : postId;

      // Format the data to match the backend's expected format
      // The backend seems to expect a different structure based on the error
      const commentData = {
        content: data.content,
        author: data.userId, // Try using 'author' instead of 'user'
        post: postIdStr     // Include the post ID in the request body as well
      };

      console.log('Sending comment data:', commentData);

      // The auth token will be added by the request interceptor
      const response = await apiClient.post(`/posts/${postIdStr}/comments`, commentData);

      // Log the full response for debugging
      console.log('Comment response:', response);

      return response;
    } catch (error: any) {
      console.error('Error in commentOnPost:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Log more detailed error information if available
      if (error.response?.data) {
        console.error('Backend error details:', error.response.data);
      }

      throw new Error(error.response?.data?.message || 'Error adding comment');
    }
  },
  likeComment: (commentId: number, data: { userId: string | number }) =>
    apiClient.post(`/comments/${commentId}/like`, data),
  replyToComment: (commentId: number, data: { content: string, userId: string | number }) =>
    apiClient.post(`/comments/${commentId}/reply`, data),
};

export const api = {
  chat: chatApi,
  user: userApi,
  auth: authApi,
  posts: postsApi,
};

export default apiClient; 