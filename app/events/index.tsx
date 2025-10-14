
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/NewThemeContext';

type EventType = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  image: string | null;
}

type EventCardProps = {
  event: EventType;
  isFeatured?: boolean;
  onPress: () => void;
}

interface UserType {
  id?: string;
  display_name?: string;
  profile_picture?: string;
  username?: string;
}

interface AuthContextType {
  user: UserType | null;
  // Add other auth context properties if needed
}

// Remove this line as we're importing useAuth from the context file

// Sample data - in a real app, this would come from an API
const sampleEvents = [
  {
    id: '1',
    title: "Annual Freshers' Welcome Gala",
    description: "Join us for an unforgettable evening of music, dance, and networking as we officially welcome all new students to CampusOS",
    date: "Saturday, October 26",
    time: "6:00 PM - 9:00 PM",
    location: "University Main Auditorium, Lagos Campus",
    category: "Featured",
    image: null
  },
  {
    id: '2',
    title: "Tech Innovation Summit 2024",
    category: "Academic",
    date: "November 15, 2024",
    time: "9:00 AM - 5:00 PM",
    location: "Faculty of Engineering Hall, Abuja Campus",
    description: "Explore the latest in technology and innovation with industry leaders and researchers.",
    image: null
  },
  {
    id: '3',
    title: "Inter-Faculty Football Final",
    category: "Sports",
    date: "December 2, 2024",
    time: "3:00 PM - 6:00 PM",
    location: "University Sports Complex, Enugu Campus",
    description: "Witness the thrilling final match of the inter-faculty football tournament.",
    image: null
  },
  {
    id: '4',
    title: "Campus Talent Show",
    category: "Social",
    date: "November 5, 2024",
    time: "5:00 PM - 8:00 PM",
    location: "Student Center Amphitheater",
    description: "Showcase your talents or enjoy performances by your fellow students.",
    image: null
  }
];

const categories = ['All', 'Featured', 'Academic', 'Social', 'Sports', 'Religious'];

