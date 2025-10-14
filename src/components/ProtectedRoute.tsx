import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/NewThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const theme = useTheme().theme;
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();

  // Show loading indicator while checking auth state
  if (auth.isLoading || userLoading) {
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

  // If not authenticated, redirect to login
  if (!auth.isAuthenticated) {
    // Use navigation to redirect to login
    // This assumes you have a navigation prop or are using a navigation hook
    // You might need to adjust this based on your navigation setup
    // navigation.navigate('login');
    return null;
  }

  return <>{children}</>;
}
