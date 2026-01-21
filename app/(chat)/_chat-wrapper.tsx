import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/contexts/NewThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';

interface ChatWrapperProps {
  children: React.ReactNode;
}

export function ChatWrapper({ children }: ChatWrapperProps) {
  const { theme } = useTheme();
  const auth = useAuth();

  // Show loading while checking auth state
  if (auth.isLoading || !auth.isAuthenticated) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.background
      }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default ChatWrapper;
