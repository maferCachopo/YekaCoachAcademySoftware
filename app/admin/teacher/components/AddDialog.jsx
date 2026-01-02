'use client';
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, IconButton, Switch,
  FormControlLabel, Typography, Grid, CircularProgress,
  Select, MenuItem, FormControl, InputLabel,
  Alert, Collapse
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { fetchWithAuth } from '@/app/utils/api';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Default work hours template (9 AM to 6 PM for weekdays)
const DEFAULT_WORK_HOURS = {
  monday: [{ start: '09:00', end: '18:00' }],
  tuesday: [{ start: '09:00', end: '18:00' }],
  wednesday: [{ start: '09:00', end: '18:00' }],
  thursday: [{ start: '09:00', end: '18:00' }],
  friday: [{ start: '09:00', end: '18:00' }],
  saturday: [], // Weekend days start empty
  sunday: []
};

// Default break hours template (1 PM to 2 PM for weekdays)
const DEFAULT_BREAK_HOURS = {
  monday: [{ start: '13:00', end: '14:00' }],
  tuesday: [{ start: '13:00', end: '14:00' }],
  wednesday: [{ start: '13:00', end: '14:00' }],
  thursday: [{ start: '13:00', end: '14:00' }],
  friday: [{ start: '13:00', end: '14:00' }],
  saturday: [],
  sunday: []
};

