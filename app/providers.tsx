import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/contexts/NewThemeContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { UserProvider } from '../src/contexts/UserContext';
import { ChatProvider } from '../src/contexts/ChatContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <ChatProvider>
              {children}
            </ChatProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
