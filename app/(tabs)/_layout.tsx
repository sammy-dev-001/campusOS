import { Tabs } from 'expo-router';
import React, { memo, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import CustomTabBar from '../../components/CustomTabBar';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../src/hooks/useColorScheme';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/NewThemeContext';

// Memoized tab bar component to prevent unnecessary re-renders
const MemoizedTabBar = memo((props: any) => (
  <CustomTabBar {...props} />
));

// Memoized loading component
const LoadingIndicator = ({ theme }: { theme: any }) => (
  <View style={{ 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: theme?.background || '#fff' 
  }}>
    <ActivityIndicator size="large" color={theme?.primary} />
  </View>
);

// Wrapper component to use theme and auth hooks
const TabContent = () => {
  const colorScheme = useColorScheme();
  const auth = useAuth();
  const { theme } = useTheme();

  // Memoize screen options to prevent recreation on every render
  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: Colors[colorScheme ?? 'light'].primary,
    tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].textSecondary,
  }), [colorScheme]);

  // Show loading state while auth is initializing
  if (!auth?.isInitialized) {
    return <LoadingIndicator theme={theme} />;
  }

  return (
    <Tabs
      tabBar={(props) => <MemoizedTabBar {...props} />}
      screenOptions={screenOptions}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="message" options={{ title: 'Messages' }} />
      <Tabs.Screen name="create" options={{ title: '' }} />
      <Tabs.Screen name="post" options={{ title: 'Posts' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
};

// Main tab layout component (providers are already applied at root layout)
export default function TabLayout() {
  return <TabContent />;
}