import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/NewThemeContext';
import { BrandColors } from '../src/theme/edufi';
import { ThemedText } from './ThemedText';

type IconName = 'home' | 'home-outline' | 'chatbubble' | 'chatbubble-outline' |
  'newspaper' | 'newspaper-outline' | 'settings' | 'settings-outline' | 'add-circle' | 'add-circle-outline' | 'calendar' | 'calendar-outline' | 'wallet' | 'wallet-outline';

const routeLabels: Record<string, string> = {
  index: 'Home',
  message: 'Messages',
  create: 'Add',
  finance: 'Finance',
  post: 'Posts',
  planner: 'Planner',
  settings: 'Settings',
};

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabBarHeight = 60 + insets.bottom;

  // Check if current route is the Posts screen
  const currentRoute = state.routes[state.index]?.name;
  const isPostScreen = currentRoute === 'post';

  return (
    <>
      {/* Floating + Button for Create - Only visible on Posts screen */}
      {isPostScreen && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: tabBarHeight + 20,
            right: 20,
            zIndex: 100,
          }}
          onPress={() => router.push('/create')}
        >
          <View style={[styles.createButton, { backgroundColor: theme.action }]}>
            <Ionicons name="add" size={32} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Tab Bar */}
      <View style={[
        styles.container,
        {
          backgroundColor: isDark ? '#111' : '#FFFFFF',
          borderTopColor: isDark ? '#222' : '#E0E0E0',
          paddingBottom: insets.bottom,
          height: tabBarHeight,
          paddingTop: 8,
        }
      ]}>
        {state.routes
          .filter(route => route.name !== 'create')
          .map((route, index) => {
            const actualIndex = state.routes.findIndex(r => r.name === route.name);
            const isFocused = state.index === actualIndex;
            const isFinanceTab = route.name === 'finance';

            const icon = getIconForRoute(route.name, isFocused);
            // Use theme navActive (brandGreen) for active, navInactive for inactive
            const color = isFocused ? theme.navActive : theme.navInactive;
            const label = routeLabels[route.name] || route.name;

            if (isFinanceTab) {
              return (
                <TouchableOpacity
                  key={route.key}
                  style={styles.tabButton}
                  onPress={() => navigation.navigate(route.name)}
                >
                  <View style={[styles.financeIconContainer, { backgroundColor: BrandColors.brandGreen }]}>
                    <Ionicons name="wallet" size={22} color="#fff" />
                  </View>
                  <ThemedText
                    style={[
                      styles.tabLabel,
                      { color: isFocused ? theme.navActive : theme.navInactive }
                    ]}
                  >
                    {label}
                  </ThemedText>
                </TouchableOpacity>
              );
            }

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
    </>
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
    case 'finance':
      return isFocused ? 'wallet' : 'wallet-outline';
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
    borderTopWidth: 1,
    height: 60,
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
    bottom: Platform.OS === 'android' ? 70 : 60,
    left: '50%',
    marginLeft: -28,
    zIndex: 10,
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    // Elevation for Android
    elevation: 10,
    borderWidth: 3,
    borderColor: '#111'
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  financeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BrandColors.brandGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
});
