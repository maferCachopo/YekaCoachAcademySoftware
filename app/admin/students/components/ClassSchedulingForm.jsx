import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  Box, Typography, Grid, Alert, Chip
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import moment from 'moment';
import 'moment-timezone';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { packageAPI, studentAPI } from '../../../utils/api';
import { ADMIN_TIMEZONE } from '../../../utils/constants';

const ClassSchedulingForm = memo(({ 
  scheduledClasses = [], 
  setScheduledClasses, 
  packageId, 
  studentId,
  teacherId,
  existingClasses = [],
  teacherValidationFn = null,
  onScheduleChange
}) => {
  const [packageDetails, setPackageDetails] = useState(null);
  const [studentPackage, setStudentPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const isFirstRender = useRef(true);
  const prevSlotsRef = useRef('');

  // ── Calcular slots fijos únicos (para notificar al padre) ──
  const fixedScheduleSlots = useMemo(() => {
    const seen = new Set();
    return scheduledClasses
      .filter(c => c.date && c.startTime)
      .map(c => {
        const day = moment(c.date).format('dddd').toLowerCase();
        const hour = parseInt(c.startTime.split(':')[0]);
        return { day, hour, startTime: c.startTime, endTime: c.endTime };
      })
      .filter(slot => {
        const key = `${slot.day}-${slot.hour}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [scheduledClasses]);

  // ── Notificar al padre los slots cuando cambien ──
  useEffect(() => {
    if (onScheduleChange) {
      const seen = new Set();
      const slots = scheduledClasses
        .filter(c => c.date && c.startTime)
        .map(c => {
          const day = moment(c.date).format('dddd').toLowerCase();
          const hour = parseInt(c.startTime.split(':')[0]);
          return { day, hour, startTime: c.startTime, endTime: c.endTime };
        })
        .filter(slot => {
          const key = `${slot.day}-${slot.hour}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      const currentSlotsString = JSON.stringify(slots);
      if (prevSlotsRef.current !== currentSlotsString) {
        prevSlotsRef.current = currentSlotsString;
        onScheduleChange(slots);
      }
    }
  }, [scheduledClasses, onScheduleChange]);

  // ── Fetch package details ──
  useEffect(() => {
    const fetchPackageDetails = async () => {
      if (!packageId) return;
      setLoading(true);
      try {
        const packageData = await packageAPI.getPackageById(packageId);
        setPackageDetails(packageData);
        if (studentId) {
          const studentPackages = await studentAPI.getStudentPackages(studentId);
          const activePackage = studentPackages.find(p =>
            p.packageId === Number(packageId) && p.status === 'active'
          );
          if (activePackage) setStudentPackage(activePackage);
        }
      } catch (error) {
        console.error('Error fetching package details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPackageDetails();
  }, [packageId, studentId]);

  // ── Validación ──
  useEffect(() => {
    if (!packageDetails) return;
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    validateClasses();
  }, [scheduledClasses, packageDetails, studentPackage, teacherValidationFn]);

  const validateClasses = () => {
    if (!packageDetails) return;
    const newErrors = [];
    const packageStartDate = studentPackage ? moment(studentPackage.startDate) : moment();
    const packageEndDate = studentPackage
      ? moment(studentPackage.endDate)
      : moment().add(packageDetails.durationMonths || 6, 'months');

    scheduledClasses.forEach((classItem, index) => {
      if (!classItem.date) return;
      const classDate = moment(classItem.date);
      if (classDate.isBefore(moment(), 'day')) {
        newErrors.push({ index, message: 'Cannot schedule classes in the past' });
      }
      if (studentPackage) {
        if (classDate.isBefore(packageStartDate, 'day')) {
          newErrors.push({ index, message: `Class must be after package start date (${packageStartDate.format('YYYY-MM-DD')})` });
        }
        if (classDate.isAfter(packageEndDate, 'day')) {
          newErrors.push({ index, message: `Class must be before package end date (${packageEndDate.format('YYYY-MM-DD')})` });
        }
      }
      const duplicates = scheduledClasses.filter((c, i) =>
        i !== index && c.date === classItem.date && c.startTime === classItem.startTime
      );
      if (duplicates.length > 0) {
        newErrors.push({ index, message: 'Duplicate class time detected' });
      }
      if (teacherValidationFn && classItem.date && classItem.startTime && classItem.endTime) {
        const validation = teacherValidationFn(classItem.date, classItem.startTime, classItem.endTime);
        if (!validation.valid) {
          newErrors.push({ index, message: validation.message });
        }
      }
    });
    setErrors(newErrors);
  };

  // ── Cargar clases existentes (modo edición) ──
  useEffect(() => {
    if (!packageId) return;
    if (scheduledClasses.length > 0 && (!existingClasses || existingClasses.length === 0)) {
      return;
    }
    if (existingClasses && existingClasses.length > 0) {
      const scheduledExistingClasses = existingClasses.filter(cls => cls.status === 'scheduled');
      const initialClasses = scheduledExistingClasses.map(cls => ({
        id: cls.id,
        classId: cls.classId,
        date: cls.classDetail?.date ? moment(cls.classDetail.date).format('YYYY-MM-DD') : '',
        startTime: cls.classDetail?.startTime || '',
        endTime: cls.classDetail?.endTime || '',
        status: cls.status || 'scheduled'
      }));
      if (JSON.stringify(initialClasses) !== JSON.stringify(scheduledClasses)) {
        setScheduledClasses(initialClasses);
      }
    }
  }, [packageId, existingClasses]);

  if (!packageId || !packageDetails) return null;

  const maxClasses = packageDetails?.totalClasses || 0;
  const filledClasses = scheduledClasses.filter(c => c.date && c.startTime && c.endTime && !c.isPreview);
  const isComplete = filledClasses.length === maxClasses;
  const previewCount = scheduledClasses.filter(c => c.isPreview).length;

  // ── Agrupar clases por semana para mostrarlas ordenadas ──
  const sortedClasses = [...scheduledClasses].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return moment(a.date).diff(moment(b.date));
  });

  return (
    <Box sx={{ mt: 2 }}>
      {/* ── Header con contador ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.text?.primary }}>
          {translations.classSchedule || 'Clases Programadas'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            size="small"
            icon={isComplete ? <CheckIcon sx={{ fontSize: '0.9rem !important' }} /> : <WarningIcon sx={{ fontSize: '0.9rem !important' }} />}
            label={`${filledClasses.length} / ${maxClasses}`}
            sx={{
              fontWeight: 600,
              bgcolor: isComplete
                ? (theme.mode === 'light' ? 'rgba(46,125,50,0.1)' : 'rgba(46,125,50,0.2)')
                : (theme.mode === 'light' ? 'rgba(255,152,0,0.1)' : 'rgba(255,152,0,0.2)'),
              color: isComplete ? '#2e7d32' : '#e65100',
              border: `1px solid ${isComplete ? 'rgba(46,125,50,0.3)' : 'rgba(255,152,0,0.3)'}`,
            }}
          />
        </Box>
      </Box>

      {/* ── Alerta si hay clases en preview ── */}
      {previewCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.85rem' }}>
          ⚠️ Las fechas son provisionales. Pulsa <strong>Generar fechas</strong> para confirmarlas.
        </Alert>
      )}

      {/* ── Alerta si está completo ── */}
      {isComplete && previewCount === 0 && (
        <Alert severity="success" sx={{ mb: 2, fontSize: '0.85rem' }}>
          ✅ Las {maxClasses} clases están confirmadas y listas para guardar.
        </Alert>
      )}

      {/* ── Lista de clases (solo lectura) ── */}
      {sortedClasses.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: theme.mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: theme.text?.secondary }}>
            Selecciona los bloques horarios en el calendario y genera las fechas para ver las clases aquí.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sortedClasses.map((classItem, index) => {
            const classErrors = errors.filter(e => e.index === scheduledClasses.indexOf(classItem)).map(e => e.message);
            const hasError = classErrors.length > 0;
            const isPreview = !!classItem.isPreview;

            const displayDate = classItem.date
              ? moment(classItem.date).format('ddd DD/MM/YYYY')
              : '—';
            const displayTime = classItem.startTime && classItem.endTime
              ? `${classItem.startTime} – ${classItem.endTime}`
              : classItem.startTime || '—';
            const dayName = classItem.date
              ? moment(classItem.date).format('dddd')
              : '';

            return (
              <Box
                key={classItem.id || index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1.25,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: hasError
                    ? 'rgba(211,47,47,0.4)'
                    : isPreview
                    ? 'rgba(255,152,0,0.35)'
                    : theme.mode === 'light' ? 'rgba(132,94,194,0.2)' : 'rgba(132,94,194,0.35)',
                  bgcolor: hasError
                    ? (theme.mode === 'light' ? 'rgba(211,47,47,0.04)' : 'rgba(211,47,47,0.08)')
                    : isPreview
                    ? (theme.mode === 'light' ? 'rgba(255,152,0,0.04)' : 'rgba(255,152,0,0.08)')
                    : (theme.mode === 'light' ? 'rgba(132,94,194,0.04)' : 'rgba(132,94,194,0.08)'),
                  opacity: isPreview ? 0.75 : 1,
                }}
              >
                {/* Número de clase */}
                <Box sx={{
                  minWidth: 28, height: 28,
                  borderRadius: '50%',
                  bgcolor: isPreview ? 'rgba(255,152,0,0.15)' : 'rgba(132,94,194,0.15)',
                  color: isPreview ? '#e65100' : '#845EC2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.78rem', flexShrink: 0
                }}>
                  {index + 1}
                </Box>

                {/* Fecha */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
                  <CalendarIcon sx={{ fontSize: '0.95rem', color: theme.text?.secondary }} />
                  <Typography variant="body2" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                    {displayDate}
                  </Typography>
                </Box>

                {/* Hora */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <TimeIcon sx={{ fontSize: '0.95rem', color: theme.text?.secondary }} />
                  <Typography variant="body2" sx={{ color: theme.text?.primary, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {displayTime}
                  </Typography>
                </Box>

                {/* Badge preview */}
                {isPreview && (
                  <Chip label="provisional" size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: 'rgba(255,152,0,0.15)', color: '#e65100', fontWeight: 600 }} />
                )}

                {/* Badge error */}
                {hasError && (
                  <Chip
                    label={classErrors[0]}
                    size="small"
                    sx={{ height: 20, fontSize: '0.68rem', bgcolor: 'rgba(211,47,47,0.1)', color: '#d32f2f', fontWeight: 600, maxWidth: 180 }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
});

export default ClassSchedulingForm;