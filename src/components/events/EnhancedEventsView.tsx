import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, FAB, useTheme as usePaperTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { 
  Event, 
  EventListProps, 
  CalendarViewProps,
  EventSearchProps,
  EventCategoriesTagsProps 
} from './types';

type RootStackParamList = {
  EventDetail: { eventId: string };
  CreateEvent: undefined;
};

type DateRange = {
  startDate: Date | null;
  endDate: Date | null;
};

// Components
import CalendarView from './CalendarView';
import EventCategoriesTags from './EventCategoriesTags';
import EventList from './EventList';
import EventSearch from './EventSearch';

// Type assertions for components
const TypedEventList = EventList as React.FC<EventListProps>;
const TypedCalendarView = CalendarView as React.FC<CalendarViewProps>;
const TypedEventSearch = EventSearch as React.FC<EventSearchProps>;
const TypedEventCategoriesTags = EventCategoriesTags as React.FC<EventCategoriesTagsProps>;

// Services
import eventService from '../../services/eventService';

interface EnhancedEventsViewProps {
  onEventPress?: (event: Event) => void;
}

const EnhancedEventsView: React.FC<EnhancedEventsViewProps> = ({ onEventPress }) => {
  const theme = usePaperTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  
  // State
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      const eventsData = await eventService.getEvents({
        search: searchQuery,
        categories: selectedCategories,
        tags: selectedTags,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setEvents(eventsData);
      setFilteredEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedCategories, selectedTags, dateRange]);

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  // Handle search
  const handleSearch = (values: { query: string }) => {
    setSearchQuery(values.query);
  };

  // Handle category change
  const handleCategoriesChange = (categories: any[]) => {
    setSelectedCategories(categories);
  };

  // Handle tags change
  const handleTagsChange = (tags: any[]) => {
    setSelectedTags(tags);
  };

  // Handle date range change
  const handleDateRangeChange = (startDate: Date | null, endDate: Date | null) => {
    setDateRange({ startDate, endDate });
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(prevMode => prevMode === 'list' ? 'calendar' : 'list');
  };

  // Handle event press
  const handleEventPress = (event: any) => {
    if (onEventPress) {
      onEventPress(event);
    } else {
      // Default navigation if no handler provided
      navigation.navigate('EventDetail', { eventId: event.id });
    }
  };

  // Render content based on view mode
  const renderContent = () => {
    if (loading && !refreshing) {
      return <ActivityIndicator style={styles.loading} />;
    }

    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.contentContainer}
      >
        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <TypedEventSearch 
            onSearch={handleSearch}
            sx={styles.searchBar}
            initialValues={{ query: searchQuery }}
          />
          
          <TypedEventCategoriesTags
            categories={selectedCategories}
            tags={selectedTags}
            onCategoriesChange={handleCategoriesChange}
            onTagsChange={handleTagsChange}
            sx={styles.categoriesTags}
          />
        </View>

        {/* Events List or Calendar View */}
        {viewMode === 'list' ? (
          <TypedEventList 
            events={filteredEvents} 
            onEventPress={handleEventPress} 
            emptyMessage="No events found. Try adjusting your filters."
            sx={{ flex: 1 }}
          />
        ) : (
          <TypedCalendarView 
            events={filteredEvents}
            onEventPress={handleEventPress}
            onDateRangeChange={handleDateRangeChange}
            sx={styles.calendarView}
          />
        )}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Appbar.Header theme={theme}>
        <Appbar.Content title="Events" />
        <Appbar.Action 
          icon={viewMode === 'list' ? 'calendar-month' : 'format-list-bulleted'} 
          onPress={toggleViewMode} 
        />
      </Appbar.Header>

      {/* Main Content */}
      {renderContent()}

      {/* FAB for adding new events */}
      <FAB
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        icon="plus"
        onPress={() => navigation.navigate('CreateEvent')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 2,
  },
  categoriesTags: {
    marginBottom: 2,
  },
  calendarView: {
    flex: 1,
    minHeight: 500 // Adjust as needed
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#6200ee',
  },
});

export default EnhancedEventsView;
