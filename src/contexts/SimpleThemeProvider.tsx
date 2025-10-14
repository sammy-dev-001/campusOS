import React, { createContext, useContext, useState, ReactNode } from 'react';

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

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function SimpleThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  
  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default dark theme if context is not available
    return { 
      theme: darkTheme, 
      isDark: true, 
      toggleTheme: () => {} 
    };
  }
  return context;
}
