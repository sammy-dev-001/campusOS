import React from 'react';
import { useSafeTheme } from '../hooks/useSafeTheme';

// Default theme values
const defaultTheme = {
  background: '#121212',
  primary: '#ffffff',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  secondary: '#666666',
  card: '#1e1e1e',
  border: '#333333',
  error: '#cf6679',
  isDark: true,
};

export function withTheme<P extends object>(
  WrappedComponent: React.ComponentType<P & { theme: any }>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithTheme = (props: P) => {
    try {
      const { theme } = useSafeTheme();
      return <WrappedComponent {...props} theme={theme || defaultTheme} />;
    } catch (error) {
      console.warn('Error in withTheme HOC:', error);
      return <WrappedComponent {...props} theme={defaultTheme} />;
    }
  };

  ComponentWithTheme.displayName = `withTheme(${displayName})`;
  return ComponentWithTheme;
}
