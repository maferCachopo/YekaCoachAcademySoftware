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
  Tooltip,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/app/utils/api';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function ExamsManagement() {
  const router = useRouter();
  const { translations, language } = useLanguage();
  
  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [assignedTo, setAssignedTo] = useState([]);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [questions, setQuestions] = useState([{
    questionNumber: 1,
    questionText: '',
    responseType: 'multiple_choice',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 10
  }]);
  
  // Table states
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState(null);
  
  // Teachers list
  const [teachers, setTeachers] = useState([]);
  
  useEffect(() => {
    // Fetch exams and teachers
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch teachers
        try {
          const teachersData = await fetchWithAuth('/coordinator/teachers');
          if (teachersData && Array.isArray(teachersData)) {
            setTeachers(teachersData);
          } else {
            console.warn('Invalid teachers data format:', teachersData);
            setTeachers([]);
          }
        } catch (err) {
          console.error('Error fetching teachers:', err);
          setTeachers([]);
          setError('Failed to load teachers data. ' + err.message);
        }
        
        // Fetch exams
        try {
          const examsData = await fetchWithAuth('/coordinator/exams');
          if (examsData && Array.isArray(examsData)) {
            setExams(examsData);
          } else {
            console.warn('Invalid exams data format:', examsData);
            setExams([]);
          }
        } catch (err) {
          console.error('Error fetching exams:', err);
          setExams([]);
          setError('Failed to load exams data. ' + err.message);
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
    setTitle('');
    setDescription('');
    setDueDate(null);
    setAssignedTo([]);
    setFormError(null);
    setQuestions([{
      questionNumber: 1,
      questionText: '',
      responseType: 'multiple_choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 10
    }]);
  };
  
  // Question form handlers
  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    
    // Special handling for responseType changes
    if (field === 'responseType') {
      console.log(`Changed question ${index} type to: ${value}`);
      
      // If changing to true/false, set options to ["True", "False"]
      if (value === 'true_false') {
        console.log(`Setting true/false options for question ${index}`);
        newQuestions[index].options = ['True', 'False'];
        newQuestions[index].correctAnswer = ''; // Reset the correct answer
      } 
      // If changing to multiple choice and options are empty or have fewer than 2 options
      else if (value === 'multiple_choice') {
        console.log(`Setting multiple choice options for question ${index}`);
        // Keep existing options if they exist and have at least 2 options
        if (!newQuestions[index].options || newQuestions[index].options.length < 2) {
          newQuestions[index].options = ['', '', '', ''];
        }
        newQuestions[index].correctAnswer = ''; // Reset the correct answer
      }
      // If changing to short or long answer, clear options
      else {
        console.log(`Clearing options for question ${index} (${value})`);
        newQuestions[index].options = [];
        newQuestions[index].correctAnswer = '';
      }
    }
    
    setQuestions(newQuestions);
  };
  
  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };
  
  const addOption = (questionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push('');
    setQuestions(newQuestions);
  };
  
  const removeOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.splice(optionIndex, 1);
    setQuestions(newQuestions);
  };
  
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionNumber: questions.length + 1,
        questionText: '',
        responseType: 'multiple_choice',
        options: ['', '', '', ''], // Start with multiple choice options
        correctAnswer: '',
        points: 10
      }
    ]);
  };
  
  const removeQuestion = (index) => {
    if (questions.length > 1) {
      const newQuestions = [...questions];
      newQuestions.splice(index, 1);
      setQuestions(newQuestions);
    }
  };
  
  // Form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!title || assignedTo.length === 0) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.questionText) {
        setFormError(`Question #${i + 1} is missing text`);
        return;
      }
      
      // Handle specific question types
      console.log(`Validating question ${i+1}, type: ${q.responseType}`, q);
      
      if (q.responseType === 'multiple_choice') {
        // Check if options exist and none are empty
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          setFormError(`Question #${i + 1} needs at least 2 options`);
          return;
        }
        
        if (q.options.some(opt => !opt)) {
          setFormError(`Question #${i + 1} has empty options`);
          return;
        }
        
        if (!q.correctAnswer && q.correctAnswer !== '0') {
          setFormError(`Question #${i + 1} is missing a correct answer`);
          return;
        }
      }
      
      if (q.responseType === 'true_false') {
        // Force options to be True and False
        const newQuestions = [...questions];
        if (!q.options || !Array.isArray(q.options) || q.options.length !== 2 || 
            !q.options.includes('True') || !q.options.includes('False')) {
          console.log(`Fixing true/false options for question ${i+1}`);
          newQuestions[i].options = ['True', 'False'];
          setQuestions(newQuestions);
        }
        
        if (!q.correctAnswer) {
          setFormError(`Question #${i + 1} is missing a correct answer (true or false)`);
          return;
        }
      }
    }
    
    setFormLoading(true);
    
    try {
      // Create new exam
      const newExam = await fetchWithAuth('/coordinator/exams', {
        method: 'POST',
        body: JSON.stringify({
          title: title,
          description: description,
          dueDate: dueDate ? format(dueDate, "yyyy-MM-dd'T'HH:mm:ss") : null,
          assignedTo: assignedTo,
          questions
        })
      });
      
      // Format the response for adding to the exams list
      const formattedExam = {
        ...newExam,
        assignedTeacher: newExam.assignments && newExam.assignments.length > 0 ? 
          { firstName: 'Multiple', lastName: 'Teachers' } : null,
        totalQuestions: newExam.questions ? newExam.questions.length : 0
      };
      
      // Add to exams list
      setExams([formattedExam, ...exams]);
      
      // Close form and show success message
      handleFormClose();
      setError({ message: 'Exam created successfully!', type: 'success' });
      
      // Clear success message after a delay
      setTimeout(() => {
        setError(null);
      }, 5000);
    } catch (err) {
      console.error('Error creating exam:', err);
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };
  
  // Filter exams based on search term and filters
  const filteredExams = exams.filter(exam => {
    // Search filter
    const searchMatches = 
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.description && exam.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      `${exam.assignedTeacher?.firstName} ${exam.assignedTeacher?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const statusMatches = statusFilter === 'all' || exam.status === statusFilter;
    
    // Teacher filter
    let teacherMatches = teacherFilter === 'all';
    
    if (!teacherMatches) {
      // Check in both assignedTeachers array and legacy assignedTo field
      if (exam.assignedTeachers && Array.isArray(exam.assignedTeachers)) {
        teacherMatches = exam.assignedTeachers.some(t => t.id === parseInt(teacherFilter));
      }
      
      if (!teacherMatches && exam.assignedTo) {
        teacherMatches = exam.assignedTo === parseInt(teacherFilter);
      }
    }
    
    return searchMatches && statusMatches && teacherMatches;
  });
  
  // Pagination
  const paginatedExams = filteredExams.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  
  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    return format(new Date(dateString), 'PPP p');
  };
  
  // Get status chip with translations
  const getStatusChip = (status) => {
    const statusColors = {
      draft: 'default',
      assigned: 'warning',
      completed: 'success',
      approved: 'primary',
      rejected: 'error'
    };
    
    // Use translations if available
    const statusLabels = {
      draft: translations.draft || 'Draft',
      assigned: translations.assigned || 'Assigned',
      completed: translations.completed || 'Completed',
      approved: translations.approved || 'Approved',
      rejected: translations.rejected || 'Rejected'
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
  
  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">{translations.examManagement || "Exam Management"}</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleFormOpen}
        >
          {translations.createExam || "Create New Exam"}
        </Button>
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
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder={translations.searchExams || "Search exams..."}
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
              <InputLabel id="status-filter-label">{translations.status || 'Status'}</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label={translations.status || 'Status'}
                startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="all">{translations.allStatuses || 'All Statuses'}</MenuItem>
                <MenuItem value="draft">{translations.draft || 'Draft'}</MenuItem>
                <MenuItem value="assigned">{translations.assigned || 'Assigned'}</MenuItem>
                <MenuItem value="completed">{translations.completed || 'Completed'}</MenuItem>
                <MenuItem value="approved">{translations.approved || 'Approved'}</MenuItem>
                <MenuItem value="rejected">{translations.rejected || 'Rejected'}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="teacher-filter-label">{translations.teacher || 'Teacher'}</InputLabel>
              <Select
                labelId="teacher-filter-label"
                value={teacherFilter}
                onChange={handleTeacherFilterChange}
                label={translations.teacher || 'Teacher'}
                startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="all">{translations.allTeachers || 'All Teachers'}</MenuItem>
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
              {filteredExams.length} {translations.examsFound || 'exams found'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Exams Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>{translations.title || 'Title'}</TableCell>
              <TableCell>{translations.assignedTo || 'Assigned To'}</TableCell>
              <TableCell>{translations.questions || 'Questions'}</TableCell>
              <TableCell>{translations.dueDate || 'Due date'}</TableCell>
              <TableCell>{translations.status || 'Status'}</TableCell>
              <TableCell>{translations.created || 'Created'}</TableCell>
              <TableCell align="right">{translations.actions || 'Actions'}</TableCell>
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
                    {exam.assignedTeachers && exam.assignedTeachers.length > 0 ? (
                      exam.assignedTeachers.length > 1 ? (
                        <Tooltip title={exam.assignedTeachers.map(t => `${t.firstName} ${t.lastName}`).join(', ')}>
                          <Chip 
                            size="small"
                            label={`${exam.assignedTeachers.length} Teachers`}
                            color="primary"
                          />
                        </Tooltip>
                      ) : (
                        `${exam.assignedTeachers[0].firstName} ${exam.assignedTeachers[0].lastName}`
                      )
                    ) : (
                      exam.assignedTeacher ? 
                      `${exam.assignedTeacher.firstName} ${exam.assignedTeacher.lastName}` : 
                      'Not assigned'
                    )}
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
                  <TableCell>{getStatusChip(exam.status)}</TableCell>
                  <TableCell>{formatDate(exam.createdAt)}</TableCell>
                  <TableCell align="right">
                        <Tooltip title={translations.viewDetails || 'View Details'}>
                      <IconButton 
                        size="small"
                        onClick={() => router.push(`/coordinator/exams/${exam.id}`)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {exam.status === 'completed' && (
                      <>
                            <Tooltip title={translations.approveExam || 'Approve Exam'}>
                          <IconButton 
                            size="small"
                            color="success"
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                            <Tooltip title={translations.rejectExam || 'Reject Exam'}>
                          <IconButton 
                            size="small"
                            color="error"
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {translations.noExamsFound || 'No exams found'}
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
      
      {/* Exam Creation Form Dialog */}
      <Dialog open={formOpen} onClose={handleFormClose} maxWidth="md" fullWidth>
        <DialogTitle>{translations.createExam || 'Create New Exam'}</DialogTitle>
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
                  label={translations.examTitle || 'Exam Title'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  fullWidth
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label={translations.examDescription || 'Exam Description'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="assigned-to-label">{translations.assignToTeachers || 'Assign To Teachers'}</InputLabel>
                  <Select
                    labelId="assigned-to-label"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    label={translations.assignToTeachers || 'Assign To Teachers'}
                    multiple
                  >
                    {teachers.map(teacher => (
                      <MenuItem key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {translations.selectTeachersHint || 'Select one or more teachers to assign this exam to'}
                  </Typography>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label={translations.dueDateOptional || 'Due Date (Optional)'}
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
              
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  {translations.examQuestions || 'Exam Questions'}
                </Typography>
                
                {questions.map((question, questionIndex) => (
                  <Accordion key={questionIndex} defaultExpanded={questionIndex === 0} sx={{ mb: 2 }}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`question-${questionIndex}-content`}
                      id={`question-${questionIndex}-header`}
                    >
                      <Typography>
                        {translations.question || 'Question'} {questionIndex + 1}: {question.questionText ? question.questionText.substring(0, 50) + (question.questionText.length > 50 ? '...' : '') : (translations.newQuestion || 'New Question')}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            label={translations.questionText || 'Question Text'}
                            value={question.questionText}
                            onChange={(e) => handleQuestionChange(questionIndex, 'questionText', e.target.value)}
                            fullWidth
                            required
                            multiline
                            rows={2}
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth required>
                            <InputLabel>{translations.questionType || 'Response Type'}</InputLabel>
                            <Select
                              value={question.responseType}
                              onChange={(e) => handleQuestionChange(questionIndex, 'responseType', e.target.value)}
                              label={translations.questionType || 'Response Type'}
                            >
                              <MenuItem value="multiple_choice">{translations.multipleChoice || 'Multiple Choice'}</MenuItem>
                              <MenuItem value="true_false">{translations.trueFalse || 'True/False'}</MenuItem>
                              <MenuItem value="short_answer">{translations.shortAnswer || 'Short Answer'}</MenuItem>
                              <MenuItem value="long_answer">{translations.longAnswer || 'Long Answer'}</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <TextField
                            label={translations.points || 'Points'}
                            type="number"
                            value={question.points}
                            onChange={(e) => handleQuestionChange(questionIndex, 'points', parseInt(e.target.value) || 1)}
                            fullWidth
                            InputProps={{ inputProps: { min: 1, max: 100 } }}
                          />
                        </Grid>
                        
                        {(question.responseType === 'multiple_choice' || question.responseType === 'true_false') && (
                          <>
                            <Grid item xs={12}>
                              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                {translations.options || 'Options'}:
                              </Typography>
                            </Grid>
                            
                            {question.responseType === 'true_false' ? (
                              <Grid item xs={12}>
                                <FormControl required>
                                  <RadioGroup
                                    row
                                    value={question.correctAnswer}
                                    onChange={(e) => handleQuestionChange(questionIndex, 'correctAnswer', e.target.value)}
                                  >
                                    <FormControlLabel value="true" control={<Radio />} label={translations.trueLabel || 'True'} />
                                    <FormControlLabel value="false" control={<Radio />} label={translations.falseLabel || 'False'} />
                                  </RadioGroup>
                                </FormControl>
                              </Grid>
                            ) : (
                              question.options.map((option, optionIndex) => (
                                <Grid item xs={12} key={optionIndex}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <FormControlLabel
                                      control={
                                        <Radio
                                          checked={question.correctAnswer === String(optionIndex)}
                                          onChange={() => handleQuestionChange(questionIndex, 'correctAnswer', String(optionIndex))}
                                        />
                                      }
                                      label={translations.correct || 'Correct'}
                                    />
                                    <TextField
                                      label={`${translations.option || 'Option'} ${optionIndex + 1}`}
                                      value={option}
                                      onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                                      fullWidth
                                      required
                                      size="small"
                                    />
                                    {question.options.length > 2 && (
                                      <IconButton color="error" onClick={() => removeOption(questionIndex, optionIndex)}>
                                        <DeleteIcon />
                                      </IconButton>
                                    )}
                                  </Box>
                                </Grid>
                              ))
                            )}
                            
                            {question.responseType === 'multiple_choice' && (
                              <Grid item xs={12}>
                                <Button 
                                  startIcon={<AddIcon />} 
                                  onClick={() => addOption(questionIndex)}
                                  variant="outlined" 
                                  size="small"
                                >
                                  {translations.addOption || 'Add Option'}
                                </Button>
                              </Grid>
                            )}
                          </>
                        )}
                        
                        {(question.responseType === 'short_answer' || question.responseType === 'long_answer') && (
                          <Grid item xs={12}>
                          <TextField
                            label={translations.correctAnswerOptional || 'Correct Answer (Optional)'}
                              value={question.correctAnswer}
                              onChange={(e) => handleQuestionChange(questionIndex, 'correctAnswer', e.target.value)}
                              fullWidth
                              multiline={question.responseType === 'long_answer'}
                              rows={question.responseType === 'long_answer' ? 3 : 1}
                            helperText={translations.correctAnswerHelp || 'This will be used as a reference when grading'}
                            />
                          </Grid>
                        )}
                        
                        {questions.length > 1 && (
                          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button 
                              color="error" 
                              startIcon={<DeleteIcon />}
                              onClick={() => removeQuestion(questionIndex)}
                            >
                              {translations.removeQuestion || 'Remove Question'}
                            </Button>
                          </Grid>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
                
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<AddIcon />}
                    onClick={addQuestion}
                  >
                    {translations.addQuestion || 'Add Question'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleFormClose}>{translations.cancel || 'Cancel'}</Button>
            <Button 
              type="submit"
              variant="contained"
              disabled={formLoading}
            >
              {formLoading ? <CircularProgress size={24} /> : (translations.createExam || 'Create Exam')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
} 