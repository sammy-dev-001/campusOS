// app/(tabs)/index.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageStyle,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions
} from 'react-native';
import { useTimetable } from '../../src/contexts/TimetableContext';

import { ThemedText } from '../../components/ThemedText';
import { useTheme } from '../../src/contexts/NewThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { BrandColors } from '../../src/theme/edufi';

interface ClassItem {
  id: string;
  time: string;
  subjectName: string;
  courseCode?: string;
  venue?: string;
}

// Quick Actions - Unified 2x2 Grid (MVP Priority)
const quickActions = [
  {
    label: 'Announcements',
    icon: 'megaphone-outline',
    color: '#FF6B6B',
    route: '/announcements',
  },
  {
    label: 'Time Table',
    icon: 'calendar-outline',
    color: '#4D96FF',
    route: '/time-table',
  },
  {
    label: 'GPA Tracker',
    icon: 'school-outline',
    color: '#6BCB77',
    route: '/gpa-tracker',
  },
  {
    label: 'Notes & Past Qs',
    icon: 'book-outline',
    color: '#FFD93D',
    route: '/notes-past-questions',
  },
];

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  // Get user's display name, falling back to username
  const userDisplayName = React.useMemo(() => {
    if (!user) return 'Student';
    return user.display_name || user.username || 'Student';
  }, [user]);

  // Use theme values directly from the theme object
  const themeColors = React.useMemo(() => ({
    background: theme.background,
    card: theme.card,
    text: theme.text,
    secondary: theme.textSecondary,
  }), [theme]);
  const isDesktop = width > 768;
  const [refreshKey, setRefreshKey] = useState(0);

  // Get the refresh parameter from the URL
  const refresh = searchParams.refresh as string | undefined;

  // Force refresh when the refresh parameter changes
  useEffect(() => {
    if (refresh) {
      setRefreshKey(prev => prev + 1);
      const newParams = { ...searchParams };
      delete newParams.refresh;
      router.setParams(newParams);
    }
  }, [refresh, searchParams, router]);

  const styles = stylesFn(themeColors, isDesktop, isDark);

  const { getTodaysClasses: getTodaysClassesFn } = useTimetable();
  const todayClasses = useMemo(() => getTodaysClassesFn(), [getTodaysClassesFn]);

  const handleQuickActionPress = (route: string) => {
    router.push(route as any);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image
                source={isDark
                  ? require('../../assets/images/edufi-logo-white small.png')
                  : require('../../assets/images/edufi-logo small.png')
                }
                style={{ width: 97, height: 49, resizeMode: 'contain' }}
              />
            </View>
            <View style={styles.avatar}>
              {user?.profile_picture ? (
                <Image
                  source={{ uri: user.profile_picture }}
                  style={styles.avatarImage}
                />
              ) : (
                <ThemedText style={styles.avatarText}>
                  {getInitials(`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '')}
                </ThemedText>
              )}
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888888" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Search courses, groups..."
              placeholderTextColor="#888888"
              style={[styles.searchInput, { color: themeColors.text }]}
            />
          </View>

          {/* Today's Classes - Live Data */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Today's Classes</ThemedText>
            {todayClasses.length > 0 && (
              <TouchableOpacity
                style={styles.sectionEditButton}
                onPress={() => router.push('/add-class')}
              >
                <Ionicons name="add" size={20} color={BrandColors.brandGreen} />
                <Text style={styles.sectionEditText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {todayClasses.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classesScroll}>
              {todayClasses.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.classCard}
                  activeOpacity={0.7}
                  onPress={() => console.log('Navigate to class details:', item.id)}
                >
                  <View style={styles.classTimeContainer}>
                    <Ionicons name="time-outline" size={14} color={BrandColors.brandGreen} />
                    <Text style={styles.classTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.classTitle} numberOfLines={2}>{item.subjectName}</Text>
                  {item.courseCode && (
                    <Text style={styles.classCourse} numberOfLines={1}>{item.courseCode}</Text>
                  )}
                  <View style={styles.classLocationContainer}>
                    <Ionicons name="location-outline" size={14} color={themeColors.secondary} />
                    <Text style={styles.classLocation} numberOfLines={1}>{item.venue || 'TBD'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noClassesContainer}>
              <Text style={styles.noClassesText}>No classes for today yet</Text>
              <TouchableOpacity
                style={styles.addSubjectsButton}
                onPress={() => router.push('/add-class')}
              >
                <Text style={styles.addSubjectsButtonText}>Add Subjects</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Actions - Unified 2x2 Grid */}
          <View style={styles.sectionTitleStandalone}>
            <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          </View>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickActionCard}
                onPress={() => handleQuickActionPress(action.route)}
              >
                <View style={[styles.quickActionIconContainer, { backgroundColor: `${action.color}20` }]}>
                  <Ionicons name={action.icon as any} size={28} color={action.color} />
                </View>
                <ThemedText style={styles.quickActionLabel}>{action.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Campus AI Assistant - Eddy */}
          <View style={styles.sectionTitleStandalone}>
            <ThemedText style={styles.sectionTitle}>EduFi AI Assistant</ThemedText>
          </View>
          <LinearGradient
            colors={[BrandColors.brandBlue, BrandColors.brandGreen]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiAssistantCard}
          >
            <View style={styles.aiIconContainer}>
              <MaterialCommunityIcons name="chat-processing-outline" size={30} color="#fff" />
            </View>
            <ThemedText style={styles.aiTitle}>Eddy</ThemedText>
            <ThemedText style={styles.aiSubtitle}>Your personal academic AI assistant.</ThemedText>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => router.push('/ai-buddy')}
            >
              <ThemedText style={styles.aiButtonText}>Chat Now</ThemedText>
            </TouchableOpacity>
          </LinearGradient>

          {/* Campus Map Banner */}
          <View style={styles.sectionTitleStandalone}>
            <ThemedText style={styles.sectionTitle}>Explore Campus</ThemedText>
          </View>
          <TouchableOpacity
            style={styles.campusMapCard}
            onPress={() => router.push('/campus-map')}
          >
            <LinearGradient
              colors={[BrandColors.brandBlue, '#1A5A8C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.campusMapGradient}
            >
              <View style={styles.campusMapContent}>
                <View style={styles.campusMapIcon}>
                  <Ionicons name="map" size={32} color="#fff" />
                </View>
                <View style={styles.campusMapInfo}>
                  <ThemedText style={styles.campusMapTitle}>Campus Map</ThemedText>
                  <ThemedText style={styles.campusMapSubtitle}>
                    Navigate buildings, find your way around campus
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface ThemeColors {
  background: string;
  card: string;
  text: string;
  secondary: string;
}

const stylesFn = (theme: ThemeColors, isDesktop: boolean, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? theme.background : '#F9F9F9',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  } as ViewStyle,
  contentContainer: {
    width: '100%',
    maxWidth: isDesktop ? 1200 : '100%',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 5,
  } as ViewStyle,
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
    color: theme.text,
  } as TextStyle,
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  } as ViewStyle,
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  } as ImageStyle,
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  } as TextStyle,
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? theme.card : '#F0F2F5',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 50,
    marginTop: 10,
    marginBottom: 20,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    padding: 0,
  } as TextStyle,
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  } as TextStyle,
  sectionTitleStandalone: {
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 20,
  } as ViewStyle,
  sectionEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  } as ViewStyle,
  sectionEditText: {
    color: BrandColors.brandGreen,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  } as TextStyle,
  // Today's Classes styles
  classesScroll: {
    paddingLeft: 20,
    paddingRight: 10,
  } as ViewStyle,
  classCard: {
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: 200,
    minHeight: 140,
    marginRight: 12,
    elevation: isDark ? 0 : 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 8,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'transparent',
    justifyContent: 'space-between',
  } as ViewStyle,
  classTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 179, 126, 0.15)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 10,
  } as ViewStyle,
  classTime: {
    color: BrandColors.brandGreen,
    marginLeft: 4,
    fontWeight: '700',
    fontSize: 13,
  } as TextStyle,
  classTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  } as TextStyle,
  classCourse: {
    color: theme.secondary,
    fontSize: 13,
    marginBottom: 8,
  } as TextStyle,
  classLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto' as any,
  } as ViewStyle,
  classLocation: {
    color: theme.secondary,
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  } as TextStyle,
  classButton: {
    backgroundColor: BrandColors.brandGreen,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  } as ViewStyle,
  classButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  } as TextStyle,
  addClassCard: {
    width: 140,
    borderRadius: 16,
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: isDark ? 0 : 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  } as ViewStyle,
  addClassText: {
    color: BrandColors.brandGreen,
    marginTop: 8,
    fontWeight: '500',
    fontSize: 14,
  } as TextStyle,
  noClassesContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    elevation: isDark ? 0 : 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 8,
  } as ViewStyle,
  noClassesText: {
    color: theme.text,
    marginBottom: 16,
    fontSize: 16,
  } as TextStyle,
  addSubjectsButton: {
    backgroundColor: BrandColors.brandGreen,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  } as ViewStyle,
  addSubjectsButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  } as TextStyle,
  // Quick Actions - 2x2 Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  } as ViewStyle,
  quickActionCard: {
    width: '48%',
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: isDark ? 0 : 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 8,
  } as ViewStyle,
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  } as ViewStyle,
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: theme.text,
  } as TextStyle,
  // AI Assistant Card
  aiAssistantCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  } as ViewStyle,
  aiIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 12,
  } as ViewStyle,
  aiTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  } as TextStyle,
  aiSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    textAlign: 'center',
  } as TextStyle,
  aiButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  } as ViewStyle,
  aiButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  } as TextStyle,
  // Campus Map Banner
  campusMapCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  } as ViewStyle,
  campusMapGradient: {
    padding: 16,
  } as ViewStyle,
  campusMapContent: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  campusMapIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  } as ViewStyle,
  campusMapInfo: {
    flex: 1,
  } as ViewStyle,
  campusMapTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  } as TextStyle,
  campusMapSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  } as TextStyle,
});