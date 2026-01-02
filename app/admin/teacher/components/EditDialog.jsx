'use client';
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, IconButton, Switch,
  FormControlLabel, Typography, Grid, CircularProgress,
  Tabs, Tab, Chip
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { fetchWithAuth } from '@/app/utils/api';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function EditDialog({ open, onClose, teacher, setMessage, refreshTeachers }) {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    workHours: {},
    breakHours: {},
    specialties: [],
    maxStudentsPerDay: 8,
    isCoordinator: false,
    active: true,
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  });

  useEffect(() => {
    if (teacher) {
      setFormData({
        firstName: teacher.firstName || '',
        lastName: teacher.lastName || '',
        email: teacher.user?.email || '',
        phone: teacher.phone || '',
        workHours: typeof teacher.workHours === 'string' 
          ? JSON.parse(teacher.workHours) 
          : teacher.workHours || {},
        breakHours: typeof teacher.breakHours === 'string' 
          ? JSON.parse(teacher.breakHours) 
          : teacher.breakHours || {},
        specialties: teacher.specialties || [],
        maxStudentsPerDay: teacher.maxStudentsPerDay || 8,
        isCoordinator: teacher.isCoordinator || false,
        active: teacher.active,
        workingDays: teacher.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      });
    }
  }, [teacher]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  const addTimeSlot = (day) => {
    setFormData(prev => {
      const workHours = { ...prev.workHours };
      if (!workHours[day]) {
        workHours[day] = [];
      }
      workHours[day].push({ start: '', end: '' });
      return { ...prev, workHours };
    });
  };

  const removeTimeSlot = (day, index) => {
    setFormData(prev => {
      const workHours = { ...prev.workHours };
      workHours[day].splice(index, 1);
      if (workHours[day].length === 0) {
        delete workHours[day];
      }
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

  const addBreakTimeSlot = (day) => {
    setFormData(prev => {
      const breakHours = { ...prev.breakHours };
      if (!breakHours[day]) {
        breakHours[day] = [];
      }
      breakHours[day].push({ start: '', end: '' });
      return { ...prev, breakHours };
    });
  };

  const removeBreakTimeSlot = (day, index) => {
    setFormData(prev => {
      const breakHours = { ...prev.breakHours };
      breakHours[day].splice(index, 1);
      if (breakHours[day].length === 0) {
        delete breakHours[day];
      }
      return { ...prev, breakHours };
    });
  };

  const handleWorkingDaysChange = (day) => {
    setFormData(prev => {
      const workingDays = [...prev.workingDays];
      if (workingDays.includes(day)) {
        // Remove the day
        const index = workingDays.indexOf(day);
        workingDays.splice(index, 1);
      } else {
        // Add the day
        workingDays.push(day);
      }
      return { ...prev, workingDays };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate required fields
    const requiredFields = ['firstName', 'lastName'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setMessage({
        open: true,
        text: `Please fill in all required fields: ${missingFields.join(', ')}`,
        severity: 'error'
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetchWithAuth(`/teachers/${teacher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          workHours: formData.workHours,
          breakHours: formData.breakHours,
          specialties: formData.specialties,
          maxStudentsPerDay: formData.maxStudentsPerDay,
          isCoordinator: formData.isCoordinator,
          active: formData.active,
          workingDays: formData.workingDays
        }),
      });

      setMessage({
        open: true,
        text: translations.teacherUpdateSuccess || 'Teacher updated successfully',
        severity: 'success'
      });
      
      refreshTeachers();
      onClose();
    } catch (error) {
      console.error('Error updating teacher:', error);
      setMessage({
        open: true,
        text: error.message || translations.teacherUpdateError || 'Error updating teacher',
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
          {translations.editTeacher || 'Edit Teacher'}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: theme.text?.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              color: theme.text?.secondary,
              '&.Mui-selected': {
                color: '#845EC2',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#845EC2',
            },
          }}
        >
          <Tab label={translations.basicInfo || "Basic Info"} />
          <Tab label={translations.schedule || "Schedule"} />
          <Tab label={translations.workingDays || "Working Days"} />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ 
          borderColor: theme.mode === 'light' 
            ? 'rgba(0, 0, 0, 0.12)' 
            : 'rgba(255, 255, 255, 0.12)',
        }}>
          {activeTab === 0 && (
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
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={translations.email || 'Email'}
                  value={formData.email}
                  disabled
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

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active}
                      onChange={handleChange}
                      name="active"
                      color="primary"
                    />
                  }
                  label={translations.active || "Active"}
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
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid container spacing={2}>
              {/* Work Hours */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ 
                  mb: 2,
                  color: theme.text?.primary,
                  fontWeight: 600
                }}>
                  {translations.workHours || 'Work Hours'}
                </Typography>
                {DAYS_OF_WEEK.map((day) => (
                  <Box key={day} sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ 
                      mb: 1, 
                      textTransform: 'capitalize',
                      color: theme.text?.primary,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      {day}
                      {(day === 'saturday' || day === 'sunday') && (
                        <Chip
                          size="small"
                          label="Holiday"
                          sx={{
                            bgcolor: theme.mode === 'light' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.2)',
                            color: '#d32f2f',
                            fontWeight: 500
                          }}
                        />
                      )}
                    </Typography>
                    {(formData.workHours[day] || [{ start: '', end: '' }]).map((slot, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          label="Start Time"
                          type="time"
                          value={slot.start}
                          onChange={(e) => handleWorkHoursChange(day, 'start', index, e.target.value)}
                          sx={{ width: '150px' }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ step: 300 }}
                          disabled={!formData.workingDays.includes(day)}
                        />
                        <TextField
                          label="End Time"
                          type="time"
                          value={slot.end}
                          onChange={(e) => handleWorkHoursChange(day, 'end', index, e.target.value)}
                          sx={{ width: '150px' }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ step: 300 }}
                          disabled={!formData.workingDays.includes(day)}
                        />
                        <Button
                          size="small"
                          onClick={() => removeTimeSlot(day, index)}
                          disabled={index === 0 && (!formData.workHours[day] || formData.workHours[day].length === 1) || !formData.workingDays.includes(day)}
                        >
                          Remove
                        </Button>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      onClick={() => addTimeSlot(day)}
                      disabled={!formData.workingDays.includes(day)}
                      sx={{
                        color: '#845EC2',
                        '&:hover': {
                          bgcolor: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.1)' : 'rgba(132, 94, 194, 0.2)',
                        }
                      }}
                    >
                      Add Time Slot
                    </Button>
                  </Box>
                ))}
              </Grid>

              {/* Break Hours */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ 
                  mb: 2,
                  mt: 2,
                  color: theme.text?.primary,
                  fontWeight: 600
                }}>
                  {translations.breakHours || 'Break Hours'}
                </Typography>
                {DAYS_OF_WEEK.map((day) => (
                  <Box key={day} sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ 
                      mb: 1, 
                      textTransform: 'capitalize',
                      color: theme.text?.primary,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      {day}
                      {(day === 'saturday' || day === 'sunday') && (
                        <Chip
                          size="small"
                          label="Holiday"
                          sx={{
                            bgcolor: theme.mode === 'light' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.2)',
                            color: '#d32f2f',
                            fontWeight: 500
                          }}
                        />
                      )}
                    </Typography>
                    {(formData.breakHours[day] || [{ start: '', end: '' }]).map((slot, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          label="Start Time"
                          type="time"
                          value={slot.start}
                          onChange={(e) => handleBreakHoursChange(day, 'start', index, e.target.value)}
                          sx={{ width: '150px' }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ step: 300 }}
                          disabled={!formData.workingDays.includes(day)}
                        />
                        <TextField
                          label="End Time"
                          type="time"
                          value={slot.end}
                          onChange={(e) => handleBreakHoursChange(day, 'end', index, e.target.value)}
                          sx={{ width: '150px' }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ step: 300 }}
                          disabled={!formData.workingDays.includes(day)}
                        />
                        <Button
                          size="small"
                          onClick={() => removeBreakTimeSlot(day, index)}
                          disabled={index === 0 && (!formData.breakHours[day] || formData.breakHours[day].length === 1) || !formData.workingDays.includes(day)}
                        >
                          Remove
                        </Button>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      onClick={() => addBreakTimeSlot(day)}
                      disabled={!formData.workingDays.includes(day)}
                      sx={{
                        color: '#845EC2',
                        '&:hover': {
                          bgcolor: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.1)' : 'rgba(132, 94, 194, 0.2)',
                        }
                      }}
                    >
                      Add Break Time
                    </Button>
                  </Box>
                ))}
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ 
                  mb: 2,
                  fontWeight: 600,
                  color: '#845EC2'
                }}>
                  {translations.selectWorkingDays || 'Select Working Days'}
                </Typography>
                <Typography variant="body2" sx={{ 
                  mb: 3,
                  color: theme.text?.secondary
                }}>
                  {translations.workingDaysDescription || 'Choose which days this teacher will be available to work. Work hours and break hours will only apply to selected days.'}
                </Typography>
                
                <Grid container spacing={2}>
                  {DAYS_OF_WEEK.map((day) => (
                    <Grid item xs={12} sm={6} md={4} key={day}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.workingDays.includes(day)}
                            onChange={() => handleWorkingDaysChange(day)}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#845EC2',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#845EC2',
                              },
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ 
                            textTransform: 'capitalize',
                            fontWeight: formData.workingDays.includes(day) ? 600 : 400,
                            color: formData.workingDays.includes(day) ? '#845EC2' : theme.text?.primary
                          }}>
                            {day}
                          </Typography>
                        }
                      />
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ 
                  mt: 3, 
                  p: 2, 
                  borderRadius: 1,
                  backgroundColor: theme.mode === 'light'
                    ? 'rgba(132, 94, 194, 0.1)'
                    : 'rgba(132, 94, 194, 0.2)',
                  border: `1px solid ${theme.mode === 'light' ? 'rgba(132, 94, 194, 0.3)' : 'rgba(132, 94, 194, 0.4)'}`
                }}>
                  <Typography variant="body2" sx={{ 
                    color: theme.text?.primary,
                    fontWeight: 500
                  }}>
                    {translations.selectedDays || 'Selected Days'}: {' '}
                    {formData.workingDays.length === 0 ? (
                      <span style={{ color: '#f44336' }}>
                        {translations.noDaysSelected || 'No days selected'}
                      </span>
                    ) : (
                      <span style={{ color: '#845EC2', textTransform: 'capitalize' }}>
                        {formData.workingDays.join(', ')}
                      </span>
                    )}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
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
              translations.save || 'Save Changes'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 