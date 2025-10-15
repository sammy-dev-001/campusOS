import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const getAuthToken = async (): Promise<string | null> => {
  try {
    // Prefer the explicit 'token' key (used by src/contexts/AuthContext.saveAuthData)
    const token = await AsyncStorage.getItem('token');
    if (token) return token;

    // Fallback: some parts of the app may store an 'authData' object
    const authData = await AsyncStorage.getItem('authData');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed?.token ?? null;
      } catch (e) {
        return null;
      }
    }

    // Legacy fallback
    const legacy = await AsyncStorage.getItem('userToken');
    if (legacy) return legacy;

    // Finally, try axios default header if set
    try {
      const authHeader = axios.defaults?.headers?.common?.['Authorization'] as string | undefined;
      if (authHeader) {
        return authHeader.replace(/^Bearer\s+/i, '').trim();
      }
    } catch (e) {
      // ignore
    }

    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const setAuthToken = async (token: string): Promise<void> => {
  try {
    // Persist under 'token' for compatibility with AuthContext
    await AsyncStorage.setItem('token', token);
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
};

export const removeAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('token');
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};
