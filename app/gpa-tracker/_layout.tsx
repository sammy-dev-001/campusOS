import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { ActivityIndicator } from 'react-native';

export default function GpaTrackerLayout() {
  const auth = useAuth();

  // Show loading state until auth is initialized
  if (!auth || !auth.isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </View>
  );
}
