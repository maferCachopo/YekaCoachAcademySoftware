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
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { fetchWithAuth } from '@/app/utils/api';
import { format } from 'date-fns';
import { useTheme } from '@/app/contexts/ThemeContext';

export default function ExamReview() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id;
  const { theme, isDark } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [error, setError] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth(`/coordinator/exams/${examId}/review`);
        setExam(data);
        setReviewNotes(data.reviewNotes || '');
      } catch (err) {
        console.error('Error fetching exam details:', err);
        setError({
          message: err.message || 'Failed to fetch exam details',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchExamDetails();
  }, [examId]);
  
  const handleGoBack = () => {
    router.push('/coordinator/exams');
  };
  
  const handleReview = (action) => {
    setReviewAction(action);
    setReviewDialog(true);
  };
  
  const handleReviewSubmit = async () => {
    try {
      setSubmitting(true);
      
      const updatedExam = await fetchWithAuth(`/coordinator/exams/${examId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: reviewAction,
          reviewNotes
        })
      });
      
      setExam({
        ...exam,
        status: updatedExam.status,
        reviewNotes: updatedExam.reviewNotes,
        reviewedAt: updatedExam.reviewedAt
      });
      
      setReviewDialog(false);
      setError({
        message: `Exam has been ${reviewAction === 'approved' ? 'approved' : 'rejected'} successfully!`,
        type: 'success'
      });
      
      // Clear success message after a delay
      setTimeout(() => {
        setError(null);
      }, 5000);
    } catch (err) {
      console.error(`Error ${reviewAction}ing exam:`, err);
      setError({
        message: err.message || `Failed to ${reviewAction} exam`,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCloseReviewDialog = () => {
    setReviewDialog(false);
  };
  
  const getStatusChip = (status) => {
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
      <Alert severity={error.type} sx={{ mb: 2 }}>
        {error.message}
        <Button onClick={handleGoBack} sx={{ ml: 2 }}>
          Go Back
        </Button>
      </Alert>
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
  
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={handleGoBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ 
          color: isDark ? "#ffffff" : "#111827",
          fontWeight: 600 
        }}>
          Exam Review
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ 
              color: isDark ? "#ffffff" : "#111827",
              fontWeight: 600 
            }}>
              {exam.title}
            </Typography>
            {exam.description && (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {exam.description}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
            {getStatusChip(exam.status)}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Created: {format(new Date(exam.createdAt), 'PPP')}
            </Typography>
            {exam.dueDate && (
              <Typography variant="body2" color="text.secondary">
                Due: {format(new Date(exam.dueDate), 'PPP')}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1 }}>
              Assigned to: {exam.assignedTeacher?.firstName} {exam.assignedTeacher?.lastName}
            </Typography>
          </Grid>
        </Grid>
        
        {(exam.status === 'completed') && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="contained" 
              color="error" 
              startIcon={<CancelIcon />}
              onClick={() => handleReview('rejected')}
            >
              Reject
            </Button>
            <Button 
              variant="contained" 
              color="success" 
              startIcon={<CheckCircleIcon />}
              onClick={() => handleReview('approved')}
            >
              Approve
            </Button>
          </Box>
        )}
        
        {exam.reviewNotes && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Review Notes:
            </Typography>
            <Typography variant="body2">
              {exam.reviewNotes}
            </Typography>
            {exam.reviewedAt && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Reviewed on {format(new Date(exam.reviewedAt), 'PPP p')}
              </Typography>
            )}
          </Box>
        )}
      </Paper>
      
      <Typography variant="h5" sx={{ 
        mb: 3, 
        color: isDark ? "#ffffff" : "#111827",
        fontWeight: 600 
      }}>
        Questions & Answers
      </Typography>
      
      {exam.questions?.map((question, index) => (
        <Accordion key={question.id} defaultExpanded={index === 0} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ color: isDark ? "#f3f4f6" : "#111827", fontWeight: 500 }}>
              Question {index + 1}: {question.questionText.substring(0, 70)}
              {question.questionText.length > 70 ? '...' : ''}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom sx={{ 
                color: isDark ? "#f3f4f6" : "#1f2937"
              }}>
                {question.questionText}
              </Typography>
              
              {question.responseType === 'multiple_choice' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ 
                    color: isDark ? "#f3f4f6" : "#111827",
                    fontWeight: 600 
                  }}>
                    Options:
                  </Typography>
                  <List dense>
                    {(typeof question.options === 'string' ? JSON.parse(question.options) : question.options).map((option, optIndex) => (
                      <ListItem key={optIndex}>
                        <ListItemText 
                          primary={option} 
                          secondary={question.correctAnswer === String(optIndex) ? 'Correct answer' : ''}
                          primaryTypographyProps={{ 
                            color: isDark ? "#e5e7eb" : "#374151" 
                          }}
                        />
                        {question.correctAnswer === String(optIndex) && (
                          <CheckCircleIcon color="success" fontSize="small" />
                        )}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {['short_answer', 'long_answer'].includes(question.responseType) && question.correctAnswer && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ 
                    color: isDark ? "#f3f4f6" : "#111827",
                    fontWeight: 600 
                  }}>
                    Model Answer:
                  </Typography>
                  <Typography variant="body2" sx={{ color: isDark ? "#e5e7eb" : "#374151" }}>
                    {question.correctAnswer}
                  </Typography>
                </Box>
              )}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ 
                color: isDark ? "#f3f4f6" : "#111827",
                fontWeight: 600 
              }}>
                Teacher's Answer:
              </Typography>
              
              {question.answers && question.answers.length > 0 ? (
                question.answers.map((answer) => (
                  <Card key={answer.id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      {answer.answerText && (
                        <Typography variant="body1" gutterBottom>
                          {answer.answerText}
                        </Typography>
                      )}
                      
                      {answer.selectedOption !== null && answer.selectedOption !== undefined && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <Typography variant="body2" sx={{ mr: 1 }}>
                            Selected option: {(typeof question.options === 'string' ? JSON.parse(question.options) : question.options)[answer.selectedOption]}
                          </Typography>
                          {answer.isCorrect !== null && (
                            answer.isCorrect ? (
                              <CheckIcon color="success" />
                            ) : (
                              <CloseIcon color="error" />
                            )
                          )}
                        </Box>
                      )}
                      
                      {answer.feedback && (
                        <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Feedback:
                          </Typography>
                          <Typography variant="body2">
                            {answer.feedback}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Alert severity="info">
                  No answers submitted yet
                </Alert>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
      
      {/* Review Dialog */}
      <Dialog open={reviewDialog} onClose={handleCloseReviewDialog}>
        <DialogTitle>
          {reviewAction === 'approved' ? 'Approve Exam' : 'Reject Exam'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to {reviewAction === 'approved' ? 'approve' : 'reject'} this exam?
          </Typography>
          <TextField
            label="Review Notes"
            multiline
            rows={4}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReviewDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleReviewSubmit} 
            variant="contained" 
            color={reviewAction === 'approved' ? 'success' : 'error'}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : (reviewAction === 'approved' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 