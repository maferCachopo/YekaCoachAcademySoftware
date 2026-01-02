import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  TextField, Button, Grid, MenuItem, Avatar, CircularProgress,
  FormControlLabel, Switch, Alert, Divider, Chip, Tooltip
} from '@mui/material';
import { Edit as EditIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { studentAPI, packageAPI, classAPI } from '../../../utils/api';
import { textFieldStyle } from '../utils/styles';
import ClassSchedulingForm from './ClassSchedulingForm';
import TeacherAvailabilityCalendar from './TeacherAvailabilityCalendar';
import { fetchWithAuth } from '../../../utils/api';
import moment from 'moment';

const EditDialog = ({ 
  open, 
  onClose, 
  student, 
  formData, 
  setFormData, 
  packages, 
  scheduledClasses,
  setScheduledClasses, 
  existingClasses,
  setExistingClasses,
  setMessage,
  refreshStudents
}) => {
  const [loading, setLoading] = useState(false);
  const [packageDetails, setPackageDetails] = useState(null);
  const [packageLoading, setPackageLoading] = useState(false);
  const [classesTaken, setClassesTaken] = useState(0);
  const [packageError, setPackageError] = useState("");
  const [isResetPackage, setIsResetPackage] = useState(false);
  const [originalPackageId, setOriginalPackageId] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [teacherValidationFn, setTeacherValidationFn] = useState(null);
  const formInitialized = useRef(false);
  const { theme } = useTheme();
  const { translations } = useLanguage();
  
  // When dialog opens, store the original package ID and fetch teachers
  useEffect(() => {
    if (open && student?.id && !formInitialized.current) {
      if (formData.package) {
        setOriginalPackageId(formData.package);
      }
      
      // Ensure zoomLink is populated from student data if it exists
      if (student.zoomLink && !formData.zoomLink) {
        setFormData(prev => ({
          ...prev,
          zoomLink: student.zoomLink
        }));
      }
      
      // Ensure allowDifferentTeacher is populated from student data
      if (student.allowDifferentTeacher !== undefined) {
        setFormData(prev => ({
          ...prev,
          allowDifferentTeacher: student.allowDifferentTeacher
        }));
      }
      
      // Fetch teachers
      fetchTeachers();
      formInitialized.current = true;
    }
    
    // Reset initialization flag when dialog closes
    if (!open) {
      formInitialized.current = false;
    }
  }, [open, student?.id]);

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

    // For modification, we can only change existing class times, not add new ones
    // unless it's a new package
    if (!isResetPackage && scheduledClasses.length >= selectedPackage.totalClasses) {
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
          text: translations.canOnlyModifyExistingClasses || 'You can only modify existing class times, not add new classes',
          severity: 'warning'
        });
      }
    } else {
      // For new packages or empty slots, allow adding classes
      if (scheduledClasses.length < selectedPackage.totalClasses) {
        const newClass = {
          id: `class-${scheduledClasses.length}`,
          date: slot.date,
          startTime: slot.start,
          endTime: slot.end,
          teacherId: selectedTeacher
        };
        
        setScheduledClasses([...scheduledClasses, newClass]);
      }
    }
  };

  // Handle teacher availability validation function
  const handleAvailabilityValidation = (validationFn) => {
    setTeacherValidationFn(() => validationFn);
  };
  
  // Fetch classes when dialog opens and package changes
  useEffect(() => {
    if (open && student?.id && formData.package) {
      console.log('Fetching classes for student:', student.id, 'package:', formData.package);
      fetchPackageAndClasses();
    } else {
      setExistingClasses([]);
      setPackageDetails(null);
      setClassesTaken(0);
      setPackageError("");
    }
  }, [open, student?.id, formData.package]);
  
  // Fetch package details and student classes
  const fetchPackageAndClasses = async () => {
    setPackageLoading(true);
    try {
      // Get package details first
      const packageId = Number(formData.package);
      const packageData = await packageAPI.getPackageById(packageId);
      setPackageDetails(packageData);
      
      // Get all student classes
      const allClasses = await studentAPI.getStudentClasses(student.id);
      
      // Find the student's active package to check when it was assigned
      const studentPackages = await studentAPI.getStudentPackages(student.id);
      const activePackage = studentPackages.find(p => 
        p.packageId === packageId && p.status === 'active'
      );
      
      if (!activePackage) {
        setPackageError("No active package found for this student");
        setExistingClasses([]);
        setClassesTaken(0);
        setPackageLoading(false);
        return;
      }
      
      // Calculate package end date based on start date and duration months
      const packageStartDate = moment(activePackage.startDate);
      const packageEndDate = moment(activePackage.endDate);
      
      // Count how many classes have been taken/attended
      const packageClasses = allClasses.filter(c => c.studentPackageId === activePackage.id);
      const attendedClasses = packageClasses.filter(c => c.status === 'attended').length;
      setClassesTaken(attendedClasses);
      
      // Filter only scheduled classes for this package
      const scheduledPackageClasses = packageClasses.filter(c => 
        c.status === 'scheduled'
      );
      
      // Set existing classes
      setExistingClasses(scheduledPackageClasses);
      
      // Prepare scheduledClasses for ClassSchedulingForm
      if (scheduledPackageClasses.length > 0) {
        const formattedClasses = scheduledPackageClasses.map(cls => ({
          id: cls.id,
          classId: cls.classId,
          date: cls.classDetail?.date ? moment(cls.classDetail.date).format('YYYY-MM-DD') : '',
          startTime: cls.classDetail?.startTime || '',
          endTime: cls.classDetail?.endTime || '',
          status: cls.status || 'scheduled'
        }));
        
        // Initialize scheduledClasses with the existing scheduled classes
        setScheduledClasses(formattedClasses);
      } else {
        // If no existing scheduled classes, start with an empty array
        setScheduledClasses([]);
      }
      
      // Check if there's any package limit error
      if (packageData.totalClasses <= attendedClasses) {
        setPackageError(`All ${packageData.totalClasses} classes in this package have been used.`);
      } else if (moment().isAfter(packageEndDate)) {
        setPackageError(`Package has expired. End date was ${packageEndDate.format('YYYY-MM-DD')}.`);
      }
    } catch (error) {
      console.error('Error fetching package and classes:', error);
      setExistingClasses([]);
      setPackageDetails(null);
      setPackageError("Error loading package details");
    } finally {
      setPackageLoading(false);
    }
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
    
    // If changing package and it's different from original, mark as reset package
    if (name === 'package' && value !== originalPackageId) {
      setIsResetPackage(true);
    }
  };
  
  const handleResetPackage = () => {
    setIsResetPackage(true);
    // Clear scheduled classes since we're resetting the package
    setScheduledClasses([]);
    setExistingClasses([]);
  };
  
  const handleUndoResetPackage = () => {
    setIsResetPackage(false);
    // Restore original package
    setFormData(prev => ({ ...prev, package: originalPackageId }));
    // Re-fetch classes for the original package
    fetchPackageAndClasses();
  };
  
  const handleSaveStudent = async () => {
    try {
      setLoading(true);
      
      // Validate form data
      if (!formData.name || !formData.surname || !formData.email || !formData.username) {
        setMessage({
          open: true,
          text: 'Please fill in all required fields.',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      // Check if password and confirm password match
      if (formData.password && formData.password !== formData.confirmPassword) {
        setMessage({
          open: true,
          text: 'Passwords do not match.',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      // Check if a package is selected and classes are scheduled correctly
      // Only validate classes if we're not resetting the package
      if (formData.package && !isResetPackage) {
        // Find the package in the packages array
        const selectedPackage = packages.find(pkg => pkg.id === formData.package);
        
        if (selectedPackage) {
          // Get the total classes required by the package
          const requiredClasses = selectedPackage.totalClasses;
          
          // Count valid scheduled classes (with date, start time, and end time)
          const validClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime);
          
          // For existing packages, we should only allow modification of existing classes, not adding new ones
          // unless the current scheduled classes count is less than the package requirements
          const existingClassesCount = existingClasses.length;
          const newClassesCount = scheduledClasses.filter(cls => !cls.classId).length;
          
          // Allow new classes only if we have fewer than required classes
          if (existingClassesCount + newClassesCount > requiredClasses) {
            setMessage({
              open: true,
              text: translations.cannotAddExtraClasses || `Cannot add extra classes. Package allows ${requiredClasses} classes maximum.`,
              severity: 'error'
            });
            setLoading(false);
            return;
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
                setLoading(false);
                return;
              }
            }
          }
        }
      }
      
      // Create update data - only include password if it was entered
      const updateData = {
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        username: formData.username,
        birthDate: formData.birthDate || null,
        phone: formData.phone,
        city: formData.city,
        country: formData.country,
        active: formData.active,
        zoomLink: formData.zoomLink || null,
        allowDifferentTeacher: formData.allowDifferentTeacher || false,
        // Important: include a flag to update user details too
        updateUser: true,
        ...(formData.password ? { password: formData.password } : {})
      };
      
      // Add debug logging
      console.log('DEBUG - Updating student - Student ID:', student.id);
      console.log('DEBUG - Updating student - Update data:', updateData);
      
      const updatedStudent = await studentAPI.updateStudent(student.id, updateData);
      console.log('DEBUG - Student update response:', updatedStudent);
      
      // If package reset or changed, handle package assignment differently
      if (formData.package) {
        if (isResetPackage || formData.package !== originalPackageId) {
          // Mark any existing active package as completed
          if (originalPackageId) {
            const studentPackages = await studentAPI.getStudentPackages(student.id);
            const existingActivePackage = studentPackages.find(p => 
              p.status === 'active' && p.packageId === Number(originalPackageId)
            );
            
            if (existingActivePackage) {
              console.log('DEBUG - Marking existing package as completed - Package ID:', existingActivePackage.id);
              await studentAPI.updateStudentPackage(student.id, existingActivePackage.id, {
                status: 'completed'
              });
            }
          }
          
          // Assign new package
          const packageDetails = await packageAPI.getPackageById(formData.package);
          
          // Calculate end date based on the package's durationMonths
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + packageDetails.durationMonths);
          
          console.log('DEBUG - Assigning new package - Student ID:', student.id);
          console.log('DEBUG - Assigning package - Package data:', {
            packageId: formData.package,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          });
          
          const packageResponse = await studentAPI.assignPackage(student.id, {
            packageId: formData.package,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          });
          
          console.log('DEBUG - Package assignment response:', packageResponse);
        } else {
          // Same package - update the existing package if needed
          const studentPackages = await studentAPI.getStudentPackages(student.id);
          const existingActivePackage = studentPackages.find(p => 
            p.status === 'active' && p.packageId === Number(formData.package)
          );
          
          if (existingActivePackage) {
            console.log('DEBUG - Updating existing package - Package ID:', existingActivePackage.id);
            
            // Update the package based on scheduled classes
            if (scheduledClasses.length > 0) {
              // Count how many scheduled classes we have
              const newClassesCount = scheduledClasses.filter(cls => !cls.classId).length;
              
              if (newClassesCount > 0) {
                // Make sure remaining classes reflects scheduled classes
                const updatedRemainingClasses = Math.max(
                  newClassesCount,
                  existingActivePackage.remainingClasses || 0
                );
                
                console.log('DEBUG - Updating remaining classes to:', updatedRemainingClasses);
                
                // Update the remaining classes in the package
                await studentAPI.updateStudentPackage(student.id, existingActivePackage.id, {
                  remainingClasses: updatedRemainingClasses
                });
              }
            }
          }
        }
      }
      
      // Update existing classes that have been modified
      const classesWithIds = scheduledClasses.filter(cls => cls.classId);
      if (classesWithIds.length > 0) {
        console.log('DEBUG - Checking for updated existing classes');
        
        // Compare with the original existing classes to see if any details changed
        for (const updatedClass of classesWithIds) {
          const originalClass = existingClasses.find(cls => cls.classId === updatedClass.classId);
          
          // If we found the original class
          if (originalClass) {
            const classDate = updatedClass.date;
            const classStartTime = updatedClass.startTime;
            const classEndTime = updatedClass.endTime;
            
            // Check if any details changed
            const originalDate = originalClass.classDetail?.date ? 
              moment(originalClass.classDetail.date).format('YYYY-MM-DD') : '';
            const originalStartTime = originalClass.classDetail?.startTime || '';
            const originalEndTime = originalClass.classDetail?.endTime || '';
            
            const hasChanges = 
              classDate !== originalDate || 
              classStartTime !== originalStartTime || 
              classEndTime !== originalEndTime;
            
            if (hasChanges) {
              console.log(`DEBUG - Updating class ${updatedClass.classId} - Original:`, {
                date: originalDate,
                startTime: originalStartTime,
                endTime: originalEndTime
              });
              
              console.log(`DEBUG - Updating class ${updatedClass.classId} - Updated:`, {
                date: classDate,
                startTime: classStartTime,
                endTime: classEndTime
              });
              
              // Update the class in the database
              try {
                // Create a clean update object that only includes defined values
                const updateData = {};
                
                // Only include date if it exists and is valid
                if (classDate) {
                  updateData.date = classDate;
                }
                
                // Only include times if they exist
                if (classStartTime) {
                  updateData.startTime = classStartTime;
                }
                
                if (classEndTime) {
                  updateData.endTime = classEndTime;
                }
                
                console.log(`DEBUG - Sending class update with data:`, updateData);
                
                // Check if we have any data to update
                if (Object.keys(updateData).length > 0) {
                  // The API expects the class ID directly, not the student ID and class ID
                  await classAPI.updateClass(updatedClass.classId, updateData);
                  console.log(`DEBUG - Successfully updated class ${updatedClass.classId}`);
                } else {
                  console.log(`DEBUG - No valid update data for class ${updatedClass.classId}`);
                }
              } catch (error) {
                console.error(`Error updating class ${updatedClass.classId}:`, error);
                throw new Error(`Failed to update class: ${error.message}`);
              }
            } else {
              console.log(`DEBUG - No changes detected for class ${updatedClass.classId}`);
            }
          }
        }
      }
      
      // Schedule new classes if any valid ones exist
      if (scheduledClasses.length > 0) {
        console.log('DEBUG - Scheduling classes - Student ID:', student.id);
        
        // Find the student's active package to get the correct studentPackageId
        const studentPackages = await studentAPI.getStudentPackages(student.id);
        const activePackage = studentPackages.find(p => 
          p.packageId === Number(formData.package) && p.status === 'active'
        );
        
        if (!activePackage) {
          console.error('ERROR - No active package found for student after package assignment');
          throw new Error('Failed to find active package');
        }
        
        // Filter out any existing classes (that already have a classId)
        const newClasses = scheduledClasses.filter(cls => !cls.classId);
        
        // Only attempt to schedule if there are new classes
        if (newClasses.length > 0) {
          console.log('DEBUG - Scheduling new classes - Count:', newClasses.length);
          console.log('DEBUG - Scheduling classes - Classes data:', {
            packageId: formData.package,
            classes: newClasses,
            studentPackageId: activePackage.id
          });
          
          const classesResponse = await studentAPI.scheduleClasses(student.id, {
            packageId: formData.package,
            classes: newClasses,
            studentPackageId: activePackage.id
          });
          
          console.log('DEBUG - Classes scheduling response:', classesResponse);
        } else {
          console.log('DEBUG - No new classes to schedule');
        }
      } else {
        console.log('DEBUG - No classes to schedule');
      }
      
      // Show success message
      setMessage({
        open: true,
        text: 'Student updated successfully!',
        severity: 'success'
      });
      
      // Refresh the students list
      refreshStudents();
      
      // Close the dialog
      onClose();
      
    } catch (error) {
      console.error('Error updating student:', error);
      setMessage({
        open: true,
        text: error.message || 'Error updating student. Please try again.',
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

  // Calculate remaining classes based on package and classes taken
  const remainingClasses = packageDetails ? packageDetails.totalClasses - classesTaken : 0;
  
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
        <EditIcon sx={{ color: '#0095DA' }} />
        {translations.editStudent || 'Edit Student'}
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
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <TextField
                select
                label={translations.package || 'Package'}
                name="package"
                value={formData.package}
                onChange={handleFormChange}
                fullWidth
                variant="outlined"
                margin="normal"
                disabled={isResetPackage && !formData.package}
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
              
              {formData.package && formData.package === originalPackageId && !isResetPackage && (
                <Tooltip title={translations.resetPackage || "Reset package (start new package cycle)"}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleResetPackage}
                    sx={{
                      mt: 1,
                      height: 40,
                      minWidth: 100,
                      ...secondaryButtonStyle
                    }}
                  >
                    {translations.reset || 'Reset'}
                  </Button>
                </Tooltip>
              )}
              
              {isResetPackage && (
                <Tooltip title={translations.undoReset || "Undo reset and keep current package"}>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleUndoResetPackage}
                    sx={{
                      mt: 1,
                      height: 40,
                      minWidth: 100,
                    }}
                  >
                    {translations.undo || 'Undo'}
                  </Button>
                </Tooltip>
              )}
            </Box>
            
            {isResetPackage && formData.package && (
              <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
                {translations.packageResetInfo || "You're assigning a new package. This will mark the current package as completed."}
              </Alert>
            )}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active !== false}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    color="success"
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
                label={translations.activeStatus || "Active Status"}
                sx={{ color: theme.text?.primary }}
              />
              
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
                sx={{ color: theme.text?.primary }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                mt: 2, 
                mb: 1, 
                fontWeight: 500, 
                color: theme.text?.primary 
              }}
            >
              {translations.changePassword || 'Change Password'} 
              <Typography component="span" variant="caption" sx={{ ml: 1, color: theme.text?.secondary }}>
                ({translations.leaveBlankToKeep || 'Leave blank to keep current password'})
              </Typography>
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.newPassword || 'New Password'}
              name="password"
              type="password"
              value={formData.password}
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
              label={translations.confirmPassword || 'Confirm Password'}
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
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
        </Grid>
        
        {(formData.package && !isResetPackage) && (
          <Box sx={{ 
            mt: 4, 
            p: 3, 
            bgcolor: theme.mode === 'light' 
              ? 'rgba(132, 94, 194, 0.05)' 
              : 'rgba(132, 94, 194, 0.15)', 
            borderRadius: 3 
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: theme.text?.primary }}>
                {translations.scheduleClasses || 'Schedule Classes'}
              </Typography>
              
              {originalPackageId && formData.package === originalPackageId && existingClasses.length > 0 && (
                <Chip 
                  label={`${existingClasses.length} ${translations.scheduledClasses || 'scheduled classes'}`} 
                  color="primary" 
                  variant="outlined"
                  sx={{
                    borderColor: '#845EC2',
                    color: theme.mode === 'light' ? '#845EC2' : '#B39CD0'
                  }}
                />
              )}
            </Box>
            
            {packageLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} sx={{ color: '#845EC2' }} />
              </Box>
            ) : packageError ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {packageError}
              </Alert>
            ) : (
              <>
                {packageDetails && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: theme.text?.secondary, mb: 1 }}>
                      Package: <strong>{packageDetails.name}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.text?.secondary }}>
                      Total classes: {packageDetails.totalClasses}, 
                      Used: {classesTaken}, 
                      Remaining: {remainingClasses}
                    </Typography>
                  </Box>
                )}
                
                <ClassSchedulingForm
                  scheduledClasses={scheduledClasses}
                  setScheduledClasses={setScheduledClasses}
                  existingClasses={existingClasses}
                  studentId={student?.id}
                  packageId={formData.package}
                  teacherId={selectedTeacher}
                  teacherValidationFn={teacherValidationFn}
                />
              </>
            )}
          </Box>
        )}

        {selectedTeacher && (formData.package && !isResetPackage) && (
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
        
        {isResetPackage && formData.package && (
          <Box sx={{ 
            mt: 4, 
            p: 3, 
            bgcolor: theme.mode === 'light' 
              ? 'rgba(132, 94, 194, 0.05)' 
              : 'rgba(132, 94, 194, 0.15)', 
            borderRadius: 3 
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>
              {translations.newPackageInfo || 'New Package Information'}
            </Typography>
            
            {packageDetails && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {translations.newPackageSelected || 'New package selected'}: <strong>{packageDetails.name}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  • {translations.totalClasses || 'Total classes'}: {packageDetails.totalClasses}
                </Typography>
                <Typography variant="body2">
                  • {translations.duration || 'Duration'}: {packageDetails.durationMonths} {translations.months || 'months'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {translations.scheduleClassesAfterSave || 'You can schedule classes after saving the changes.'}
                </Typography>
              </Alert>
            )}
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
          onClick={handleSaveStudent}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{
            ...primaryButtonStyle,
            minWidth: 120,
            height: 42,
          }}
        >
          {loading ? (translations.saving || 'Saving...') : (translations.saveChanges || 'Save Changes')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDialog; 