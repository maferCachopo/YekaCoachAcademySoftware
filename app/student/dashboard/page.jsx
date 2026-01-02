'use client';

import { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment-timezone';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, Typography, Button, Box, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Chip, ButtonGroup, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  Event as EventIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  MusicNote as MusicNoteIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Check as CheckIcon,
  Videocam as VideocamIcon,
  CalendarMonth as CalendarIcon,
  CalendarToday as CalendarTodayIcon
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI, timezoneUtils } from '../../utils/api';
import { COMMON_TRANSITION, ADMIN_TIMEZONE } from '../../constants/styleConstants';
import { getCookie, COOKIE_NAMES } from '../../utils/cookieUtils';
import RescheduleModal from '../profile/components/RescheduleModalContainer';

const localizer = momentLocalizer(moment);

// Using centralized timezone utilities instead of local conversion

// Update calendar styles for React Big Calendar
const calendarStyles = (theme) => ({
  '.rbc-calendar': {
    backgroundColor: theme.isDark ? '#1E2433' : '#fff',
    border: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
    borderRadius: '12px',
    height: '100%',
    width: '100%',
    fontFamily: 'inherit',
    overflow: 'hidden',
  },
  '.rbc-toolbar': {
    marginBottom: '15px',
    padding: '12px',
    backgroundColor: theme.isDark ? '#252d3d' : '#f5f5f5',
    borderRadius: '8px',
    '.rbc-toolbar-label': {
      color: theme.isDark ? '#fff' : '#000',
      fontSize: '1.1rem',
      fontWeight: 'bold',
    },
    '.rbc-btn-group': {
      button: {
        color: theme.isDark ? '#fff' : '#000',
        backgroundColor: theme.isDark ? '#1E2433' : '#fff',
        border: theme.isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
        padding: '6px 12px',
        fontSize: '0.9rem',
        '&.rbc-active': {
          backgroundColor: '#845EC2',
          borderColor: '#845EC2',
          color: '#fff',
        },
        '&:hover': {
          backgroundColor: theme.isDark ? 'rgba(132, 94, 194, 0.2)' : 'rgba(132, 94, 194, 0.1)',
        }
      }
    }
  },
  '.rbc-time-header': {
    backgroundColor: theme.isDark ? '#252d3d' : '#f5f5f5',
    border: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
  },
  '.rbc-header': {
    padding: '10px 6px',
    fontSize: '0.9rem',
    backgroundColor: theme.isDark ? '#252d3d' : '#f5f5f5',
    color: theme.isDark ? '#fff' : '#000',
    borderBottom: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
    fontWeight: 'bold'
  },
  '.rbc-time-content': {
    backgroundColor: theme.isDark ? '#1E2433' : '#fff',
    border: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
    overflowY: 'auto !important',
    '& .rbc-time-gutter': {
      backgroundColor: theme.isDark ? '#252d3d' : '#f5f5f5',
    }
  },
  '.rbc-timeslot-group': {
    borderBottom: theme.isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
    minHeight: '40px',  // Reduced height for better visibility of full day
  },
  '.rbc-time-slot': {
    color: theme.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
    fontSize: '0.8rem',
  },
  '.rbc-day-slot .rbc-event': {
    backgroundColor: props => props.color || '#845EC2',
    border: 'none',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    padding: '8px 10px',
    minWidth: '130px',
    minHeight: '40px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    }
  },
  '.rbc-event-content': {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    overflow: 'visible',
  },
  '.rbc-event-label': {
    fontSize: '0.8rem',
    display: 'block',
  },
  '.rbc-today': {
    backgroundColor: theme.isDark ? 'rgba(132, 94, 194, 0.15)' : 'rgba(132, 94, 194, 0.05)',
  },
  '.rbc-current-time-indicator': {
    backgroundColor: '#FF6F91',
    height: '2px',
  },
  '.rbc-off-range-bg': {
    backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
  },
  '.rbc-time-view': {
    border: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
    borderRadius: '0 0 12px 12px',
    height: '100%',
    overflow: 'hidden',
  },
  '.rbc-time-header-content': {
    borderLeft: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
  },
  '.rbc-time-header-gutter': {
    backgroundColor: theme.isDark ? '#252d3d' : '#f5f5f5',
  },
  '.rbc-label': {
    fontWeight: 'bold',
    padding: '6px',
  },
  // Add styles for agenda view
  '.rbc-agenda-view': {
    background: theme.isDark ? '#1E2433' : '#fff',
    table: {
      border: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
    },
    '.rbc-agenda-empty': {
      color: theme.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
      padding: '20px',
      textAlign: 'center',
    },
    '.rbc-agenda-date-cell': {
      padding: '10px',
      backgroundColor: theme.isDark ? '#252d3d' : '#f5f5f5',
      color: theme.isDark ? '#fff' : '#000',
      fontWeight: 'bold',
      borderBottom: theme.isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
    },
    '.rbc-agenda-time-cell': {
      padding: '10px',
      color: theme.isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
      borderBottom: theme.isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
    },
    '.rbc-agenda-event-cell': {
      padding: '10px',
      color: theme.isDark ? '#fff' : '#000',
      borderBottom: theme.isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
    },
  },
  // Style all-day events
  '.rbc-allday-cell': {
    backgroundColor: theme.isDark ? 'rgba(132, 94, 194, 0.1)' : 'rgba(132, 94, 194, 0.05)',
    minHeight: '50px',
  }
});

