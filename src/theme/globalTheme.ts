import * as React from 'react';

// Global theme object that can be imported and used anywhere

// Theme types
type Theme = {
  background: string;
  primary: string;
  text: string;
  textSecondary: string;
  secondary: string;
  card: string;
  border: string;
  error: string;
};

// Default theme values
const lightTheme: Theme = {
  background: '#ffffff',
  primary: '#000000',
  text: '#000000',
  textSecondary: '#666666',
  secondary: '#666666',
  card: '#ffffff',
  border: '#e0e0e0',
  error: '#ff3b30',
};

const darkTheme: Theme = {
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
let currentTheme: Theme = darkTheme;
let isDarkMode = true;
const subscribers: Array<() => void> = [];

// Theme API
export const theme = {
  // Get current theme
  get current(): Theme {
    return currentTheme;
  },
  
  // Get current theme mode
  get isDark(): boolean {
    return isDarkMode;
  },
  
  // Toggle between light and dark themes
  toggle(): void {
    isDarkMode = !isDarkMode;
    currentTheme = isDarkMode ? darkTheme : lightTheme;
    subscribers.forEach(callback => callback());
  },
  
  // Set theme explicitly
  setDarkMode(dark: boolean): void {
    if (dark !== isDarkMode) {
      isDarkMode = dark;
      currentTheme = isDarkMode ? darkTheme : lightTheme;
      subscribers.forEach(callback => callback());
    }
  },
  
  // Subscribe to theme changes
  subscribe(callback: () => void): () => void {
    subscribers.push(callback);
    return () => {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  },
};

// React hook for components that need to re-render on theme changes
export function useTheme() {
  const [, setVersion] = React.useState(0);
  
  React.useEffect(() => {
    const unsubscribe = theme.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);
  
  return {
    theme: currentTheme,
    isDark: isDarkMode,
    toggleTheme: () => theme.toggle(),
  };
}

// Export default theme for direct usage
export default theme;
