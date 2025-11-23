import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { AppState, AppStateStatus, Platform } from 'react-native';

// Custom error class for authentication errors
export class AuthError extends Error {
  code: string;
  details?: any;
    
  constructor(message: string, code: string = 'AUTH_ERROR', details?: any) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

// Standardized error response interface
interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  timestamp?: string;
}

// Create a single axios instance for the app
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Helper function to create standardized error objects
const createError = (message: string, code: string = 'AUTH_ERROR', details?: any): ErrorResponse => ({
  code,
  message,
  details,
  timestamp: new Date().toISOString(),
});

// Helper function to log errors consistently
const logError = (error: any, context: string = 'AuthContext') => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[${context}]`, {
    message: errorMessage,
    code: error.code || 'UNKNOWN_ERROR',
    stack: errorStack,
    details: error.details || {},
    timestamp: new Date().toISOString(),
  });
};

interface ApiError {
  errorType?: string;
  message?: string;
  field?: string;
  [key: string]: any;
}

interface ApiResponse<T = any> {
  user?: T;
  token?: string;
  jwt?: string;
  error?: ApiError;
  [key: string]: any;
}

interface UserResponse {
  id: string | number;
  username: string;
  profile_picture?: string;
  email?: string;
  [key: string]: any;
}

interface User {
  id: string | number;
  username: string;
  display_name: string;
  email?: string;
  profile_picture?: string;
  userId?: string | number;
  token?: string;
  refreshToken?: string;
} // For backward compatibility

type LoginResponse = {
  id: string | number;
  username: string;
  display_name: string;
  profile_picture?: string;
  userId?: string | number; // For backward compatibility
  token?: string; // Add token to LoginResponse type
};

interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: NetInfoStateType | null;
  lastUpdated: number | null;
}

interface AuthContextType {
  // Existing auth state
  isInitialized: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  
  // Network state
  network: NetworkState;
  isRetrying: boolean;
  queuedRequests: number;
  isOnline: boolean;
  
  // Auth methods
  login: (email: string, password: string) => Promise<LoginResponse>;
  signup: (email: string, password: string, displayName: string, fullName: string) => Promise<string>;
  logout: () => void;
  updateProfilePicture: (imageUri: string) => Promise<void>;
  saveAuthData: (data: { user: User | LoginResponse; token: string; refreshToken?: string }) => Promise<void>;
  clearAuthData: () => Promise<void>;
  refreshAuthToken: () => Promise<{ token: string; refreshToken: string } | null>;
  
  // Network methods
  checkNetworkConnection: () => Promise<boolean>;
  retryAllRequests: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  

  interface QueuedRequest {
    id: string;
    config: AxiosRequestConfig;
    retryCount: number;
    lastAttempt: number;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }

  interface AuthState {
    isInitialized: boolean;
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    network: NetworkState;
    isRetrying: boolean;
    queuedRequests: number;
    error?: {
      code: string;
      message: string;
      details?: any;
      retryable?: boolean;
      retry?: () => Promise<void>;
    };
  }

  const [authState, setAuthState] = useState<AuthState>({
    isInitialized: false,
    isAuthenticated: false,
    user: null,
    isLoading: true,
    network: {
      isConnected: null,
      isInternetReachable: null,
      type: null,
      lastUpdated: null
    },
    isRetrying: false,
    queuedRequests: 0
  });

  // Queue for storing requests that failed due to network issues
  const requestQueue = useRef<QueuedRequest[]>([]);
  const isProcessingQueue = useRef(false);

  // Network state management is defined later in this file
  // (updateNetworkState, checkNetworkConnection, processRequestQueue, queueRequest, retryAllRequests)

  // Memoized state updater to prevent unnecessary re-renders
  const updateAuthState = useCallback((updates: Partial<AuthState> | ((prev: AuthState) => Partial<AuthState>)) => {
    setAuthState(prev => ({
      ...prev,
      ...(typeof updates === 'function' ? updates(prev) : updates)
    }));
  }, []);
  
  // Destructure state for easier access - must be after all hooks
  const { isInitialized, isAuthenticated, user, isLoading } = authState;

  // Track if a token refresh is in progress
  const refreshTokenPromise = useRef<Promise<{ token: string; refreshToken: string }> | null>(null);
  
  // Track the number of retry attempts
  const refreshRetryCount = useRef(0);
  const MAX_RETRY_ATTEMPTS = 3;
  const TOKEN_EXPIRY_MARGIN = 60 * 1000; // 1 minute in milliseconds

  const refreshToken = useCallback(async (force = false): Promise<{ token: string; refreshToken: string }> => {
    // If a refresh is already in progress, return the existing promise
    if (refreshTokenPromise.current && !force) {
      return refreshTokenPromise.current;
    }

    refreshTokenPromise.current = (async () => {
      try {
        refreshRetryCount.current++;
        
        const authData = await AsyncStorage.getItem('authData');
        if (!authData) {
          throw new AuthError('No authentication data found', 'NO_AUTH_DATA');
        }

        const { refreshToken, token } = JSON.parse(authData);
        if (!refreshToken) {
          throw new AuthError('No refresh token available', 'NO_REFRESH_TOKEN');
        }

        // Check if we've exceeded max retry attempts
        if (refreshRetryCount.current > MAX_RETRY_ATTEMPTS) {
          throw new AuthError(
            'Maximum refresh token retry attempts reached',
            'MAX_RETRY_ATTEMPTS_REACHED',
            { attempts: refreshRetryCount.current }
          );
        }

        // Add a small delay before retrying (exponential backoff)
        if (refreshRetryCount.current > 1) {
          const backoffTime = Math.min(1000 * Math.pow(2, refreshRetryCount.current - 1), 30000);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }

        const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle specific error cases
          if (response.status === 401 || response.status === 403) {
            // Clear auth data if refresh token is invalid
            await clearAuthData();
            throw new AuthError(
              'Session expired. Please log in again.',
              'SESSION_EXPIRED',
              { status: response.status, ...errorData }
            );
          }
          
          throw new AuthError(
            errorData.message || 'Failed to refresh token',
            errorData.code || 'TOKEN_REFRESH_FAILED',
            { status: response.status, ...errorData }
          );
        }

        const data = await response.json();
        
        if (!data.token) {
          throw new AuthError('No access token in response', 'INVALID_TOKEN_RESPONSE');
        }

        if (!data.refreshToken) {
          throw new AuthError('No refresh token in response', 'INVALID_REFRESH_TOKEN_RESPONSE');
        }

        // Reset retry counter on successful refresh
        refreshRetryCount.current = 0;
        
        if (!user) {
          throw new AuthError('No user data available', 'NO_USER_DATA');
        }
        
        await saveAuthData({ 
          user, 
          token: data.token, 
          refreshToken: data.refreshToken 
        });
        
        return { 
          token: data.token, 
          refreshToken: data.refreshToken,
          // Include expiry information if available
          expiresIn: data.expiresIn,
          expiresAt: data.expiresAt || (data.expiresIn ? Date.now() + (data.expiresIn * 1000) : undefined)
        };
      } catch (error) {
        logError(error, 'refreshToken');
        
        // Clear auth data on certain errors
        if (error instanceof AuthError && [
          'INVALID_REFRESH_TOKEN', 
          'REFRESH_TOKEN_EXPIRED',
          'SESSION_EXPIRED',
          'MAX_RETRY_ATTEMPTS_REACHED'
        ].includes(error.code)) {
          await clearAuthData(error);
        }
        
        throw error; // Re-throw to allow callers to handle the error
      } finally {
        // Clear the current refresh promise when done
        refreshTokenPromise.current = null;
      }
    })();

    return refreshTokenPromise.current;
  }, [user]);
  
  // Network connectivity handling
  const updateNetworkState = useCallback((state: Partial<NetworkState>) => {
    setAuthState(prev => ({
      ...prev,
      network: {
        ...prev.network,
        ...state,
        lastUpdated: Date.now()
      }
    }));
  }, []);

  // Check network connectivity
  const checkNetworkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      updateNetworkState({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type
      });
      return !!state.isConnected && !!state.isInternetReachable;
    } catch (error) {
      logError(error, 'checkNetworkConnection');
      updateNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: null
      });
      return false;
    }
  }, [updateNetworkState]);

  // Process queued requests when back online
  const processRequestQueue = useCallback(async () => {
    if (isProcessingQueue.current || requestQueue.current.length === 0) return;
    
    isProcessingQueue.current = true;
    
    try {
      setAuthState(prev => ({ ...prev, isRetrying: true }));
      
      // Process requests in order
      while (requestQueue.current.length > 0) {
        const request = requestQueue.current[0];
        const now = Date.now();
        const timeSinceLastAttempt = now - request.lastAttempt;
        
        // Apply exponential backoff (min 1s, max 30s)
        const backoffTime = Math.min(1000 * Math.pow(2, request.retryCount), 30000);
        
        if (timeSinceLastAttempt < backoffTime) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, backoffTime - timeSinceLastAttempt));
        }
        
        try {
          // Check network before retrying
          const isOnline = await checkNetworkConnection();
          if (!isOnline) break;
          
          // Retry the request
          const response = await api.request(request.config);
          request.resolve(response);
          
          // Remove from queue on success
          requestQueue.current.shift();
          setAuthState(prev => ({ ...prev, queuedRequests: requestQueue.current.length }));
          
        } catch (error) {
          // Update retry count and last attempt time
          request.retryCount++;
          request.lastAttempt = Date.now();
          
          // If max retries reached, reject the promise
          if (request.retryCount >= 3) { // Max 3 retries
            request.reject(error);
            requestQueue.current.shift();
            setAuthState(prev => ({ ...prev, queuedRequests: requestQueue.current.length }));
          }
          
          // If it's a network error, stop processing and wait for next online event
          if (axios.isAxiosError(error) && !error.response) {
            break;
          }
        }
      }
    } finally {
      isProcessingQueue.current = false;
      setAuthState(prev => ({ ...prev, isRetrying: false }));
    }
  }, [checkNetworkConnection]);

  // Queue a failed request for retry
  const queueRequest = useCallback((config: AxiosRequestConfig): Promise<any> => {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        config,
        retryCount: 0,
        lastAttempt: Date.now(),
        resolve,
        reject
      };
      
      requestQueue.current.push(request);
      setAuthState(prev => ({ ...prev, queuedRequests: requestQueue.current.length }));
      
      // Try to process the queue if we're online
      const isOnline = authState.network.isConnected && authState.network.isInternetReachable;
      if (isOnline) {
        processRequestQueue();
      }
    });
  }, [authState.network, processRequestQueue]);

  // Retry all queued requests
  const retryAllRequests = useCallback(async () => {
    if (requestQueue.current.length === 0) return;
    
    const isOnline = await checkNetworkConnection();
    if (!isOnline) {
      throw new AuthError('No internet connection', 'NETWORK_OFFLINE', { retryable: true });
    }
    
    await processRequestQueue();
  }, [checkNetworkConnection, processRequestQueue]);

  // Set up network event listeners
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      updateNetworkState({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type
      });
      
      // If we just came back online, process the queue
      (async () => {
        const isOnline = state.isConnected && state.isInternetReachable;
        if (isOnline) {
          await processRequestQueue();
        }
      })();
    });
    
    // Initial network check
    checkNetworkConnection();
    
    // Set up app state listener to check network when app comes to foreground
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        await checkNetworkConnection();
      }
    };
    
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, [checkNetworkConnection, processRequestQueue, updateNetworkState]);

  // Helper function to check if token is expired or about to expire
  const isTokenExpiredOrExpiring = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000; // Convert to seconds
      // Consider token expired if it will expire in the next 60 seconds
      return (payload.exp - now) < (TOKEN_EXPIRY_MARGIN / 1000);
    } catch (error) {
      // If we can't parse the token, assume it's invalid
      return true;
    }
  };

  const saveAuthData = async (data: { user: User | LoginResponse; token?: string; refreshToken?: string }): Promise<void> => {
    try {
      if (!data.user) {
        throw new AuthError('User data is required', 'INVALID_USER_DATA');
      }

      const { user, token, refreshToken } = data;
      
      // Convert to User type if it's a LoginResponse
      const userToSave: User = {
        id: user.id,
        username: user.username,
        display_name: user.display_name || user.username,
        profile_picture: user.profile_picture,
        userId: (user as any).userId || user.id
      };

      const authData = {
        user: userToSave,
        token,
        refreshToken,
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem('authData', JSON.stringify(authData));
      
      // Update axios default headers if token exists
      const tokenToSave = token || (await AsyncStorage.getItem('token'));
      if (tokenToSave) {
        await AsyncStorage.setItem('token', tokenToSave);
        api.defaults.headers.common['Authorization'] = `Bearer ${tokenToSave}`;
      }
      
      return;
    } catch (error) {
      const authError = error instanceof AuthError 
        ? error 
        : new AuthError('Failed to save authentication data', 'SAVE_AUTH_ERROR', { cause: error });
      
      logError(authError, 'saveAuthData');
      throw authError; // Re-throw to allow callers to handle the error
    }
  };

  const clearAuthData = async (error?: Error): Promise<void> => {
    try {
      // Clear axios default headers
      delete api.defaults.headers.common['Authorization'];
      
      // Clear AsyncStorage
      await AsyncStorage.multiRemove(['authData', 'token']);
      
      // Update state
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        isInitialized: true,
        error: error ? {
          code: error instanceof AuthError ? error.code : 'AUTH_ERROR',
          message: error.message,
          details: error instanceof AuthError ? error.details : undefined
        } : undefined
      });
    } catch (clearError) {
      const authError = new AuthError(
        'Failed to clear authentication data', 
        'CLEAR_AUTH_ERROR', 
        { cause: clearError }
      );
      
      logError(authError, 'clearAuthData');
      throw authError; // Re-throw to allow callers to handle the error
    }
  };

  const refreshUserInfo = useCallback(async (userId: number | string) => {
    // Get the token from AsyncStorage
    const authData = await AsyncStorage.getItem('authData');
    if (!authData) {
      console.log('No auth data found in AsyncStorage');
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false
      });
      return null;
    }
    
    const { token, user: storedUser } = JSON.parse(authData);
    if (!token) {
      console.log('No token found in auth data');
      await clearAuthData(); // This will update the state via updateAuthState
      return null;
    }

    try {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Token might be expired, try to refresh it
        console.log('Token expired, attempting to refresh...');
        const refreshed = await handleTokenRefresh();
        if (refreshed) {
          return refreshUserInfo(userId); // Retry with new token
        } else {
          throw new Error('Session expired. Please log in again.');
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch user info');
      }
      
      const data = await response.json();
      
      if (!data) {
        throw new Error('Invalid user data received');
      }
      
      const userData: User = {
        id: data._id || data.id,
        username: data.username,
        display_name: data.displayName || data.display_name || data.username,
        profile_picture: data.profilePic || data.profile_picture || '',
        userId: data._id || data.id
      };
      
      // Update user data if it has changed
      updateAuthState(prev => {
        if (
          !prev.user ||
          prev.user.id !== userData.id ||
          prev.user.username !== userData.username ||
          prev.user.display_name !== userData.display_name ||
          prev.user.profile_picture !== userData.profile_picture
        ) {
          return { ...prev, user: userData };
        }
        return prev;
      });
      // Save token with user data
      await saveAuthData({ 
        user: userData,
        token 
      });
      return userData;
    } catch (error) {
      console.error('Error refreshing user info:', error);
      throw error; // Re-throw to allow error handling in the calling function
    }
  }, []);

  const handleTokenRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (!authData) {
        return false;
      }

      const { token, refreshToken } = JSON.parse(authData);
      if (!token || !refreshToken) {
        return false;
      }

      // Check if token is still valid
      if (!isTokenExpiredOrExpiring(token)) {
        return true; // Token is still valid
      }

      try {
        // Try to refresh the token
        const { token: newToken } = await refreshToken();
        
        // Update axios headers with new token
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        return true;
      } catch (error) {
        logError(error, 'handleTokenRefresh');
        
        // If refresh fails with a session expired error, clear auth data
        if (error instanceof AuthError && error.code === 'SESSION_EXPIRED') {
          await clearAuthData(error);
        }
        
        return false;
      }
    } catch (error) {
      logError(error, 'handleTokenRefresh');
      return false;
    }
  }, [refreshToken]);

  useEffect(() => {
    let isMounted = true;

    const loadAuthData = async () => {
      try {
        const authData = await AsyncStorage.getItem('authData');
        
        // Skip state updates if component is unmounted
        if (!isMounted) return;

        if (authData) {
          const { user: storedUser, token } = JSON.parse(authData);
          if (storedUser && token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            updateAuthState({
              user: storedUser,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true
            });
            return;
          }
        }
        
        // If we get here, either no auth data or invalid token
        if (!isMounted) return;
        updateAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          isInitialized: true
        });
      } catch (error) {
        console.error('Error loading auth data:', error);
        if (!isMounted) return;
        
        await clearAuthData();
        updateAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          isInitialized: true
        });
      }
    };

    loadAuthData();

        // Set up request interceptor
    const requestInterceptor = api.interceptors.request.use(
      async (config) => {
        try {
          const authData = await AsyncStorage.getItem('authData');
          if (authData) {
            const { token } = JSON.parse(authData);
            if (token) {
              config.headers = config.headers || {};
              config.headers.Authorization = `Bearer ${token}`;
            }
          }
          return config;
        } catch (error) {
          const authError = new AuthError(
            'Failed to set up request interceptor', 
            'REQUEST_INTERCEPTOR_ERROR',
            { cause: error }
          );
          logError(authError, 'requestInterceptor');
          return Promise.reject(authError);
        }
      },
      (error) => {
        const authError = new AuthError(
          'Request interceptor error',
          'REQUEST_INTERCEPTOR_ERROR',
          { cause: error }
        );
        logError(authError, 'requestInterceptor');
        return Promise.reject(authError);
      }
    );

    // Set up response interceptor
    const responseInterceptor = api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        // Skip if no config or already retried
        if (!originalRequest || originalRequest._retry) {
          return Promise.reject(error);
        }

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
          // Mark request as retried
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const refreshed = await handleTokenRefresh();
            if (refreshed) {
              // Get new token
              const authData = await AsyncStorage.getItem('authData');
              if (authData) {
                const { token } = JSON.parse(authData);
                // Update the authorization header
                originalRequest.headers.Authorization = `Bearer ${token}`;
                // Retry the original request
                return api(originalRequest);
              }
            }
            
            // If we get here, token refresh failed or no auth data
            await clearAuthData(new AuthError(
              'Session expired. Please log in again.',
              'SESSION_EXPIRED'
            ));
            
          } catch (refreshError) {
            await clearAuthData(refreshError instanceof Error ? refreshError : new Error(String(refreshError)));
          }
        }

        // Handle other errors
        const status = error.response?.status;
        let errorMessage = 'An error occurred';
        let errorCode = 'API_ERROR';
        let errorDetails = {};

        if (status) {
          errorDetails = { status };
          
          switch (status) {
            case 400:
              errorMessage = 'Bad request';
              errorCode = 'BAD_REQUEST';
              break;
            case 403:
              errorMessage = 'Forbidden';
              errorCode = 'FORBIDDEN';
              break;
            case 404:
              errorMessage = 'Resource not found';
              errorCode = 'NOT_FOUND';
              break;
            case 500:
              errorMessage = 'Internal server error';
              errorCode = 'SERVER_ERROR';
              break;
            case 503:
              errorMessage = 'Service unavailable';
              errorCode = 'SERVICE_UNAVAILABLE';
              break;
            default:
              errorMessage = `HTTP Error ${status}`;
              errorCode = `HTTP_${status}`;
          }
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out';
          errorCode = 'REQUEST_TIMEOUT';
        } else if (error.message === 'Network Error') {
          errorMessage = 'Network error. Please check your internet connection.';
          errorCode = 'NETWORK_ERROR';
        }

        const apiError = new AuthError(
          errorMessage,
          errorCode,
          {
            ...errorDetails,
            originalError: error,
            url: originalRequest?.url,
            method: originalRequest?.method,
          }
        );

        logError(apiError, 'responseInterceptor');
        return Promise.reject(apiError);
      }
    );

    // Cleanup function
    return () => {
      isMounted = false;
      // Eject interceptors when component unmounts
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [clearAuthData, updateAuthState, handleTokenRefresh]);

  // Always render children, but with loading state if needed

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    try {
      // Input validation
      if (!email?.trim()) {
        throw new AuthError('Email is required', 'EMAIL_REQUIRED');
      }
      
      if (!password) {
        throw new AuthError('Password is required', 'PASSWORD_REQUIRED');
      }
      
      if (!API_BASE_URL) {
        throw new AuthError('API base URL is not configured', 'CONFIGURATION_ERROR');
      }
      
      // Log the request details
      const requestDetails = {
        url: `${API_BASE_URL}/auth/login`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { email, password: '***' } // Don't log actual password
      };
      console.log('Login request:', JSON.stringify(requestDetails, null, 2));
      
      // Test network connectivity first
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const testResponse = await fetch('https://www.google.com', {
          signal: controller.signal,
          method: 'HEAD'
        });
        
        clearTimeout(timeoutId);
        
        if (!testResponse.ok) {
          throw new AuthError(
            'Internet connection test failed', 
            'NETWORK_ERROR', 
            { status: testResponse.status }
          );
        }
      } catch (testError) {
        const error = testError as Error;
        if (error.name === 'AbortError') {
          throw new AuthError(
            'Network request timed out', 
            'NETWORK_TIMEOUT', 
            { cause: testError }
          );
        }
        
        throw new AuthError(
          'Network request failed. Please check your internet connection.',
          'NETWORK_ERROR',
          { cause: testError }
        );
      }
      
      let loginResponse;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        // Authenticate with the backend
        loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password.trim(),
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (error) {
        const fetchError = error as Error;
        console.error('Fetch error details:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack
        });
        if (fetchError.name === 'AbortError') {
          throw new Error('Connection timed out. The server is taking too long to respond.');
        }
        throw new Error(`Network request failed: ${fetchError.message}`);
      }
      
      console.log('Login response status:', loginResponse.status);
      let responseText: string;
      try {
        responseText = await loginResponse.text();
        console.log('Login response text:', responseText);
      } catch (textError) {
        console.error('Error reading response text:', textError);
        throw new Error('Invalid response from server');
      }
      
      // Parse the response text as JSON if it exists
      let responseData: ApiResponse<UserResponse> = {};
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        console.error('Response text that failed to parse:', responseText);
        throw new Error('Invalid response format from server');
      }
      console.log('Parsed response data:', responseData);

      if (!loginResponse.ok) {
        let errorMessage = 'Login failed. Please check your credentials.';
        let errorType = 'authentication';
        
        // Use the parsed responseData from earlier
        const errorData: ApiError = responseData.error || {} as ApiError;
        console.log('Error response data:', errorData);
        
        // Use the error type and message from the backend if available
        if (errorData.errorType) {
          errorType = errorData.errorType;
          errorMessage = errorData.message || errorMessage;
        } else {
          // Fallback to status-based error handling if errorType is not provided
          if (loginResponse.status === 400) {
            const errorMsg = errorData.message?.toLowerCase() || '';
            if (errorMsg.includes('password') || errorMsg.includes('incorrect')) {
              errorMessage = errorData.message || 'Incorrect password. Please try again.';
              errorType = 'password';
            } else if (errorMsg.includes('user') || 
                      errorMsg.includes('email') || 
                      errorMsg.includes('not found')) {
              errorMessage = errorData.message || 'No account found with this email address.';
              errorType = 'email';
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } else if (loginResponse.status === 401) {
            errorMessage = errorData.message || 'Invalid email or password. Please try again.';
            errorType = 'authentication';
          } else if (loginResponse.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
            errorType = 'server';
          }
        }
          
        // Log the error for debugging
        console.error('Login error:', {
          status: loginResponse.status,
          error: errorData,
          message: errorMessage,
          type: errorType
        });
        
        // Create a custom error with more details
        const error = new Error(errorMessage) as Error & { errorType?: string };
        error.errorType = errorType;
        throw error;
      }
      
      // If we get here, login was successful
      // Handle the backend's response format
      const responseUser = responseData.user || {} as UserResponse;
      const userData: User = {
        id: responseUser.id || responseUser._id || responseData.id || '',
        username: responseUser.username || responseData.username || email.split('@')[0],
        display_name: responseUser.displayName || responseUser.username || responseData.username || email.split('@')[0],
        profile_picture: responseUser.profilePic || responseUser.profile_picture,
        userId: responseUser.id || responseUser._id || responseData.userId
      };
      
      const token = responseData.token || responseData.jwt;
      
      if (!userData.id || !token) {
        console.error('Missing user ID or token in response:', responseData);
        throw new Error('Invalid response from server');
      }
      
      if (!token) {
        throw new Error('No authentication token received');
      }
      
      // Save user data and token to AsyncStorage
      await saveAuthData({
        user: userData,
        token: token
      });
      
      console.log('Login successful:', userData);
      return {
        ...userData,
        token: token
      };
    } catch (error: any) {
      console.error('Login API error:', error.message);
      await clearAuthData(); // This will update the state via updateAuthState
      throw error;
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName: string, fullName: string): Promise<string> => {
    try {
      // Trim all input fields to remove any accidental whitespace
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const trimmedDisplayName = displayName.trim();
      const trimmedFullName = fullName.trim();
      
      // Generate a username from email
      const trimmedUsername = trimmedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      
      console.log('Signup attempt with:', { 
        email: trimmedEmail,
        hasPassword: !!trimmedPassword,
        displayName: trimmedDisplayName,
        fullName: trimmedFullName,
        generatedUsername: trimmedUsername
      });
      
      // Validate required fields
      const missingFields = [];
      if (!trimmedEmail) missingFields.push('email');
      if (!trimmedPassword) missingFields.push('password');
      if (!trimmedDisplayName) missingFields.push('displayName');
      if (!trimmedFullName) missingFields.push('fullName');
      
      if (missingFields.length > 0) {
        console.log('Missing required fields:', missingFields);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      if (trimmedPassword.length < 6) {
        console.log('Password validation failed - length:', trimmedPassword.length);
        throw new Error('Password must be at least 6 characters long.');
      }

      // Prepare request payload
      const payload = {
        username: trimmedUsername,
        email: trimmedEmail,
        displayName: trimmedDisplayName,
        fullName: trimmedFullName,
        password: trimmedPassword
      };

      const signupUrl = `${API_BASE_URL}/auth/signup`;
      console.log('Sending signup request to:', signupUrl);
      console.log('Request payload:', { ...payload, password: '***' });

      const response = await fetch(signupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'include'
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('Signup failed:', {
          status: response.status,
          statusText: response.statusText,
          response: responseData
        });
        
        // Handle specific error cases
        if (response.status === 400 && responseData.field) {
          if (responseData.field === 'email') {
            throw new Error('An account with this email already exists. Please use a different email or log in.');
          } else if (responseData.field === 'username') {
            throw new Error('This username is already taken. Please choose a different one.');
          }
          throw new Error(`${responseData.field} already exists`);
        }
        
        throw new Error(responseData.message || 'Signup failed. Please try again.');
      }

      console.log('Signup successful:', responseData);
      
      if (!responseData.user) {
        throw new Error('Invalid response from server');
      }

      // Auto-login after successful signup
      const loginResponse = await login(responseData.user.email, password);
      // Return the display name or username from the signup response, not the login response
      return responseData.user.displayName || responseData.user.username;
    } catch (error: any) {
      if (error.response?.data?.field) {
        throw new Error(`${error.response.data.field} already exists`);
      }
      console.error('Signup error:', error);
      throw error;
    }
  }, [user]);

  // Helper function to get the auth token from AsyncStorage
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.token || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Define the logout function if not already defined
  const logout = useCallback(async () => {
    try {
      await clearAuthData(); // This will update the state via updateAuthState
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

  // Define the updateProfilePicture function if not already defined
  const updateProfilePicture = useCallback(async (imageUri: string) => {
    if (!user) return;
    
    try {
      // First, check if the image exists and is accessible
      let response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error('Failed to access the image');
      }
      
      // Get the blob data
      const blob = await response.blob();
      
      // Get the file extension from the URI
      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `profile_${Date.now()}.${fileExtension}`;
      
      // Determine the MIME type based on file extension
      let mimeType = 'image/jpeg';
      if (fileExtension === 'png') mimeType = 'image/png';
      else if (fileExtension === 'gif') mimeType = 'image/gif';
      
      // Create form data for file upload
      const formData = new FormData();
      
      // Create a file with the correct MIME type
      const file = new File([blob], fileName, { type: mimeType });
      
      // Append the file to form data with the correct field name
      formData.append('profile_picture', file);
      
      // Get the authentication token
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      
      console.log('Uploading profile picture to:', `${API_BASE_URL}/users/me/avatar`);
      
      // Convert the file to base64 for the backend
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            const base64Data = reader.result.split(',')[1];
            if (base64Data) {
              resolve(base64Data);
            } else {
              reject(new Error('Failed to convert image to base64'));
            }
          } else {
            reject(new Error('Unexpected file reader result type'));
          }
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(blob);
      });
      
      // Use the correct endpoint for profile picture upload
      response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: `data:${mimeType};base64,${base64Image}`
        }),
      });
      
      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Failed to upload profile picture';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Upload error details:', errorData);
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      // Check for both possible field names in the response
      const profilePicUrl = data.profilePic || data.profile_picture;
      if (!profilePicUrl) {
        console.error('Profile picture URL not found in response:', data);
        throw new Error('No profile picture URL in response');
      }
      
      const updatedUser = { 
        ...user, 
        profile_picture: profilePicUrl
      };
      
      // Update both the auth context and user context
      await saveAuthData({
        user: updatedUser,
        token
      });
      
      return data.profile_picture;
    } catch (error) {
      console.error('Error updating profile picture:', error);
      throw error;
    }
  }, [user]);

  // Debug logging
  useEffect(() => {
    console.log('Auth State:', { 
      isAuthenticated: authState.isAuthenticated, 
      isLoading: authState.isLoading, 
      user: authState.user ? 'User exists' : 'No user' 
    });
  }, [authState.isAuthenticated, authState.isLoading, authState.user]);

  const contextValue: AuthContextType = useMemo(() => ({
    // Core state
    isInitialized: authState.isInitialized,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    user: authState.user,
    token: authState.user?.token || null,
    refreshToken: authState.user?.refreshToken || null,
    
    // Network state
    network: authState.network,
    isRetrying: authState.isRetrying,
    queuedRequests: authState.queuedRequests,
    isOnline: !!authState.network.isConnected && !!authState.network.isInternetReachable,
    
    // Auth methods
    login,
    signup,
    logout,
    updateProfilePicture,
    saveAuthData,
    clearAuthData,
    refreshAuthToken: async (): Promise<{ token: string; refreshToken: string } | null> => {
      try {
        const token = await getAuthToken();
        if (!token) throw new Error('No authentication token found');
        const response = await fetch(`${API_BASE_URL}/auth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }
        const data = await response.json();
        if (!data.token) {
          throw new Error('No token in response');
        }
        if (!authState.user) {
          throw new Error('No user data available');
        }
        
        const newTokens = {
          token: data.token,
          refreshToken: data.refreshToken
        };
        
        await saveAuthData({
          user: {
            ...authState.user,
            token: data.token,
            refreshToken: data.refreshToken
          },
          ...newTokens
        });
        
        return newTokens;
      } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
      }
    },
    
    // Network methods
    checkNetworkConnection,
    retryAllRequests,
  }), [
    authState.isInitialized, 
    authState.isAuthenticated, 
    authState.isLoading, 
    authState.user, 
    authState.network,
    authState.isRetrying,
    authState.queuedRequests,
    login, 
    signup, 
    logout, 
    updateProfilePicture,
    saveAuthData,
    clearAuthData,
    checkNetworkConnection,
    retryAllRequests
  ]);

  // We no longer return null here, instead we'll handle loading state in the AuthGate component

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
