import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormGroup,
  FormControlLabel,
  Paper,
  Divider,
  Button,
  Snackbar,
  Alert,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNotifications, usePushNotifications } from '../../hooks';

const NotificationSettings = () => {
  const { unreadCount, markAllAsRead } = useNotifications();
  const {
    isSupported: isPushSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    requestPermission,
    sendTestNotification,
    error: pushError,
  } = usePushNotifications();

  const [settings, setSettings] = useState({
    email: true,
    push: true,
    sound: true,
    desktop: true,
    announcements: true,
    messages: true,
    events: true,
    reminders: true,
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load user preferences from localStorage or API
  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  const handleSettingChange = (setting) => (event) => {
    const newSettings = {
      ...settings,
      [setting]: event.target.checked,
    };
    setSettings(newSettings);

    // Handle push notification subscription changes
    if (setting === 'push' && event.target.checked) {
      handleEnablePushNotifications();
    } else if (setting === 'push' && !event.target.checked) {
      handleDisablePushNotifications();
    }
  };

  const handleEnablePushNotifications = async () => {
    if (permission === 'denied') {
      setSnackbar({
        open: true,
        message: 'Notifications are blocked. Please enable them in your browser settings.',
        severity: 'error',
      });
      return;
    }

    try {
      await requestPermission();
      await subscribe();
      setSnackbar({
        open: true,
        message: 'Push notifications enabled successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      setSnackbar({
        open: true,
        message: 'Failed to enable push notifications. Please try again.',
        severity: 'error',
      });
    }
  };

  const handleDisablePushNotifications = async () => {
    try {
      await unsubscribe();
      setSnackbar({
        open: true,
        message: 'Push notifications disabled.',
        severity: 'info',
      });
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      setSnackbar({
        open: true,
        message: 'Failed to disable push notifications. Please try again.',
        severity: 'error',
      });
    }
  };

  const handleSendTestNotification = async () => {
    const success = await sendTestNotification('Test Notification', {
      body: 'This is a test notification from CampusOS',
      data: {
        url: '/notifications',
      },
    });

    if (success) {
      setSnackbar({
        open: true,
        message: 'Test notification sent!',
        severity: 'success',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setSnackbar({
        open: true,
        message: 'All notifications marked as read',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      setSnackbar({
        open: true,
        message: 'Failed to mark notifications as read',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const PushNotificationStatus = () => {
    if (!isPushSupported) {
      return (
        <Box display="flex" alignItems="center" color="text.secondary">
          <NotificationsOffIcon fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2">Not supported in this browser</Typography>
        </Box>
      );
    }

    if (permission === 'denied') {
      return (
        <Box display="flex" alignItems="center" color="error.main">
          <NotificationsOffIcon fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2">Blocked - Enable in browser settings</Typography>
        </Box>
      );
    }

    return (
      <Box display="flex" alignItems="center" color={isSubscribed ? 'success.main' : 'text.secondary'}>
        {isSubscribed ? (
          <>
            <NotificationsActiveIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2">Enabled</Typography>
          </>
        ) : (
          <>
            <NotificationsOffIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2">Disabled</Typography>
          </>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Notification Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage how you receive notifications from CampusOS
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardHeader
              title="Notification Preferences"
              subheader="Customize your notification settings"
              action={
                <Tooltip title="Refresh">
                  <IconButton onClick={() => window.location.reload()}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              }
            />
            <Divider />
            <CardContent>
              <FormGroup>
                <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">Push Notifications</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Receive notifications in your browser
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <PushNotificationStatus />
                      <Switch
                        checked={isPushSupported && permission !== 'denied' && isSubscribed}
                        onChange={handleSettingChange('push')}
                        disabled={!isPushSupported || permission === 'denied'}
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </Box>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email}
                      onChange={handleSettingChange('email')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography>Email Notifications</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Receive notifications via email
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 2 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.sound}
                      onChange={handleSettingChange('sound')}
                      color="primary"
                      disabled={!isPushSupported || !isSubscribed}
                    />
                  }
                  label={
                    <Box>
                      <Typography>Notification Sounds</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Play sound when receiving notifications
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 2 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.desktop}
                      onChange={handleSettingChange('desktop')}
                      color="primary"
                      disabled={!isPushSupported || !isSubscribed}
                    />
                  }
                  label={
                    <Box>
                      <Typography>Desktop Notifications</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Show desktop notifications when tab is not active
                      </Typography>
                    </Box>
                  }
                />
              </FormGroup>
            </CardContent>
          </Card>

          <Card elevation={2} sx={{ mt: 3 }}>
            <CardHeader
              title="Notification Types"
              subheader="Choose which types of notifications to receive"
            />
            <Divider />
            <CardContent>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.announcements}
                      onChange={handleSettingChange('announcements')}
                      color="primary"
                    />
                  }
                  label="Announcements"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.messages}
                      onChange={handleSettingChange('messages')}
                      color="primary"
                    />
                  }
                  label="Direct Messages"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.events}
                      onChange={handleSettingChange('events')}
                      color="primary"
                    />
                  }
                  label="Event Reminders"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.reminders}
                      onChange={handleSettingChange('reminders')}
                      color="primary"
                    />
                  }
                  label="Assignment Reminders"
                />
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardHeader title="Quick Actions" />
            <Divider />
            <CardContent>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleSendTestNotification}
                  disabled={!isPushSupported || !isSubscribed}
                  startIcon={<NotificationsIcon />}
                >
                  Send Test Notification
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  startIcon={<CheckIcon />}
                >
                  Mark All as Read
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => {
                    // Reset to default settings
                    setSettings({
                      email: true,
                      push: true,
                      sound: true,
                      desktop: true,
                      announcements: true,
                      messages: true,
                      events: true,
                      reminders: true,
                    });
                    setSnackbar({
                      open: true,
                      message: 'Notification settings reset to default',
                      severity: 'info',
                    });
                  }}
                  startIcon={<RefreshIcon />}
                >
                  Reset to Defaults
                </Button>
              </Box>

              <Box mt={3} p={2} bgcolor="background.paper" borderRadius={1}>
                <Box display="flex" alignItems="center" mb={1}>
                  <InfoIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2">Notification Status</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {unreadCount} unread notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Push notifications: {isPushSupported ? (isSubscribed ? 'Enabled' : 'Disabled') : 'Not supported'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browser permission: {permission}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationSettings;
