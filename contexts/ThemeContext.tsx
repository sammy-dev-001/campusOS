import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: 'light' | 'dark';
  themePreference: Theme;
  setThemePreference: (theme: Theme) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<Theme>('system');
  
  // Determine the actual theme to use
  const theme = themePreference === 'system' 
    ? systemColorScheme || 'light' 
    : themePreference;

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themePreference');
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setThemePreference(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme preference', error);
      }
    };

    loadThemePreference();
  }, []);

  // Save theme preference when it changes
  useEffect(() => {
    const saveThemePreference = async () => {
      try {
        await AsyncStorage.setItem('themePreference', themePreference);
      } catch (error) {
        console.error('Failed to save theme preference', error);
      }
    };

    saveThemePreference();
  }, [themePreference]);

  const value = {
    theme,
    themePreference,
    setThemePreference,
    isDark: theme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
