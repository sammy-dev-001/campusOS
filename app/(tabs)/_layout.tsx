import { Tabs } from 'expo-router';
import React from 'react';

import CustomTabBar from '../../components/CustomTabBar';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].primary,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].textSecondary,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="message"
        options={{
          title: 'Messages',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Posts',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}