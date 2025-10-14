import React, { createContext, useContext, useState } from 'react';
import { Colors } from '../constants/Colors';

export interface Theme {
  background: string;
  text: string;
  textSecondary: string;
  primary: string;
  secondary: string;
  card: string;
  border: string;
  error: string;
}

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  theme: Theme;
}

// Default theme values
const defaultTheme: Theme = {
  background: Colors.light.background,
  text: Colors.light.text,
  textSecondary: Colors.light.textSecondary,
  primary: Colors.light.primary,
  secondary: Colors.light.secondary,
  card: Colors.light.card,
  border: Colors.light.border,
  error: Colors.light.error,
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  theme: defaultTheme,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true); // Set dark mode as default

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const theme: Theme = {
    background: isDark ? Colors.dark.background : Colors.light.background,
    text: isDark ? Colors.dark.text : Colors.light.text,
    textSecondary: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
    primary: isDark ? Colors.dark.primary : Colors.light.primary,
    secondary: isDark ? Colors.dark.secondary : Colors.light.secondary,
    card: isDark ? Colors.dark.card : Colors.light.card,
    border: isDark ? Colors.dark.border : Colors.light.border,
    error: isDark ? Colors.dark.error : Colors.light.error,
  };

  const value = React.useMemo(() => ({ isDark, toggleTheme, theme }), [isDark, theme]);
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
