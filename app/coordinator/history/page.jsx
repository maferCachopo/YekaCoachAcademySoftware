'use client';
import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Tabs,
  Tab,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Badge,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Button
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Assignment as TaskIcon,
  Grading as ExamIcon,
  CalendarToday as DateIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/app/utils/api';

export default function HistoryPage() {
  const router = useRouter();
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Table states
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState(null);
  
  // Teachers list
  const [teachers, setTeachers] = useState([]);
  
  useEffect(() => {
    // Fetch real data from API
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch teachers
        try {
          const teachersData = await fetchWithAuth('/coordinator/teachers');
          if (teachersData && Array.isArray(teachersData)) {
            setTeachers(teachersData);
          } else {
            console.warn('Invalid teachers data:', teachersData);
            setTeachers([]);
          }
        } catch (err) {
          console.error('Error fetching teachers:', err);
          setError(prev => prev || 'Failed to load teachers data');
          setTeachers([]);
        }
        
        // Fetch task history
        try {
          const tasksData = await fetchWithAuth('/coordinator/tasks/history');
          if (tasksData && Array.isArray(tasksData)) {
            setTasks(tasksData);
          } else {
            console.warn('Invalid tasks data:', tasksData);
            setTasks([]);
          }
        } catch (err) {
          console.error('Error fetching task history:', err);
          setError(prev => prev || 'Failed to load task history');
          setTasks([]);
        }
        
        // Fetch exam history
        try {
          const examsData = await fetchWithAuth('/coordinator/exams/history');
          if (examsData && Array.isArray(examsData)) {
            setExams(examsData);
          } else {
            console.warn('Invalid exams data:', examsData);
            setExams([]);
          }
        } catch (err) {
          console.error('Error fetching exam history:', err);
          setError(prev => prev || 'Failed to load exam history');
          setExams([]);
        }
        
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError(err.message || 'An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
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
  
  const handleTeacherFilterChange = (e) => {
    setTeacherFilter(e.target.value);
    setPage(0);
  };
  
  const handleDateRangeFilterChange = (e) => {
    setDateRangeFilter(e.target.value);
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
  
  // Filter items based on search term and filters
  const getFilteredData = (items) => {
    return items.filter(item => {
      // Search filter
      const searchMatches = 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        `${item.assignedTeacher?.firstName} ${item.assignedTeacher?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter - adjust for tasks vs exams
      let statusMatches = statusFilter === 'all';
      if (!statusMatches) {
        if (tabValue === 0) { // Tasks
          statusMatches = item.status === statusFilter;
        } else { // Exams
          statusMatches = item.status === statusFilter;
        }
      }
      
      // Teacher filter
      const teacherMatches = teacherFilter === 'all' || item.assignedTo === parseInt(teacherFilter);
      
      // Date range filter
      let dateMatches = dateRangeFilter === 'all';
      if (!dateMatches) {
        const itemDate = new Date(item.createdAt);
        const now = new Date();
        
        switch (dateRangeFilter) {
          case 'last_7_days':
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            dateMatches = itemDate >= sevenDaysAgo;
            break;
          case 'last_30_days':
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            dateMatches = itemDate >= thirtyDaysAgo;
            break;
          case 'last_90_days':
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(now.getDate() - 90);
            dateMatches = itemDate >= ninetyDaysAgo;
            break;
        }
      }
      
      return searchMatches && statusMatches && teacherMatches && dateMatches;
    });
  };
  
  const filteredTasks = getFilteredData(tasks);
  const filteredExams = getFilteredData(exams);
  
  // Pagination
  const paginatedTasks = filteredTasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const paginatedExams = filteredExams.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  
  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    return format(new Date(dateString), 'PPP p');
  };
  
  // Get status chip for tasks
  const getTaskStatusChip = (status) => {
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
  
  // Get status chip for exams
  const getExamStatusChip = (status) => {
    const statusColors = {
      draft: 'default',
      assigned: 'warning',
      completed: 'success',
      approved: 'primary',
      rejected: 'error'
    };
    
    const statusLabels = {
      draft: 'Draft',
      assigned: 'Assigned',
      completed: 'Completed',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    
    return (
      <Chip 
        label={statusLabels[status] || status} 
        color={statusColors[status] || 'default'} 
        size="small" 
      />
    );
  };
  
  // Get delivery type chip
  const getDeliveryTypeChip = (type) => {
    const typeColors = {
      email: 'primary',
      upload: 'secondary',
      physical: 'info',
      other: 'default'
    };
    
    const typeLabels = {
      email: 'Email',
      upload: 'Upload',
      physical: 'Physical',
      other: 'Other'
    };
    
    return (
      <Chip 
        label={typeLabels[type] || type} 
        color={typeColors[type] || 'default'} 
        size="small" 
        variant="outlined"
      />
    );
  };
  
  // Stats cards
  const getStatsCards = () => {
    // Task stats
    const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'reviewed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    const cancelledTasks = tasks.filter(t => t.status === 'cancelled').length;
    
    // Exam stats
    const approvedExams = exams.filter(e => e.status === 'approved').length;
    const pendingExams = exams.filter(e => e.status === 'draft' || e.status === 'assigned' || e.status === 'completed').length;
    const rejectedExams = exams.filter(e => e.status === 'rejected').length;
    
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Badge color="success" badgeContent={completedTasks} max={99} sx={{ mr: 2 }}>
                <TaskIcon fontSize="large" color="primary" />
              </Badge>
              <Box>
                <Typography variant="h6">Completed Tasks</Typography>
                <Typography variant="body2" color="text.secondary">{Math.round(completedTasks / tasks.length * 100)}% of total</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Badge color="warning" badgeContent={pendingTasks} max={99} sx={{ mr: 2 }}>
                <TaskIcon fontSize="large" color="action" />
              </Badge>
              <Box>
                <Typography variant="h6">Pending Tasks</Typography>
                <Typography variant="body2" color="text.secondary">{Math.round(pendingTasks / tasks.length * 100)}% of total</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Badge color="success" badgeContent={approvedExams} max={99} sx={{ mr: 2 }}>
                <ExamIcon fontSize="large" color="primary" />
              </Badge>
              <Box>
                <Typography variant="h6">Approved Exams</Typography>
                <Typography variant="body2" color="text.secondary">{Math.round(approvedExams / exams.length * 100)}% of total</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Badge color="error" badgeContent={rejectedExams} max={99} sx={{ mr: 2 }}>
                <ExamIcon fontSize="large" color="error" />
              </Badge>
              <Box>
                <Typography variant="h6">Rejected Exams</Typography>
                <Typography variant="body2" color="text.secondary">{Math.round(rejectedExams / exams.length * 100)}% of total</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
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
        {error}
      </Alert>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Task and Exam History
      </Typography>
      
      {getStatsCards()}
      
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          label="Tasks History" 
          icon={<TaskIcon />} 
          iconPosition="start"
        />
        <Tab 
          label="Exams History" 
          icon={<ExamIcon />} 
          iconPosition="start"
        />
      </Tabs>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder={tabValue === 0 ? "Search tasks..." : "Search exams..."}
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
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
                startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {tabValue === 0 ? (
                  // Task statuses
                  <>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="reviewed">Reviewed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </>
                ) : (
                  // Exam statuses
                  <>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="assigned">Assigned</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </>
                )}
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
                startAdornment={<PersonIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />}
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
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="date-range-filter-label">Date Range</InputLabel>
              <Select
                labelId="date-range-filter-label"
                value={dateRangeFilter}
                onChange={handleDateRangeFilterChange}
                label="Date Range"
                startAdornment={<DateIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="last_7_days">Last 7 Days</MenuItem>
                <MenuItem value="last_30_days">Last 30 Days</MenuItem>
                <MenuItem value="last_90_days">Last 90 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {tabValue === 0 ? (
        /* Tasks History Table */
        <>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Delivery Type</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Review Date</TableCell>
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
                          {task.description && task.description.length > 70 ? `${task.description.substring(0, 70)}...` : task.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {task.assignedTeacher?.firstName} {task.assignedTeacher?.lastName}
                      </TableCell>
                      <TableCell>{getDeliveryTypeChip(task.deliveryType)}</TableCell>
                      <TableCell>{formatDate(task.dueDate)}</TableCell>
                      <TableCell>{getTaskStatusChip(task.status)}</TableCell>
                      <TableCell>{task.reviewedAt ? formatDate(task.reviewedAt) : 'Not reviewed'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => router.push(`/coordinator/tasks/${task.id}`)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
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
        </>
      ) : (
        /* Exams History Table */
        <>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Questions</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Review Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedExams.length > 0 ? (
                  paginatedExams.map((exam) => (
                    <TableRow key={exam.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {exam.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {exam.description && exam.description.length > 70 ? `${exam.description.substring(0, 70)}...` : exam.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {exam.assignedTeacher?.firstName} {exam.assignedTeacher?.lastName}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${exam.totalQuestions} question${exam.totalQuestions === 1 ? '' : 's'}`}
                          size="small" 
                          color="info"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{formatDate(exam.dueDate)}</TableCell>
                      <TableCell>{getExamStatusChip(exam.status)}</TableCell>
                      <TableCell>{exam.reviewedAt ? formatDate(exam.reviewedAt) : 'Not reviewed'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => router.push(`/coordinator/exams/${exam.id}`)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No exams found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredExams.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </>
      )}
    </Box>
  );
} 