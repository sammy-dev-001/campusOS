import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Tooltip, Box } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationDropdown from './NotificationDropdown';

const NotificationBadge = () => {
  const { unreadCount } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (anchorEl && !anchorEl.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorEl]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-label={`${unreadCount} unread notifications`}
          aria-controls={isOpen ? 'notification-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={isOpen ? 'true' : undefined}
          sx={{
            position: 'relative',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={9}
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.7rem',
                height: '20px',
                minWidth: '20px',
                padding: '0 4px',
                right: 5,
                top: 5,
                border: '2px solid',
                borderColor: 'background.paper',
                backgroundColor: 'error.main',
                color: 'error.contrastText',
                animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.7)' },
                  '70%': { boxShadow: '0 0 0 10px rgba(244, 67, 54, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)' },
                },
              },
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <NotificationDropdown 
        anchorEl={anchorEl} 
        open={isOpen} 
        onClose={handleClose} 
      />
    </Box>
  );
};

export default NotificationBadge;
