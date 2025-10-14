import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  Chip,
  Avatar,
  Grid,
  Paper,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Collapse,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import {
  CalendarMonth,
  LocationOn,
  People,
  Person,
  Share,
  Bookmark,
  BookmarkBorder,
  Edit,
  Delete,
  MoreVert,
  Close,
  CheckCircle,
  Warning,
  Info,
  PersonAdd,
  PersonRemove,
  Message,
  Email,
  Share as ShareIcon,
  Link as LinkIcon,
  Facebook,
  Twitter,
  LinkedIn,
  WhatsApp,
  CopyAll,
} from '@mui/icons-material';
import { format, formatDistanceToNow, isPast, isToday, parseISO } from 'date-fns';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FacebookShareButton, TwitterShareButton, LinkedinShareButton, WhatsappShareButton } from 'react-share';
import eventService from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from 'notistack';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState('details');
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [shareAnchorEl, setShareAnchorEl] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const isOwner = currentUser && event?.createdBy?._id === currentUser.id;
  const isAttending = currentUser && event?.attendees?.some(
    attendee => attendee.user._id === currentUser.id && attendee.status === 'going'
  );
  const isInterested = currentUser && event?.attendees?.some(
    attendee => attendee.user._id === currentUser.id && attendee.status === 'interested'
  );
  const eventUrl = `${window.location.origin}/events/${id}`;

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await eventService.getEvent(id);
        setEvent(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event. Please try again later.');
        enqueueSnackbar('Failed to load event', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, enqueueSnackbar]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle RSVP action
  const handleRSVP = async (status) => {
    if (!currentUser) {
      enqueueSnackbar('Please log in to RSVP to events', { variant: 'info' });
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    try {
      setIsSubmitting(true);
      await eventService.updateAttendance(id, status);
      
      // Refresh event data
      const response = await eventService.getEvent(id);
      setEvent(response.data);
      
      enqueueSnackbar(
        status === 'going' 
          ? 'You are now attending this event!' 
          : status === 'interested' 
            ? 'You are interested in this event!'
            : 'You are no longer attending this event.',
        { variant: 'success' }
      );
    } catch (err) {
      console.error('Error updating RSVP:', err);
      enqueueSnackbar(
        err.response?.data?.message || 'Failed to update RSVP. Please try again.',
        { variant: 'error' }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete event
  const handleDeleteEvent = async () => {
    try {
      setIsDeleting(true);
      await eventService.deleteEvent(id);
      enqueueSnackbar('Event deleted successfully', { variant: 'success' });
      navigate('/events');
    } catch (err) {
      console.error('Error deleting event:', err);
      enqueueSnackbar(
        err.response?.data?.message || 'Failed to delete event. Please try again.',
        { variant: 'error' }
      );
    } finally {
      setIsDeleting(false);
      setOpenDeleteDialog(false);
    }
  };

  // Handle menu actions
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditEvent = () => {
    navigate(`/events/edit/${id}`);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
    handleMenuClose();
  };

  // Handle share menu
  const handleShareMenuOpen = (event) => {
    setShareAnchorEl(event.currentTarget);
  };

  const handleShareMenuClose = () => {
    setShareAnchorEl(null);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    handleShareMenuClose();
    
    setTimeout(() => {
      setCopied(false);
    }, 3000);
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
  if (error || !event) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="error" gutterBottom>{error || 'Event not found'}</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.reload()}
          startIcon={<Refresh />}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // Format event date and time
  const formattedStartDate = format(new Date(event.startDate), 'EEEE, MMMM d, yyyy');
  const formattedStartTime = format(new Date(event.startDate), 'h:mm a');
  const formattedEndTime = event.endDate ? format(new Date(event.endDate), 'h:mm a') : null;
  const isEventPast = isPast(new Date(event.endDate || event.startDate));
  const isEventToday = isToday(new Date(event.startDate));
  
  // Filter attendees by status
  const goingAttendees = event.attendees?.filter(a => a.status === 'going') || [];
  const interestedAttendees = event.attendees?.filter(a => a.status === 'interested') || [];

  return (
    <Box>
      {/* Event Header */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {event.title}
            </Typography>
            
            <Box display="flex" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
              <Chip 
                label={isEventPast ? 'Past Event' : isEventToday ? 'Happening Today' : 'Upcoming'}
                color={isEventPast ? 'default' : isEventToday ? 'secondary' : 'primary'}
                size="small"
              />
              
              {event.isFeatured && (
                <Chip 
                  label="Featured" 
                  color="secondary" 
                  size="small"
                  icon={<Star fontSize="small" />}
                />
              )}
              
              {!event.isPublic && (
                <Chip 
                  label="Private" 
                  size="small"
                  variant="outlined"
                />
              )}
              
              {event.capacity && (
                <Chip 
                  label={`${goingAttendees.length}/${event.capacity} attending`}
                  size="small"
                  variant="outlined"
                  color={goingAttendees.length >= event.capacity ? 'error' : 'default'}
                />
              )}
            </Box>
          </Box>
          
          <Box display="flex" gap={1}>
            {isOwner ? (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Edit />}
                  onClick={handleEditEvent}
                >
                  Edit
                </Button>
                
                <IconButton onClick={handleMenuOpen}>
                  <MoreVert />
                </IconButton>
                
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={handleEditEvent}>
                    <ListItemIcon>
                      <Edit fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit Event</ListItemText>
                  </MenuItem>
                  
                  <MenuItem onClick={handleDeleteClick}>
                    <ListItemIcon>
                      <Delete fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ color: 'error' }}>
                      Delete Event
                    </ListItemText>
                  </MenuItem>
                  
                  <Divider />
                  
                  <MenuItem onClick={handleShareMenuOpen}>
                    <ListItemIcon>
                      <ShareIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Share Event</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  variant={isAttending ? 'outlined' : 'contained'}
                  color={isAttending ? 'secondary' : 'primary'}
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : isAttending ? (
                      <CheckCircle />
                    ) : (
                      <PersonAdd />
                    )
                  }
                  onClick={() => handleRSVP(isAttending ? 'not_going' : 'going')}
                  disabled={isSubmitting || (event.capacity && goingAttendees.length >= event.capacity && !isAttending)}
                  sx={{ minWidth: 140 }}
                >
                  {isAttending ? 'Going' : 'Join Event'}
                </Button>
                
                <Button
                  variant={isInterested ? 'outlined' : 'text'}
                  color="primary"
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : isInterested ? (
                      <Bookmark />
                    ) : (
                      <BookmarkBorder />
                    )
                  }
                  onClick={() => handleRSVP(isInterested ? 'not_going' : 'interested')}
                  disabled={isSubmitting}
                >
                  {isInterested ? 'Interested' : 'Interested?'}
                </Button>
                
                <IconButton onClick={handleShareMenuOpen}>
                  <Share />
                </IconButton>
              </>
            )}
            
            {/* Share Menu */}
            <Menu
              anchorEl={shareAnchorEl}
              open={Boolean(shareAnchorEl)}
              onClose={handleShareMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={handleCopyLink}>
                <ListItemIcon>
                  <LinkIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Copy Link</ListItemText>
              </MenuItem>
              
              <MenuItem component={FacebookShareButton} url={eventUrl} quote={event.title}>
                <ListItemIcon>
                  <Facebook fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText>Share on Facebook</ListItemText>
              </MenuItem>
              
              <MenuItem component={TwitterShareButton} url={eventUrl} title={event.title}>
                <ListItemIcon>
                  <Twitter fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText>Share on Twitter</ListItemText>
              </MenuItem>
              
              <MenuItem component={LinkedinShareButton} url={eventUrl} title={event.title}>
                <ListItemIcon>
                  <LinkedIn fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText>Share on LinkedIn</ListItemText>
              </MenuItem>
              
              <MenuItem component={WhatsappShareButton} url={eventUrl} title={event.title}>
                <ListItemIcon>
                  <WhatsApp fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText>Share on WhatsApp</ListItemText>
              </MenuItem>
              
              <MenuItem onClick={() => {
                window.open(`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(`Check out this event: ${eventUrl}`)}`);
                handleShareMenuClose();
              }}>
                <ListItemIcon>
                  <Email fontSize="small" />
                </ListItemIcon>
                <ListItemText>Share via Email</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
        
        <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
          <Box display="flex" alignItems="center">
            <CalendarMonth color="action" sx={{ mr: 1 }} />
            <Typography variant="body1">
              <strong>{formattedStartDate}</strong>
              {formattedEndTime ? ` • ${formattedStartTime} - ${formattedEndTime}` : ` • ${formattedStartTime}`}
            </Typography>
          </Box>
          
          {event.location && (
            <Box display="flex" alignItems="center">
              <LocationOn color="action" sx={{ mr: 1 }} />
              <Typography variant="body1">
                <strong>Location:</strong> {event.location}
              </Typography>
            </Box>
          )}
          
          <Box display="flex" alignItems="center">
            <People color="action" sx={{ mr: 1 }} />
            <Typography variant="body1">
              <strong>{event.attendees?.length || 0}</strong> {event.attendees?.length === 1 ? 'person' : 'people'} {event.attendees?.length > 0 ? 'attending' : ''}
            </Typography>
          </Box>
        </Box>
        
        {event.imageUrl && (
          <Box 
            sx={{
              height: 400,
              borderRadius: 2,
              overflow: 'hidden',
              mb: 3,
              boxShadow: 3,
            }}
          >
            <img 
              src={event.imageUrl} 
              alt={event.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
        )}
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 3 }}
            >
              <Tab label="Details" value="details" />
              <Tab 
                label={
                  <Badge 
                    badgeContent={goingAttendees.length} 
                    color="primary"
                    sx={{ '& .MuiBadge-badge': { right: -10 } }}
                  >
                    <Box component="span" sx={{ px: 1 }}>Attendees</Box>
                  </Badge>
                } 
                value="attendees" 
              />
              <Tab label="Discussion" value="discussion" />
            </Tabs>
            
            <Divider sx={{ mb: 3 }} />
            
            {tabValue === 'details' && (
              <Box>
                <Typography variant="h6" gutterBottom>About This Event</Typography>
                <Typography variant="body1" paragraph whiteSpace="pre-line">
                  {event.description || 'No description provided.'}
                </Typography>
                
                <Box mt={4}>
                  <Typography variant="h6" gutterBottom>Date and Time</Typography>
                  <Typography variant="body1" paragraph>
                    {formattedStartDate}
                    <br />
                    {formattedStartTime}{formattedEndTime ? ` - ${formattedEndTime}` : ''}
                  </Typography>
                  
                  {event.endDate && (
                    <Typography variant="body2" color="text.secondary">
                      Duration: {formatDistanceToNow(new Date(event.endDate) - new Date(event.startDate), { addSuffix: false })}
                    </Typography>
                  )}
                </Box>
                
                {event.location && (
                  <Box mt={4}>
                    <Typography variant="h6" gutterBottom>Location</Typography>
                    <Typography variant="body1" paragraph>
                      {event.location}
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<LocationOn />}
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on Map
                    </Button>
                  </Box>
                )}
                
                <Box mt={4}>
                  <Typography variant="h6" gutterBottom>Category</Typography>
                  <Chip 
                    label={event.category || 'Uncategorized'} 
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
                
                {event.tags && event.tags.length > 0 && (
                  <Box mt={4}>
                    <Typography variant="h6" gutterBottom>Tags</Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {event.tags.map((tag) => (
                        <Chip 
                          key={tag} 
                          label={tag} 
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            
            {tabValue === 'attendees' && (
              <Box>
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>Attending ({goingAttendees.length})</Typography>
                  {goingAttendees.length > 0 ? (
                    <Grid container spacing={2}>
                      {goingAttendees.map((attendee) => (
                        <Grid item xs={12} sm={6} key={attendee.user._id}>
                          <Box display="flex" alignItems="center" p={1}>
                            <Avatar 
                              src={attendee.user.profilePicture} 
                              alt={attendee.user.displayName || attendee.user.username}
                              sx={{ width: 48, height: 48, mr: 2 }}
                            />
                            <Box>
                              <Typography variant="subtitle1">
                                {attendee.user.displayName || attendee.user.username}
                              </Typography>
                              {isOwner && (
                                <Typography variant="body2" color="text.secondary">
                                  {attendee.user.email}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      No attendees yet. Be the first to join!
                    </Typography>
                  )}
                </Box>
                
                {interestedAttendees.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Interested ({interestedAttendees.length})</Typography>
                    <Grid container spacing={2}>
                      {interestedAttendees.map((attendee) => (
                        <Grid item xs={12} sm={6} key={attendee.user._id}>
                          <Box display="flex" alignItems="center" p={1}>
                            <Avatar 
                              src={attendee.user.profilePicture} 
                              alt={attendee.user.displayName || attendee.user.username}
                              sx={{ width: 40, height: 40, mr: 2, opacity: 0.8 }}
                            />
                            <Typography variant="body1">
                              {attendee.user.displayName || attendee.user.username}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            )}
            
            {tabValue === 'discussion' && (
              <Box>
                <Typography variant="h6" gutterBottom>Discussion</Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Discussion feature coming soon!
                </Typography>
                <Button 
                  variant="outlined" 
                  color="primary"
                  disabled
                >
                  Add Comment
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>Event Actions</Typography>
            <Divider sx={{ mb: 2 }} />
            
            {isEventPast ? (
              <Box textAlign="center" py={2}>
                <Typography variant="body1" color="text.secondary">
                  This event has already ended.
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={2} mb={3}>
                <Button
                  variant={isAttending ? 'outlined' : 'contained'}
                  color="primary"
                  size="large"
                  fullWidth
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : isAttending ? (
                      <CheckCircle />
                    ) : (
                      <PersonAdd />
                    )
                  }
                  onClick={() => handleRSVP(isAttending ? 'not_going' : 'going')}
                  disabled={isSubmitting || (event.capacity && goingAttendees.length >= event.capacity && !isAttending)}
                >
                  {isAttending ? 'You\'re Going' : 'Join Event'}
                </Button>
                
                {event.capacity && goingAttendees.length >= event.capacity && !isAttending && (
                  <Typography variant="body2" color="error" align="center">
                    This event is at capacity.
                  </Typography>
                )}
                
                <Button
                  variant={isInterested ? 'outlined' : 'text'}
                  color="primary"
                  size="large"
                  fullWidth
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : isInterested ? (
                      <Bookmark />
                    ) : (
                      <BookmarkBorder />
                    )
                  }
                  onClick={() => handleRSVP(isInterested ? 'not_going' : 'interested')}
                  disabled={isSubmitting}
                >
                  {isInterested ? 'Interested' : 'I\'m Interested'}
                </Button>
                
                <Divider sx={{ my: 1 }} />
                
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Share />}
                  fullWidth
                  onClick={handleShareMenuOpen}
                >
                  Share Event
                </Button>
                
                {isOwner && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<Edit />}
                    fullWidth
                    onClick={handleEditEvent}
                  >
                    Edit Event
                  </Button>
                )}
              </Box>
            )}
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Organized by
              </Typography>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar 
                  src={event.createdBy?.profilePicture} 
                  alt={event.createdBy?.displayName || event.createdBy?.username}
                  sx={{ width: 48, height: 48, mr: 2 }}
                />
                <Box>
                  <Typography variant="subtitle1">
                    {event.createdBy?.displayName || event.createdBy?.username || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Organizer
                  </Typography>
                </Box>
              </Box>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<Message />}
                fullWidth
                sx={{ mt: 1 }}
                disabled={!currentUser || currentUser.id === event.createdBy?._id}
              >
                Message Organizer
              </Button>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Event Link
              </Typography>
              <Box display="flex" alignItems="center">
                <TextField
                  value={eventUrl}
                  variant="outlined"
                  size="small"
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Copy link">
                          <IconButton 
                            size="small" 
                            onClick={handleCopyLink}
                            edge="end"
                          >
                            <CopyAll fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              {copied && (
                <Typography variant="caption" color="success.main">
                  Link copied to clipboard!
                </Typography>
              )}
            </Box>
          </Paper>
          
          {event.capacity && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Event Capacity</Typography>
              <Box display="flex" alignItems="center" mb={1}>
                <Box flexGrow={1}>
                  <Typography variant="body2" color="text.secondary">
                    {goingAttendees.length} of {event.capacity} spots filled
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {Math.round((goingAttendees.length / event.capacity) * 100)}%
                </Typography>
              </Box>
              <Box 
                sx={{
                  width: '100%',
                  height: 8,
                  backgroundColor: theme.palette.grey[200],
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <Box 
                  sx={{
                    width: `${(goingAttendees.length / event.capacity) * 100}%`,
                    height: '100%',
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: 4,
                  }}
                />
              </Box>
              {goingAttendees.length >= event.capacity && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  This event is at capacity.
                </Typography>
              )}
            </Paper>
          )}
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Event Tags</Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {event.tags && event.tags.length > 0 ? (
                event.tags.map((tag) => (
                  <Chip 
                    key={tag} 
                    label={tag} 
                    size="small"
                    component="a"
                    href={`/events?tag=${encodeURIComponent(tag)}`}
                    clickable
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tags added
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Event
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this event? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDeleteDialog(false)} 
            color="inherit"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteEvent} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <Delete />}
          >
            {isDeleting ? 'Deleting...' : 'Delete Event'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Copied Notification */}
      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setCopied(false)} severity="success" sx={{ width: '100%' }}>
          Link copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EventDetail;
