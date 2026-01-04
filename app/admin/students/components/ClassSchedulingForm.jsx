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
  
  // Fetch package details and student package info when packageId changes
  useEffect(() => {
    const fetchPackageDetails = async () => {
      if (!packageId) return;
      
      setLoading(true);
      try {
        // Get package details
        const packageData = await packageAPI.getPackageById(packageId);
        setPackageDetails(packageData);
        
        // Get student package to know start and end dates
        if (studentId) {
          const studentPackages = await studentAPI.getStudentPackages(studentId);
          const activePackage = studentPackages.find(p => 
            p.packageId === Number(packageId) && p.status === 'active'
          );
          
          if (activePackage) {
            setStudentPackage(activePackage);
          }
        }
      } catch (error) {
        console.error('Error fetching package details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPackageDetails();
  }, [packageId, studentId]);
  
  // Validate the classes when they change
  useEffect(() => {
    if (!packageDetails) return;
    
    // Skip first render to avoid unnecessary validations
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    validateClasses();
  }, [scheduledClasses, packageDetails, studentPackage, teacherValidationFn]);
  
  // Validate all classes against package rules
  const validateClasses = () => {
    if (!packageDetails) return;
    
    const newErrors = [];
    
    // Use package dates if available, otherwise use reasonable defaults for new students
    const packageStartDate = studentPackage ? moment(studentPackage.startDate) : moment();
    const packageEndDate = studentPackage ? moment(studentPackage.endDate) : moment().add(packageDetails.durationMonths || 6, 'months');
    
    // Check each class for errors
    scheduledClasses.forEach((classItem, index) => {
      if (!classItem.date) return; // Skip classes without dates
      
      const classDate = moment(classItem.date);
      
      // Check if class is before today
      if (classDate.isBefore(moment(), 'day')) {
        newErrors.push({
          index,
          message: 'Cannot schedule classes in the past'
        });
      }
      
      // Only check package boundaries if studentPackage exists
      if (studentPackage) {
        // Check if class is before package start date
        if (classDate.isBefore(packageStartDate, 'day')) {
          newErrors.push({
            index,
            message: `Class must be after package start date (${packageStartDate.format('YYYY-MM-DD')})`
          });
        }
        
        // Check if class is after package end date
        if (classDate.isAfter(packageEndDate, 'day')) {
          newErrors.push({
            index,
            message: `Class must be before package end date (${packageEndDate.format('YYYY-MM-DD')})`
          });
        }
      }
      
      // Check for duplicate dates/times
      const duplicates = scheduledClasses.filter((c, i) => 
        i !== index && 
        c.date === classItem.date && 
        c.startTime === classItem.startTime
      );
      
      if (duplicates.length > 0) {
        newErrors.push({
          index,
          message: 'Duplicate class time detected'
        });
      }

      // Validate against teacher availability if teacher validation function is available
      if (teacherValidationFn && classItem.date && classItem.startTime && classItem.endTime) {
        const validation = teacherValidationFn(classItem.date, classItem.startTime, classItem.endTime);
        if (!validation.valid) {
          newErrors.push({
            index,
            message: validation.message
          });
        }
      }
    });
    
    setErrors(newErrors);
  };

  // Initialize classes when component mounts or when packageId/existingClasses change
  useEffect(() => {
    if (!packageId) return;
    
    // Don't reset if we already have scheduled classes and no existing classes have changed
    if (scheduledClasses.length > 0 && existingClasses?.length === 0) {
      return;
    }
    
    let initialClasses = [];
    
    // Use existing classes if available
    if (existingClasses?.length > 0) {
      // Filter to include only scheduled classes
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
      // Get package details to determine how many classes to create
      packageAPI.getPackageById(packageId).then(packageData => {
        if (packageData && packageData.totalClasses) {
          // Create classes for the exact number required by the package
          const requiredClasses = packageData.totalClasses;
          const newClasses = [];
          
                for (let i = 0; i < requiredClasses; i++) {
        newClasses.push({
          id: `class-${i}`,
          date: '',
          startTime: '',
          endTime: '',
          teacherId: teacherId || undefined,
        });
      }
          
          console.log(`DEBUG - Initialized ${requiredClasses} empty classes`);
          setScheduledClasses(newClasses);
        } else {
          // Fallback to one empty class if package details can't be fetched
          setScheduledClasses([{
            id: 'class-0',
            date: '',
            startTime: '',
            endTime: '',
            teacherId: teacherId || undefined,
          }]);
        }
      }).catch(error => {
        console.error('Error fetching package details:', error);
        // Fallback to one empty class if there's an error
        setScheduledClasses([{
          id: 'class-0',
          date: '',
          startTime: '',
          endTime: '',
          teacherId: teacherId || undefined,
        }]);
      });
      
      // Return early since we're setting classes asynchronously
      return;
    }
    
    setScheduledClasses(initialClasses);
  }, [packageId, existingClasses, setScheduledClasses]);

  const handleChangeClass = useCallback((index, field, value) => {
  setScheduledClasses(prev => {
    const updated = [...prev];
    
    // 1. Actualizamos la clase que el usuario está tocando actualmente
    updated[index] = { 
      ...updated[index], 
      [field]: value,
      timezone: ADMIN_TIMEZONE,
      teacherId: teacherId || updated[index].teacherId 
    };

    // 2. Si el usuario está editando la CLASE 1 (index 0), propagamos los valores a las demás
    if (index === 0) {
      const firstClass = updated[0];
      
      for (let i = 1; i < updated.length; i++) {
        // Propagar Fecha: Sumamos una semana por cada posición
        if (firstClass.date) {
          updated[i].date = moment(firstClass.date).add(i, 'weeks').format('YYYY-MM-DD');
        }
        
        // Propagar Hora de Inicio: Copiamos el valor exacto
        if (firstClass.startTime) {
          updated[i].startTime = firstClass.startTime;
        }
        
        // Propagar Hora de Fin: Copiamos el valor exacto
        if (firstClass.endTime) {
          updated[i].endTime = firstClass.endTime;
        }

        // También aseguramos el profesor y la zona horaria
        updated[i].teacherId = firstClass.teacherId;
        updated[i].timezone = ADMIN_TIMEZONE;
      }
    }
    
    return updated;
  });
}, [setScheduledClasses, teacherId]);

  
  // Handle adding a class
  const handleAddClass = useCallback(() => {
    if (!packageDetails) return;
    
    // Calculate how many more classes can be added based on package total classes
    const maxClassesAllowed = packageDetails.totalClasses;
    const totalScheduled = scheduledClasses.length;
    const existingClassesCount = existingClasses.length;
    
    if (totalScheduled >= maxClassesAllowed) {
      alert(`Cannot add more than ${maxClassesAllowed} classes to this package.`);
      return;
    }

    // For edit mode (when existingClasses exist), prevent adding classes beyond the package limit
    // unless we have fewer classes than the package requires
    if (existingClasses.length > 0 && (existingClassesCount >= maxClassesAllowed)) {
      alert(`Cannot add extra classes. This package allows ${maxClassesAllowed} classes maximum. You can only modify existing class times.`);
      return;
    }
    
    // If no classes are scheduled yet and this is the first add action,
    // add all required classes at once to make it easier for the user
    if (totalScheduled === 0 || (totalScheduled === 1 && !scheduledClasses[0].date)) {
      const newClasses = [];
      
      // Create the exact number of required classes
      for (let i = 0; i < maxClassesAllowed; i++) {
        newClasses.push({
          id: `class-${i}`,
          date: '',
          startTime: '',
          endTime: '',
        });
      }
      
      console.log(`DEBUG - Added ${maxClassesAllowed} classes at once`);
      setScheduledClasses(newClasses);
      return;
    }
    
    // Add a single class if we already have some scheduled
    setScheduledClasses(prev => {
      const newClass = {
        id: `class-${prev.length}`,
        date: '',
        startTime: '',
        endTime: '',
        teacherId: teacherId || undefined,
      };
      console.log('DEBUG - Added new class:', newClass);
      return [...prev, newClass];
    });
  }, [packageDetails, scheduledClasses, setScheduledClasses, existingClasses]);
  
  // Handle removing a class
  const handleRemoveClass = useCallback((index) => {
    setScheduledClasses(prev => {
      console.log(`DEBUG - Removing class at index ${index}`);
      return prev.filter((_, i) => i !== index);
    });
  }, [setScheduledClasses]);

  // Early return if no package selected
  if (!packageId || !packageDetails) return null;
  
  const maxClasses = packageDetails?.totalClasses || 0;
  const canAddMore = scheduledClasses.length < maxClasses;
  const allClassesScheduled = scheduledClasses.length === maxClasses;
  const validClasses = scheduledClasses.filter(c => c.date && c.startTime && c.endTime);
  const allClassesValid = validClasses.length === scheduledClasses.length;
  const isComplete = allClassesScheduled && allClassesValid;
  const hasErrors = errors.length > 0;

  // Log current scheduled classes state
  console.log('DEBUG - Current scheduled classes:', JSON.stringify(scheduledClasses));
  console.log('DEBUG - Valid classes count:', validClasses.length);
  console.log('DEBUG - Errors:', errors);

  // Get error for a specific class
  const getClassErrors = (index) => {
    return errors.filter(error => error.index === index).map(error => error.message);
  };

  // Render the component
  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
          {translations.classSchedule || 'Class Schedule'}
        </Typography>
        
        {canAddMore && (
          <Button
            size="small"
            variant="outlined"
            onClick={handleAddClass}
            startIcon={<AddIcon />}
            disabled={scheduledClasses.length >= maxClasses}
            sx={{
              color: '#845EC2',
              borderColor: 'rgba(132, 94, 194, 0.5)',
              '&:hover': {
                borderColor: '#845EC2',
                backgroundColor: theme?.mode === 'light'
                  ? 'rgba(132, 94, 194, 0.08)'
                  : 'rgba(132, 94, 194, 0.15)',
              },
              '&.Mui-disabled': {
                color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.38)' : 'rgba(255, 255, 255, 0.38)',
                borderColor: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
              }
            }}
          >
            {translations.addClass || 'Add Class'}
          </Button>
        )}
      </Box>
      
      {packageDetails && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="caption">
              {studentPackage 
                ? `Classes must be scheduled between ${moment(studentPackage.startDate).format('YYYY-MM-DD')} and ${moment(studentPackage.endDate).format('YYYY-MM-DD')}.`
                : `Classes can be scheduled starting from today for up to ${packageDetails.durationMonths || 6} months.`}
            </Typography>
          </Alert>
        </Box>
      )}
      
      {scheduledClasses.map((classItem, index) => {
        const classErrors = getClassErrors(index);
        const hasClassErrors = classErrors.length > 0;
        
        return (
          <Box 
            key={classItem.id || index} 
            sx={{ 
              mb: 2, 
              p: 2, 
              borderRadius: 2, 
              border: theme.mode === 'light' 
                ? hasClassErrors 
                  ? '1px solid rgba(211, 47, 47, 0.5)' 
                  : '1px solid rgba(0, 0, 0, 0.1)' 
                : hasClassErrors 
                  ? '1px solid rgba(211, 47, 47, 0.5)' 
                  : '1px solid rgba(255, 255, 255, 0.1)',
              background: theme.mode === 'light' 
                ? hasClassErrors 
                  ? 'rgba(211, 47, 47, 0.08)' 
                  : 'rgba(0, 0, 0, 0.02)' 
                : hasClassErrors 
                  ? 'rgba(211, 47, 47, 0.15)' 
                  : 'rgba(255, 255, 255, 0.02)',
              position: 'relative',
            }}
          >
            <Typography variant="subtitle2" sx={{ 
              mb: 1, 
              color: hasClassErrors ? '#d32f2f' : theme.text?.primary, 
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              {hasClassErrors && <WarningIcon fontSize="small" color="error" />}
              {translations.class || 'Class'} {index + 1} {classItem.classId ? `(ID: ${classItem.classId})` : ''}
            </Typography>
            
            {scheduledClasses.length > 1 && !classItem.classId && (
              <IconButton 
                size="small" 
                onClick={() => handleRemoveClass(index)}
                sx={{ 
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: '#FF5252',
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <DatePicker
                    label={translations.date || 'Date'}
                    value={classItem.date ? moment(classItem.date) : null}
                    onChange={(newDate) => {
                      if (!newDate && !classItem.date) return; // No change
                      const formattedDate = newDate ? newDate.format('YYYY-MM-DD') : '';
                      if (formattedDate === classItem.date) return; // No change
                      handleChangeClass(index, 'date', formattedDate);
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: "outlined",
                        size: "small",
                        sx: {
                          ...textFieldStyle(theme),
                          ...(hasClassErrors && {
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d32f2f',
                              },
                              '&:hover fieldset': {
                                borderColor: '#d32f2f',
                              },
                            }
                          })
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <TimePicker
                    label={translations.startTime || 'Start Time'}
                    value={classItem.startTime ? moment(classItem.startTime, 'HH:mm') : null}
                    onChange={(newTime) => {
                      const formattedTime = newTime ? newTime.format('HH:mm') : '';
                      handleChangeClass(index, 'startTime', formattedTime);
                    }}
                    ampm={false} // Use 24-hour format
                    minutesStep={15} // 15-minute intervals
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: "outlined",
                        size: "small",
                        sx: {
                          ...textFieldStyle(theme),
                          '& .MuiInputBase-input': {
                            ...textFieldStyle(theme)['& .MuiInputBase-input'],
                            padding: '8.5px 14px',
                          },
                          ...(hasClassErrors && {
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d32f2f',
                              },
                              '&:hover fieldset': {
                                borderColor: '#d32f2f',
                              },
                            }
                          })
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <TimePicker
                    label={translations.endTime || 'End Time'}
                    value={classItem.endTime ? moment(classItem.endTime, 'HH:mm') : null}
                    onChange={(newTime) => {
                      const formattedTime = newTime ? newTime.format('HH:mm') : '';
                      handleChangeClass(index, 'endTime', formattedTime);
                    }}
                    ampm={false} // Use 24-hour format
                    minutesStep={15} // 15-minute intervals
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: "outlined",
                        size: "small",
                        sx: {
                          ...textFieldStyle(theme),
                          '& .MuiInputBase-input': {
                            ...textFieldStyle(theme)['& .MuiInputBase-input'],
                            padding: '8.5px 14px',
                          },
                          ...(hasClassErrors && {
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d32f2f',
                              },
                              '&:hover fieldset': {
                                borderColor: '#d32f2f',
                              },
                            }
                          })
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              
              {hasClassErrors && (
                <Grid item xs={12}>
                  {classErrors.map((error, errorIndex) => (
                    <Typography 
                      key={errorIndex} 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        color: '#d32f2f', 
                        mt: 0.5 
                      }}
                    >
                      • {error}
                    </Typography>
                  ))}
                </Grid>
              )}
            </Grid>
          </Box>
        );
      })}
      
      {scheduledClasses.length > 0 && (
        <Box sx={{ 
          mt: 1, 
          display: 'flex', 
          flexDirection: 'column',
          gap: 1
        }}>
          <Box sx={{
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography 
              variant="caption" 
              sx={{
                color: hasErrors ? '#ff9800' : isComplete ? '#4caf50' : '#ff9800',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              {!hasErrors && isComplete && <CheckIcon fontSize="small" />}
              {scheduledClasses.length} / {maxClasses} {translations.classes || 'classes'} scheduled
              {!allClassesValid && ` (${validClasses.length} ${translations.valid || 'valid'})`}
            </Typography>
          
            {canAddMore && (
              <Button
                size="small"
                variant="text"
                onClick={handleAddClass}
                startIcon={<AddIcon />}
                disabled={scheduledClasses.length >= maxClasses}
                sx={{
                  color: '#845EC2',
                  '&.Mui-disabled': {
                    color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.38)' : 'rgba(255, 255, 255, 0.38)',
                  }
                }}
              >
                {translations.addClass || 'Add Class'}
              </Button>
            )}
          </Box>
          
          {(!isComplete || hasErrors) && (
            <Alert 
              severity={hasErrors ? "error" : allClassesValid ? "warning" : "error"} 
              sx={{ 
                mt: 1, 
                '& .MuiAlert-message': { 
                  fontSize: '0.8rem' 
                },
                py: 0
              }}
            >
              {hasErrors 
                ? (translations.fixClassErrors || 'Please fix the highlighted class errors') 
                : !allClassesValid 
                  ? (translations.completeAllFields || 'Please complete all class fields') 
                  : !allClassesScheduled 
                    ? (translations.scheduleAllClasses || `You must schedule exactly ${maxClasses} classes for this package. Currently scheduled: ${validClasses.length}`) 
                    : ''}
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
});

export default ClassSchedulingForm; 