import { useState, useCallback } from 'react';

// Theme definitions
const lightTheme = {
  background: '#ffffff',
  primary: '#000000',
  text: '#000000',
  textSecondary: '#666666',
  secondary: '#666666',
  card: '#ffffff',
  border: '#e0e0e0',
  error: '#ff3b30',
};

const darkTheme = {
  background: '#121212',
  primary: '#ffffff',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  secondary: '#666666',
  card: '#1e1e1e',
  border: '#333333',
  error: '#cf6679',
};

// Global theme state
let isDarkMode = true;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach(callback => callback());
}

export function useSimpleTheme() {
  const [theme, setTheme] = useState(isDarkMode ? darkTheme : lightTheme);
  const [isDark, setIsDark] = useState(isDarkMode);

  // Subscribe to theme changes
  useState(() => {
    const callback = () => {
      setTheme(isDarkMode ? darkTheme : lightTheme);
      setIsDark(isDarkMode);
    };
    
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  });

  const toggleTheme = useCallback(() => {
    isDarkMode = !isDarkMode;
    notifySubscribers();
  }, []);

  return {
    theme,
    isDark,
    toggleTheme,
  };
}

// Export default theme for direct usage
export const defaultTheme = darkTheme;
