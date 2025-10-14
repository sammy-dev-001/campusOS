import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTimetable } from '../src/contexts/TimetableContext';

export default function ClassRemindersScreen() {
  const { classes, updateClass, refreshNotifications } = useTimetable();
  const [scheduledNotifications, setScheduledNotifications] = useState<Notifications.NotificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScheduledNotifications();
  }, [classes]);

  const loadScheduledNotifications = async () => {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      setScheduledNotifications(notifications);
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (classId: string, enabled: boolean) => {
    try {
      await updateClass(classId, { reminder: enabled });
      await loadScheduledNotifications(); // Refresh the list
      Alert.alert(
        enabled ? 'Reminder Enabled' : 'Reminder Disabled',
        enabled 
          ? 'You will receive notifications 5 minutes before this class starts every week.'
          : 'Reminders for this class have been disabled.'
      );
    } catch (error) {
      console.error('Error toggling reminder:', error);
      Alert.alert('Error', 'Failed to update reminder settings.');
    }
  };

  const refreshAllNotifications = async () => {
    try {
      await refreshNotifications();
      await loadScheduledNotifications();
      Alert.alert('Success', 'All reminders have been refreshed.');
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      Alert.alert('Error', 'Failed to refresh reminders.');
    }
  };

  const getNextReminderTime = (dayOfWeek: string, time: string) => {
    const [startTime] = time.split(' - ');
    const [hour, minute] = startTime.split(':').map(Number);
    
    // Calculate reminder time (5 minutes before)
    let reminderHour = hour;
    let reminderMinute = minute - 5;
    if (reminderMinute < 0) {
      reminderMinute += 60;
      reminderHour = (reminderHour - 1 + 24) % 24;
    }

    return `${reminderHour.toString().padStart(2, '0')}:${reminderMinute.toString().padStart(2, '0')}`;
  };

  const renderClassItem = ({ item }: { item: any }) => {
    const hasNotification = scheduledNotifications.some(
      notification => notification.content.data?.classId === item.id
    );

    return (
      <View style={styles.classItem}>
        <View style={styles.classInfo}>
          <Text style={styles.subjectName}>{item.subjectName}</Text>
          <Text style={styles.classDetails}>
            {item.dayOfWeek} • {item.time} • {item.venue}
          </Text>
          {item.reminder && (
            <Text style={styles.reminderInfo}>
              Reminder: {getNextReminderTime(item.dayOfWeek, item.time)} every {item.dayOfWeek}
            </Text>
          )}
        </View>
        <View style={styles.controls}>
          <Switch
            value={item.reminder}
            onValueChange={(enabled) => toggleReminder(item.id, enabled)}
            trackColor={{ false: '#767577', true: '#2196F3' }}
            thumbColor={item.reminder ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Class Reminders</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshAllNotifications}>
          <Ionicons name="refresh" size={24} color="#FFD600" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color="#FFD600" />
        <Text style={styles.infoText}>
          Reminders are sent 5 minutes before each class starts and repeat every week.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      ) : classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No classes found</Text>
          <Text style={styles.emptySubtext}>Add classes to your timetable to set up reminders</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          renderItem={renderClassItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {classes.filter(c => c.reminder).length} of {classes.length} classes have reminders enabled
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#181A20',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23242A',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    color: '#fff',
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  classItem: {
    flexDirection: 'row',
    backgroundColor: '#23242A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  classInfo: {
    flex: 1,
  },
  subjectName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  classDetails: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  reminderInfo: {
    color: '#FFD600',
    fontSize: 12,
    fontStyle: 'italic',
  },
  controls: {
    marginLeft: 16,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#23242A',
  },
  statsText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
}); 