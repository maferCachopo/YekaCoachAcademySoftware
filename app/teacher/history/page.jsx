'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Chip,
  Avatar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  History as HistoryIcon,
  Assignment as TaskIcon,
  School as ExamIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { teacherAPI } from '@/app/utils/api';
import { format } from 'date-fns';
import ThemeTransition from '@/app/components/ThemeTransition';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`history-tabpanel-${index}`}
      aria-labelledby={`history-tab-${index}`}
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

export default function TeacherHistory() {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [historyData, setHistoryData] = useState({
    tasks: [],
    exams: []
  });
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch history data
  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        if (!user || !user.teacherId) {
          console.error('No teacher ID found in user data');
          return;
        }

        setLoading(true);
        const data = await teacherAPI.getHistory(user.teacherId);
        setHistoryData(data);
      } catch (error) {
        console.error('Error fetching history data:', error);
        setMessage({
          open: true,
          text: error.message || 'Failed to load history data',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && user.teacherId) {
      fetchHistoryData();
    }
  }, [user]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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

  // Handle search change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Filter tasks based on search term
  const filteredTasks = historyData.tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.result && task.result.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (task.reviewNotes && task.reviewNotes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter exams based on search term
  const filteredExams = historyData.exams.filter(exam => 
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exam.result && exam.result.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (exam.description && exam.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (exam.reviewNotes && exam.reviewNotes.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (exam.coordinator && exam.coordinator.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          {translations.history || 'History'}
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: theme?.text?.secondary,
            fontSize: { xs: '0.9rem', sm: '1rem' }
          }}
        >
          {translations.historyDescription || 'View your completed tasks and exams'}
        </Typography>
      </Box>

      {/* Search and Tabs */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#845EC2',
            },
            '& .MuiTab-root': {
              color: theme?.text?.secondary,
              '&.Mui-selected': {
                color: '#845EC2',
              },
            },
          }}
        >
          <Tab 
            label={translations.tasks || "Tasks"} 
            id="history-tab-0" 
            aria-controls="history-tabpanel-0" 
          />
          <Tab 
            label={translations.exams || "Exams"} 
            id="history-tab-1" 
            aria-controls="history-tabpanel-1" 
          />
        </Tabs>
        
        <TextField
          placeholder={translations.search || "Search"}
          value={searchTerm}
          onChange={handleSearchChange}
          size="small"
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: theme?.text?.secondary }} />,
          }}
          sx={{ width: { xs: '100%', sm: 200 } }}
        />
      </Box>

      {/* History Content */}
      <TabPanel value={activeTab} index={0}>
        {/* Show a message if no tasks are available, before loading check */}
        {!loading && (!historyData.tasks || historyData.tasks.length === 0) ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            bgcolor: theme?.card?.background || theme?.palette?.background?.paper,
            borderRadius: 2,
            boxShadow: theme?.mode === 'light' 
              ? '0px 2px 10px rgba(0, 0, 0, 0.05)' 
              : '0px 2px 10px rgba(0, 0, 0, 0.2)',
          }}>
            <Typography variant="body1" sx={{ color: theme?.text?.secondary }}>
              {translations.noTaskHistory || 'No completed tasks found in your history.'}
            </Typography>
          </Box>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: '#845EC2' }} />
          </Box>
        ) : filteredTasks.length === 0 ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            bgcolor: theme?.card?.background || theme?.palette?.background?.paper,
            borderRadius: 2,
            boxShadow: theme?.mode === 'light' 
              ? '0px 2px 10px rgba(0, 0, 0, 0.05)' 
              : '0px 2px 10px rgba(0, 0, 0, 0.2)',
          }}>
            <Typography variant="body1" sx={{ color: theme?.text?.secondary }}>
              {searchTerm 
                ? (translations.noTasksMatchSearch || 'No tasks match your search.')
                : (translations.noTaskHistory || 'No task history found.')}
            </Typography>
          </Box>
        ) : (
          <TableContainer 
            component={Paper}
            sx={{ 
              borderRadius: 2,
              boxShadow: theme?.mode === 'light' 
                ? '0px 2px 10px rgba(0, 0, 0, 0.05)' 
                : '0px 2px 10px rgba(0, 0, 0, 0.2)',
              background: theme?.card?.background || theme?.palette?.background?.paper,
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{translations.title || 'Title'}</TableCell>
                  <TableCell>{translations.completedDate || 'Completed Date'}</TableCell>
                  <TableCell>{translations.result || 'Result'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: '#4caf50',
                            mr: 1.5
                          }}
                        >
                          <TaskIcon sx={{ fontSize: '1rem' }} />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {task.title}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(task.completedDate)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={task.result || task.status} 
                        color={
                          task.result?.toLowerCase().includes('delay') ? 'warning' :
                          task.status === 'reviewed' ? 'info' : 'success'
                        } 
                        size="small" 
                        title={task.reviewNotes || ''}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        {/* Show a message if no exams are available, before loading check */}
        {!loading && (!historyData.exams || historyData.exams.length === 0) ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            bgcolor: theme?.card?.background || theme?.palette?.background?.paper,
            borderRadius: 2,
            boxShadow: theme?.mode === 'light' 
              ? '0px 2px 10px rgba(0, 0, 0, 0.05)' 
              : '0px 2px 10px rgba(0, 0, 0, 0.2)',
          }}>
            <Typography variant="body1" sx={{ color: theme?.text?.secondary }}>
              {translations.noExamHistory || 'No completed exams found in your history.'}
            </Typography>
          </Box>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: '#845EC2' }} />
          </Box>
        ) : filteredExams.length === 0 ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            bgcolor: theme?.card?.background || theme?.palette?.background?.paper,
            borderRadius: 2,
            boxShadow: theme?.mode === 'light' 
              ? '0px 2px 10px rgba(0, 0, 0, 0.05)' 
              : '0px 2px 10px rgba(0, 0, 0, 0.2)',
          }}>
            <Typography variant="body1" sx={{ color: theme?.text?.secondary }}>
              {searchTerm 
                ? (translations.noExamsMatchSearch || 'No exams match your search.')
                : (translations.noExamHistory || 'No exam history found.')}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredExams.map(exam => (
              <Grid item xs={12} md={6} key={exam.id}>
                <Card 
                  sx={{ 
                    borderRadius: 2,
                    boxShadow: theme?.mode === 'light' 
                      ? '0px 2px 10px rgba(0, 0, 0, 0.05)' 
                      : '0px 2px 10px rgba(0, 0, 0, 0.2)',
                    background: theme?.card?.background || theme?.palette?.background?.paper,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <Box sx={{ 
                    p: 3,
                    borderBottom: '1px solid',
                    borderColor: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ExamIcon sx={{ color: '#4caf50', mr: 1.5 }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {exam.title}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon sx={{ fontSize: '0.9rem', mr: 0.5, color: theme?.text?.secondary }} />
                      <Typography variant="body2" sx={{ color: theme?.text?.secondary }}>
                        {translations.completed || 'Completed'}: {formatDate(exam.completedDate)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ p: 3, flexGrow: 1 }}>
                    {exam.description && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                          {translations.description || 'Description'}:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {exam.description}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {translations.details || 'Details'}:
                      </Typography>
                      {exam.totalQuestions && (
                        <Chip
                          label={`${translations.questions || 'Questions'}: ${exam.totalQuestions}`}
                          size="small"
                          sx={{ 
                            mr: 0.5, 
                            mb: 0.5,
                            bgcolor: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
                          }}
                        />
                      )}
                      {exam.coordinator && (
                        <Chip
                          label={`${translations.coordinator || 'Assigned by'}: ${exam.coordinator}`}
                          size="small"
                          sx={{ 
                            mr: 0.5, 
                            mb: 0.5,
                            bgcolor: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
                          }}
                        />
                      )}
                      {exam.dueDate && (
                        <Chip
                          label={`${translations.dueDate || 'Due date'}: ${formatDate(exam.dueDate)}`}
                          size="small"
                          sx={{ 
                            mr: 0.5, 
                            mb: 0.5,
                            bgcolor: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
                          }}
                        />
                      )}
                    </Box>
                    
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {translations.result || 'Result'}:
                    </Typography>
                    <Chip 
                      label={exam.result || exam.status} 
                      color={
                        exam.status === 'approved' ? 'success' :
                        exam.status === 'rejected' ? 'error' : 'primary'
                      } 
                      size="small" 
                      title={exam.reviewNotes || ''}
                    />
                    {exam.reviewNotes && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {exam.reviewNotes.substring(0, 100)}{exam.reviewNotes.length > 100 ? '...' : ''}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
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