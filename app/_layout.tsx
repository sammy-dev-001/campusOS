import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-get-random-values';
import 'react-native-reanimated';

import { AnnouncementProvider } from '../contexts/AnnouncementContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ChatProvider } from '../contexts/ChatContext';
import { DocumentProvider } from '../contexts/DocumentContext';
import { GpaProvider } from '../contexts/GpaContext';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../contexts/ThemeContext';
import { TimetableProvider } from '../contexts/TimetableContext';
import { UserProvider } from '../contexts/UserContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { useColorScheme } from '../hooks/useColorScheme';
import LoginSignUpScreen from '../screens/LoginSignUpScreen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="login/index" options={{ headerShown: false }} />
      <Stack.Screen name="add-class" options={{ headerShown: false }} />
      <Stack.Screen 
        name="announcements" 
        options={{
          title: 'Announcements',
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <Stack.Screen 
        name="polls-surveys" 
        options={{
          title: 'Polls & Surveys',
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <Stack.Screen 
        name="group-details/[id]" 
        options={{
          title: 'Group Details',
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen 
        name="events" 
        options={{
            headerShown: false, // The screen has its own header
        }} 
      />
      <Stack.Screen 
        name="gpa-tracker" 
        options={{
            headerShown: false, // The screen has its own header
        }} 
      />
      <Stack.Screen 
        name="notes-past-questions" 
        options={{
            headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="tutor-study-group" 
        options={{
            headerShown: false,
        }} 
      />
      <Stack.Screen name="forum-category" options={{ headerShown: false }} />
    </Stack>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  // AuthProvider already handles loading state by returning null
  if (!isAuthenticated) {
    return <LoginSignUpScreen />;
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <CustomThemeProvider>
      <AuthProvider>
        <AuthGate>
          <AnnouncementProvider>
            <DocumentProvider>
              <GpaProvider>
                <TimetableProvider>
                  <UserProvider>
                    <WebSocketProvider>
                      <ChatProvider>
                        <GestureHandlerRootView style={{ flex: 1 }}>
                          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                            <RootLayoutNav />
                          </ThemeProvider>
                        </GestureHandlerRootView>
                      </ChatProvider>
                    </WebSocketProvider>
                  </UserProvider>
                </TimetableProvider>
              </GpaProvider>
            </DocumentProvider>
          </AnnouncementProvider>
        </AuthGate>
      </AuthProvider>
    </CustomThemeProvider>
  );
}
