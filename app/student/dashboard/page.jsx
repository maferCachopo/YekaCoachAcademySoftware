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
    minHeight: '40px',
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

const ZoomCard = ({ zoomLink }) => {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  
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
        background: `linear-gradient(135deg, #00A8B8 0%, #00A8B8dd 100%)`, 
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
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const handleSidebarChange = (event) => {
      if (event.detail && typeof event.detail.open === 'boolean') {
        setSidebarOpen(event.detail.open);
      }
    };
    window.addEventListener('sidebar_state_change', handleSidebarChange);
    return () => {
      window.removeEventListener('sidebar_state_change', handleSidebarChange);
    };
  }, []);
  
  const [stats, setStats] = useState({
    remainingClasses: 0,
    scheduledClasses: 0,
    completedClasses: 0,
    totalClasses: 0,
  });

  const COLORS = {
    SCHEDULED: '#845EC2', 
    RESCHEDULED: '#FF6F91', 
    ATTENDED: '#FFCC29', 
  };

  const fetchStudentData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
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
      
      const studentId = user.student.id;
      
      try {
        const studentDetail = await studentAPI.getStudentById(studentId);
        if (studentDetail && studentDetail.zoomLink) {
          setZoomLink(studentDetail.zoomLink);
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
      }
      
      const studentPackages = await studentAPI.getStudentPackages(studentId);
      let activePackage = null;
      
      if (studentPackages && studentPackages.length > 0) {
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
      
      const studentClasses = await studentAPI.getStudentClasses(studentId);
      
      let reschedules = [];
      try {
        reschedules = await studentAPI.getStudentReschedules(studentId);
      } catch (rescheduleError) {
        console.error('Error fetching reschedules:', rescheduleError);
      }
      
      if (!Array.isArray(studentClasses)) {
        console.error('Student classes is not an array!', typeof studentClasses, studentClasses);
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
      
      let formattedClasses = [];
      
      if (studentClasses && studentClasses.length > 0) {
        formattedClasses = studentClasses.map(cls => {
          if (!cls) return null;
          
          let classTitle, classDate, classStartTime, classEndTime, classDescription, canReschedule, status;
          
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
          
          if (cls.start && cls.end && cls.start instanceof Date && cls.end instanceof Date) {
            classDate = moment(cls.start).format('YYYY-MM-DD');
            classStartTime = moment(cls.start).format('HH:mm:ss');
            classEndTime = moment(cls.end).format('HH:mm:ss');
          }
          
          status = cls.status || 'scheduled';
          canReschedule = cls.canReschedule !== undefined ? cls.canReschedule : true;
          
          if (cls.rescheduledFrom) {
            canReschedule = false;
            status = 'scheduled'; 
          }
          
          let startDate, endDate;
          try {
            const userTimezone = user?.timezone || getCookie(COOKIE_NAMES.TIMEZONE);
            
            if (cls.start instanceof Date && cls.end instanceof Date) {
              const startStr = moment(cls.start).format('YYYY-MM-DD HH:mm:ss');
              const endStr = moment(cls.end).format('YYYY-MM-DD HH:mm:ss');
              const convertedStart = moment.tz(startStr, ADMIN_TIMEZONE).tz(userTimezone);
              const convertedEnd = moment.tz(endStr, ADMIN_TIMEZONE).tz(userTimezone);
              startDate = convertedStart.toDate();
              endDate = convertedEnd.toDate();
            } else {
              startDate = timezoneUtils.convertToUserTime(classDate, classStartTime, ADMIN_TIMEZONE, userTimezone).toDate();
              endDate = timezoneUtils.convertToUserTime(classDate, classEndTime, ADMIN_TIMEZONE, userTimezone).toDate();
            }
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              throw new Error('Invalid date');
            }
          } catch (error) {
            console.warn('Failed to create date objects:', error, classDate, classStartTime, classEndTime);
            return null;
          }
          
          let color;
          const isPastClass = startDate < new Date();
          let shouldAllowReschedule = true; 

          if (cls.extendedProps?.canReschedule === false) {
            shouldAllowReschedule = false;
          }

          if (cls.rescheduledFrom) {
            shouldAllowReschedule = false;
          }

          if (status === 'attended' || (isPastClass && cls.classDetail?.status === 'completed')) {
            color = COLORS.ATTENDED; 
            shouldAllowReschedule = false;
          } else if (cls.rescheduledFrom || !shouldAllowReschedule) {
            color = COLORS.RESCHEDULED; 
          } else {
            color = COLORS.SCHEDULED; 
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
        
        if (Array.isArray(reschedules) && reschedules.length > 0) {
          const rescheduledOldClassIds = new Set();
          const rescheduledNewClassIds = new Set();
          const rescheduleMap = new Map();

          reschedules.forEach(reschedule => {
            if (reschedule.status === 'confirmed') {
              if (reschedule.oldClassId) {
                rescheduledOldClassIds.add(reschedule.oldClassId);
              }
              if (reschedule.newClass && reschedule.newClass.id) {
                rescheduledNewClassIds.add(reschedule.newClass.id);
                rescheduleMap.set(reschedule.oldClassId, reschedule.newClass.id);
              }
            }
          });

          const finalClassIds = new Set();
          rescheduleMap.forEach((newId, oldId) => {
            let currentId = newId;
            while (rescheduleMap.has(currentId)) {
              currentId = rescheduleMap.get(currentId);
            }
            finalClassIds.add(currentId);
          });

          formattedClasses = formattedClasses.filter(cls => {
            const shouldKeep = !rescheduledOldClassIds.has(cls.id);
            return shouldKeep;
          });

          const rescheduledClassesFormatted = reschedules
            .filter(reschedule => {
              if (reschedule.status !== 'confirmed' || !reschedule.newClass) {
                return false;
              }
              const newClass = reschedule.newClass;
              const isFinalClass = finalClassIds.has(newClass.id) || !rescheduledOldClassIds.has(newClass.id);
              if (!isFinalClass) {
                return false;
              }
              const alreadyExists = formattedClasses.some(cls => cls.id === newClass.id);
              if (alreadyExists) {
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
                canReschedule: false, 
                packageId: reschedule.studentPackageId,
                rescheduledFrom: reschedule.oldClassId,
                isRescheduled: true
              }
            };
          }).filter(Boolean);
          
          formattedClasses = [...formattedClasses, ...rescheduledClassesFormatted];
        }
        
        if (formattedClasses.length === 0) {
          console.warn('No classes could be formatted properly. Using mock data instead.');
          setClasses([]);
        } else {
          const activePackageId = activePackage?.id;
          let currentPackageClasses = formattedClasses;
          
          if (activePackageId) {
            currentPackageClasses = formattedClasses.filter(cls => {
              if (cls.extendedProps.rescheduledFrom) {
                return true;
              }
              const match = !cls.extendedProps.packageId || 
                cls.extendedProps.packageId == activePackageId;
              return match;
            });
          }
          
          setClasses(currentPackageClasses);
          
          const noRescheduleCreditsLeft = activePackage && 
            activePackage.package?.maxReschedules && 
            activePackage.usedReschedules >= activePackage.package.maxReschedules;

          if (noRescheduleCreditsLeft) {
            currentPackageClasses = currentPackageClasses.map(cls => {
              if (cls.extendedProps.status === 'scheduled' && 
                  !cls.extendedProps.rescheduledFrom &&
                  cls.extendedProps.canReschedule !== false) {
                  
                return {
                  ...cls,
                  color: COLORS.RESCHEDULED, 
                  extendedProps: {
                    ...cls.extendedProps,
                    canReschedule: false,
                    canRescheduleReason: 'No reschedule credits left'
                  }
                };
              }
              return cls;
            });
            setClasses(currentPackageClasses);
          } else {
            currentPackageClasses = currentPackageClasses.map(cls => {
              if (cls.extendedProps.rescheduledFrom || 
                  cls.extendedProps.status === 'attended') {
                return cls;
              }
              
              const classDate = new Date(cls.start);
              const now = new Date();
              const hoursDiff = (classDate - now) / (1000 * 60 * 60);
              
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
          
          const scheduledClasses = currentPackageClasses.filter(
            cls => cls.extendedProps.status === 'scheduled'
          ).length;
          
          const completedClasses = currentPackageClasses.filter(
            cls => cls.extendedProps.status === 'attended'
          ).length;
          
          const totalScheduledAndAttended = scheduledClasses + completedClasses;
          
          setStats({
            remainingClasses: currentPackageClasses.filter(
              cls => cls.extendedProps.status === 'scheduled'
            ).length,
            scheduledClasses: scheduledClasses,
            completedClasses: completedClasses,
            totalClasses: totalScheduledAndAttended
          });
          
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
    const interval = setInterval(fetchStudentData, 60 * 1000);
    
    const handleDataSync = () => {
      fetchStudentData();
    };
    
    const handleTimezoneChange = (event) => {
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
    const now = moment();
    const classStart = moment(classTime);
    return classStart.diff(now, 'hours') >= 2;
  };

  const canRescheduleClass = (event) => {
    if (!isWithinRescheduleWindow(event.start)) {
      return {
        canReschedule: false,
        reason: 'Classes can only be rescheduled at least 2 hours before they start'
      };
    }
    
    if (packageInfo.rescheduleRemaining <= 0) {
      return {
        canReschedule: false,
        reason: 'You have used all your reschedule credits for this package'
      };
    }

    if (event.extendedProps && event.extendedProps.canReschedule === false) {
      return {
        canReschedule: false,
        reason: 'This class cannot be rescheduled (it may have been already rescheduled)'
      };
    }
    
    if (event.color === COLORS.RESCHEDULED) {
      return {
        canReschedule: false,
        reason: 'This class cannot be rescheduled'
      };
    }
    
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
    const rescheduleCheck = canRescheduleClass(event);
    
    if (!rescheduleCheck.canReschedule) {
      setMessage({
        open: true,
        text: rescheduleCheck.reason,
        severity: 'warning'
      });
      return;
    }
    
    let duration = 60; 
    if (event.start instanceof Date && event.end instanceof Date) {
      duration = moment(event.end).diff(moment(event.start), 'minutes');
    }
    
    const completeEvent = {
      ...event,
      studentId: user?.student?.id, 
      studentPackageId: event.extendedProps?.packageId,
      classDetail: {
        date: moment(event.start).format('YYYY-MM-DD'),
        startTime: moment(event.start).format('HH:mm:ss'),
        endTime: moment(event.end).format('HH:mm:ss'),
        title: event.title,
        teacherId: event.extendedProps?.teacherId 
      },
      extendedProps: {
        ...event.extendedProps,
        packageEndDate: packageInfo.validUntil,
        duration: duration,
        studentId: user?.student?.id, 
        packageInfo: packageInfo 
      }
    };
    
    setSelectedEvent(completeEvent);
    setRescheduleOpen(true);
  };

  const handleRescheduleConfirm = async (selectionData) => {
    setRescheduleOpen(false);
    
    if (!selectedEvent) {
      console.error('No event selected for rescheduling');
      return;
    }
    
    setLoading(true);
    
    try {
      const studentId = user?.student?.id || selectedEvent?.extendedProps?.studentId;
      
      if (!studentId) {
        throw new Error('Student ID not found. Cannot reschedule class.');
      }
      
      const userTimezone = user?.timezone || getCookie(COOKIE_NAMES.TIMEZONE);
      const formattedDate = moment(selectionData.date).format('YYYY-MM-DD');
      const formattedStartTime = selectionData.startTime;
      const formattedEndTime = selectionData.endTime;
      
      const newClassData = {
        date: formattedDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        title: selectedEvent.title || 'Rescheduled Class',
        timezone: ADMIN_TIMEZONE
      };
      
      const teacherId = selectionData.teacherId || selectedEvent?.classDetail?.teacherId;
      
      if (!teacherId) {
        throw new Error(translations.noTeacherSpecified || 'No teacher was specified for the rescheduled class.');
      }
      
      const isDifferentTeacher = selectionData.differentTeacher;
      const teacherName = selectionData.teacher ? `${selectionData.teacher.firstName} ${selectionData.teacher.lastName}` : 'another teacher';
      
      const result = await studentAPI.createRescheduleRecord(
        studentId,
        selectedEvent.id,
        newClassData,
        teacherId, 
        selectionData.differentTeacher 
      );
      
      if (result && (result.success || result.message === 'Class rescheduled successfully')) {
        setPackageInfo(prev => ({
          ...prev,
          rescheduleRemaining: Math.max(0, prev.rescheduleRemaining - 1)
        }));
        
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchStudentData();
        window.dispatchEvent(new Event('yekacouchacademy_data_changed'));
        
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
    const rescheduleCheck = canRescheduleClass(event);
    
    if (rescheduleCheck.canReschedule) {
      handleReschedule(event);
    } else {
      setMessage({
        open: true,
        text: rescheduleCheck.reason || translations.cannotReschedule || 'This class cannot be rescheduled',
        severity: 'info'
      });
    }
  };
  
  const handleRescheduleSuccess = () => {
    fetchStudentData();
    setMessage({
      open: true,
      text: translations.rescheduleSuccess || 'Class rescheduled successfully',
      severity: 'success'
    });
  };

  const handleCloseMessage = () => {
    setMessage({ ...message, open: false });
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    
    if (!isFullScreen) {
      const event = new CustomEvent('dashboard_fullscreen', {
        detail: { fullscreen: true }
      });
      window.dispatchEvent(event);
    } else {
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
      pt: { xs: '60px', sm: 3, md: 4 }, 
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
          <Grid container spacing={3}>
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
                  : new Date(b.sort) - new Date(a.start);
              })
              .slice(0, 6) 
              .map((cls, index) => {
                const userTimezone = user?.timezone || getCookie(COOKIE_NAMES.TIMEZONE);
                  const classDate = moment(cls.start).tz(userTimezone).locale(language).format(translations.shortDateFormat || 'dddd, MMMM D');
                  const classTime = `${moment(cls.start).tz(userTimezone).format(translations.timeFormat || 'h:mm A')} - ${moment(cls.end).tz(userTimezone).format(translations.timeFormat || 'h:mm A')}`;
                
                const isPast = view === 'past';
                const statusColor = isPast
                  ? COLORS.ATTENDED 
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
                    
                const rescheduleCheck = canRescheduleClass(cls);
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
                        {view === 'upcoming' && cls.extendedProps.status !== 'attended' && (
                          <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                            {moment(cls.start).tz(userTimezone).fromNow()}
                          </Typography>
                        )}
                      </Box>
                      
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
      
      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={() => setMessage({...message, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          zIndex: 9999,
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
            zIndex: 9999, 
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