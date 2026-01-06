import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Box, Typography, Button, TextField, IconButton, Grid, Alert
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Check as CheckIcon, Warning as WarningIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import moment from 'moment';
import 'moment-timezone';
import { textFieldStyle } from '../utils/styles';
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
  teacherValidationFn = null
}) => {
  const [packageDetails, setPackageDetails] = useState(null);
  const [studentPackage, setStudentPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const isFirstRender = useRef(true);

  // --- MODIFICACIÓN: Función auxiliar para obtener el nombre del día ---
  const getDayName = (dateString) => {
    return moment(dateString).format('dddd').toLowerCase();
  };

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

  useEffect(() => {
    if (!packageDetails) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    validateClasses();
  }, [scheduledClasses, packageDetails, studentPackage, teacherValidationFn]);

  const validateClasses = () => {
    if (!packageDetails) return;
    const newErrors = [];
    const packageStartDate = studentPackage ? moment(studentPackage.startDate) : moment();
    const packageEndDate = studentPackage ? moment(studentPackage.endDate) : moment().add(packageDetails.durationMonths || 6, 'months');
    
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

  useEffect(() => {
    if (!packageId) return;
    if (scheduledClasses.length > 0 && existingClasses?.length === 0) return;

    let initialClasses = [];
    if (existingClasses?.length > 0) {
      const scheduledExistingClasses = existingClasses.filter(cls => cls.status === 'scheduled');
      initialClasses = scheduledExistingClasses.map(cls => ({
        id: cls.id,
        classId: cls.classId,
        date: cls.classDetail?.date ? moment(cls.classDetail.date).format('YYYY-MM-DD') : '',
        startTime: cls.classDetail?.startTime || '',
        endTime: cls.classDetail?.endTime || '',
        status: cls.status || 'scheduled'
      }));
    } else {
      packageAPI.getPackageById(packageId).then(packageData => {
        if (packageData && packageData.totalClasses) {
          const newClasses = [];
          for (let i = 0; i < packageData.totalClasses; i++) {
            newClasses.push({
              id: `class-${i}`,
              date: '',
              startTime: '',
              endTime: '',
              teacherId: teacherId || undefined,
            });
          }
          setScheduledClasses(newClasses);
        }
      });
      return;
    }
    setScheduledClasses(initialClasses);
  }, [packageId, existingClasses, setScheduledClasses]);

  const handleChangeClass = useCallback((index, field, value) => {
    setScheduledClasses(prev => {
      const updated = [...prev];
      updated[index] = { 
        ...updated[index], 
        [field]: value,
        timezone: ADMIN_TIMEZONE,
        teacherId: teacherId || updated[index].teacherId 
      };

      if (index === 0) {
        const firstClass = updated[0];
        for (let i = 1; i < updated.length; i++) {
          if (firstClass.date) {
            updated[i].date = moment(firstClass.date).add(i, 'weeks').format('YYYY-MM-DD');
          }
          if (firstClass.startTime) updated[i].startTime = firstClass.startTime;
          if (firstClass.endTime) updated[i].endTime = firstClass.endTime;
          updated[i].teacherId = firstClass.teacherId;
          updated[i].timezone = ADMIN_TIMEZONE;
        }
      }
      
      // --- MODIFICACIÓN: Inyectamos el weeklySchedule dentro del objeto global de estado ---
      // Esto ayuda a que el componente padre reciba la estructura fija simplificada
      const result = updated.map(cls => ({
        ...cls,
        dayName: cls.date ? getDayName(cls.date) : null
      }));

      return result;
    });
  }, [setScheduledClasses, teacherId]);

  const handleAddClass = useCallback(() => {
    if (!packageDetails) return;
    const maxClassesAllowed = packageDetails.totalClasses;
    if (scheduledClasses.length >= maxClassesAllowed) return;

    setScheduledClasses(prev => [...prev, {
      id: `class-${prev.length}`,
      date: '',
      startTime: '',
      endTime: '',
      teacherId: teacherId || undefined,
    }]);
  }, [packageDetails, scheduledClasses, setScheduledClasses, teacherId]);

  const handleRemoveClass = useCallback((index) => {
    setScheduledClasses(prev => prev.filter((_, i) => i !== index));
  }, [setScheduledClasses]);

  if (!packageId || !packageDetails) return null;
  
  const maxClasses = packageDetails?.totalClasses || 0;
  const canAddMore = scheduledClasses.length < maxClasses;
  const isComplete = scheduledClasses.length === maxClasses && scheduledClasses.every(c => c.date && c.startTime && c.endTime);

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
          {translations.classSchedule || 'Class Schedule'}
        </Typography>
        {canAddMore && (
          <Button size="small" variant="outlined" onClick={handleAddClass} startIcon={<AddIcon />} sx={{ color: '#845EC2', borderColor: 'rgba(132, 94, 194, 0.5)' }}>
            {translations.addClass || 'Add Class'}
          </Button>
        )}
      </Box>

      {scheduledClasses.map((classItem, index) => {
        const classErrors = errors.filter(e => e.index === index).map(e => e.message);
        const hasClassErrors = classErrors.length > 0;
        
        return (
          <Box key={classItem.id || index} sx={{ mb: 2, p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.1)', background: hasClassErrors ? 'rgba(211, 47, 47, 0.05)' : 'rgba(0,0,0,0.02)', position: 'relative' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {translations.class || 'Class'} {index + 1}
            </Typography>
            {scheduledClasses.length > 1 && !classItem.classId && (
              <IconButton size="small" onClick={() => handleRemoveClass(index)} sx={{ position: 'absolute', top: 8, right: 8, color: '#FF5252' }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <DatePicker
                    label={translations.date || 'Date'}
                    value={classItem.date ? moment(classItem.date) : null}
                    onChange={(newDate) => handleChangeClass(index, 'date', newDate ? newDate.format('YYYY-MM-DD') : '')}
                    slotProps={{ textField: { fullWidth: true, size: "small", sx: textFieldStyle(theme) } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <TimePicker
                    label={translations.startTime || 'Start Time'}
                    value={classItem.startTime ? moment(classItem.startTime, 'HH:mm') : null}
                    onChange={(newTime) => handleChangeClass(index, 'startTime', newTime ? newTime.format('HH:mm') : '')}
                    ampm={false}
                    slotProps={{ textField: { fullWidth: true, size: "small", sx: textFieldStyle(theme) } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <TimePicker
                    label={translations.endTime || 'End Time'}
                    value={classItem.endTime ? moment(classItem.endTime, 'HH:mm') : null}
                    onChange={(newTime) => handleChangeClass(index, 'endTime', newTime ? newTime.format('HH:mm') : '')}
                    ampm={false}
                    slotProps={{ textField: { fullWidth: true, size: "small", sx: textFieldStyle(theme) } }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
});

export default ClassSchedulingForm;