import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  CircularProgress,
  useTheme,
  Tooltip,
  Fade,
  Zoom,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  MoreVert as MoreVertIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../../contexts/AuthContext';
import eventService from '../../../services/eventService';

const RSVPButton = ({ event, onRSVPUpdate, size = 'medium', variant = 'contained', fullWidth = false }) => {
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser } = useAuth();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Check if user has already RSVP'd
  useEffect(() => {
    if (currentUser && event?.attendees) {
      const userRsvp = event.attendees.find(
        attendee => attendee.user?._id === currentUser.id || attendee.user === currentUser.id
      );
      setRsvpStatus(userRsvp?.status || null);
    } else {
      setRsvpStatus(null);
    }
  }, [currentUser, event]);
  
  // Handle RSVP action
  const handleRSVP = async (status) => {
    if (!currentUser) {
      enqueueSnackbar('Please log in to RSVP to events', { 
        variant: 'info',
        action: (key) => (
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => {
              // This would typically redirect to login with a return URL
              window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
            }}
          >
            Log In
          </Button>
        )
      });
      return;
    }
    
    // If clicking the same status, treat as a toggle to remove RSVP
    const newStatus = rsvpStatus === status ? 'not_going' : status;
    
    try {
      setLoading(true);
      
      // Call the API to update RSVP
      await eventService.updateAttendance(event._id, newStatus);
      
      // Update local state
      setRsvpStatus(newStatus === 'not_going' ? null : newStatus);
      
      // Show success message
      let message = '';
      if (newStatus === 'not_going') {
        message = 'RSVP removed';
      } else {
        message = `You're ${newStatus === 'going' ? 'going' : 'interested'}!`;
      }
      
      setSuccessMessage(message);
      setShowSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      
      // Notify parent component about the RSVP update
      if (onRSVPUpdate) {
        onRSVPUpdate(event._id, newStatus);
      }
      
      // Show success notification
      enqueueSnackbar(message, { 
        variant: 'success',
        autoHideDuration: 3000,
      });
      
    } catch (error) {
      console.error('Error updating RSVP:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to update RSVP. Please try again.',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
      handleMenuClose();
    }
  };
  
  // Handle menu open/close
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Check if event is at capacity
  const isAtCapacity = event?.capacity && 
    event.attendees?.filter(a => a.status === 'going').length >= event.capacity;
  
  // Check if user is the event creator
  const isEventCreator = currentUser && 
    (event?.createdBy?._id === currentUser.id || event?.createdBy === currentUser.id);
  
  // Check if event is in the past
  const isPastEvent = event?.endDate ? 
    new Date(event.endDate) < new Date() : 
    new Date(event?.startDate) < new Date();
  
  // Don't show RSVP options for past events
  if (isPastEvent) {
    return (
      <Button
        variant={variant}
        color="default"
        size={size}
        fullWidth={fullWidth}
        disabled
        startIcon={<EventBusyIcon />}
      >
        Event Ended
      </Button>
    );
  }
  
  // Main RSVP button based on current status
  const renderMainButton = () => {
    // If user is the event creator, show "Manage Event" button
    if (isEventCreator) {
      return (
        <Button
          variant="contained"
          color="primary"
          size={size}
          fullWidth={fullWidth}
          startIcon={<CheckCircleIcon />}
          onClick={() => window.location.href = `/events/edit/${event._id}`}
        >
          Manage Event
        </Button>
      );
    }
    
    // If user is going to the event
    if (rsvpStatus === 'going') {
      return (
        <Button
          variant="contained"
          color="primary"
          size={size}
          fullWidth={fullWidth}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
          onClick={() => handleRSVP('going')}
          disabled={loading}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            '& .success-overlay': {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.palette.success.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s ease-in-out',
              transform: showSuccess ? 'translateY(0)' : 'translateY(-100%)',
            },
          }}
        >
          {showSuccess ? (
            <Box className="success-overlay">
              <CheckIcon sx={{ mr: 1 }} />
              {successMessage}
            </Box>
          ) : (
            <>
              <Fade in={!showSuccess} timeout={300}>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon sx={{ mr: 1 }} />
                  <span>Going</span>
                </Box>
              </Fade>
            </>
          )}
        </Button>
      );
    }
    
    // If user is interested in the event
    if (rsvpStatus === 'interested') {
      return (
        <Button
          variant="outlined"
          color="primary"
          size={size}
          fullWidth={fullWidth}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <BookmarkIcon />}
          onClick={() => handleRSVP('interested')}
          disabled={loading}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            '& .success-overlay': {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.palette.background.paper,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s ease-in-out',
              transform: showSuccess ? 'translateY(0)' : 'translateY(-100%)',
              border: `1px solid ${theme.palette.primary.main}`,
              borderRadius: theme.shape.borderRadius,
            },
          }}
        >
          {showSuccess ? (
            <Box className="success-overlay">
              <CheckIcon color="success" sx={{ mr: 1 }} />
              <Typography color="success.main" variant="button">
                {successMessage}
              </Typography>
            </Box>
          ) : (
            <Fade in={!showSuccess} timeout={300}>
              <Box display="flex" alignItems="center">
                <BookmarkIcon sx={{ mr: 1 }} />
                <span>Interested</span>
              </Box>
            </Fade>
          )}
        </Button>
      );
    }
    
    // Default state - not RSVP'd yet
    return (
      <Button
        variant={variant}
        color="primary"
        size={size}
        fullWidth={fullWidth}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />}
        onClick={handleMenuOpen}
        disabled={loading || (isAtCapacity && !rsvpStatus)}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          '& .success-overlay': {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s ease-in-out',
            transform: showSuccess ? 'translateY(0)' : 'translateY(-100%)',
          },
        }}
      >
        {showSuccess ? (
          <Box className="success-overlay">
            <CheckIcon sx={{ mr: 1 }} />
            {successMessage}
          </Box>
        ) : (
          <Fade in={!showSuccess} timeout={300}>
            <Box display="flex" alignItems="center">
              <PersonAddIcon sx={{ mr: 1 }} />
              <span>{isAtCapacity ? 'Event Full' : 'RSVP'}</span>
            </Box>
          </Fade>
        )}
      </Button>
    );
  };
  
  return (
    <Box sx={{ position: 'relative' }}>
      {renderMainButton()}
      
      {/* RSVP Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 220,
            borderRadius: 2,
            boxShadow: theme.shadows[3],
            '& .MuiMenuItem-root': {
              py: 1.5,
            },
          },
        }}
      >
        <MenuItem 
          onClick={() => handleRSVP('going')}
          disabled={isAtCapacity && rsvpStatus !== 'going'}
          sx={{
            '&.Mui-disabled': {
              opacity: 0.7,
              '& .MuiTypography-root': {
                color: theme.palette.text.secondary,
              },
            },
          }}
        >
          <ListItemIcon>
            <EventAvailableIcon 
              color={rsvpStatus === 'going' ? 'primary' : 'action'} 
              fontSize="small" 
            />
          </ListItemIcon>
          <ListItemText 
            primary="Going" 
            primaryTypographyProps={{
              color: rsvpStatus === 'going' ? 'primary' : 'textPrimary',
              fontWeight: rsvpStatus === 'going' ? 'medium' : 'normal',
            }}
          />
          {isAtCapacity && rsvpStatus !== 'going' && (
            <Tooltip title="Event at capacity" arrow>
              <Box component="span" sx={{ ml: 1, display: 'flex' }}>
                <WarningIcon color="warning" fontSize="small" />
              </Box>
            </Tooltip>
          )}
        </MenuItem>
        
        <MenuItem onClick={() => handleRSVP('interested')}>
          <ListItemIcon>
            {rsvpStatus === 'interested' ? (
              <BookmarkIcon color="primary" fontSize="small" />
            ) : (
              <BookmarkBorderIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText 
            primary="Interested" 
            primaryTypographyProps={{
              color: rsvpStatus === 'interested' ? 'primary' : 'textPrimary',
              fontWeight: rsvpStatus === 'interested' ? 'medium' : 'normal',
            }}
          />
        </MenuItem>
        
        {(rsvpStatus === 'going' || rsvpStatus === 'interested') && (
          <>
            <Divider />
            <MenuItem 
              onClick={() => handleRSVP(rsvpStatus)} // Toggle off the current status
              sx={{
                color: theme.palette.error.main,
                '&:hover': {
                  backgroundColor: theme.palette.error.background,
                },
              }}
            >
              <ListItemIcon>
                <PersonRemoveIcon color="error" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={`Not ${rsvpStatus === 'going' ? 'Going' : 'Interested'}`}
                primaryTypographyProps={{
                  color: 'error',
                }}
              />
            </MenuItem>
          </>
        )}
      </Menu>
      
      {/* Capacity warning tooltip */}
      {isAtCapacity && (
        <Zoom in={!rsvpStatus}>
          <Box 
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              backgroundColor: theme.palette.warning.main,
              color: theme.palette.warning.contrastText,
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.shadows[2],
            }}
          >
            <Tooltip 
              title={`This event is at capacity (${event.attendees?.filter(a => a.status === 'going').length}/${event.capacity} attendees)`}
              arrow
              placement="top"
            >
              <WarningIcon fontSize="small" />
            </Tooltip>
          </Box>
        </Zoom>
      )}
    </Box>
  );
};

export default RSVPButton;
