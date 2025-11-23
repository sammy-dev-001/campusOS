import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '../../src/contexts/NewThemeContext';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';

export default function ChatLayout() {
  const { theme } = useTheme();

  return (
    <ProtectedRoute>
      <Stack 
        screenOptions={{ 
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
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
    </ProtectedRoute>
  );
}
