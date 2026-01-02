'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  Grid,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Tabs,
  Tab,
  Chip,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Refresh as RefreshIcon,
  Event as EventIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { teacherAPI, fetchWithAuth, timezoneUtils } from '@/app/utils/api';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import ThemeTransition from '@/app/components/ThemeTransition';
import moment from 'moment';
import 'moment-timezone';
import { ADMIN_TIMEZONE } from '@/app/utils/constants';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`schedule-tabpanel-${index}`}
      aria-labelledby={`schedule-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function TeacherSchedule() {
  const { theme } = useTheme();
  const { translations, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [scheduleData, setScheduleData] = useState({
    activities: [],
    workHours: {},
    breakHours: {}
  });
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [error, setError] = useState(null);
  
  // Get student filter from URL if available
  const studentIdFilter = searchParams.get('studentId');
  const studentNameFilter = searchParams.get('studentName');
  
  // Week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  
  // Format week start and end for display
  const weekStart = format(weekDates[0], 'MMM dd');
  const weekEnd = format(weekDates[6], 'MMM dd, yyyy');

  // Fetch schedule data
  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        if (!user || !user.teacherId) {
          console.error('No teacher ID found in user data');
          return;
        }

        setLoading(true);
        
        // Format dates for API
        const formattedStartDate = format(currentWeekStart, 'yyyy-MM-dd');
        const formattedEndDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
        
        // Debug timezone information
        console.log('Current browser timezone:', moment.tz.guess());
        console.log('Admin timezone:', ADMIN_TIMEZONE);
        timezoneUtils.debugTimezone(formattedStartDate, '09:00:00', ADMIN_TIMEZONE);
        
        // Get schedule data (teacher's activities and classes)
        const data = await teacherAPI.getSchedule(user.teacherId, {
          startDate: formattedStartDate,
          endDate: formattedEndDate
        });
        
        // Get assigned students
        const students = await fetchWithAuth(`/teachers/${user.teacherId}/students`);
        
        // For each student, get their classes for the week
        let studentClasses = [];
        if (students && students.length > 0) {
          // Fetch classes for each student in the date range
          const promises = students.map(async (student) => {
            try {
              // Skip if we're filtering for a specific student and this isn't the one
              if (studentIdFilter && student.id.toString() !== studentIdFilter) {
                return [];
              }
              
              // Use fetchWithAuth for proper authentication
              const classes = await fetchWithAuth(`/students/${student.id}/classes?startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
                
              // Add student info to each class
              return classes.map(cls => ({
                ...cls,
                studentName: `${student.name} ${student.surname}`,
                studentId: student.id,
                isStudentClass: true
              }));
            } catch (error) {
              console.error(`Error fetching classes for student ${student.id}:`, error);
              setError(`Could not fetch classes for student ${student.name} ${student.surname}. ${error.message}`);
              return []; // Return empty array to continue with other students
            }
          });
          
          try {
            // Wait for all promises to resolve
            const results = await Promise.all(promises);
            
            // Flatten the array of arrays
            studentClasses = results.flat();
          } catch (error) {
            console.error('Error fetching student classes:', error);
            setError(`Could not fetch student classes: ${error.message}`);
          }
        }
        
        // Combine teacher's activities, student classes, and rescheduled classes
        let allActivities = [...(data.activities || []), ...studentClasses];
        
        // Apply student filter if present
        if (studentIdFilter) {
          allActivities = allActivities.filter(activity => 
            activity.studentId && activity.studentId.toString() === studentIdFilter
          );
        }
        
        // Handle rescheduled classes properly by identifying classes that have been rescheduled
        // StudentClass status will be 'rescheduled' for original classes that were rescheduled
        
        // Filter out classes that have been rescheduled and create a new array with processed activities
        allActivities = allActivities
          .filter(activity => {
            // Skip classes with 'rescheduled' status - these are the original classes that were rescheduled
            return activity.status !== 'rescheduled';
          })
          .map(activity => {
            // Create a new object to avoid mutating the original
            const processedActivity = {...activity};
            
            // If it's a student class that has originalClassId set, it means this is a rescheduled class
            if (activity.isStudentClass && activity.classDetail && activity.originalClassId) {
              // It's a rescheduled class, set the proper flag
              processedActivity.isRescheduled = true;
            }
            
            return processedActivity;
          });
        
        // Debugging
        console.log('Filtered activities:', {
          totalActivities: allActivities.length,
          rescheduledCount: allActivities.filter(a => a.isRescheduled).length,
          statusCounts: allActivities.reduce((counts, a) => {
            counts[a.status] = (counts[a.status] || 0) + 1;
            return counts;
          }, {})
        });
        
        setScheduleData({
          activities: allActivities,
          workHours: data.workHours,
          breakHours: data.breakHours
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching schedule data:', error);
        setError(`Failed to load schedule data: ${error.message}`);
        setLoading(false);
      }
    };

    if (user) {
      fetchScheduleData();
    }
  }, [user, currentWeekStart, studentIdFilter]);

  // Navigate to previous week
  const handlePrevWeek = () => {
    setCurrentWeekStart(prevWeek => addDays(prevWeek, -7));
  };

  // Navigate to next week
  const handleNextWeek = () => {
    setCurrentWeekStart(prevWeek => addDays(prevWeek, 7));
  };

  // Go to current week
  const handleCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Format time (HH:MM) and convert from admin timezone to user's preferred timezone
  const formatTime = (timeString, dateString) => {
    if (!timeString || !dateString) return '';
    // Use user's preferred timezone if available, otherwise use browser timezone
    const userTimezone = user && user.timezone ? user.timezone : null;
    return timezoneUtils.formatUserTime(dateString, timeString, ADMIN_TIMEZONE, userTimezone);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Format day name with localization
  const formatDayName = (date) => {
    // Use translation's day names if available
    if (language === 'es' && translations.dayNames) {
      // Get day index (0-6, where 0 is Sunday)
      const dayIndex = date.getDay();
      return translations.dayNames[dayIndex] || format(date, 'EEEE');
    }
    return format(date, 'EEEE');
  };

  // Format short date with localization
  const formatShortDate = (date) => {
    if (language === 'es') {
      // Spanish date format: day first, then month
      return format(date, 'd MMM');
    }
    return format(date, 'MMM dd');
  };

  // Get class status chip with translation
  const getStatusChip = (status) => {
    let color;
    let label;

    switch (status) {
      case 'scheduled':
        color = 'primary';
        label = translations.classScheduled || 'Scheduled';
        break;
      case 'completed':
        color = 'success';
        label = translations.classCompleted || 'Completed';
        break;
      case 'cancelled':
        color = 'error';
        label = translations.classCancelled || 'Cancelled';
        break;
      case 'in-progress':
        color = 'warning';
        label = translations.inProgress || 'In Progress';
        break;
      case 'rescheduled':
        color = 'info';
        label = translations.classRescheduled || 'Rescheduled';
        break;
      default:
        color = 'default';
        label = status;
    }
    
    return (
      <Chip 
        size="small" 
        label={label}
        color={color} 
        sx={{ 
          textTransform: 'capitalize',
          fontWeight: 500
        }} 
      />
    );
  };

  // Get classes for a specific day
  const getClassesForDay = (date) => {
    if (!scheduleData || !scheduleData.activities) return [];
    
    // Filter activities for this day
    return scheduleData.activities.filter(activity => {
      // Handle different data structures
      let classDate;
      
      if (activity.classDetail) {
        // Student class structure
        classDate = new Date(activity.classDetail.date);
      } else if (activity.isRescheduled) {
        // Rescheduled class structure
        // Use userDate if available (timezone-adjusted), otherwise fall back to regular date
        classDate = new Date(activity.userDate || activity.date);
      } else {
        // Regular teacher activity
        classDate = new Date(activity.date);
      }
      
      return isSameDay(classDate, date);
    }).map(activity => {
      // Normalize the data structure for display
      if (activity.classDetail) {
        // This is a student class
        return {
          id: activity.id,
          title: activity.classDetail.title,
          description: activity.classDetail.description,
          date: activity.classDetail.date,
          startTime: activity.classDetail.startTime,
          endTime: activity.classDetail.endTime,
          status: activity.status,
          isStudentClass: true,
          studentName: activity.studentName || 'Unknown Student',
          studentId: activity.studentId
        };
      } else if (activity.isRescheduled) {
              // This is a rescheduled class - structure is already normalized from the API
      // Add a flag to identify that this class was assigned to the current teacher after rescheduling
      return {
        ...activity,
        isRescheduled: true, // Ensure the flag is set
        wasReassigned: activity.differentTeacher || activity.isNewTeacher || 
                      (activity.oldTeacherId && activity.oldTeacherId !== activity.teacherId)
      };
      }
      
      // This is a teacher activity
      return activity;
    }).sort((a, b) => {
      // Sort by start time
      return a.startTime.localeCompare(b.startTime);
    });
  };

  return (
    <ThemeTransition
      component={Box}
      sx={{ 
        background: theme?.background?.default,
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 2, sm: 3 },
        minHeight: '100%',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: theme?.text?.primary,
            fontWeight: 'bold',
            fontSize: { xs: '1.4rem', sm: '1.7rem' },
            mb: 1
          }}
        >
          {translations.schedule || 'Schedule'}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: theme?.text?.secondary,
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            {translations.weekOf || 'Week of'} {weekStart} - {weekEnd}
          </Typography>
          
          {studentIdFilter && (
            <Chip
              icon={<FilterIcon />}
              label={`Filtered: ${studentNameFilter || 'Student'}`}
              color="secondary"
              onDelete={() => router.push('/teacher/schedule')}
              deleteIcon={<ClearIcon />}
              sx={{ ml: 2 }}
            />
          )}
        </Box>
      </Box>

      {/* Week Navigation */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: { xs: 2, sm: 0 }
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrevIcon />}
            onClick={handlePrevWeek}
            sx={{
              borderColor: 'rgba(132, 94, 194, 0.5)',
              color: theme?.text?.primary,
              '&:hover': {
                borderColor: '#845EC2',
                backgroundColor: 'rgba(132, 94, 194, 0.08)',
              },
            }}
          >
            {translations.prevWeek || 'Previous'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleCurrentWeek}
            sx={{
              borderColor: 'rgba(132, 94, 194, 0.5)',
              color: theme?.text?.primary,
              '&:hover': {
                borderColor: '#845EC2',
                backgroundColor: 'rgba(132, 94, 194, 0.08)',
              },
            }}
          >
            {translations.currentWeek || 'Current Week'}
          </Button>
          <Button
            variant="outlined"
            endIcon={<NextIcon />}
            onClick={handleNextWeek}
            sx={{
              borderColor: 'rgba(132, 94, 194, 0.5)',
              color: theme?.text?.primary,
              '&:hover': {
                borderColor: '#845EC2',
                backgroundColor: 'rgba(132, 94, 194, 0.08)',
              },
            }}
          >
            {translations.nextWeek || 'Next'}
          </Button>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            setLoading(true);
            setCurrentWeekStart(new Date(currentWeekStart));
          }}
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

      {/* Schedule Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ color: '#845EC2' }} />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {weekDates.map((date, index) => (
            <Grid item xs={12} key={index}>
              <Card 
                sx={{ 
                  borderRadius: 2,
                  boxShadow: theme?.mode === 'light' 
                    ? '0px 2px 10px rgba(0, 0, 0, 0.05)' 
                    : '0px 2px 10px rgba(0, 0, 0, 0.2)',
                  background: theme?.card?.background || theme?.palette?.background?.paper,
                  mb: 2,
                  overflow: 'hidden'
                }}
              >
                <Box 
                  sx={{ 
                    p: 2, 
                    borderBottom: '1px solid',
                    borderColor: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                    bgcolor: isSameDay(date, new Date()) ? 'rgba(132, 94, 194, 0.1)' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: isSameDay(date, new Date()) ? '#845EC2' : theme?.text?.primary
                    }}
                  >
                    {formatDayName(date)}
                    <Typography 
                      component="span" 
                      sx={{ 
                        ml: 1,
                        color: theme?.text?.secondary,
                        fontSize: '0.9rem'
                      }}
                    >
                      {formatShortDate(date)}
                    </Typography>
                  </Typography>
                  
                  {isSameDay(date, new Date()) && (
                    <Chip 
                      label={translations.today || "Today"} 
                      size="small" 
                      sx={{ 
                        bgcolor: '#845EC2',
                        color: 'white',
                        fontWeight: 'bold'
                      }} 
                    />
                  )}
                </Box>
                
                <Box sx={{ p: 0 }}>
                  {getClassesForDay(date).length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body1" sx={{ color: theme?.text?.secondary }}>
                        {translations.noClassesScheduled || 'No classes scheduled for this day.'}
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>{translations.time || 'Time'}</TableCell>
                            <TableCell>{translations.title || 'Title'}</TableCell>
                            <TableCell>{translations.students || 'Students'}</TableCell>
                            <TableCell>{translations.status || 'Status'}</TableCell>
                            <TableCell>{translations.type || 'Type'}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getClassesForDay(date).map((classItem) => (
                                                          <TableRow 
                              key={classItem.id}
                              sx={{
                                bgcolor: classItem.isRescheduled && (classItem.isNewTeacher || classItem.wasReassigned)
                                  ? (theme?.mode === 'light' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.25)')
                                  : classItem.isRescheduled
                                    ? (theme?.mode === 'light' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.25)')
                                    : studentIdFilter && classItem.studentId?.toString() === studentIdFilter
                                      ? (theme?.mode === 'light' ? 'rgba(132, 94, 194, 0.1)' : 'rgba(132, 94, 194, 0.2)')
                                      : classItem.isStudentClass 
                                        ? (theme?.mode === 'light' ? 'rgba(132, 94, 194, 0.05)' : 'rgba(132, 94, 194, 0.1)') 
                                        : 'transparent'
                              }}
                            >
                              <TableCell>{`${formatTime(classItem.startTime, classItem.date)} - ${formatTime(classItem.endTime, classItem.date)}`}</TableCell>
                              <TableCell>{classItem.title}</TableCell>
                              <TableCell>
                                {classItem.isStudentClass ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#845EC2' }}>
                                      {classItem.studentName}
                                    </Typography>
                                  </Box>
                                ) : (
                                  classItem.students?.map(student => `${student.name} ${student.surname}`).join(', ') || 'No students assigned'
                                )}
                              </TableCell>
                              <TableCell>
                                {getStatusChip(classItem.status)}
                                {classItem.isRescheduled && (
                                  <Chip 
                                    size="small" 
                                    label={classItem.isNewTeacher || classItem.wasReassigned ? (translations.newlyAssigned || "Newly Assigned") : (translations.rescheduled || "Rescheduled")} 
                                    color={classItem.isNewTeacher || classItem.wasReassigned ? "success" : "warning"} 
                                    variant="outlined"
                                    sx={{ ml: 1, fontWeight: 500 }}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Chip 
                                    size="small" 
                                    label={classItem.isStudentClass ? (translations.studentClass || "Student Class") : (translations.teacherClass || "Teacher Class")} 
                                    color={classItem.isStudentClass ? "secondary" : "primary"} 
                                    variant="outlined"
                                    sx={{ fontWeight: 500 }}
                                  />
                                  {classItem.isRescheduled && classItem.reason && (
                                    <Tooltip title={classItem.reason}>
                                      <Typography variant="caption" sx={{ color: theme?.text?.secondary, fontStyle: 'italic', mt: 0.5 }}>
                                        {(classItem.reason.length > 20) ? `${classItem.reason.substring(0, 20)}...` : classItem.reason}
                                      </Typography>
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
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