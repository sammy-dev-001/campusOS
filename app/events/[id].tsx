import React from 'react';
import { View, StyleSheet, ScrollView, Image, Linking, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text, useTheme, IconButton, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';

// Helper function to parse date and time
const parseEventDateTime = (dateStr: string, timeStr?: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  let hours = 10; // Default to 10 AM
  let minutes = 0;

  if (timeStr) {
    const timeParts = timeStr.toLowerCase().split(/(?<=\d)(?=[ap]m)/);
    const [time, period] = timeParts.length > 1 
      ? [timeParts[0].trim(), timeParts[1].trim()] 
      : [timeStr, ''];
    
    let [h, m = '0'] = time.split(':');
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10);
    
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
  }

  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration by default
  
  return { startDate, endDate };
};

const EventDetailScreen = () => {
  const theme = useTheme();
  const router = useRouter();
  const { 
    eventId, 
    title = 'Event Title', 
    description = 'No description available', 
    date, 
    time, 
    location = 'Location not specified',
    image,
    category
  } = useLocalSearchParams();

  const handleBack = () => {
    router.back();
  };

  const handleLocationPress = () => {
    // Open maps with the event location
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location as string)}`;
    Linking.openURL(url).catch(err => console.error('Error opening maps:', err));
  };

  const handleAddToCalendar = async () => {
    try {
      // Request calendar permissions
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Calendar permission is needed to add events.');
        return;
      }

      if (!date) {
        Alert.alert('Error', 'This event has no date specified.');
        return;
      }

      // Parse the event date and time
      const { startDate, endDate } = parseEventDateTime(date as string, time as string);
      
      // Get the default calendar
      const defaultCalendar = (await Calendar.getCalendarsAsync())
        .find(cal => cal.isPrimary && cal.allowsModifications);
      
      if (!defaultCalendar) {
        throw new Error('No default calendar found');
      }

      // Create the event
      const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
        title: title as string,
        startDate,
        endDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: location as string,
        notes: description as string,
      });

      // Schedule a notification
      const trigger = new Date(startDate.getTime() - 30 * 60 * 1000); // 30 minutes before
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Event Reminder',
          body: `${title} is starting soon!`,
          data: { eventId },
        },
        trigger: {
          seconds: Math.max(0, Math.floor((trigger.getTime() - Date.now()) / 1000)),
          channelId: 'event-reminders',
        },
      });

      Alert.alert('Success', 'Event added to your calendar with a reminder!');
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert('Error', 'Failed to add event to calendar. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        title: title as string,
        message: `${title}\n${date} ${time ? `at ${time}` : ''}\n${location}\n\n${description}`,
        url: window.location.href,
      };

      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share(shareContent);
      } else {
        // Fallback for non-web or when Web Share API is not available
        await Linking.openURL(
          `mailto:?subject=${encodeURIComponent(shareContent.title)}&body=${encodeURIComponent(shareContent.message)}`
        );
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={handleBack}
          style={styles.backButton}
        />
        <IconButton
          icon="share-variant"
          size={24}
          onPress={handleShare}
          style={styles.shareButton}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {image && (
          <Image 
            source={{ uri: image as string }} 
            style={styles.eventImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.content}>
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.title}>{title}</Text>
              {category && (
                <Chip 
                  style={[styles.categoryChip, { backgroundColor: theme.colors.primaryContainer }]}
                  textStyle={{ color: theme.colors.onPrimaryContainer }}
                >
                  {category}
                </Chip>
              )}
            </View>
            
            <View style={styles.dateTimeContainer}>
              <View style={styles.infoRow}>
                <MaterialIcons name="event" size={20} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.infoText}>
                  {date} {time && `• ${time}`}
                </Text>
              </View>
              
              <View style={[styles.infoRow, styles.locationRow]}>
                <MaterialIcons name="location-on" size={20} color={theme.colors.onSurfaceVariant} />
                <Text 
                  style={[styles.infoText, styles.locationText]}
                  onPress={handleLocationPress}
                >
                  {location}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Event</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          <View style={styles.actions}>
            <Button 
              mode="contained" 
              onPress={handleAddToCalendar}
              style={styles.actionButton}
              icon="calendar-plus"
              loading={false}
            >
              Add to Calendar
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => {}}
              style={styles.actionButton}
              icon="ticket"
            >
              Get Tickets
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  shareButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  eventImage: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: 16,
  },
  headerSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  dateTimeContainer: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationRow: {
    marginBottom: 0,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 16,
  },
  locationText: {
    color: '#1a73e8',
    textDecorationLine: 'underline',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4a4a4a',
  },
  actions: {
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
  },
});

export default EventDetailScreen;
