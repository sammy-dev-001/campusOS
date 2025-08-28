import { Stack } from 'expo-router';
import React from 'react';
import { ChatProvider } from '../../contexts/ChatContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Layout() {
  const { theme } = useTheme();

  return (
    <ChatProvider>
      <Stack screenOptions={{ 
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
        <Stack.Screen
          name="[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="new-chat"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="new-group"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="chat-screen"
          options={{
            title: 'Messages',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </ChatProvider>
  );
}
