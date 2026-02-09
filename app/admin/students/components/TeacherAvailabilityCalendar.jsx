'use client';

import React, { useCallback } from 'react';
import { 
  Box, Typography, CircularProgress, Alert, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Tooltip 
} from '@mui/material';
import moment from 'moment';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM - 10 PM

const TeacherAvailabilityCalendar = ({ 
  teacherSchedule, 
  loading, 
  onSlotSelect,
  scheduledClasses = [],
  onAvailabilityValidation
}) => {
  const { theme } = useTheme();
  const { translations } = useLanguage();

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Verifica el estado de cada celda
  const checkSlotStatus = useCallback((day, hour) => {
    if (!teacherSchedule) return { type: 'unavailable' };

    const slotStart = hour * 60;
    const slotEnd = (hour + 1) * 60;

    // 1. NUEVO: Verificar si el bloque ya está ocupado por un estudiante fijo
    if (teacherSchedule.assignedStudents && teacherSchedule.assignedStudents.length > 0) {
      // Buscamos si algún estudiante tiene este bloque en su fixedSchedule
      const occupiedBy = teacherSchedule.assignedStudents.find(student => 
        student.fixedSchedule?.some(fixedSlot => 
          fixedSlot.day.toLowerCase() === day && 
          parseInt(fixedSlot.hour) === hour
        )
      );

      if (occupiedBy) {
        return { 
          type: 'occupied', 
          label: `Ocupado por: ${occupiedBy.fullName}`,
          disabled: true 
        };
      }
    }

    // 2. Verificar si el profesor trabaja ese día
    const workingDays = teacherSchedule.workingDays || [];
    if (!workingDays.includes(day)) return { type: 'unavailable', label: 'No laborable', disabled: true };

    // 3. Verificar si está dentro de las Work Hours
    const dayWorkHours = teacherSchedule.workHours?.[day] || [];
    const isWithinWork = dayWorkHours.some(w => {
      return slotStart >= timeToMinutes(w.start) && slotEnd <= timeToMinutes(w.end);
    });
    if (!isWithinWork) return { type: 'unavailable', label: 'Fuera de horario', disabled: true };

    // 4. Verificar si cae en Break Hours
    const dayBreakHours = teacherSchedule.breakHours?.[day] || [];
    const isInBreak = dayBreakHours.some(b => {
      const bStart = timeToMinutes(b.start);
      const bEnd = timeToMinutes(b.end);
      return (slotStart < bEnd && slotEnd > bStart);
    });
    if (isInBreak) return { type: 'break', label: 'Descanso', disabled: true };

    // 5. Verificar si está seleccionado actualmente en el formulario
    const isSelected = scheduledClasses.some(cls => {
      const clsDay = moment(cls.date).format('dddd').toLowerCase();
      const clsStart = timeToMinutes(cls.startTime);
      return clsDay === day && clsStart === slotStart;
    });
    if (isSelected) return { type: 'selected', label: 'Seleccionado', disabled: false };

    return { type: 'available', label: 'Disponible', disabled: false };
  }, [teacherSchedule, scheduledClasses]);

  const handleCellClick = (day, hour) => {
    const status = checkSlotStatus(day, hour);
    // Solo permitir click si no está deshabilitado (ocupado, descanso, no laboral)
    if (!status.disabled) {
      onSlotSelect({
        day,
        date: moment().day(day).format('YYYY-MM-DD'), // Fecha referencial para esta semana
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${(hour + 1).toString().padStart(2, '0')}:00`
      });
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if (!teacherSchedule) {
    return <Alert severity="info">{translations.selectTeacherFirst || 'Select a teacher first'}</Alert>;
  }

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        {translations.teacherSchedule || 'Teacher Schedule'}
      </Typography>
      
      <TableContainer component={Paper} sx={{ 
        maxHeight: 400, 
        border: `1px solid ${theme.palette.divider}`,
      }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: theme.palette.background.paper, fontWeight: 'bold', width: 60 }}>Hora</TableCell>
              {DAYS.map(day => (
                <TableCell key={day} align="center" sx={{ 
                  bgcolor: theme.palette.background.paper, 
                  fontWeight: 'bold', 
                  textTransform: 'capitalize',
                  minWidth: 80
                }}>
                  {translations[day]?.substring(0, 3) || day.substring(0, 3)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {HOURS.map(hour => (
              <TableRow key={hour}>
                <TableCell sx={{ fontWeight: '500', borderRight: `1px solid ${theme.palette.divider}` }}>
                  {`${hour}:00`}
                </TableCell>
                {DAYS.map(day => {
                  const status = checkSlotStatus(day, hour);
                  
                  // Definir colores
                  let bgColor = 'transparent';
                  let textColor = 'inherit';
                  let cursor = 'pointer';

                  if (status.type === 'selected') {
                    bgColor = '#845EC2';
                    textColor = 'white';
                  } else if (status.type === 'occupied') {
                    bgColor = '#4B4453'; // Gris oscuro para ocupado
                    textColor = 'white';
                    cursor = 'not-allowed';
                  } else if (status.type === 'available') {
                    bgColor = 'rgba(76, 175, 80, 0.2)';
                  } else if (status.type === 'break') {
                    bgColor = 'rgba(255, 152, 0, 0.2)';
                    cursor = 'not-allowed';
                  } else {
                    bgColor = theme.palette.mode === 'light' ? '#f5f5f5' : '#2c2c3a'; // No laboral
                    cursor = 'not-allowed';
                  }

                  return (
                    <Tooltip key={day} title={`${day} - ${hour}:00 (${status.label})`} arrow>
                      <TableCell 
                        align="center"
                        onClick={() => handleCellClick(day, hour)}
                        sx={{ 
                          cursor,
                          bgcolor: bgColor,
                          color: textColor,
                          border: `1px solid ${theme.palette.divider}`,
                          height: 40,
                          padding: 0,
                          fontSize: '0.75rem',
                          '&:hover': {
                            opacity: status.disabled ? 1 : 0.7
                          }
                        }}
                      >
                        {status.type === 'selected' ? '✓' : status.type === 'occupied' ? 'Busy' : ''}
                      </TableCell>
                    </Tooltip>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Leyenda Actualizada */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        <LegendItem color="rgba(76, 175, 80, 0.2)" label="Disponible" />
        <LegendItem color="#845EC2" label="Seleccionado" />
        <LegendItem color="#4B4453" label="Ocupado (Estudiante Fijo)" />
        <LegendItem color="rgba(255, 152, 0, 0.2)" label="Descanso" />
      </Box>
    </Box>
  );
};

const LegendItem = ({ color, label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <Box sx={{ width: 16, height: 16, bgcolor: color, borderRadius: 0.5, border: '1px solid #ddd' }} />
    <Typography variant="caption">{label}</Typography>
  </Box>
);

export default TeacherAvailabilityCalendar;