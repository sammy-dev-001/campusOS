import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import * as Calendar from 'expo-calendar';

import { API_BASE_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

type Event = {
  id: number;
  title: string;
  image?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  category?: string;
};

const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function EventsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const styles = getStyles();

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setFeaturedEvent(data.featured[0] || null);
      setUpcomingEvents(data.upcoming || []);
      console.log('DEBUG upcomingEvents:', data.upcoming);
    } catch (err: any) {
      setError(err.message || 'Error fetching events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const addToCalendar = async (ev: Event) => {
    try {
      // Ask permissions
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Calendar permission is needed to add events.');
        return;
      }

      // Pick a modifiable calendar
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const modifiable = calendars.find((c: Calendar.Calendar) => c.allowsModifications) || calendars[0];
      if (!modifiable) {
        Alert.alert('No calendar found', 'No calendar is available on this device.');
        return;
      }

      // Parse date/time
      const parseDateTime = (dateStr?: string, timeStr?: string) => {
        let start = new Date();
        if (dateStr) {
          const tryDate = new Date(`${dateStr} ${timeStr || '09:00'}`);
          if (!isNaN(tryDate.getTime())) start = tryDate;
        } else if (timeStr) {
          const [h, m] = (timeStr || '09:00').split(':');
          const now = new Date();
          now.setHours(Number(h) || 9, Number(m) || 0, 0, 0);
          start = now;
        }
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h duration
        return { start, end };
      };

      const { start, end } = parseDateTime(ev.date, ev.time);

      const eventId = await Calendar.createEventAsync(modifiable.id, {
        title: ev.title || 'CampusOS Event',
        startDate: start,
        endDate: end,
        location: ev.location,
        notes: ev.description,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (eventId) {
        Alert.alert('Added to Calendar', 'The event was added to your calendar.');
      }
    } catch (e: any) {
      console.error('Add to calendar failed:', e);
      Alert.alert('Error', e?.message || 'Failed to add event to calendar.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: 'red', margin: 20 }}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
       <ScrollView
         contentContainerStyle={styles.scrollContainer}
         refreshControl={
           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
         }
       >
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>CampusOS</Text>
            <View style={styles.headerRight}>
                <TouchableOpacity>
                    <Ionicons name="notifications-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <Image source={{ uri: user?.profile_picture || 'https://randomuser.me/api/portraits/men/1.jpg' }} style={styles.headerAvatar} />
            </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={{marginRight: 10}} />
            <TextInput
                placeholder="Search events..."
                placeholderTextColor="#888"
                style={styles.searchInput}
            />
        </View>

        {/* Filters */}
        <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {['All', 'Social', 'Academic', 'Religious', 'Sports'].map((filter) => (
                <TouchableOpacity
                    key={filter}
                    style={[styles.filterButton, activeFilter === filter && styles.activeFilter]}
                    onPress={() => setActiveFilter(filter)}
                >
                    <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                    {filter}
                    </Text>
                </TouchableOpacity>
            ))}
            </ScrollView>
        </View>

        {/* Featured Event */}
        {featuredEvent && (
          <>
            <Text style={styles.sectionTitle}>Featured Event</Text>
            <View style={styles.featuredCard}>
                <View style={styles.featuredHeader}>
                    <View style={styles.featuredIconContainer}>
                        <MaterialCommunityIcons name="trophy-award" size={24} color="#fff" />
                    </View>
                    <Text style={styles.featuredTitle}>{featuredEvent.title}</Text>
                    <TouchableOpacity style={styles.featuredDetailsButton}>
                        <Text style={styles.featuredDetailsButtonText}>View Details</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.featuredImageContainer}>
                  {featuredEvent.image ? (
                    <Image source={{ uri: featuredEvent.image }} style={{ width: '100%', height: 220, borderRadius: 10 }} resizeMode="contain" />
                  ) : null}
                </View>
                <Text style={styles.featuredDescription}>{featuredEvent.description}</Text>
                <View style={styles.featuredInfoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#fff" />
                    <Text style={styles.featuredInfoText}>{featuredEvent.date}</Text>
                </View>
                <View style={styles.featuredInfoRow}>
                    <Ionicons name="time-outline" size={16} color="#fff" />
                    <Text style={styles.featuredInfoText}>{featuredEvent.time}</Text>
                </View>
                <View style={styles.featuredInfoRow}>
                    <Ionicons name="location-outline" size={16} color="#fff" />
                    <Text style={styles.featuredInfoText}>{featuredEvent.location}</Text>
                </View>
                <View style={styles.featuredFooter}>
                    <TouchableOpacity>
                        <Feather name="share-2" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
          </>
        )}

        {/* Upcoming Events */}
        <Text style={styles.sectionTitle}>Upcoming Events Near You</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingScroll}>
            {upcomingEvents
              .filter(event => activeFilter === 'All' || event.category === activeFilter)
              .map(event => (
                <View key={event.id} style={styles.upcomingCard}>
                    <View style={styles.upcomingImageContainer}>
                        <View style={[styles.upcomingTag, event.category === 'Sports' && {backgroundColor: '#FFA500'}]}>
                            <Text style={styles.upcomingTagText}>{event.category}</Text>
                        </View>
                        {event.image ? (
                          <Image source={{ uri: event.image }} style={{ width: 120, height: 120, borderRadius: 8, marginTop: 5 }} resizeMode="contain" />
                        ) : null}
                    </View>
                    <Text style={styles.upcomingTitle}>{event.title}</Text>
                    <Text style={styles.upcomingDate}>{event.date}</Text>
                    <View style={styles.upcomingInfoRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.upcomingInfoText}>{event.time}</Text>
                    </View>
                    <Text style={styles.upcomingLocation}>{event.location}</Text>
                    <TouchableOpacity style={styles.rsvpButton}>
                        <Text style={styles.rsvpButtonText}>RSVP Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.calendarButton} onPress={() => addToCalendar(event)}>
                        <Text style={styles.calendarButtonText}>Add to Calendar</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
       </ScrollView>
      {/* Floating Action Button for adding event */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 56,
          right: 20,
          backgroundColor: '#007AFF',
          borderRadius: 32,
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }}
        onPress={() => router.push('/upload-event')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 32,
  },
  headerTitle: {
      color: '#fff',
      fontSize: 22,
      fontWeight: 'bold',
  },
  headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginLeft: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
  },
  activeFilter: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  filterText: {
    color: '#fff',
  },
  activeFilterText: {
    color: '#000',
    fontWeight: 'bold',
  },
  sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#fff',
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 15,
  },
  featuredCard: {
      backgroundColor: '#007AFF',
      borderRadius: 20,
      marginHorizontal: 20,
      padding: 15,
  },
  featuredHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 10,
  },
  featuredIconContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      padding: 8,
      borderRadius: 10,
      marginRight: 10,
  },
  featuredTitle: {
      flex: 1,
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
  },
  featuredDetailsButton: {
      backgroundColor: '#fff',
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 20,
  },
  featuredDetailsButtonText: {
      color: '#007AFF',
      fontWeight: 'bold',
  },
  featuredImageContainer: {
      height: 220,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 15,
      marginBottom: 18,
  },
  featuredDescription: {
      color: '#fff',
      fontSize: 14,
      marginBottom: 15,
  },
  featuredInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  featuredInfoText: {
      color: '#fff',
      marginLeft: 10,
  },
  featuredFooter: {
      borderTopWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      paddingTop: 10,
      marginTop: 5,
      alignItems: 'flex-end',
  },
  upcomingScroll: {
      paddingLeft: 20,
  },
  upcomingCard: {
      backgroundColor: '#1E1E1E',
      borderRadius: 15,
      padding: 15,
      width: 250,
      marginRight: 15,
  },
  upcomingImageContainer: {
      height: 120,
      backgroundColor: '#333',
      borderRadius: 10,
      marginBottom: 14,
  },
  upcomingTag: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: '#FFA500',
      borderRadius: 20,
      paddingVertical: 5,
      paddingHorizontal: 10,
  },
  upcomingTagText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 12,
  },
  upcomingTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
  },
  upcomingDate: {
      color: '#888',
      fontSize: 14,
      marginVertical: 5,
  },
  upcomingInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  bullet: {
      color: '#007AFF',
      fontSize: 20,
      marginRight: 5,
  },
  upcomingInfoText: {
      color: '#888',
  },
  upcomingLocation: {
      color: '#888',
      marginVertical: 5,
  },
  rsvpButton: {
      backgroundColor: '#007AFF',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 10,
  },
  rsvpButtonText: {
      color: '#fff',
      fontWeight: 'bold',
  },
  calendarButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#333',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 10,
  },
  calendarButtonText: {
      color: '#fff',
      fontWeight: 'bold',
  }
}); 