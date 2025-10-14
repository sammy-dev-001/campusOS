import React, { useState, useEffect, useRef } from 'react';
import { 
  Badge, 
  IconButton, 
  Menu, 
  MenuItem, 
  Typography, 
  Box, 
  Divider, 
  ListItemIcon,
  ListItemText,
  Button,
  Avatar,
  Tooltip,
  Fade,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  NotificationsActive as NotificationsActiveIcon,
  CheckCircle as CheckCircleIcon,
  Event as EventIcon,
  Message as MessageIcon,
  Announcement as AnnouncementIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ClearAll as ClearAllIcon,
  Settings as SettingsIcon,
  MarkEmailRead as MarkEmailReadIcon,
  NotificationsOff as NotificationsOffIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useNotification } from '../../contexts/NotificationContext';

const NotificationBell = ({ size = 'medium', color = 'inherit' }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAll,
    fetchNotifications,
    preferences
  } = useNotification();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const menuOpen = Boolean(anchorEl);
  const menuRef = useRef(null);
  
  // Handle menu open
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle mark as read
  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Handle mark all as read
  const handleMarkAllAsRead = async (event) => {
    event.stopPropagation();
    try {
      await markAllAsRead();
      enqueueSnackbar('All notifications marked as read', { variant: 'success' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      enqueueSnackbar('Failed to mark all as read', { variant: 'error' });
    }
  };
  
  // Handle clear all
  const handleClearAll = async (event) => {
    event.stopPropagation();
    try {
      await clearAll();
      enqueueSnackbar('All notifications cleared', { variant: 'success' });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      enqueueSnackbar('Failed to clear notifications', { variant: 'error' });
    }
  };
  
  // Handle refresh
  const handleRefresh = async (event) => {
    event.stopPropagation();
    setLoadingNotifications(true);
    try {
      await fetchNotifications();
      enqueueSnackbar('Notifications refreshed', { variant: 'success' });
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      enqueueSnackbar('Failed to refresh notifications', { variant: 'error' });
    } finally {
      setLoadingNotifications(false);
    }
  };
  
  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      markAsRead(notification._id);
    }
    
    // Navigate based on notification type or action
    if (notification.action?.target) {
      navigate(notification.action.target);
    } else if (notification.relatedDocument) {
      // Handle navigation based on related document type
      switch (notification.relatedDocumentModel) {
        case 'Event':
          navigate(`/events/${notification.relatedDocument._id}`);
          break;
        case 'Document':
          navigate(`/documents/${notification.relatedDocument._id}`);
          break;
        default:
          navigate('/notifications');
      }
    } else {
      navigate('/notifications');
    }
    
    // Close the menu
    handleMenuClose();
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'event':
        return <EventIcon color="primary" />;
      case 'message':
        return <MessageIcon color="info" />;
      case 'announcement':
        return <AnnouncementIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'success':
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon color="action" />;
    }
  };
  
  // Get notification color based on type and read status
  const getNotificationBgColor = (notification) => {
    if (!notification.read) {
      return theme.palette.mode === 'light' 
        ? 'rgba(25, 118, 210, 0.04)' 
        : 'rgba(25, 118, 210, 0.16)';
    }
    return 'transparent';
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        handleMenuClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <Box ref={menuRef}>
      {/* Notification Bell Button */}
      <Tooltip title="Notifications">
        <IconButton
          size={size}
          color={color}
          onClick={handleMenuOpen}
          aria-label={`show ${unreadCount} new notifications`}
          aria-controls="notification-menu"
          aria-haspopup="true"
          sx={{
            position: 'relative',
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            max={99}
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                '&::after': {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s infinite ease-in-out',
                  border: '1px solid currentColor',
                  content: '""',
                },
                '@keyframes pulse': {
                  '0%': {
                    transform: 'scale(1)',
                    opacity: 0.8,
                  },
                  '70%': {
                    transform: 'scale(1.5)',
                    opacity: 0,
                  },
                  '100%': {
                    transform: 'scale(1)',
                    opacity: 0,
                  },
                },
              },
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsActiveIcon />
            ) : (
              <NotificationsNoneIcon />
            )}
          </Badge>
        </IconButton>
      </Tooltip>
      
      {/* Notification Menu */}
      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            width: 380,
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflow: 'hidden',
            mt: 1,
            boxShadow: theme.shadows[10],
            borderRadius: 2,
            '& .MuiMenu-list': {
              p: 0,
            },
          },
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        disableScrollLock={true}
      >
        {/* Header */}
        <Box 
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Notifications
          </Typography>
          <Box>
            <Tooltip title="Refresh">
              <IconButton 
                size="small" 
                onClick={handleRefresh}
                disabled={loadingNotifications}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Mark all as read">
              <span>
                <IconButton 
                  size="small" 
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0 || loadingNotifications}
                >
                  <MarkEmailReadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Clear all">
              <span>
                <IconButton 
                  size="small" 
                  onClick={handleClearAll}
                  disabled={notifications.length === 0 || loadingNotifications}
                >
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Notification settings">
              <IconButton 
                size="small" 
                onClick={() => {
                  navigate('/settings/notifications');
                  handleMenuClose();
                }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Notification List */}
        <Box 
          sx={{
            overflowY: 'auto',
            maxHeight: 'calc(80vh - 120px)',
            minHeight: '200px',
            backgroundColor: theme.palette.background.default,
          }}
        >
          {loading ? (
            <Box 
              display="flex" 
              justifyContent="center" 
              alignItems="center" 
              minHeight="200px"
            >
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center" 
              p={4}
              textAlign="center"
              minHeight="200px"
            >
              <NotificationsOffIcon 
                sx={{ 
                  fontSize: 48, 
                  color: 'text.secondary',
                  opacity: 0.5,
                  mb: 2,
                }} 
              />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                We'll notify you when there's something new
              </Typography>
            </Box>
          ) : (
            <>
              {notifications.map((notification) => (
                <Box key={notification._id}>
                  <MenuItem 
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      p: 2,
                      borderLeft: `4px solid ${!notification.read ? theme.palette.primary.main : 'transparent'}`,
                      backgroundColor: getNotificationBgColor(notification),
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <Box sx={{ mr: 2, mt: 0.5 }}>
                      {getNotificationIcon(notification.type)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box 
                        display="flex" 
                        justifyContent="space-between" 
                        alignItems="flex-start"
                        mb={0.5}
                      >
                        <Typography 
                          variant="subtitle2" 
                          sx={{
                            fontWeight: notification.read ? 'normal' : 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            pr: 1,
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Box display="flex" alignItems="center">
                          <Typography 
                            variant="caption" 
                            color="textSecondary"
                            sx={{
                              whiteSpace: 'nowrap',
                              ml: 1,
                            }}
                          >
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </Typography>
                          {!notification.read && (
                            <Box 
                              component="span"
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: theme.palette.primary.main,
                                ml: 1,
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                      <Typography 
                        variant="body2" 
                        color="textSecondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {notification.message}
                      </Typography>
                      {notification.relatedDocument && (
                        <Box 
                          mt={1} 
                          p={1} 
                          sx={{
                            backgroundColor: theme.palette.action.selected,
                            borderRadius: 1,
                            borderLeft: `3px solid ${theme.palette.divider}`,
                          }}
                        >
                          <Typography 
                            variant="caption" 
                            sx={{
                              display: 'block',
                              fontWeight: 'medium',
                              color: theme.palette.text.primary,
                            }}
                          >
                            {notification.relatedDocument.title || 'Related item'}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="textSecondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {notification.relatedDocument.description || 
                             notification.relatedDocument.content || 
                             notification.relatedDocument.subject ||
                             'View details'}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </MenuItem>
                  <Divider sx={{ m: 0 }} />
                </Box>
              ))}
            </>
          )}
        </Box>
        
        {/* Footer */}
        <Box 
          sx={{
            p: 1.5,
            textAlign: 'center',
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            position: 'sticky',
            bottom: 0,
            zIndex: 1,
          }}
        >
          <Button 
            size="small" 
            color="primary"
            onClick={() => {
              navigate('/notifications');
              handleMenuClose();
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 'medium',
            }}
          >
            View All Notifications
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default NotificationBell;
