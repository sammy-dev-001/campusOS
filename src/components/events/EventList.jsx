import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Grid,
  Chip,
  Avatar,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  CalendarMonth,
  LocationOn,
  People,
  MoreVert,
  Edit,
  Delete,
  Share,
  Add,
  FilterList,
  Search,
  Event,
  EventAvailable,
  EventBusy,
  Star,
  StarBorder,
} from '@mui/icons-material';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import eventService from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState('upcoming');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        let data;
        
        if (tabValue === 'my-events') {
          const response = await eventService.getMyEvents();
          data = response.data || [];
        } else if (tabValue === 'attending') {
          const response = await eventService.getAttendingEvents();
          data = response.data || [];
        } else {
          const response = await eventService.getEvents({
            status: tabValue === 'past' ? 'past' : 'upcoming',
          });
          data = response.data || [];
        }
        
        setEvents(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMenuOpen = (event, eventItem) => {
    setAnchorEl(event.currentTarget);
    setSelectedEvent(eventItem);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEvent(null);
  };

  const handleEditEvent = () => {
    if (selectedEvent) {
      navigate(`/events/edit/${selectedEvent._id}`);
      handleMenuClose();
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      await eventService.deleteEvent(selectedEvent._id);
      setEvents(events.filter(event => event._id !== selectedEvent._id));
      handleMenuClose();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event. Please try again.');
    }
  };

  const handleRSVP = async (eventId, status) => {
    try {
      await eventService.updateAttendance(eventId, status);
      // Refresh events after RSVP update
      const response = await eventService.getEvents();
      setEvents(response.data || []);
    } catch (err) {
      console.error('Error updating RSVP:', err);
      setError('Failed to update RSVP. Please try again.');
    }
  };

  const getEventStatus = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    const now = new Date();

    if (isPast(start)) {
      return 'Past';
    }
    
    if (isToday(start) || (end && isToday(end))) {
      return 'Happening Today';
    }
    
    return 'Upcoming';
  };

  const getRsvpStatus = (event) => {
    if (!currentUser) return null;
    
    const attendee = event.attendees?.find(
      attendee => attendee.user._id === currentUser.id
    );
    
    return attendee?.status || null;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="error">{error}</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="h4" component="h1">
          {tabValue === 'my-events' ? 'My Events' : 
           tabValue === 'attending' ? 'Attending' : 
           tabValue === 'past' ? 'Past Events' : 'Upcoming Events'}
        </Typography>
        
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            component={Link}
            to="/events/create"
          >
            Create Event
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => {}}
          >
            Filters
          </Button>
        </Box>
      </Box>
      
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab 
          value="upcoming" 
          label="Upcoming" 
          icon={<EventAvailable />} 
          iconPosition="start" 
        />
        <Tab 
          value="my-events" 
          label="My Events" 
          icon={<Event />} 
          iconPosition="start" 
        />
        <Tab 
          value="attending" 
          label="Attending" 
          icon={<People />} 
          iconPosition="start" 
        />
        <Tab 
          value="past" 
          label="Past Events" 
          icon={<EventBusy />} 
          iconPosition="start" 
        />
      </Tabs>
      
      {events.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No events found
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            {tabValue === 'my-events' 
              ? 'You haven\'t created any events yet.' 
              : tabValue === 'attending'
                ? 'You\'re not attending any events yet.'
                : 'There are no events to display.'}
          </Typography>
          {tabValue !== 'my-events' && tabValue !== 'attending' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              component={Link}
              to="/events/create"
              sx={{ mt: 2 }}
            >
              Create an Event
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {events.map((event) => (
            <Grid item xs={12} md={6} lg={4} key={event._id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                  },
                }}
              >
                {event.imageUrl && (
                  <CardMedia
                    component="img"
                    height="160"
                    image={event.imageUrl}
                    alt={event.title}
                  />
                )}
                
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="h2" noWrap>
                      {event.title}
                    </Typography>
                    
                    <Box>
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleMenuOpen(e, event)}
                        aria-label="event actions"
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box mb={1.5}>
                    <Chip 
                      label={getEventStatus(event.startDate, event.endDate)}
                      size="small"
                      color={
                        getEventStatus(event.startDate, event.endDate) === 'Upcoming' 
                          ? 'primary' 
                          : getEventStatus(event.startDate, event.endDate) === 'Happening Today'
                            ? 'secondary'
                            : 'default'
                      }
                      sx={{ mb: 1 }}
                    />
                    {event.isFeatured && (
                      <Chip 
                        label="Featured" 
                        size="small" 
                        color="secondary" 
                        icon={<Star fontSize="small" />}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                  
                  <Box display="flex" alignItems="center" mb={1}>
                    <CalendarMonth fontSize="small" color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(event.startDate), 'PPpp')}
                      {event.endDate && ` - ${format(new Date(event.endDate), 'PPpp')}`}
                    </Typography>
                  </Box>
                  
                  {event.location && (
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <LocationOn fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {event.location}
                      </Typography>
                    </Box>
                  )}
                  
                  {event.description && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        mb: 1.5,
                      }}
                    >
                      {event.description}
                    </Typography>
                  )}
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt="auto">
                    <Box display="flex" alignItems="center">
                      <People fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {event.attendees?.length || 0} {event.attendees?.length === 1 ? 'attendee' : 'attendees'}
                      </Typography>
                    </Box>
                    
                    {event.createdBy && (
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                          Host:
                        </Typography>
                        <Box display="flex" alignItems="center">
                          <Avatar 
                            src={event.createdBy.profilePicture} 
                            alt={event.createdBy.displayName || event.createdBy.username}
                            sx={{ width: 24, height: 24, mr: 0.5 }}
                          />
                          <Typography variant="body2" noWrap>
                            {event.createdBy.displayName || event.createdBy.username}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </CardContent>
                
                <Divider />
                
                <CardActions sx={{ p: 1.5, justifyContent: 'space-between' }}>
                  <Button 
                    size="small" 
                    component={Link} 
                    to={`/events/${event._id}`}
                    sx={{ textTransform: 'none' }}
                  >
                    View Details
                  </Button>
                  
                  {getEventStatus(event.startDate, event.endDate) !== 'Past' && (
                    <Box>
                      <Button
                        size="small"
                        color={getRsvpStatus(event) === 'going' ? 'primary' : 'inherit'}
                        variant={getRsvpStatus(event) === 'going' ? 'contained' : 'outlined'}
                        onClick={() => handleRSVP(event._id, 'going')}
                        sx={{ 
                          minWidth: 'auto',
                          mr: 1,
                          '&.MuiButton-contained': {
                            boxShadow: 'none',
                          },
                        }}
                      >
                        Going
                      </Button>
                      
                      <Button
                        size="small"
                        color={getRsvpStatus(event) === 'interested' ? 'secondary' : 'inherit'}
                        variant={getRsvpStatus(event) === 'interested' ? 'contained' : 'outlined'}
                        onClick={() => handleRSVP(event._id, 'interested')}
                        sx={{ 
                          minWidth: 'auto',
                          '&.MuiButton-contained': {
                            boxShadow: 'none',
                          },
                        }}
                      >
                        Interested
                      </Button>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Event Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEditEvent}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Event</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDeleteEvent}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ color: 'error' }}>Delete Event</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Share fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share Event</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default EventList;
