'use client';
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  Box, IconButton, Typography, Avatar,
  Tabs, Tab, Chip, Grid, Divider,
  CircularProgress, Table, TableBody, TableCell, TableHead, TableRow
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AccessTime as TimeIcon,
  School as TeacherIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ViewDialog({ open, onClose, teacher }) {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!teacher) return null;

  const formatTimeSlots = (slots) => {
    if (!slots || !Array.isArray(slots)) return '-';
    return slots.map((slot, index) => (
      <Typography key={index} variant="body2" component="div">
        {`${slot.start} - ${slot.end}`}
      </Typography>
    ));
  };

  const getWorkingHoursText = () => {
    if (!teacher.workHours) return '0h';
    const workingDays = Object.keys(teacher.workHours).filter(day => 
      Array.isArray(teacher.workHours[day]) && teacher.workHours[day].length > 0
    ).length;
    return `${workingDays} days configured`;
  };

  const getBreakHoursText = () => {
    if (!teacher.breakHours) return '0h';
    const breakDays = Object.keys(teacher.breakHours).filter(day => 
      Array.isArray(teacher.breakHours[day]) && teacher.breakHours[day].length > 0
    ).length;
    return `${breakDays} days configured`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d',
          backgroundImage: 'none',
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        color: theme.text?.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: theme.mode === 'light' 
          ? 'rgba(0, 0, 0, 0.12)' 
          : 'rgba(255, 255, 255, 0.12)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: '#845EC2',
              width: 48,
              height: 48
            }}
          >
            {teacher.firstName ? teacher.firstName[0].toUpperCase() : 'T'}
          </Avatar>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              {teacher.firstName} {teacher.lastName}
            </Typography>
            <Chip
              size="small"
              label={teacher.isCoordinator ? 'Coordinator' : 'Teacher'}
              sx={{
                fontWeight: 500,
                bgcolor: teacher.isCoordinator
                  ? theme.mode === 'light' ? 'rgba(132, 94, 194, 0.1)' : 'rgba(132, 94, 194, 0.2)'
                  : theme.mode === 'light' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.2)',
                color: teacher.isCoordinator ? '#845EC2' : '#1976d2',
                mt: 0.5
              }}
            />
          </Box>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: theme.text?.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              color: theme.text?.secondary,
              '&.Mui-selected': {
                color: '#845EC2',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#845EC2',
            },
          }}
        >
          <Tab label={translations.overview || "Overview"} />
          <Tab label={translations.schedule || "Schedule"} />
          <Tab label={translations.history || "History"} />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ 
        borderColor: theme.mode === 'light' 
          ? 'rgba(0, 0, 0, 0.12)' 
          : 'rgba(255, 255, 255, 0.12)',
      }}>
        {activeTab === 0 && (
          <Box>
            {/* Contact Information */}
            <Typography variant="subtitle1" sx={{ 
              mb: 2,
              color: theme.text?.primary,
              fontWeight: 600
            }}>
              {translations.contactInfo || 'Contact Information'}
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: theme.text?.primary
                }}>
                  <EmailIcon sx={{ color: '#845EC2' }} />
                  <Typography>{teacher.user?.email}</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: theme.text?.primary
                }}>
                  <PhoneIcon sx={{ color: '#845EC2' }} />
                  <Typography>{teacher.phone || '-'}</Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Work Information */}
            <Typography variant="subtitle1" sx={{ 
              mb: 2,
              color: theme.text?.primary,
              fontWeight: 600
            }}>
              {translations.workInfo || 'Work Information'}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: theme.text?.primary
                }}>
                  <TimeIcon sx={{ color: '#845EC2' }} />
                  <Typography>
                    {translations.workHours || 'Work Hours'}: {getWorkingHoursText()}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: theme.text?.primary
                }}>
                  <TimeIcon sx={{ color: '#845EC2' }} />
                  <Typography>
                    {translations.breakHours || 'Break Hours'}: {getBreakHoursText()}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ minHeight: 200 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <CircularProgress size={40} sx={{ color: '#845EC2' }} />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {/* Work Hours */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ 
                    mb: 2,
                    color: theme.text?.primary,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <TimeIcon sx={{ color: '#845EC2' }} />
                    {translations.workHours || 'Work Hours'}
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ 
                          fontWeight: 600,
                          color: theme.mode === 'light' ? '#5D3E9E' : '#9D7DD6',
                          borderBottom: '1px solid',
                          borderColor: theme.mode === 'light' 
                            ? 'rgba(132, 94, 194, 0.2)' 
                            : 'rgba(132, 94, 194, 0.3)',
                          width: '30%'
                        }}>
                          {translations.day || 'Day'}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 600,
                          color: theme.mode === 'light' ? '#5D3E9E' : '#9D7DD6',
                          borderBottom: '1px solid',
                          borderColor: theme.mode === 'light' 
                            ? 'rgba(132, 94, 194, 0.2)' 
                            : 'rgba(132, 94, 194, 0.3)',
                        }}>
                          {translations.timeSlots || 'Time Slots'}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {DAYS_OF_WEEK.map((day) => (
                        <TableRow key={day}>
                          <TableCell sx={{ 
                            color: theme.text?.primary,
                            textTransform: 'capitalize',
                            borderBottom: '1px solid',
                            borderColor: theme.mode === 'light' 
                              ? 'rgba(0, 0, 0, 0.12)' 
                              : 'rgba(255, 255, 255, 0.12)',
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {day}
                              {(day === 'saturday' || day === 'sunday') && (
                                <Chip
                                  size="small"
                                  label="Holiday"
                                  sx={{
                                    bgcolor: theme.mode === 'light' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.2)',
                                    color: '#d32f2f',
                                    fontWeight: 500
                                  }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ 
                            color: theme.text?.primary,
                            borderBottom: '1px solid',
                            borderColor: theme.mode === 'light' 
                              ? 'rgba(0, 0, 0, 0.12)' 
                              : 'rgba(255, 255, 255, 0.12)',
                          }}>
                            {day === 'saturday' || day === 'sunday' ? (
                              <Typography variant="body2" color="text.secondary">
                                Holiday
                              </Typography>
                            ) : (
                              formatTimeSlots(teacher.workHours?.[day])
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Grid>

                {/* Break Hours */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ 
                    mb: 2,
                    mt: 2,
                    color: theme.text?.primary,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <TimeIcon sx={{ color: '#845EC2' }} />
                    {translations.breakHours || 'Break Hours'}
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ 
                          fontWeight: 600,
                          color: theme.mode === 'light' ? '#5D3E9E' : '#9D7DD6',
                          borderBottom: '1px solid',
                          borderColor: theme.mode === 'light' 
                            ? 'rgba(132, 94, 194, 0.2)' 
                            : 'rgba(132, 94, 194, 0.3)',
                          width: '30%'
                        }}>
                          {translations.day || 'Day'}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 600,
                          color: theme.mode === 'light' ? '#5D3E9E' : '#9D7DD6',
                          borderBottom: '1px solid',
                          borderColor: theme.mode === 'light' 
                            ? 'rgba(132, 94, 194, 0.2)' 
                            : 'rgba(132, 94, 194, 0.3)',
                        }}>
                          {translations.timeSlots || 'Time Slots'}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {DAYS_OF_WEEK.map((day) => (
                        <TableRow key={day}>
                          <TableCell sx={{ 
                            color: theme.text?.primary,
                            textTransform: 'capitalize',
                            borderBottom: '1px solid',
                            borderColor: theme.mode === 'light' 
                              ? 'rgba(0, 0, 0, 0.12)' 
                              : 'rgba(255, 255, 255, 0.12)',
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {day}
                              {(day === 'saturday' || day === 'sunday') && (
                                <Chip
                                  size="small"
                                  label="Holiday"
                                  sx={{
                                    bgcolor: theme.mode === 'light' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.2)',
                                    color: '#d32f2f',
                                    fontWeight: 500
                                  }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ 
                            color: theme.text?.primary,
                            borderBottom: '1px solid',
                            borderColor: theme.mode === 'light' 
                              ? 'rgba(0, 0, 0, 0.12)' 
                              : 'rgba(255, 255, 255, 0.12)',
                          }}>
                            {day === 'saturday' || day === 'sunday' ? (
                              <Typography variant="body2" color="text.secondary">
                                Holiday
                              </Typography>
                            ) : (
                              formatTimeSlots(teacher.breakHours?.[day])
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: 200
          }}>
            {loading ? (
              <CircularProgress size={40} sx={{ color: '#845EC2' }} />
            ) : (
              <Typography variant="body1" color={theme.text?.secondary}>
                {translations.historyComingSoon || 'Class history coming soon...'}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
} 