'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Alert,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider,
  Card,
  CardContent,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Save as SaveIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { fetchWithAuth } from '@/app/utils/api';
import { teacherAPI } from '@/app/utils/api';

export default function TeacherExamTake() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exam, setExam] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        setLoading(true);
        
        console.log(`Fetching exam details for ID: ${examId}`);
        const data = await teacherAPI.getExamDetails(examId);
        console.log('Received exam data:', data);
        
        // If there's no data or questions, show an error
        if (!data || !data.questions || data.questions.length === 0) {
          console.error('No exam data or questions found');
          setError('No exam questions found. Please contact your coordinator.');
          setLoading(false);
          return;
        }
        
        setExam(data);
        
        // Initialize answers object
        const initialAnswers = {};
        data.questions.forEach(question => {
          if (question.answers && question.answers.length > 0) {
            const existingAnswer = question.answers[0];
            initialAnswers[question.id] = {
              answerText: existingAnswer.answerText || '',
              selectedOption: existingAnswer.selectedOption !== null ? existingAnswer.selectedOption : null
            };
          } else {
            initialAnswers[question.id] = {
              answerText: '',
              selectedOption: null
            };
          }
        });
        setAnswers(initialAnswers);
        
        // Check if exam is already completed
        if (data.status === 'completed' || data.status === 'approved' || data.status === 'rejected') {
          setSubmitted(true);
        } else {
          setSubmitted(false);
        }
        
        // Turn off loading state after successful data fetch
        setLoading(false);
      } catch (err) {
        console.error('Error fetching exam details:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchExamDetails();
  }, [examId]);
  
  const handleGoBack = () => {
    router.push('/teacher/exams');
  };
  
  const handleNext = () => {
    if (currentQuestion < (exam?.questions?.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };
  
  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };
  
  const handleAnswerTextChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: {
        ...answers[questionId],
        answerText: value
      }
    });
  };
  
  const handleOptionChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: {
        ...answers[questionId],
        selectedOption: value
      }
    });
  };
  
  const handleSaveAnswer = async (questionId) => {
    try {
      const answer = answers[questionId];
      const question = exam.questions.find(q => q.id === questionId);
      
      if (!question) {
        throw new Error('Question not found');
      }
      
      let payload = {};
      
      if (question.responseType === 'multiple_choice' || question.responseType === 'true_false') {
        payload = {
          selectedOption: answer.selectedOption
        };
      } else {
        payload = {
          answerText: answer.answerText
        };
      }
      
      // Save the answer using the API
      const response = await teacherAPI.saveExamAnswer(examId, questionId, payload);
      
      // Show success message
      setError({ message: 'Answer saved successfully', type: 'success' });
      
      // Clear success message after a delay
      setTimeout(() => {
        setError(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving answer:', err);
      setError({ message: err.message, type: 'error' });
    }
  };
  
  const checkAnswersComplete = () => {
    if (!exam?.questions) return false;
    
    let allAnswered = true;
    
    for (const question of exam.questions) {
      const answer = answers[question.id];
      
      if (!answer) {
        allAnswered = false;
        break;
      }
      
      if (question.responseType === 'multiple_choice' || question.responseType === 'true_false') {
        if (answer.selectedOption === null) {
          allAnswered = false;
          break;
        }
      } else {
        if (!answer.answerText || answer.answerText.trim() === '') {
          allAnswered = false;
          break;
        }
      }
    }
    
    return allAnswered;
  };
  
  const handleOpenSubmitDialog = () => {
    const complete = checkAnswersComplete();
    setIncomplete(!complete);
    setConfirmSubmitOpen(true);
  };
  
  const handleCloseSubmitDialog = () => {
    setConfirmSubmitOpen(false);
  };
  
  const handleSubmitExam = async () => {
    try {
      setSubmitting(true);
      
      // Save current answer first
      if (exam?.questions && exam.questions[currentQuestion]) {
        const questionId = exam.questions[currentQuestion].id;
        await handleSaveAnswer(questionId);
      }
      
      // Submit the exam using the API
      await teacherAPI.submitExam(examId);
      
      setSubmitted(true);
      setConfirmSubmitOpen(false);
      setError({ message: 'Exam submitted successfully!', type: 'success' });
      
      // Refresh exam data
      const updatedExam = await teacherAPI.getExamDetails(examId);
      setExam(updatedExam);
    } catch (err) {
      console.error('Error submitting exam:', err);
      setError({ message: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!exam) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Exam not found
        <Button onClick={handleGoBack} sx={{ ml: 2 }}>
          Go Back
        </Button>
      </Alert>
    );
  }
  
  const currentQuestionData = exam.questions?.[currentQuestion];
  const totalQuestions = exam.questions?.length || 0;
  
  return (
    <Box sx={{ 
      padding: { xs: 2, sm: 3 }, 
      background: theme => theme.palette?.background?.default || '#f5f5f5',
      width: '100%',
      minHeight: 'calc(100vh - 64px)'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={handleGoBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {exam.title}
        </Typography>
      </Box>
      
      {error && (
        <Alert 
          severity={error.type || 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error.message}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Typography variant="body1" paragraph>
              {exam.description}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Status:
              </Typography>
              <Chip 
                label={exam.status.charAt(0).toUpperCase() + exam.status.slice(1)} 
                color={
                  exam.status === 'assigned' ? 'warning' :
                  exam.status === 'draft' ? 'default' :
                  exam.status === 'completed' ? 'info' :
                  exam.status === 'approved' ? 'success' :
                  exam.status === 'rejected' ? 'error' :
                  'default'
                }
                size="small"
              />
            </Box>
            {exam.dueDate && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Due: {new Date(exam.dueDate).toLocaleString()}
              </Typography>
            )}
          </Grid>
        </Grid>
        
        {submitted ? (
          <Alert severity="info" sx={{ mt: 3 }}>
            This exam has been submitted and cannot be modified.
          </Alert>
        ) : null}
        
        <Box sx={{ mt: 4 }}>
          <Stepper activeStep={currentQuestion} alternativeLabel sx={{ mb: 4 }}>
            {exam.questions?.map((question, index) => (
              <Step key={question.id} completed={answers[question.id]?.answerText || answers[question.id]?.selectedOption !== null}>
                <StepLabel>Question {index + 1}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {currentQuestionData && (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Question {currentQuestion + 1} of {totalQuestions}
                </Typography>
                
                <Typography variant="body1" paragraph>
                  {currentQuestionData.questionText}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Multiple choice question */}
                {currentQuestionData.responseType === 'multiple_choice' && (
                  <FormControl component="fieldset" fullWidth disabled={submitted}>
                    <RadioGroup
                      value={answers[currentQuestionData.id]?.selectedOption?.toString() || ''}
                      onChange={(e) => handleOptionChange(currentQuestionData.id, parseInt(e.target.value))}
                    >
                      {(typeof currentQuestionData.options === 'string' 
                        ? JSON.parse(currentQuestionData.options) 
                        : currentQuestionData.options).map((option, index) => (
                        <FormControlLabel
                          key={index}
                          value={index.toString()}
                          control={<Radio />}
                          label={option}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                )}
                
                {/* True/False question */}
                {currentQuestionData.responseType === 'true_false' && (
                  <FormControl component="fieldset" fullWidth disabled={submitted}>
                    <RadioGroup
                      value={answers[currentQuestionData.id]?.selectedOption?.toString() || ''}
                      onChange={(e) => handleOptionChange(currentQuestionData.id, parseInt(e.target.value))}
                    >
                      <FormControlLabel value="0" control={<Radio />} label="True" />
                      <FormControlLabel value="1" control={<Radio />} label="False" />
                    </RadioGroup>
                  </FormControl>
                )}
                
                {/* Short answer question */}
                {currentQuestionData.responseType === 'short_answer' && (
                  <TextField
                    label="Your Answer"
                    value={answers[currentQuestionData.id]?.answerText || ''}
                    onChange={(e) => handleAnswerTextChange(currentQuestionData.id, e.target.value)}
                    fullWidth
                    variant="outlined"
                    disabled={submitted}
                  />
                )}
                
                {/* Long answer question */}
                {currentQuestionData.responseType === 'long_answer' && (
                  <TextField
                    label="Your Answer"
                    value={answers[currentQuestionData.id]?.answerText || ''}
                    onChange={(e) => handleAnswerTextChange(currentQuestionData.id, e.target.value)}
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    disabled={submitted}
                  />
                )}
              </CardContent>
            </Card>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button 
              onClick={handlePrev}
              disabled={currentQuestion === 0 || submitted}
              startIcon={<PrevIcon />}
            >
              Previous
            </Button>
            
            {!submitted && (
              <Button
                onClick={() => handleSaveAnswer(currentQuestionData.id)}
                variant="outlined"
                startIcon={<SaveIcon />}
              >
                Save Answer
              </Button>
            )}
            
            {currentQuestion < totalQuestions - 1 ? (
              <Button 
                onClick={handleNext}
                disabled={submitted}
                endIcon={<NextIcon />}
                variant="contained"
              >
                Next
              </Button>
            ) : (
              !submitted && (
                <Button 
                  onClick={handleOpenSubmitDialog}
                  endIcon={<SendIcon />}
                  variant="contained" 
                  color="primary"
                >
                  Submit Exam
                </Button>
              )
            )}
          </Box>
        </Box>
      </Paper>
      
      {/* Submit confirmation dialog */}
      <Dialog open={confirmSubmitOpen} onClose={handleCloseSubmitDialog}>
        <DialogTitle>
          {incomplete ? 'Incomplete Answers' : 'Submit Exam'}
        </DialogTitle>
        <DialogContent>
          {incomplete ? (
            <DialogContentText>
              You haven't answered all questions yet. Do you still want to submit the exam?
            </DialogContentText>
          ) : (
            <DialogContentText>
              Are you sure you want to submit this exam? Once submitted, you won't be able to make changes.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubmitDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitExam} 
            variant="contained" 
            color="primary"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {submitting ? 'Submitting...' : 'Yes, Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 