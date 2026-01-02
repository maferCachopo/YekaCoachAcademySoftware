'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, CircularProgress, Alert,
  Snackbar
} from '@mui/material';
import moment from 'moment';
import 'moment-timezone';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { studentAPI, packageAPI, teacherAPI, timezoneUtils, availabilityAPI } from '../../../utils/api';
import { COMMON_TRANSITION, ADMIN_TIMEZONE } from '../../../constants/styleConstants';
import { getCookie, COOKIE_NAMES } from '../../../utils/cookieUtils';

// Import sub-components
import { 
  DateSelector, 
  TeacherSelector, 
  TimeSlotSelector, 
  PackageInfo,
  ClassSummary
} from './RescheduleModal/index';

const RescheduleModalContainer = ({ open, onClose, event, onReschedule }) => {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  
  // Extract class details from the event
  const eventStartDate = event?.start ? new Date(event.start) : null;
  const eventEndDate = event?.end ? new Date(event.end) : null;
  const eventClassDate = event?.classDetail?.date ? new Date(event.classDetail.date) : null;
  const eventClassStartTime = event?.classDetail?.startTime;
  const eventClassEndTime = event?.classDetail?.endTime;
  
  // Calculate duration in minutes
  const originalDuration = useMemo(() => {
    // First priority: Calculate from eventClassStartTime and eventClassEndTime
    if (eventClassStartTime && eventClassEndTime) {
      try {
        // Parse the time strings (format: HH:MM:SS)
        const startParts = eventClassStartTime.split(':').map(Number);
        const endParts = eventClassEndTime.split(':').map(Number);
        
        // Create Date objects for calculation
        const start = new Date(0);
        start.setHours(startParts[0], startParts[1], startParts[2] || 0);
        
        const end = new Date(0);
        end.setHours(endParts[0], endParts[1], endParts[2] || 0);
        
        // Handle cases where end time is on the next day (e.g., 8:32 PM - 10:32 PM or 22:00 - 00:30)
        if (end < start || (endParts[0] < startParts[0] && endParts[0] < 12)) {
          console.log("End time appears to be on next day, adjusting calculation");
          end.setDate(end.getDate() + 1);
        }
        
        // Calculate duration in minutes
        const durationMs = end.getTime() - start.getTime();
        const durationMin = durationMs / (1000 * 60);
        console.log(`Calculated duration from class times: ${durationMin} minutes`);
        return durationMin;
      } catch (err) {
        console.error("Error calculating duration from class times:", err);
      }
    }
    
    // Second priority: Calculate from event start/end dates
    if (eventStartDate && eventEndDate) {
      const durationMin = (eventEndDate.getTime() - eventStartDate.getTime()) / (1000 * 60);
      console.log(`Calculated duration from event dates: ${durationMin} minutes`);
      return durationMin;
    }
    
    // Default fallback
    console.log("Using default duration of 120 minutes (no time data available)");
    return 120; // Default to 2 hours
  }, [eventStartDate, eventEndDate, eventClassStartTime, eventClassEndTime]);
  
  // Debug the event object - placed after all variables are initialized
  useEffect(() => {
    if (open) {
      console.log("RescheduleModal opened with event:", event);
      
      // Log detailed time information
      console.log("Event Time Details:", {
        startDate: eventStartDate,
        endDate: eventEndDate,
        classDate: eventClassDate,
        startTime: eventClassStartTime,
        endTime: eventClassEndTime,
        calculatedDuration: originalDuration
      });
    }
  }, [open, event, eventStartDate, eventEndDate, eventClassDate, eventClassStartTime, eventClassEndTime, originalDuration]);
  
  // States for the form
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDateTime, setSelectedDateTime] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [assignedTeachers, setAssignedTeachers] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [useAnotherTeacher, setUseAnotherTeacher] = useState(false);
  const [allowDifferentTeacher, setAllowDifferentTeacher] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [packageInfo, setPackageInfo] = useState(null);
  const [packageEndDate, setPackageEndDate] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'timeline'
  
  // Loading and validation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [loadingAllTeachers, setLoadingAllTeachers] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [loadingDates, setLoadingDates] = useState(false);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'info' });
  
  // Handle mobile detection
  const checkIsMobile = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 600;
    }
    return false;
  };
  const [isMobile, setIsMobile] = useState(checkIsMobile());
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Update selectedDateTime whenever selectedDate or selectedTime changes
  useEffect(() => {
    console.log("Date or time changed:", { 
      selectedDate: selectedDate?.format('YYYY-MM-DD'), 
      selectedTime 
    });
    
    if (selectedDate && selectedTime) {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const timeStr = selectedTime;
      const dateTimeStr = `${dateStr}T${timeStr}`;
      setSelectedDateTime(moment(dateTimeStr));
      console.log("Updated selectedDateTime:", dateTimeStr);
    } else {
      setSelectedDateTime(null);
      console.log("Cleared selectedDateTime because", !selectedDate ? "date is missing" : "time is missing");
    }
  }, [selectedDate, selectedTime]);

  // Fetch package info when event changes
  useEffect(() => {
    const fetchPackageInfo = async () => {
      if (!event) {
        console.error('No event provided for package fetching');
        setLoadingPackage(false);
        return;
      }
      
      try {
        setLoadingPackage(true);
        
        // Get student ID from the event
        const studentId = event?.studentId || event?.extendedProps?.studentId;
        if (!studentId) {
          console.error('No student ID found in event');
          throw new Error('No student ID found in event');
        }
        
        // Get package ID from the event
        let packageId = event.studentPackageId || event.extendedProps?.packageId;
        if (!packageId) {
          console.error('No package ID found in event');
          throw new Error('No package ID found in event');
        }
        
        // Fetch all student packages to find the active one
        const studentPackages = await studentAPI.getStudentPackages(studentId);
        
        if (!studentPackages || !Array.isArray(studentPackages) || studentPackages.length === 0) {
          console.error('No packages found for student');
          throw new Error('No packages found for student');
        }
        
        // Find the active package or the specific package from the event
        let activePackage = studentPackages.find(pkg => 
          (pkg.id == packageId || pkg.packageId == packageId) && pkg.status === 'active'
        );
        
        // If no active package with matching ID, try to find any active package
        if (!activePackage) {
          activePackage = studentPackages.find(pkg => pkg.status === 'active');
        }
        
        // If still no active package, use the specific package from the event
        if (!activePackage) {
          activePackage = studentPackages.find(pkg => pkg.id == packageId || pkg.packageId == packageId);
        }
        
        // If still no package found, use the first one
        if (!activePackage && studentPackages.length > 0) {
          activePackage = studentPackages[0];
        }
        
        if (!activePackage) {
          console.error('No valid package found for student');
          throw new Error('No valid package found for student');
        }
        
        console.log('Using package:', activePackage);
        setPackageInfo(activePackage);
        
        // Calculate end date using the same logic as the dashboard
        let packageEndDate;
        
        // First try: Use endDate directly
        if (activePackage.endDate) {
          packageEndDate = parseDate(activePackage.endDate);
          console.log('Using endDate from package:', activePackage.endDate);
        }
        // Second try: Calculate from startDate and durationMonths
        else if (activePackage.startDate && activePackage.package?.durationMonths) {
          packageEndDate = calculatePackageEndDate(
            activePackage.startDate,
            activePackage.package.durationMonths
          );
          console.log('Calculated end date from duration months:', packageEndDate.format('YYYY-MM-DD'));
        }
        else {
          console.error('Cannot determine package end date - missing required data');
          throw new Error('Cannot determine package end date - missing required data');
        }
        
        // Validate the calculated end date
        if (!packageEndDate || !packageEndDate.isValid()) {
          console.error('Invalid package end date calculated');
          throw new Error('Invalid package end date calculated');
        }
        
        setPackageEndDate(packageEndDate);
        generateAvailableDates(packageEndDate);
      } catch (error) {
        console.error('Error in package fetch flow:', error);
        setMessage({
          open: true,
          text: `Error loading package information: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setLoadingPackage(false);
      }
    };
    
    // Generate available dates based on teacher schedules and package end date
    const generateAvailableDates = async (endDate) => {
      if (!endDate) {
        console.error('No end date provided for generating available dates');
        setLoadingDates(false);
        return;
      }
      
      setLoadingDates(true);
      try {
        const today = moment().startOf('day');
        let end = moment(endDate).endOf('day');
        
        // Validate end date
        if (!end.isValid()) {
          console.error('Invalid package end date');
          throw new Error('Invalid package end date');
        }
        
        // If end date is in the past, there are no valid dates for rescheduling
        if (end.isBefore(today)) {
          console.error('Package end date is in the past');
          setAvailableDates([]);
          setLoadingDates(false);
          return;
        }
        
        // Get the student ID from the event
        const studentId = event?.studentId || event?.extendedProps?.studentId;
        if (!studentId) {
          console.error('No student ID found in event');
          throw new Error('No student ID found in event');
        }
        
        // Get the teacher ID from the event
        const teacherId = event?.teacherId || event?.classDetail?.teacherId || event?.extendedProps?.teacherId;
        
        // For API calls, limit to 90 days to avoid performance issues
        // But we'll still respect the actual end date for UI display
        let apiEndDate = end.clone();
        const maxApiEnd = today.clone().add(90, 'days');
        
        if (end.isAfter(maxApiEnd)) {
          console.log('Package end date is more than 90 days away, limiting API call to 90 days');
          apiEndDate = maxApiEnd;
        }
        
        // Use the API endpoint to get available dates
        const response = await availabilityAPI.getAvailableDates(
          today.format('YYYY-MM-DD'),
          apiEndDate.format('YYYY-MM-DD'),
          studentId,
          teacherId
        );
        
        if (!response || !response.availableDates || response.availableDates.length === 0) {
          console.warn('No available dates returned from API');
          setAvailableDates([]);
          setLoadingDates(false);
          return;
        }
        
        // Convert string dates to moment objects and filter to ensure they're within package validity
        const availableMomentDates = response.availableDates
          .map(dateStr => moment(dateStr))
          .filter(date => date.isSameOrAfter(today) && date.isSameOrBefore(end));
        
        console.log(`Found ${availableMomentDates.length} available dates within package validity period`);
        setAvailableDates(availableMomentDates);
        
        // Pre-select the first available date if there are any
        if (availableMomentDates.length > 0) {
          setSelectedDate(availableMomentDates[0]);
        } else {
          setSelectedDate(null);
        }
      } catch (error) {
        console.error('Error generating available dates:', error);
        setAvailableDates([]);
        setMessage({
          open: true,
          text: `Error loading available dates: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setLoadingDates(false);
      }
    };
    
    if (event && open) {
      fetchPackageInfo();
      fetchTeacherInfo();
    } else {
      setPackageInfo(null);
      setPackageEndDate(null);
      setAvailableDates([]);
      setSelectedDate(null);
      setSelectedTime('');
      setSelectedTeacher(null);
    }
  }, [event, open]);
  
  // Fetch teacher information when event changes
  const fetchTeacherInfo = async () => {
    if (!event?.teacher?.id && !event?.teacherId && !event?.extendedProps?.teacherId) {
      console.log('No teacher information in the event');
      return;
    }
    
    try {
      // Extract teacher ID from the event
      const teacherId = event?.teacher?.id || event?.teacherId || event?.extendedProps?.teacherId;
      console.log('Fetching teacher info for ID:', teacherId);
      
      if (!teacherId) {
        console.warn('No valid teacher ID found');
        return;
      }
      
      if (event?.teacher) {
        console.log('Teacher already in event:', event.teacher);
        // If teacher is already in the event, use that
        setAssignedTeachers([event.teacher]);
        setSelectedTeacher(event.teacher);
        return;
      }
      
      const teacherData = await teacherAPI.getTeacher(teacherId);
      console.log('Teacher data fetched:', teacherData);
      
      if (teacherData) {
        setAssignedTeachers([teacherData]);
        setSelectedTeacher(teacherData);
      }
    } catch (error) {
      console.error('Error fetching teacher:', error);
    }
  };
  
  // Store previous selected date to prevent unnecessary fetches
  const prevSelectedDateRef = useRef(null);
  
  // Debounce function to prevent multiple rapid API calls
  const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    
    return debouncedValue;
  };
  
  // Debounce the selected date to prevent multiple rapid API calls
  const debouncedSelectedDate = useDebounce(selectedDate, 300);
  
  // Fetch all available teachers when a date is selected
  useEffect(() => {
    // Skip if no date is selected or modal is closed
    if (!debouncedSelectedDate || !open) {
      return;
    }
    
    // Skip if the date hasn't actually changed (prevent duplicate calls)
    const currentDateStr = debouncedSelectedDate.format('YYYY-MM-DD');
    if (prevSelectedDateRef.current === currentDateStr) {
      console.log("Skipping fetch - same date as before:", currentDateStr);
      return;
    }
    
    console.log("Date selection changed - selectedDate:", currentDateStr);
    prevSelectedDateRef.current = currentDateStr;
    
    // Signal that we're starting to load teacher data
    setLoadingAllTeachers(true);
    
    const fetchAvailableTeachers = async () => {
      // Extract studentId from different possible locations in the event object
      const studentId = event?.studentId || 
                        event?.extendedProps?.studentId || 
                        event?.classDetail?.studentId ||
                        event?.student?.id;
      
      if (!studentId) {
        console.error("Missing studentId in event:", event);
        setMessage({
          open: true,
          text: "Error: Student information is missing",
          severity: "error"
        });
        return;
      }
      
      try {
        console.log("Starting to fetch teacher availability");
        setLoadingAllTeachers(true);
        const formattedDate = debouncedSelectedDate.format('YYYY-MM-DD');
        
        // Use our endpoint to get all teachers with availability data
        console.log('Fetching teacher availability with studentId:', studentId, "for date:", formattedDate);
        const response = await teacherAPI.getAllTeachersAvailability(formattedDate, studentId);
        console.log('All teachers availability response:', response);
        
        // Check if student is restricted and has no teachers available
        if (response && response.restricted) {
          setMessage({
            open: true,
            text: response.message || 'You are not allowed to reschedule with different teachers. Please contact support.',
            severity: "warning"
          });
          setLoadingAllTeachers(false);
          return;
        }
        
        // Store the student's allowDifferentTeacher permission for UI control
        const studentAllowDifferentTeacher = response?.allowDifferentTeacher || false;
        setAllowDifferentTeacher(studentAllowDifferentTeacher);
        console.log(`DEBUG - Student allowDifferentTeacher: ${studentAllowDifferentTeacher}`);
        
        // Debug: Check if we're getting any teachers with slots
        if (response && response.teachers) {
          const teachersWithSlots = response.teachers.filter(t => 
            t.availableSlots && t.availableSlots.length > 0
          );
          console.log(`Found ${teachersWithSlots.length} teachers with available slots out of ${response.teachers.length} total teachers`);
        }
        
        if (response && response.teachers) {
          // Process teachers data
          const primaryTeachers = [];
          const otherAvailableTeachers = [];
          
          // Get the user's timezone for converting slots
          const userTimezone = getCookie(COOKIE_NAMES.TIMEZONE);
          
          response.teachers.forEach(teacherData => {
            // Convert available slots from admin timezone to user timezone
            let convertedSlots = [];
            if (teacherData.availableSlots && teacherData.availableSlots.length > 0) {
              // Log original slots for debugging
              console.log(`Converting ${teacherData.availableSlots.length} slots for teacher ${teacherData.teacher?.id}`);
              console.log('Original slots sample:', teacherData.availableSlots[0]);
              
              // First convert all slots to user timezone
              convertedSlots = teacherData.availableSlots.map(slot => {
                // Convert start and end times to user timezone
                const slotDate = formattedDate;

                // Ensure slot object exists and has start/end properties
                if (!slot || typeof slot !== 'object') {
                  console.error('Invalid slot object:', slot);
                  return null; // Skip this slot
                }

                // Handle different property name formats from API
                // Some slots use 'start'/'end', others use 'startTime'/'endTime'
                let slotStart = slot.start || slot.startTime;
                let slotEnd = slot.end || slot.endTime;

                // Ensure we have valid start and end times
                if (!slotStart || !slotEnd || typeof slotStart !== 'string' || typeof slotEnd !== 'string') {
                  console.error('Invalid slot times:', slot);
                  return null; // Skip this slot
                }

                // Validate time format
                if (!validateTimeFormat(slotStart) || !validateTimeFormat(slotEnd)) {
                  console.error('Invalid time format in slot:', slot);
                  return null; // Skip this slot
                }

                try {
                  const startInUserTz = timezoneUtils.convertToUserTime(
                    slotDate,
                    slotStart,
                    ADMIN_TIMEZONE,
                    userTimezone
                  );

                  const endInUserTz = timezoneUtils.convertToUserTime(
                    slotDate,
                    slotEnd,
                    ADMIN_TIMEZONE,
                    userTimezone
                  );
                  
                  if (!startInUserTz || !endInUserTz) {
                    console.error('Time conversion failed for slot:', slot);
                    return null; // Skip this slot
                  }
                  
                  // Calculate duration, handling overnight slots
                  let durationMinutes;
                  if (endInUserTz.isBefore(startInUserTz)) {
                    // This is an overnight slot
                    const adjustedEnd = endInUserTz.clone().add(1, 'day');
                    durationMinutes = adjustedEnd.diff(startInUserTz, 'minutes');
                  } else {
                    durationMinutes = endInUserTz.diff(startInUserTz, 'minutes');
                  }
                  
                  // Create a properly formatted slot with all necessary fields
                  const formattedSlot = {
                    ...slot,
                    start: startInUserTz.format('HH:mm:ss'),
                    end: endInUserTz.format('HH:mm:ss'),
                    originalStart: slotStart, // Keep original for reference
                    originalEnd: slotEnd,     // Keep original for reference
                    formattedStart: startInUserTz.format('h:mm A'),
                    formattedEnd: endInUserTz.format('h:mm A'),
                    // Add date for reference
                    date: slotDate,
                    // Add duration in minutes
                    durationMinutes: durationMinutes
                  };
                  
                  console.log('Formatted slot with duration:', formattedSlot);
                  return formattedSlot;
                } catch (error) {
                  console.error('Error converting slot times:', error, slot);
                  return null; // Skip this slot
                }
              })
              .filter(Boolean) // Remove any null entries
              
              // Note: Not filtering by duration here to keep all options
              // We'll filter when a teacher is selected to prioritize slots that match original duration
            }
            
            // Create enriched teacher object with availability info
            const enrichedTeacher = {
              ...teacherData.teacher,
              availableSlots: convertedSlots,
              slotsCount: convertedSlots.length
            };
            
            // Categorize as primary or other teacher
            if (teacherData.isPrimary) {
              primaryTeachers.push(enrichedTeacher);
            } else if (studentAllowDifferentTeacher) {
              // Only add different teachers if student is allowed to use them
              otherAvailableTeachers.push(enrichedTeacher);
            }
            // If student is not allowed different teachers, skip non-primary teachers
          });
          
          // Make sure we show both primary teachers and existing assigned teachers
          // Primary teachers come from the API response
          if (primaryTeachers.length > 0) {
            console.log(`Found ${primaryTeachers.length} primary teachers from API`);
            
            // Just use primary teachers from the API directly
            setAssignedTeachers(primaryTeachers);
            
            // Auto-select the first assigned teacher with available slots
            const firstTeacherWithSlots = primaryTeachers.find(t => t.slotsCount > 0);
            if (firstTeacherWithSlots) {
              console.log(`Selected teacher ${firstTeacherWithSlots.id} with ${firstTeacherWithSlots.slotsCount} available slots`);
              
              // Check if slots are properly formatted
              if (firstTeacherWithSlots.availableSlots && firstTeacherWithSlots.availableSlots.length > 0) {
                const sampleSlot = firstTeacherWithSlots.availableSlots[0];
                console.log('Sample slot from teacher:', {
                  start: sampleSlot.start,
                  end: sampleSlot.end,
                  formattedStart: sampleSlot.formattedStart,
                  formattedEnd: sampleSlot.formattedEnd,
                  date: sampleSlot.date
                });
              }
              
              setSelectedTeacher(firstTeacherWithSlots);
              
              // Make a clean copy of the slots array to ensure it's properly updated in state
              const slotsCopy = [...(firstTeacherWithSlots.availableSlots || [])];
              console.log(`Setting ${slotsCopy.length} slots for teacher ${firstTeacherWithSlots.id}`);
              setAvailableSlots(slotsCopy);
              
              // Pre-select the first available time slot
              if (firstTeacherWithSlots.availableSlots && firstTeacherWithSlots.availableSlots.length > 0) {
                setSelectedTime(firstTeacherWithSlots.availableSlots[0].start);
                console.log(`Pre-selected time slot: ${firstTeacherWithSlots.availableSlots[0].start}`);
              }
            } else if (assignedTeachers.length > 0) {
              // If no teacher has slots, select the first one anyway
              console.log(`No teacher with slots found. Selected first teacher ${assignedTeachers[0].id} with no slots`);
              setSelectedTeacher(assignedTeachers[0]);
              setAvailableSlots([]);
              setSelectedTime('');
              
              // And suggest other teachers
              setUseAnotherTeacher(true);
            }
          }
          
          // Set other available teachers
          setAvailableTeachers(otherAvailableTeachers);
          
          // If there are no primary teachers but we have assignedTeachers from the event
          // Make sure these are still displayed even without availability data
          if (primaryTeachers.length === 0 && assignedTeachers.length > 0) {
            console.log('No primary teachers found but using assigned teachers from event:', assignedTeachers);
            // Keep the existing assigned teachers but mark them as having no slots
            const preservedTeachers = assignedTeachers.map(teacher => ({
              ...teacher,
              availableSlots: [],
              slotsCount: 0
            }));
            setAssignedTeachers(preservedTeachers);
          }
        }
      } catch (error) {
        console.error('Error fetching available teachers:', error);
        
        // Create a dummy teacher if we couldn't get any
        if (availableTeachers.length === 0 && assignedTeachers.length === 0) {
          // If we have a teacher in the event, use that
          if (event?.teacher) {
            console.log('Using teacher from event as fallback:', event.teacher);
            const fallbackTeacher = {
              id: event.teacher.id || 1,
              firstName: event.teacher.firstName || 'Default',
              lastName: event.teacher.lastName || 'Teacher',
              availableSlots: [],
              slotsCount: 0
            };
            setAssignedTeachers([fallbackTeacher]);
            setSelectedTeacher(fallbackTeacher);
          }
        }
        
        setMessage({
          open: true,
          text: `Error loading teacher availability: ${error.message || 'Unknown error'}`,
          severity: "error"
        });
      } finally {
        // Even if there was an error, make sure we clear the loading state
        setLoadingAllTeachers(false);
      }
    };
    
    // Execute the fetch
    fetchAvailableTeachers();
  }, [debouncedSelectedDate, event, open]);
  
  // Reset teacher data when date is cleared
  useEffect(() => {
    if (!selectedDate) {
      setSelectedTeacher(null);
      setAvailableSlots([]);
    }
  }, [selectedDate]);
  
  // Debug effect dependencies
  useEffect(() => {
    console.log("DEBUG - Effect dependencies changed:", {
      selectedDateExists: !!selectedDate,
      selectedDateValue: selectedDate?.format('YYYY-MM-DD'),
      debouncedDateExists: !!debouncedSelectedDate,
      debouncedDateValue: debouncedSelectedDate?.format('YYYY-MM-DD'),
      eventStudentIdExists: !!event?.studentId,
      eventStudentIdValue: event?.studentId,
      assignedTeachersCount: assignedTeachers?.length,
      prevSelectedDate: prevSelectedDateRef.current
    });
  }, [selectedDate, debouncedSelectedDate, event?.studentId, assignedTeachers]);
  
  // Helper function to parse dates
  const parseDate = (dateString) => {
    // Try different formats
    let result = moment(dateString);
    if (result.isValid()) {
      return result;
    }
    
    // Try ISO format
    result = moment(new Date(dateString));
    if (result.isValid()) {
      return result;
    }
    
    // Try DD/MM/YYYY
    result = moment(dateString, 'DD/MM/YYYY');
    if (result.isValid()) {
      return result;
    }
    
    // Try MM/DD/YYYY
    result = moment(dateString, 'MM/DD/YYYY');
    if (result.isValid()) {
      return result;
    }
    
    // Try YYYY-MM-DD
    result = moment(dateString, 'YYYY-MM-DD');
    if (result.isValid()) {
      return result;
    }
    
    // Fallback - just use a month from now
    console.warn('Could not parse date string:', dateString);
    return moment().add(1, 'month');
  };
  
  // Validate time format
  const validateTimeFormat = (time) => {
    // Simple validation for HH:MM:SS or HH:MM format
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    return regex.test(time);
  };
  
  // Format event date for display
  const getFormattedEventDate = () => {
    if (eventClassDate && eventClassStartTime && eventClassEndTime) {
      const formattedDate = moment(eventClassDate).format('dddd, MMMM D');
      const formattedStartTime = moment(`2000-01-01T${eventClassStartTime}`).format('h:mm A');
      const formattedEndTime = moment(`2000-01-01T${eventClassEndTime}`).format('h:mm A');
      return `${formattedDate} at ${formattedStartTime} - ${formattedEndTime}`;
    } else if (eventStartDate && eventEndDate) {
      const formattedDate = moment(eventStartDate).format('dddd, MMMM D');
      const formattedStartTime = moment(eventStartDate).format('h:mm A');
      const formattedEndTime = moment(eventEndDate).format('h:mm A');
      return `${formattedDate} at ${formattedStartTime} - ${formattedEndTime}`;
    }
    return translations.unknownDate || 'Unknown date';
  };
  
  // Format class duration for display
  const getFormattedDuration = () => {
    if (originalDuration === 60) {
      return '1 hour';
    } else {
      return `${originalDuration} minutes`;
    }
  };
  
      // Calculate package end date based on duration months
  const calculatePackageEndDate = (startDate, durationMonths) => {
    if (!startDate || !durationMonths) {
      console.error('Missing required data for package end date calculation');
      throw new Error('Invalid package data: Missing start date or duration');
    }
    
    const start = moment(startDate);
    return start.clone().add(durationMonths, 'months');
  };
  
  // Format package end date for display
  const getFormattedPackageEndDate = () => {
    if (packageEndDate && packageEndDate.isValid()) {
      return packageEndDate.format('MMMM D, YYYY');
    }
    return 'Unknown date';
  };
  
  // Helper function to filter slots by duration
  const filterSlotsByDuration = (slots, targetDuration, tolerance = 15) => {
    if (!slots || !Array.isArray(slots)) return [];
    
    console.log(`Filtering ${slots.length} slots to match ${targetDuration}min duration (±${tolerance}min tolerance)`);
    
    const filteredSlots = slots.filter(slot => {
      if (!slot) return false;
      
      // Calculate slot duration if not already provided
      let slotDuration = slot.durationMinutes;
      
      // If duration isn't already calculated, we'll calculate it
      if (!slotDuration && slot.start && slot.end) {
        try {
          // Parse times
          const startTime = moment(slot.start, 'HH:mm:ss');
          const endTime = moment(slot.end, 'HH:mm:ss');
          
          // Handle end time on next day
          if (endTime.isBefore(startTime)) {
            endTime.add(1, 'day');
          }
          
          slotDuration = endTime.diff(startTime, 'minutes');
          console.log(`Calculated slot duration: ${slot.formattedStart}-${slot.formattedEnd} = ${slotDuration} minutes`);
        } catch (err) {
          console.error('Error calculating duration:', err);
          slotDuration = 0;
        }
      }
      
      // Check if it's within tolerance
      const durationDiff = Math.abs(slotDuration - targetDuration);
      const isMatchingDuration = durationDiff <= tolerance;
      
      if (!isMatchingDuration) {
        console.log(`Slot ${slot.formattedStart}-${slot.formattedEnd} has duration ${slotDuration}min, which differs from target ${targetDuration}min by ${durationDiff}min`);
      }
      
      return isMatchingDuration;
    });
    
    console.log(`Found ${filteredSlots.length} slots with durations close to ${targetDuration}min`);
    return filteredSlots;
  };
  
  // Handle teacher selection
  const handleSelectTeacher = (teacher) => {
    console.log(`Selecting teacher ${teacher?.id} with ${teacher?.availableSlots?.length || 0} slots`);
    
    // Deep copy of the teacher to avoid reference issues
    const selectedTeacherCopy = teacher ? { ...teacher } : null;
    setSelectedTeacher(selectedTeacherCopy);
    
    // Ensure we have valid slots
    if (teacher && teacher.availableSlots && Array.isArray(teacher.availableSlots) && teacher.availableSlots.length > 0) {
      // Deep copy the slots array and ensure proper formatting
      const slotsCopy = teacher.availableSlots.map(slot => {
        // Make sure each slot has formatted times
        const formattedSlot = {
          ...slot,
          // Ensure these properties exist
          formattedStart: slot.formattedStart || moment(slot.start, 'HH:mm:ss').format('h:mm A'),
          formattedEnd: slot.formattedEnd || moment(slot.end, 'HH:mm:ss').format('h:mm A')
        };
        return formattedSlot;
      });
      
      console.log(`Found ${slotsCopy.length} total slots for teacher ${teacher.id}`);
      console.log('First slot example:', slotsCopy[0]);
      
      // Filter slots by duration
      const durationFilteredSlots = filterSlotsByDuration(slotsCopy, originalDuration);
      
      // If no slots with matching duration, fallback to all slots but show a warning
      if (durationFilteredSlots.length === 0 && slotsCopy.length > 0) {
        console.warn(`No slots found with duration matching the original class (${originalDuration}min). Using all available slots.`);
        
        // Log the durations of all available slots for debugging
        const durations = slotsCopy.map(slot => {
          let duration = slot.durationMinutes;
          if (!duration && slot.start && slot.end) {
            try {
              // Parse times
              const startTime = moment(slot.start, 'HH:mm:ss');
              const endTime = moment(slot.end, 'HH:mm:ss');
              
              // Handle end time on next day
              if (endTime.isBefore(startTime)) {
                endTime.add(1, 'day');
              }
              
              duration = endTime.diff(startTime, 'minutes');
            } catch (err) {
              duration = 0;
            }
          }
          return `${slot.formattedStart}-${slot.formattedEnd}: ${duration}min`;
        });
        console.log("Available slot durations:", durations);
        
        setAvailableSlots(slotsCopy);
        setMessage({
          open: true,
          text: `No time slots found with the original class duration (${Math.round(originalDuration)} minutes). Showing all available times instead.`,
          severity: 'warning'
        });
      } else {
        setAvailableSlots(durationFilteredSlots);
      }
      
      // Make sure we select a valid time slot, prioritizing one with matching duration
      const slotsToUse = durationFilteredSlots.length > 0 ? durationFilteredSlots : slotsCopy;
      
      if (slotsToUse.length > 0 && slotsToUse[0].start) {
        console.log(`Setting selected time to ${slotsToUse[0].start} (duration: ${slotsToUse[0].durationMinutes || 'unknown'}min)`);
        setSelectedTime(slotsToUse[0].start);
      }
    } else {
      console.log('No available slots for selected teacher');
      setAvailableSlots([]);
      setSelectedTime('');
    }
  };
  
  // Toggle between assigned teacher and other teachers
  const handleToggleTeacherView = () => {
    setUseAnotherTeacher(!useAnotherTeacher);
    if (useAnotherTeacher && assignedTeachers.length > 0) {
      setSelectedTeacher(assignedTeachers[0]);
    }
  };
  
  // Handle confirm button click
  const handleConfirm = () => {
    // Validate form
    if (!selectedDate || !selectedTime || !selectedTeacher) {
      setValidationError(translations.selectDateTimeTeacher || 'Please select a date, time, and teacher.');
      return;
    }
    
    if (!selectedDateTime) {
      setValidationError(translations.invalidDateTime || 'Invalid date or time selected.');
      return;
    }
    
    // Convert the selected date/time to admin timezone before saving
    const adminDateTime = timezoneUtils.convertFromUserToAdminTime(
      selectedDateTime.format('YYYY-MM-DD'),
      selectedDateTime.format('HH:mm:ss'),
      getCookie(COOKIE_NAMES.TIMEZONE)
    );
    
    // Check if the selected date is in the past
    if (adminDateTime.isBefore(moment())) {
      setValidationError(translations.cannotRescheduleInPast || 'You cannot reschedule a class to a time in the past.');
      return;
    }
    
    // Calculate end time based on duration
    const endDateTime = adminDateTime.clone().add(originalDuration, 'minutes');
    
    // Determine if this is a different teacher than the originally assigned one
    const isPrimaryTeacher = assignedTeachers.length > 0 && selectedTeacher.id === assignedTeachers[0]?.id;
    const isDifferentTeacher = useAnotherTeacher && !isPrimaryTeacher;
    
    // Prepare the data for the callback
    const rescheduleData = {
      classId: event.classId || event.id,
      studentId: event.studentId,
      packageId: event.packageId || event.studentPackageId,
      date: adminDateTime.format('YYYY-MM-DD'),
      startTime: adminDateTime.format('HH:mm:ss'),
      endTime: endDateTime.format('HH:mm:ss'),
      teacher: selectedTeacher,  // Add the selected teacher to the data
      teacherId: selectedTeacher.id, // Explicit teacherId field
      differentTeacher: isDifferentTeacher // Flag if teacher changed
    };
    
    // If using a different teacher, show a confirmation dialog
    if (isDifferentTeacher) {
      // Temporary confirmation - in a real app this might be a modal dialog
      const confirmMessage = translations.confirmDifferentTeacher || 
        `You are scheduling with ${selectedTeacher.firstName} ${selectedTeacher.lastName} instead of your regular teacher. Continue?`;
      
      if (!window.confirm(confirmMessage)) {
        return; // User cancelled
      }
    }
    
    // Clear validation error and set submitting state
    setValidationError('');
    setIsSubmitting(true);
    
    // Call the parent component's callback function
    if (onReschedule) {
      onReschedule(rescheduleData)
        .then(() => {
          setIsSubmitting(false);
          onClose();
        })
        .catch(error => {
          console.error('Error rescheduling class:', error);
          setIsSubmitting(false);
          setValidationError(error.message || translations.errorRescheduling || 'Error rescheduling class. Please try again.');
        });
    } else {
      console.log('Reschedule data:', rescheduleData);
      setIsSubmitting(false);
      onClose();
    }
  };
  
  // Handle closing the message
  const handleCloseMessage = () => {
    setMessage({ ...message, open: false });
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: isMobile ? 0 : 2,
            transition: COMMON_TRANSITION,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          },
        }}
      >
      <DialogTitle sx={{ 
        bgcolor: theme.background?.paper || '#ffffff', 
        color: theme.text?.primary || '#212121',
        borderBottom: `1px solid ${theme.divider || '#eeeeee'}`,
        py: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography component="div" variant="h6" sx={{ fontWeight: 'bold' }}>
          {translations.rescheduleClass || 'Reschedule Class'}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ 
        bgcolor: theme.background?.default || '#f5f5f5',
        py: 3,
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 200px)'
      }}>
        <Box sx={{ px: { xs: 0, sm: 1 } }}>
          {/* Class Summary */}
          <ClassSummary 
            selectedTeacher={selectedTeacher}
            getFormattedEventDate={getFormattedEventDate}
            getFormattedDuration={getFormattedDuration}
            translations={translations}
            theme={theme}
          />
          
          {/* Package Info */}
          <PackageInfo 
            packageInfo={packageInfo}
            loadingPackage={loadingPackage}
            translations={translations}
            packageEndDate={packageEndDate}
            getFormattedPackageEndDate={getFormattedPackageEndDate}
          />
          
          {/* Date Selector */}
          <DateSelector 
            availableDates={availableDates}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            translations={translations}
            loadingPackage={loadingDates || loadingPackage}
          />
          
          {/* Teacher Selection - Only shown after date is selected */}
          {selectedDate && (
            <>
              {/* Teacher Selector - Show with loading indicator if no teachers are loaded yet */}
              {loadingAllTeachers ? (
                <Box sx={{ mt: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    color: '#845EC2',
                    mr: 2
                  }}>
                    {translations.loadingTeachers || 'Loading teachers...'}
                  </Typography>
                  <CircularProgress size={24} thickness={5} sx={{ color: '#845EC2' }} />
                </Box>
              ) : (
                <TeacherSelector
                  assignedTeachers={assignedTeachers}
                  availableTeachers={availableTeachers}
                  selectedTeacher={selectedTeacher}
                  handleSelectTeacher={handleSelectTeacher}
                  useAnotherTeacher={assignedTeachers.length === 0 || useAnotherTeacher}
                  allowDifferentTeacher={allowDifferentTeacher}
                  handleToggleTeacherView={handleToggleTeacherView}
                  availableSlots={availableSlots}
                  loadingAllTeachers={loadingAllTeachers}
                  translations={translations}
                />
              )}
            </>
          )}

          {/* Available Time Slots with View Toggle */}
          {selectedDate && (
            <TimeSlotSelector 
              selectedDate={selectedDate}
              selectedTeacher={selectedTeacher}
              viewMode={viewMode}
              setViewMode={setViewMode}
              availableSlots={availableSlots || []}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              translations={translations}
              theme={theme}
              validateTimeFormat={validateTimeFormat}
              loadingAllTeachers={loadingAllTeachers || !selectedTeacher}
              originalDuration={originalDuration}
            />
          )}
          
          {/* Validation error */}
          {validationError && (
            <Alert severity="error" sx={{ mt: 2, mb: 0 }}>
              {validationError}
            </Alert>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        bgcolor: theme.background?.paper || '#ffffff',
        borderTop: `1px solid ${theme.divider || '#eeeeee'}`,
        p: 2,
        gap: 1
      }}>
        <Button 
          onClick={onClose} 
          variant="outlined" 
          color="inherit"
          sx={{ 
            color: theme.text?.secondary || '#757575',
            borderColor: theme.divider || '#eeeeee'
          }}
        >
          {translations.cancel || 'Cancel'}
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="primary"
          disabled={
            isSubmitting || 
            !selectedDate || 
            !selectedTime || 
            !selectedTeacher ||
            availableSlots.length === 0
          }
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ 
            bgcolor: '#845EC2',
            color: '#fff',
            '&:hover': {
              bgcolor: '#6A4B9D',
            },
            '&.Mui-disabled': {
              bgcolor: 'rgba(132, 94, 194, 0.3)',
              color: 'rgba(255, 255, 255, 0.7)',
            }
          }}
        >
          {isSubmitting 
            ? (translations.rescheduling || 'Rescheduling...') 
            : (translations.confirm || 'Confirm')}
        </Button>
      </DialogActions>
    </Dialog>
      
      {/* Error message snackbar */}
      <Snackbar 
        open={message.open} 
        autoHideDuration={6000} 
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseMessage} 
          severity={message.severity} 
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RescheduleModalContainer;