'use client';
import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Snackbar, Alert, Stack
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTheme } from '@/app/contexts/ThemeContext';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { adminAPI, teacherAPI } from '@/app/utils/api';
import ThemeTransition from '@/app/components/ThemeTransition';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/app/components/ThemeToggle';
import LanguageToggle from '@/app/components/LanguageToggle';

// Generate time slots from 8 AM to 10 PM (hourly blocks)
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 22; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const displayTime = hour <= 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
    if (hour === 12) {
      slots.push({ time: timeString, display: '12:00 PM' });
    } else {
      slots.push({ time: timeString, display: displayTime });
    }
  }
  return slots;
};

// Generate week days starting from Monday
const generateWeekDays = (weekStart) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    days.push({
      date: format(date, 'yyyy-MM-dd'),
      display: format(date, 'EEE dd/MM'),
      fullDate: date
    });
  }
  return days;
};

export default function TeacherSchedule() {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const router = useRouter();

  // State management
  const [loading, setLoading] = useState(true);
  const [allTeachers, setAllTeachers] = useState([]);
  const [currentTeacherIndex, setCurrentTeacherIndex] = useState(0);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [refreshTick, setRefreshTick] = useState(0);
  
  const timeSlots = generateTimeSlots();
  const weekDays = generateWeekDays(currentWeekStart);

  // Fetch all teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const teachers = await adminAPI.getAllTeachers();
        setAllTeachers(teachers);
        if (teachers.length > 0) {
          setCurrentTeacherIndex(0);
        }
      } catch (error) {
        console.error('Error fetching teachers:', error);
        setMessage({
          open: true,
          text: error.message || 'Failed to fetch teachers data',
          severity: 'error'
        });
      }
    };

    fetchTeachers();
  }, []);

  // Fetch schedule data for current teacher and week
  useEffect(() => {
    const fetchScheduleData = async () => {
      if (allTeachers.length === 0) return;
      
      try {
        setLoading(true);
        const currentTeacher = allTeachers[currentTeacherIndex];
        if (!currentTeacher) return;

        // Format dates for the current week
        const startDate = format(currentWeekStart, 'yyyy-MM-dd');
        const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
        
        // Fetch teacher schedule
        const schedule = await teacherAPI.getSchedule(currentTeacher.id, {
          startDate,
          endDate
        });
        
        setTeacherSchedule(schedule);
      } catch (error) {
        console.error('Error fetching schedule data:', error);
        setMessage({
          open: true,
          text: error.message || 'Failed to fetch schedule data',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchScheduleData();
  }, [allTeachers, currentTeacherIndex, currentWeekStart, refreshTick]);

  // Navigation handlers
  const handlePreviousTeacher = () => {
    if (currentTeacherIndex > 0) {
      setCurrentTeacherIndex(currentTeacherIndex - 1);
    }
  };

  const handleNextTeacher = () => {
    if (currentTeacherIndex < allTeachers.length - 1) {
      setCurrentTeacherIndex(currentTeacherIndex + 1);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  // Refresh data
  const handleRefresh = () => {
    setRefreshTick((x) => x + 1);
  };

  // Get cell content for a specific time and day
  const getCellContent = (timeSlot, day) => {
    if (!teacherSchedule) return null;

    const classes = teacherSchedule.classes || [];
    const activities = teacherSchedule.activities || [];
    
    // Check if this day is a working day for the teacher
    const workingDays = teacherSchedule.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayOfWeek = format(day.fullDate, 'EEEE').toLowerCase();
    
    // If this is not a working day, show as non-working day
    if (!workingDays.includes(dayOfWeek)) {
      return (
        <Box sx={{ 
          backgroundColor: 'rgba(158, 158, 158, 0.1)',
          border: '1px solid #9e9e9e',
          borderRadius: 1,
          p: 0.5,
          fontSize: '0.75rem',
          textAlign: 'center'
        }}>
          <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
            Non-working day
          </Typography>
        </Box>
      );
    }
    
    // Find classes for this time slot and day
    const dayClasses = classes.filter(cls => {
      if (cls.date !== day.date) return false;
      
      const classStartHour = parseInt(cls.startTime?.split(':')[0] || '0');
      const slotHour = parseInt(timeSlot.time.split(':')[0]);
      
      return classStartHour === slotHour;
    });

    // Find activities for this time slot and day
    const dayActivities = activities.filter(activity => {
      if (activity.date !== day.date) return false;
      
      const activityStartHour = parseInt(activity.startTime?.split(':')[0] || '0');
      const slotHour = parseInt(timeSlot.time.split(':')[0]);
      
      return activityStartHour === slotHour;
    });

    // Check work hours and break hours
    const workHours = teacherSchedule.workHours || {};
    const breakHours = teacherSchedule.breakHours || {};
    
    const dayWorkHours = workHours[dayOfWeek] || [];
    const dayBreakHours = breakHours[dayOfWeek] || [];
    
    const slotHour = parseInt(timeSlot.time.split(':')[0]);
    
    // Check if this time is within work hours
    const isWorkTime = dayWorkHours.some(slot => {
      const startHour = parseInt(slot.start?.split(':')[0] || '0');
      const endHour = parseInt(slot.end?.split(':')[0] || '0');
      return slotHour >= startHour && slotHour < endHour;
    });
    
    // Check if this time is a break
    const isBreakTime = dayBreakHours.some(slot => {
      const startHour = parseInt(slot.start?.split(':')[0] || '0');
      const endHour = parseInt(slot.end?.split(':')[0] || '0');
      return slotHour >= startHour && slotHour < endHour;
    });

    if (dayClasses.length > 0) {
      return dayClasses.map(cls => (
        <Box key={cls.id} sx={{ 
          backgroundColor: 'rgba(211, 47, 47, 0.1)',
          border: '1px solid #d32f2f',
          borderRadius: 1,
          p: 0.5,
          mb: 0.5,
          fontSize: '0.75rem'
        }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
            {cls.title || 'Class'}
          </Typography>
          {cls.students && cls.students.length > 0 && (
            <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>
              {cls.students[0].name} {cls.students[0].surname}
            </Typography>
          )}
        </Box>
      ));
    }

    if (dayActivities.length > 0) {
      return dayActivities.map(activity => (
        <Box key={activity.id} sx={{ 
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          border: '1px solid #1976d2',
          borderRadius: 1,
          p: 0.5,
          mb: 0.5,
          fontSize: '0.75rem'
        }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            {activity.title || 'Activity'}
          </Typography>
        </Box>
      ));
    }

    if (isBreakTime) {
      return (
        <Box sx={{ 
          backgroundColor: 'rgba(46, 125, 50, 0.1)',
          border: '1px solid #2e7d32',
          borderRadius: 1,
          p: 0.5,
          fontSize: '0.75rem',
          textAlign: 'center'
        }}>
          <Typography variant="caption" sx={{ color: '#2e7d32' }}>
            Break
          </Typography>
        </Box>
      );
    }

    if (isWorkTime) {
      return (
        <Box sx={{ 
          backgroundColor: 'rgba(0, 150, 136, 0.1)',
          border: '1px dashed #00695c',
          borderRadius: 1,
          p: 0.5,
          fontSize: '0.75rem',
          textAlign: 'center'
        }}>
          <Typography variant="caption" sx={{ color: '#00695c' }}>
            Available
          </Typography>
        </Box>
      );
    }

    return null; // No work time, empty cell
  };

  const currentTeacher = allTeachers[currentTeacherIndex];

  if (loading) {
    return (
      <ThemeTransition
        component={Box}
        sx={{ 
          background: theme?.background?.default,
          px: { xs: 1, sm: 2, md: 3 },
          py: { xs: 2, sm: 3 },
          height: '100%',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <CircularProgress sx={{ color: '#845EC2' }} />
      </ThemeTransition>
    );
  }

  return (
    <ThemeTransition
      component={Box}
      sx={{ 
        background: theme?.background?.default,
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 2, sm: 3 },
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'auto',
      }}
    >
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: { xs: 2, sm: 3 },
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: theme?.text?.primary,
            fontWeight: 'bold',
            fontSize: { xs: '1.4rem', sm: '1.7rem' },
          }}
        >
          {translations.teacherSchedule || 'Teacher Schedule'}
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1, sm: 2 }, 
          alignItems: 'center',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <ThemeToggle />
          <LanguageToggle />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{
              borderColor: 'rgba(132, 94, 194, 0.5)',
              color: theme?.text?.primary,
              '&:hover': {
                borderColor: '#845EC2',
                backgroundColor: 'rgba(132, 94, 194, 0.08)',
              },
            }}
          >
            {translations.refresh || 'Refresh'}
          </Button>
        </Box>
      </Box>
      
      {/* Teacher Navigation */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        mb: 3,
        gap: 2
      }}>
        <IconButton 
          onClick={handlePreviousTeacher}
          disabled={currentTeacherIndex === 0}
          sx={{ 
            color: theme?.text?.primary,
            '&:disabled': { color: theme?.text?.disabled }
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ 
          color: theme?.text?.primary,
          minWidth: 200,
          textAlign: 'center'
        }}>
          {currentTeacher ? `${currentTeacher.firstName} ${currentTeacher.lastName}` : 'Loading...'}
        </Typography>
        
        <IconButton 
          onClick={handleNextTeacher}
          disabled={currentTeacherIndex === allTeachers.length - 1}
          sx={{ 
            color: theme?.text?.primary,
            '&:disabled': { color: theme?.text?.disabled }
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Week Navigation */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        mb: 3,
        gap: 2
      }}>
        <IconButton 
          onClick={handlePreviousWeek}
          sx={{ color: theme?.text?.primary }}
        >
          <NavigateBeforeIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ 
          color: theme?.text?.primary,
          minWidth: 300,
          textAlign: 'center'
        }}>
          {format(currentWeekStart, 'MMM dd')} - {format(addDays(currentWeekStart, 6), 'MMM dd, yyyy')}
        </Typography>
        
        <IconButton 
          onClick={handleNextWeek}
          sx={{ color: theme?.text?.primary }}
        >
          <NavigateNextIcon />
        </IconButton>
      </Box>

      {/* Schedule Table */}
      <Paper
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          background: theme?.card?.background || theme?.palette?.background?.paper,
          border: theme?.card?.border || 'none',
        }}
      >
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell 
                  sx={{ 
                    backgroundColor: theme?.card?.background || theme?.palette?.background?.paper,
                    fontWeight: 'bold',
                    minWidth: 100
                  }}
                >
                  Time
                </TableCell>
                {weekDays.map((day) => (
                  <TableCell 
                    key={day.date}
                    sx={{ 
                      backgroundColor: theme?.card?.background || theme?.palette?.background?.paper,
                      fontWeight: 'bold',
                      minWidth: 150,
                      textAlign: 'center'
                    }}
                  >
                    {day.display}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {timeSlots.map((timeSlot) => (
                <TableRow key={timeSlot.time}>
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold',
                      backgroundColor: theme?.mode === 'light' ? '#f5f5f5' : '#2c2c3a',
                      borderRight: 1,
                      borderColor: 'divider'
                    }}
                  >
                    {timeSlot.display}
                  </TableCell>
                  {weekDays.map((day) => (
                    <TableCell 
                      key={`${timeSlot.time}-${day.date}`}
                      sx={{ 
                        height: 60,
                        verticalAlign: 'top',
                        p: 1,
                        borderRight: 1,
                        borderColor: 'divider'
                      }}
                    >
                      {getCellContent(timeSlot, day)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme?.mode === 'light' ? 'rgba(211, 47, 47, 0.3)' : 'rgba(211, 47, 47, 0.1)', 
            border: `1px solid #d32f2f`, 
            borderRadius: 0.5 
          }} />
          <Typography variant="caption" sx={{ color: theme?.text?.primary, fontWeight: 500 }}>Classes</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme?.mode === 'light' ? 'rgba(25, 118, 210, 0.3)' : 'rgba(25, 118, 210, 0.1)', 
            border: `1px solid #1976d2`, 
            borderRadius: 0.5 
          }} />
          <Typography variant="caption" sx={{ color: theme?.text?.primary, fontWeight: 500 }}>Activities</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme?.mode === 'light' ? 'rgba(46, 125, 50, 0.3)' : 'rgba(46, 125, 50, 0.1)', 
            border: `1px solid #2e7d32`, 
            borderRadius: 0.5 
          }} />
          <Typography variant="caption" sx={{ color: theme?.text?.primary, fontWeight: 500 }}>Break</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme?.mode === 'light' ? 'rgba(0, 150, 136, 0.3)' : 'rgba(0, 150, 136, 0.1)', 
            border: `1px dashed #00695c`, 
            borderRadius: 0.5 
          }} />
          <Typography variant="caption" sx={{ color: theme?.text?.primary, fontWeight: 500 }}>Available</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ 
            width: 16, 
            height: 16, 
            backgroundColor: theme?.mode === 'light' ? 'rgba(158, 158, 158, 0.3)' : 'rgba(158, 158, 158, 0.1)', 
            border: `1px solid #9e9e9e`, 
            borderRadius: 0.5 
          }} />
          <Typography variant="caption" sx={{ color: theme?.text?.primary, fontWeight: 500 }}>Non-working day</Typography>
        </Stack>
      </Box>
      
      {/* Message Snackbar */}
      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={() => setMessage({ ...message, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setMessage({ ...message, open: false })} 
          severity={message.severity}
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </ThemeTransition>
  );
} 