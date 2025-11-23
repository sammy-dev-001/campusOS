import { Stack } from 'expo-router';
import React, { Component, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AnnouncementProvider } from '../src/contexts/AnnouncementContext';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ChatProvider } from '../src/contexts/ChatContext';
import { GpaProvider } from '../src/contexts/GpaContext';
import { ThemeProvider, useTheme } from '../src/contexts/NewThemeContext';
import { TimetableProvider } from '../src/contexts/TimetableContext';
import { UserProvider } from '../src/contexts/UserContext';

// Error boundary component
class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 16, textAlign: 'center' }}>
            Something went wrong: {this.state.error?.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Component to handle initial auth check
function InitialAuthCheck({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady || !auth?.isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

// Create a wrapper component for the auth content
function AuthContent() {
  const auth = useAuth();
  const { theme } = useTheme();

  // Show loading indicator while auth is initializing
  if (!auth || !auth.isInitialized) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme?.background || '#fff'
      }}>
        <ActivityIndicator size="large" color={theme?.primary || '#007AFF'} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme?.background || '#fff' }}>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme?.background || '#fff' },
      }}>
        <Stack.Screen 
          name="login/index" 
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
            // Only show tabs if authenticated
            ...(!auth.isAuthenticated && { navigationBarHidden: true })
          }} 
        />
        
        <Stack.Screen 
          name="gpa-tracker" 
          options={{ 
            headerShown: false,
            // Only show if authenticated
            ...(!auth.isAuthenticated && { navigationBarHidden: true })
          }} 
        />
      </Stack>
    </View>
  );
}

// Main app component
const App = () => {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <UserProvider>
                <ChatProvider>
                  <GpaProvider>
                    <TimetableProvider>
                      <AnnouncementProvider>
                        <InitialAuthCheck>
                          <AuthContent />
                        </InitialAuthCheck>
                      </AnnouncementProvider>
                    </TimetableProvider>
                  </GpaProvider>
                </ChatProvider>
              </UserProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

// Main layout component
export default function RootLayout() {
  return <App />;
}

