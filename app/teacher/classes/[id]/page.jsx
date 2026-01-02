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
  Divider,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  Paper
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Send as SendIcon,
  ArrowBack as BackIcon,
  Person as PersonIcon,
  Class as ClassIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { teacherAPI, timezoneUtils } from '@/app/utils/api';
import { format } from 'date-fns';
import ThemeTransition from '@/app/components/ThemeTransition';
import moment from 'moment';
import 'moment-timezone';
import { ADMIN_TIMEZONE } from '@/app/utils/constants';

export default function ClassForm({ params }) {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const classId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classData, setClassData] = useState(null);
  const [formData, setFormData] = useState({
    breathing: '',
    warmup: '',
    vocalization: '',
    observations: '',
    classType: 'regular', // regular or substitution
    classStatus: 'given'  // given or viewed
  });
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });

  // Fetch class data
  useEffect(() => {
    const fetchClassData = async () => {
      try {
        if (!user || !user.teacherId || !classId) {
          console.error('Missing required data');
          return;
        }

        setLoading(true);
        
        // In a real app, we'd fetch the specific class
        // For now, we'll get all classes and find the one we need
        const classes = await teacherAPI.getTodaysClasses(user.teacherId);
        const currentClass = classes.find(c => c.id.toString() === classId);
        
        if (!currentClass) {
          throw new Error('Class not found');
        }
        
        setClassData(currentClass);
      } catch (error) {
        console.error('Error fetching class data:', error);
        setMessage({
          open: true,
          text: error.message || 'Failed to load class data',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && user.teacherId && classId) {
      fetchClassData();
    }
  }, [user, classId]);

  // Format time (HH:MM) and convert from admin timezone to user's timezone
  const formatTime = (timeString, dateString) => {
    if (!timeString || !dateString) return '';
    // Use user's preferred timezone if available, otherwise use browser timezone
    const userTimezone = user?.timezone || null;
    return timezoneUtils.formatUserTime(dateString, timeString, ADMIN_TIMEZONE, userTimezone);
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

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle cancel
  const handleCancel = () => {
    router.back();
  };

  // Handle save (draft)
  const handleSave = () => {
    // In a real app, we'd save the draft to local storage or backend
    setMessage({
      open: true,
      text: translations.classSavedAsDraft || 'Class record saved as draft',
      severity: 'success'
    });
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      if (!user || !user.teacherId || !classId) return;

      setSubmitting(true);

      await teacherAPI.submitClassRecord(user.teacherId, classId, formData);
      
      // Show success message
      setMessage({
        open: true,
        text: translations.classRecordSubmitted || 'Class record submitted successfully',
        severity: 'success'
      });
      
      // Navigate back to classes page
      setTimeout(() => {
        router.push('/teacher/classes');
      }, 1500);
    } catch (error) {
      console.error('Error submitting class record:', error);
      setMessage({
        open: true,
        text: error.message || 'Failed to submit class record',
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Get student names as string
  const getStudentNames = () => {
    if (!classData || !classData.students || !classData.students.length) {
      return 'No students';
    }
    
    return classData.students.map(student => `${student.name} ${student.surname}`).join(', ');
  };

  return (
    <ThemeTransition
      component={Box}
      sx={{ 
        background: theme?.background?.default,
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 2, sm: 3 },
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 1
      }}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={handleCancel}
          sx={{
            borderColor: 'rgba(132, 94, 194, 0.5)',
            color: theme?.text?.primary,
            '&:hover': {
              borderColor: '#845EC2',
              backgroundColor: 'rgba(132, 94, 194, 0.08)',
            },
            mr: 2
          }}
        >
          {translations.back || 'Back'}
        </Button>
        
        <Typography 
          variant="h4" 
          sx={{ 
            color: theme?.text?.primary,
            fontWeight: 'bold',
            fontSize: { xs: '1.4rem', sm: '1.7rem' },
          }}
        >
          {translations.classRecord || 'Class Record'}
        </Typography>
      </Box>

      {/* Class Form */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ color: '#845EC2' }} />
        </Box>
      ) : !classData ? (
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
            {translations.classNotFound || 'Class not found.'}
          </Typography>
        </Box>
      ) : (
        <Box>
          {/* Class Info Card */}
          <Card 
            sx={{ 
              borderRadius: 2,
              boxShadow: theme?.mode === 'light' 
                ? '0px 2px 10px rgba(0, 0, 0, 0.05)' 
                : '0px 2px 10px rgba(0, 0, 0, 0.2)',
              background: theme?.card?.background || theme?.palette?.background?.paper,
              mb: 3,
              p: 3
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ClassIcon sx={{ color: '#845EC2', mr: 1.5 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {classData.title}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2, color: theme?.text?.secondary }}>
                  {translations.classNumber || 'Class'} #{classId}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
                  <Typography variant="body2" sx={{ color: theme?.text?.secondary }}>
                    {formatDate(classData.date)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme?.text?.secondary }}>
                    {`${formatTime(classData.startTime, classData.date)} - ${formatTime(classData.endTime, classData.date)}`}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ color: '#845EC2', mr: 1.5 }} />
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {translations.students || 'Students'}: {getStudentNames()}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>
          
          {/* Class Record Form */}
          <Paper
            sx={{ 
              borderRadius: 2,
              boxShadow: theme?.mode === 'light' 
                ? '0px 2px 10px rgba(0, 0, 0, 0.05)' 
                : '0px 2px 10px rgba(0, 0, 0, 0.2)',
              background: theme?.card?.background || theme?.palette?.background?.paper,
              p: 3,
              mb: 3
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              {translations.classDetails || 'Class Details'}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  name="breathing"
                  label={translations.breathing || "Breathing"}
                  multiline
                  rows={3}
                  value={formData.breathing}
                  onChange={handleFormChange}
                  fullWidth
                  variant="outlined"
                  placeholder={translations.breathingPlaceholder || "Notes on breathing exercises and techniques"}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="warmup"
                  label={translations.warmup || "Warm-up"}
                  multiline
                  rows={3}
                  value={formData.warmup}
                  onChange={handleFormChange}
                  fullWidth
                  variant="outlined"
                  placeholder={translations.warmupPlaceholder || "Notes on warm-up exercises performed"}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="vocalization"
                  label={translations.vocalization || "Vocalization"}
                  multiline
                  rows={3}
                  value={formData.vocalization}
                  onChange={handleFormChange}
                  fullWidth
                  variant="outlined"
                  placeholder={translations.vocalizationPlaceholder || "Notes on vocalization exercises and performance"}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="observations"
                  label={translations.observations || "Observations"}
                  multiline
                  rows={4}
                  value={formData.observations}
                  onChange={handleFormChange}
                  fullWidth
                  variant="outlined"
                  placeholder={translations.observationsPlaceholder || "General observations, progress notes, and recommendations"}
                />
              </Grid>
            </Grid>
          </Paper>
          
          {/* Class Options */}
          <Paper
            sx={{ 
              borderRadius: 2,
              boxShadow: theme?.mode === 'light' 
                ? '0px 2px 10px rgba(0, 0, 0, 0.05)' 
                : '0px 2px 10px rgba(0, 0, 0, 0.2)',
              background: theme?.card?.background || theme?.palette?.background?.paper,
              p: 3,
              mb: 3
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              {translations.classOptions || 'Class Options'}
            </Typography>
            
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ color: theme?.text?.primary }}>
                    {translations.classStatus || 'Class Status'}
                  </FormLabel>
                  <RadioGroup
                    name="classStatus"
                    value={formData.classStatus}
                    onChange={handleFormChange}
                  >
                    <FormControlLabel 
                      value="given" 
                      control={<Radio sx={{ color: '#845EC2', '&.Mui-checked': { color: '#845EC2' } }} />} 
                      label={translations.classGiven || "Class Given"} 
                    />
                    <FormControlLabel 
                      value="viewed" 
                      control={<Radio sx={{ color: '#845EC2', '&.Mui-checked': { color: '#845EC2' } }} />} 
                      label={translations.classViewed || "Class Viewed"} 
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ color: theme?.text?.primary }}>
                    {translations.classType || 'Class Type'}
                  </FormLabel>
                  <RadioGroup
                    name="classType"
                    value={formData.classType}
                    onChange={handleFormChange}
                  >
                    <FormControlLabel 
                      value="regular" 
                      control={<Radio sx={{ color: '#845EC2', '&.Mui-checked': { color: '#845EC2' } }} />} 
                      label={translations.regularClass || "Regular Class"} 
                    />
                    <FormControlLabel 
                      value="substitution" 
                      control={<Radio sx={{ color: '#845EC2', '&.Mui-checked': { color: '#845EC2' } }} />} 
                      label={translations.substitutionClass || "Substitution Class"} 
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Action Buttons */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: 2,
            mt: 3,
            mb: 2
          }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={submitting}
              sx={{
                borderColor: 'rgba(132, 94, 194, 0.5)',
                color: theme?.text?.primary,
                '&:hover': {
                  borderColor: '#845EC2',
                  backgroundColor: 'rgba(132, 94, 194, 0.08)',
                },
              }}
            >
              {translations.cancel || 'Cancel'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={submitting}
              sx={{
                borderColor: 'rgba(132, 94, 194, 0.5)',
                color: theme?.text?.primary,
                '&:hover': {
                  borderColor: '#845EC2',
                  backgroundColor: 'rgba(132, 94, 194, 0.08)',
                },
              }}
            >
              {translations.save || 'Save'}
            </Button>
            
            <Button
              variant="contained"
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              onClick={handleSubmit}
              disabled={submitting}
              sx={{
                backgroundColor: '#845EC2',
                '&:hover': {
                  backgroundColor: '#6B46C1',
                },
              }}
            >
              {submitting 
                ? (translations.submitting || 'Submitting...') 
                : (translations.submit || 'Submit')}
            </Button>
          </Box>
        </Box>
      )}
      
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