'use client';
import { 
  Box, 
  Typography, 
  Card, 
  Grid, 
  Chip,
  Button,
  Divider,
} from '@mui/material';
import { 
  Event as EventIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  Schedule as ScheduleIcon,
  NearMe as NextIcon,
} from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { COMMON_TRANSITION } from '../../../constants/styleConstants';
import Loading from '../../../components/Loading';
import moment from 'moment';
import 'moment-timezone';
import { getCookie, COOKIE_NAMES } from '../../../utils/cookieUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { timezoneUtils } from '../../../utils/api';
import { ADMIN_TIMEZONE } from '../../../utils/constants';
import { useState, useEffect } from 'react';

const ClassesTab = ({ 
  allClasses, 
  futureClasses, 
  handleOpenReschedule 
}) => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || { mode: 'light' }; // Add fallback
  const { translations } = useLanguage();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  // Get user's timezone
  const userTimezone = user?.timezone || getCookie(COOKIE_NAMES.TIMEZONE);
  
  // Hide loading indicator after component mounted
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Find the next upcoming class by date and time
  const getNextClass = () => {
    if (!allClasses || allClasses.length === 0) return null;
    
    const now = new Date();
    const upcomingClasses = allClasses.filter(cls => {
      if (!cls.classDetail?.date || !cls.classDetail?.startTime) return false;
      if (cls.status !== 'scheduled') return false;
      
      const classDateTime = new Date(`${cls.classDetail.date}T${cls.classDetail.startTime}`);
      return classDateTime > now;
    });
    
    if (upcomingClasses.length === 0) return null;
    
    // Sort by date and time and return the soonest
    return upcomingClasses.sort((a, b) => {
      const dateA = new Date(`${a.classDetail.date}T${a.classDetail.startTime}`);
      const dateB = new Date(`${b.classDetail.date}T${b.classDetail.startTime}`);
      return dateA - dateB;
    })[0];
  };
  
  const nextClass = getNextClass();
  
  // Filter out the next class from the regular classes display
  const remainingClasses = allClasses ? allClasses.filter(cls => 
    cls.status === 'scheduled' && 
    (!nextClass || cls.id !== nextClass.id)
  ) : [];

  if (isLoading) {
    return (
      <Loading 
        message={translations.loadingClasses || "Loading classes..."} 
        fullPage={false} 
        showOverlay={false}
      />
    );
  }

  return (
    <Box>
      {/* Next Class Section */}
      {nextClass && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ 
            color: theme.text.primary,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2 
          }}>
            <NextIcon sx={{ color: '#845EC2' }} />
            {translations.nextClass || 'Your Next Class'}
          </Typography>
          
          <Card sx={{ 
            p: 3, 
            background: theme.mode === 'light' 
              ? 'linear-gradient(135deg, rgba(132, 94, 194, 0.1) 0%, rgba(214, 93, 177, 0.1) 100%)' 
              : 'linear-gradient(135deg, rgba(132, 94, 194, 0.2) 0%, rgba(214, 93, 177, 0.2) 100%)',
            border: theme.mode === 'light' ? '1px solid rgba(132, 94, 194, 0.3)' : '1px solid rgba(132, 94, 194, 0.4)',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            transition: COMMON_TRANSITION,
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' },
              mb: 2,
              gap: 2
            }}>
              <Box>
                <Typography variant="h5" sx={{ color: theme.text.primary, fontWeight: 700, mb: 0.5 }}>
                  {nextClass.classDetail.title || 'Upcoming Class'}
                </Typography>
                <Typography variant="subtitle1" sx={{ color: theme.text.secondary }}>
                  {nextClass.classDetail.description || translations.scheduledClass || 'Scheduled class'}
                </Typography>
              </Box>
              
              {nextClass.canReschedule && (
                <Button
                  variant="outlined"
                  onClick={() => handleOpenReschedule(nextClass.id)}
                  sx={{
                    borderColor: 'rgba(132, 94, 194, 0.5)',
                    color: '#845EC2',
                    '&:hover': {
                      borderColor: '#845EC2',
                      backgroundColor: 'rgba(132, 94, 194, 0.08)',
                    },
                    transition: COMMON_TRANSITION,
                  }}
                >
                  {translations.reschedule || 'Reschedule'}
                </Button>
              )}
            </Box>
            
            <Divider sx={{ mb: 2, opacity: 0.3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CalendarIcon sx={{ color: '#845EC2', mr: 1 }} />
                  <Typography variant="body1" sx={{ color: theme.text.primary, fontWeight: 500 }}>
                    {moment(nextClass.classDetail.date).tz(userTimezone).format('dddd, MMMM D, YYYY')}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 1,
                  justifyContent: { xs: 'flex-start', sm: 'flex-end' } 
                }}>
                  <TimeIcon sx={{ color: '#D65DB1', mr: 1 }} />
                  <Typography variant="body1" sx={{ color: theme.text.primary, fontWeight: 500 }}>
                    {`${timezoneUtils.convertToUserTime(nextClass.classDetail.date, nextClass.classDetail.startTime, ADMIN_TIMEZONE, userTimezone).format('h:mm A')} - ${timezoneUtils.convertToUserTime(nextClass.classDetail.date, nextClass.classDetail.endTime, ADMIN_TIMEZONE, userTimezone).format('h:mm A')}`}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            {nextClass.notes && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: theme.text.secondary }}>
                  {nextClass.notes}
                </Typography>
              </Box>
            )}
          </Card>
        </Box>
      )}
      
      {/* Other Classes Section */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2 
      }}>
        <Typography variant="h6" sx={{ 
          color: theme.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <EventIcon sx={{ color: '#845EC2' }} />
          {translations.upcomingClasses || 'Upcoming Classes'}
        </Typography>
      </Box>
      
      {remainingClasses && remainingClasses.length > 0 ? (
        <>
          {/* Regular classes */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {remainingClasses
              .filter(cls => 
                // Only show active scheduled classes that aren't rescheduled
                cls.status === 'scheduled' && 
                cls.originalClassId === null
              )
              .map((cls) => (
                <Grid item xs={12} sm={6} md={4} key={`class-${cls.id}`}>
                  <Card sx={{ 
                    p: 2, 
                    height: '100%',
                    background: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                    border: theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
                    transition: COMMON_TRANSITION,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.mode === 'light' 
                        ? '0 6px 12px rgba(0,0,0,0.1)' 
                        : '0 6px 12px rgba(0,0,0,0.3)'
                    }
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      mb: 2
                    }}>
                      <Typography variant="h6" sx={{ color: theme.text.primary, fontWeight: 600 }}>
                        {cls.classDetail?.title || 'Class'}
                      </Typography>
                      {cls.canReschedule && (
                        <Chip 
                          size="small" 
                          label={translations.reschedulable || "Reschedulable"} 
                          sx={{ 
                            backgroundColor: 'rgba(132, 94, 194, 0.1)', 
                            color: '#845EC2',
                            fontSize: '0.7rem'
                          }} 
                        />
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon sx={{ color: '#845EC2', mr: 1, fontSize: '1rem' }} />
                      <Typography variant="body2" sx={{ color: theme.text.secondary }}>
                        {cls.classDetail?.date ? 
                          moment(cls.classDetail.date).tz(userTimezone).format('MMM D, YYYY') : 
                          'Date not available'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TimeIcon sx={{ color: '#D65DB1', mr: 1, fontSize: '1rem' }} />
                      <Typography variant="body2" sx={{ color: theme.text.secondary }}>
                                                    {cls.classDetail?.date && cls.classDetail?.startTime && cls.classDetail?.endTime ? 
                              `${timezoneUtils.convertToUserTime(cls.classDetail.date, cls.classDetail.startTime, ADMIN_TIMEZONE, userTimezone).format('h:mm A')} - ${timezoneUtils.convertToUserTime(cls.classDetail.date, cls.classDetail.endTime, ADMIN_TIMEZONE, userTimezone).format('h:mm A')}` : 
                              'Time not available'}
                      </Typography>
                    </Box>
                    
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled={!cls.canReschedule}
                      onClick={() => handleOpenReschedule(cls.id)}
                      sx={{
                        mt: 2,
                        borderColor: 'rgba(132, 94, 194, 0.5)',
                        color: '#845EC2',
                        '&:hover': {
                          borderColor: '#845EC2',
                          backgroundColor: 'rgba(132, 94, 194, 0.08)',
                        },
                        '&.Mui-disabled': {
                          color: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
                          borderColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
                        },
                        transition: COMMON_TRANSITION,
                      }}
                    >
                      {translations.reschedule || 'Reschedule'}
                    </Button>
                  </Card>
                </Grid>
              ))}
          </Grid>
          
          {/* Show rescheduled classes separately if any */}
          {remainingClasses.some(cls => cls.originalClassId !== null) && (
            <>
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" sx={{ 
                color: theme.text.primary,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2
              }}>
                <ScheduleIcon sx={{ color: '#D65DB1' }} />
                {translations.rescheduledClasses || 'Rescheduled Classes'}
              </Typography>
              
              <Grid container spacing={2}>
                {remainingClasses
                  .filter(cls => cls.status === 'scheduled' && cls.originalClassId !== null)
                  .map((cls) => (
                    <Grid item xs={12} sm={6} md={4} key={`rescheduled-${cls.id}`}>
                      <Card sx={{ 
                        p: 2, 
                        height: '100%',
                        background: theme.mode === 'light' 
                          ? 'rgba(214, 93, 177, 0.05)' 
                          : 'rgba(214, 93, 177, 0.15)',
                        border: theme.mode === 'light' 
                          ? '1px solid rgba(214, 93, 177, 0.2)' 
                          : '1px solid rgba(214, 93, 177, 0.3)',
                        transition: COMMON_TRANSITION,
                      }}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          mb: 2
                        }}>
                          <Typography variant="h6" sx={{ color: theme.text.primary, fontWeight: 600 }}>
                            {cls.classDetail?.title || 'Rescheduled Class'}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={translations.rescheduled || "Rescheduled"} 
                            sx={{ 
                              backgroundColor: 'rgba(214, 93, 177, 0.1)', 
                              color: '#D65DB1',
                              fontSize: '0.7rem'
                            }} 
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CalendarIcon sx={{ color: '#845EC2', mr: 1, fontSize: '1rem' }} />
                          <Typography variant="body2" sx={{ color: theme.text.secondary }}>
                            {cls.classDetail?.date ? 
                              moment(cls.classDetail.date).tz(userTimezone).format('MMM D, YYYY') : 
                              'Date not available'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <TimeIcon sx={{ color: '#D65DB1', mr: 1, fontSize: '1rem' }} />
                          <Typography variant="body2" sx={{ color: theme.text.secondary }}>
                            {cls.classDetail?.date && cls.classDetail?.startTime && cls.classDetail?.endTime ? 
                              `${timezoneUtils.convertToUserTime(cls.classDetail.date, cls.classDetail.startTime, ADMIN_TIMEZONE, userTimezone).format('h:mm A')} - ${timezoneUtils.convertToUserTime(cls.classDetail.date, cls.classDetail.endTime, ADMIN_TIMEZONE, userTimezone).format('h:mm A')}` : 
                              'Time not available'}
                          </Typography>
                        </Box>
                        
                        {cls.notes && (
                          <Typography variant="body2" sx={{ 
                            color: theme.text.secondary,
                            mt: 1,
                            p: 1,
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            borderRadius: 1
                          }}>
                            {cls.notes}
                          </Typography>
                        )}
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            </>
          )}
        </>
      ) : (
        <Card sx={{ 
          p: 3, 
          textAlign: 'center',
          background: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
          border: theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <Typography variant="h6" sx={{ color: theme.text.primary, mb: 1 }}>
            {translations.noUpcomingClasses || 'No upcoming classes'}
          </Typography>
          <Typography variant="body1" sx={{ color: theme.text.secondary }}>
            {translations.noUpcomingClassesMessage || "You don't have any scheduled classes at the moment."}
          </Typography>
        </Card>
      )}
    </Box>
  );
};

export default ClassesTab; 