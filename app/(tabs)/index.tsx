// app/(tabs)/index.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, TouchableWithoutFeedback } from 'react-native';
import {
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTimetable } from '../../contexts/TimetableContext';

const ICON_SIZE = 28;

// Mock Data
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
    icon: 'stats-chart-outline',
    color: '#6BCB77',
  },
  {
    label: 'Menu',
    icon: 'menu-outline',
    color: '#4D96FF',
  },
];

const navGridItems = [
    { label: 'Tutor or Study Group', icon: 'account-group-outline' },
    { label: 'Time Table', icon: 'calendar-month-outline' },
    { label: 'Notes and Past questions', icon: 'book-open-outline' },
    { label: 'Polls and surveys', icon: 'poll' }
]

const studyGroups = [
    {
      icon: 'flower-tulip-outline',
      title: 'CS Majors Club',
      members: 15,
      description: 'Discussions, coding challenges & tech talks',
      iconColor: '#ffb3ba', // A pinkish color for the tulip
    },
    {
      icon: 'creation',
      title: 'Creative Writing',
      members: 8,
      description: 'Share your stories and get feedback.',
      iconColor: '#8ecae6', // A blue/teal color
    },
];

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { getTodaysClasses } = useTimetable();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isDesktop = width > 768;
  
  const styles = stylesFn(theme, isDesktop);

  const todayClasses = getTodaysClasses();

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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="school-outline" size={30} color={theme.text} />
              <ThemedText style={styles.logoText}>CampusOS</ThemedText>
            </View>
            <View style={styles.avatar}>
              {user?.profile_picture ? (
                <Image
                  source={{ uri: user.profile_picture }}
                  style={styles.avatarImage}
                />
              ) : (
                <ThemedText style={styles.avatarText}>
                  {getInitials(user?.display_name ?? user?.username ?? '')}
                </ThemedText>
              )}
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.secondary} style={styles.searchIcon} />
            <TextInput
              placeholder="Search courses, groups..."
              placeholderTextColor={theme.secondary}
              style={styles.searchInput}
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
                    <Ionicons name="location-outline" size={16} color={theme.secondary} />
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
                  <MaterialCommunityIcons name={item.icon as any} size={32} color={theme.text} />
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
          <ThemedText style={styles.sectionTitle}>Campus AI Assistant</ThemedText>
          <LinearGradient
            colors={["#4A90E2", "#D02323"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiAssistantCard}
          >
            <View style={styles.aiIconContainer}>
              <MaterialCommunityIcons name="chat-processing-outline" size={30} color="#fff" />
            </View>
            <ThemedText style={styles.aiTitle}>Campus Buddy</ThemedText>
            <ThemedText style={styles.aiSubtitle}>Your personal academic AI assistant.</ThemedText>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => router.push('/new-chat')}
            >
              <ThemedText style={styles.aiButtonText}>Chat Now</ThemedText>
            </TouchableOpacity>
          </LinearGradient>

          {/* Study Groups */}
          <ThemedText style={styles.sectionTitle}>Study Groups</ThemedText>
          <View style={styles.studyGroupsGrid}>
            {studyGroups.map((group, index) => (
              <View key={index} style={styles.studyGroupCard}>
                <View style={styles.studyGroupHeader}>
                  <View style={[styles.studyGroupIcon, { backgroundColor: group.iconColor }]}> 
                    <MaterialCommunityIcons name={group.icon as any} size={24} color="#000" />
                  </View>
                  <ThemedText style={styles.studyGroupTitle}>{group.title}</ThemedText>
                </View>
                <View style={styles.studyGroupInfo}>
                  <Ionicons name="people-outline" size={16} color={theme.secondary} />
                  <ThemedText style={styles.studyGroupMeta}>{group.members} Members</ThemedText>
                </View>
                <ThemedText style={styles.studyGroupDescription}>{group.description}</ThemedText>
                <TouchableOpacity style={styles.studyGroupButton}>
                  <ThemedText style={styles.studyGroupButtonText}>Join Now</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const stylesFn = (theme: any, isDesktop: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Force dark background as per design
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  contentContainer: {
    width: '100%',
    maxWidth: isDesktop ? 1200 : undefined,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 50,
    marginTop: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isDesktop ? 'flex-start' : 'space-around',
    marginHorizontal: 10,
    marginTop: 25,
  },
  quickActionItem: {
    width: isDesktop ? 'auto' : '23%',
    flexGrow: isDesktop ? 1 : 0,
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: isDesktop ? 10 : 0,
  },
  quickActionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: theme.secondary,
    flexShrink: 1,
  },
  sectionTitle: {
      fontSize: 20,
    fontWeight: 'bold',
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 15,
  },
  classesScroll: {
      paddingLeft: 20,
      paddingRight: 10,
  },
  classCard: {
      backgroundColor: '#1E1E1E',
      borderRadius: 20,
      padding: 15,
      width: 250,
      marginRight: 15,
  },
  classTimeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(77, 150, 255, 0.2)',
      borderRadius: 20,
      paddingVertical: 5,
      paddingHorizontal: 10,
      alignSelf: 'flex-start',
      marginBottom: 15,
  },
  classTime: {
      color: '#A7C7E7',
      marginLeft: 5,
      fontWeight: 'bold',
  },
  classTitle: {
      color: theme.text,
      fontSize: 22,
      fontWeight: 'bold',
  },
  classCourse: {
      color: theme.secondary,
      fontSize: 16,
      marginBottom: 10,
  },
  classLocationContainer: {
    flexDirection: 'row',
      alignItems: 'center',
      marginTop: 'auto',
      marginBottom: 15,
  },
  classLocation: {
      color: theme.secondary,
      fontSize: 14,
      marginLeft: 5,
  },
  classButton: {
      backgroundColor: '#007AFF',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
  },
  classButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  },
  navHubContainer: {
    marginHorizontal: 20,
    marginTop: 30,
    height: 280, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  navGridItem: {
    width: '48%',
    height: 120,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    marginBottom: '4%',
  },
  navGridLabel: {
    color: theme.text,
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600'
  },
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
  },
  centerButton: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 5,
  },
  centerButtonSubText: {
    color: '#fff',
    fontSize: 12,
    textTransform: 'lowercase',
  },
  aiAssistantCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  aiIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 50,
    padding: 15,
    marginBottom: 10,
  },
  aiTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  aiSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  aiButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  aiButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  studyGroupsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 20,
  },
  studyGroupCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
  },
  studyGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  studyGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studyGroupTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  studyGroupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  studyGroupMeta: {
    color: theme.secondary,
    marginLeft: 5,
  },
  studyGroupDescription: {
    color: theme.secondary,
    fontSize: 14,
    marginBottom: 15,
    height: 40, // for consistent card height
  },
  studyGroupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  studyGroupButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14,
  },
  noClassesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  noClassesText: {
    color: theme.secondary,
    fontSize: 16,
    marginBottom: 20,
  },
  addSubjectsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  addSubjectsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addClassCard: {
    width: 250,
    height: 120,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  addClassText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});