import React, { useState, useEffect } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  TextField, Button, Grid, MenuItem, CircularProgress, FormControlLabel, Switch,
  Divider, Alert, Paper, Tabs, Tab
} from '@mui/material';
import { Add as AddIcon, Event as EventIcon, CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { authAPI, studentAPI, packageAPI, adminAPI } from '../../../utils/api';
import { textFieldStyle } from '../utils/styles';
import ClassSchedulingForm from './ClassSchedulingForm';
import TeacherAvailabilityCalendar from './TeacherAvailabilityCalendar';
import { fetchWithAuth } from '../../../utils/api';

const AddDialog = ({ 
  open, 
  onClose, 
  formData, 
  setFormData, 
  packages, 
  scheduledClasses,
  setScheduledClasses, 
  setMessage,
  refreshStudents
}) => {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [teacherValidationFn, setTeacherValidationFn] = useState(null);
  const { translations } = useLanguage();
  const { theme } = useTheme();

  // Fetch teachers when the dialog opens
  useEffect(() => {
    if (open) {
      fetchTeachers();
    }
  }, [open]);

  // Fetch teachers list
  const fetchTeachers = async () => {
    try {
      const response = await fetchWithAuth('/teachers');
      // Filter only active teachers
      const activeTeachers = response.filter(teacher => teacher.active);
      setTeachers(activeTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setMessage({
        open: true,
        text: translations.errorFetchingTeachers || 'Error fetching teachers',
        severity: 'error'
      });
    }
  };

  // Fetch teacher's schedule when selected
  const fetchTeacherSchedule = async (teacherId) => {
    if (!teacherId) {
      setTeacherSchedule(null);
      return;
    }

    setLoadingSchedule(true);
    try {
      const scheduleData = await fetchWithAuth(`/teachers/${teacherId}/schedule`);
      setTeacherSchedule(scheduleData);
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      setMessage({
        open: true,
        text: translations.errorFetchingSchedule || 'Error fetching teacher schedule',
        severity: 'warning'
      });
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Handle teacher selection change
  const handleTeacherChange = (e) => {
    const teacherId = e.target.value;
    setSelectedTeacher(teacherId);
    
    if (teacherId) {
      fetchTeacherSchedule(teacherId);
    } else {
      setTeacherSchedule(null);
    }
  };



  // Handle available slot selection from calendar
  const handleSlotSelect = (slot) => {
    if (!formData.package) {
      setMessage({
        open: true,
        text: translations.selectPackageFirst || 'Please select a package first',
        severity: 'warning'
      });
      return;
    }

    // Find the selected package
    const selectedPackage = packages.find(pkg => pkg.id === formData.package);
    if (!selectedPackage) return;

    // Check if we already have enough classes scheduled
    if (scheduledClasses.length >= selectedPackage.totalClasses) {
      // Find if there's an empty class we can replace
      const emptyClassIndex = scheduledClasses.findIndex(cls => !cls.date || !cls.startTime || !cls.endTime);
      
      if (emptyClassIndex >= 0) {
        // Replace the empty class
        const updatedClasses = [...scheduledClasses];
        updatedClasses[emptyClassIndex] = {
          ...updatedClasses[emptyClassIndex],
          date: slot.date,
          startTime: slot.start,
          endTime: slot.end,
          teacherId: selectedTeacher
        };
        setScheduledClasses(updatedClasses);
      } else {
        setMessage({
          open: true,
          text: translations.maxClassesReached || `Maximum number of classes (${selectedPackage.totalClasses}) already scheduled`,
          severity: 'warning'
        });
      }
    } else {
      // Add a new class
      const newClass = {
        id: `class-${scheduledClasses.length}`,
        date: slot.date,
        startTime: slot.start,
        endTime: slot.end,
        teacherId: selectedTeacher
      };
      
      setScheduledClasses([...scheduledClasses, newClass]);
    }
  };

  // Handle teacher availability validation function
  const handleAvailabilityValidation = (validationFn) => {
    setTeacherValidationFn(() => validationFn);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    // Check required fields
    if (!formData.name || !formData.surname || !formData.email || !formData.username || !formData.password) {
      setMessage({
        open: true,
        text: translations.fillRequiredFields || 'Please fill all required fields',
        severity: 'error'
      });
      return false;
    }

    // Check passwords match
    if (formData.password !== formData.confirmPassword) {
      setMessage({
        open: true,
        text: translations.passwordsDoNotMatch || 'Passwords do not match',
        severity: 'error'
      });
      return false;
    }

    // Check password strength (optional)
    if (formData.password.length < 6) {
      setMessage({
        open: true,
        text: translations.passwordTooShort || 'Password must be at least 6 characters',
        severity: 'error'
      });
      return false;
    }

    // Check if a package is selected and classes are scheduled correctly
    if (formData.package) {
      // Find the package in the packages array
      const selectedPackage = packages.find(pkg => pkg.id === formData.package);
      
      if (selectedPackage) {
        // Get the total classes required by the package
        const requiredClasses = selectedPackage.totalClasses;
        
        // Count valid scheduled classes (with date, start time, and end time)
        const validClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime);
        
        // Check if the number of valid scheduled classes matches the required number
        if (validClasses.length !== requiredClasses) {
          setMessage({
            open: true,
            text: translations.scheduleAllClassesError || `Please schedule exactly ${requiredClasses} classes for this package`,
            severity: 'error'
          });
          return false;
        }

        // If a teacher is selected, validate that all classes are within teacher availability
        if (selectedTeacher && teacherValidationFn) {
          for (let i = 0; i < validClasses.length; i++) {
            const cls = validClasses[i];
            const validation = teacherValidationFn(cls.date, cls.startTime, cls.endTime);
            if (!validation.valid) {
              setMessage({
                open: true,
                text: `Class ${i + 1}: ${validation.message}`,
                severity: 'error'
              });
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  const handleAddStudent = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Register student with auth API
      const userData = {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        name: formData.name,
        surname: formData.surname,
        birthDate: formData.birthDate || null,
        phone: formData.phone || '',
        city: formData.city || '',
        country: formData.country || '',
        zoomLink: formData.zoomLink || '',
        allowDifferentTeacher: formData.allowDifferentTeacher || false
      };

      const response = await authAPI.register(userData);
      
      // If a package is selected, assign it
      if (formData.package && response && response.userId) {
        let studentId;
        
        try {
          // Check if the response contains the studentId directly
          if (response.studentId) {
            studentId = response.studentId;
          } else {
            // Fall back to the previous approach if studentId is not in the response
            // Find the student ID by user ID - add delay to ensure student is created in DB
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Fetch ALL students to find the newly created one
            const students = await studentAPI.getAllStudents();
            const student = students.find(s => s.user?.id === response.userId);
            
            if (student) {
              studentId = student.id;
            }
          }
          
          if (studentId) {
            // First assign package
            // Get package details to get the correct duration
            const packageDetails = await packageAPI.getPackageById(formData.package);
            
            // Calculate end date based on the package's durationMonths
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + packageDetails.durationMonths);
            
            const packageData = {
              packageId: formData.package,
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0]
            };
            
            const packageResponse = await studentAPI.assignPackage(studentId, packageData);
            
            // Wait for package assignment to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Assign student to teacher if selected
            if (selectedTeacher) {
              try {
                console.log('Assigning student to teacher:', { studentId, teacherId: selectedTeacher });
                const assignResponse = await fetchWithAuth(`/teachers/${selectedTeacher}/students`, {
                  method: 'POST',
                  body: JSON.stringify({ studentId: studentId })
                });
                console.log('Teacher assignment response:', assignResponse);
              } catch (assignError) {
                console.error('Error assigning teacher:', assignError);
                setMessage({
                  open: true,
                  text: translations.teacherAssignmentFailed || 'Student created but teacher assignment failed',
                  severity: 'warning'
                });
              }
            }
            
            // Then schedule classes if any
            if (scheduledClasses.length > 0) {
              // Validate class data
              const validClasses = scheduledClasses.filter(cls => {
                const isValid = cls.date && cls.startTime && cls.endTime;
              
                return isValid;
              });
              
              if (validClasses.length > 0) {
                // Add teacher ID to classes if a teacher is selected
                const classesWithTeacher = validClasses.map(cls => {
                  return {
                    ...cls,
                    teacherId: selectedTeacher || undefined
                  };
                });
                
                const classesData = {
                  packageId: formData.package,
                  classes: classesWithTeacher
                };
                
                const classesResponse = await studentAPI.scheduleClasses(studentId, classesData);
              } else {
                console.log('DEBUG - No valid classes to schedule after filtering');
              }
            } else {
              console.log('DEBUG - No classes to schedule. Remaining classes will be 0.');
            }
          } else {
            console.error('DEBUG - Student not found after creation');
            setMessage({
              open: true,
              text: 'Student created but could not assign package - student not found',
              severity: 'warning'
            });
          }
        } catch (packageError) {
          console.error('Error assigning package:', packageError);
          // Continue without throwing - we've created the student but failed to assign package
          setMessage({
            open: true,
            text: translations.studentCreatedPackageFailed || 'Student created but package assignment failed',
            severity: 'warning'
          });
        }
      }

      setMessage({
        open: true,
        text: translations.studentAddedSuccess || 'Student added successfully',
        severity: 'success'
      });

      // Reset form and close dialog
      setFormData({
        name: '',
        surname: '',
        email: '',
        username: '',
        phone: '',
        city: '',
        country: '',
        zoomLink: '',
        password: '',
        confirmPassword: '',
        package: '',
        birthDate: '',
        allowDifferentTeacher: false
      });
      
      setScheduledClasses([]);
      setSelectedTeacher('');
      setTeacherSchedule(null);
      
      // Refresh student list
      if (typeof refreshStudents === 'function') {
        refreshStudents();
      }
      
      onClose();
    } catch (error) {
      console.error('Error adding student:', error);
      setMessage({
        open: true,
        text: error.message || translations.errorAddingStudent || 'Error adding student',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const primaryButtonStyle = {
    background: '#845EC2',
    color: '#ffffff',
    '&:hover': {
      background: '#6B46C1',
    },
  };

  const secondaryButtonStyle = {
    color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#ffffff',
    borderColor: 'rgba(132, 94, 194, 0.5)',
    '&:hover': {
      borderColor: '#845EC2',
      backgroundColor: theme?.mode === 'light'
        ? 'rgba(132, 94, 194, 0.08)'
        : 'rgba(132, 94, 194, 0.15)',
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
          borderRadius: 5,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
          overflow: 'visible',
          bgcolor: theme.mode === 'light' ? '#fff' : '#151521',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 2,
        borderBottom: theme?.mode === 'light' 
          ? '1px solid rgba(0, 0, 0, 0.12)'
          : '1px solid rgba(255, 255, 255, 0.12)',
        color: theme.text?.primary,
        px: 3,
        pt: 3,
        fontSize: '1.5rem',
        fontWeight: 600,
        display: 'flex', 
        alignItems: 'center',
        gap: 1,
        backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d'
      }}>
        <AddIcon sx={{ color: '#4caf50' }} />
        {translations.addStudent || 'Add Student'}
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, pb: 4, overflowY: 'auto', backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Box sx={{ mb: 4 }}></Box>
        <Grid container spacing={3} sx={{ pt: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.firstName || 'First Name'}
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              fullWidth
              required
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.lastName || 'Last Name'}
              name="surname"
              value={formData.surname}
              onChange={handleFormChange}
              fullWidth
              required
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.birthDate || 'Birth Date'}
              name="birthDate"
              type="date"
              value={formData.birthDate || ''}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.email || 'Email'}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleFormChange}
              fullWidth
              required
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.username || 'Username'}
              name="username"
              value={formData.username}
              onChange={handleFormChange}
              fullWidth
              required
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.password || 'Password'}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleFormChange}
              fullWidth
              required
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.confirmPassword || 'Confirm Password'}
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleFormChange}
              fullWidth
              required
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.phone || 'Phone'}
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.city || 'City'}
              name="city"
              value={formData.city}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.country || 'Country'}
              name="country"
              value={formData.country}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label={translations.package || 'Package'}
              name="package"
              value={formData.package}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            >
              <MenuItem value="">
                <em>{translations.noPackage || 'No Package'}</em>
              </MenuItem>
              {packages.map((pkg) => (
                <MenuItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label={translations.teacher || 'Teacher'}
              value={selectedTeacher}
              onChange={handleTeacherChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            >
              <MenuItem value="">
                <em>{translations.noTeacher || 'No Teacher'}</em>
              </MenuItem>
              {teachers.map((teacher) => (
                <MenuItem key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label={translations.zoomLink || 'Zoom Meeting Link'}
              name="zoomLink"
              value={formData.zoomLink || ''}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              margin="normal"
              placeholder="https://zoom.us/j/123456789"
              helperText={translations.zoomLinkHelp || "Enter the student's permanent Zoom meeting link"}
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.allowDifferentTeacher || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowDifferentTeacher: e.target.checked }))}
                  color="primary"
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
              label={translations.allowDifferentTeacher || "Allow rescheduling with a different teacher"}
              sx={{ mt: 1, color: theme.text?.primary }}
            />
          </Grid>
        </Grid>
        
        {selectedTeacher && (
          <Box sx={{ 
            mt: 4, 
            p: 3, 
            bgcolor: theme.mode === 'light' 
              ? 'rgba(0, 120, 220, 0.05)' 
              : 'rgba(0, 120, 220, 0.15)', 
            borderRadius: 3 
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>
              {translations.teacherAvailability || 'Teacher Availability'}
            </Typography>
            
            {loadingSchedule ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : teacherSchedule ? (
              <Box sx={{ height: '500px' }}>
                <TeacherAvailabilityCalendar 
                  teacherSchedule={teacherSchedule}
                  loading={loadingSchedule}
                  onSlotSelect={handleSlotSelect}
                  scheduledClasses={scheduledClasses}
                  onAvailabilityValidation={handleAvailabilityValidation}
                />
              </Box>
            ) : (
              <Alert severity="info">
                {translations.selectTeacherFirst || 'Select a teacher to see their availability'}
              </Alert>
            )}
          </Box>
        )}

        {formData.package && (
          <Box sx={{ 
            mt: 4, 
            p: 3, 
            bgcolor: theme.mode === 'light' 
              ? 'rgba(132, 94, 194, 0.05)' 
              : 'rgba(132, 94, 194, 0.15)', 
            borderRadius: 3 
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>
              {translations.scheduleClasses || 'Schedule Classes'}
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 2, color: theme.text?.secondary }}>
              {translations.remainingClassesInfo || 'Note: Remaining classes will be set based on the number of classes you schedule. If you don\'t schedule any classes now, remaining classes will be 0.'}
            </Typography>
            
            <ClassSchedulingForm
              scheduledClasses={scheduledClasses}
              setScheduledClasses={setScheduledClasses}
              packageId={formData.package}
              teacherId={selectedTeacher}
              teacherValidationFn={teacherValidationFn}
            />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3,
        px: 3,
        borderTop: theme?.mode === 'light' 
          ? '1px solid rgba(0, 0, 0, 0.12)'
          : '1px solid rgba(255, 255, 255, 0.12)',
        gap: 2,
        backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d'
      }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{
            ...secondaryButtonStyle,
            minWidth: 120,
            height: 42,
          }}
        >
          {translations.cancel || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleAddStudent}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{
            ...primaryButtonStyle,
            minWidth: 120,
            height: 42,
          }}
        >
          {loading ? (translations.adding || 'Adding...') : (translations.addStudent || 'Add Student')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDialog; 