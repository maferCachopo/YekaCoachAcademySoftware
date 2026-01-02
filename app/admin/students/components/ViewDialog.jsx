import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, Typography, Avatar, IconButton,
  Grid, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Chip, CircularProgress, Tabs, Tab, Accordion, AccordionSummary,
  AccordionDetails, Button, Divider
} from '@mui/material';
import {
  School as SchoolIcon,
  CalendarMonth as CalendarIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { studentAPI, adminAPI } from '../../../utils/api';

const ViewDialog = ({ open, onClose, student, setMessage }) => {
  const [loading, setLoading] = useState(false);
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false);
  const [refreshedData, setRefreshedData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [packageHistoryExpanded, setPackageHistoryExpanded] = useState(false);
  const themeContext = useTheme();
  const { theme } = themeContext || { theme: {} };
  const { translations } = useLanguage() || { translations: {} };
  const effectRan = useRef(false);

  // Use effect to update status when dialog opens
  useEffect(() => {
    if (open && student?.id && !effectRan.current) {
      effectRan.current = true;
      // Re-enable automatic status update
      handleUpdateStatus(student?.id, false);
    }
    
    // Reset effect tracking and refreshed data when dialog closes
    if (!open) {
      effectRan.current = false;
      setRefreshedData(null);
      setActiveTab(0);
    }
  }, [open, student?.id]);

  // Check if student is not defined
  if (!student) {
    return null;
  }
  
  // Use the refreshed data if available, otherwise use the original student data
  const displayStudent = refreshedData || student;
  
  // Get current active package and past packages
  const activePackage = displayStudent.packages?.find(p => p.status === 'active');
  const pastPackages = displayStudent.allPackages?.filter(p => p.status !== 'active') || [];
  
  // Get current package classes and split past classes by package
  const currentClasses = displayStudent.classes || [];
  const allClasses = displayStudent.allClasses || [];
  const classesByPackage = displayStudent.classesByPackage || {};
  
  // Add debug logs to help troubleshoot
  console.log('DEBUG - Current Classes:', currentClasses);
  console.log('DEBUG - All Classes:', allClasses);

  const handleUpdateStatus = async (studentId, showLoading = true) => {
    if (!studentId) return;
    
    if (showLoading) setUpdateStatusLoading(true);
    try {
      const response = await adminAPI.updateStudentClassStatus(studentId);
      
      // Check if classes were updated
      if (response && response.updatedCount > 0) {
        setMessage({
          open: true,
          text: `${response.updatedCount} class(es) updated successfully`,
          severity: 'success'
        });
      } else {
        setMessage({
          open: true,
          text: 'No classes needed to be updated',
          severity: 'info'
        });
      }
      
      // Refresh student data after updating status
      if (student && student.id) {
        try {
          // Get the latest student data with package information
          const latestStudentData = await studentAPI.getStudentById(student.id);
          
          // Get all student packages (including past packages with history)
          const allPackages = await studentAPI.getStudentPackages(student.id);
          
          // Get all student classes
          const allClasses = await studentAPI.getStudentClasses(student.id);
          
          // Filter classes and count statuses
          const scheduledClasses = allClasses.filter(c => c.status === 'scheduled');
          const scheduledClassesCount = scheduledClasses.length;
          const attendedClasses = allClasses.filter(c => c.status === 'attended');
          
          // Find package with same ID as scheduled classes (if any)
          const relevantPackageIds = new Set(scheduledClasses.map(c => c.studentPackageId));
          
          // Process each package that has scheduled classes
          for (const packageId of relevantPackageIds) {
            const packageWithScheduledClasses = allPackages.find(p => p.id === packageId);
            if (packageWithScheduledClasses) {
              // Count scheduled classes for this specific package
              const packageScheduledClasses = scheduledClasses.filter(c => c.studentPackageId === packageId);
              
              // If package is completed but has scheduled classes, manually fix it
              if (packageWithScheduledClasses.status === 'completed' && packageScheduledClasses.length > 0) {
                packageWithScheduledClasses.status = 'active';
                packageWithScheduledClasses.remainingClasses = Math.max(packageScheduledClasses.length, packageWithScheduledClasses.remainingClasses || 0);
              }
            }
          }
          
          // Update the active package (if any) with correct remaining classes
          const activePackage = allPackages.find(p => p.status === 'active');
          if (activePackage) {
            const packageScheduledClasses = scheduledClasses.filter(c => c.studentPackageId === activePackage.id);
            
            // Set remaining classes to match the number of scheduled classes
            // This aligns with the backend logic that remaining classes = scheduled classes
            activePackage.remainingClasses = packageScheduledClasses.length;
            
            console.log('DEBUG - Recalculating remaining classes for ViewDialog:', {
              packageId: activePackage.id,
              scheduledClassCount: packageScheduledClasses.length,
              newRemainingClasses: activePackage.remainingClasses
            });
          }
          
          // Group classes by package ID
          const classesByPackage = {};
          
          allClasses.forEach(classItem => {
            // Initialize array for this package if not exists
            if (!classesByPackage[classItem.studentPackageId]) {
              classesByPackage[classItem.studentPackageId] = [];
            }
            
            // Add class to the appropriate package group
            classesByPackage[classItem.studentPackageId].push(classItem);
          });
          
          // Update the refreshed data
          setRefreshedData({
            ...latestStudentData,
            allPackages: allPackages,
            allClasses: allClasses,
            classes: allClasses.filter(c => activePackage && c.studentPackageId === activePackage.id),
            classesByPackage: classesByPackage
          });
        } catch (error) {
          console.error('Error refreshing student data:', error);
        }
      }
      
    } catch (error) {
      console.error('Error updating class status:', error);
      setMessage({
        open: true,
        text: 'Failed to update class status',
        severity: 'error'
      });
    } finally {
      if (showLoading) setUpdateStatusLoading(false);
    }
  };
  
  // Function to render class table for a given set of classes
  const renderClassTable = (classes, isPast = false, tableType = 'default') => {
    if (!classes || classes.length === 0) {
      let message = '';
      let subMessage = '';
      
      switch (tableType) {
        case 'attended':
          message = translations.noAttendedClasses || 'No attended classes found';
          subMessage = translations.attendedClassesWillAppear || 'Attended classes will appear here';
          break;
        case 'scheduled':
          message = translations.noClassesScheduled || 'No classes scheduled';
          subMessage = translations.scheduledClassesWillAppear || 'When classes are scheduled, they will appear here';
          break;
        case 'missed':
          message = translations.noMissedClasses || 'No missed classes';
          subMessage = translations.missedClassesWillAppear || 'Missed classes will appear here';
          break;
        default:
          message = isPast ? (translations.noPastClasses || 'No past classes found') : (translations.noClassesScheduled || 'No classes scheduled');
          subMessage = isPast ? (translations.pastClassesWillAppear || 'Past classes will appear here') : (translations.scheduledClassesWillAppear || 'When classes are scheduled, they will appear here');
      }
      
      return (
        <Box 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            border: '1px dashed',
            borderColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)',
            borderRadius: 2,
            backgroundColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
          }}
        >
          <Typography variant="body1" sx={{ color: theme.text?.secondary, mb: 1 }}>
            {message}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.text?.disabled }}>
            {subMessage}
          </Typography>
        </Box>
      );
    }
    
    return (
      <TableContainer 
        component={Paper} 
        variant="outlined"
        sx={{ 
          boxShadow: 'none',
          border: theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 2,
          mb: 2,
          overflow: 'hidden'
        }}
      >
        <Table size="small">
          <TableHead sx={{ 
            backgroundColor: theme.mode === 'light' 
              ? 'rgba(132, 94, 194, 0.08)' 
              : 'rgba(0, 0, 0, 0.3)'
          }}>
            <TableRow>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: theme.text?.primary 
              }}>{translations.date || 'Date'}</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: theme.text?.primary 
              }}>{translations.time || 'Time'}</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: theme.text?.primary 
              }}>{translations.status || 'Status'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ 
            bgcolor: theme.mode === 'light' 
              ? '#fff' 
              : '#1e1e2d'
          }}>
            {classes.map((classItem) => {
              // Safely create date object for sorting and display
              let classDate;
              try {
                // Correctly extract the date from the classDetail property
                if (classItem.classDetail && classItem.classDetail.date) {
                  classDate = new Date(classItem.classDetail.date);
                } else if (classItem.date) {
                  classDate = new Date(classItem.date);
                } else {
                  // Fallback if no date is found
                  classDate = new Date();
                }
                
                // Check if date is valid
                if (isNaN(classDate.getTime())) {
                  classDate = new Date(); // Fallback to current date
                }
              } catch (error) {
                console.error('Error parsing class date:', error);
                classDate = new Date(); // Fallback to current date
              }
              
              // Check if class is in the past or future
              const now = new Date();
              const isPast = classDate < now;
              
              return (
                <TableRow 
                  key={classItem.id || `class-${Math.random()}`}
                  sx={{
                    backgroundColor: isPast && classItem.status === 'scheduled' 
                      ? theme.mode === 'light' ? 'rgba(255, 152, 0, 0.08)' : 'rgba(255, 152, 0, 0.12)'
                      : 'inherit',
                    '&:hover': {
                      backgroundColor: theme?.mode === 'light' 
                        ? 'rgba(0, 0, 0, 0.02)' 
                        : 'rgba(255, 255, 255, 0.03)',
                    },
                  }}
                >
                  <TableCell sx={{ color: theme.text?.primary }}>
                    {classDate.toISOString().split('T')[0]}
                  </TableCell>
                  <TableCell sx={{ color: theme.text?.primary }}>
                    {(classItem.time || 
                      (classItem.classDetail && (classItem.classDetail.startTime || classItem.classDetail.endTime)))
                      ? `${classItem.time || classItem.classDetail?.startTime || ''}${
                          classItem.classDetail?.endTime 
                          ? (classItem.time || classItem.classDetail?.startTime ? ' - ' : '') + classItem.classDetail.endTime 
                          : ''}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={classItem.status || 'unknown'}
                      sx={{
                        fontWeight: 500,
                        backgroundColor: 
                          classItem.status === 'scheduled'
                            ? theme.mode === 'light' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.2)'
                            : classItem.status === 'attended'
                            ? theme.mode === 'light' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.2)'
                            : classItem.status === 'missed'
                            ? theme.mode === 'light' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.2)'
                            : classItem.status === 'cancelled'
                            ? theme.mode === 'light' ? 'rgba(158, 158, 158, 0.1)' : 'rgba(158, 158, 158, 0.2)'
                            : theme.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                        color:
                          classItem.status === 'scheduled'
                            ? '#1976d2'
                            : classItem.status === 'attended'
                            ? '#2e7d32'
                            : classItem.status === 'missed'
                            ? '#d32f2f'
                            : classItem.status === 'cancelled'
                            ? '#9e9e9e'
                            : theme.text?.primary,
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Function to render package history
  const renderPackageHistory = () => {
    // Log only the package history to console
    console.log('Student Package History:', displayStudent.allPackages);
    
    if (!displayStudent.allPackages || displayStudent.allPackages.length === 0) {
      return (
        <Box 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            border: '1px dashed',
            borderColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)',
            borderRadius: 2,
            backgroundColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
            mt: 2
          }}
        >
          <Typography variant="body1" sx={{ color: theme.text?.secondary, mb: 1 }}>
            {translations.noPackageHistory || 'No package history available'}
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 2 }}>
        <TableContainer 
          component={Paper} 
          variant="outlined"
          sx={{ 
            boxShadow: 'none',
            border: theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Table size="small">
            <TableHead sx={{ 
              backgroundColor: theme.mode === 'light' 
                ? 'rgba(132, 94, 194, 0.08)' 
                : 'rgba(0, 0, 0, 0.3)'
            }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>
                  {translations.packageName || 'Package Name'}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>
                  {translations.startDate || 'Start Date'}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>
                  {translations.endDate || 'End Date'}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>
                  {translations.status || 'Status'}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={{ 
              bgcolor: theme.mode === 'light' 
                ? '#fff' 
                : '#1e1e2d'
            }}>
              {displayStudent.allPackages.map((pkg) => (
                <TableRow 
                  key={pkg.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: theme?.mode === 'light' 
                        ? 'rgba(0, 0, 0, 0.02)' 
                        : 'rgba(255, 255, 255, 0.03)',
                    },
                  }}
                >
                  <TableCell sx={{ color: theme.text?.primary }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SchoolIcon sx={{ color: '#845EC2', fontSize: '1rem' }} />
                      {pkg.package?.name || 'Unknown Package'}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: theme.text?.primary }}>
                    {pkg.startDate ? new Date(pkg.startDate).toISOString().split('T')[0] : 'N/A'}
                  </TableCell>
                  <TableCell sx={{ color: theme.text?.primary }}>
                    {pkg.endDate ? new Date(pkg.endDate).toISOString().split('T')[0] : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={pkg.status || 'unknown'}
                      sx={{
                        fontWeight: 500,
                        bgcolor: pkg.status === 'active'
                          ? theme.mode === 'light' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.2)' 
                          : theme.mode === 'light' ? 'rgba(158, 158, 158, 0.1)' : 'rgba(158, 158, 158, 0.2)',
                        color: pkg.status === 'active' ? '#2e7d32' : '#9e9e9e'
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

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
          overflow: 'hidden',
          background: theme.mode === 'light' 
            ? '#ffffff' 
            : '#151521'
        }
      }}
    >
      <DialogTitle
        sx={{
          pb: 2,
          borderBottom: theme?.mode === 'light' 
            ? '1px solid rgba(0, 0, 0, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.12)',
          color: theme?.text?.primary,
          px: 3,
          pt: 3,
          fontSize: '1.5rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              bgcolor: '#845EC2', 
              color: '#fff', 
              fontWeight: 'bold',
              width: 40,
              height: 40,
              mr: 2
            }}
          >
            {displayStudent.name ? displayStudent.name[0].toUpperCase() : 'S'}
          </Avatar>
          <Typography variant="h6" component="div" sx={{ color: theme.text?.primary }}>
            {displayStudent.name} {displayStudent.surname}
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: theme.text?.primary }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3, pb: 4, overflow: 'auto', backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Box sx={{ mb: 4 }}></Box>
        {updateStatusLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress sx={{ color: '#845EC2' }} />
            <Typography variant="body1" sx={{ ml: 2, color: theme.text?.secondary }}>
              {translations.updatingClassStatus || 'Updating class status...'}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ 
              p: 3, 
              background: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.05)' : 'rgba(132, 94, 194, 0.1)',
              borderRadius: 3,
              mb: 3,
            }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ 
                      bgcolor: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.1)' : 'rgba(132, 94, 194, 0.2)', 
                      color: '#845EC2',
                      width: 36,
                      height: 36,
                      mr: 2
                    }}>
                      <SchoolIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>
                        {translations.package || 'Package'}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                        {displayStudent.packages && displayStudent.packages.length > 0 
                          ? displayStudent.packages.find(p => p.status === 'active')?.package?.name || 'No Active Package'
                          : 'No Package'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ 
                      bgcolor: theme.mode === 'light' ? 'rgba(255, 111, 145, 0.1)' : 'rgba(255, 111, 145, 0.2)', 
                      color: '#FF6F91',
                      width: 36,
                      height: 36,
                      mr: 2
                    }}>
                      <CalendarIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>
                        {translations.classesRemaining || 'Classes Remaining'}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                        {displayStudent.packages && displayStudent.packages.length > 0 ? 
                          (() => {
                            // Count scheduled classes for this package
                            const activePackage = displayStudent.packages.find(p => p.status === 'active');
                            if (!activePackage) return '0';
                            
                            const scheduledClassesCount = allClasses.filter(c => 
                              c.status === 'scheduled' && c.studentPackageId === activePackage.id
                            ).length;
                            
                            // Log the calculation to help with debugging
                            console.log('DEBUG - Scheduled classes count:', {
                              activePackageId: activePackage.id,
                              scheduledClassesCount,
                              storedRemainingClasses: activePackage.remainingClasses
                            });
                            
                            return scheduledClassesCount.toString();
                          })()
                          : '0'
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ 
                      bgcolor: theme.mode === 'light' ? 'rgba(0, 149, 218, 0.1)' : 'rgba(0, 149, 218, 0.2)', 
                      color: '#0095DA',
                      width: 36,
                      height: 36,
                      mr: 2
                    }}>
                      <EmailIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>
                        {translations.email || 'Email'}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                        {displayStudent.user?.email || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ 
                      bgcolor: theme.mode === 'light' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(0, 184, 148, 0.2)', 
                      color: '#00B894',
                      width: 36,
                      height: 36,
                      mr: 2
                    }}>
                      <PhoneIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>
                        {translations.phone || 'Phone'}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                        {displayStudent.phone || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ 
                      bgcolor: theme.mode === 'light' ? 'rgba(255, 186, 8, 0.1)' : 'rgba(255, 186, 8, 0.2)', 
                      color: '#FFBA08',
                      width: 36,
                      height: 36,
                      mr: 2
                    }}>
                      <CalendarIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>
                        {translations.birthDate || 'Birth Date'}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                        {displayStudent.birthDate 
                          ? new Date(displayStudent.birthDate).toISOString().split('T')[0]
                          : 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ 
                      bgcolor: theme.mode === 'light' ? 'rgba(246, 114, 128, 0.1)' : 'rgba(246, 114, 128, 0.2)', 
                      color: '#F67280',
                      width: 36,
                      height: 36,
                      mr: 2
                    }}>
                      <LocationIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>
                        {translations.location || 'Location'}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                        {displayStudent.city && displayStudent.country 
                          ? `${displayStudent.city}, ${displayStudent.country}`
                          : displayStudent.city || displayStudent.country || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Tabs for Classes and Package History */}
            <Box sx={{ width: '100%' }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{
                  borderBottom: 1,
                  borderColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                  mb: 2,
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#845EC2',
                  },
                  '& .MuiTab-root': {
                    color: theme.text?.secondary,
                    fontWeight: 500,
                    '&.Mui-selected': {
                      color: '#845EC2',
                    },
                  },
                }}
              >
                <Tab 
                  label={translations.classSchedule || "Class Schedule"} 
                  id="tab-0" 
                  aria-controls="tabpanel-0" 
                />
                <Tab 
                  label={translations.attendedClasses || "Attended Classes"} 
                  id="tab-1" 
                  aria-controls="tabpanel-1" 
                />
                <Tab 
                  label={translations.packageHistory || "Package History"} 
                  id="tab-2" 
                  aria-controls="tabpanel-2" 
                />
              </Tabs>

              {/* Class Schedule Tab */}
              <Box
                role="tabpanel"
                hidden={activeTab !== 0}
                id="tabpanel-0"
                aria-labelledby="tab-0"
                sx={{ pt: 1 }}
              >
                {activeTab === 0 && (
                  <>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 2, 
                        color: theme.text?.primary,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <CalendarIcon sx={{ color: '#FF6F91' }} />
                      {translations.currentClasses || 'Current Classes'}
                    </Typography>
                    {renderClassTable(allClasses.filter(c => c.status === 'scheduled'), false, 'scheduled')}
                  </>
                )}
              </Box>

              {/* Attended Classes Tab */}
              <Box
                role="tabpanel"
                hidden={activeTab !== 1}
                id="tabpanel-1"
                aria-labelledby="tab-1"
                sx={{ pt: 1 }}
              >
                {activeTab === 1 && (
                  <>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 2, 
                        color: theme.text?.primary,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <CheckIcon sx={{ color: '#2e7d32' }} />
                      {translations.attendedClasses || 'Attended Classes'}
                    </Typography>
                    
                    {/* Current package attended classes */}
                    {renderClassTable(allClasses.filter(c => c.status === 'attended'), false, 'attended')}
                    
                    {/* Past packages attended classes */}
                    {pastPackages.length > 0 && Object.keys(classesByPackage).map((packageId) => {
                      // Find the package info
                      const packageInfo = displayStudent.allPackages?.find(p => p.id.toString() === packageId);
                      const packageClasses = classesByPackage[packageId]?.filter(c => c.status === 'attended') || [];
                      
                      if (!packageInfo || packageClasses.length === 0) return null;
                      
                      return (
                        <Box key={packageId} sx={{ mt: 3 }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              mb: 2, 
                              color: theme.text?.primary,
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <HistoryIcon sx={{ color: '#D65DB1' }} />
                            {packageInfo.package?.name || 'Past Package'} {translations.attendedClasses || 'Attended Classes'}
                          </Typography>
                          {renderClassTable(packageClasses, true)}
                        </Box>
                      );
                    })}
                  </>
                )}
              </Box>

              {/* Package History Tab */}
              <Box
                role="tabpanel"
                hidden={activeTab !== 2}
                id="tabpanel-2"
                aria-labelledby="tab-2"
              >
                {activeTab === 2 && (
                  <>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 2, 
                        color: theme.text?.primary,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <SchoolIcon sx={{ color: '#845EC2' }} />
                      {translations.packageHistory || 'Package History'}
                    </Typography>
                    {renderPackageHistory()}
                  </>
                )}
              </Box>
            </Box>

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              alignItems: 'center', 
              mt: 3,
              pt: 2,
              borderTop: theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                disabled={updateStatusLoading}
                onClick={() => handleUpdateStatus(student.id)}
                sx={{ 
                  background: '#845EC2',
                  '&:hover': {
                    background: '#6B46C1',
                  },
                  color: 'white',
                }}
              >
                {translations.refreshStatus || 'Refresh Status'}
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewDialog; 