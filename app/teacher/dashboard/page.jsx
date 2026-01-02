'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Avatar,
  Container,
  useMediaQuery,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  Assignment as TaskIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Flag as FlagIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { teacherAPI, fetchWithAuth, timezoneUtils } from '@/app/utils/api';
import { ADMIN_TIMEZONE } from '@/app/utils/constants';
import { format } from 'date-fns';
import ThemeTransition from '@/app/components/ThemeTransition';
import React from 'react';

export default function TeacherDashboard() {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    classes: { classes: [], activities: [] },
    tasks: []
  });
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user || !user.teacherId) {
          console.error('No teacher ID found in user data');
          return;
        }
        
        setLoading(true);
        
        // Get dashboard data
        const data = await teacherAPI.getDashboard(user.teacherId);
        
        // Get assigned students
        try {
          const students = await fetchWithAuth(`/teachers/${user.teacherId}/students`);
          data.students = students || [];
        } catch (error) {
          console.error('Error fetching assigned students:', error);
          setMessage({
            open: true,
            text: `${translations.errorFetchingStudents || 'Could not fetch assigned students'}: ${error.message}`,
            severity: 'error'
          });
          data.students = [];
        }
        
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setMessage({
          open: true,
          text: `${translations.errorLoadingDashboard || 'Failed to load dashboard data'}: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchDashboardData();
    }
  }, [user, translations]);

  // Format time (HH:MM) and convert from admin timezone to user's timezone
  const formatTime = (timeString, dateString) => {
    if (!timeString || !dateString) return '';
    
    try {
      // Use user's preferred timezone if available, otherwise use browser timezone
      const userTimezone = user?.timezone || null;
      return timezoneUtils.formatUserTime(dateString, timeString, ADMIN_TIMEZONE, userTimezone);
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString.substring(0, 5); // Fallback to original format
    }
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

  // Handle task click
  const handleTaskClick = (taskId) => {
    router.push(`/teacher/tasks/${taskId}`);
  };

  // Get dashboard data
  const pendingTasks = dashboardData.tasks || [];
  const assignedStudents = dashboardData.students || [];
  
  // Check if data is available or empty
  const hasTasks = pendingTasks && pendingTasks.length > 0;
  const hasStudents = assignedStudents && assignedStudents.length > 0;

  const handleCloseMessage = () => {
    setMessage({ ...message, open: false });
  };

  return (
    <Container maxWidth="xl" sx={{ 
      py: { xs: 2, sm: 3, md: 4 },
      height: '100%'
    }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: theme?.text?.primary,
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '1.7rem', md: '2rem' },
            mb: 1
          }}
        >
          {translations.teacherDashboard || 'Teacher Dashboard'}
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: theme?.text?.secondary,
            fontSize: { xs: '0.9rem', sm: '1rem' }
          }}
        >
          {translations.welcomeMessage || 'Welcome back'}, {user?.firstName || translations.teacher || 'Teacher'}!
        </Typography>
      </Box>
      
      {/* Dashboard Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, height: '50vh', alignItems: 'center' }}>
          <CircularProgress sx={{ color: '#845EC2' }} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Pending Tasks */}
          <Grid item xs={12} md={12}>
            <Card sx={{ 
              height: '100%',
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              border: theme.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            }}>
              <CardHeader
                title={translations.pendingTasks || "Pending Tasks"}
                sx={{
                  bgcolor: 'secondary.light',
                  color: 'secondary.contrastText',
                  '& .MuiCardHeader-title': {
                    fontWeight: 600,
                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
                  },
                  p: { xs: 2, sm: 2.5 }
                }}
              />
              <Divider />
              <List sx={{ 
                p: 0, 
                overflow: 'auto', 
                maxHeight: { xs: 300, md: 400 },
                '&::-webkit-scrollbar': {
                  width: '8px'
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(0, 0, 0, 0.05)'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(132, 94, 194, 0.3)',
                  borderRadius: '4px'
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: 'rgba(132, 94, 194, 0.5)'
                }
              }}>
                {loading ? (
                  <ListItem sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={32} sx={{ color: '#D65DB1' }} />
                  </ListItem>
                ) : hasTasks ? (
                  pendingTasks.map((task) => (
                    <ListItem
                      key={task.id}
                      divider
                      button
                      onClick={() => handleTaskClick(task.id)}
                      sx={{ 
                        p: { xs: 2, sm: 2.5 },
                        transition: 'background-color 0.2s ease',
                        '&:hover': {
                          bgcolor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <TaskIcon sx={{ color: '#D65DB1' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {task.title}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {task.coordinator && (
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <PersonIcon sx={{ fontSize: '0.9rem', mr: 1, color: theme.text.secondary }} />
                                <Typography variant="body2" sx={{ color: theme.text.secondary, fontSize: '0.85rem' }}>
                                  {translations.assignedBy || 'Assigned by'}: {`${task.coordinator.firstName || ''} ${task.coordinator.lastName || ''}`}
                                </Typography>
                              </Box>
                            )}
                            {task.dueDate && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CalendarIcon sx={{ fontSize: '0.9rem', mr: 1, color: theme.text.secondary }} />
                                <Typography variant="body2" sx={{ color: theme.text.secondary, fontSize: '0.85rem' }}>
                                  {translations.dueDate || 'Due date'}: {formatDate(task.dueDate)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        }
                      />
                      <Chip 
                        label={task.status === 'in_progress' ? (translations.inProgress || 'In Progress') : (translations.pending || 'Pending')}
                        size="small" 
                        sx={{ 
                          bgcolor: task.status === 'in_progress' ? 'rgba(255, 186, 8, 0.1)' : 'rgba(255, 111, 145, 0.1)',
                          color: task.status === 'in_progress' ? '#FFBA08' : '#FF6F91',
                          fontWeight: 600,
                          borderRadius: 1,
                          fontSize: '0.75rem'
                        }} 
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <TaskIcon sx={{ fontSize: 48, color: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' }} />
                    <Typography align="center" sx={{ color: theme.text.secondary }}>
                      {translations.noPendingTasks || "You don't have any pending tasks"}
                    </Typography>
                    <Typography variant="body2" align="center" sx={{ color: theme.text.secondary, fontSize: '0.9rem', maxWidth: '80%' }}>
                      {translations.tasksAssignedByCoordinator || "Tasks will appear here when they are assigned to you by a coordinator"}
                    </Typography>
                  </ListItem>
                )}
              </List>
            </Card>
          </Grid>
          
          {/* Assigned Students */}
          <Grid item xs={12}>
            <Card sx={{ 
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              border: theme.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            }}>
              <CardHeader
                title={translations.assignedStudents || "My Students"}
                sx={{
                  bgcolor: 'info.light',
                  color: 'info.contrastText',
                  '& .MuiCardHeader-title': {
                    fontWeight: 600,
                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
                  },
                  p: { xs: 2, sm: 2.5 }
                }}
              />
              <Divider />
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Grid container spacing={3}>
                  {loading ? (
                    <Grid item xs={12}>
                      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress sx={{ color: '#845EC2' }} />
                      </Box>
                    </Grid>
                  ) : hasStudents ? (
                    assignedStudents.map((student) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={student.id}>
                        <Card sx={{ 
                          p: 2, 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          borderRadius: 3,
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                          border: theme.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.03)',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)'
                          }
                        }}>
                          <Avatar
                            sx={{
                              width: 80,
                              height: 80,
                              mb: 2,
                              bgcolor: '#845EC2',
                              fontSize: '2rem'
                            }}
                          >
                            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                          </Avatar>
                          <Typography variant="h6" align="center" sx={{ mb: 0.5, fontWeight: 600 }}>
                            {student.name} {student.surname || ''}
                          </Typography>
                          <Typography variant="body2" align="center" sx={{ color: theme.text.secondary, mb: 2 }}>
                            {student.email || student.user?.email || translations.noEmail || 'No email provided'}
                          </Typography>
                          <Box sx={{ 
                            display: 'flex', 
                            gap: 1.5,
                            width: '100%',
                            justifyContent: 'center'
                          }}>
                           
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => router.push(`/teacher/schedule?studentId=${student.id}&studentName=${encodeURIComponent(student.name + ' ' + (student.surname || ''))}`)}
                              sx={{
                                borderColor: '#845EC2',
                                color: '#845EC2',
                                '&:hover': {
                                  borderColor: '#6b4c9e',
                                  bgcolor: 'rgba(132, 94, 194, 0.1)'
                                },
                                px: 2,
                                borderRadius: 2
                              }}
                            >
                              {translations.schedule || 'Schedule'}
                            </Button>
                          </Box>
                        </Card>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <SchoolIcon sx={{ fontSize: 48, color: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' }} />
                        <Typography align="center" sx={{ color: theme.text.secondary }}>
                          {translations.noAssignedStudents || "You don't have any assigned students yet"}
                        </Typography>
                        <Typography variant="body2" align="center" sx={{ color: theme.text.secondary, fontSize: '0.9rem', maxWidth: '80%' }}>
                          {translations.studentsAssignedByAdmin || "Students will appear here when they are assigned to you by an admin"}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Snackbar for messages */}
      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          zIndex: 9999 // Ensure it appears above modals
        }}
      >
        <Alert 
          onClose={handleCloseMessage} 
          severity={message.severity}
          elevation={6}
          variant="filled"
          sx={{ 
            width: '100%',
            borderRadius: 2,
            zIndex: 9999 // Ensure alert appears above modals
          }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Container>
  );
} 