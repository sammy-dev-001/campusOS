import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../src/hooks/useColorScheme';
import { ThemedText } from './ThemedText';

type IconName = 'home' | 'home-outline' | 'chatbubble' | 'chatbubble-outline' | 
                'newspaper' | 'newspaper-outline' | 'settings' | 'settings-outline' | 'add-circle' | 'add-circle-outline' | 'calendar' | 'calendar-outline';

const routeLabels: Record<string, string> = {
  index: 'Home',
  message: 'Messages',
  create: 'Add',
  post: 'Posts',
  planner: 'Planner',
  settings: 'Settings',
};

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCreatePress = () => {
    router.push('/(tabs)/create');
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: '#111', // solid dark background
        borderTopColor: '#222',
        paddingBottom: insets.bottom,
        height: 60 + insets.bottom, // Add bottom inset to the height
        paddingTop: 8,
      }
    ]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isCreateTab = route.name === 'create';

        if (isCreateTab) {
          return (
            <View key={route.key} style={styles.createButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  {
                    backgroundColor: '#2196F3', // blue for the add button
                    borderWidth: 4,
                    borderColor: '#181829',
                    shadowColor: '#2196F3',
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                  }
                ]}
                onPress={handleCreatePress}
              >
                <Ionicons name="add" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          );
        }

        const icon = getIconForRoute(route.name, isFocused);
        const color = isFocused
          ? '#2196F3'
          : '#888';
        const label = routeLabels[route.name] || route.name;

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabButton}
            onPress={() => navigation.navigate(route.name)}
          >
            <Ionicons name={icon} size={24} color={color} />
            <ThemedText
              style={[
                styles.tabLabel,
                { color }
              ]}
            >
              {label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function getIconForRoute(routeName: string, isFocused: boolean): IconName {
  switch (routeName) {
    case 'index':
      return isFocused ? 'home' : 'home-outline';
    case 'message':
      return isFocused ? 'chatbubble' : 'chatbubble-outline';
    case 'post':
      return isFocused ? 'newspaper' : 'newspaper-outline';
    case 'planner':
      return isFocused ? 'calendar' : 'calendar-outline';
    case 'settings':
      return isFocused ? 'settings' : 'settings-outline';
    default:
      return 'home-outline';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
    height: 60, // Base height
    paddingBottom: 0,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  createButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 60 : 46, // Moved higher up
    left: '50%',
    marginLeft: -28,
    zIndex: 1, // Ensure it's above the tab bar
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 8,
    borderWidth: 3,
    borderColor: '#111'
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
