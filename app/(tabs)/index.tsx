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

interface ClassItem {
  id: string;
  time: string;
  subjectName: string;
  courseCode?: string;
  venue?: string;
}

const studyGroups = [
  {
    id: 'cs-majors-1',
    icon: 'flower-tulip-outline',
    title: 'CS Majors Club',
    members: 15,
    description: 'Discussions, coding challenges & tech talks',
    iconColor: '#ffb3ba', // A pinkish color for the tulip
  },
  {
    id: 'creative-writing-2',
    icon: 'creation',
    title: 'Creative Writing',
    members: 8,
    description: 'Share your stories and get feedback.',
    iconColor: '#8ecae6', // A blue/teal color
  },
];

interface UserProfile {
  id: number;
  username: string;
  display_name: string;
  firstName?: string;
  lastName?: string;
  profile_picture?: string;
  email?: string;
  bio?: string;
}

// Constants
const ICON_SIZE = 24;

// Navigation grid items
const navGridItems = [
  { label: 'Tutor or Study Group', icon: 'account-group-outline' },
  { label: 'Time Table', icon: 'calendar-month-outline' },
  { label: 'Notes and Past questions', icon: 'book-open-outline' },
  { label: 'Polls and surveys', icon: 'poll' }
];

// Quick actions
const quickActions = [
  {
    label: 'Announcements',
    icon: 'megaphone-outline',
    color: '#FF6B6B',
  },
  {
    label: 'Events',
    icon: 'calendar-outline',
    color: '#FFD93D',
  },
  {
    label: 'GPA Tracker',
    icon: 'school-outline',
    color: '#4D96FF',
  },
  {
    label: 'Menu',
    icon: 'menu-outline',
    color: '#6BCB77',
  },
];

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useUser();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  // Get user's display name, falling back to username
  const userDisplayName = React.useMemo(() => {
    if (!user) return 'Student';
    return user.display_name || user.username || 'Student';
  }, [user]);

  // Get today's classes - this is a mock function
  const getTodaysClasses = () => [];

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
      // Force a re-render by updating the refresh key
      setRefreshKey(prev => prev + 1);

      // Remove the refresh parameter from the URL
      const newParams = { ...searchParams };
      delete newParams.refresh;
      router.setParams(newParams);
    }
  }, [refresh, searchParams, router]);

  const styles = stylesFn(themeColors, isDesktop);

  const { getTodaysClasses: getTodaysClassesFn } = useTimetable();
  const todayClasses = useMemo(() => getTodaysClassesFn(), [getTodaysClassesFn]);

  const handleQuickActionPress = (actionLabel: string) => {
    switch (actionLabel) {
      case 'Announcements':
        router.push('/announcements');
        break;
      case 'Events':
        router.push('/events');
        break;
      case 'GPA Tracker':
        router.push('/gpa-tracker');
        break;
      case 'Menu':
        router.push('/menu');
        break;
      default:
        console.log('No route defined for:', actionLabel);
    }
  };


  const handleNavGridPress = (label: string) => {
    switch (label) {
      case 'Tutor or Study Group':
        router.push('/tutor-study-group');
        break;
      case 'Time Table':
        router.push('/time-table');
        break;
      case 'Notes and Past questions':
        router.push('/notes-past-questions');
        break;
      case 'Polls and surveys':
        router.push('/polls-surveys');
        break;
      default:
        console.log('No route defined for:', label);
    }
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
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="school-outline" size={30} color={themeColors.text} />
              <ThemedText style={styles.logoText}>EduFi</ThemedText>
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
            <Ionicons name="search" size={20} color={themeColors.secondary} style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Search courses, groups..."
              placeholderTextColor={themeColors.secondary}
              style={[styles.searchInput, { color: themeColors.text }]}
            />
          </View>


          {/* Quick Actions Grid */}
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickActionItem}
                onPress={() => handleQuickActionPress(action.label)}
              >
                <View style={styles.quickActionIconContainer}>
                  <Ionicons name={action.icon as any} size={ICON_SIZE} color={action.color} />
                </View>
                <ThemedText
                  style={styles.quickActionLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {action.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Today's Classes */}
          <ThemedText style={styles.sectionTitle}>Today's Classes</ThemedText>
          {todayClasses.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classesScroll}>
              {todayClasses.map((item) => (
                <View key={item.id} style={styles.classCard}>
                  <View style={styles.classTimeContainer}>
                    <Ionicons name="time-outline" size={16} color="#A7C7E7" />
                    <Text style={styles.classTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.classTitle}>{item.subjectName}</Text>
                  {item.courseCode && (
                    <Text style={styles.classCourse}>{item.courseCode}</Text>
                  )}
                  <View style={styles.classLocationContainer}>
                    <Ionicons name="location-outline" size={16} color={themeColors.secondary} />
                    <Text style={styles.classLocation}>{item.venue}</Text>
                  </View>
                  <TouchableOpacity style={styles.classButton}>
                    <Text style={styles.classButtonText}>Details</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addClassCard}
                onPress={() => router.push('/add-class')}
              >
                <Ionicons name="add-circle-outline" size={40} color="#2196F3" />
                <Text style={styles.addClassText}>Add Class</Text>
              </TouchableOpacity>
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

          {/* Central Nav Hub */}
          <View style={styles.navHubContainer}>
            <View style={styles.navGrid}>
              {navGridItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.navGridItem}
                  onPress={() => handleNavGridPress(item.label)}
                >
                  <MaterialCommunityIcons name={item.icon as any} size={32} color={themeColors.text} />
                  <Text style={styles.navGridLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.centerButtonContainer}
              onPress={() => router.push('/market-place')}
            >
              <LinearGradient
                colors={["#4D96FF", "#6BCB77"]}
                style={styles.centerButton}
              >
                <MaterialCommunityIcons name="cart-outline" size={40} color="#fff" />
                <Text style={styles.centerButtonText}>Campus</Text>
                <Text style={styles.centerButtonSubText}>market place</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Campus AI Assistant */}
          <ThemedText style={styles.sectionTitle}>EduFi AI Assistant</ThemedText>
          <LinearGradient
            colors={["#0B3C5D", "#4CAF50"]}
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

          {/* Campus Map */}
          <ThemedText style={styles.sectionTitle}>Explore Campus</ThemedText>
          <TouchableOpacity
            style={styles.campusMapCard}
            onPress={() => router.push('/campus-map')}
          >
            <LinearGradient
              colors={['#0B3C5D', '#1A5A8C']}
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

interface Styles {
  container: ViewStyle;
  contentContainer: ViewStyle;
  section: ViewStyle;
  sectionHeader: ViewStyle;
  sectionTitle: TextStyle;
  headerLeft: ViewStyle;
  logoText: TextStyle;
  avatar: ViewStyle;
  avatarImage: ImageStyle;
  avatarText: TextStyle;
  searchContainer: ViewStyle;
  searchIcon: ViewStyle;
  searchInput: TextStyle;
  quickActionsGrid: ViewStyle;
  quickActionItem: ViewStyle;
  quickActionIconContainer: ViewStyle;
  quickActionLabel: TextStyle;
  classesScroll: ViewStyle;
  classCard: ViewStyle;
  classTimeContainer: ViewStyle;
  classTime: TextStyle;
  classTitle: TextStyle;
  classCourse: TextStyle;
  classLocationContainer: ViewStyle;
  classLocation: TextStyle;
  classButton: ViewStyle;
  classButtonText: TextStyle;
  addClassCard: ViewStyle;
  addClassText: TextStyle;
  noClassesContainer: ViewStyle;
  noClassesText: TextStyle;
  addSubjectsButton: ViewStyle;
  addSubjectsButtonText: TextStyle;
  navHubContainer: ViewStyle;
  navGrid: ViewStyle;
  navGridItem: ViewStyle;
  navGridLabel: TextStyle;
  centerButtonContainer: ViewStyle;
  centerButton: ViewStyle;
  centerButtonText: TextStyle;
  centerButtonSubText: TextStyle;
  aiAssistantCard: ViewStyle;
  aiIconContainer: ViewStyle;
  aiTitle: TextStyle;
  aiSubtitle: TextStyle;
  aiButton: ViewStyle;
  aiButtonText: TextStyle;
  studyGroupsGrid: ViewStyle;
  studyGroupCard: ViewStyle;
  studyGroupHeader: ViewStyle;
  studyGroupIcon: ViewStyle;
  studyGroupTitle: TextStyle;
  studyGroupInfo: ViewStyle;
  studyGroupMeta: TextStyle;
  studyGroupDescription: TextStyle;
  studyGroupButton: ViewStyle;
  studyGroupButtonText: TextStyle;
  header: ViewStyle;
  campusMapCard: ViewStyle;
  campusMapGradient: ViewStyle;
  campusMapContent: ViewStyle;
  campusMapIcon: ViewStyle;
  campusMapInfo: ViewStyle;
  campusMapTitle: TextStyle;
  campusMapSubtitle: TextStyle;
}

const stylesFn = (theme: ThemeColors, isDesktop: boolean) => StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  } as ViewStyle,
  contentContainer: {
    width: '100%',
    maxWidth: isDesktop ? 1200 : '100%',
  } as ViewStyle,
  section: {
    marginBottom: 24,
  } as ViewStyle,
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    paddingHorizontal: 16,
    marginBottom: 12,
  } as TextStyle,
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
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 50,
    marginTop: 10,
  } as ViewStyle,
  searchIcon: {
    marginRight: 10,
  } as any, // Using any to bypass the Ionicons style type issue
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    padding: 0,
    userSelect: 'text' as const,
  } as TextStyle,
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isDesktop ? 'flex-start' : 'space-around',
    marginHorizontal: 10,
    marginTop: 25,
  } as ViewStyle,
  quickActionItem: {
    width: isDesktop ? 'auto' : '23%',
    flexGrow: isDesktop ? 1 : 0,
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: isDesktop ? 10 : 0,
  } as ViewStyle,
  quickActionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  quickActionLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: theme.secondary,
    flexShrink: 1,
  } as TextStyle,
  classesScroll: {
    paddingLeft: 20,
    paddingRight: 10,
  } as ViewStyle,
  classCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 15,
    width: 250,
    marginRight: 15,
  } as ViewStyle,
  classTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(77, 150, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 15,
  } as ViewStyle,
  classTime: {
    color: '#A7C7E7',
    marginLeft: 5,
    fontWeight: 'bold',
  } as TextStyle,
  classTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: 'bold',
  } as TextStyle,
  classCourse: {
    color: theme.secondary,
    fontSize: 16,
    marginBottom: 10,
  } as TextStyle,
  classLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 15,
  } as ViewStyle,
  classLocation: {
    color: theme.secondary,
    fontSize: 14,
    marginLeft: 5,
  } as TextStyle,
  classButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  } as ViewStyle,
  classButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  } as TextStyle,
  navHubContainer: {
    marginHorizontal: 20,
    marginTop: 30,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  } as ViewStyle,
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  } as ViewStyle,
  navGridItem: {
    width: '48%',
    height: 120,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    marginBottom: '4%' as any, // Using any for percentage value
  } as ViewStyle,
  navGridLabel: {
    color: theme.text,
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600'
  } as TextStyle,
  centerButtonContainer: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  } as ViewStyle,
  centerButton: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  centerButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 5,
  } as TextStyle,
  centerButtonSubText: {
    color: '#fff',
    fontSize: 12,
    textTransform: 'lowercase',
  } as TextStyle,
  aiAssistantCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  } as ViewStyle,
  aiIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 50,
    padding: 15,
    marginBottom: 10,
  } as ViewStyle,
  aiTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  } as TextStyle,
  aiSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  } as TextStyle,
  aiButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  } as ViewStyle,
  aiButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  } as TextStyle,
  studyGroupsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 20,
  } as ViewStyle,
  studyGroupCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
  } as ViewStyle,
  studyGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  } as ViewStyle,
  studyGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  } as ViewStyle,
  studyGroupTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
  } as TextStyle,
  studyGroupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  } as ViewStyle,
  studyGroupMeta: {
    color: theme.secondary,
    marginLeft: 5,
  } as TextStyle,
  studyGroupDescription: {
    color: theme.secondary,
    fontSize: 14,
    marginBottom: 15,
    height: 40, // for consistent card height
  } as TextStyle,
  studyGroupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  } as ViewStyle,
  studyGroupButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  } as TextStyle,
  noClassesContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginHorizontal: 20,
  } as ViewStyle,
  noClassesText: {
    color: theme.text,
    marginBottom: 15,
    fontSize: 16,
  } as TextStyle,
  addSubjectsButton: {
    backgroundColor: '#4D96FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  } as ViewStyle,
  addSubjectsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  } as TextStyle,
  addClassCard: {
    width: 250,
    height: 120,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  } as ViewStyle,
  addClassText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  } as TextStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme.background,
  } as ViewStyle,
  campusMapCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  } as ViewStyle,
  campusMapGradient: {
    padding: 16,
  } as ViewStyle,
  campusMapContent: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  campusMapIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  campusMapInfo: {
    flex: 1,
    marginLeft: 16,
  } as ViewStyle,
  campusMapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  } as TextStyle,
  campusMapSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  } as TextStyle,
});