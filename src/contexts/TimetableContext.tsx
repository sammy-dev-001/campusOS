import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface ClassData {
  id: string;
  subjectName: string;
  courseCode?: string;
  time: string;
  venue: string;
  lecturerName?: string;
  dayOfWeek: string;
  reminder: boolean;
  notificationId?: string;
}

interface TimetableContextType {
  classes: ClassData[];
  addClass: (classData: Omit<ClassData, 'id'>) => Promise<void>;
  updateClass: (id: string, classData: Partial<ClassData>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  getTodaysClasses: () => ClassData[];
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
}

const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

export const useTimetable = () => {
  const context = useContext(TimetableContext);
  if (!context) {
    throw new Error('useTimetable must be used within a TimetableProvider');
  }
  return context;
};

export const TimetableProvider = ({ children }: { children: ReactNode }) => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClasses();
    registerForPushNotificationsAsync();
  }, []);

  // Refresh notifications when classes change, but only if classes actually changed
  const prevClassesRef = React.useRef<ClassData[]>([]);
  
  useEffect(() => {
    if (isLoading) return;
    
    // Check if classes actually changed to prevent unnecessary refreshes
    const classesChanged = JSON.stringify(prevClassesRef.current) !== JSON.stringify(classes);
    
    if (classesChanged) {
      refreshNotifications();
      prevClassesRef.current = [...classes];
    }
  }, [classes, isLoading]);
  
  const registerForPushNotificationsAsync = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        if (newStatus !== 'granted') {
          console.warn('Notification permissions not granted');
        }
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  };

  const scheduleNotification = async (classData: ClassData): Promise<string | undefined> => {
    if (!classData.reminder) return undefined;

    try {
      const [startTime] = classData.time.split(' - ');
      const [hour, minute] = startTime.split(':').map(Number);
      
      // Subtract 5 minutes for the reminder
      let reminderHour = hour;
      let reminderMinute = minute - 5;

      if (reminderMinute < 0) {
        reminderMinute += 60;
        reminderHour = (reminderHour - 1 + 24) % 24;
      }
   
      const weekdayMap: { [key: string]: number } = {
        Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6, Saturday: 7,
      };

      const weekday = weekdayMap[classData.dayOfWeek];
      if (!weekday) {
        console.error('Invalid day of week:', classData.dayOfWeek);
        return undefined;
      }

      // Calculate the next occurrence of this weekday and time
      const now = new Date();
      const targetDay = weekday;
      const currentDay = now.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      
      const nextOccurrence = new Date(now);
      nextOccurrence.setDate(now.getDate() + daysUntilTarget);
      nextOccurrence.setHours(reminderHour, reminderMinute, 0, 0);
      
      // If the time has already passed today, schedule for next week
      if (daysUntilTarget === 0 && nextOccurrence <= now) {
        nextOccurrence.setDate(nextOccurrence.getDate() + 7);
      }
   
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Class Reminder: ${classData.subjectName}`,
          body: `Your class at ${classData.venue} is starting in 5 minutes.`,
          sound: 'default',
          data: { classId: classData.id, type: 'class_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextOccurrence,
        },
      });

      console.log(`Scheduled recurring reminder for ${classData.subjectName} on ${classData.dayOfWeek} at ${reminderHour}:${reminderMinute.toString().padStart(2, '0')}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return undefined;
    }
  };
  
  const cancelNotification = async (notificationId?: string) => {
    if (notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log('Cancelled notification:', notificationId);
      } catch (error) {
        console.error('Error cancelling notification:', error);
      }
    }
  };

  const refreshNotifications = async () => {
    try {
      console.log('Refreshing notifications...');
      
      // Get current scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const scheduledClassIds = new Set(
        scheduledNotifications
          .map(n => n.content.data?.classId)
          .filter(Boolean)
      );

      // Only reschedule if needed
      const needsRescheduling = classes.some(
        classData => classData.reminder && !scheduledClassIds.has(classData.id)
      );

      if (needsRescheduling) {
        // Cancel all existing class reminder notifications
        for (const notification of scheduledNotifications) {
          if (notification.content.data?.type === 'class_reminder') {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          }
        }

        // Reschedule notifications for classes with reminders enabled
        const updatedClasses = await Promise.all(
          classes.map(async (classData) => {
            if (classData.reminder) {
              const notificationId = await scheduleNotification(classData);
              return { ...classData, notificationId };
            }
            return classData;
          })
        );

        setClasses(updatedClasses);
        await saveClasses(updatedClasses);
        console.log('Notifications refreshed successfully');
      } else {
        console.log('No need to refresh notifications - already scheduled');
      }
      
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const storedClasses = await AsyncStorage.getItem('timetable_classes');
      if (storedClasses) {
        setClasses(JSON.parse(storedClasses));
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveClasses = async (newClasses: ClassData[]) => {
    try {
      await AsyncStorage.setItem('timetable_classes', JSON.stringify(newClasses));
    } catch (error) {
      console.error('Error saving classes:', error);
    }
  };

  const addClass = async (classData: Omit<ClassData, 'id' | 'notificationId'>) => {
    const newClass: ClassData = {
      ...classData,
      id: Date.now().toString(),
    };
    
    if (newClass.reminder) {
      newClass.notificationId = await scheduleNotification(newClass);
    }
    
    const updatedClasses = [...classes, newClass];
    setClasses(updatedClasses);
    await saveClasses(updatedClasses);
  };

  const updateClass = async (id: string, classData: Partial<ClassData>) => {
    const existingClass = classes.find(c => c.id === id);
    if (existingClass) {
      await cancelNotification(existingClass.notificationId);
    }
    
    const updatedClass = { ...existingClass, ...classData } as ClassData;
    
    if (updatedClass.reminder) {
      updatedClass.notificationId = await scheduleNotification(updatedClass);
    }
    
    const updatedClasses = classes.map(cls => (cls.id === id ? updatedClass : cls));
    setClasses(updatedClasses);
    await saveClasses(updatedClasses);
  };
  
  const deleteClass = async (id: string) => {
    const classToDelete = classes.find(c => c.id === id);
    if (classToDelete) {
      await cancelNotification(classToDelete.notificationId);
    }
    const updatedClasses = classes.filter(cls => cls.id !== id);
    setClasses(updatedClasses);
    await saveClasses(updatedClasses);
  };

  const getTodaysClasses = (): ClassData[] => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return classes
      .filter(cls => cls.dayOfWeek === today)
      .sort((a, b) => {
        // Extract start time from "HH:MM - HH:MM" format
        const getStartTime = (timeStr: string) => {
          const startTime = timeStr.split(' - ')[0];
          return startTime;
        };
        
        const timeA = getStartTime(a.time);
        const timeB = getStartTime(b.time);
        
        return timeA.localeCompare(timeB);
      });
  };

  const value = {
    classes,
    addClass,
    updateClass,
    deleteClass,
    getTodaysClasses,
    isLoading,
    refreshNotifications,
  };

  return (
    <TimetableContext.Provider value={value}>
      {children}
    </TimetableContext.Provider>
  );
}; 