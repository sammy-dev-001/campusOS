import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config/api';

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

interface AuthContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  signup: (username: string, email: string, password: string, displayName: string) => Promise<string>;
  logout: () => void;
  updateProfilePicture: (imageUri: string) => Promise<void>;
  saveAuthData: (data: { user: User | LoginResponse; token: string; refreshToken?: string }) => Promise<void>;
  clearAuthData: () => Promise<void>;
  refreshAuthToken: () => Promise<{ token: string; refreshToken: string } | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // All hooks must be called unconditionally at the top level
  const [authState, setAuthState] = useState({
    isInitialized: false,
    isAuthenticated: false,
    user: null as User | null,
    isLoading: true,
  });
  
  // Memoized state updater to prevent unnecessary re-renders
  const updateAuthState = useCallback((updates: Partial<typeof authState> | ((prev: typeof authState) => Partial<typeof authState>)) => {
    setAuthState(prev => ({
      ...prev,
      ...(typeof updates === 'function' ? updates(prev) : updates)
    }));
  }, []);
  
  // Destructure state for easier access - must be after all hooks
  const { isInitialized, isAuthenticated, user, isLoading } = authState;

  const refreshToken = useCallback(async (): Promise<{ token: string; refreshToken: string } | null> => {
    try {
      const authData = await AsyncStorage.getItem('authData');
      if (!authData) return null;

      const { token, refreshToken } = JSON.parse(authData);
      if (!refreshToken) return null;

      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) throw new Error('Failed to refresh token');

      const data = await response.json();
      if (!user) {
        throw new Error('No user data available');
      }
      
      await saveAuthData({ 
        user: { 
          id: user.id,
          username: user.username || 'unknown',
          display_name: user.display_name || 'Unknown User',
          email: user.email || '',
          profile_picture: user.profile_picture,
          userId: user.userId || user.id,
          token: data.token,
          refreshToken: data.refreshToken
        },
        token: data.token,
        refreshToken: data.refreshToken 
      });
      
      return { token: data.token, refreshToken: data.refreshToken };
    } catch (error) {
      console.error('Error refreshing token:', error);
      await clearAuthData();
      return null;
    }
  }, [user]);

  const saveAuthData = async (data: { user: User | LoginResponse; token?: string; refreshToken?: string }) => {
    try {
      const { user, token, refreshToken } = data;
      // Convert to User type if it's a LoginResponse
      const userToSave: User = {
        id: user.id,
        username: user.username,
        display_name: user.display_name || user.username,
        profile_picture: user.profile_picture,
        userId: (user as any).userId || user.id
      };
      
      // Store auth data
      const tokenToSave = token || (data as any).token;
      await AsyncStorage.setItem('authData', JSON.stringify({ 
        user: userToSave,
        token: tokenToSave,
        refreshToken: refreshToken || (data as any).refreshToken
      }));
      
      // Update state
      updateAuthState({
        user: userToSave,
        isAuthenticated: true,
        isLoading: false
      });
      
      // Also store token separately for axios interceptor
      if (tokenToSave) {
        await AsyncStorage.setItem('token', tokenToSave);
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokenToSave}`;
      }
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  const clearAuthData = async () => {
    try {
      // Clear axios default headers
      delete axios.defaults.headers.common['Authorization'];
      
      // Clear all auth-related storage
      await AsyncStorage.multiRemove(['authData', 'token']);
      
      // Update state
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false
      });
    } catch (error) {
      console.error('Error clearing auth data:', error);
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

      const { token } = JSON.parse(authData);
      if (!token) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (!data || !data.token) {
        return false;
      }

      // Update the stored token
      const parsedData = JSON.parse(authData);
      await AsyncStorage.setItem('authData', JSON.stringify({
        ...parsedData,
        token: data.token
      }));

      // Update axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const authData = await AsyncStorage.getItem('authData');
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
        updateAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          isInitialized: true
        });
      } catch (error) {
        console.error('Error loading auth data:', error);
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
  }, []);

  // Always render children, but with loading state if needed

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required.');
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
        const testConnection = await fetch('https://www.google.com');
        if (!testConnection.ok) {
          console.error('Internet connection test failed');
          throw new Error('No internet connection. Please check your network settings.');
        }
      } catch (testError) {
        console.error('Network connectivity test failed:', testError);
        throw new Error('Network request failed. Please check your internet connection.');
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
    }
  }), [
    authState.isInitialized, 
    authState.isAuthenticated, 
    authState.isLoading, 
    authState.user, 
    login, 
    signup, 
    logout, 
    updateProfilePicture,
    saveAuthData,
    clearAuthData
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
