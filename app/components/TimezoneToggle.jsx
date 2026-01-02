'use client';
import { useState, useEffect } from 'react';
import { 
  IconButton, 
  Tooltip, 
  Popover, 
  List, 
  ListItem, 
  ListItemText, 
  InputBase, 
  Box, 
  Typography,
  Divider
} from '@mui/material';
import { Public as GlobeIcon, Search as SearchIcon } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth, timezoneUtils } from '../utils/api';
import { ADMIN_TIMEZONE } from '../utils/constants';
import { getCookie, setCookie, COOKIE_NAMES } from '../utils/cookieUtils';
import { useNotify } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import moment from 'moment-timezone';

const TimezoneToggle = () => {
  const { theme } = useTheme();
  const { user, setUser } = useAuth();
  const notify = useNotify();
  const { translations } = useLanguage();
  const [anchorEl, setAnchorEl] = useState(null);
  const [search, setSearch] = useState('');
  
  // Get current timezone from user, cookie, or browser
  const [currentTimezone, setCurrentTimezone] = useState(null);
  
  useEffect(() => {
    // Priority: 1. User object (from auth), 2. Cookie, 3. Browser detection
    const timezone = user?.timezone || getCookie(COOKIE_NAMES.TIMEZONE) || timezoneUtils.getLocalTimezone();
    setCurrentTimezone(timezone);
  }, [user]);
  
  // List of popular/major timezones
  const popularTimezones = [
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'America/Mexico_City',
    'America/Bogota',
    'America/Caracas',
    'Europe/London',
    'Europe/Paris',
    'Europe/Madrid',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];
  
  // Get all timezones with current offset for display
  const allTimezones = moment.tz.names().map(tz => {
    const offset = moment.tz(tz).format('Z');
    return {
      name: tz,
      offset,
      display: `(GMT${offset}) ${tz.replace(/_/g, ' ').replace('/', ': ')}`
    };
  });
  
  // Filter timezones based on search
  const filteredTimezones = search
    ? allTimezones.filter(tz => 
        tz.name.toLowerCase().includes(search.toLowerCase()) || 
        tz.display.toLowerCase().includes(search.toLowerCase()))
    : popularTimezones.map(name => 
        allTimezones.find(tz => tz.name === name)).filter(Boolean);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearch('');
  };

  const handleTimezoneSelect = async (timezone) => {
    try {
      // Always store in cookie for persistence across sessions
      setCookie(COOKIE_NAMES.TIMEZONE, timezone);
      
      // Update current timezone state immediately
      setCurrentTimezone(timezone);
      
      // Also store in localStorage for backward compatibility
      if (typeof window !== 'undefined') {
        localStorage.setItem('yekacoucha_timezone', timezone);
      }
      
      // Close the popover immediately
      handleClose();
      
      if (user) {
        try {
          // Update timezone on the server for logged-in users
          const response = await fetchWithAuth('/auth/update-timezone', {
            method: 'POST',
            body: JSON.stringify({ timezone }),
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          // Check for successful response (either explicit success flag or a message that indicates success)
          if (response.success || (response.message && response.message.includes('success'))) {
            // Update local user state
            setUser({
              ...user,
              timezone
            });
            
            // Apply timezone changes without reloading the page
            // We've already updated the cookie, localStorage and user state
            notify?.success(translations?.timezoneUpdateSuccess || 'Timezone updated successfully!');
          } else {
            console.error('Server returned error:', response);
            // Don't reload if there was an error
          }
        } catch (apiError) {
          console.error('API error updating timezone:', apiError);
          // Don't reload if there was an error
        }
      } else {
        // For non-logged in users, just show success message
        notify?.success(translations?.timezoneUpdateSuccess || 'Timezone updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update timezone:', error);
    }
  };

  // Format current timezone for display
  const formatCurrentTimezone = () => {
    if (currentTimezone === ADMIN_TIMEZONE) {
      return 'Admin (Venezuela)';
    }
    
    const tz = allTimezones.find(t => t.name === currentTimezone);
    if (tz) {
      return `${tz.offset} ${tz.name.split('/')[1]?.replace('_', ' ') || tz.name}`;
    }
    
    return currentTimezone;
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Change timezone" placement="bottom" arrow>
        <IconButton
          onClick={handleClick}
          sx={{
            color: theme.isDark ? 'white' : '#2D3748',
            bgcolor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            '&:hover': {
              bgcolor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          <GlobeIcon />
        </IconButton>
      </Tooltip>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPopover-paper': {
            width: 300,
            maxHeight: 400,
            p: 2,
            bgcolor: theme.isDark ? 'rgba(30, 30, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            border: theme.isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: theme.text.primary }}>
          Select Timezone
        </Typography>
        
        <Typography variant="body2" sx={{ color: theme.text.secondary, mb: 2 }}>
          Current: {formatCurrentTimezone()}
        </Typography>
        
        <Box sx={{ position: 'relative', mb: 2 }}>
          <InputBase
            placeholder="Search timezones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startAdornment={<SearchIcon sx={{ mr: 1, color: theme.text.secondary }} />}
            fullWidth
            sx={{
              py: 1,
              px: 2,
              borderRadius: 1,
              bgcolor: theme.isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
              color: theme.text.primary,
              '& .MuiInputBase-input::placeholder': {
                color: theme.text.secondary,
                opacity: 0.7,
              }
            }}
          />
        </Box>
        
        {!search && (
          <>
            <Typography variant="caption" sx={{ color: theme.text.secondary, px: 1 }}>
              Popular Timezones
            </Typography>
            <Divider sx={{ my: 0.5 }} />
          </>
        )}
        
        <List sx={{ 
          maxHeight: 280, 
          overflow: 'auto',
          py: 0,
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.05)'
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(132, 94, 194, 0.3)',
            borderRadius: '4px'
          }
        }}>
          {filteredTimezones.length > 0 ? (
            filteredTimezones.map((tz) => (
              <ListItem 
                key={tz.name} 
                button 
                dense
                onClick={() => handleTimezoneSelect(tz.name)}
                selected={currentTimezone === tz.name}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  backgroundColor: currentTimezone === tz.name 
                    ? (theme.isDark ? 'rgba(132, 94, 194, 0.2)' : 'rgba(132, 94, 194, 0.1)') 
                    : 'transparent',
                  color: currentTimezone === tz.name 
                    ? '#845EC2' 
                    : theme.text.primary,
                  '&:hover': {
                    backgroundColor: theme.isDark 
                      ? 'rgba(132, 94, 194, 0.3)' 
                      : 'rgba(132, 94, 194, 0.15)',
                  }
                }}
              >
                <ListItemText 
                  primary={tz.display}
                  primaryTypographyProps={{
                    variant: 'body2',
                    style: { 
                      fontWeight: currentTimezone === tz.name ? 600 : 400
                    }
                  }}
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText 
                primary="No timezones found" 
                primaryTypographyProps={{
                  variant: 'body2',
                  style: { color: theme.text.secondary }
                }}
              />
            </ListItem>
          )}
          
          {search && filteredTimezones.length > 20 && (
            <ListItem>
              <ListItemText 
                primary={`${filteredTimezones.length - 20} more...`} 
                primaryTypographyProps={{
                  variant: 'body2',
                  style: { color: theme.text.secondary }
                }}
              />
            </ListItem>
          )}
        </List>
        
        {currentTimezone === ADMIN_TIMEZONE && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: 'info.contrastText' }}>
              Currently using Admin timezone (Venezuela)
            </Typography>
          </Box>
        )}
      </Popover>
    </>
  );
};

export default TimezoneToggle;