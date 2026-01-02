'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Paper
} from '@mui/material';
import {
  School as ExamIcon,
  Send as SendIcon,
  CalendarToday as CalendarIcon,
  Quiz as QuizIcon,
  CheckCircle as CheckIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon
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
      id={`exams-tabpanel-${index}`}
      aria-labelledby={`exams-tab-${index}`}
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

export default function TeacherExams() {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });

  // Fetch exams data
  useEffect(() => {
    const fetchExams = async () => {
      try {
        if (!user || !user.teacherId) {
          console.error('No teacher ID found in user data');
          return;
        }

        setLoading(true);
        
        // Call the API to get real exam data
        const data = await teacherAPI.getExams(user.teacherId, {
          status: activeTab === 0 ? 'pending' : 'completed'
        });
        
        // If there's no data, set an empty array
        if (!data || data.length === 0) {
          console.log('No exams found for this teacher');
          setExams([]);
          return;
        }
        
        console.log('Received exams data:', data);
        setExams(data);
      } catch (error) {
        console.error('Error fetching exams data:', error);
        setMessage({
          open: true,
          text: error.message || 'Failed to load exams data',
          severity: 'error'
        });
        
        // Clear exams data on error
        setExams([]);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.teacherId) {
      fetchExams();
    }
  }, [user, activeTab]);

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

  // Handle exam click
  const handleExamClick = (exam) => {
    if (activeTab === 0) {
      // For pending exams, navigate to the exam page for answering
      router.push(`/teacher/exams/${exam.id}`);
    } else {
      // For completed exams, just show a dialog with the result
      setSelectedExam(exam);
      setDialogOpen(true);
    }
  };

  // Handle form change for text answers
  const handleTextAnswerChange = (questionId, value) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: {
        ...prevAnswers[questionId],
        answerText: value
      }
    }));
  };

  // Handle option selection for multiple choice answers
  const handleOptionChange = (questionId, value) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: {
        ...prevAnswers[questionId],
        selectedOption: value
      }
    }));
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedExam(null);
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (selectedExam && currentQuestionIndex < selectedExam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Handle previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Check if all questions are answered
  const areAllQuestionsAnswered = () => {
    if (!selectedExam || !selectedExam.questions) return false;
    
    return selectedExam.questions.every(question => {
      const answer = answers[question.id];
      if (!answer) return false;
      
      if (question.responseType === 'multiple_choice' || question.responseType === 'true_false') {
        return answer.selectedOption !== null;
      } else {
        return !!answer.answerText?.trim();
      }
    });
  };

  // Handle exam submission
  const handleSubmitExam = async () => {
    try {
      if (!user || !user.teacherId || !selectedExam) return;

      setSubmitting(true);

      // In a real implementation, you would submit all answers to the API
      // For now, we'll simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      setMessage({
        open: true,
        text: translations.examSubmittedSuccessfully || 'Exam submitted successfully',
        severity: 'success'
      });
      
      // Close dialog and refresh exams
      handleDialogClose();
      
      // Refresh the exams list
      // In a real implementation:
      // const data = await teacherAPI.getExams(user.teacherId, {
      //   status: activeTab === 0 ? 'pending' : 'completed'
      // });
      // setExams(data);
    } catch (error) {
      console.error('Error submitting exam:', error);
      setMessage({
        open: true,
        text: error.message || 'Failed to submit exam',
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

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
          {translations.exams || 'Exams'}
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: theme?.text?.secondary,
            fontSize: { xs: '0.9rem', sm: '1rem' }
          }}
        >
          {translations.examsDescription || 'Manage and submit student exams'}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 2 }}>
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
            label={translations.pendingExams || "Pending Exams"} 
            id="exams-tab-0" 
            aria-controls="exams-tabpanel-0" 
          />
          <Tab 
            label={translations.completedExams || "Completed Exams"} 
            id="exams-tab-1" 
            aria-controls="exams-tabpanel-1" 
          />
        </Tabs>
      </Box>

      {/* Exams Content */}
      <TabPanel value={activeTab} index={0}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: '#845EC2' }} />
          </Box>
        ) : exams.length === 0 ? (
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
              {translations.noExamsFound || 'No exams found.'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {exams.map(exam => (
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
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme?.mode === 'light' 
                        ? '0px 4px 15px rgba(0, 0, 0, 0.1)' 
                        : '0px 4px 15px rgba(0, 0, 0, 0.3)',
                    }
                  }}
                >
                  <Box sx={{ 
                    p: 3,
                    borderBottom: '1px solid',
                    borderColor: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ExamIcon sx={{ color: '#845EC2', mr: 1.5 }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {exam.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: theme?.text?.secondary, mb: 2 }}>
                      {exam.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon sx={{ fontSize: '0.9rem', mr: 0.5, color: theme?.text?.secondary }} />
                      <Typography variant="body2" sx={{ color: theme?.text?.secondary }}>
                        {translations.due || 'Due'}: {formatDate(exam.dueDate)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ p: 3, flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {translations.questions || 'Questions'}:
                    </Typography>
                    <List dense disablePadding>
                      {exam.questions && exam.questions.map((question, idx) => (
                        <ListItem key={idx} disablePadding sx={{ mb: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <QuizIcon sx={{ fontSize: '1.2rem', color: '#845EC2' }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`Question ${idx + 1}`} 
                            secondary={question.responseType.replace('_', ' ')}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                  
                  <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={() => handleExamClick(exam)}
                      sx={{
                        backgroundColor: '#845EC2',
                        '&:hover': {
                          backgroundColor: '#6B46C1',
                        },
                      }}
                    >
                      {translations.takeExam || 'Take Exam'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: '#845EC2' }} />
          </Box>
        ) : exams.length === 0 ? (
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
              {translations.noCompletedExams || 'No completed exams found.'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {exams.map(exam => (
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
                    <Typography variant="body2" sx={{ color: theme?.text?.secondary, mb: 2 }}>
                      {exam.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon sx={{ fontSize: '0.9rem', mr: 0.5, color: theme?.text?.secondary }} />
                      <Typography variant="body2" sx={{ color: theme?.text?.secondary }}>
                        {translations.completed || 'Completed'}: {formatDate(exam.completedDate)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ p: 3, flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {translations.result || 'Result'}:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckIcon 
                        sx={{ 
                          color: exam.result === 'Rejected' ? '#f44336' : '#4caf50', 
                          mr: 1 
                        }} 
                      />
                      <Typography variant="body1">
                        {exam.result || 'Completed'}
                      </Typography>
                    </Box>
                    
                    {exam.reviewNotes && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: theme?.mode === 'light' ? '#f5f5f5' : '#2d2d2d', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                          {translations.reviewNotes || 'Review Notes'}:
                        </Typography>
                        <Typography variant="body2">
                          {exam.reviewNotes}
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
      
      {/* Exam Taking Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {selectedExam?.title}
        </DialogTitle>
        <DialogContent>
          {selectedExam && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 2, color: theme?.text?.secondary }}>
                {selectedExam.description}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="body2" sx={{ color: theme?.text?.secondary }}>
                  {translations.due || 'Due'}: {formatDate(selectedExam.dueDate)}
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {selectedExam.questions && selectedExam.questions.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {translations.questionNumber || 'Question'} {currentQuestionIndex + 1} 
                    <Typography component="span" variant="body2" sx={{ color: theme?.text?.secondary, ml: 1 }}>
                      ({translations.of || 'of'} {selectedExam.questions.length})
                    </Typography>
                  </Typography>
                  
                  <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                      {selectedExam.questions[currentQuestionIndex].questionText}
                    </Typography>
                    
                    {/* Multiple choice question */}
                    {selectedExam.questions[currentQuestionIndex].responseType === 'multiple_choice' && (
                      <FormControl component="fieldset" fullWidth>
                        <RadioGroup
                          value={answers[selectedExam.questions[currentQuestionIndex].id]?.selectedOption !== null ? 
                            answers[selectedExam.questions[currentQuestionIndex].id].selectedOption.toString() : ''}
                          onChange={(e) => handleOptionChange(
                            selectedExam.questions[currentQuestionIndex].id, 
                            parseInt(e.target.value, 10)
                          )}
                        >
                          {selectedExam.questions[currentQuestionIndex].options.map((option, idx) => (
                            <FormControlLabel
                              key={idx}
                              value={idx.toString()}
                              control={<Radio />}
                              label={option}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    )}
                    
                    {/* True/False question */}
                    {selectedExam.questions[currentQuestionIndex].responseType === 'true_false' && (
                      <FormControl component="fieldset" fullWidth>
                        <RadioGroup
                          value={answers[selectedExam.questions[currentQuestionIndex].id]?.selectedOption !== null ?
                            answers[selectedExam.questions[currentQuestionIndex].id].selectedOption.toString() : ''}
                          onChange={(e) => handleOptionChange(
                            selectedExam.questions[currentQuestionIndex].id, 
                            parseInt(e.target.value, 10)
                          )}
                        >
                          <FormControlLabel value="0" control={<Radio />} label="True" />
                          <FormControlLabel value="1" control={<Radio />} label="False" />
                        </RadioGroup>
                      </FormControl>
                    )}
                    
                    {/* Short answer question */}
                    {selectedExam.questions[currentQuestionIndex].responseType === 'short_answer' && (
                      <TextField
                        label={translations.yourAnswer || 'Your Answer'}
                        value={answers[selectedExam.questions[currentQuestionIndex].id]?.answerText || ''}
                        onChange={(e) => handleTextAnswerChange(
                          selectedExam.questions[currentQuestionIndex].id,
                          e.target.value
                        )}
                        fullWidth
                        variant="outlined"
                      />
                    )}
                    
                    {/* Long answer question */}
                    {selectedExam.questions[currentQuestionIndex].responseType === 'long_answer' && (
                      <TextField
                        label={translations.yourAnswer || 'Your Answer'}
                        value={answers[selectedExam.questions[currentQuestionIndex].id]?.answerText || ''}
                        onChange={(e) => handleTextAnswerChange(
                          selectedExam.questions[currentQuestionIndex].id,
                          e.target.value
                        )}
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                      />
                    )}
                  </Paper>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Button 
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                      startIcon={<PrevIcon />}
                    >
                      {translations.previous || 'Previous'}
                    </Button>
                    
                    {currentQuestionIndex < selectedExam.questions.length - 1 ? (
                      <Button 
                        onClick={handleNextQuestion}
                        endIcon={<NextIcon />}
                        variant="contained"
                        sx={{
                          backgroundColor: '#845EC2',
                          '&:hover': {
                            backgroundColor: '#6B46C1',
                          },
                        }}
                      >
                        {translations.next || 'Next'}
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSubmitExam}
                        disabled={submitting}
                        endIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
                        variant="contained"
                        color="primary"
                        sx={{
                          backgroundColor: '#845EC2',
                          '&:hover': {
                            backgroundColor: '#6B46C1',
                          },
                        }}
                      >
                        {submitting
                          ? (translations.submitting || 'Submitting...')
                          : (translations.submitExam || 'Submit Exam')}
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={submitting}>
            {translations.cancel || 'Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
      
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