import React, { createContext, ReactNode, useContext, useState } from 'react';

// Define theme types
type Theme = {
  background: string;
  text: string;
  textSecondary: string;
  primary: string;
  secondary: string;
  card: string;
  border: string;
  error: string;
};

// Default theme values - don't rely on Colors to prevent any potential circular dependencies
const defaultLightTheme: Theme = {
  background: '#ffffff',
  primary: '#2563eb',
  text: '#000000',
  textSecondary: '#6b7280',
  secondary: '#64748b',
  card: '#ffffff',
  border: '#e0e0e0',
  error: '#ef4444'
};

const defaultDarkTheme: Theme = {
  background: '#000000',
  primary: '#2563eb',
  text: '#f4f4f5',
  textSecondary: '#a1a1aa',
  secondary: '#64748b',
  card: '#111112',
  border: '#222222',
  error: '#ef4444'
};

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: defaultDarkTheme,
  isDark: true,
  toggleTheme: () => {}
});

// Create a provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true); // Default to dark theme

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // Use the appropriate theme based on dark/light mode
  const theme = isDark ? defaultDarkTheme : defaultLightTheme;

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
