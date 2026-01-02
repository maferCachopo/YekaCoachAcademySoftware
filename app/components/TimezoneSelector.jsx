'use client';

import { useState, useEffect } from 'react';
import { FormControl, InputLabel, MenuItem, Select, Box, Typography } from '@mui/material';
import { Public as GlobeIcon } from '@mui/icons-material';
import { useTheme } from '@/app/contexts/ThemeContext';
import { timezoneUtils, authAPI } from '@/app/utils/api';
import { setCookie, getCookie, COOKIE_NAMES } from '@/app/utils/cookieUtils';
import { useAuth } from '@/app/contexts/AuthContext';
import { ADMIN_TIMEZONE } from '@/app/constants/styleConstants';
import moment from 'moment-timezone';

const TimezoneSelector = ({ value, onChange, label = 'Timezone' }) => {
  const { theme } = useTheme();
  const { user, updateTimezone } = useAuth();
  const [timezones, setTimezones] = useState([]);
  // Try to get from cookie first, then admin timezone, then user, then local browser
  const initialTimezone = value || getCookie(COOKIE_NAMES.TIMEZONE) || ADMIN_TIMEZONE || (user && user.timezone) || timezoneUtils.getLocalTimezone();
  const [currentValue, setCurrentValue] = useState(initialTimezone);
  
  // Get popular/major timezones to show at the top
  const popularTimezones = [
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'America/Caracas',
    'America/Mexico_City',
    'America/Bogota',
    'Europe/London',
    'Europe/Paris',
    'Europe/Madrid',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Dubai',
    'Australia/Sydney',
    'Pacific/Auckland'
  ];
  
  useEffect(() => {
    // Get all available timezones
    const allTimezones = moment.tz.names();
    
    // Create timezone list with current offset
    const timezoneList = allTimezones.map(tz => {
      const offset = moment.tz(tz).format('Z');
      return {
        name: tz,
        offset: offset,
        label: `(GMT${offset}) ${tz.replace(/_/g, ' ').replace('/', ': ')}`
      };
    });
    
    // Sort by offset and name
    timezoneList.sort((a, b) => {
      if (a.offset === b.offset) {
        return a.name.localeCompare(b.name);
      }
      return a.offset.localeCompare(b.offset);
    });
    
    // Move popular timezones to the top
    const popular = [];
    const others = [];
    
    timezoneList.forEach(tz => {
      if (popularTimezones.includes(tz.name)) {
        popular.push(tz);
      } else {
        others.push(tz);
      }
    });
    
    setTimezones([...popular, { name: 'divider', label: '──────────────────' }, ...others]);
  }, []);
  
  // Update internal state when prop value or user timezone changes
  useEffect(() => {
    if (value) {
      setCurrentValue(value);
    } else if (user && user.timezone) {
      setCurrentValue(user.timezone);
    }
  }, [value, user]);
  
  const handleChange = async (event) => {
    const newValue = event.target.value;
    setCurrentValue(newValue);
    
    // Always store in cookie for persistence across sessions
    setCookie(COOKIE_NAMES.TIMEZONE, newValue);
    
    // Also store in localStorage for backward compatibility
    if (typeof window !== 'undefined') {
      localStorage.setItem('yekacoucha_timezone', newValue);
    }
    
    // Update server-side if user is logged in
    if (user) {
      try {
        // Use the Auth context's updateTimezone function if available
        if (updateTimezone) {
          const response = await updateTimezone(newValue);
          console.log('Timezone updated successfully on server:', response);
        } else {
          // Fallback to direct API call
          const response = await authAPI.updateTimezone(newValue);
          console.log('Timezone updated successfully on server:', response);
        }
      } catch (error) {
        console.error('Failed to update timezone on server:', error);
      }
    }
    
    // Call the parent component's onChange handler
    if (onChange) {
      onChange(newValue);
    }
    
    // Trigger an event to notify components that timezone changed
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('yekacoucha_timezone_changed', {
        detail: { timezone: newValue }
      });
      window.dispatchEvent(event);
    }
  };
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 2 }}>
      <GlobeIcon sx={{ mr: 1, color: theme?.palette?.primary?.main || '#845EC2' }} />
      <FormControl fullWidth variant="standard">
        <InputLabel id="timezone-select-label">{label}</InputLabel>
        <Select
          labelId="timezone-select-label"
          id="timezone-select"
          value={currentValue}
          onChange={handleChange}
          sx={{ color: theme?.text?.primary }}
        >
          {timezones.map((tz, index) => {
            if (tz.name === 'divider') {
              return <MenuItem key="divider" divider disabled>{tz.label}</MenuItem>;
            }
            return (
              <MenuItem key={tz.name} value={tz.name}>
                {tz.label}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Box>
  );
};

export default TimezoneSelector;