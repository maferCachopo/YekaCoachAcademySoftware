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
import moment from 'moment'; // Importante para manejar los nombres de los días

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

    const selectedPackage = packages.find(pkg => pkg.id === formData.package);
    if (!selectedPackage) return;

    if (scheduledClasses.length >= selectedPackage.totalClasses) {
      const emptyClassIndex = scheduledClasses.findIndex(cls => !cls.date || !cls.startTime || !cls.endTime);
      
      if (emptyClassIndex >= 0) {
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

  const handleAvailabilityValidation = (validationFn) => {
    setTeacherValidationFn(() => validationFn);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.surname || !formData.email || !formData.username || !formData.password) {
      setMessage({
        open: true,
        text: translations.fillRequiredFields || 'Please fill all required fields',
        severity: 'error'
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({
        open: true,
        text: translations.passwordsDoNotMatch || 'Passwords do not match',
        severity: 'error'
      });
      return false;
    }

    if (formData.password.length < 6) {
      setMessage({
        open: true,
        text: translations.passwordTooShort || 'Password must be at least 6 characters',
        severity: 'error'
      });
      return false;
    }

    if (formData.package) {
      const selectedPackage = packages.find(pkg => pkg.id === formData.package);
      if (selectedPackage) {
        const requiredClasses = selectedPackage.totalClasses;
        const validClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime);
        
        if (validClasses.length !== requiredClasses) {
          setMessage({
            open: true,
            text: translations.scheduleAllClassesError || `Please schedule exactly ${requiredClasses} classes for this package`,
            severity: 'error'
          });
          return false;
        }

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
      
      if (formData.package && response && response.userId) {
        let studentId = response.studentId;
        
        if (!studentId) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const studentsList = await studentAPI.getAllStudents();
            const studentFound = studentsList.find(s => s.user?.id === response.userId);
            if (studentFound) studentId = studentFound.id;
        }
          
        if (studentId) {
            const packageDetails = await packageAPI.getPackageById(formData.package);
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + packageDetails.durationMonths);
            
            await studentAPI.assignPackage(studentId, {
              packageId: formData.package,
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0]
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // --- MODIFICACIÓN PASO 3: ASIGNACIÓN DE PROFESOR CON HORARIO PERMANENTE ---
            if (selectedTeacher) {
              // Convertimos las clases programadas en un horario semanal recurrente
              // Tomamos la hora y el día de la semana de cada clase seleccionada
              const weeklySchedule = scheduledClasses
                .filter(cls => cls.date && cls.startTime)
                .map(cls => ({
                  day: moment(cls.date).format('dddd').toLowerCase(),
                  hour: parseInt(cls.startTime.split(':')[0])
                }));

              // Eliminamos duplicados por si acaso
              const uniqueWeeklySchedule = Array.from(new Set(weeklySchedule.map(s => JSON.stringify(s)))).map(s => JSON.parse(s));

              try {
                console.log('Assigning teacher with permanent schedule:', { studentId, teacherId: selectedTeacher, uniqueWeeklySchedule });
                await fetchWithAuth(`/teachers/${selectedTeacher}/students`, {
                  method: 'POST',
                  body: JSON.stringify({ 
                    studentId: studentId,
                    weeklySchedule: uniqueWeeklySchedule // Enviamos el horario recurrente
                  })
                });
              } catch (assignError) {
                console.error('Error assigning teacher:', assignError);
                setMessage({
                  open: true,
                  text: translations.teacherAssignmentFailed || 'Student created but teacher assignment failed',
                  severity: 'warning'
                });
              }
            }
            
            // Programar las clases físicas en el calendario
            if (scheduledClasses.length > 0) {
              const validClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime);
              if (validClasses.length > 0) {
                const classesWithTeacher = validClasses.map(cls => ({
                  ...cls,
                  teacherId: selectedTeacher || undefined
                }));
                await studentAPI.scheduleClasses(studentId, {
                  packageId: formData.package,
                  classes: classesWithTeacher
                });
              }
            }
        }
      }

      setMessage({
        open: true,
        text: translations.studentAddedSuccess || 'Student added successfully',
        severity: 'success'
      });

      // Resetear estados
      setFormData({
        name: '', surname: '', email: '', username: '', phone: '', city: '', country: '',
        zoomLink: '', password: '', confirmPassword: '', package: '', birthDate: '', allowDifferentTeacher: false
      });
      setScheduledClasses([]);
      setSelectedTeacher('');
      setTeacherSchedule(null);
      if (typeof refreshStudents === 'function') refreshStudents();
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

  const primaryButtonStyle = { background: '#845EC2', color: '#ffffff', '&:hover': { background: '#6B46C1' } };
  const secondaryButtonStyle = { color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#ffffff', borderColor: 'rgba(132, 94, 194, 0.5)', '&:hover': { borderColor: '#845EC2', backgroundColor: theme?.mode === 'light' ? 'rgba(132, 94, 194, 0.08)' : 'rgba(132, 94, 194, 0.15)' } };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 5, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)', overflow: 'visible', bgcolor: theme.mode === 'light' ? '#fff' : '#151521' } }}
    >
      <DialogTitle sx={{ pb: 2, borderBottom: theme?.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.12)', color: theme.text?.primary, px: 3, pt: 3, fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <AddIcon sx={{ color: '#4caf50' }} />
        {translations.addStudent || 'Add Student'}
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, pb: 4, overflowY: 'auto', backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Box sx={{ mb: 4 }}></Box>
        <Grid container spacing={3} sx={{ pt: 3 }}>
          <Grid item xs={12} sm={6}><TextField label={translations.firstName} name="name" value={formData.name} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.lastName} name="surname" value={formData.surname} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.birthDate} name="birthDate" type="date" value={formData.birthDate || ''} onChange={handleFormChange} fullWidth variant="outlined" InputLabelProps={{ shrink: true }} sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.email} name="email" type="email" value={formData.email} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.username} name="username" value={formData.username} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.password} name="password" type="password" value={formData.password} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.confirmPassword} name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.phone} name="phone" value={formData.phone} onChange={handleFormChange} fullWidth variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.city} name="city" value={formData.city} onChange={handleFormChange} fullWidth variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.country} name="country" value={formData.country} onChange={handleFormChange} fullWidth variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label={translations.package} name="package" value={formData.package} onChange={handleFormChange} fullWidth variant="outlined" sx={{...textFieldStyle(theme), mt: 0}}>
              <MenuItem value=""><em>{translations.noPackage}</em></MenuItem>
              {packages.map((pkg) => (<MenuItem key={pkg.id} value={pkg.id}>{pkg.name}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label={translations.teacher} value={selectedTeacher} onChange={handleTeacherChange} fullWidth variant="outlined" sx={{...textFieldStyle(theme), mt: 0}}>
              <MenuItem value=""><em>{translations.noTeacher}</em></MenuItem>
              {teachers.map((teacher) => (<MenuItem key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12}><TextField label={translations.zoomLink} name="zoomLink" value={formData.zoomLink || ''} onChange={handleFormChange} fullWidth variant="outlined" placeholder="https://zoom.us/j/123456789" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12}><FormControlLabel control={<Switch checked={formData.allowDifferentTeacher || false} onChange={(e) => setFormData(prev => ({ ...prev, allowDifferentTeacher: e.target.checked }))} color="primary" />} label={translations.allowDifferentTeacher} sx={{ mt: 1, color: theme.text?.primary }} /></Grid>
        </Grid>
        
        {selectedTeacher && (
          <Box sx={{ mt: 4, p: 3, bgcolor: theme.mode === 'light' ? 'rgba(0, 120, 220, 0.05)' : 'rgba(0, 120, 220, 0.15)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>{translations.teacherAvailability}</Typography>
            {loadingSchedule ? (<Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>) : teacherSchedule ? (
              <Box sx={{ height: '500px' }}><TeacherAvailabilityCalendar teacherSchedule={teacherSchedule} loading={loadingSchedule} onSlotSelect={handleSlotSelect} scheduledClasses={scheduledClasses} onAvailabilityValidation={handleAvailabilityValidation} /></Box>
            ) : (<Alert severity="info">{translations.selectTeacherFirst}</Alert>)}
          </Box>
        )}

        {formData.package && (
          <Box sx={{ mt: 4, p: 3, bgcolor: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.05)' : 'rgba(132, 94, 194, 0.15)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>{translations.scheduleClasses}</Typography>
            <ClassSchedulingForm scheduledClasses={scheduledClasses} setScheduledClasses={setScheduledClasses} packageId={formData.package} teacherId={selectedTeacher} teacherValidationFn={teacherValidationFn} />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, px: 3, borderTop: theme?.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.12)', gap: 2, backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Button onClick={onClose} variant="outlined" sx={{...secondaryButtonStyle, minWidth: 120, height: 42}}>{translations.cancel}</Button>
        <Button variant="contained" onClick={handleAddStudent} disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null} sx={{...primaryButtonStyle, minWidth: 120, height: 42}}>
          {loading ? translations.adding : translations.addStudent}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDialog;