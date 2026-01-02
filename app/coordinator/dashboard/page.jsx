'use client';
import { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  CircularProgress,
  Paper,
  CardHeader,
  Alert,
  Container,
  useMediaQuery,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Assignment as TaskIcon,
  Grading as ExamIcon,
  Group as TeacherIcon,
  CalendarToday as ScheduleIcon
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { fetchWithAuth, coordinatorAPI } from '@/app/utils/api';

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    tasks: {
      pending: 0,
      inProgress: 0,
      completed: 0,
      reviewed: 0
    },
    exams: {
      draft: 0,
      assigned: 0, 
      completed: 0,
      approved: 0,
      rejected: 0
    },
    teachers: 0,
    recentTasks: [],
    recentExams: [],
    recentReschedules: []
  });
  const [error, setError] = useState(null);
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch teachers count
        const teachersData = await fetchWithAuth('/coordinator/teachers');
        const teachersCount = teachersData?.length || 0;
        
        // Fetch task statistics
        const taskData = await fetchWithAuth('/coordinator/tasks');
        const taskStats = {
          pending: taskData.filter(task => task.status === 'pending').length,
          inProgress: taskData.filter(task => task.status === 'in_progress').length,
          completed: taskData.filter(task => task.status === 'completed').length,
          reviewed: taskData.filter(task => task.status === 'reviewed').length
        };
        
        // Fetch exam statistics
        const examsData = await fetchWithAuth('/coordinator/exams');
        const examStats = {
          draft: examsData.filter(exam => exam.status === 'draft').length,
          assigned: examsData.filter(exam => exam.status === 'assigned').length,
          completed: examsData.filter(exam => exam.status === 'completed').length,
          approved: examsData.filter(exam => exam.status === 'approved').length,
          rejected: examsData.filter(exam => exam.status === 'rejected').length
        };
        
        // Fetch rescheduled classes
        const rescheduledClasses = await coordinatorAPI.getRescheduledClasses();
        
        // Get recent tasks (last 3)
        const recentTasks = taskData
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 3);
        
        // Get recent exams (last 3)
        const recentExams = examsData
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 3);
        
        // Get recent reschedules (last 5)
        const recentReschedules = rescheduledClasses
          .sort((a, b) => new Date(b.rescheduledAt) - new Date(a.rescheduledAt))
          .slice(0, 5);
        
        setDashboardData({
          tasks: taskStats,
          exams: examStats,
          teachers: teachersCount,
          recentTasks,
          recentExams,
          recentReschedules
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const taskStatusData = [
    { name: translations.pending || 'Pending', value: dashboardData.tasks.pending },
    { name: translations.inProgress || 'In Progress', value: dashboardData.tasks.inProgress },
    { name: translations.completed || 'Completed', value: dashboardData.tasks.completed },
    { name: translations.reviewed || 'Reviewed', value: dashboardData.tasks.reviewed }
  ];

  const examStatusData = [
    { name: translations.draft || 'Draft', value: dashboardData.exams.draft },
    { name: translations.assigned || 'Assigned', value: dashboardData.exams.assigned },
    { name: translations.completed || 'Completed', value: dashboardData.exams.completed },
    { name: translations.approved || 'Approved', value: dashboardData.exams.approved },
    { name: translations.rejected || 'Rejected', value: dashboardData.exams.rejected }
  ];

  const getStatusColor = (status) => {
    const statusColors = {
      'pending': '#FFC107',
      'in_progress': '#2196F3',
      'completed': '#4CAF50',
      'reviewed': '#9C27B0',
      'draft': '#607D8B',
      'assigned': '#FF9800',
      'approved': '#8BC34A',
      'rejected': '#F44336'
    };
    return statusColors[status] || '#9E9E9E';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        gutterBottom 
        sx={{ 
          color: theme?.text?.primary || 'inherit',
          mb: 3,
          fontWeight: 500
        }}
      >
        {translations.welcome || 'Welcome'}, {user?.firstName || translations.coordinator || 'Coordinator'}!
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 4 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      <Grid container spacing={4} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            sx={{ 
              bgcolor: 'primary.light', 
              color: 'primary.contrastText',
              borderRadius: 2,
              boxShadow: 3,
              height: '100%',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ 
                bgcolor: 'primary.dark', 
                borderRadius: '50%', 
                p: 1.5, 
                mr: 2.5, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <TaskIcon sx={{ fontSize: 36 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {dashboardData.tasks.pending + dashboardData.tasks.inProgress}
                </Typography>
                <Typography variant="body1">
                  {translations.activeTasks || 'Active Tasks'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            sx={{ 
              bgcolor: 'secondary.light', 
              color: 'secondary.contrastText',
              borderRadius: 2,
              boxShadow: 3,
              height: '100%',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ 
                bgcolor: 'secondary.dark', 
                borderRadius: '50%', 
                p: 1.5, 
                mr: 2.5, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <ExamIcon sx={{ fontSize: 36 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {dashboardData.exams.draft + dashboardData.exams.assigned}
                </Typography>
                <Typography variant="body1">
                  {translations.activeExams || 'Active Exams'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            sx={{ 
              bgcolor: 'info.light', 
              color: 'info.contrastText',
              borderRadius: 2,
              boxShadow: 3,
              height: '100%',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ 
                bgcolor: 'info.dark', 
                borderRadius: '50%', 
                p: 1.5, 
                mr: 2.5, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <TeacherIcon sx={{ fontSize: 36 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {dashboardData.teachers}
                </Typography>
                <Typography variant="body1">
                  {translations.teachers || 'Teachers'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card 
            sx={{ 
              bgcolor: 'success.light', 
              color: 'success.contrastText',
              borderRadius: 2,
              boxShadow: 3,
              height: '100%',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ 
                bgcolor: 'success.dark', 
                borderRadius: '50%', 
                p: 1.5, 
                mr: 2.5, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <ScheduleIcon sx={{ fontSize: 36 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {dashboardData.tasks.reviewed + dashboardData.exams.approved}
                </Typography>
                <Typography variant="body1">
                  {translations.completedItems || 'Completed Items'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              boxShadow: 2
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                mb: 3,
                fontWeight: 'medium',
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 1
              }}
            >
              {translations.taskStatus || 'Task Status'}
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={!isMobile}
                  outerRadius={isMobile ? 60 : 100}
                  fill="#8884d8"
                  dataKey="value"
                  label={!isMobile && (({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`)}
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend layout={isMobile ? "horizontal" : "vertical"} align="center" verticalAlign="bottom" />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              boxShadow: 2
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                mb: 3,
                fontWeight: 'medium',
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 1
              }}
            >
              {translations.examStatus || 'Exam Status'}
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
              <BarChart
                data={examStatusData}
                margin={{ 
                  top: 10, 
                  right: isMobile ? 10 : 30, 
                  left: isMobile ? 10 : 20, 
                  bottom: isMobile ? 30 : 15 
                }}
                barSize={isMobile ? 15 : 30}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={isMobile ? -45 : 0} 
                  textAnchor={isMobile ? "end" : "middle"}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  height={isMobile ? 60 : 30}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                  {examStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <CardHeader 
              title={translations.recentTasks || 'Recent Tasks'} 
              sx={{ 
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 1,
                '& .MuiCardHeader-title': {
                  fontWeight: 'medium',
                  fontSize: '1.25rem'
                }
              }}
            />
            <List sx={{ maxHeight: 300, overflow: 'auto', py: 0 }}>
              {dashboardData.recentTasks.length > 0 ? (
                dashboardData.recentTasks.map((task) => (
                  <ListItem 
                    key={task.id} 
                    divider
                    sx={{ 
                      px: 3,
                      py: 2
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                          {task.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {translations.assignedTo || 'Assigned to'}: {task.assignedTeacher?.firstName || ''} {task.assignedTeacher?.lastName || ''}
                        </Typography>
                      }
                      sx={{ mr: 2 }}
                    />
                    <Box 
                      sx={{ 
                        backgroundColor: getStatusColor(task.status), 
                        borderRadius: 2, 
                        px: 2, 
                        py: 0.5, 
                        color: 'white',
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem',
                        fontWeight: 'medium'
                      }}
                    >
                      {translations[task.status.replace('_', '')] || task.status.replace('_', ' ')}
                    </Box>
                  </ListItem>
                ))
              ) : (
                <ListItem sx={{ px: 3, py: 2 }}>
                  <ListItemText primary={translations.noRecentTasks || 'No recent tasks'} />
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <CardHeader 
              title={translations.recentExams || 'Recent Exams'} 
              sx={{ 
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 1,
                '& .MuiCardHeader-title': {
                  fontWeight: 'medium',
                  fontSize: '1.25rem'
                }
              }}
            />
            <List sx={{ maxHeight: 300, overflow: 'auto', py: 0 }}>
              {dashboardData.recentExams.length > 0 ? (
                dashboardData.recentExams.map((exam) => (
                  <ListItem 
                    key={exam.id} 
                    divider
                    sx={{ 
                      px: 3,
                      py: 2
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                          {exam.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {translations.assignedTo || 'Assigned to'}: {exam.assignedTeacher?.firstName || ''} {exam.assignedTeacher?.lastName || ''}
                        </Typography>
                      }
                      sx={{ mr: 2 }}
                    />
                    <Box 
                      sx={{ 
                        backgroundColor: getStatusColor(exam.status), 
                        borderRadius: 2, 
                        px: 2, 
                        py: 0.5, 
                        color: 'white',
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                        fontSize: '0.875rem',
                        fontWeight: 'medium'
                      }}
                    >
                      {translations[exam.status] || exam.status.replace('_', ' ')}
                    </Box>
                  </ListItem>
                ))
              ) : (
                <ListItem sx={{ px: 3, py: 2 }}>
                  <ListItemText primary={translations.noRecentExams || 'No recent exams'} />
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>
        
        {/* Recent Reschedules Section */}
        {dashboardData.recentReschedules.length > 0 && (
          <Grid item xs={12} sx={{ mt: 4 }}>
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardHeader
                title={translations.recentRescheduledClasses || "Recent Rescheduled Classes"}
                sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.50' }}
              />
              <Box sx={{ p: 0 }}>
                <List sx={{ width: '100%' }}>
                  {dashboardData.recentReschedules.map(reschedule => (
                    <ListItem key={reschedule.id} divider>
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {reschedule.student ? `${reschedule.student.name} ${reschedule.student.surname}` : 'Unknown Student'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(reschedule.rescheduledAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={5}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ bgcolor: '#FFC107', width: 4, height: 36, borderRadius: 1, mr: 1.5 }} />
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  From:
                                </Typography>
                                <Typography variant="body1">
                                  {reschedule.oldClass 
                                    ? `${new Date(reschedule.oldClass.userDate || reschedule.oldClass.date).toLocaleDateString()} ${(reschedule.oldClass.userStartTime || reschedule.oldClass.startTime).substring(0, 5)}` 
                                    : 'Unknown'}
                                </Typography>
                                {reschedule.oldTeacher && (
                                  <Typography variant="caption" color="text.secondary">
                                    {`${reschedule.oldTeacher.firstName} ${reschedule.oldTeacher.lastName}`}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={5}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ bgcolor: '#4CAF50', width: 4, height: 36, borderRadius: 1, mr: 1.5 }} />
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  To:
                                </Typography>
                                <Typography variant="body1">
                                  {reschedule.newClass 
                                    ? `${new Date(reschedule.newClass.userDate || reschedule.newClass.date).toLocaleDateString()} ${(reschedule.newClass.userStartTime || reschedule.newClass.startTime).substring(0, 5)}` 
                                    : 'Unknown'}
                                </Typography>
                                {reschedule.newTeacher && (
                                  <Typography variant="caption" color="text.secondary">
                                    {`${reschedule.newTeacher.firstName} ${reschedule.newTeacher.lastName}`}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            {reschedule.differentTeacher && (
                              <Chip 
                                size="small" 
                                label="Teacher Change"
                                color="success" 
                                variant="outlined"
                                sx={{ fontWeight: 500, mb: 1 }}
                              />
                            )}
                          </Grid>
                        </Grid>
                        
                        {reschedule.reason && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              mt: 1, 
                              fontStyle: 'italic',
                              borderLeft: '3px solid rgba(0,0,0,0.1)',
                              pl: 1.5,
                              py: 0.5 
                            }}
                          >
                            "{reschedule.reason}"
                          </Typography>
                        )}
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
} 