'use client';

import React, { useEffect } from 'react';
import { 
  Box, Typography, ToggleButtonGroup, ToggleButton, 
  FormControl, InputLabel, Select, MenuItem, Grid,
  CircularProgress, Alert
} from '@mui/material';
import { ViewList, AccessTime } from '@mui/icons-material';
import moment from 'moment';

const TimeSlotSelector = ({
  selectedDate,
  selectedTeacher,
  viewMode,
  setViewMode,
  availableSlots = [],
  selectedTime,
  setSelectedTime,
  translations,
  theme,
  validateTimeFormat,
  loadingAllTeachers,
  originalDuration = 120
}) => {
  // Filter slots to match original duration with 15 minute tolerance
  const [filteredSlots, setFilteredSlots] = React.useState([]);
  const [showingOriginalDuration, setShowingOriginalDuration] = React.useState(true);
  // Debug: Log detailed props on render
  console.log('TimeSlotSelector props:', {
    selectedDate: selectedDate?.format('YYYY-MM-DD'),
    selectedTeacher: selectedTeacher?.id,
    availableSlots: availableSlots?.length,
    selectedTime,
    loadingAllTeachers,
    originalDuration,
    slotsDetail: availableSlots?.slice(0, 2) // Show first two slots for debugging
  });
  
  // Filter slots by duration when available slots change
  useEffect(() => {
    if (availableSlots && availableSlots.length > 0) {
      console.log('First available slot:', availableSlots[0]);
      
      // Check if any slots are missing formatted times
      const needFormatting = availableSlots.some(slot => !slot.formattedStart || !slot.formattedEnd);
      
      if (needFormatting) {
        console.log('Some slots need formatting');
      }
      
      // Filter slots to match the original class duration (with some tolerance)
      const tolerance = 15; // 15 minutes tolerance
      const matchingDurationSlots = availableSlots.filter(slot => {
        // Calculate duration if not provided
        let duration = slot.durationMinutes;
        if (!duration && slot.start && slot.end) {
          try {
            const startTime = moment(slot.start, 'HH:mm:ss');
            let endTime = moment(slot.end, 'HH:mm:ss');
            
            // Handle overnight slots
            if (endTime.isBefore(startTime)) {
              endTime.add(1, 'day');
            }
            
            duration = endTime.diff(startTime, 'minutes');
          } catch (err) {
            console.error('Error calculating duration:', err);
            return false;
          }
        }
        
        // Check if it's close to the original duration
        const durationDiff = Math.abs(duration - originalDuration);
        return durationDiff <= tolerance;
      });
      
      console.log(`Found ${matchingDurationSlots.length} slots matching the original duration of ${originalDuration} minutes (tolerance: ±${tolerance}min)`);
      
      // If we found slots matching the original duration, use those
      // Otherwise fall back to all available slots
      if (matchingDurationSlots.length > 0) {
        setFilteredSlots(matchingDurationSlots);
        setShowingOriginalDuration(true);
      } else {
        setFilteredSlots(availableSlots);
        setShowingOriginalDuration(false);
      }
    } else {
      setFilteredSlots([]);
    }
  }, [availableSlots, originalDuration]);
  // Helper to format time slots for display
  const formatSlotTime = (time) => {
    if (!time) {
      console.error('Invalid time provided to formatSlotTime:', time);
      return '–';
    }
    
    try {
      const parsed = moment(time, 'HH:mm:ss');
      if (!parsed.isValid()) {
        console.error('Invalid time format:', time);
        return time; // Return original if parsing fails
      }
      return parsed.format('h:mm A');
    } catch (error) {
      console.error('Error formatting time:', error, time);
      return time; // Return original on error
    }
  };

  // Handle time selection
  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    if (validateTimeFormat(newTime)) {
      setSelectedTime(newTime);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 'bold',
          fontSize: { xs: '1rem', sm: '1.1rem' },
          color: '#845EC2'
        }}>
                  {translations.selectTime || 'Select Time'} ({originalDuration || 120} min):
      </Typography>
        
        {/* View mode toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          size="small"
          sx={{ 
            '.MuiToggleButton-root': {
              padding: '4px 8px',
            }
          }}
        >
          <ToggleButton value="list" aria-label="list view" sx={{ 
            color: viewMode === 'list' ? '#845EC2' : 'inherit', 
            borderColor: '#845EC2'
          }}>
            <ViewList fontSize="small" />
          </ToggleButton>
          <ToggleButton value="timeline" aria-label="timeline view" sx={{ 
            color: viewMode === 'timeline' ? '#845EC2' : 'inherit',
            borderColor: '#845EC2'
          }}>
            <AccessTime fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      {viewMode === 'list' ? (
        // List view
        <FormControl fullWidth variant="outlined" size="small">
          <InputLabel id="time-select-label">{translations.selectTime || 'Select Time'}</InputLabel>
          <Select
            labelId="time-select-label"
            id="time-select"
            value={selectedTime || ''}
            onChange={handleTimeChange}
            label={translations.selectTime || 'Select Time'}
            disabled={!selectedDate || !selectedTeacher || availableSlots.length === 0}
          >
            {loadingAllTeachers ? (
              <MenuItem disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} thickness={5} sx={{ color: '#845EC2' }} />
                  <span>{translations.loadingTeachers || 'Loading available times...'}</span>
                </Box>
              </MenuItem>
            ) : filteredSlots.length > 0 ? (
              filteredSlots.map((slot) => (
                <MenuItem 
                  key={`${slot.start}-${slot.end}`} 
                  value={slot.start}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.08)' : 'rgba(132, 94, 194, 0.2)',
                      fontWeight: 'medium',
                    }
                  }}
                >
                  {`${slot.formattedStart || formatSlotTime(slot.start)} - ${slot.formattedEnd || formatSlotTime(slot.end)} (${slot.durationMinutes || Math.floor((new Date(`2000-01-01T${slot.end}`) - new Date(`2000-01-01T${slot.start}`)) / 60000)}min)`}
                </MenuItem>
              ))
            ) : selectedDate && selectedTeacher ? (
              <MenuItem disabled>
                {translations.noTimesAvailable || 'No available time slots for this teacher on the selected date'}
              </MenuItem>
            ) : selectedDate ? (
              <MenuItem disabled>
                {translations.selectTeacher || 'Please select a teacher'}
              </MenuItem>
            ) : (
              <MenuItem disabled>
                {translations.selectDateAndTeacher || 'Please select a date and teacher'}
              </MenuItem>
            )}
          </Select>
        </FormControl>
      ) : (
        // Timeline view
        <Grid container spacing={1}>
          {loadingAllTeachers ? (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2 }}>
                <CircularProgress size={20} thickness={5} sx={{ color: '#845EC2' }} />
                <Typography variant="body2">
                  {translations.loadingTeachers || 'Loading available times...'}
                </Typography>
              </Box>
            </Grid>
          ) : filteredSlots.length > 0 ? (
            filteredSlots.map((slot) => (
              <Grid item xs={6} sm={4} key={`${slot.start}-${slot.end}`}>
                <Box 
                  onClick={() => setSelectedTime(slot.start)}
                  sx={{
                    padding: '8px 12px',
                    border: '1px solid',
                    borderColor: selectedTime === slot.start ? '#845EC2' : 'rgba(0,0,0,0.12)',
                    borderRadius: '8px',
                    backgroundColor: selectedTime === slot.start ? '#845EC2' : 'transparent',
                    color: selectedTime === slot.start ? '#fff' : 'inherit',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: selectedTime === slot.start ? '#845EC2' : 'rgba(132, 94, 194, 0.08)',
                      borderColor: '#845EC2',
                    },
                  }}
                >
                  <Typography variant="body2">
                    {`${slot.formattedStart || formatSlotTime(slot.start)} - ${slot.formattedEnd || formatSlotTime(slot.end)} (${slot.durationMinutes || Math.floor((new Date(`2000-01-01T${slot.end}`) - new Date(`2000-01-01T${slot.start}`)) / 60000)}min)`}
                  </Typography>
                </Box>
              </Grid>
            ))
          ) : selectedDate && selectedTeacher ? (
            <Grid item xs={12}>
              <Typography 
                variant="body2" 
                sx={{ 
                  textAlign: 'center', 
                  py: 2, 
                  color: theme.text?.secondary
                }}
              >
                {translations.noTimesAvailable || 'No available time slots for this teacher on the selected date'}
              </Typography>
            </Grid>
          ) : availableSlots.length > 0 && filteredSlots.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {translations.noDurationMatchingSlots || `No ${originalDuration}-minute time slots available. Please contact admin to schedule a ${originalDuration}-minute class.`}
              </Alert>
              <Typography variant="body2" sx={{ textAlign: 'center', py: 1 }}>
                {translations.tryAnotherDay || 'Please try selecting another day or teacher.'}
              </Typography>
            </Grid>
          ) : (
            <Grid item xs={12}>
              <Typography 
                variant="body2" 
                sx={{ 
                  textAlign: 'center', 
                  py: 2, 
                  color: theme.text?.secondary
                }}
              >
                {translations.selectDateAndTeacher || 'Please select a date and teacher'}
              </Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default TimeSlotSelector;