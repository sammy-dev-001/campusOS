import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config/api';

type User = {
  id: number;
  username: string;
  display_name: string;
  profile_picture?: string;
};

type LoginResponse = {
  display_name: string;
  userId: number;
  username: string;
  profile_picture?: string;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (identifier: string, password: string) => Promise<LoginResponse>;
  signup: (loginUsername: string, displayName: string, email: string, password: string) => Promise<string>;
  logout: () => void;
  updateProfilePicture: (imageUri: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveAuthData = async (userData: User) => {
    try {
      await AsyncStorage.setItem('authData', JSON.stringify({ user: userData }));
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.removeItem('authData');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const refreshUserInfo = useCallback(async (userId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user info');
      const data = await response.json();
      const userData = {
        id: data.id,
        username: data.username,
        display_name: data.display_name,
        profile_picture: data.profile_picture,
      };
      setUser(userData);
      await saveAuthData(userData);
      return userData;
    } catch (error) {
      console.error('Error refreshing user info:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const authData = await AsyncStorage.getItem('authData');
        if (authData) {
          const { user: savedUser } = JSON.parse(authData);
          setUser(savedUser);
          setIsAuthenticated(true);
          // Fetch latest user info from backend to ensure profile_picture is up to date
          await refreshUserInfo(savedUser.id);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [refreshUserInfo]);

  const login = useCallback(async (identifier: string, password: string): Promise<LoginResponse> => {
    try {
      if (!identifier || !password) {
        throw new Error('Email/Username and password are required.');
      }
      if (password.length < 3) {
        throw new Error('Password must be at least 3 characters long.');
      }

      console.log('Attempting to login with:', { identifier, hasPassword: !!password });
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      const userData = {
        id: data.userId,
        username: data.username,
        display_name: data.display_name,
        profile_picture: data.profile_picture,
      };
      
      setIsAuthenticated(true);
      setUser(userData);
      await saveAuthData(userData);
      // Refresh user info from backend to get latest profile_picture
      await refreshUserInfo(userData.id);
      return data;
    } catch (error: any) {
      console.error('Login API error:', error.message);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  }, []);

  const signup = useCallback(async (loginUsername: string, displayName: string, email: string, password: string): Promise<string> => {
    try {
      if (!loginUsername || !displayName || !email || !password) {
        throw new Error('All fields are required.');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      console.log('Sending signup request with:', {
        loginUsername,
        displayName,
        email,
        hasPassword: !!password
      });

      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          loginUsername,
          displayName,
          email,
          password
        }),
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new Error(errorData.message || 'Signup failed');
      }

      const data = await response.json();
      return data.display_name;
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsAuthenticated(false);
    setUser(null);
    await clearAuthData();
  }, []);

  const updateProfilePicture = useCallback(async (imageUri: string): Promise<void> => {
    if (!user) return;
    const formData = new FormData();
    formData.append('profile_picture', {
      uri: imageUri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    } as any);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/profile-picture`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload profile picture');
      const data = await response.json();
      // Update user state and AsyncStorage
      const updatedUser = { ...user, profile_picture: data.profile_picture };
      setUser(updatedUser);
      await saveAuthData(updatedUser);
    } catch (error) {
      console.error('Error updating profile picture:', error);
      throw error;
    }
  }, [user]);

  const value = useMemo(() => ({
    isAuthenticated,
    user,
    login,
    signup,
    logout,
    updateProfilePicture
  }), [isAuthenticated, user, login, signup, logout, updateProfilePicture]);

  if (isLoading) {
    // You might want to show a loading screen here
    return null;
  }

  return (
    <AuthContext.Provider 
      value={value}
    >
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
