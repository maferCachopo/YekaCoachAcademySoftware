'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Divider,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Event as EventIcon,
  Assignment as TaskIcon,
  School as ExamIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { fetchWithAuth, timezoneUtils } from '@/app/utils/api';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { ADMIN_TIMEZONE } from '@/app/utils/constants';

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id;
  const { theme } = useTheme();
  const themeMode = theme?.mode || 'light';
  const { user } = useAuth();
  
  // Function to convert time from admin timezone to user timezone for work/break hours
  const formatTimeToUserTimezone = (time, day) => {
    if (!time) return time;
    
    // We need a valid date for the conversion, so we use the current week's corresponding day
    const today = new Date();
    const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day.toLowerCase());
    
    // If day isn't recognized, use today's date as fallback
    if (dayIndex === -1) {
      console.log('Day not recognized:', day);
      return time; // Return the original time if day isn't valid
    }
    
    // Calculate the date for the specified day in the current week
    const dayDiff = dayIndex - today.getDay();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + dayDiff);
    
    const dateString = targetDate.toISOString().split('T')[0];
    const userTimezone = user?.timezone || null;
    
    // Debug log
    console.log('Timezone conversion for work/break hours:', {
      day,
      time,
      dateString,
      userTimezone,
      adminTimezone: ADMIN_TIMEZONE
    });
    
    return timezoneUtils.formatUserTime(dateString, time, ADMIN_TIMEZONE, userTimezone);
  };
  
  // Function to convert class time from admin timezone to user timezone
  const formatClassTime = (time, dateString) => {
    if (!time || !dateString) return time;
    
    const userTimezone = user?.timezone || null;
    
    // Debug log
    console.log('Timezone conversion for class:', {
      dateString,
      time,
      userTimezone,
      adminTimezone: ADMIN_TIMEZONE
    });
    
    return timezoneUtils.formatUserTime(dateString, time, ADMIN_TIMEZONE, userTimezone);
  };
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [schedule, setSchedule] = useState({
    classes: [],
    tasks: [],
    exams: []
  });
  const [error, setError] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [taskViewOpen, setTaskViewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [examViewOpen, setExamViewOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  
  // Filters
  const [classFilter, setClassFilter] = useState('upcoming');
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [classStatusFilter, setClassStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all');
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [examSearchTerm, setExamSearchTerm] = useState('');
  
  // Pagination
  const [classPage, setClassPage] = useState(0);
  const [classRowsPerPage, setClassRowsPerPage] = useState(10);
  const [taskPage, setTaskPage] = useState(0);
  const [taskRowsPerPage, setTaskRowsPerPage] = useState(10);
  const [examPage, setExamPage] = useState(0);
  const [examRowsPerPage, setExamRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchTeacherDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth(`/coordinator/teachers/${teacherId}/schedule`);
        
        console.log('API response:', data);
        
        // Debug work hours and break hours
        console.log('Work hours from API:', JSON.stringify(data.workHours || {}, null, 2));
        console.log('Break hours from API:', JSON.stringify(data.breakHours || {}, null, 2));
        
        setTeacher(data.teacher);
        setAssignedStudents(data.assignedStudents || []);
        
        // Ensure work hours and break hours have proper format
        const workHours = data.workHours || {};
        const breakHours = data.breakHours || {};
        
        // Ensure all time slots have proper format (HH:MM)
        Object.keys(workHours).forEach(day => {
          if (Array.isArray(workHours[day])) {
            workHours[day] = workHours[day].map(slot => ({
              start: slot.start ? (slot.start.includes(':') ? slot.start : `${slot.start.padStart(2, '0')}:00`) : '09:00',
              end: slot.end ? (slot.end.includes(':') ? slot.end : `${slot.end.padStart(2, '0')}:00`) : '17:00'
            }));
          }
        });
        
        Object.keys(breakHours).forEach(day => {
          if (Array.isArray(breakHours[day])) {
            breakHours[day] = breakHours[day].map(slot => ({
              start: slot.start ? (slot.start.includes(':') ? slot.start : `${slot.start.padStart(2, '0')}:00`) : '12:00',
              end: slot.end ? (slot.end.includes(':') ? slot.end : `${slot.end.padStart(2, '0')}:00`) : '13:00'
            }));
          }
        });
        
        setSchedule({
          workHours,
          breakHours,
          classes: data.classes || [],
          tasks: data.tasks || [],
          exams: data.exams || []
        });
        
        console.log('Classes received:', data.classes?.length || 0);
      } catch (err) {
        console.error('Error fetching teacher schedule:', err);
        setError(err.message || 'Failed to fetch teacher schedule');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeacherDetails();
  }, [teacherId]);

  const handleGoBack = () => {
    router.back();
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };
  
  // Process schedule classes to handle rescheduled classes properly
  // Do this only when the data is initially loaded from the API
  useEffect(() => {
    if (!schedule.classes || !Array.isArray(schedule.classes)) return;
    
    // Process classes only when data is fetched (happens once)
    if (loading === false && schedule.classes.length > 0) {
      // Filter out classes that have been rescheduled based on their status
      const processedClasses = schedule.classes.filter(classItem => {
        // Skip classes with 'rescheduled' status (these are original classes that were rescheduled)
        if (classItem.status === 'rescheduled') return false;
        
        // For classes that have originalClassId set, it means this is a rescheduled class
        if (classItem.originalClassId) {
          // This is a rescheduled class, make sure it has the proper flag
          classItem.isRescheduled = true;
        }
        
        // Keep all other classes
        return true;
      });
      
      // Debug log
      console.log('Coordinator view - processed classes:', {
        original: schedule.classes.length,
        filtered: processedClasses.length,
        rescheduledCount: processedClasses.filter(c => c.isRescheduled).length,
        statusCounts: processedClasses.reduce((counts, c) => {
          counts[c.status] = (counts[c.status] || 0) + 1;
          return counts;
        }, {})
      });
      
      // Update the schedule with the processed classes
      setSchedule(prevSchedule => ({
        ...prevSchedule,
        classes: processedClasses
      }));
    }
  }, [loading, teacherId]);

  // Create a memoized version of filtered classes to avoid re-filtering on every render
  const filteredClasses = useMemo(() => {
    return schedule.classes.filter(cls => {
      // Convert class date to Date object for comparison
      const classDate = new Date(`${cls.date}T${cls.startTime}`);
      const today = startOfDay(new Date());
      
      // Filter by upcoming/past status
      if (classFilter === 'upcoming' && isBefore(classDate, today)) {
        return false;
      }
      if (classFilter === 'past' && isAfter(classDate, today)) {
        return false;
      }
      
      // Filter by status
      if (classStatusFilter !== 'all' && cls.status !== classStatusFilter) {
        return false;
      }
      
      // Filter by date range
      if (startDate && endDate) {
        const start = startOfDay(new Date(startDate));
        const end = startOfDay(new Date(endDate));
        const classDateOnly = startOfDay(classDate);
        
        if (isBefore(classDateOnly, start) || isAfter(classDateOnly, end)) {
          return false;
        }
      } else if (startDate) {
        const start = startOfDay(new Date(startDate));
        const classDateOnly = startOfDay(classDate);
        
        if (isBefore(classDateOnly, start)) {
          return false;
        }
      } else if (endDate) {
        const end = startOfDay(new Date(endDate));
        const classDateOnly = startOfDay(classDate);
        
        if (isAfter(classDateOnly, end)) {
          return false;
        }
      }
      
      // Filter by search term
      if (classSearchTerm) {
        const searchLower = classSearchTerm.toLowerCase();
        const studentName = cls.studentName ? 
          (cls.studentSurname ? 
            `${cls.studentName} ${cls.studentSurname}`.toLowerCase() : 
            cls.studentName.toLowerCase()) : 
          (cls.student?.name && cls.student?.surname ? 
            `${cls.student.name} ${cls.student.surname}`.toLowerCase() : 
            '');
        const titleLower = (cls.title || '').toLowerCase();
        
        return studentName.includes(searchLower) || titleLower.includes(searchLower);
      }
      
      return true;
    });
  }, [schedule.classes, classFilter, classSearchTerm, classStatusFilter, startDate, endDate]);
  
  // Filter tasks based on current filters - memoized to prevent unnecessary recalculations
  const filteredTasks = useMemo(() => {
    return schedule.tasks.filter(task => {
      // Filter by status
      if (taskFilter !== 'all' && task.status !== taskFilter) {
        return false;
      }
      
      // Filter by search term
      if (taskSearchTerm) {
        const searchLower = taskSearchTerm.toLowerCase();
        const titleLower = (task.title || '').toLowerCase();
        const descLower = (task.description || '').toLowerCase();
        
        return titleLower.includes(searchLower) || descLower.includes(searchLower);
      }
      
      return true;
    });
  }, [schedule.tasks, taskFilter, taskSearchTerm]);
  
  // Filter exams based on current filters - memoized to prevent unnecessary recalculations
  const filteredExams = useMemo(() => {
    return schedule.exams.filter(exam => {
      // Filter by status
      if (examFilter !== 'all' && exam.status !== examFilter) {
        return false;
      }
      
      // Filter by search term
      if (examSearchTerm) {
        const searchLower = examSearchTerm.toLowerCase();
        const titleLower = (exam.title || '').toLowerCase();
        const descLower = (exam.description || '').toLowerCase();
        
        return titleLower.includes(searchLower) || descLower.includes(searchLower);
      }
      
      return true;
    });
  }, [schedule.exams, examFilter, examSearchTerm]);
  
  // Handle pagination for classes
  const handleClassChangePage = (event, newPage) => {
    setClassPage(newPage);
  };
  
  const handleClassChangeRowsPerPage = (event) => {
    setClassRowsPerPage(parseInt(event.target.value, 10));
    setClassPage(0);
  };
  
  // Handle pagination for tasks
  const handleTaskChangePage = (event, newPage) => {
    setTaskPage(newPage);
  };
  
  const handleTaskChangeRowsPerPage = (event) => {
    setTaskRowsPerPage(parseInt(event.target.value, 10));
    setTaskPage(0);
  };
  
  // Handle pagination for exams
  const handleExamChangePage = (event, newPage) => {
    setExamPage(newPage);
  };
  
  const handleExamChangeRowsPerPage = (event) => {
    setExamRowsPerPage(parseInt(event.target.value, 10));
    setExamPage(0);
  };
  
  // Handle task viewing
  const handleOpenTaskView = (task) => {
    setSelectedTask(task);
    setTaskViewOpen(true);
  };
  
  // Handle exam viewing
  const handleOpenExamView = (exam) => {
    setSelectedExam(exam);
    setExamViewOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error.message || error}
        <Button onClick={handleGoBack} sx={{ ml: 2 }}>
          Go Back
        </Button>
      </Alert>
    );
  }

  if (!teacher) {
    return (
      <Alert severity="warning">
        Teacher not found
        <Button onClick={handleGoBack} sx={{ ml: 2 }}>
          Go Back
        </Button>
      </Alert>
    );
  }

  return (
    <Box className={themeMode === 'light' ? 'light-mode' : 'dark-mode'}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 4,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handleGoBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ 
            color: themeMode === 'light' ? '#333' : '#fff',
            fontWeight: 600
          }}>
            {teacher.firstName} {teacher.lastName}'s Details
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity={error.type || 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error.message || error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Teacher Info Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            mb: 3, 
            boxShadow: themeMode === 'light' ? '0 2px 4px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
            bgcolor: themeMode === 'light' ? '#fff' : '#1e1e2f'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <Box sx={{ ml: 2 }}>
                  <Typography variant="h5" sx={{ color: themeMode === 'light' ? '#333' : '#fff' }}>
                    {teacher.firstName} {teacher.lastName}
                  </Typography>
                  <Chip 
                    label={teacher.isCoordinator ? "Teacher & Coordinator" : "Teacher"} 
                    color={teacher.isCoordinator ? "secondary" : "primary"} 
                    size="small" 
                    sx={{ mt: 0.5 }} 
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <List dense>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'secondary.light' }}>
                      <EmailIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Email"
                    secondary={teacher.user?.email || 'Not available'}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'secondary.light' }}>
                      <PhoneIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Phone"
                    secondary={teacher.phone || 'Not provided'}
                  />
                </ListItem>
              </List>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Specialties</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {teacher.specialties && teacher.specialties.length > 0 ? 
                    teacher.specialties.map((specialty, index) => (
                      <Chip 
                        key={index}
                        label={specialty}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                    )) : 
                    <Typography variant="body2" color="text.secondary">No specialties specified</Typography>
                  }
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Work Hours */}
          <Paper sx={{ 
            p: 2, 
            mb: 3,
            boxShadow: themeMode === 'light' ? '0 2px 4px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
            bgcolor: themeMode === 'light' ? '#fff' : '#1e1e2f'
          }}>
            <Typography variant="h6" gutterBottom>Work Hours</Typography>
            {Object.entries(schedule.workHours || {}).map(([day, slots]) => (
              slots && slots.length > 0 && (
                <Box key={day} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                    {day}:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    {slots.map((slot, idx) => (
                      <Chip
                        key={idx}
                        label={slot.start && slot.end ? 
                          `${formatTimeToUserTimezone(slot.start, day)} - ${formatTimeToUserTimezone(slot.end, day)}` : 
                          'Invalid time'
                        }
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
              )
            ))}

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>Break Hours</Typography>
            {Object.entries(schedule.breakHours || {}).some(([_, slots]) => slots && slots.length > 0) ? (
              Object.entries(schedule.breakHours || {}).map(([day, slots]) => (
                slots && slots.length > 0 && (
                  <Box key={day} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                      {day}:
                    </Typography>
                    <Box sx={{ pl: 2 }}>
                      {slots.map((slot, idx) => (
                                              <Chip
                        key={idx}
                        label={slot.start && slot.end ? 
                          `${formatTimeToUserTimezone(slot.start, day)} - ${formatTimeToUserTimezone(slot.end, day)}` : 
                          'Invalid time'
                        }
                        color="warning"
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                      ))}
                    </Box>
                  </Box>
                )
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">No break hours set</Typography>
            )}
          </Paper>
          
          {/* Assigned Students */}
          <Paper sx={{ 
            p: 2, 
            mb: 3,
            boxShadow: themeMode === 'light' ? '0 2px 4px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
            bgcolor: themeMode === 'light' ? '#fff' : '#1e1e2f'
          }}>
            <Typography variant="h6" gutterBottom>
              Assigned Students ({assignedStudents.length})
            </Typography>
            
            {assignedStudents.length > 0 ? (
              <List dense>
                {assignedStudents.map(student => (
                  <ListItem key={student.id} divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'info.light' }}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={`${student.name} ${student.surname}`}
                      secondary={
                        <>
                          <Typography variant="caption" component="span" display="block">
                            {student.user?.email || 'No email'}
                          </Typography>
                          <Typography variant="caption" component="span" display="block">
                            {student.phone || 'No phone'}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No students assigned to this teacher
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Main Content Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ 
            boxShadow: themeMode === 'light' ? '0 2px 4px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
            bgcolor: themeMode === 'light' ? '#fff' : '#1e1e2f',
            overflow: 'hidden'
          }}>
            <Tabs 
              value={tabIndex} 
              onChange={handleTabChange} 
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                '& .MuiTab-root': {
                  color: themeMode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                  py: 2
                },
                '& .Mui-selected': {
                  color: themeMode === 'light' ? 'primary.main' : 'primary.light'
                }
              }}
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EventIcon sx={{ mr: 1 }} />
                    Classes
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TaskIcon sx={{ mr: 1 }} />
                    Tasks
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ExamIcon sx={{ mr: 1 }} />
                    Exams
                  </Box>
                } 
              />
            </Tabs>

            {/* Classes Tab */}
            {tabIndex === 0 && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h6">
                    Classes 
                    <Chip 
                      label={filteredClasses.length} 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 1 }} 
                    />
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      placeholder="Search classes..."
                      size="small"
                      value={classSearchTerm}
                      onChange={(e) => setClassSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel id="class-filter-label">Time Range</InputLabel>
                      <Select
                        labelId="class-filter-label"
                        value={classFilter}
                        label="Time Range"
                        onChange={(e) => setClassFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Classes</MenuItem>
                        <MenuItem value="upcoming">Upcoming</MenuItem>
                        <MenuItem value="past">Past</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel id="class-status-filter-label">Status</InputLabel>
                      <Select
                        labelId="class-status-filter-label"
                        value={classStatusFilter}
                        label="Status"
                        onChange={(e) => setClassStatusFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Statuses</MenuItem>
                        <MenuItem value="scheduled">Scheduled</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
                
                {/* Date Range Filter */}
                <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                  <Typography variant="subtitle2">Date Range:</Typography>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="From"
                      value={startDate}
                      onChange={(newValue) => {
                        setStartDate(newValue);
                        // Reset pagination when filter changes
                        setClassPage(0);
                      }}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                    <DatePicker
                      label="To"
                      value={endDate}
                      onChange={(newValue) => {
                        setEndDate(newValue);
                        // Reset pagination when filter changes
                        setClassPage(0);
                      }}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </LocalizationProvider>
                  {(startDate || endDate) && (
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => {
                        setStartDate(null);
                        setEndDate(null);
                      }}
                    >
                      Clear Dates
                    </Button>
                  )}
                </Box>

                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredClasses.length > 0 ? (
                        filteredClasses
                          .slice(classPage * classRowsPerPage, classPage * classRowsPerPage + classRowsPerPage)
                          .map((cls) => (
                            <TableRow key={cls.id}>
                              <TableCell>
                                {cls.studentName ? 
                                  (cls.studentSurname ? 
                                    `${cls.studentName} ${cls.studentSurname}` : 
                                    // Handle case where studentName might contain full name already
                                    cls.studentName) : 
                                  (cls.student?.name && cls.student?.surname ? 
                                    `${cls.student.name} ${cls.student.surname}` : 
                                    'No student assigned')}
                                {cls.isRescheduled && (
                                  <Tooltip title="This class was rescheduled">
                                    <Chip 
                                      size="small" 
                                      label="Rescheduled" 
                                      color="warning" 
                                      variant="outlined"
                                      sx={{ ml: 1, fontSize: '0.7rem' }}
                                    />
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell>
                                {cls.date ? format(new Date(cls.date), 'MMM d, yyyy') : 'N/A'}
                              </TableCell>
                              <TableCell>
                                {cls.startTime && cls.endTime ? 
                                  `${formatClassTime(cls.startTime, cls.date)} - ${formatClassTime(cls.endTime, cls.date)}` : 
                                  'N/A'
                                }
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={cls.status} 
                                  color={
                                    cls.status === 'completed' ? 'success' : 
                                    cls.status === 'cancelled' ? 'error' : 
                                    'primary'
                                  } 
                                  size="small" 
                                />
                                {cls.isRescheduled && cls.oldTeacherId && cls.oldTeacherId !== teacher.id && (
                                  <Tooltip title="This class was reassigned to this teacher during rescheduling">
                                    <Chip 
                                      size="small" 
                                      label="Reassigned" 
                                      color="success" 
                                      variant="outlined"
                                      sx={{ ml: 1, fontSize: '0.7rem' }}
                                    />
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell>
                                {cls.notes || 'No notes'}
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No classes found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredClasses.length}
                  rowsPerPage={classRowsPerPage}
                  page={classPage}
                  onPageChange={handleClassChangePage}
                  onRowsPerPageChange={handleClassChangeRowsPerPage}
                />
              </Box>
            )}

            {/* Tasks Tab */}
            {tabIndex === 1 && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h6">
                    Tasks 
                    <Chip 
                      label={filteredTasks.length} 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 1 }} 
                    />
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      placeholder="Search tasks..."
                      size="small"
                      value={taskSearchTerm}
                      onChange={(e) => setTaskSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel id="task-filter-label">Status</InputLabel>
                      <Select
                        labelId="task-filter-label"
                        value={taskFilter}
                        label="Status"
                        onChange={(e) => setTaskFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Tasks</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTasks.length > 0 ? (
                        filteredTasks
                          .slice(taskPage * taskRowsPerPage, taskPage * taskRowsPerPage + taskRowsPerPage)
                          .map((task) => (
                            <TableRow key={task.id}>
                              <TableCell>{task.title}</TableCell>
                              <TableCell>
                                {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={task.status} 
                                  color={
                                    task.status === 'completed' ? 'success' : 
                                    task.status === 'in_progress' ? 'info' : 
                                    'default'
                                  } 
                                  size="small" 
                                  icon={
                                    task.status === 'completed' ? <CheckCircleIcon fontSize="small" /> : 
                                    task.status === 'in_progress' ? <ScheduleIcon fontSize="small" /> :
                                    undefined
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  onClick={() => handleOpenTaskView(task)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            No tasks found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredTasks.length}
                  rowsPerPage={taskRowsPerPage}
                  page={taskPage}
                  onPageChange={handleTaskChangePage}
                  onRowsPerPageChange={handleTaskChangeRowsPerPage}
                />
              </Box>
            )}

            {/* Exams Tab */}
            {tabIndex === 2 && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h6">
                    Exams 
                    <Chip 
                      label={filteredExams.length} 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 1 }} 
                    />
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      placeholder="Search exams..."
                      size="small"
                      value={examSearchTerm}
                      onChange={(e) => setExamSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel id="exam-filter-label">Status</InputLabel>
                      <Select
                        labelId="exam-filter-label"
                        value={examFilter}
                        label="Status"
                        onChange={(e) => setExamFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Exams</MenuItem>
                        <MenuItem value="assigned">Assigned</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="approved">Approved</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Questions</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredExams.length > 0 ? (
                        filteredExams
                          .slice(examPage * examRowsPerPage, examPage * examRowsPerPage + examRowsPerPage)
                          .map((exam) => (
                            <TableRow key={exam.id}>
                              <TableCell>{exam.title}</TableCell>
                              <TableCell>
                                {exam.dueDate ? format(new Date(exam.dueDate), 'MMM d, yyyy') : 'No due date'}
                              </TableCell>
                              <TableCell>{exam.totalQuestions || 0}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={exam.status} 
                                  color={
                                    exam.status === 'completed' ? 'success' : 
                                    exam.status === 'approved' ? 'secondary' : 
                                    'primary'
                                  } 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  onClick={() => handleOpenExamView(exam)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No exams found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredExams.length}
                  rowsPerPage={examRowsPerPage}
                  page={examPage}
                  onPageChange={handleExamChangePage}
                  onRowsPerPageChange={handleExamChangeRowsPerPage}
                />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Task View Dialog */}
      <Dialog
        open={taskViewOpen}
        onClose={() => setTaskViewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedTask && (
          <>
            <DialogTitle>
              Task: {selectedTask.title}
              <Chip 
                label={selectedTask.status} 
                color={
                  selectedTask.status === 'completed' ? 'success' : 
                  selectedTask.status === 'in_progress' ? 'info' : 
                  'default'
                } 
                size="small" 
                sx={{ ml: 1 }} 
              />
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle1" gutterBottom>Description</Typography>
              <Typography variant="body1" paragraph>
                {selectedTask.description || 'No description provided'}
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Due Date</Typography>
                <Typography variant="body1">
                  {selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'MMMM d, yyyy') : 'No due date set'}
                </Typography>
              </Box>

              {selectedTask.completionDetails && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>Completion Details</Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: themeMode === 'light' ? '#f5f5f5' : '#2a2a3c' }}>
                    <Typography variant="body1">
                      {selectedTask.completionDetails}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTaskViewOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Exam View Dialog */}
      <Dialog
        open={examViewOpen}
        onClose={() => setExamViewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedExam && (
          <>
            <DialogTitle>
              Exam: {selectedExam.title}
              <Chip 
                label={selectedExam.status} 
                color={
                  selectedExam.status === 'completed' ? 'success' : 
                  selectedExam.status === 'approved' ? 'secondary' : 
                  'primary'
                } 
                size="small" 
                sx={{ ml: 1 }} 
              />
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle1" gutterBottom>Description</Typography>
              <Typography variant="body1" paragraph>
                {selectedExam.description || 'No description provided'}
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Due Date</Typography>
                <Typography variant="body1">
                  {selectedExam.dueDate ? format(new Date(selectedExam.dueDate), 'MMMM d, yyyy') : 'No due date set'}
                </Typography>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Total Questions</Typography>
                <Typography variant="body1">
                  {selectedExam.totalQuestions || 0}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setExamViewOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
} 