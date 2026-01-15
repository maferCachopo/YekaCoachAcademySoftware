'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, IconButton, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Snackbar, Alert, Stack, Tooltip
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  PushPin as PinIcon
} from '@mui/icons-material';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTheme } from '@/app/contexts/ThemeContext';
import { startOfWeek, addDays, format } from 'date-fns';
import { adminAPI, teacherAPI } from '@/app/utils/api';
import ThemeTransition from '@/app/components/ThemeTransition';
import ThemeToggle from '@/app/components/ThemeToggle';
import LanguageToggle from '@/app/components/LanguageToggle';

// Configuración Fija de la Matriz (Días y Horas)
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 a 22:00

export default function TeacherSchedule() {
  const { theme } = useTheme();
  const { translations } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [allTeachers, setAllTeachers] = useState([]);
  const [currentTeacherIndex, setCurrentTeacherIndex] = useState(0);
  const [teacherData, setTeacherData] = useState(null);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [refreshTick, setRefreshTick] = useState(0);

  // Usamos la semana actual como referencia para traer las clases actuales del calendario
  const referenceWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);

  // 1. Cargar lista de profesores activos
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const teachers = await adminAPI.getAllTeachers();
        const activeTeachers = teachers.filter(t => t.active);
        setAllTeachers(activeTeachers);
        if (activeTeachers.length > 0) setCurrentTeacherIndex(0);
      } catch (error) {
        console.error('Error fetching teachers:', error);
      }
    };
    fetchTeachers();
  }, []);

  // 2. Cargar datos del profesor (Horario base + Alumnos Asignados + Clases Semanales)
  useEffect(() => {
    const fetchScheduleData = async () => {
      if (allTeachers.length === 0) return;
      
      try {
        setLoading(true);
        const currentTeacher = allTeachers[currentTeacherIndex];
        
        // Consultamos el rango de la semana actual para las clases puntuales
        const startDate = format(referenceWeekStart, 'yyyy-MM-dd');
        const endDate = format(addDays(referenceWeekStart, 6), 'yyyy-MM-dd');
        
        const schedule = await teacherAPI.getSchedule(currentTeacher.id, { startDate, endDate });
        setTeacherData(schedule);
      } catch (error) {
        console.error('Error fetching schedule:', error);
        setMessage({ open: true, text: 'Error al cargar cronograma', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchScheduleData();
  }, [allTeachers, currentTeacherIndex, refreshTick, referenceWeekStart]);

  // Lógica de visualización de la Matriz
  const getSlotStatus = (dayName, hour) => {
    if (!teacherData) return { type: 'empty' };

    // --- 1. BUSCAR ASIGNACIÓN PERMANENTE (Fixed Slots del Estudiante) ---
    // Buscamos si algún estudiante asignado tiene este día/hora en su 'weeklySchedule'
     const permanentStudent = teacherData.assignedStudents?.find(student => 
      student.fixedSchedule?.some(slot => 
        slot.day.toLowerCase() === dayName.toLowerCase() && 
        parseInt(slot.hour) === hour
      )
    );

    if (permanentStudent) {
      return { 
         type: 'fixed', 
        label: `Asignación Fija: ${permanentStudent.fullName}`, 
        data: { name: permanentStudent.fullName }  
      };
    }

    // --- 2. BUSCAR CLASE PROGRAMADA (Puntual de esta semana) ---
    const classAt = teacherData.classes?.find(c => {
        const dayOfClass = format(new Date(c.date + 'T00:00:00'), 'EEEE').toLowerCase();
        return dayOfClass === dayName && parseInt(c.startTime.split(':')[0]) === hour;
    });
    if (classAt) return { type: 'class', label: `Clase Programada: ${classAt.studentName}`, data: classAt };

    // --- 3. HORARIO LABORAL Y DESCANSOS DEL PROFESOR ---
    const workHours = teacherData.workHours?.[dayName] || [];
    const breakHours = teacherData.breakHours?.[dayName] || [];
    const workingDays = teacherData.workingDays || [];

    if (!workingDays.includes(dayName)) return { type: 'non-working', label: 'Día no laboral' };

    const isInWork = workHours.some(w => hour >= parseInt(w.start.split(':')[0]) && hour < parseInt(w.end.split(':')[0]));
    const isInBreak = breakHours.some(b => hour >= parseInt(b.start.split(':')[0]) && hour < parseInt(b.end.split(':')[0]));

    if (isInBreak) return { type: 'break', label: 'Descanso (Break)' };
    if (isInWork) return { type: 'available', label: 'Disponible para clases' };

    return { type: 'non-working', label: 'Fuera de jornada' };
  };

  const currentTeacher = allTeachers[currentTeacherIndex];

  return (
    <ThemeTransition component={Box} sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Cronograma Maestro de Profesores
        </Typography>
        <Stack direction="row" spacing={1}>
          <ThemeToggle />
          <LanguageToggle />
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />} 
            onClick={() => setRefreshTick(t => t + 1)} 
            sx={{ bgcolor: '#845EC2', '&:hover': { bgcolor: '#6b46c1' } }}
          >
            {translations.refresh || 'Actualizar'}
          </Button>
        </Stack>
      </Box>

      {/* Selector de Profesor */}
      <Paper sx={{ p: 3, mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <IconButton onClick={() => setCurrentTeacherIndex(prev => Math.max(0, prev - 1))} disabled={currentTeacherIndex === 0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <ChevronLeftIcon />
        </IconButton>
        
        <Box sx={{ textAlign: 'center', minWidth: 250 }}>
          <Typography variant="h5" fontWeight="900" color="primary">
            {currentTeacher ? `${currentTeacher.firstName} ${currentTeacher.lastName}` : '---'}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {currentTeacher?.isCoordinator ? 'Coordinador Académico' : 'Profesor'}
          </Typography>
        </Box>

        <IconButton onClick={() => setCurrentTeacherIndex(prev => Math.min(allTeachers.length - 1, prev + 1))} disabled={currentTeacherIndex === allTeachers.length - 1} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <ChevronRightIcon />
        </IconButton>
      </Paper>

      {/* Matriz Semanal */}
      <TableContainer component={Paper} sx={{ 
        maxHeight: 'calc(100vh - 280px)', 
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'background.paper', fontWeight: 'bold', textAlign: 'center', width: 100 }}>HORA</TableCell>
              {DAYS.map(day => (
                <TableCell key={day} align="center" sx={{ 
                  bgcolor: 'background.paper', 
                  fontWeight: '900', 
                  textTransform: 'uppercase',
                  fontSize: '0.85rem',
                  color: theme.palette.primary.main,
                  minWidth: 120,
                  borderBottom: `2px solid ${theme.palette.primary.main}`
                }}>
                  {translations[day] || day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ height: 400, textAlign: 'center' }}>
                  <CircularProgress color="primary" />
                </TableCell>
              </TableRow>
            ) : (
              HOURS.map(hour => (
                <TableRow key={hour}>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    textAlign: 'center', 
                    bgcolor: theme.palette.mode === 'light' ? '#f9f9f9' : 'rgba(255,255,255,0.02)',
                    borderRight: `1px solid ${theme.palette.divider}`,
                    fontSize: '0.85rem'
                  }}>
                    {`${hour.toString().padStart(2, '0')}:00`}
                  </TableCell>
                  
                  {DAYS.map(day => {
                    const status = getSlotStatus(day, hour);
                    
                    const bgColors = {
                      fixed: '#4B4453', // Color oscuro para asignación fija
                      class: '#845EC2', // Púrpura para clases programadas
                      available: theme.palette.mode === 'light' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.25)',
                      break: theme.palette.mode === 'light' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.25)',
                      'non-working': 'transparent'
                    };

                    return (
                      <Tooltip key={day} title={status.label} arrow>
                        <TableCell 
                          sx={{ 
                            height: 60,
                            p: 0.5,
                            bgcolor: bgColors[status.type],
                            border: `1px solid ${theme.palette.divider}`,
                            transition: '0.2s',
                            '&:hover': { opacity: status.type !== 'non-working' ? 0.7 : 1 }
                          }}
                        >
                          {status.type === 'fixed' && (
                            <Box sx={{ color: 'white', textAlign: 'center' }}>
                              <PinIcon sx={{ fontSize: '0.7rem', mb: -0.2 }} />
                              <Typography sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>FIJO</Typography>
                              <Typography sx={{ fontSize: '0.65rem' }} noWrap>{status.data.name}</Typography>
                            </Box>
                          )}
                          {status.type === 'class' && (
                            <Box sx={{ color: 'white', textAlign: 'center' }}>
                              <Typography sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>CLASE</Typography>
                              <Typography sx={{ fontSize: '0.65rem' }} noWrap>{status.data.studentName}</Typography>
                            </Box>
                          )}
                        </TableCell>
                      </Tooltip>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Leyenda */}
      <Box sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
        <LegendItem color="#4B4453" label="Asignación Permanente (Fijo)" />
        <LegendItem color="#845EC2" label="Clase en Calendario" />
        <LegendItem color="rgba(76, 175, 80, 0.3)" label="Disponible" />
        <LegendItem color="rgba(255, 152, 0, 0.3)" label="Descanso" />
      </Box>

      <Snackbar open={message.open} autoHideDuration={4000} onClose={() => setMessage({ ...message, open: false })}>
        <Alert severity={message.severity} variant="filled">{message.text}</Alert>
      </Snackbar>
    </ThemeTransition>
  );
}

const LegendItem = ({ color, label }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Box sx={{ width: 20, height: 20, bgcolor: color, borderRadius: 0.5 }} />
    <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.secondary' }}>{label}</Typography>
  </Stack>
);