const EventCard = ({ event, isFeatured = false, onPress }: EventCardProps) => {
  const { theme } = useTheme();
  
  const getCategoryColor = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'academic':
        return '#3b82f6'; // blue-500
      case 'sports':
        return '#10b981'; // emerald-500
      case 'social':
        return '#8b5cf6'; // violet-500
      case 'religious':
        return '#ec4899'; // pink-500
      case 'featured':
        return '#f59e0b'; // amber-500
      default:
        return theme.primary;
    }
  };

  if (isFeatured) {
    return (
      <View style={[styles.featuredCard, { backgroundColor: getCategoryColor(event.category) }]}>
        <View style={styles.featuredCardHeader}>
          <Text style={styles.featuredCardTitle} numberOfLines={2}>{event.title}</Text>
          <TouchableOpacity style={styles.detailsButton} onPress={onPress}>
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.featuredImagePlaceholder, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Ionicons name="calendar" size={40} color="#fff" />
        </View>
        <Text style={styles.featuredDescription} numberOfLines={3}>{event.description}</Text>
        <View style={styles.featuredInfoRow}>
          <Text style={styles.featuredInfoText}>📅 {event.date}</Text>
          <Text style={styles.featuredInfoText}>⏰ {event.time}</Text>
        </View>
        <Text style={styles.featuredLocation} numberOfLines={1}>📍 {event.location}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.upcomingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.upcomingBadge, { backgroundColor: getCategoryColor(event.category) }]}>
        <Text style={styles.badgeText}>{event.category}</Text>
      </View>
      <View style={[styles.upcomingImagePlaceholder, { backgroundColor: theme.background }]}>
        <Ionicons name="calendar" size={30} color={theme.primary} />
      </View>
      <Text style={[styles.upcomingTitle, { color: theme.text }]} numberOfLines={2}>
        {event.title}
      </Text>
      <Text style={[styles.upcomingDate, { color: theme.primary }]}>{event.date}</Text>
      <Text style={[styles.upcomingTime, { color: theme.textSecondary }]}>{event.time}</Text>
      <Text style={[styles.upcomingLocation, { color: theme.textSecondary }]} numberOfLines={1}>
        {event.location}
      </Text>
      <View style={styles.upcomingButtonRow}>
        <TouchableOpacity 
          style={[styles.rsvpButton, { backgroundColor: theme.primary }]}
          onPress={onPress}
        >
          <Text style={styles.rsvpButtonText}>RSVP Now</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.calendarButton, { borderColor: theme.primary }]}
          onPress={() => console.log('Add to calendar:', event.title)}
        >
          <Ionicons name="calendar-outline" size={16} color={theme.primary} />
          <Text style={[styles.calendarButtonText, { color: theme.primary }]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function EventsPage() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventType[]>([]);

  // In a real app, you would fetch events from an API
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        setEvents(sampleEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredEvent = events.find(event => event.category === 'Featured');
  const upcomingEvents = filteredEvents.filter(event => event.category !== 'Featured');

  const handleEventPress = (event: EventType) => {
    console.log('Event pressed:', event.title);
    // In a real app, you would navigate to the event details screen
    // router.push(`/events/${event.id}`);
  };
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>CampusOS Events</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
          {user?.profile_picture ? (
            <Image 
              source={{ uri: user.profile_picture }} 
              style={[styles.profileCircle, { borderColor: theme.primary }]} 
            />
          ) : (
            <View style={[styles.profileCircle, { backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {user?.display_name ? user.display_name[0].toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBarWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchBar, { color: theme.text }]}
            placeholder="Search events..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((category) => (
            <TouchableOpacity 
              key={category}
              style={[
                styles.categoryItem,
                selectedCategory === category && styles.categoryItemSelected,
                selectedCategory === category && { backgroundColor: theme.primary }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text 
                style={[
                  styles.categoryText,
                  { color: selectedCategory === category ? '#fff' : theme.textSecondary },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {featuredEvent && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Featured Event</Text>
            <EventCard 
              event={featuredEvent} 
              isFeatured 
              onPress={() => featuredEvent && handleEventPress(featuredEvent)}
            />
          </>
        )}

        {upcomingEvents.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: featuredEvent ? 0 : 8 }]}>
              {selectedCategory === 'All' ? 'Upcoming Events' : selectedCategory + ' Events'}
            </Text>
            <View style={styles.upcomingRow}>
              {upcomingEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  onPress={() => handleEventPress(event)}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons 
              name="calendar-outline" 
              size={60} 
              color={theme.textSecondary} 
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery 
                ? 'No events match your search'
                : `No ${selectedCategory === 'All' ? '' : selectedCategory + ' '}events found`}
            </Text>
            {searchQuery && (
              <TouchableOpacity 
                style={[styles.clearFiltersButton, { borderColor: theme.primary }]}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
              >
                <Text style={[styles.clearFiltersText, { color: theme.primary }]}>
                  Clear filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Add Event FAB */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => router.push('/create-event')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  root: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
  },
  searchBarContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
    marginRight: -8,
  },
  categoryContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryItemSelected: {
    borderColor: 'transparent',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featuredCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  featuredCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  featuredCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  detailsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailsButtonText: {
    fontWeight: '600',
    fontSize: 13,
  },
  featuredImagePlaceholder: {
    borderRadius: 12,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageIcon: {
    width: 40,
    height: 40,
  },
  featuredDescription: {
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  featuredInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  featuredInfoText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  featuredLocation: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  upcomingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  upcomingCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  upcomingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  badgeAcademic: {
    backgroundColor: '#FFD600',
  },
  badgeSports: {
    backgroundColor: '#FF9800',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  upcomingImagePlaceholder: {
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  imageIconSmall: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    opacity: 0.5,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  upcomingDate: {
    fontSize: 14,
    marginBottom: 2,
    fontWeight: '500',
  },
  upcomingTime: {
    fontSize: 13,
    marginBottom: 8,
  },
  upcomingLocation: {
    fontSize: 13,
    marginBottom: 12,
  },
  upcomingButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rsvpButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rsvpButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  calendarButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  calendarButtonText: {
    color: '#1877F2',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 24,
  },
  clearFiltersButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  clearFiltersText: {
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    right: 24,
    bottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
