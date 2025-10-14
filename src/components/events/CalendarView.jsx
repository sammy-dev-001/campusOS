import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import {
  Box,
  Typography,
  Button,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
  useMediaQuery,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Today as TodayIcon,
  ViewDay as ViewDayIcon,
  ViewWeek as ViewWeekIcon,
  ViewMonth as ViewMonthIcon,
  ViewAgenda as ViewAgendaIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import eventService from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';

const CalendarView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser } = useAuth();
  
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewType, setViewType] = useState('dayGridMonth');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const [filters, setFilters] = useState({
    showMyEvents: false,
    showAttending: false,
    showUpcoming: true,
    showPast: false,
    categories: [],
  });
  
  // Available event categories
  const availableCategories = [
    'Academic',
    'Social',
    'Sports',
    'Workshop',
    'Conference',
    'Networking',
    'Entertainment',
    'Other',
  ];

  // Fetch events with current filters
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query params based on filters
      const params = {};
      
      if (filters.showMyEvents && currentUser) {
        params.creator = currentUser.id;
      }
      
      if (filters.showAttending && currentUser) {
        params.attendee = currentUser.id;
      }
      
      if (filters.showUpcoming && !filters.showPast) {
        params.status = 'upcoming';
      } else if (!filters.showUpcoming && filters.showPast) {
        params.status = 'past';
      }
      
      if (filters.categories.length > 0) {
        params.categories = filters.categories.join(',');
      }
      
      const response = await eventService.getEvents(params);
      
      // Format events for FullCalendar
      const formattedEvents = response.data.map(event => ({
        id: event._id,
        title: event.title,
        start: event.startDate,
        end: event.endDate || event.startDate,
        allDay: !event.endDate || new Date(event.endDate).getHours() === 0,
        extendedProps: {
          description: event.description,
          location: event.location,
          category: event.category,
          isFeatured: event.isFeatured,
          attendees: event.attendees || [],
          createdBy: event.createdBy,
          imageUrl: event.imageUrl,
        },
        backgroundColor: getEventColor(event.category),
        borderColor: getEventColor(event.category),
        textColor: '#ffffff',
      }));
      
      setEvents(formattedEvents);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again later.');
      enqueueSnackbar('Failed to load events', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters, currentUser, enqueueSnackbar]);

  // Get color based on event category
  const getEventColor = (category) => {
    switch (category) {
      case 'Academic':
        return theme.palette.primary.main;
      case 'Social':
        return '#4caf50'; // Green
      case 'Sports':
        return '#f44336'; // Red
      case 'Workshop':
        return '#ff9800'; // Orange
      case 'Conference':
        return '#9c27b0'; // Purple
      case 'Networking':
        return '#2196f3'; // Blue
      case 'Entertainment':
        return '#e91e63'; // Pink
      default:
        return '#607d8b'; // Blue Grey
    }
  };

  // Handle date navigation
  const handleToday = () => {
    const calendarApi = calendarRef.current.getApi();
    calendarApi.today();
  };

  // Handle view change
  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setViewType(newView);
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(newView);
    }
  };

  // Handle event click
  const handleEventClick = (clickInfo) => {
    navigate(`/events/${clickInfo.event.id}`);
  };

  // Handle date click
  const handleDateClick = (arg) => {
    navigate(`/events/create?date=${arg.dateStr}`);
  };

  // Handle filter menu
  const handleFilterMenuOpen = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterAnchorEl(null);
  };

  // Handle more options menu
  const handleMoreMenuOpen = (event) => {
    setMoreAnchorEl(event.currentTarget);
  };

  const handleMoreMenuClose = () => {
    setMoreAnchorEl(null);
  };

  // Toggle filter
  const toggleFilter = (filterName) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  // Toggle category filter
  const toggleCategory = (category) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      showMyEvents: false,
      showAttending: false,
      showUpcoming: true,
      showPast: false,
      categories: [],
    });
    setFilterAnchorEl(null);
  };

  // Refresh events
  const refreshEvents = () => {
    fetchEvents();
  };

  // Export calendar
  const exportCalendar = () => {
    const calendarApi = calendarRef.current.getApi();
    const view = calendarApi.view;
    const title = document.title.replace(/[^\w\s]/gi, '');
    const dates = `${format(view.activeStart, 'yyyy-MM-dd')}_to_${format(view.activeEnd, 'yyyy-MM-dd')}`;
    const filename = `${title}_${view.type}_${dates}.ics`;
    
    // In a real implementation, you would generate an iCal file here
    // For now, we'll just show a success message
    enqueueSnackbar('Export feature coming soon!', { variant: 'info' });
    handleMoreMenuClose();
  };

  // Print calendar
  const printCalendar = () => {
    window.print();
    handleMoreMenuClose();
  };

  // Initial data fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Update document title based on view
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const view = calendarApi.view;
      
      const updateTitle = () => {
        const title = 'Campus Events';
        document.title = `${title} | ${view.title}`;
      };
      
      updateTitle();
      
      // Update title when view changes
      calendarApi.on('datesSet', updateTitle);
      
      return () => {
        calendarApi.off('datesSet', updateTitle);
      };
    }
  }, [viewType]);

  // Handle navigation from URL
  useEffect(() => {
    if (location.search.includes('view=')) {
      const params = new URLSearchParams(location.search);
      const viewParam = params.get('view');
      
      if (['dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listMonth'].includes(viewParam)) {
        setViewType(viewParam);
      }
    }
  }, [location.search]);

  // Render event content
  const renderEventContent = (eventInfo) => {
    const event = eventInfo.event;
    const isPastEvent = event.end && new Date(event.end) < new Date();
    
    return (
      <Box
        sx={{
          padding: '2px 4px',
          borderRadius: '4px',
          fontSize: '0.85em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          backgroundColor: event.backgroundColor,
          color: event.textColor,
          borderLeft: `3px solid ${event.borderColor}`,
          opacity: isPastEvent ? 0.7 : 1,
        }}
      >
        <Box display="flex" alignItems="center">
          {event.extendedProps.isFeatured && (
            <StarIcon fontSize="small" sx={{ mr: 0.5, fontSize: '1em' }} />
          )}
          <Box component="span" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {event.title}
          </Box>
        </Box>
        {!event.allDay && (
          <Box component="span" sx={{ fontSize: '0.8em', opacity: 0.9, display: 'block' }}>
            {format(event.start, 'h:mma')}
            {event.end && ` - ${format(event.end, event.end.getDate() !== event.start.getDate() ? 'MMM d, h:mma' : 'h:mma')}`}
          </Box>
        )}
      </Box>
    );
  };

  // Custom buttons for the calendar
  const calendarButtons = {
    today: {
      text: 'Today',
      click: handleToday,
    },
  };

  // Header toolbar
  const headerToolbar = {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchEvents}
          startIcon={<RefreshIcon />}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Calendar Header */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        flexWrap="wrap" 
        gap={2}
        mb={2}
      >
        <Typography variant="h5" component="h1">
          Event Calendar
        </Typography>
        
        <Box display="flex" gap={1} flexWrap="wrap">
          {/* View Toggle Buttons */}
          <ToggleButtonGroup
            value={viewType}
            exclusive
            onChange={handleViewChange}
            aria-label="calendar view"
            size="small"
            sx={{
              '& .MuiToggleButtonGroup-grouped': {
                '&:not(:first-of-type)': {
                  borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
                },
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                },
              },
            }}
          >
            <ToggleButton value="dayGridMonth" aria-label="month view">
              <Tooltip title="Month">
                <ViewMonthIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="timeGridWeek" aria-label="week view">
              <Tooltip title="Week">
                <ViewWeekIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="timeGridDay" aria-label="day view">
              <Tooltip title="Day">
                <ViewDayIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="listMonth" aria-label="list view">
              <Tooltip title="List">
                <ViewAgendaIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<TodayIcon />}
            onClick={handleToday}
            size="small"
          >
            Today
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={handleFilterMenuOpen}
            size="small"
            aria-controls="filter-menu"
            aria-haspopup="true"
          >
            Filters
            {Object.values(filters).some(Boolean) && (
              <Chip 
                label="!" 
                size="small" 
                color="primary" 
                sx={{ 
                  ml: 1, 
                  height: 16, 
                  minWidth: 16, 
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                }} 
              />
            )}
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/events/create')}
            size="small"
            sx={{ whiteSpace: 'nowrap' }}
          >
            {isMobile ? 'Add' : 'New Event'}
          </Button>
          
          <IconButton
            onClick={handleMoreMenuOpen}
            size="small"
            aria-label="more options"
          >
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Filter Menu */}
      <Menu
        id="filter-menu"
        anchorEl={filterAnchorEl}
        keepMounted
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterMenuClose}
        PaperProps={{
          sx: {
            width: 300,
            maxWidth: '100%',
            p: 1,
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 'bold' }}>
          Filter Events
        </Typography>
        
        <Divider sx={{ my: 1 }} />
        
        <MenuItem onClick={() => toggleFilter('showMyEvents')}>
          <ListItemIcon>
            <CheckCircleIcon 
              color={filters.showMyEvents ? 'primary' : 'disabled'} 
              fontSize="small" 
            />
          </ListItemIcon>
          <ListItemText primary="My Events" />
        </MenuItem>
        
        <MenuItem onClick={() => toggleFilter('showAttending')}>
          <ListItemIcon>
            <CheckCircleIcon 
              color={filters.showAttending ? 'primary' : 'disabled'} 
              fontSize="small" 
            />
          </ListItemIcon>
          <ListItemText primary="Events I'm Attending" />
        </MenuItem>
        
        <Divider sx={{ my: 1 }} />
        
        <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 'bold' }}>
          Time Period
        </Typography>
        
        <MenuItem onClick={() => toggleFilter('showUpcoming')}>
          <ListItemIcon>
            <CheckCircleIcon 
              color={filters.showUpcoming ? 'primary' : 'disabled'} 
              fontSize="small" 
            />
          </ListItemIcon>
          <ListItemText primary="Upcoming Events" />
        </MenuItem>
        
        <MenuItem onClick={() => toggleFilter('showPast')}>
          <ListItemIcon>
            <CheckCircleIcon 
              color={filters.showPast ? 'primary' : 'disabled'} 
              fontSize="small" 
            />
          </ListItemIcon>
          <ListItemText primary="Past Events" />
        </MenuItem>
        
        <Divider sx={{ my: 1 }} />
        
        <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 'bold' }}>
          Categories
        </Typography>
        
        <Box sx={{ maxHeight: 200, overflowY: 'auto', px: 1 }}>
          {availableCategories.map((category) => (
            <MenuItem 
              key={category} 
              onClick={() => toggleCategory(category)}
              dense
            >
              <ListItemIcon>
                <CheckCircleIcon 
                  color={filters.categories.includes(category) ? 'primary' : 'disabled'} 
                  fontSize="small" 
                />
              </ListItemIcon>
              <ListItemText primary={category} />
              <Box 
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: getEventColor(category),
                  ml: 1,
                }} 
              />
            </MenuItem>
          ))}
        </Box>
        
        <Divider sx={{ my: 1 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
          <Button 
            size="small" 
            onClick={clearFilters}
            disabled={!Object.values(filters).some(Boolean)}
          >
            Clear All
          </Button>
          <Button 
            variant="contained" 
            size="small" 
            color="primary"
            onClick={() => {
              fetchEvents();
              handleFilterMenuClose();
            }}
          >
            Apply
          </Button>
        </Box>
      </Menu>
      
      {/* More Options Menu */}
      <Menu
        anchorEl={moreAnchorEl}
        keepMounted
        open={Boolean(moreAnchorEl)}
        onClose={handleMoreMenuClose}
      >
        <MenuItem onClick={refreshEvents}>
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Refresh" />
        </MenuItem>
        
        <MenuItem onClick={exportCalendar}>
          <ListItemIcon>
            <EventIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export Calendar" />
        </MenuItem>
        
        <MenuItem onClick={printCalendar}>
          <ListItemIcon>
            <EventIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Print" />
        </MenuItem>
      </Menu>
      
      {/* Calendar Component */}
      <Paper 
        elevation={2} 
        sx={{
          p: { xs: 0.5, sm: 1, md: 2 },
          borderRadius: 2,
          overflow: 'hidden',
          '& .fc': {
            '--fc-border-color': theme.palette.divider,
            '--fc-page-bg-color': theme.palette.background.paper,
            '--fc-now-indicator-color': theme.palette.error.main,
            '--fc-today-bg-color': theme.palette.action.hover,
            '--fc-now-indicator-border-color': theme.palette.error.main,
            '--fc-list-event-hover-bg-color': theme.palette.action.hover,
            '--fc-neutral-bg-color': theme.palette.background.default,
            '--fc-neutral-text-color': theme.palette.text.secondary,
            '--fc-button-text-color': theme.palette.text.primary,
            '--fc-button-bg-color': 'transparent',
            '--fc-button-border-color': theme.palette.divider,
            '--fc-button-hover-bg-color': theme.palette.action.hover,
            '--fc-button-hover-border-color': theme.palette.divider,
            '--fc-button-active-bg-color': theme.palette.action.selected,
            '--fc-button-active-border-color': theme.palette.divider,
            '--fc-event-bg-color': theme.palette.primary.main,
            '--fc-event-border-color': theme.palette.primary.dark,
            '--fc-event-text-color': theme.palette.primary.contrastText,
            '--fc-event-selected-overlay-color': 'rgba(0, 0, 0, 0.1)',
            '--fc-more-link-bg-color': theme.palette.background.paper,
            '--fc-more-link-text-color': theme.palette.text.primary,
            '--fc-list-event-dot-width': '8px',
            fontFamily: theme.typography.fontFamily,
            '& .fc-toolbar': {
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 1,
              '& > *': {
                margin: '0 !important',
              },
              '& .fc-toolbar-title': {
                fontSize: isMobile ? '1.2rem' : '1.5rem',
                fontWeight: 500,
                margin: isMobile ? '8px 0' : '0',
              },
            },
            '& .fc-button': {
              textTransform: 'none',
              boxShadow: 'none',
              padding: '6px 12px',
              '&:active, &:focus': {
                boxShadow: 'none',
              },
            },
            '& .fc-button-primary:not(:disabled).fc-button-active, & .fc-button-primary:not(:disabled):active': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              borderColor: theme.palette.primary.dark,
            },
            '& .fc-day-today': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
            '& .fc-event': {
              border: 'none',
              borderRadius: '4px',
              padding: '2px 4px',
              fontSize: '0.85em',
              '& .fc-event-title': {
                fontWeight: 500,
              },
            },
            '& .fc-list': {
              border: 'none',
              '& .fc-list-day-cushion': {
                backgroundColor: theme.palette.grey[100],
                color: theme.palette.text.primary,
                padding: '8px 16px',
              },
              '& .fc-list-event': {
                '&:hover td': {
                  backgroundColor: theme.palette.action.hover,
                },
                '&.fc-event-past': {
                  opacity: 0.7,
                },
              },
              '& .fc-list-event-time, & .fc-list-event-title': {
                padding: '8px 16px',
              },
            },
            '& .fc-daygrid-day-number': {
              padding: '4px',
              color: theme.palette.text.primary,
            },
            '& .fc-col-header-cell-cushion': {
              color: theme.palette.text.primary,
              textDecoration: 'none',
              padding: '8px 4px',
            },
            '& .fc-timegrid-slot': {
              height: '40px',
            },
            '& .fc-timegrid-now-indicator-arrow': {
              borderTopColor: theme.palette.error.main,
            },
            '& .fc-timegrid-now-indicator-line': {
              borderColor: theme.palette.error.main,
            },
          },
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={viewType}
          headerToolbar={headerToolbar}
          customButtons={calendarButtons}
          events={events}
          eventContent={renderEventContent}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          nowIndicator={true}
          navLinks={true}
          dayMaxEvents={3}
          height="auto"
          firstDay={1} // Start week on Monday
          weekNumbers={true}
          weekNumberFormat={{ week: 'numeric' }}
          dayHeaderFormat={{ weekday: 'short' }}
          dayMaxEventRows={3}
          views={{
            dayGridMonth: {
              dayMaxEventRows: 4,
              titleFormat: { year: 'numeric', month: 'long' },
            },
            timeGridWeek: {
              titleFormat: { year: 'numeric', month: 'short', day: 'numeric' },
              dayHeaderFormat: { weekday: 'short', day: 'numeric', omitCommas: true },
              slotLabelFormat: { hour: 'numeric', minute: '2-digit', omitZeroMinute: true, hour12: true },
            },
            timeGridDay: {
              titleFormat: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
              dayHeaderFormat: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', omitCommas: true },
              slotLabelFormat: { hour: 'numeric', minute: '2-digit', omitZeroMinute: true, hour12: true },
            },
            listMonth: {
              titleFormat: { year: 'numeric', month: 'long' },
              listDayFormat: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', omitCommas: true },
              listDaySideFormat: false,
            },
          }}
          eventDisplay="block"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
            hour12: true,
          }}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={true}
          weekText="Wk"
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            list: 'List',
          }}
          titleFormat={{
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }}
          moreLinkText={moreEventsCount => `+${moreEventsCount} more`}
          noEventsText="No events to display"
          // Handle view changes to update URL
          datesSet={(arg) => {
            const view = arg.view;
            const params = new URLSearchParams(location.search);
            params.set('view', view.type);
            
            // Update URL without causing a full page reload
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({}, '', newUrl);
          }}
        />
      </Paper>
      
      {/* Legend */}
      <Box mt={2} display="flex" flexWrap="wrap" gap={1} justifyContent="center">
        {availableCategories.map((category) => (
          <Box key={category} display="flex" alignItems="center" mr={2}>
            <Box 
              sx={{
                width: 12,
                height: 12,
                borderRadius: '2px',
                backgroundColor: getEventColor(category),
                mr: 1,
              }}
            />
            <Typography variant="caption">{category}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default CalendarView;
