import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrandColors } from '../theme/edufi';

// Define expanded theme types for EduFi branding
type Theme = {
  // Core colors
  background: string;
  text: string;
  textSecondary: string;
  primary: string;
  secondary: string;
  card: string;
  cardAlt: string;
  border: string;
  error: string;
  // Action/CTA colors (brandGreen)
  action: string;
  actionText: string;
  // Navigation colors
  navActive: string;
  navInactive: string;
  // Finance specific
  income: string;
  expense: string;
  // Special elements
  headerTitle: string;
  balanceCardBg: string;
};

// EduFi Light Theme - Primary Theme (White bg, brandBlue headers, brandGreen buttons)
const eduFiLightTheme: Theme = {
  background: '#FFFFFF',
  primary: BrandColors.brandBlue,
  text: '#333333',
  textSecondary: '#666666',
  secondary: '#999999',
  card: '#FFFFFF',
  cardAlt: '#F5F5F5',
  border: '#E0E0E0',
  error: '#F44336',
  // Actions use brandGreen
  action: BrandColors.brandGreen,
  actionText: '#FFFFFF',
  // Navigation
  navActive: BrandColors.brandGreen,
  navInactive: '#999999',
  // Finance
  income: BrandColors.brandGreen,
  expense: '#F44336',
  // Special elements
  headerTitle: BrandColors.brandBlue,
  balanceCardBg: BrandColors.brandBlue,
};

// EduFi Dark Theme - Secondary Theme (Dark bg, white text, brandGreen buttons)
const eduFiDarkTheme: Theme = {
  background: '#000000',
  primary: BrandColors.brandBlue,
  text: '#F4F4F5',
  textSecondary: '#A1A1AA',
  secondary: '#71717A',
  card: '#111112',
  cardAlt: '#1E1E1E',
  border: '#27272A',
  error: '#EF4444',
  // Actions use brandGreen
  action: BrandColors.brandGreen,
  actionText: '#FFFFFF',
  // Navigation
  navActive: BrandColors.brandGreen,
  navInactive: '#71717A',
  // Finance
  income: BrandColors.brandGreen,
  expense: '#EF4444',
  // Special elements
  headerTitle: '#FFFFFF',
  balanceCardBg: BrandColors.brandBlue,
};

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: eduFiLightTheme,
  isDark: false,
  toggleTheme: () => { }
});

// Create a provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false); // Default to light theme
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme_preference');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, []);

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme_preference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Use the appropriate theme based on dark/light mode
  const theme = isDark ? eduFiDarkTheme : eduFiLightTheme;

  // Don't render children until theme is loaded to prevent flash
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme
export function useTheme() {
  return useContext(ThemeContext);
}

// Export the context for direct usage if needed
export const ThemeConsumer = ThemeContext.Consumer;

// Export theme objects for direct access
export { eduFiLightTheme, eduFiDarkTheme };