export default function AddDialog({ open, onClose, setMessage, refreshTeachers }) {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    workHours: DEFAULT_WORK_HOURS,
    breakHours: DEFAULT_BREAK_HOURS,
    specialties: [],
    maxStudentsPerDay: 8,
    isCoordinator: false,
    password: '',
    confirmPassword: '',
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  });
  const [validationErrors, setValidationErrors] = useState([]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateTimeSlots = (workHours, breakHours) => {
    const errors = [];
    const validTimeFormat = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    // Helper function to convert time string to minutes
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Helper function to check if break hours are within work hours
    const isBreakWithinWork = (breakSlot, workSlots) => {
      return workSlots.some(workSlot => {
        const workStart = timeToMinutes(workSlot.start);
        const workEnd = timeToMinutes(workSlot.end);
        const breakStart = timeToMinutes(breakSlot.start);
        const breakEnd = timeToMinutes(breakSlot.end);
        return breakStart >= workStart && breakEnd <= workEnd;
      });
    };

    DAYS_OF_WEEK.forEach(day => {
      // Skip validation for weekend days if no hours are set
      if ((day === 'saturday' || day === 'sunday') && 
          (!workHours[day]?.length && !breakHours[day]?.length)) {
        return;
      }

      // Validate work hours
      if (!workHours[day] || !workHours[day].length) {
        errors.push(`Work hours must be set for ${day}`);
        return;
      }

      workHours[day].forEach((slot, index) => {
        if (!validTimeFormat.test(slot.start) || !validTimeFormat.test(slot.end)) {
          errors.push(`Invalid time format for work hours on ${day}`);
          return;
        }

        const startMinutes = timeToMinutes(slot.start);
        const endMinutes = timeToMinutes(slot.end);
        if (startMinutes >= endMinutes) {
          errors.push(`Work hours end time must be after start time on ${day}`);
        }
      });

      // Validate break hours
      if (breakHours[day]) {
        breakHours[day].forEach(breakSlot => {
          if (!validTimeFormat.test(breakSlot.start) || !validTimeFormat.test(breakSlot.end)) {
            errors.push(`Invalid time format for break hours on ${day}`);
            return;
          }

          const breakStartMinutes = timeToMinutes(breakSlot.start);
          const breakEndMinutes = timeToMinutes(breakSlot.end);
          if (breakStartMinutes >= breakEndMinutes) {
            errors.push(`Break hours end time must be after start time on ${day}`);
          }

          if (!isBreakWithinWork(breakSlot, workHours[day])) {
            errors.push(`Break hours must be within work hours on ${day}`);
          }
        });
      }
    });

    return errors;
  };

  const handleWorkHoursChange = (day, type, index, value) => {
    setFormData(prev => {
      const workHours = { ...prev.workHours };
      if (!workHours[day]) {
        workHours[day] = [{ start: '', end: '' }];
      }
      if (!workHours[day][index]) {
        workHours[day][index] = { start: '', end: '' };
      }
      workHours[day][index][type] = value;
      return { ...prev, workHours };
    });
  };

  const handleBreakHoursChange = (day, type, index, value) => {
    setFormData(prev => {
      const breakHours = { ...prev.breakHours };
      if (!breakHours[day]) {
        breakHours[day] = [{ start: '', end: '' }];
      }
      if (!breakHours[day][index]) {
        breakHours[day][index] = { start: '', end: '' };
      }
      breakHours[day][index][type] = value;
      return { ...prev, breakHours };
    });
  };

  const addTimeSlot = (day, type) => {
    setFormData(prev => {
      const hours = type === 'work' ? { ...prev.workHours } : { ...prev.breakHours };
      if (!hours[day]) {
        hours[day] = [];
      }
      hours[day].push({ start: '', end: '' });
      return type === 'work' 
        ? { ...prev, workHours: hours }
        : { ...prev, breakHours: hours };
    });
  };

  const removeTimeSlot = (day, index, type) => {
    setFormData(prev => {
      const hours = type === 'work' ? { ...prev.workHours } : { ...prev.breakHours };
      hours[day].splice(index, 1);
      if (hours[day].length === 0) {
        delete hours[day];
      }
      return type === 'work'
        ? { ...prev, workHours: hours }
        : { ...prev, breakHours: hours };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors([]);

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'password'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setValidationErrors([...missingFields.map(field => `${field} is required`)]);
      setLoading(false);
      return;
    }

    // Validate password
    if (formData.password.length < 8) {
      setValidationErrors(['Password must be at least 8 characters long']);
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setValidationErrors(['Passwords do not match']);
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setValidationErrors(['Invalid email format']);
      setLoading(false);
      return;
    }

    // Validate work hours and break hours
    const timeErrors = validateTimeSlots(formData.workHours, formData.breakHours);
    if (timeErrors.length > 0) {
      setValidationErrors(timeErrors);
      setLoading(false);
      return;
    }

    try {
      // Ensure workHours is an object with arrays
      const workHoursData = { ...formData.workHours };
      DAYS_OF_WEEK.forEach(day => {
        if (!workHoursData[day]) {
          workHoursData[day] = [];
        }
      });

      // Ensure breakHours is an object with arrays
      const breakHoursData = { ...formData.breakHours };
      DAYS_OF_WEEK.forEach(day => {
        if (!breakHoursData[day]) {
          breakHoursData[day] = [];
        }
      });

      // Debug logs
      console.log('Sending teacher data:', {
        workHours: workHoursData,
        breakHours: breakHoursData,
        specialties: formData.specialties || []
      });

      const requestBody = {
        username: formData.email,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        workHours: workHoursData,
        breakHours: breakHoursData,
        specialties: formData.specialties || [],
        maxStudentsPerDay: formData.maxStudentsPerDay,
        isCoordinator: formData.isCoordinator,
        workingDays: formData.workingDays
      };

      console.log('Full request body:', JSON.stringify(requestBody, null, 2));
      console.log('Sending POST request to /api/teachers...');

      const response = await fetchWithAuth('/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Received response from server:', response);

      if (response) {
        setMessage({
          open: true,
          text: `Teacher created successfully! Login credentials:\nUsername/Email: ${formData.email}\nPlease share these credentials with the teacher.`,
          severity: 'success'
        });
        onClose();
        refreshTeachers();
      }
    } catch (error) {
      console.error('Error creating teacher:', error);
      setMessage({
        open: true,
        text: error.message || 'Failed to create teacher',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const textFieldStyle = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: theme.mode === 'light' ? '#fff' : 'rgba(0, 0, 0, 0.15)',
      '& fieldset': {
        borderColor: theme.mode === 'light' 
          ? 'rgba(0, 0, 0, 0.23)' 
          : 'rgba(255, 255, 255, 0.23)',
      },
      '&:hover fieldset': {
        borderColor: '#845EC2',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#845EC2',
      },
    },
    '& .MuiInputLabel-root': {
      color: theme.text?.secondary,
      '&.Mui-focused': {
        color: '#845EC2',
      },
    },
    '& .MuiInputBase-input': {
      color: theme.text?.primary,
    },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d',
          backgroundImage: 'none',
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        color: theme.text?.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: theme.mode === 'light' 
          ? 'rgba(0, 0, 0, 0.12)' 
          : 'rgba(255, 255, 255, 0.12)',
      }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {translations.addTeacher || 'Add New Teacher'}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: theme.text?.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ 
          borderColor: theme.mode === 'light' 
            ? 'rgba(0, 0, 0, 0.12)' 
            : 'rgba(255, 255, 255, 0.12)',
        }}>
          {/* Validation Errors */}
          <Collapse in={validationErrors.length > 0}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </Alert>
          </Collapse>

          <Grid container spacing={2}>
            {/* Personal Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ 
                mb: 2,
                color: theme.text?.primary,
                fontWeight: 500
              }}>
                {translations.personalInfo || 'Personal Information'}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translations.firstName || 'First Name'}
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                sx={textFieldStyle}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translations.lastName || 'Last Name'}
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                sx={textFieldStyle}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={translations.email || 'Email'}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                helperText={translations.emailHelperText || 'This email will be used as the teacher\'s login username'}
                sx={textFieldStyle}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translations.phone || 'Phone'}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                sx={textFieldStyle}
              />
            </Grid>

            {/* Work Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ 
                mt: 2,
                mb: 2,
                color: theme.text?.primary,
                fontWeight: 500
              }}>
                {translations.workInfo || 'Work Information'}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isCoordinator}
                    onChange={handleChange}
                    name="isCoordinator"
                    color="primary"
                  />
                }
                label={translations.isCoordinator || "Is Coordinator"}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translations.maxStudentsPerDay || 'Max Students Per Day'}
                name="maxStudentsPerDay"
                type="number"
                value={formData.maxStudentsPerDay}
                onChange={handleChange}
                required
                inputProps={{ min: 1, max: 20 }}
                sx={textFieldStyle}
              />
            </Grid>

            {/* Work Hours and Break Hours */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {translations.scheduleInfo || 'Schedule Information'}
              </Typography>
              {DAYS_OF_WEEK.map((day) => (
                <Box key={day} sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ 
                    mb: 1, 
                    textTransform: 'capitalize',
                    fontWeight: 500,
                    color: theme.text?.primary
                  }}>
                    {day}
                  </Typography>
                  
                  {/* Work Hours */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {translations.workHours || 'Work Hours'}
                    </Typography>
                    {(formData.workHours[day] || []).map((slot, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                        <TextField
                          label="Start"
                          type="time"
                          value={slot.start}
                          onChange={(e) => handleWorkHoursChange(day, 'start', index, e.target.value)}
                          sx={{ width: '150px' }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ step: 300 }}
                        />
                        <TextField
                          label="End"
                          type="time"
                          value={slot.end}
                          onChange={(e) => handleWorkHoursChange(day, 'end', index, e.target.value)}
                          sx={{ width: '150px' }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ step: 300 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeTimeSlot(day, index, 'work')}
                          sx={{ color: theme.text?.secondary }}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => addTimeSlot(day, 'work')}
                      sx={{ mt: 1 }}
                    >
                      Add Work Hours
                    </Button>
                  </Box>

                  {/* Break Hours */}
                  <Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {translations.breakHours || 'Break Hours'}
                    </Typography>
                    {(formData.breakHours[day] || []).map((slot, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                        <TextField
                          label="Start"
                          type="time"
                          value={slot.start}
                          onChange={(e) => handleBreakHoursChange(day, 'start', index, e.target.value)}
                          sx={{ width: '150px' }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ step: 300 }}
                        />
                        <TextField
                          label="End"
                          type="time"
                          value={slot.end}
                          onChange={(e) => handleBreakHoursChange(day, 'end', index, e.target.value)}
                          sx={{ width: '150px' }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ step: 300 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeTimeSlot(day, index, 'break')}
                          sx={{ color: theme.text?.secondary }}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => addTimeSlot(day, 'break')}
                      sx={{ mt: 1 }}
                    >
                      Add Break Hours
                    </Button>
                  </Box>
                </Box>
              ))}
            </Grid>

            {/* Password */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ 
                mt: 2,
                mb: 2,
                color: theme.text?.primary,
                fontWeight: 500
              }}>
                {translations.accountInfo || 'Account Information'}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translations.password || 'Password'}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                helperText={translations.passwordHelperText || 'Password must be at least 8 characters long'}
                sx={textFieldStyle}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translations.confirmPassword || 'Confirm Password'}
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                sx={textFieldStyle}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={onClose}
            sx={{ 
              color: theme.text?.secondary,
              '&:hover': {
                backgroundColor: theme.mode === 'light'
                  ? 'rgba(0, 0, 0, 0.04)'
                  : 'rgba(255, 255, 255, 0.08)'
              }
            }}
          >
            {translations.cancel || 'Cancel'}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: '#845EC2',
              color: '#fff',
              '&:hover': {
                bgcolor: '#6B46C1',
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: '#fff' }} />
            ) : (
              translations.add || 'Add Teacher'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 