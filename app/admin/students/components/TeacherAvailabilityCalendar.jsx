'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import moment from 'moment';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ADMIN_TIMEZONE } from '../../../utils/constants';
import CalendarButtonFix from './CalendarButtonFix';

/**
 * Calendar component that displays a teacher's schedule and available slots
 * 
 * @param {Object} props
 * @param {Object} props.teacherSchedule - The teacher's schedule data
 * @param {boolean} props.loading - Whether the schedule is loading
 * @param {function} props.onSlotSelect - Callback when an available slot is selected
 * @param {Array} props.scheduledClasses - Currently scheduled classes for the student
 * @param {function} props.onAvailabilityValidation - Callback to provide validation function
 */
const TeacherAvailabilityCalendar = ({ 
  teacherSchedule, 
  loading, 
  onSlotSelect,
  scheduledClasses = [],
  onAvailabilityValidation
}) => {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const [events, setEvents] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [calendarView, setCalendarView] = useState('timeGridWeek');

  // Validation function to check if a class time is within teacher availability
  const validateClassTime = useCallback((date, startTime, endTime) => {
    if (!teacherSchedule || !teacherSchedule.workHours || !date || !startTime || !endTime) {
      return { valid: false, message: 'Invalid class time or teacher schedule not available' };
    }

    // Get the day of the week
    const dayOfWeek = moment(date).format('dddd').toLowerCase();
    
    // Check if teacher works on this day
    const workingDays = teacherSchedule.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    if (!workingDays.includes(dayOfWeek)) {
      return { valid: false, message: `Teacher does not work on ${dayOfWeek}s` };
    }
    
    const workSlots = teacherSchedule.workHours[dayOfWeek];
    
    if (!workSlots || !Array.isArray(workSlots)) {
      return { valid: false, message: `Teacher has no work hours set for ${dayOfWeek}s` };
    }

    // Convert class times to minutes for comparison
    const classStart = timeToMinutes(startTime);
    const classEnd = timeToMinutes(endTime);

    // Check if class time falls within any work slot
    const isWithinWorkHours = workSlots.some(slot => {
      const workStart = timeToMinutes(slot.start);
      const workEnd = timeToMinutes(slot.end);
      return classStart >= workStart && classEnd <= workEnd;
    });

    if (!isWithinWorkHours) {
      return { valid: false, message: `Class time is outside teacher's work hours` };
    }

    // Check if class overlaps with break hours
    if (teacherSchedule.breakHours && teacherSchedule.breakHours[dayOfWeek]) {
      const breakSlots = teacherSchedule.breakHours[dayOfWeek];
      const overlapsBreak = breakSlots.some(breakSlot => {
        const breakStart = timeToMinutes(breakSlot.start);
        const breakEnd = timeToMinutes(breakSlot.end);
        return (classStart < breakEnd && classEnd > breakStart);
      });

      if (overlapsBreak) {
        return { valid: false, message: `Class time overlaps with teacher's break time` };
      }
    }

    // Check if class overlaps with existing teacher classes
    if (teacherSchedule.classes && teacherSchedule.classes.length > 0) {
      const overlapsExistingClass = teacherSchedule.classes.some(existingClass => {
        if (existingClass.date !== date) return false;
        
        const existingStart = timeToMinutes(existingClass.startTime);
        const existingEnd = timeToMinutes(existingClass.endTime);
        return (classStart < existingEnd && classEnd > existingStart);
      });

      if (overlapsExistingClass) {
        return { valid: false, message: `Class time conflicts with teacher's existing class` };
      }
    }

    return { valid: true, message: 'Class time is valid' };
  }, [teacherSchedule]);

  // Provide validation function to parent component
  useEffect(() => {
    if (onAvailabilityValidation && teacherSchedule) {
      onAvailabilityValidation(validateClassTime);
    }
  }, [teacherSchedule, onAvailabilityValidation, validateClassTime]);
  
  // Process teacher schedule data into calendar events
  useEffect(() => {
    if (!teacherSchedule) return;
    
    const calendarEvents = [];
    
    // Add existing classes as blocked time slots (without showing student details)
    if (teacherSchedule.classes && teacherSchedule.classes.length > 0) {
      teacherSchedule.classes.forEach(cls => {
        if (!cls.date || !cls.startTime || !cls.endTime) return;
        
        const startDateTime = `${cls.date}T${cls.startTime}`;
        const endDateTime = `${cls.date}T${cls.endTime}`;
        
        calendarEvents.push({
          id: `class-${cls.id}`,
          title: 'Booked', // Don't show student names
          start: startDateTime,
          end: endDateTime,
          display: 'background',
          backgroundColor: theme.mode === 'light' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.3)',
          extendedProps: {
            type: 'bookedSlot'
          }
        });
      });
    }
    
    // Add work hours as background events
    if (teacherSchedule.workHours) {
      // Get the current week's dates
      const today = moment();
      const startOfWeek = today.clone().startOf('week');
      
      Object.entries(teacherSchedule.workHours).forEach(([day, slots]) => {
        if (!Array.isArray(slots)) return;
        
        // Map day string to day number (0 = Sunday, 1 = Monday, etc.)
        const dayMap = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        
        const dayNumber = dayMap[day.toLowerCase()];
        if (dayNumber === undefined) return;
        
        // Calculate the date for this day in the current week
        const dayDate = startOfWeek.clone().add(dayNumber, 'days').format('YYYY-MM-DD');
        
        slots.forEach((slot, index) => {
          if (!slot.start || !slot.end) return;
          
          const startDateTime = `${dayDate}T${slot.start}`;
          const endDateTime = `${dayDate}T${slot.end}`;
          
          calendarEvents.push({
            id: `work-${day}-${index}`,
            title: 'Work Hours',
            start: startDateTime,
            end: endDateTime,
            display: 'background',
            backgroundColor: theme.mode === 'light' ? 'rgba(33, 150, 243, 0.15)' : 'rgba(33, 150, 243, 0.25)',
            extendedProps: {
              type: 'workHours',
              day
            }
          });
        });
      });
    }
    
    // Add break hours as background events with different color
    if (teacherSchedule.breakHours) {
      const today = moment();
      const startOfWeek = today.clone().startOf('week');
      
      Object.entries(teacherSchedule.breakHours).forEach(([day, slots]) => {
        if (!Array.isArray(slots)) return;
        
        const dayMap = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        
        const dayNumber = dayMap[day.toLowerCase()];
        if (dayNumber === undefined) return;
        
        const dayDate = startOfWeek.clone().add(dayNumber, 'days').format('YYYY-MM-DD');
        
        slots.forEach((slot, index) => {
          if (!slot.start || !slot.end) return;
          
          const startDateTime = `${dayDate}T${slot.start}`;
          const endDateTime = `${dayDate}T${slot.end}`;
          
          calendarEvents.push({
            id: `break-${day}-${index}`,
            title: 'Break',
            start: startDateTime,
            end: endDateTime,
            display: 'background',
            backgroundColor: theme.mode === 'light' ? 'rgba(244, 67, 54, 0.15)' : 'rgba(244, 67, 54, 0.25)',
            extendedProps: {
              type: 'breakHours',
              day
            }
          });
        });
      });
    }
    
    // Add student's scheduled classes as events with a different color
    if (scheduledClasses && scheduledClasses.length > 0) {
      scheduledClasses.forEach((cls, index) => {
        if (!cls.date || !cls.startTime || !cls.endTime) return;
        
        const startDateTime = `${cls.date}T${cls.startTime}`;
        const endDateTime = `${cls.date}T${cls.endTime}`;
        
        calendarEvents.push({
          id: `scheduled-${index}`,
          title: 'New Class',
          start: startDateTime,
          end: endDateTime,
          backgroundColor: '#9c27b0',
          borderColor: '#7b1fa2',
          textColor: '#ffffff',
          extendedProps: {
            type: 'scheduledClass',
            index
          }
        });
      });
    }
    
    setEvents(calendarEvents);
    
    // Calculate available slots
    calculateAvailableSlots(teacherSchedule);
    
  }, [teacherSchedule, scheduledClasses, theme.mode]);
  
  // Calculate available time slots based on work hours and existing classes
  const calculateAvailableSlots = (schedule) => {
    if (!schedule || !schedule.workHours) return;
    
    const slots = [];
    const today = moment().tz(ADMIN_TIMEZONE);
    const startOfWeek = today.clone().startOf('week');
    // No end date limitation - allow navigation to any future date
    const bookedSlots = [];
    
    // Collect all booked time slots
    if (schedule.classes && schedule.classes.length > 0) {
      schedule.classes.forEach(cls => {
        if (!cls.date || !cls.startTime || !cls.endTime) return;
        
        bookedSlots.push({
          date: cls.date,
          start: cls.startTime,
          end: cls.endTime
        });
      });
    }
    
    // Add student's scheduled classes to booked slots
    if (scheduledClasses && scheduledClasses.length > 0) {
      scheduledClasses.forEach(cls => {
        if (!cls.date || !cls.startTime || !cls.endTime) return;
        
        bookedSlots.push({
          date: cls.date,
          start: cls.startTime,
          end: cls.endTime
        });
      });
    }
    
    // Process work hours for the next 8 weeks (2 months)
    for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
      const weekStart = startOfWeek.clone().add(weekOffset, 'weeks');
      
      Object.entries(schedule.workHours).forEach(([day, workSlots]) => {
      if (!Array.isArray(workSlots)) return;
      
      // Check if this day is a working day
      const workingDays = schedule.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      if (!workingDays.includes(day.toLowerCase())) return;
      
      const dayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };
      
      const dayNumber = dayMap[day.toLowerCase()];
      if (dayNumber === undefined) return;
      
      // Calculate the date for this day in the current week
      const dayDate = weekStart.clone().add(dayNumber, 'days').format('YYYY-MM-DD');
      
      // Skip past dates
      if (moment.tz(dayDate, ADMIN_TIMEZONE).isBefore(today, 'day')) return;
      
      // Get break hours for this day
      const breakSlots = schedule.breakHours && Array.isArray(schedule.breakHours[day]) 
        ? schedule.breakHours[day] 
        : [];
      
      workSlots.forEach(workSlot => {
        if (!workSlot.start || !workSlot.end) return;
        
        // Convert times to minutes for easier calculation
        const workStart = timeToMinutes(workSlot.start);
        const workEnd = timeToMinutes(workSlot.end);
        
        // Create 1-hour slots within work hours
        for (let slotStart = workStart; slotStart < workEnd; slotStart += 60) {
          const slotEnd = Math.min(slotStart + 60, workEnd);
          
          // Skip if slot is too short
          if (slotEnd - slotStart < 30) continue;
          
          const startTime = minutesToTime(slotStart);
          const endTime = minutesToTime(slotEnd);
          
          // Check if slot overlaps with any break
          const overlapsBreak = breakSlots.some(breakSlot => {
            const breakStart = timeToMinutes(breakSlot.start);
            const breakEnd = timeToMinutes(breakSlot.end);
            
            return (slotStart < breakEnd && slotEnd > breakStart);
          });
          
          if (overlapsBreak) continue;
          
          // Check if slot overlaps with any booked class
          const overlapsClass = bookedSlots.some(bookedSlot => {
            if (bookedSlot.date !== dayDate) return false;
            
            const classStart = timeToMinutes(bookedSlot.start);
            const classEnd = timeToMinutes(bookedSlot.end);
            
            return (slotStart < classEnd && slotEnd > classStart);
          });
          
          if (overlapsClass) continue;
          
          // This is an available slot
          slots.push({
            day,
            date: dayDate,
            start: startTime,
            end: endTime,
            startDateTime: `${dayDate}T${startTime}`,
            endDateTime: `${dayDate}T${endTime}`
          });
        }
      });
    });
    }
    
    setAvailableSlots(slots);
    
    // Add available slots to calendar events with clearer visualization
    const availableEvents = slots.map((slot, index) => ({
      id: `available-${index}`,
      title: 'Available',
      start: slot.startDateTime,
      end: slot.endDateTime,
      backgroundColor: theme.mode === 'light' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.4)',
      borderColor: '#4caf50',
      textColor: theme.mode === 'light' ? '#2e7d32' : '#81c784',
      extendedProps: {
        type: 'available',
        slot
      }
    }));
    
    setEvents(prev => [...prev, ...availableEvents]);
  };
  
  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // Helper function to convert minutes to time string
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Handle slot click
  const handleDateClick = (info) => {
    // Find if this is an available slot
    const availableSlot = availableSlots.find(slot => 
      slot.startDateTime === info.dateStr || 
      (info.dateStr >= slot.startDateTime && info.dateStr < slot.endDateTime)
    );
    
    if (availableSlot && onSlotSelect) {
      onSlotSelect(availableSlot);
    }
  };
  
  // Handle view change
  const handleViewChange = (view) => {
    setCalendarView(view.view.type);
  };
  
  // Handle date range change (when navigating between weeks/months)
  const handleDatesSet = (dateInfo) => {
    // When the visible date range changes, recalculate available slots
    if (teacherSchedule) {
      calculateAvailableSlots(teacherSchedule);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!teacherSchedule) {
    return (
      <Alert severity="info">
        {translations.selectTeacherFirst || 'Select a teacher to see their schedule'}
      </Alert>
    );
  }
  
  return (
    <>
      <CalendarButtonFix />
      <Box sx={{ 
      height: '500px',
      '& .fc': {
        fontFamily: 'inherit',
        '--fc-border-color': theme.mode === 'light' ? '#e0e0e0' : '#424242',
        '--fc-page-bg-color': theme.mode === 'light' ? '#ffffff' : '#1e1e2d',
        '--fc-neutral-bg-color': theme.mode === 'light' ? '#f5f5f5' : '#2c2c3a',
        '--fc-today-bg-color': theme.mode === 'light' ? 'rgba(3, 169, 244, 0.1)' : 'rgba(3, 169, 244, 0.2)',
        '--fc-event-bg-color': theme.mode === 'light' ? '#4caf50' : '#388e3c',
        '--fc-event-border-color': theme.mode === 'light' ? '#388e3c' : '#2e7d32',
        '--fc-event-text-color': '#ffffff',
        '--fc-event-selected-overlay-color': 'rgba(0, 0, 0, 0.25)',
        '--fc-more-link-bg-color': theme.mode === 'light' ? '#d0d0d0' : '#424242',
        '--fc-more-link-text-color': theme.mode === 'light' ? '#212121' : '#ffffff',
        '--fc-non-business-color': theme.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
        '--fc-highlight-color': theme.mode === 'light' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)',
        '--fc-button-text-color': theme.mode === 'light' ? '#212121' : '#ffffff',
        '--fc-button-bg-color': theme.mode === 'light' ? '#f5f5f5' : '#4caf50',
        '--fc-button-border-color': theme.mode === 'light' ? '#e0e0e0' : '#388e3c',
        '--fc-button-hover-bg-color': theme.mode === 'light' ? '#e0e0e0' : '#388e3c',
        '--fc-button-hover-border-color': theme.mode === 'light' ? '#d0d0d0' : '#2e7d32',
        '--fc-button-active-bg-color': theme.mode === 'light' ? '#d0d0d0' : '#388e3c',
        '--fc-button-active-border-color': theme.mode === 'light' ? '#bdbdbd' : '#2e7d32',
      },
      '& .fc-timegrid-slot': {
        height: '25px !important'
      },
      '& .fc-timegrid-slot-label': {
        fontSize: '0.75rem'
      },
      '& .fc-col-header-cell': {
        backgroundColor: theme.mode === 'light' ? '#f5f5f5' : '#2c2c3a',
      },
      '& .fc-day-today .fc-col-header-cell-cushion': {
        color: theme.mode === 'light' ? '#1976d2' : '#90caf9',
        fontWeight: 'bold'
      },
      '& .fc-event': {
        cursor: 'pointer'
      },
      '& .fc-event.available-slot': {
        backgroundColor: theme.mode === 'light' ? '#4caf50' : '#388e3c',
        borderColor: theme.mode === 'light' ? '#388e3c' : '#2e7d32',
      },
      '& .fc-prev-button, & .fc-next-button': {
        boxShadow: theme.mode === 'light' ? 'none' : '0 0 8px rgba(255,255,255,0.3)',
        fontSize: '1.1rem',
        fontWeight: 'bold',
      }
    }}>
      <Typography variant="body2" sx={{ mb: 1, color: theme.text?.secondary }}>
        {translations.clickAvailableSlot || 'Click on an available slot to schedule a class'}
      </Typography>
      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridWeek,timeGridDay'
        }}
        buttonText={{
          today: 'Today',
          week: 'Week',
          day: 'Day'
        }}
        slotMinTime="08:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        height="100%"
        events={events}
        dateClick={handleDateClick}
        viewDidMount={handleViewChange}
        datesSet={handleDatesSet}
        nowIndicator={true}
        navLinks={true} // Enable clicking on day/week names
        editable={false}
        selectable={false} // Disable date range selection
        selectMirror={false}
        dayMaxEvents={true} // Allow "more" link when too many events
        fixedWeekCount={false} // Allow variable number of weeks
        showNonCurrentDates={true} // Show dates from other months
        timeZone={ADMIN_TIMEZONE} // Ensure all times are in admin timezone
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          hour12: false
        }}
        eventClassNames={(arg) => {
          // Add special class for available slots
          if (arg.event.extendedProps?.type === 'available') {
            return ['available-slot'];
          }
          return [];
        }}
        eventContent={(eventInfo) => {
          // Only render content for available slots
          if (eventInfo.event.extendedProps?.type === 'available') {
            return (
              <Box sx={{ 
                fontSize: '0.75rem', 
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
                p: 0.5,
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                Available
              </Box>
            );
          }
          return null;
        }}
      />
    </Box>
    </>
  );
};

export default TeacherAvailabilityCalendar;