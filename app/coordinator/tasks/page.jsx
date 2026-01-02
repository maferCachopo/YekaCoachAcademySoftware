'use client';
import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  InputAdornment,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { timezoneUtils } from '@/app/utils/api';
import { ADMIN_TIMEZONE } from '@/app/utils/constants';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/app/utils/api';

export default function TaskManagement() {
  const router = useRouter();
  const { translations, language } = useLanguage();
  
  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  
  // Form values
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [assignedTo, setAssignedTo] = useState('');
  
  // Table states
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState(null);
  
  // Task view dialog
  const [taskViewDialog, setTaskViewDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Teachers list
  const [teachers, setTeachers] = useState([]);
  
  // Add function to handle task view dialog
  const handleOpenTaskView = (task) => {
    setSelectedTask(task);
    setReviewNotes(task.reviewNotes || '');
    setTaskViewDialog(true);
  };

  const handleCloseTaskView = () => {
    setTaskViewDialog(false);
    setSelectedTask(null);
    setReviewNotes('');
  };

  const handleReviewTask = async () => {
    try {
      setSubmitting(true);
      
      const updatedTask = await fetchWithAuth(`/coordinator/tasks/${selectedTask.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'reviewed',
          reviewNotes
        })
      });
      
      // Update task in list
      setTasks(tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));
      
      // Close dialog
      handleCloseTaskView();
      
      // Show success message
      setError({ message: 'Task reviewed successfully!', type: 'success' });
      
      // Clear success message after a delay
      setTimeout(() => {
        setError(null);
      }, 5000);
    } catch (err) {
      console.error('Error reviewing task:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  useEffect(() => {
    // Fetch tasks and teachers
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch teachers
        try {
          const teachersData = await fetchWithAuth('/coordinator/teachers');
          if (teachersData && Array.isArray(teachersData)) {
            setTeachers(teachersData);
            console.log('Loaded', teachersData.length, 'teachers');
          } else {
            console.warn('Invalid teachers data format:', teachersData);
            // Don't use mock data as fallback
            setTeachers([]);
          }
        } catch (err) {
          console.error('Error fetching teachers:', err);
          // Don't use mock data
          setTeachers([]);
          setError('Failed to load teachers data. ' + err.message);
        }
        
        // Fetch tasks
        try {
          const tasksData = await fetchWithAuth('/coordinator/tasks');
          if (tasksData && Array.isArray(tasksData)) {
            setTasks(tasksData);
            console.log('Loaded', tasksData.length, 'tasks');
          } else {
            console.warn('Invalid tasks data format:', tasksData);
            setTasks([]);
          }
        } catch (err) {
          console.error('Error fetching tasks:', err);
          setTasks([]);
          setError('Failed to load tasks data. ' + err.message);
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Handle search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };
  
  const clearSearch = () => {
    setSearchTerm('');
  };
  
  // Handle filters
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(0);
  };
  
  const handleTeacherFilterChange = (e) => {
    setTeacherFilter(e.target.value);
    setPage(0);
  };
  
  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Form handlers
  const handleFormOpen = () => {
    setFormOpen(true);
  };
  
  const handleFormClose = () => {
    setFormOpen(false);
    resetForm();
  };
  
  const resetForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setDueDate(null);
    setAssignedTo('');
    setFormError(null);
  };
  
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!taskTitle || !taskDescription || !assignedTo) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    setFormLoading(true);
    
    try {
      console.log('Submitting task creation with data:', {
        title: taskTitle,
        description: taskDescription,
        dueDate: dueDate ? format(dueDate, "yyyy-MM-dd'T'HH:mm:ss") : null,
        assignedTo: parseInt(assignedTo)
      });
      
      const response = await fetchWithAuth('/coordinator/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          dueDate: dueDate ? format(dueDate, "yyyy-MM-dd'T'HH:mm:ss") : null,
          assignedTo: parseInt(assignedTo)
        })
      });
      
      console.log('Task creation response:', response);
      
      // Verify we have a valid task object
      if (!response || !response.id) {
        throw new Error('Received invalid task data from server');
      }
      
      // If we want to ensure the task has assignedTeacher info for display in the table
      const newTask = {
        ...response,
        assignedTeacher: teachers.find(t => t.id === parseInt(assignedTo))
      };
      
      // Add the new task to the list
      setTasks([newTask, ...tasks]);
      
      // Close the form
      handleFormClose();
      
      // Show success message
      setError({ message: 'Task created successfully!', type: 'success' });
      
      // Clear success message after a delay
      setTimeout(() => {
        setError(null);
      }, 5000);
    } catch (err) {
      console.error('Error creating task:', err);
      setFormError(err.message || 'Failed to create task. Please try again.');
      
      // Show error in main alert too for visibility
      setError({ message: err.message || 'Failed to create task. Please try again.', type: 'error' });
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setFormLoading(false);
    }
  };
  
  // Filter tasks based on search term and filters
  const filteredTasks = tasks.filter(task => {
    // Search filter
    const searchMatches = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${task.assignedTeacher?.firstName} ${task.assignedTeacher?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const statusMatches = statusFilter === 'all' || task.status === statusFilter;
    
    // Teacher filter
    const teacherMatches = teacherFilter === 'all' || task.assignedTo === parseInt(teacherFilter);
    
    return searchMatches && statusMatches && teacherMatches;
  });
  
  // Pagination
  const paginatedTasks = filteredTasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  
  // Get user timezone
  const { user } = useAuth();
  const userTimezone = user?.timezone || null;
  
  // Format date function with timezone conversion
  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    
    // Extract date and time parts
    const date = dateString.split('T')[0];
    const time = dateString.split('T')[1]?.substring(0, 5) || '00:00';
    
    // Convert from admin timezone to user timezone
    const userDateTime = timezoneUtils.convertToUserTime(date, time, ADMIN_TIMEZONE, userTimezone);
    
    if (userDateTime) {
      return format(userDateTime.toDate(), 'PPP p');
    }
    
    // Fallback to direct formatting if conversion fails
    return format(new Date(dateString), 'PPP p');
  };
  
  // Get status chip with translations
  const getStatusChip = (status) => {
    const statusColors = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      reviewed: 'secondary',
      cancelled: 'error'
    };
    
    // Use translations if available
    const statusLabels = {
      pending: translations.pending || 'Pending',
      in_progress: translations.inProgress || 'In Progress',
      completed: translations.completed || 'Completed',
      reviewed: translations.reviewed || 'Reviewed',
      cancelled: translations.cancelled || 'Cancelled'
    };
    
    return (
      <Chip 
        label={statusLabels[status] || status} 
        color={statusColors[status] || 'default'} 
        size="small" 
      />
    );
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">{translations.taskManagement || "Task Management"}</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleFormOpen}
        >
          {translations.assignNewTask || "Assign New Task"}
        </Button>
      </Box>
      
      {/* Error/Success Alert */}
      {error && (
        <Alert 
          severity={error.type || 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error.message || error}
        </Alert>
      )}
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder={translations.searchTasks || "Search tasks..."}
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={clearSearch} edge="end" size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">{translations.status || "Status"}</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label={translations.status || "Status"}
                startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="all">{translations.allStatuses || "All Statuses"}</MenuItem>
                <MenuItem value="pending">{translations.pending || "Pending"}</MenuItem>
                <MenuItem value="in_progress">{translations.inProgress || "In Progress"}</MenuItem>
                <MenuItem value="completed">{translations.completed || "Completed"}</MenuItem>
                <MenuItem value="reviewed">{translations.reviewed || "Reviewed"}</MenuItem>
                <MenuItem value="cancelled">{translations.cancelled || "Cancelled"}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="teacher-filter-label">Teacher</InputLabel>
              <Select
                labelId="teacher-filter-label"
                value={teacherFilter}
                onChange={handleTeacherFilterChange}
                label="Teacher"
                startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="all">All Teachers</MenuItem>
                {teachers.map(teacher => (
                  <MenuItem key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              {filteredTasks.length} tasks found
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Tasks Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTasks.length > 0 ? (
              paginatedTasks.map((task) => (
                <TableRow key={task.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {task.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {task.description.length > 70 ? `${task.description.substring(0, 70)}...` : task.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {task.assignedTeacher?.firstName} {task.assignedTeacher?.lastName}
                  </TableCell>
                  <TableCell>{formatDate(task.dueDate)}</TableCell>
                  <TableCell>{getStatusChip(task.status)}</TableCell>
                  <TableCell>{formatDate(task.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small"
                        onClick={() => handleOpenTaskView(task)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {task.status === 'completed' && (
                      <Tooltip title="Mark as Reviewed">
                        <IconButton 
                          size="small"
                          color="success"
                          onClick={() => handleOpenTaskView(task)}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(task.status === 'pending' || task.status === 'in_progress') && (
                      <Tooltip title="Cancel Task">
                        <IconButton 
                          size="small"
                          color="error"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No tasks found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredTasks.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
      
      {/* Task Assignment Form Dialog */}
      <Dialog open={formOpen} onClose={handleFormClose} maxWidth="md" fullWidth>
        <DialogTitle>Assign New Task</DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Task Title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  fullWidth
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Task Description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="assigned-to-label">Assign To Teacher</InputLabel>
                  <Select
                    labelId="assigned-to-label"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    label="Assign To Teacher"
                  >
                    {teachers.map(teacher => (
                      <MenuItem key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Due Date (Optional)"
                    value={dueDate}
                    onChange={(newValue) => setDueDate(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined'
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleFormClose}>Cancel</Button>
            <Button 
              type="submit"
              variant="contained"
              disabled={formLoading}
            >
              {formLoading ? <CircularProgress size={24} /> : 'Assign Task'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Task View/Review Dialog */}
      <Dialog open={taskViewDialog} onClose={handleCloseTaskView} maxWidth="md" fullWidth>
        <DialogTitle>
          Task Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedTask && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {selectedTask.title}
                </Typography>
                <Chip 
                  label={selectedTask.status.charAt(0).toUpperCase() + selectedTask.status.slice(1)}
                  color={
                    selectedTask.status === 'pending' ? 'warning' :
                    selectedTask.status === 'in_progress' ? 'info' :
                    selectedTask.status === 'completed' ? 'success' :
                    selectedTask.status === 'reviewed' ? 'secondary' :
                    'error'
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Due Date
                </Typography>
                <Typography variant="body1">
                  {formatDate(selectedTask.dueDate)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Assigned To
                </Typography>
                <Typography variant="body1">
                  {selectedTask.assignedTeacher?.firstName} {selectedTask.assignedTeacher?.lastName}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1" paragraph>
                  {selectedTask.description}
                </Typography>
              </Grid>
              
              {selectedTask.completionDetails && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Completion Details
                    </Typography>
                    <Typography variant="body1">
                      {selectedTask.completionDetails}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              
              {selectedTask.status === 'completed' && (
                <Grid item xs={12}>
                  <TextField
                    label="Review Notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    sx={{ mt: 2 }}
                  />
                </Grid>
              )}
              
              {selectedTask.status === 'reviewed' && selectedTask.reviewNotes && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Review Notes
                    </Typography>
                    <Typography variant="body1">
                      {selectedTask.reviewNotes}
                    </Typography>
                    {selectedTask.reviewedAt && (
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Reviewed on {format(new Date(selectedTask.reviewedAt), 'PPP p')}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTaskView}>Close</Button>
          {selectedTask && selectedTask.status === 'completed' && (
            <Button 
              onClick={handleReviewTask} 
              variant="contained" 
              color="primary"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : 'Mark as Reviewed'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
} 