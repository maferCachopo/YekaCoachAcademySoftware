'use client';
import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { fetchWithAuth } from '@/app/utils/api';
import { format } from 'date-fns';

export default function TeacherTasks() {
  // Table states
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState(null);
  
  // Task completion dialog
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionDialog, setCompletionDialog] = useState(false);
  const [completionDetails, setCompletionDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Task view dialog
  const [viewDialog, setViewDialog] = useState(false);
  
  useEffect(() => {
    fetchTasks();
  }, []);
  
  const fetchTasks = async () => {
    try {
      setLoading(true);
      // The fetchWithAuth function already processes the JSON response
      const data = await fetchWithAuth('/teachers/tasks');
      
      // If we get here, data is already parsed JSON
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
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
  
  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Open task completion dialog
  const handleOpenCompletionDialog = (task) => {
    setSelectedTask(task);
    setCompletionDialog(true);
  };
  
  // Close task completion dialog
  const handleCloseCompletionDialog = () => {
    setCompletionDialog(false);
    setCompletionDetails('');
    setSelectedTask(null);
  };
  
  // Open task view dialog
  const handleOpenViewDialog = (task) => {
    setSelectedTask(task);
    setViewDialog(true);
  };
  
  // Close task view dialog
  const handleCloseViewDialog = () => {
    setViewDialog(false);
    setSelectedTask(null);
  };
  
  // Handle task completion
  const handleCompleteTask = async () => {
    if (!selectedTask || !completionDetails.trim()) return;
    
    try {
      setSubmitting(true);
      
      // The fetchWithAuth function already processes the JSON response
      const updatedTask = await fetchWithAuth(`/teachers/tasks/${selectedTask.id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({
          completionDetails
        })
      });
      
      // Update tasks list
      setTasks(tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));
      
      // Close dialog
      handleCloseCompletionDialog();
      
      // Show success message
      setError({ type: 'success', message: 'Task marked as completed successfully!' });
      
      // Clear success message after a delay
      setTimeout(() => {
        setError(null);
      }, 5000);
    } catch (err) {
      console.error('Error completing task:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Filter tasks based on search term and filters
  const filteredTasks = tasks.filter(task => {
    // Search filter
    const searchMatches = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const statusMatches = statusFilter === 'all' || task.status === statusFilter;
    
    return searchMatches && statusMatches;
  });
  
  // Pagination
  const paginatedTasks = filteredTasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  
  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    return format(new Date(dateString), 'PP');
  };
  
  // Get status chip
  const getStatusChip = (status) => {
    const statusColors = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      reviewed: 'secondary',
      cancelled: 'error'
    };
    
    const statusLabels = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      reviewed: 'Reviewed',
      cancelled: 'Cancelled'
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Tasks
      </Typography>
      
      {error && (
        <Alert 
          severity={error.type || 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error.message}
        </Alert>
      )}
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search tasks..."
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
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
                startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="reviewed">Reviewed</MenuItem>
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
              <TableCell>Due Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned By</TableCell>
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
                      {task.description && task.description.length > 70 
                        ? `${task.description.substring(0, 70)}...` 
                        : task.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(task.dueDate)}</TableCell>
                  <TableCell>{getStatusChip(task.status)}</TableCell>
                  <TableCell>
                    {task.coordinator?.firstName} {task.coordinator?.lastName}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small"
                        onClick={() => handleOpenViewDialog(task)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {['pending', 'in_progress'].includes(task.status) && (
                      <Tooltip title="Mark as Completed">
                        <IconButton 
                          size="small"
                          color="success"
                          onClick={() => handleOpenCompletionDialog(task)}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
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
      
      {/* Task View Dialog */}
      <Dialog open={viewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
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
                  Assigned By
                </Typography>
                <Typography variant="body1">
                  {selectedTask.coordinator?.firstName} {selectedTask.coordinator?.lastName}
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
                    <Typography variant="subtitle2" color="text.secondary">
                      Completion Details
                    </Typography>
                    <Typography variant="body1">
                      {selectedTask.completionDetails}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              
              {selectedTask.reviewNotes && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Review Notes
                    </Typography>
                    <Typography variant="body1">
                      {selectedTask.reviewNotes}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
          {selectedTask && ['pending', 'in_progress'].includes(selectedTask.status) && (
            <Button 
              onClick={() => {
                handleCloseViewDialog();
                handleOpenCompletionDialog(selectedTask);
              }} 
              variant="contained" 
              color="primary"
            >
              Mark as Completed
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Task Completion Dialog */}
      <Dialog open={completionDialog} onClose={handleCloseCompletionDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Mark Task as Completed
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <>
              <Typography variant="h6" gutterBottom>
                {selectedTask.title}
              </Typography>
              
              <Typography variant="body2" paragraph>
                Please provide details on how you completed this task:
              </Typography>
              
              <TextField
                label="Completion Details"
                value={completionDetails}
                onChange={(e) => setCompletionDetails(e.target.value)}
                fullWidth
                multiline
                rows={5}
                required
                error={!completionDetails.trim() && submitting}
                helperText={!completionDetails.trim() && submitting ? 'Completion details are required' : ''}
                sx={{ mb: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompletionDialog}>Cancel</Button>
          <Button 
            onClick={handleCompleteTask} 
            variant="contained" 
            color="primary"
            disabled={!completionDetails.trim() || submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 