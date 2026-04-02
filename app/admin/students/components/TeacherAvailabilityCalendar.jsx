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
  onAvailabilityValidation,
  currentStudent // <-- Recibimos el estudiante que se está editando
}) => {
  const { theme } = useTheme();
  const { translations } = useLanguage();

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const checkSlotStatus = useCallback((day, hour) => {
    if (!teacherSchedule) return { type: 'unavailable' };

    const slotStart = hour * 60;
    const slotEnd = (hour + 1) * 60;

    // 1. Verificar ocupación por estudiantes fijos
    if (teacherSchedule.assignedStudents && teacherSchedule.assignedStudents.length > 0) {
      const occupiedBy = teacherSchedule.assignedStudents.find(student => 
        student.fixedSchedule?.some(fixedSlot => 
          fixedSlot.day.toLowerCase() === day && 
          parseInt(fixedSlot.hour) === hour
        )
      );

      if (occupiedBy) {
        // ¿Es el estudiante que estamos editando actualmente?
        const isSelf = currentStudent && occupiedBy.id === currentStudent.id;

        if (isSelf) {
          return { 
            type: 'current_student_fixed', 
            label: `Tu horario actual: ${occupiedBy.fullName}`,
            disabled: false // <-- IMPORTANTE: Permitimos click para que pueda "moverse"
          };
        } else {
          return { 
            type: 'occupied', 
            label: `Ocupado por: ${occupiedBy.fullName}`,
            disabled: true 
          };
        }
      }
    }

    // 2. Verificar si el profesor trabaja ese día
    const workingDays = teacherSchedule.workingDays || [];
    if (!workingDays.includes(day)) return { type: 'unavailable', label: 'No laborable', disabled: true };

    // 3. Verificar Work Hours
    const dayWorkHours = teacherSchedule.workHours?.[day] || [];
    const isWithinWork = dayWorkHours.some(w => {
      return slotStart >= timeToMinutes(w.start) && slotEnd <= timeToMinutes(w.end);
    });
    if (!isWithinWork) return { type: 'unavailable', label: 'Fuera de horario', disabled: true };

    // 4. Verificar Break Hours
    const dayBreakHours = teacherSchedule.breakHours?.[day] || [];
    const isInBreak = dayBreakHours.some(b => {
      const bStart = timeToMinutes(b.start);
      const bEnd = timeToMinutes(b.end);
      return (slotStart < bEnd && slotEnd > bStart);
    });
    if (isInBreak) return { type: 'break', label: 'Descanso', disabled: true };

    // 5. Verificar si está seleccionado en el formulario actual (cambio pendiente)
    const isSelected = scheduledClasses.some(cls => {
      const clsDay = moment(cls.date).format('dddd').toLowerCase();
      const clsStart = timeToMinutes(cls.startTime);
      return clsDay === day && clsStart === slotStart;
    });
    if (isSelected) return { type: 'selected', label: 'Nuevo horario seleccionado', disabled: false };

    return { type: 'available', label: 'Disponible', disabled: false };
  }, [teacherSchedule, scheduledClasses, currentStudent]);

  // ... resto del componente (handleCellClick, Table rendering, etc.)

  const handleCellClick = (day, hour) => {
    const status = checkSlotStatus(day, hour);
    if (!status.disabled) {
      onSlotSelect({
        day,
        date: moment().day(day).format('YYYY-MM-DD'),
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${(hour + 1).toString().padStart(2, '0')}:00`
      });
    }
  };

  // Renderizado de colores actualizado
  const getSlotStyles = (status) => {
      let styles = {
        bgColor: 'transparent',
        textColor: 'inherit',
        cursor: status.disabled ? 'not-allowed' : 'pointer',
        text: ''
      };

     switch (status.type) {
        case 'selected':
          styles.bgColor = '#845EC2'; // Púrpura principal
          styles.textColor = 'white';
          styles.text = '✓';
          break;
        case 'current_student_fixed':
          // CAMBIO AQUÍ: Usamos el mismo color sólido que 'selected' 
          // o el color de 'available' si quieres que parezca editable.
          // Para que se vea igual al "Edit" (donde ya es su lugar), usamos el púrpura:
          styles.bgColor = '#845EC2'; 
          styles.textColor = 'white';
          styles.text = '✓'; // O el nombre del alumno si prefieres
          break;
        case 'occupied':
          styles.bgColor = '#4B4453';
          styles.textColor = 'white';
          styles.text = 'Busy';
          break;
      case 'available':
        styles.bgColor = 'rgba(76, 175, 80, 0.15)';
        break;
      case 'break':
        styles.bgColor = 'rgba(255, 152, 0, 0.2)';
        break;
      default:
        styles.bgColor = theme.palette.mode === 'light' ? '#f5f5f5' : '#2c2c3a';
    }
    return styles;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <TableContainer component={Paper} sx={{ maxHeight: 400, border: `1px solid ${theme.palette.divider}` }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'background.paper', fontWeight: 'bold', width: 60 }}>Hora</TableCell>
              {DAYS.map(day => (
                <TableCell key={day} align="center" sx={{ bgcolor: 'background.paper', fontWeight: 'bold', textTransform: 'capitalize' }}>
                  {translations[day]?.substring(0, 3) || day.substring(0, 3)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {HOURS.map(hour => (
              <TableRow key={hour}>
                <TableCell sx={{ fontWeight: '500' }}>{`${hour}:00`}</TableCell>
                {DAYS.map(day => {
                  const status = checkSlotStatus(day, hour);
                  const styles = getSlotStyles(status);
                  
                  return (
                    <Tooltip key={day} title={status.label} arrow>
                      <TableCell 
                        align="center"
                        onClick={() => handleCellClick(day, hour)}
                        sx={{ 
                          cursor: styles.cursor,
                          bgcolor: styles.bgColor,
                          color: styles.textColor,
                          border: `1px solid ${theme.palette.divider}`,
                          height: 40,
                          padding: 0,
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          '&:hover': { opacity: status.disabled ? 1 : 0.7 }
                        }}
                      >
                        {styles.text}
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
        <LegendItem color="rgba(132, 94, 194, 0.4)" label="Horario Actual Alumno" />
        <LegendItem color="#845EC2" label="Nuevo Selección" />
        <LegendItem color="#4B4453" label="Ocupado (Otros)" />
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