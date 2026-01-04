'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, CircularProgress, Alert, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Tooltip 
} from '@mui/material';
import moment from 'moment';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';

/**
 * Matriz Semanal Recurrente (8 AM - 11 PM)
 */
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // Genera [8, 9, ..., 22]

const TeacherAvailabilityCalendar = ({ 
  teacherSchedule, 
  loading, 
  onSlotSelect,
  scheduledClasses = [],
  onAvailabilityValidation
}) => {
  const { theme } = useTheme();
  const { translations } = useLanguage();

  // Helper para convertir "HH:mm" a minutos
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Verifica si un bloque específico (Día y Hora) es válido según la disponibilidad del profesor
  const checkSlotStatus = useCallback((day, hour) => {
    if (!teacherSchedule) return { type: 'unavailable' };

    const slotStart = hour * 60;
    const slotEnd = (hour + 1) * 60;

    // 1. Verificar si el profesor trabaja ese día
    const workingDays = teacherSchedule.workingDays || [];
    if (!workingDays.includes(day)) return { type: 'unavailable', label: 'No laborable' };

    // 2. Verificar si está dentro de las Work Hours
    const dayWorkHours = teacherSchedule.workHours?.[day] || [];
    const isWithinWork = dayWorkHours.some(w => {
      return slotStart >= timeToMinutes(w.start) && slotEnd <= timeToMinutes(w.end);
    });
    if (!isWithinWork) return { type: 'unavailable', label: 'Fuera de horario' };

    // 3. Verificar si cae en Break Hours
    const dayBreakHours = teacherSchedule.breakHours?.[day] || [];
    const isInBreak = dayBreakHours.some(b => {
      const bStart = timeToMinutes(b.start);
      const bEnd = timeToMinutes(b.end);
      return (slotStart < bEnd && slotEnd > bStart);
    });
    if (isInBreak) return { type: 'break', label: 'Descanso' };

    // 4. Verificar si ya está seleccionado en el formulario actual
    const isSelected = scheduledClasses.some(cls => {
      // Nota: Si el formulario usa fechas, esto compara por el nombre del día
      const clsDay = moment(cls.date).format('dddd').toLowerCase();
      const clsStart = timeToMinutes(cls.startTime);
      return clsDay === day && clsStart === slotStart;
    });
    if (isSelected) return { type: 'selected', label: 'Seleccionado' };

    return { type: 'available', label: 'Disponible' };
  }, [teacherSchedule, scheduledClasses]);

  // Validar una clase específica (usado por el componente padre)
  const validateClassTime = useCallback((date, startTime, endTime) => {
    if (!teacherSchedule) return { valid: false, message: 'Cargando...' };
    const day = moment(date).format('dddd').toLowerCase();
    const hour = parseInt(startTime.split(':')[0]);
    const status = checkSlotStatus(day, hour);
    
    if (status.type === 'available' || status.type === 'selected') {
      return { valid: true };
    }
    return { valid: false, message: status.label || 'Horario no disponible' };
  }, [teacherSchedule, checkSlotStatus]);

  useEffect(() => {
    if (onAvailabilityValidation && teacherSchedule) {
      onAvailabilityValidation(validateClassTime);
    }
  }, [teacherSchedule, onAvailabilityValidation, validateClassTime]);

  const handleCellClick = (day, hour) => {
    const status = checkSlotStatus(day, hour);
    if (status.type === 'available' || status.type === 'selected') {
      onSlotSelect({
        day,
        date: moment().day(day).format('YYYY-MM-DD'), // Fecha de referencia (esta semana)
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${(hour + 1).toString().padStart(2, '0')}:00`
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!teacherSchedule) {
    return <Alert severity="info">Seleccione un profesor para ver su cronograma.</Alert>;
  }

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        Cronograma Semanal Recurrente (Bloques de 1 hora)
      </Typography>
      
      <TableContainer component={Paper} sx={{ 
        maxHeight: 500, 
        border: `1px solid ${theme.palette.divider}`,
        '&::-webkit-scrollbar': { width: 8 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: '#ccc', borderRadius: 4 }
      }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: theme.palette.background.default, fontWeight: 'bold' }}>Hora</TableCell>
              {DAYS.map(day => (
                <TableCell key={day} align="center" sx={{ 
                  bgcolor: theme.palette.background.default, 
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
                  const isSelectable = status.type === 'available' || status.type === 'selected';

                  return (
                    <Tooltip key={day} title={`${day} - ${hour}:00 (${status.label})`} arrow>
                      <TableCell 
                        align="center"
                        onClick={() => handleCellClick(day, hour)}
                        sx={{ 
                          cursor: isSelectable ? 'pointer' : 'not-allowed',
                          bgcolor: 
                            status.type === 'selected' ? '#845EC2' : 
                            status.type === 'available' ? 'rgba(76, 175, 80, 0.2)' : 
                            status.type === 'break' ? 'rgba(255, 152, 0, 0.2)' : 
                            'rgba(0, 0, 0, 0.05)',
                          color: status.type === 'selected' ? 'white' : 'inherit',
                          border: `1px solid ${theme.palette.divider}`,
                          transition: '0.2s',
                          '&:hover': {
                            bgcolor: isSelectable ? (status.type === 'selected' ? '#6B46C1' : 'rgba(76, 175, 80, 0.4)') : 'inherit'
                          }
                        }}
                      >
                        {status.type === 'selected' ? '✓' : ''}
                      </TableCell>
                    </Tooltip>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Leyenda */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        <LegendItem color="rgba(76, 175, 80, 0.2)" label="Disponible" />
        <LegendItem color="#845EC2" label="Seleccionado" />
        <LegendItem color="rgba(255, 152, 0, 0.2)" label="Descanso" />
        <LegendItem color="rgba(0, 0, 0, 0.05)" label="No disponible" />
      </Box>
    </Box>
  );
};

const LegendItem = ({ color, label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <Box sx={{ width: 16, height: 16, bgcolor: color, border: '1px solid #ddd', borderRadius: 0.5 }} />
    <Typography variant="caption">{label}</Typography>
  </Box>
);

export default TeacherAvailabilityCalendar;