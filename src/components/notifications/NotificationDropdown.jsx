import React, { useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  CircularProgress,
  Tooltip,
  Fade,
  useTheme,
} from '@mui/material';
import {
  Check as CheckIcon,
  NotificationsNone as NotificationsNoneIcon,
  NotificationsOff as NotificationsOffIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FiberManualRecord as FiberManualRecordIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../../contexts/NotificationContext';
import { Link as RouterLink } from 'react-router-dom';

const NotificationDropdown = ({ anchorEl, open, onClose }) => {
  const theme = useTheme();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications();

  const handleMarkAsRead = useCallback(
    async (notificationId, event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await markAsRead(notificationId);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await markAllAsRead();
      } catch (err) {
        console.error('Failed to mark all notifications as read:', err);
      }
    },
    [markAllAsRead]
  );

  const handleRefresh = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      refresh();
    },
    [refresh]
  );

  if (!open) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute',
        top: '60px',
        right: '16px',
        width: '400px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        zIndex: theme.zIndex.modal,
        transformOrigin: 'top right',
        animation: 'fadeIn 0.2s ease-in-out',
        '@keyframes fadeIn': {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Typography variant="subtitle1" fontWeight="medium">
          Notifications
          {unreadCount > 0 && (
            <Typography component="span" color="primary" ml={1}>
              ({unreadCount} unread)
            </Typography>
          )}
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={handleRefresh} disabled={isLoading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Mark all as read">
            <span>
              <IconButton
                size="small"
                onClick={handleMarkAllAsRead}
                disabled={isLoading || unreadCount === 0}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 3,
            }}
          >
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
              textAlign: 'center',
              color: 'error.main',
            }}
          >
            <NotificationsOffIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">
              Failed to load notifications. Please try again.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefresh}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Box>
        ) : notifications.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            <NotificationsNoneIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">No notifications yet</Typography>
            <Typography variant="caption">
              We'll notify you when there's something new
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((notification) => (
              <React.Fragment key={notification._id}>
                <ListItem
                  button
                  component={RouterLink}
                  to={notification.action?.target || '#'}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification._id);
                    }
                    onClose();
                  }}
                  sx={{
                    backgroundColor: notification.read
                      ? 'transparent'
                      : 'action.hover',
                    '&:hover': {
                      backgroundColor: theme.palette.action.selected,
                    },
                    transition: 'background-color 0.2s',
                    py: 1.5,
                    px: 2,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: notification.read ? 'transparent' : 'primary.main',
                        transition: 'background-color 0.2s',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight={notification.read ? 'normal' : 'medium'}
                        color="text.primary"
                      >
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="caption"
                          display="block"
                          color="text.secondary"
                        >
                          {notification.message}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          display="block"
                          color="text.disabled"
                          sx={{ mt: 0.5 }}
                        >
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </Typography>
                      </>
                    }
                    primaryTypographyProps={{
                      noWrap: true,
                      style: {
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                      },
                    }}
                    secondaryTypographyProps={{
                      component: 'div',
                    }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => handleMarkAsRead(notification._id, e)}
                      sx={{
                        opacity: notification.read ? 0 : 1,
                        transition: 'opacity 0.2s',
                        '&:hover': {
                          backgroundColor: 'transparent',
                          '& .MuiSvgIcon-root': {
                            color: 'primary.main',
                          },
                        },
                      }}
                    >
                      <FiberManualRecordIcon
                        fontSize="small"
                        sx={{
                          fontSize: '0.5rem',
                          color: 'primary.main',
                        }}
                      />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.default,
          textAlign: 'center',
        }}
      >
        <Button
          component={RouterLink}
          to="/notifications"
          size="small"
          fullWidth
          onClick={onClose}
        >
          View All Notifications
        </Button>
      </Box>
    </Paper>
  );
};

export default NotificationDropdown;
