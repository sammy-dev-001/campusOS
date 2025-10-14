import { useTheme } from '../contexts/NewThemeContext';

// Default theme values
const defaultTheme = {
  background: '#121212',
  primary: '#ffffff',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  secondary: '#666666',
  card: '#1e1e1e',
  border: '#333333',
  error: '#cf6679'
};

export function useSafeTheme() {
  try {
    // Try to get the theme from context
    const context = useTheme();
    
    // If we got a valid context, return it
    if (context && context.theme) {
      return context;
    }
    
    // Otherwise return default values
    return {
      theme: defaultTheme,
      isDark: true,
      toggleTheme: () => {}
    };
  } catch (error) {
    // If there's any error, return default values
    console.warn('Error accessing theme context, using default theme');
    return {
      theme: defaultTheme,
      isDark: true,
      toggleTheme: () => {}
    };
  }
}