const StyledCard = ({ children, ...props }) => {
  const { theme } = useTheme();
  
  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02, translateY: -3 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        height: '100%',
        borderRadius: 2,
        background: theme.card.background,
        backdropFilter: 'blur(10px)',
        border: theme.card.border,
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        color: theme.text.primary,
        transition: COMMON_TRANSITION,
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

const StatCard = ({ icon: Icon, title, value, color, description }) => {
  const { theme } = useTheme();
  
  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02, translateY: -3 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        p: 2,
        minHeight: { xs: 100, sm: 120 },
        borderRadius: 2,
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        backdropFilter: 'blur(10px)',
        color: 'white',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        transition: COMMON_TRANSITION,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
        <Icon sx={{ fontSize: { xs: 36, sm: 48 }, transition: COMMON_TRANSITION }} />
        <Box sx={{ width: '100%' }}>
          <Typography 
            variant="body1"
            sx={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              mb: 0.5,
              fontWeight: 500,
              letterSpacing: '0.5px',
              fontSize: { xs: '0.9rem', sm: '1.1rem' },
              transition: COMMON_TRANSITION,
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="h3"
            sx={{ 
              color: 'white', 
              fontWeight: 700,
              letterSpacing: '0.5px',
              fontSize: typeof value === 'number' 
                ? { xs: '1.8rem', sm: '2.5rem' } 
                : { xs: '1.2rem', sm: '1.5rem' },
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: COMMON_TRANSITION,
            }}
          >
            {value}
          </Typography>
          {description && (
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: { xs: '0.75rem', sm: '0.9rem' },
                mt: 0.5,
                transition: COMMON_TRANSITION,
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  );
};

// Create a component for the Zoom link card
const ZoomCard = ({ zoomLink }) => {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  
  // Handle case when no zoom link is available
  if (!zoomLink) {
    return (
      <Card
        component={motion.div}
        whileHover={{ scale: 1.02, translateY: -3 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          p: 2,
          minHeight: { xs: 100, sm: 120 },
          borderRadius: 2,
          background: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          backdropFilter: 'blur(10px)',
          color: theme.text.primary,
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          transition: COMMON_TRANSITION,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <VideocamIcon sx={{ fontSize: { xs: 36, sm: 48 }, color: 'gray', transition: COMMON_TRANSITION }} />
          <Box sx={{ width: '100%' }}>
            <Typography 
              variant="body1"
              sx={{ 
                color: theme.text.secondary, 
                mb: 0.5,
                fontWeight: 500,
                letterSpacing: '0.5px',
                fontSize: { xs: '0.9rem', sm: '1.1rem' },
                transition: COMMON_TRANSITION,
              }}
            >
              {translations.zoomMeeting || 'Zoom Meeting'}
            </Typography>
            <Typography 
              variant="body2"
              sx={{ 
                color: theme.text.secondary, 
                fontWeight: 400,
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                transition: COMMON_TRANSITION,
              }}
            >
              {translations.noZoomLink || 'No Zoom link available'}
            </Typography>
          </Box>
        </Box>
      </Card>
    );
  }
  
  // When zoom link is available, make it clickable
  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02, translateY: -3 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => window.open(zoomLink, '_blank')}
      sx={{
        p: 2,
        minHeight: { xs: 100, sm: 120 },
        borderRadius: 2,
        background: `linear-gradient(135deg, #00A8B8 0%, #00A8B8dd 100%)`, // Zoom blue color
        backdropFilter: 'blur(10px)',
        color: 'white',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        transition: COMMON_TRANSITION,
        cursor: 'pointer',
        '&:hover': {
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
        <VideocamIcon sx={{ fontSize: { xs: 36, sm: 48 }, transition: COMMON_TRANSITION }} />
        <Box sx={{ width: '100%' }}>
          <Typography 
            variant="body1"
            sx={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              mb: 0.5,
              fontWeight: 500,
              letterSpacing: '0.5px',
              fontSize: { xs: '0.9rem', sm: '1.1rem' },
              transition: COMMON_TRANSITION,
            }}
          >
            {translations.zoomMeeting || 'Zoom Meeting'}
          </Typography>
          <Typography 
            variant="h3"
            sx={{ 
              color: 'white', 
              fontWeight: 700,
              letterSpacing: '0.5px',
              fontSize: { xs: '0.85rem', sm: '1rem' },
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: COMMON_TRANSITION,
            }}
          >
            {translations.joinMeeting || 'Join Meeting'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              mt: 0.5,
              transition: COMMON_TRANSITION,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {translations.clickToJoin || 'Click to join your class'}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

const Dashboard = () => {
  const authContext = useAuth() || {};
  const { user } = authContext;
  const { language, translations } = useLanguage();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState('upcoming');
  const [message, setMessage] = useState({ open: false, text: '', severity: 'info' });
  const [packageInfo, setPackageInfo] = useState({
    name: '',
    totalClasses: 0,
    remainingClasses: 0,
    rescheduleAllowed: 0,
    rescheduleRemaining: 0,
    validUntil: '',
    packageId: '',
    startDate: ''
  });
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [zoomLink, setZoomLink] = useState('');
  
  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    checkIsMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Listen for sidebar state changes
  useEffect(() => {
    // Function to handle sidebar state change events
    const handleSidebarChange = (event) => {
      if (event.detail && typeof event.detail.open === 'boolean') {
        setSidebarOpen(event.detail.open);
      }
    };

    // Add event listener for sidebar state changes
    window.addEventListener('sidebar_state_change', handleSidebarChange);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('sidebar_state_change', handleSidebarChange);
    };
  }, []);
  
  // Statistics
  const [stats, setStats] = useState({
    remainingClasses: 0,
    scheduledClasses: 0,
    completedClasses: 0,
    totalClasses: 0,
  });

  // Add the yellow color constant for passed classes
  const COLORS = {
    SCHEDULED: '#845EC2', // Purple
    RESCHEDULED: '#FF6F91', // Pink/reddish
    ATTENDED: '#FFCC29', // Yellow
  };

  // Define fetchStudentData outside useEffect so it can be called from other functions
  const fetchStudentData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check if we have a valid student ID in the user object
      if (!user.student || !user.student.id) {
        console.error('User is missing student data or student ID');
        setLoading(false);
        setMessage({
          open: true,
          text: translations.noStudentProfile || 'Your account is not properly linked to a student profile.',
          severity: 'warning'
        });
        return;
      }
      
      // Use student.id instead of user.id for API calls
      const studentId = user.student.id;
      console.log('Using student ID for API calls:', studentId);
      
      // Get the student details to get the zoom link
      try {
        const studentDetail = await studentAPI.getStudentById(studentId);
        console.log('Student details:', studentDetail);
        // Set the zoom link if available
        if (studentDetail && studentDetail.zoomLink) {
          setZoomLink(studentDetail.zoomLink);
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
      }
      
      // Fetch student's package information
      const studentPackages = await studentAPI.getStudentPackages(studentId);
      let activePackage = null;
      
      if (studentPackages && studentPackages.length > 0) {
        // Find the active package or use the first one
        activePackage = studentPackages.find(pkg => pkg.status === 'active') || studentPackages[0];
        
        setPackageInfo({
          name: activePackage.package?.name || translations.noPackageName || 'No Package Name',
          totalClasses: activePackage.package?.totalClasses || 0,
          remainingClasses: activePackage.remainingClasses || 0,
          rescheduleAllowed: activePackage.package?.maxReschedules || 0,
          rescheduleRemaining: (activePackage.package?.maxReschedules || 0) - (activePackage.usedReschedules || 0),
          validUntil: activePackage.endDate,
          packageId: activePackage.id,
          startDate: activePackage.startDate
        });
      } else {
        // No package found
        setPackageInfo({
          name: translations.noPackageAssigned || 'No Package Assigned',
          totalClasses: 0,
          remainingClasses: 0,
          rescheduleAllowed: 0,
          rescheduleRemaining: 0,
          validUntil: '',
          packageId: '',
          startDate: ''
        });
        
        // Set empty classes
        setClasses([]);
        setStats({
          remainingClasses: 0,
          scheduledClasses: 0,
          completedClasses: 0,
          totalClasses: 0
        });
        
        setLoading(false);
        return;
      }
      
      // Fetch student's classes with detailed information
      const studentClasses = await studentAPI.getStudentClasses(studentId);
      console.log('DEBUG - Raw Student Classes Response:', JSON.stringify(studentClasses));
      
      // IMPORTANT: Fetch rescheduled classes separately since they might not be included in studentClasses
      let reschedules = [];
      try {
        reschedules = await studentAPI.getStudentReschedules(studentId);
        console.log('Fetched reschedules from API:', JSON.stringify(reschedules, null, 4));
      } catch (rescheduleError) {
        console.error('Error fetching reschedules:', rescheduleError);
      }
      
      // IMPORTANT DEBUG CHECK
      if (!Array.isArray(studentClasses)) {
        console.error('Student classes is not an array!', typeof studentClasses, studentClasses);
        // Set empty data instead of mock data
        setClasses([]);
        setStats({
          remainingClasses: 0,
          scheduledClasses: 0, 
          completedClasses: 0,
          totalClasses: 0
        });
        setLoading(false);
        setMessage({
          open: true,
          text: translations.errorLoadingClasses || 'Failed to load your classes.',
          severity: 'error'
        });
        return;
      }
      
      // Initialize formattedClasses array
      let formattedClasses = [];
      
      if (studentClasses && studentClasses.length > 0) {
        console.log('Student classes:', studentClasses.length, 'items');
        console.log('First class sample:', JSON.stringify(studentClasses[0]));
        
        // Format regular classes
        formattedClasses = studentClasses.map(cls => {
          if (!cls) return null;
          
          let classTitle, classDate, classStartTime, classEndTime, classDescription, canReschedule, status;
          
          // Extract the class data regardless of the structure
          if (cls.classDetail) {
            classTitle = cls.classDetail.title;
            classDate = cls.classDetail.date;
            classStartTime = cls.classDetail.startTime;
            classEndTime = cls.classDetail.endTime;
            classDescription = cls.classDetail.description;
          } else if (cls.class) {
            classTitle = cls.class.title;
            classDate = cls.class.date;
            classStartTime = cls.class.startTime;
            classEndTime = cls.class.endTime;
            classDescription = cls.class.description;
          } else if (cls.date && cls.startTime) {
            classTitle = cls.title;
            classDate = cls.date;
            classStartTime = cls.startTime;
            classEndTime = cls.endTime;
            classDescription = cls.description;
          } else {
            console.warn('Unrecognized class structure:', JSON.stringify(cls));
            return null;
          }
          
          // Special handling for rescheduled classes that might have different date format
          if (cls.start && cls.end && cls.start instanceof Date && cls.end instanceof Date) {
            // The class already has parsed Date objects (common for rescheduled classes)
            classDate = moment(cls.start).format('YYYY-MM-DD');
            classStartTime = moment(cls.start).format('HH:mm:ss');
            classEndTime = moment(cls.end).format('HH:mm:ss');
            
            // These classes will use their direct date objects below
          }
          
          // Handle status and reschedulability
          status = cls.status || 'scheduled';
          canReschedule = cls.canReschedule !== undefined ? cls.canReschedule : true;
          
          // Rescheduled classes typically have this flag set to false
          if (cls.rescheduledFrom) {
            canReschedule = false;
            status = 'scheduled'; // Mark as scheduled but with different color
          }
          
          // Create dates from the string values or use directly if they're Date objects
          let startDate, endDate;
                        try {
                // Get the user's timezone for conversion
                const userTimezone = user?.timezone || getCookie(COOKIE_NAMES.TIMEZONE);
                console.log(`Converting class times for class ${cls.id}, user timezone: ${userTimezone}`);
                
                // Check if we already have Date objects
                if (cls.start instanceof Date && cls.end instanceof Date) {
                  // Even if we have Date objects, we should still convert them to ensure proper timezone
                  const startStr = moment(cls.start).format('YYYY-MM-DD HH:mm:ss');
                  const endStr = moment(cls.end).format('YYYY-MM-DD HH:mm:ss');
                  
                  // Convert using moment timezone
                  const convertedStart = moment.tz(startStr, ADMIN_TIMEZONE).tz(userTimezone);
                  const convertedEnd = moment.tz(endStr, ADMIN_TIMEZONE).tz(userTimezone);
                  
                  startDate = convertedStart.toDate();
                  endDate = convertedEnd.toDate();
                  
                  console.log(`Converted existing Date objects:`, {
                    originalStart: startStr,
                    originalEnd: endStr,
                    convertedStart: convertedStart.format('YYYY-MM-DD HH:mm:ss'),
                    convertedEnd: convertedEnd.format('YYYY-MM-DD HH:mm:ss')
                  });
                } else {
                  // Convert the times from admin timezone to user's selected timezone
                  console.log(`Converting string times: Date=${classDate}, Start=${classStartTime}, End=${classEndTime}`);
                  startDate = timezoneUtils.convertToUserTime(classDate, classStartTime, ADMIN_TIMEZONE, userTimezone).toDate();
                  endDate = timezoneUtils.convertToUserTime(classDate, classEndTime, ADMIN_TIMEZONE, userTimezone).toDate();
                  
                  console.log(`Converted string times to: Start=${moment(startDate).format('YYYY-MM-DD HH:mm:ss')}, End=${moment(endDate).format('YYYY-MM-DD HH:mm:ss')}`);
                }
            
            // Check if dates are valid
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              throw new Error('Invalid date');
            }
          } catch (error) {
            console.warn('Failed to create date objects:', error, classDate, classStartTime, classEndTime);
            return null;
          }
          
          // Debug the class status
          console.log(`Class ${cls.id || 'unknown'} status check:`, {
            classId: cls.id,
            status: status,
            classDetail: cls.classDetail ? {
              status: cls.classDetail.status,
              date: cls.classDetail.date,
              startTime: cls.classDetail.startTime,
            } : 'no classDetail',
            startDate: startDate,
            now: new Date(),
            isPast: startDate < new Date()
          });
          
          // Determine color based on class status and reschedule flag
          let color;
          
          // Check if the class has already passed, regardless of status
          const isPastClass = startDate < new Date();
          let shouldAllowReschedule = true; // Default to true unless explicitly set to false

          // Handle explicit cases where rescheduling is not allowed
          if (cls.extendedProps?.canReschedule === false) {
            shouldAllowReschedule = false;
          }

          // Only mark already rescheduled classes as non-reschedulable
          if (cls.rescheduledFrom) {
            shouldAllowReschedule = false;
          }

          // Check both StudentClass.status and if the class is in the past to determine attended status
          if (status === 'attended' || (isPastClass && cls.classDetail?.status === 'completed')) {
            color = COLORS.ATTENDED; // Use yellow for attended classes
            shouldAllowReschedule = false;
          } else if (cls.rescheduledFrom || !shouldAllowReschedule) {
            color = COLORS.RESCHEDULED; // Use pink for classes that cannot be rescheduled
          } else {
            color = COLORS.SCHEDULED; // Use purple for schedulable classes
          }
          
          return {
            id: cls.id,
            title: classTitle || 'Class',
            start: startDate,
            end: endDate,
            color: color,
            extendedProps: {
              description: classDescription || '',
              status: status,
              canReschedule: shouldAllowReschedule,
              packageId: cls.studentPackageId,
              rescheduledFrom: cls.rescheduledFrom
            }
          };
        }).filter(Boolean);
        
        // Now add the rescheduled classes from the reschedules endpoint
        if (Array.isArray(reschedules) && reschedules.length > 0) {
          console.log(`Found ${reschedules.length} rescheduled classes to add`);

          // Track the old class IDs that have been rescheduled to filter them out
          const rescheduledOldClassIds = new Set();
          const rescheduledNewClassIds = new Set();

          // Process reschedules to identify which classes have been replaced
          // We need to handle chains of reschedules (A -> B -> C)
          const rescheduleMap = new Map();

          reschedules.forEach(reschedule => {
            if (reschedule.status === 'confirmed') {
              if (reschedule.oldClassId) {
                rescheduledOldClassIds.add(reschedule.oldClassId);
              }
              if (reschedule.newClass && reschedule.newClass.id) {
                rescheduledNewClassIds.add(reschedule.newClass.id);
                // Track the mapping from old to new
                rescheduleMap.set(reschedule.oldClassId, reschedule.newClass.id);
              }
            }
          });

          // Find the final class in each reschedule chain
          const finalClassIds = new Set();
          rescheduleMap.forEach((newId, oldId) => {
            // Follow the chain to find the final destination
            let currentId = newId;
            while (rescheduleMap.has(currentId)) {
              currentId = rescheduleMap.get(currentId);
            }
            finalClassIds.add(currentId);
          });

          console.log('Rescheduled old class IDs:', Array.from(rescheduledOldClassIds));
          console.log('Rescheduled new class IDs:', Array.from(rescheduledNewClassIds));

          // Filter out old classes that have been rescheduled - we don't want to show them
          const beforeFilterCount = formattedClasses.length;
          formattedClasses = formattedClasses.filter(cls => {
            const shouldKeep = !rescheduledOldClassIds.has(cls.id);
            if (!shouldKeep) {
              console.log(`Removing old rescheduled class: ${cls.id} (${cls.title})`);
            }
            return shouldKeep;
          });
          console.log(`After removing rescheduled old classes: ${beforeFilterCount} -> ${formattedClasses.length}`);

          // Map rescheduled classes to the same format
          // Only include the final class in each reschedule chain
          const rescheduledClassesFormatted = reschedules
            .filter(reschedule => {
              // Only process confirmed reschedules with valid new class data
              if (reschedule.status !== 'confirmed' || !reschedule.newClass) {
                return false;
              }

              const newClass = reschedule.newClass;

              // Only include classes that are the final destination in their reschedule chain
              const isFinalClass = finalClassIds.has(newClass.id) || !rescheduledOldClassIds.has(newClass.id);
              if (!isFinalClass) {
                console.log(`Skipping intermediate rescheduled class ${newClass.id}`);
                return false;
              }

              // Skip if this class ID is already in formattedClasses
              const alreadyExists = formattedClasses.some(cls => cls.id === newClass.id);
              if (alreadyExists) {
                console.log(`Skipping rescheduled class ${newClass.id} as it's already in the list`);
                return false;
              }

              return true;
            })
            .map(reschedule => {
              const newClass = reschedule.newClass;

              let startDate, endDate;
              try {
                startDate = new Date(`${newClass.date}T${newClass.startTime}`);
                endDate = new Date(`${newClass.date}T${newClass.endTime}`);
              
              // Check if dates are valid
              if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error('Invalid date for rescheduled class');
              }
            } catch (error) {
              console.warn('Failed to create date objects for rescheduled class:', error, newClass);
              return null;
            }
            
            return {
              id: newClass.id,
              title: newClass.title || 'Rescheduled Class',
              start: startDate,
              end: endDate,
              color: COLORS.RESCHEDULED,
              extendedProps: {
                description: newClass.description || 'Rescheduled class',
                status: 'scheduled',
                canReschedule: false, // Rescheduled classes can't be rescheduled again
                packageId: reschedule.studentPackageId,
                rescheduledFrom: reschedule.oldClassId,
                isRescheduled: true
              }
            };
          }).filter(Boolean);
          
          // Add the rescheduled classes to the formattedClasses array
          formattedClasses = [...formattedClasses, ...rescheduledClassesFormatted];
          console.log(`After adding rescheduled classes, total classes: ${formattedClasses.length}`);
        }
        
        console.log('DEBUG - Formatted Classes:', formattedClasses.length, 'items');
        console.log('First formatted class:', formattedClasses.length > 0 ? JSON.stringify(formattedClasses[0]) : 'None');

        // Debug information to help track missing classes
        const scheduledClasses = formattedClasses.filter(cls => cls.extendedProps.status === 'scheduled');
        const rescheduledClasses = formattedClasses.filter(cls => cls.extendedProps.rescheduledFrom);
        
        console.log('Scheduled classes:', scheduledClasses.length);
        console.log('Rescheduled classes:', rescheduledClasses.length);
        // Add more detailed logging for rescheduled classes
        if (rescheduledClasses.length > 0) {
          console.log('Rescheduled class example:', JSON.stringify(rescheduledClasses[0]));
        }
        
        if (formattedClasses.length === 0) {
          console.warn('No classes could be formatted properly. Using mock data instead.');
          setClasses([]);
        } else {
          // Get the active package ID if available
          const activePackageId = activePackage?.id;
          console.log('Active package ID for filtering:', activePackageId);
        
          // Filter for current package classes only if we have an active package
          let currentPackageClasses = formattedClasses;
          
          if (activePackageId) {
            // Log before filtering
            console.log('Before filtering, classes count:', formattedClasses.length);
            
            // Apply the filter for active package
            currentPackageClasses = formattedClasses.filter(cls => {
              // Special handling for rescheduled classes which might not have packageId set correctly
              if (cls.extendedProps.rescheduledFrom) {
                // Consider rescheduled classes as part of the current package by default
                return true;
              }
              
              const match = !cls.extendedProps.packageId || 
                cls.extendedProps.packageId == activePackageId;
              
              if (!match) {
                console.log('Excluding class with package ID:', cls.extendedProps.packageId);
              }
              return match;
            });
            
            // Log after filtering
            console.log('After filtering, classes count:', currentPackageClasses.length, 
              'Classes filtered out:', formattedClasses.length - currentPackageClasses.length);
          }
          
          // Update the classes state with the formatted events
          setClasses(currentPackageClasses);
          
          // Check if all reschedule turns are used
          const noRescheduleCreditsLeft = activePackage && 
            activePackage.package?.maxReschedules && 
            activePackage.usedReschedules >= activePackage.package.maxReschedules;

          console.log('Reschedule credits check:', {
            maxReschedules: activePackage?.package?.maxReschedules,
            usedReschedules: activePackage?.usedReschedules,
            noRescheduleCreditsLeft: noRescheduleCreditsLeft
          });

          // If no reschedule credits left, update all colors, but only for non-rescheduled original classes
          if (noRescheduleCreditsLeft) {
            console.log('No reschedule credits left, making regular classes non-reschedulable');
            
            // Only mark original classes as non-reschedulable, not classes that have already been rescheduled
            currentPackageClasses = currentPackageClasses.map(cls => {
              // Skip classes that:
              // 1. Are already attended
              // 2. Are already rescheduled from another class
              // 3. Already have an explicit canReschedule=false setting
              if (cls.extendedProps.status === 'scheduled' && 
                  !cls.extendedProps.rescheduledFrom &&
                  cls.extendedProps.canReschedule !== false) {
                  
                return {
                  ...cls,
                  color: COLORS.RESCHEDULED, // use reddish color
                  extendedProps: {
                    ...cls.extendedProps,
                    canReschedule: false,
                    canRescheduleReason: 'No reschedule credits left'
                  }
                };
              }
              return cls;
            });
            
            // Re-set classes with updated colors
            setClasses(currentPackageClasses);
          } else {
            // If we have reschedule credits, ensure classes are properly marked
            currentPackageClasses = currentPackageClasses.map(cls => {
              // Skip any class that is explicitly marked as non-reschedulable for other reasons
              // or that has been rescheduled from another class
              if (cls.extendedProps.rescheduledFrom || 
                  cls.extendedProps.status === 'attended') {
                return cls;
              }
              
              // Check if the class is within the reschedule window
              const classDate = new Date(cls.start);
              const now = new Date();
              const hoursDiff = (classDate - now) / (1000 * 60 * 60);
              
              // Only make it reschedulable if it's at least 2 hours before the class
              if (hoursDiff >= 2) {
                return {
                  ...cls,
                  color: COLORS.SCHEDULED,
                  extendedProps: {
                    ...cls.extendedProps,
                    canReschedule: true
                  }
                };
              } else {
                // Class is too soon to reschedule
                return {
                  ...cls,
                  color: COLORS.RESCHEDULED,
                  extendedProps: {
                    ...cls.extendedProps,
                    canReschedule: false,
                    canRescheduleReason: 'Class is less than 2 hours away'
                  }
                };
              }
            });
            
            setClasses(currentPackageClasses);
          }
          
          // Calculate class statistics
          const scheduledClasses = currentPackageClasses.filter(
            cls => cls.extendedProps.status === 'scheduled'
          ).length;
          
          const completedClasses = currentPackageClasses.filter(
            cls => cls.extendedProps.status === 'attended'
          ).length;
          
          // Calculate remaining classes - this is the total scheduled classes
          const totalScheduledAndAttended = scheduledClasses + completedClasses;
          
          // Update stats with accurate counts
          setStats({
            remainingClasses: currentPackageClasses.filter(
              cls => cls.extendedProps.status === 'scheduled'
            ).length,
            scheduledClasses: scheduledClasses,
            completedClasses: completedClasses,
            totalClasses: totalScheduledAndAttended
          });
          
          // Set calendar initial date to today or first upcoming class
          const upcomingClasses = currentPackageClasses.filter(cls => {
            const classStart = new Date(cls.start);
            return classStart > new Date() && cls.extendedProps.status === 'scheduled';
          }).sort((a, b) => new Date(a.start) - new Date(b.start));
          
          if (upcomingClasses.length > 0) {
            setDate(new Date(upcomingClasses[0].start));
          } else {
            setDate(new Date());
          }
        }
      } else {
        // Set empty classes array and update stats
        console.log('No classes returned from API.');
        setClasses([]);
        setStats({
          remainingClasses: 0,
          scheduledClasses: 0,
          completedClasses: 0,
          totalClasses: 0
        });
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      
      // Show error message to user
      setClasses([]);
      setStats({
        remainingClasses: 0,
        scheduledClasses: 0,
        completedClasses: 0,
        totalClasses: 0
      });
      
      setMessage({
        open: true,
        text: translations.errorLoadingData || 'Error loading your data.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
    
    // Refresh every minute to ensure class status and remaining classes are up-to-date
    const interval = setInterval(fetchStudentData, 60 * 1000);
    
    // Add event listener for cross-component synchronization
    const handleDataSync = () => {
      console.log('Dashboard received yekacoucha_data_changed event - refreshing data');
      fetchStudentData();
    };
    
    // Add event listener for timezone changes
    const handleTimezoneChange = (event) => {
      console.log('Dashboard received timezone change event - refreshing data');
      fetchStudentData();
    };
    
    window.addEventListener('yekacouchacademy_data_changed', handleDataSync);
    window.addEventListener('yekacoucha_timezone_changed', handleTimezoneChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('yekacouchacademy_data_changed', handleDataSync);
      window.removeEventListener('yekacoucha_timezone_changed', handleTimezoneChange);
    };
  }, [user, translations]);

  const isWithinRescheduleWindow = (classTime) => {
    // Check if the class is more than 2 hours away
    const now = moment();
    const classStart = moment(classTime);
    return classStart.diff(now, 'hours') >= 2;
  };

  const canRescheduleClass = (event) => {
    // Check if the class is within reschedule window
    if (!isWithinRescheduleWindow(event.start)) {
      return {
        canReschedule: false,
        reason: 'Classes can only be rescheduled at least 2 hours before they start'
      };
    }
    
    // Check if the student has reschedule credits remaining
    if (packageInfo.rescheduleRemaining <= 0) {
      return {
        canReschedule: false,
        reason: 'You have used all your reschedule credits for this package'
      };
    }

    // Check if the class itself is allowed to be rescheduled
    if (event.extendedProps && event.extendedProps.canReschedule === false) {
      return {
        canReschedule: false,
        reason: 'This class cannot be rescheduled (it may have been already rescheduled)'
      };
    }
    
    // Check by color - if it's already pink/reddish, it can't be rescheduled
    if (event.color === COLORS.RESCHEDULED) {
      return {
        canReschedule: false,
        reason: 'This class cannot be rescheduled'
      };
    }
    
    // Check if the class has been attended
    if (event.extendedProps && event.extendedProps.status === 'attended') {
      return {
        canReschedule: false,
        reason: 'Attended classes cannot be rescheduled'
      };
    }

    return {
      canReschedule: true,
      reason: ''
    };
  };

  const handleReschedule = async (event) => {
    // First check if class can be rescheduled
    const rescheduleCheck = canRescheduleClass(event);
    
    if (!rescheduleCheck.canReschedule) {
      setMessage({
        open: true,
        text: rescheduleCheck.reason,
        severity: 'warning'
      });
      return;
    }
    
    // Calculate the original duration for the modal
    let duration = 60; // Default duration in minutes
    if (event.start instanceof Date && event.end instanceof Date) {
      duration = moment(event.end).diff(moment(event.start), 'minutes');
    }
    
    // Create a complete event object with all required fields for the RescheduleModal
    const completeEvent = {
      ...event,
      studentId: user?.student?.id, // Explicitly add studentId
      studentPackageId: event.extendedProps?.packageId,
      classDetail: {
        date: moment(event.start).format('YYYY-MM-DD'),
        startTime: moment(event.start).format('HH:mm:ss'),
        endTime: moment(event.end).format('HH:mm:ss'),
        title: event.title,
        teacherId: event.extendedProps?.teacherId // Include teacherId if available
      },
      extendedProps: {
        ...event.extendedProps,
        packageEndDate: packageInfo.validUntil,
        duration: duration,
        studentId: user?.student?.id, // Duplicate studentId in extendedProps for safety
        packageInfo: packageInfo // Include full package info for fallback
      }
    };
    
    console.log('Complete event object for rescheduling:', JSON.stringify(completeEvent, null, 2));
    
    // Set the selected event with all necessary data
    setSelectedEvent(completeEvent);
    setRescheduleOpen(true);
  };

  const handleRescheduleConfirm = async (selectionData) => {
    setRescheduleOpen(false);
    
    if (!selectedEvent) {
      console.error('No event selected for rescheduling');
      return;
    }
    
    // Start loading state
    setLoading(true);
    
    try {
      console.log('Rescheduling class with ID:', selectedEvent.id, 'to new date:', selectionData.selectedDate);
      
      // Extract the student ID from the user object or class data
      const studentId = user?.student?.id || selectedEvent?.extendedProps?.studentId;
      
      if (!studentId) {
        throw new Error('Student ID not found. Cannot reschedule class.');
      }
      
      // Get the user's current timezone
      const userTimezone = user?.timezone || getCookie(COOKIE_NAMES.TIMEZONE);
      console.log('User timezone for reschedule:', userTimezone);
      
      // IMPORTANT: selectionData already contains dates that were converted to admin timezone
      // in the RescheduleModalContainer.jsx. We need to use these directly to avoid double conversion.
      
      // Extract the date and time directly from selectionData
      const formattedDate = moment(selectionData.date).format('YYYY-MM-DD');
      const formattedStartTime = selectionData.startTime;
      const formattedEndTime = selectionData.endTime;
      
      console.log('Using pre-converted dates from selectionData:', {
        date: formattedDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime
      });
      
      console.log('Timezone info for reschedule:', { 
        userTimezone,
        adminTimezone: ADMIN_TIMEZONE,
        selectedDate: selectionData.selectedDate,
        date: formattedDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime
      });
      
      // Format the new class data with admin timezone values
      const newClassData = {
        date: formattedDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        title: selectedEvent.title || 'Rescheduled Class',
        timezone: ADMIN_TIMEZONE
      };
      
      // Use the API's createRescheduleRecord endpoint which is correctly implemented on the server
      // Extract teacherId from selectionData if available, otherwise use the default teacher
      const teacherId = selectionData.teacherId || selectedEvent?.classDetail?.teacherId;
      
      console.log('Using teacher ID for reschedule:', teacherId, 'Is different teacher:', selectionData.differentTeacher);
      
      if (!teacherId) {
        throw new Error(translations.noTeacherSpecified || 'No teacher was specified for the rescheduled class.');
      }
      
      // Add info about different teacher for notification message
      const isDifferentTeacher = selectionData.differentTeacher;
      const teacherName = selectionData.teacher ? `${selectionData.teacher.firstName} ${selectionData.teacher.lastName}` : 'another teacher';
      
      const result = await studentAPI.createRescheduleRecord(
        studentId,
        selectedEvent.id,
        newClassData,
        teacherId, // Pass the teacher ID
        selectionData.differentTeacher // Pass the differentTeacher flag
      );
      
      console.log('Reschedule API response:', JSON.stringify(result));
      
      if (result && (result.success || result.message === 'Class rescheduled successfully')) {
        // Update package info with decremented reschedule credits
        setPackageInfo(prev => ({
          ...prev,
          rescheduleRemaining: Math.max(0, prev.rescheduleRemaining - 1)
        }));
        
        // Small delay to ensure the server has processed the change
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh the calendar events
        await fetchStudentData();
        
        // Dispatch an event to notify other components about the data change
        window.dispatchEvent(new Event('yekacouchacademy_data_changed'));
        
        // Show success message with teacher information if applicable
        setMessage({
          open: true,
          text: isDifferentTeacher 
            ? (translations.rescheduleSuccessWithNewTeacher || `Class rescheduled successfully with ${teacherName}`)
            : (translations.rescheduleSuccess || 'Class rescheduled successfully'),
          severity: 'success'
        });
      } else {
        throw new Error(result?.message || 'Failed to reschedule class');
      }
    } catch (error) {
      console.error('Error rescheduling class:', error);
      setMessage({
        open: true,
        text: error.message || translations.rescheduleError || 'Error rescheduling class',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setSelectedEvent(null);
    }
  };

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };
  
  const handleEventClick = (event) => {
    // Check if the class can be rescheduled before showing the reschedule option
    const rescheduleCheck = canRescheduleClass(event);
    
    // If it's a class that can be rescheduled, allow rescheduling
    if (rescheduleCheck.canReschedule) {
      handleReschedule(event);
    } else {
      // Otherwise just show a message explaining why it can't be rescheduled
      setMessage({
        open: true,
        text: rescheduleCheck.reason || translations.cannotReschedule || 'This class cannot be rescheduled',
        severity: 'info'
      });
    }
  };
  
  const handleRescheduleSuccess = () => {
    // Refresh data after successful reschedule
    fetchStudentData();
    
    // Show success message
    setMessage({
      open: true,
      text: translations.rescheduleSuccess || 'Class rescheduled successfully',
      severity: 'success'
    });
  };

  // Add a function to close the message
  const handleCloseMessage = () => {
    setMessage({ ...message, open: false });
  };

  // Add a function to toggle fullscreen
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    
    // When entering fullscreen mode, let the sidebar know to get out of the way
    if (!isFullScreen) {
      const event = new CustomEvent('dashboard_fullscreen', {
        detail: { fullscreen: true }
      });
      window.dispatchEvent(event);
    } else {
      // When exiting fullscreen, reset sidebar visibility
      const event = new CustomEvent('dashboard_fullscreen', {
        detail: { fullscreen: false }
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      gap: 2,
      transition: COMMON_TRANSITION,
      p: { xs: 2, sm: 3, md: 4 },
      pt: { xs: '60px', sm: 3, md: 4 }, // Keep top padding for mobile menu
      boxSizing: 'border-box',
      maxWidth: '1600px',
      mx: 'auto',
      width: '100%'
    }}>
      {!isFullScreen && (
        <>
          <Typography variant="h4" sx={{ 
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            mb: 1,
            color: theme.text.primary,
            transition: COMMON_TRANSITION,
          }}>
            {translations.studentDashboard}
          </Typography>
          
          <Typography variant="subtitle1" sx={{
            color: theme.text.secondary,
            mb: 3,
            fontSize: { xs: '0.9rem', sm: '1rem' },
            fontWeight: 400
          }}>
            {translations.welcomeMessage || 'Welcome back'}, {user?.firstName || 'Student'}!
          </Typography>

          {/* Stats Cards - Update Grid to be more responsive */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={EventIcon}
                title={translations.currentPackage}
                value={packageInfo.name || translations.noPackage}
                color="#845EC2"
                description={`${stats.scheduledClasses} ${translations.classesRemaining} ${translations.outOf} ${stats.totalClasses || stats.scheduledClasses + stats.completedClasses}`}
                sx={{ height: '100%', borderRadius: 3, boxShadow: '0 6px 15px rgba(0,0,0,0.08)' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={ScheduleIcon}
                title={translations.scheduledClasses}
                value={stats.scheduledClasses}
                color="#FF6F91"
                sx={{ height: '100%', borderRadius: 3, boxShadow: '0 6px 15px rgba(0,0,0,0.08)' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={HistoryIcon}
                title={translations.passedClasses}
                value={stats.completedClasses}
                color="#FFCC29"
                sx={{ height: '100%', borderRadius: 3, boxShadow: '0 6px 15px rgba(0,0,0,0.08)' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ZoomCard 
                zoomLink={zoomLink} 
                translations={translations}
                sx={{ height: '100%', borderRadius: 3, boxShadow: '0 6px 15px rgba(0,0,0,0.08)' }}
              />
            </Grid>
            {/* Package Expiration Date Card */}
            <Grid item xs={12}>
              <Card sx={{
                p: 2.5,
                background: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                border: theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <Box sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2
                }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 'bold', 
                      color: theme.text.secondary,
                      mb: 0.5,
                      fontSize: '0.9rem'
                    }}>
                      {translations.packageValidUntil}
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 'medium',
                      color: theme.text.primary,
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <CalendarIcon sx={{ fontSize: '1.1rem', color: '#FF6F91' }} />
                      {packageInfo.validUntil ? 
                        moment(packageInfo.validUntil).locale(language).format(translations.dateFormat || 'MMMM D, YYYY') : 
                        translations.noPackageAssigned || 'No Package Assigned'}
                    </Typography>
                  </Box>
                  <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    gap: 2
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1.5,
                      bgcolor: 'rgba(132, 94, 194, 0.1)',
                      px: 2,
                      py: 1,
                      borderRadius: 2
                    }}>
                      <Typography variant="body2" sx={{ color: theme.text.secondary, fontWeight: 500 }}>
                        {translations.rescheduleCredits}:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#845EC2' }}>
                        {packageInfo.rescheduleRemaining} <Typography component="span" variant="body2" sx={{ color: theme.text.secondary }}>
                          / {packageInfo.rescheduleAllowed} {translations.creditsAllowed}
                        </Typography>
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1.5,
                      bgcolor: 'rgba(255, 111, 145, 0.1)',
                      px: 2,
                      py: 1,
                      borderRadius: 2
                    }}>
                      <Typography variant="body2" sx={{ color: theme.text.secondary, fontWeight: 500 }}>
                        {translations.remainingClasses}:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#FF6F91' }}>
                        {packageInfo.remainingClasses} <Typography component="span" variant="body2" sx={{ color: theme.text.secondary }}>
                          / {packageInfo.totalClasses} {translations.class + (packageInfo.totalClasses > 1 ? 'es' : '')}
                        </Typography>
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Class Schedule Section - Improved Design */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ 
          fontWeight: 700,
          mb: 2,
          color: theme.mode === 'light' ? '#222' : theme.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}>
          <CalendarTodayIcon sx={{ color: '#845EC2', fontSize: '1.3rem' }} />
          {translations.myClasses || 'My Classes'}
        </Typography>

        {/* Tab navigation with buttons */}
        <Box sx={{ 
          mb: 3,
          display: 'flex',
          gap: 2
        }}>
          <Button
            variant={view === 'upcoming' ? 'contained' : 'outlined'}
            onClick={() => setView('upcoming')}
            sx={{
              borderRadius: '30px',
              px: 3,
              bgcolor: view === 'upcoming' ? '#845EC2' : 'transparent',
              borderColor: view === 'upcoming' ? '#845EC2' : theme.mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
              color: view === 'upcoming' 
                ? '#fff' 
                : theme.mode === 'light' ? '#333' : theme.text.primary,
              '&:hover': {
                bgcolor: view === 'upcoming' ? '#6e4da7' : 'rgba(132, 94, 194, 0.1)',
                borderColor: '#845EC2'
              }
            }}
          >
            {translations.upcoming || 'Upcoming Classes'}
          </Button>
          <Button
            variant={view === 'past' ? 'contained' : 'outlined'}
            onClick={() => setView('past')}
            sx={{
              borderRadius: '30px',
              px: 3,
              bgcolor: view === 'past' ? '#845EC2' : 'transparent',
              borderColor: view === 'past' ? '#845EC2' : theme.mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
              color: view === 'past' 
                ? '#fff' 
                : theme.mode === 'light' ? '#333' : theme.text.primary,
              '&:hover': {
                bgcolor: view === 'past' ? '#6e4da7' : 'rgba(132, 94, 194, 0.1)',
                borderColor: '#845EC2'
              }
            }}
          >
            {translations.past || 'Past Classes'}
          </Button>
        </Box>
        
        {/* Loading state */}
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '300px',
            flexDirection: 'column',
            gap: 2
          }}>
            <CircularProgress size={40} sx={{ color: '#845EC2' }} />
            <Typography sx={{ color: theme.text.secondary }}>
              {translations.loading || 'Loading your classes...'}
            </Typography>
          </Box>
        ) : classes.length > 0 ? (
          /* Render classes with proper filtering */
          <Grid container spacing={3}>
            {/* Filter and sort classes based on view */}
            {classes
              .filter(cls => {
                const now = new Date();
                if (view === 'upcoming') {
                  return new Date(cls.start) >= now;
                } else {
                  return new Date(cls.start) < now;
                }
              })
              .sort((a, b) => {
                return view === 'upcoming' 
                  ? new Date(a.start) - new Date(b.start)
                  : new Date(b.start) - new Date(a.start);
              })
              .slice(0, 6) // Limit to 6 classes per page to avoid too much scrolling
              .map((cls, index) => {
                // Use the user's timezone for displaying dates
                const userTimezone = user?.timezone || getCookie(COOKIE_NAMES.TIMEZONE);
                                  const classDate = moment(cls.start).tz(userTimezone).locale(language).format(translations.shortDateFormat || 'dddd, MMMM D');
                  const classTime = `${moment(cls.start).tz(userTimezone).format(translations.timeFormat || 'h:mm A')} - ${moment(cls.end).tz(userTimezone).format(translations.timeFormat || 'h:mm A')}`;
                
                // Determine status style
                // If viewing past classes, always use "passed" status
                const isPast = view === 'past';
                const statusColor = isPast
                  ? COLORS.ATTENDED // Use yellow color for all past classes
                  : cls.extendedProps.status === 'attended' 
                    ? COLORS.ATTENDED 
                    : cls.extendedProps.rescheduledFrom 
                      ? COLORS.RESCHEDULED 
                      : COLORS.SCHEDULED;
                    
                const statusText = isPast
                  ? (translations.passed || 'Passed')
                  : cls.extendedProps.status === 'attended' 
                    ? (translations.attended || 'Attended') 
                    : cls.extendedProps.rescheduledFrom 
                      ? (translations.rescheduled || 'Rescheduled')
                      : (translations.scheduled || 'Scheduled');
                    
                // Check if class can be rescheduled
                const rescheduleCheck = canRescheduleClass(cls);
                
                // Check if it's next class (first upcoming)
                const isNextClass = view === 'upcoming' && index === 0;
                
                return (
                  <Grid item xs={12} md={isNextClass ? 12 : 6} key={`class-${cls.id}-${index}`}>
                    <Card 
                      elevation={isNextClass ? 3 : 1}
                      sx={{
                        height: '100%',
                        display: 'flex', 
                        flexDirection: 'column',
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: isNextClass 
                          ? `2px solid ${statusColor}`
                          : theme.mode === 'light' 
                            ? '1px solid rgba(0,0,0,0.1)'
                            : '1px solid rgba(255,255,255,0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                        },
                        position: 'relative'
                      }}
                    >
                      {/* Status indicator as top banner */}
                      <Box sx={{ 
                        bgcolor: statusColor,
                        color: '#fff',
                        py: 0.5,
                        px: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {statusText}
                        </Typography>
                        {/* Only show the relative time for upcoming classes */}
                        {view === 'upcoming' && cls.extendedProps.status !== 'attended' && (
                          <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                            {moment(cls.start).tz(userTimezone).fromNow()}
                          </Typography>
                        )}
                      </Box>
                      
                      {/* Main content */}
                      <CardContent sx={{ 
                        p: isNextClass ? 3 : 2,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        {isNextClass && view === 'upcoming' && (
                          <Chip 
                            label={translations.nextClass || "Your Next Class"} 
                            size="small" 
                            color="primary"
                            sx={{ 
                              alignSelf: 'flex-start', 
                              mb: 1,
                              bgcolor: '#845EC2',
                              fontWeight: 'medium'
                            }}
                          />
                        )}
                        
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          mb: 2,
                          color: theme.mode === 'light' ? '#222' : theme.text.primary,
                          fontSize: isNextClass ? '1.5rem' : '1.25rem'
                        }}>
                          {cls.title}
                        </Typography>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: 1.5,
                          mb: 'auto'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <CalendarTodayIcon sx={{ color: '#845EC2' }} />
                            <Typography sx={{ 
                              fontWeight: 500,
                              color: theme.mode === 'light' ? '#333' : theme.text.primary
                            }}>
                              {classDate}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <ScheduleIcon sx={{ color: '#845EC2' }} />
                            <Typography sx={{ 
                              fontWeight: 500,
                              color: theme.mode === 'light' ? '#333' : theme.text.primary
                            }}>
                              {classTime}
                            </Typography>
                          </Box>
                          
                          {cls.extendedProps.description && (
                            <Typography sx={{ 
                              color: theme.text.secondary,
                              mt: 1,
                              fontSize: '0.95rem'
                            }}>
                              {cls.extendedProps.description}
                            </Typography>
                          )}
                        </Box>
                        
                        {/* Action buttons */}
                        {view === 'upcoming' && cls.extendedProps.status !== 'attended' && (
                          <Box sx={{ 
                            display: 'flex', 
                            gap: 2, 
                            mt: 3,
                            flexWrap: 'wrap'
                          }}>
                            {zoomLink && (
                              <Button
                                variant="contained"
                                startIcon={<VideocamIcon />}
                                onClick={() => window.open(zoomLink, '_blank')}
                                sx={{
                                  bgcolor: '#00A8B8',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: '#0096a2'
                                  },
                                  borderRadius: '30px',
                                  px: 2.5
                                }}
                              >
                                {translations.joinClass || 'Join Class'}
                              </Button>
                            )}
                            
                            {rescheduleCheck.canReschedule && (
                              <Button
                                variant="outlined"
                                onClick={() => handleReschedule(cls)}
                                sx={{
                                  color: '#845EC2',
                                  borderColor: '#845EC2',
                                  borderRadius: '30px',
                                  px: 2.5,
                                  '&:hover': {
                                    borderColor: '#845EC2',
                                    bgcolor: 'rgba(132, 94, 194, 0.1)'
                                  }
                                }}
                              >
                                {translations.reschedule || 'Reschedule'}
                              </Button>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })
            }
            
            {/* Show "No classes" message when filtered list is empty */}
            {classes.filter(cls => {
              const now = new Date();
              return view === 'upcoming' ? new Date(cls.start) >= now : new Date(cls.start) < now;
            }).length === 0 && (
              <Grid item xs={12}>
                <Card sx={{
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  p: 5,
                  borderRadius: 3,
                  bgcolor: theme.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                  border: theme.mode === 'light' ? '1px dashed rgba(0,0,0,0.2)' : '1px dashed rgba(255,255,255,0.2)'
                }}>
                  {view === 'upcoming' ? (
                    <>
                      <CalendarTodayIcon sx={{ fontSize: 60, color: '#845EC2', opacity: 0.7, mb: 2 }} />
                      <Typography variant="h6" sx={{ 
                        mb: 1, 
                        fontWeight: 'bold',
                        color: theme.mode === 'light' ? '#222' : theme.text.primary
                      }}>
                        {translations.noUpcomingClasses || 'No Upcoming Classes'}
                      </Typography>
                      <Typography sx={{ color: theme.text.secondary, textAlign: 'center' }}>
                        {translations.noUpcomingClassesDescription || "You don't have any classes scheduled at the moment."}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <HistoryIcon sx={{ fontSize: 60, color: '#845EC2', opacity: 0.7, mb: 2 }} />
                      <Typography variant="h6" sx={{ 
                        mb: 1, 
                        fontWeight: 'bold',
                        color: theme.mode === 'light' ? '#222' : theme.text.primary
                      }}>
                        {translations.noPastClasses || 'No Past Classes'}
                      </Typography>
                      <Typography sx={{ color: theme.text.secondary, textAlign: 'center' }}>
                        {translations.noPastClassesDescription || "You haven't attended any classes yet."}
                      </Typography>
                    </>
                  )}
                </Card>
              </Grid>
            )}
          </Grid>
        ) : (
          /* No classes at all message */
          <Card sx={{
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            p: 5,
            borderRadius: 3,
            bgcolor: theme.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
            border: theme.mode === 'light' ? '1px dashed rgba(0,0,0,0.2)' : '1px dashed rgba(255,255,255,0.2)'
          }}>
            <CalendarTodayIcon sx={{ fontSize: 60, color: '#845EC2', opacity: 0.7, mb: 2 }} />
            <Typography variant="h6" sx={{ 
              mb: 1, 
              fontWeight: 'bold',
              color: theme.mode === 'light' ? '#222' : theme.text.primary
            }}>
              {translations.noClasses || 'No Classes Available'}
            </Typography>
            <Typography sx={{ color: theme.text.secondary, textAlign: 'center' }}>
              {translations.noClassesDescription || "You don't have any classes scheduled at the moment."}
            </Typography>
          </Card>
        )}
      </Box>

      {/* Reschedule Modal */}
      <RescheduleModal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        event={selectedEvent}
        studentId={user?.student?.id}
        packageId={packageInfo.packageId}
        onReschedule={handleRescheduleConfirm}
        rescheduleCredits={packageInfo.rescheduleRemaining}
        translations={translations}
        theme={theme}
      />
      
      {/* Snackbar for messages */}
      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={() => setMessage({...message, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          zIndex: 9999, // Ensure it appears above modals
        }}
      >
        <Alert 
          onClose={() => setMessage({...message, open: false})} 
          severity={message.severity}
          elevation={6}
          variant="filled"
          sx={{ 
            width: '100%',
            borderRadius: 2,
            zIndex: 9999, // Ensure alert appears above modals
            '& .MuiAlert-message': {
              fontSize: '0.9rem'
            }
          }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;