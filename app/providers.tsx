import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/contexts/NewThemeContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { UserProvider } from '../src/contexts/UserContext';
import { ChatProvider } from '../src/contexts/ChatContext';
import { FinanceProvider } from '../src/contexts/FinanceContext';
import { ToastProvider } from '../components/Toast';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <ChatProvider>
              <FinanceProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </FinanceProvider>
            </ChatProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
