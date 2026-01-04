'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, Grid,
  Paper, Tabs, Tab, Divider, TextField,
  FormControl, InputLabel, Select, MenuItem,
  Chip, Alert, CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { fetchWithAuth } from '@/app/utils/api';
import { format, parseISO } from 'date-fns';
// Importamos la matriz que modificamos anteriormente
import TeacherAvailabilityCalendar from '../../students/components/TeacherAvailabilityCalendar';

const ScheduleDialog = ({ open, onClose, teacher, refreshTeachers }) => {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [classes, setClasses] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);

  // --- NUEVO ESTADO PARA LA MATRIZ ---
  const [workHours, setWorkHours] = useState({});

  useEffect(() => {
    if (open && teacher) {
      fetchTeacherData();
      fetchAvailableStudents();
      // Inicializar las horas de trabajo desde el objeto teacher
      setWorkHours(teacher.workHours || {});
    }
  }, [open, teacher]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      setError(null);
      const studentsResponse = await fetchWithAuth(`/teachers/${teacher.id}/students`);
      setStudents(studentsResponse);
      const activitiesResponse = await fetchWithAuth(`/teachers/${teacher.id}/activities`);
      setActivities(activitiesResponse.activities);
      setClasses(activitiesResponse.classes);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      setError('Failed to fetch teacher data');
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE TOGGLE PARA LA MATRIZ ---
  const handleMatrixClick = (slotData) => {
    const { day, start, end } = slotData;

    setWorkHours(prev => {
      const currentDaySlots = prev[day] || [];
      const exists = currentDaySlots.find(s => s.start === start);

      let newDaySlots;
      if (exists) {
        // Si ya existe el bloque de esa hora, lo removemos
        newDaySlots = currentDaySlots.filter(s => s.start !== start);
      } else {
        // Si no existe, añadimos el bloque de 1 hora
        newDaySlots = [...currentDaySlots, { start, end }];
      }

      return {
        ...prev,
        [day]: newDaySlots
      };
    });
  };

  // --- GUARDAR DISPONIBILIDAD EN EL BACKEND ---
  const handleSaveAvailability = async () => {
    try {
      setSavingAvailability(true);
      setError(null);
      
      // Actualizamos el profesor en la base de datos
      await fetchWithAuth(`/teachers/${teacher.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          workHours: workHours // Enviamos el nuevo objeto de horas
        })
      });

      setSuccess('Disponibilidad actualizada correctamente');
      if (refreshTeachers) refreshTeachers();
    } catch (err) {
      setError('Error al guardar la disponibilidad: ' + err.message);
    } finally {
      setSavingAvailability(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const response = await fetchWithAuth('/students');
      setAvailableStudents(response);
    } catch (error) {
      console.error('Error fetching available students:', error);
    }
  };

  const handleAssignStudent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth(`/teachers/${teacher.id}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentId: selectedStudent })
      });
      setSuccess('Student assigned successfully');
      fetchTeacherData();
      setSelectedStudent('');
    } catch (error) {
      setError(`Failed to assign student: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      setLoading(true);
      await fetchWithAuth(`/teachers/${teacher.id}/students/${studentId}`, { method: 'DELETE' });
      setSuccess('Student removed successfully');
      fetchTeacherData();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHardRemoveStudent = async (studentId) => {
    try {
      setLoading(true);
      await fetchWithAuth(`/teachers/${teacher.id}/students/${studentId}/hard`, { method: 'DELETE' });
      setSuccess('Student completely removed');
      fetchTeacherData();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async () => {
    try {
      setLoading(true);
      await fetchWithAuth(`/teachers/${teacher.id}/activities`, { method: 'POST', body: JSON.stringify(activityForm) });
      setSuccess('Activity created successfully');
      fetchTeacherData();
      setActivityForm({ title: '', description: '', date: null, startTime: null, endTime: null, type: 'other', deadline: null });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      setLoading(true);
      await fetchWithAuth(`/teachers/${teacher.id}/activities/${activityId}`, { method: 'DELETE' });
      setSuccess('Activity deleted successfully');
      fetchTeacherData();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const [selectedStudent, setSelectedStudent] = useState('');
  const [activityForm, setActivityForm] = useState({
    title: '', description: '', date: null, startTime: null, endTime: null, type: 'other', deadline: null
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: theme?.dialog?.background,
          backgroundImage: 'none',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="h6" component="div" sx={{ color: theme?.text?.primary }}>
          {translations.teacherSchedule || 'Teacher Schedule'}: {teacher?.firstName} {teacher?.lastName}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: theme?.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)'
          }}
        >
          <Tab label="Horas de Trabajo (Matriz)" />
          <Tab label={translations.students || "Students"} />
          <Tab label={translations.activities || "Activities"} />
          <Tab label={translations.schedule || "Schedule"} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ m: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* --- NUEVA PESTAÑA: DISPONIBILIDAD SEMANAL --- */}
            {activeTab === 0 && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">Configuración de Disponibilidad</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Haz clic en los cuadros para definir en qué bloques de 1 hora trabaja el profesor.
                    </Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={savingAvailability ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSaveAvailability}
                    disabled={savingAvailability}
                  >
                    Guardar Cambios
                  </Button>
                </Box>
                
                <Divider sx={{ mb: 3 }} />

                <TeacherAvailabilityCalendar 
                  teacherSchedule={{
                    ...teacher,
                    workHours: workHours, // Usamos el estado local que estamos editando
                    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                  }}
                  loading={false}
                  onSlotSelect={handleMatrixClick} // Al hacer clic, disparamos el toggle
                  scheduledClasses={[]} // No necesitamos filtrar por clases aquí
                />
              </Box>
            )}

            {/* Students Tab */}
            {activeTab === 1 && (
              <Box sx={{ p: 3 }}>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs>
                      <FormControl fullWidth size="small">
                        <InputLabel>Select Student</InputLabel>
                        <Select
                          value={selectedStudent}
                          onChange={(e) => setSelectedStudent(e.target.value)}
                          label="Select Student"
                        >
                          {availableStudents.map((student) => (
                            <MenuItem key={student.id} value={student.id}>{student.name} {student.surname}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item>
                      <Button variant="contained" onClick={handleAssignStudent} disabled={!selectedStudent} startIcon={<AddIcon />}>
                        {translations.assign || "Assign"}
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ mb: 2 }}>{translations.assignedStudents || "Assigned Students"}</Typography>
                <Grid container spacing={2}>
                  {students.map((student) => (
                    <Grid item xs={12} sm={6} md={4} key={student.id}>
                      <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="body2">{student.name} {student.surname}</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => handleRemoveStudent(student.id)} color="error"><CloseIcon fontSize="small" /></IconButton>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Activities Tab */}
            {activeTab === 2 && (
              <Box sx={{ p: 3 }}>
                {/* Formulario de actividades existente... */}
                <Typography variant="h6" sx={{ mb: 3 }}>{translations.createActivity || "Create Activity"}</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}><TextField fullWidth label={translations.title || "Title"} value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} /></Grid>
                  <Grid item xs={12}><TextField fullWidth multiline rows={3} label={translations.description || "Description"} value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}><LocalizationProvider dateAdapter={AdapterDateFns}><DatePicker label={translations.date || "Date"} value={activityForm.date} onChange={(date) => setActivityForm({ ...activityForm, date })} renderInput={(params) => <TextField {...params} fullWidth />} /></LocalizationProvider></Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>{translations.type || "Type"}</InputLabel>
                      <Select value={activityForm.type} onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })} label={translations.type || "Type"}>
                        <MenuItem value="class">Class</MenuItem><MenuItem value="meeting">Meeting</MenuItem><MenuItem value="preparation">Preparation</MenuItem><MenuItem value="other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}><LocalizationProvider dateAdapter={AdapterDateFns}><TimePicker label={translations.startTime || "Start Time"} value={activityForm.startTime} onChange={(time) => setActivityForm({ ...activityForm, startTime: time })} renderInput={(params) => <TextField {...params} fullWidth />} /></LocalizationProvider></Grid>
                  <Grid item xs={12} sm={6}><LocalizationProvider dateAdapter={AdapterDateFns}><TimePicker label={translations.endTime || "End Time"} value={activityForm.endTime} onChange={(time) => setActivityForm({ ...activityForm, endTime: time })} renderInput={(params) => <TextField {...params} fullWidth />} /></LocalizationProvider></Grid>
                  <Grid item xs={12}><Button variant="contained" onClick={handleCreateActivity} disabled={!activityForm.title || !activityForm.date || !activityForm.startTime || !activityForm.endTime} startIcon={<AddIcon />} fullWidth>{translations.createActivity || "Create Activity"}</Button></Grid>
                </Grid>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" sx={{ mb: 2 }}>{translations.activities || "Activities"}</Typography>
                <Grid container spacing={2}>
                  {activities.map((activity) => (
                    <Grid item xs={12} key={activity.id}>
                      <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="subtitle1">{activity.title}</Typography>
                          <Typography variant="body2" color="textSecondary">{format(parseISO(activity.date), 'PP')} • {activity.startTime}-{activity.endTime}</Typography>
                          <Chip size="small" label={activity.type} sx={{ mt: 1 }} color="primary" />
                        </Box>
                        <IconButton size="small" onClick={() => handleDeleteActivity(activity.id)} color="error"><CloseIcon fontSize="small" /></IconButton>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Schedule Tab */}
            {activeTab === 3 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>{translations.upcomingSchedule || "Upcoming Schedule"}</Typography>
                {[...activities, ...classes].sort((a, b) => new Date(a.date) - new Date(b.date)).map((item) => (
                  <Paper key={`${item.type || 'class'}-${item.id}`} elevation={1} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {item.type ? <EventIcon sx={{ mr: 1 }} /> : <TimeIcon sx={{ mr: 1 }} />}
                      <Typography variant="subtitle1">{item.title}</Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">{format(parseISO(item.date), 'PP')} • {item.startTime}-{item.endTime}</Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
        <Button onClick={onClose} color="inherit">{translations.close || "Close"}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleDialog;