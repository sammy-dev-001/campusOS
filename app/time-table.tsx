import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useTheme } from '../contexts/ThemeContext';
import { ClassData, useTimetable } from '../contexts/TimetableContext';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const formatTimeRangeToAMPM = (timeRange: string) => {
  if (!timeRange || !timeRange.includes(' - ')) {
    return timeRange; 
  }

  const [start, end] = timeRange.split(' - ');

  const formatSingleTimeToAMPM = (time24: string) => {
    if (!time24) return '';
    const [hoursStr, minutesStr] = time24.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    if (isNaN(hours) || isNaN(minutes)) return time24;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 

    const minutesPadded = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minutesPadded} ${ampm}`;
  };

  return `${formatSingleTimeToAMPM(start)} - ${formatSingleTimeToAMPM(end)}`;
};

export default function TimeTableScreen() {
  const { theme } = useTheme();
  const { classes, isLoading, deleteClass } = useTimetable();
  const router = useRouter();
  const styles = getStyles(theme);

  const getClassesForDay = (day: string) => {
    return classes.filter(cls => cls.dayOfWeek === day);
  };

  const handleDeletePress = (classId: string, subjectName: string) => {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${subjectName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteClass(classId)
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="calendar-outline" size={60} color={theme.secondary} style={styles.emptyStateIcon} />
      <Text style={styles.emptyStateTitle}>Your Timetable is Empty</Text>
      <Text style={styles.emptyStateSubtitle}>
        Tap the button below to add your first class and get organized.
      </Text>
    </View>
  );

  const renderClassCard = (cls: ClassData) => (
    <View key={cls.id} style={styles.classCard}>
      <View style={styles.classCardHeader}>
        <Text style={styles.classTitle}>{cls.subjectName}</Text>
        <TouchableOpacity onPress={() => handleDeletePress(cls.id, cls.subjectName)} style={styles.deleteButton}>
           <Ionicons name="ellipsis-vertical" size={20} color={theme.secondary} />
        </TouchableOpacity>
      </View>
      {cls.courseCode && <Text style={styles.classCourseCode}>{cls.courseCode}</Text>}

      <View style={styles.classDetailsContainer}>
        <View style={styles.classDetailRow}>
          <Ionicons name="time-outline" size={16} color={theme.secondary} />
          <Text style={styles.classDetailText}>{formatTimeRangeToAMPM(cls.time)}</Text>
        </View>
        <View style={styles.classDetailRow}>
          <Ionicons name="location-outline" size={16} color={theme.secondary} />
          <Text style={styles.classDetailText}>{cls.venue}</Text>
        </View>
        {cls.lecturerName && (
          <View style={styles.classDetailRow}>
            <Ionicons name="person-outline" size={16} color={theme.secondary} />
            <Text style={styles.classDetailText}>{cls.lecturerName}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Timetable</ThemedText>
        <TouchableOpacity onPress={() => router.push('/add-class')} style={styles.headerAddButton}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your schedule...</Text>
                </View>
      ) : classes.length === 0 ? (
        renderEmptyState()
            ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContainer}
        >
          {days.map(day => {
            const dayClasses = getClassesForDay(day);
            if (dayClasses.length === 0) return null;
            
            return (
              <View key={day} style={styles.daySection}>
                <Text style={styles.dayHeader}>{day} Classes</Text>
                {dayClasses.map(cls => renderClassCard(cls))}
              </View>
            );
          })}
      </ScrollView>
      )}

      {/* Add Subject Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/add-class')}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Add Subject</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
    paddingTop: 40,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text,
  },
  headerAddButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for the FAB
  },
  daySection: {
    marginBottom: 25,
  },
  dayHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 15,
  },
  classCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  classTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF', // Using a vibrant blue for the title
    flex: 1,
  },
  deleteButton: {
    padding: 5,
  },
  classCourseCode: {
    fontSize: 14,
    color: theme.secondary,
    marginTop: -2,
    marginBottom: 15,
  },
  classDetailsContainer: {
    marginTop: 10,
  },
  classDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  classDetailText: {
    fontSize: 16,
    color: theme.secondary,
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: theme.secondary,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateIcon: {
    marginBottom: 15,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: theme.secondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
}); 