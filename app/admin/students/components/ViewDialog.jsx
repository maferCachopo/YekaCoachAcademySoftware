import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, Typography, Avatar, IconButton,
  Grid, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Chip, CircularProgress, Tabs, Tab, Button
} from '@mui/material';
import {
  School as SchoolIcon,
  CalendarMonth as CalendarIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
  Public as PublicIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { studentAPI, adminAPI } from '../../../utils/api';
import { fetchWithAuth } from '../../../utils/api';
import moment from 'moment';
import 'moment-timezone';

const ADMIN_TIMEZONE = 'America/Caracas';

const convertTimeToStudentTZ = (timeStr, studentTimezone) => {
  if (!timeStr || !studentTimezone) return timeStr;
  try {
    const adminTime = moment.tz(`2024-01-01 ${timeStr}`, 'YYYY-MM-DD HH:mm', ADMIN_TIMEZONE);
    const studentTime = adminTime.clone().tz(studentTimezone);
    return studentTime.format('h:mm A');
  } catch {
    return timeStr;
  }
};

const capitalizeDay = (day) => {
  if (!day) return '';
  return day.charAt(0).toUpperCase() + day.slice(1);
};

const ViewDialog = ({ open, onClose, student, setMessage }) => {
  const [loading, setLoading] = useState(false);
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false);
  const [refreshedData, setRefreshedData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  // ── NUEVO: estado para el profesor asignado ──
  const [assignedTeacher, setAssignedTeacher] = useState(null);
  const effectRan = useRef(false);

  const themeContext = useTheme();
  const { theme } = themeContext || { theme: {} };
  const { translations } = useLanguage() || { translations: {} };

  // ── Fetch teacher + weekly schedule al abrir ──
  useEffect(() => {
    if (open && student?.id) {
      fetchWeeklySchedule(student.id);
      fetchAssignedTeacher(student.id);
    }
    if (!open) {
      setWeeklySchedule([]);
      setAssignedTeacher(null);
    }
  }, [open, student?.id]);

  const fetchWeeklySchedule = async (studentId) => {
    try {
      const data = await fetchWithAuth(`/students/${studentId}/weekly-schedule`);
      setWeeklySchedule(data?.weeklySchedule || []);
    } catch {
      setWeeklySchedule([]);
    }
  };

  // ── NUEVO: obtiene el profesor asignado al estudiante ──
  const fetchAssignedTeacher = async (studentId) => {
    try {
      const res = await fetchWithAuth(`/students/${studentId}/teacher`);
      if (!res?.teacherId) { setAssignedTeacher(null); return; }
      const teacher = await fetchWithAuth(`/teachers/${res.teacherId}`);
      setAssignedTeacher(teacher);
    } catch {
      setAssignedTeacher(null);
    }
  };

  useEffect(() => {
    if (open && student?.id && !effectRan.current) {
      effectRan.current = true;
      handleUpdateStatus(student?.id, false);
    }
    if (!open) {
      effectRan.current = false;
      setRefreshedData(null);
      setActiveTab(0);
    }
  }, [open, student?.id]);

  if (!student) return null;

  const displayStudent = refreshedData || student;
  const activePackage = displayStudent.packages?.find(p => p.status === 'active');
  const pastPackages = displayStudent.allPackages?.filter(p => p.status !== 'active') || [];
  const currentClasses = displayStudent.classes || [];
  const allClasses = displayStudent.allClasses || [];
  const classesByPackage = displayStudent.classesByPackage || {};
  
const derivedSchedule = (() => {
  const seen = new Set();
  const normalize = (slots) =>
    slots
      .map(slot => ({
        day: slot.day,
        startTime: slot.startTime || slot.start || '',
        endTime: slot.endTime || slot.end || '',
      }))
      .filter(slot => {
        if (!slot.day || !slot.startTime) return false;
        const key = `${slot.day}-${slot.startTime}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

  // Prioridad 1: weeklySchedule de la API (fuente canónica)
  if (weeklySchedule.length > 0) return normalize(weeklySchedule);

  // Fallback: derivar desde clases scheduled
  const slots = allClasses
    .filter(c => c.status === 'scheduled' && c.classDetail?.date && c.classDetail?.startTime)
    .map(c => ({
      day: moment(c.classDetail.date).format('dddd').toLowerCase(),
      startTime: c.classDetail.startTime,
      endTime: c.classDetail.endTime || '',
    }));

  return normalize(slots);
})();

  const studentTimezone = displayStudent.user?.timezone || displayStudent.timezone || null;

  const handleUpdateStatus = async (studentId, showLoading = true) => {
    if (!studentId) return;
    if (showLoading) setUpdateStatusLoading(true);
    try {
      const response = await adminAPI.updateStudentClassStatus(studentId);
      if (response && response.updatedCount > 0) {
        setMessage({ open: true, text: `${response.updatedCount} class(es) updated successfully`, severity: 'success' });
      }

      if (student?.id) {
        try {
          const latestStudentData = await studentAPI.getStudentById(student.id);
          const allPackages = await studentAPI.getStudentPackages(student.id);
          const allClasses = await studentAPI.getStudentClasses(student.id);
          const scheduledClasses = allClasses.filter(c => c.status === 'scheduled');
          const relevantPackageIds = new Set(scheduledClasses.map(c => c.studentPackageId));

          for (const packageId of relevantPackageIds) {
            const pkg = allPackages.find(p => p.id === packageId);
            if (pkg) {
              const pkgScheduled = scheduledClasses.filter(c => c.studentPackageId === packageId);
              if (pkg.status === 'completed' && pkgScheduled.length > 0) {
                pkg.status = 'active';
                pkg.remainingClasses = Math.max(pkgScheduled.length, pkg.remainingClasses || 0);
              }
            }
          }

          const activePackage = allPackages.find(p => p.status === 'active');
          if (activePackage) {
            const pkgScheduled = scheduledClasses.filter(c => c.studentPackageId === activePackage.id);
            activePackage.remainingClasses = pkgScheduled.length;
          }

          const classesByPackage = {};
          allClasses.forEach(classItem => {
            if (!classesByPackage[classItem.studentPackageId]) {
              classesByPackage[classItem.studentPackageId] = [];
            }
            classesByPackage[classItem.studentPackageId].push(classItem);
          });

          setRefreshedData({
            ...latestStudentData,
            allPackages,
            allClasses,
            classes: allClasses.filter(c => activePackage && c.studentPackageId === activePackage.id),
            classesByPackage
          });

          fetchWeeklySchedule(student.id);
          fetchAssignedTeacher(student.id);
        } catch (error) {
          console.error('Error refreshing student data:', error);
        }
      }
    } catch (error) {
      console.error('Error updating class status:', error);
      setMessage({ open: true, text: 'Failed to update class status', severity: 'error' });
    } finally {
      if (showLoading) setUpdateStatusLoading(false);
    }
  };

  const renderClassTable = (classes, isPast = false, tableType = 'default') => {
    if (!classes || classes.length === 0) {
      let message = '';
      let subMessage = '';
      switch (tableType) {
        case 'attended': message = translations.noAttendedClasses || 'No attended classes found'; subMessage = translations.attendedClassesWillAppear || 'Attended classes will appear here'; break;
        case 'scheduled': message = translations.noClassesScheduled || 'No classes scheduled'; subMessage = translations.scheduledClassesWillAppear || 'When classes are scheduled, they will appear here'; break;
        case 'missed': message = translations.noMissedClasses || 'No missed classes'; subMessage = translations.missedClassesWillAppear || 'Missed classes will appear here'; break;
        default: message = isPast ? (translations.noPastClasses || 'No past classes found') : (translations.noClassesScheduled || 'No classes scheduled'); subMessage = '';
      }
      return (
        <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: theme.mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)', borderRadius: 2, backgroundColor: theme.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' }}>
          <Typography variant="body1" sx={{ color: theme.text?.secondary, mb: 1 }}>{message}</Typography>
          <Typography variant="caption" sx={{ color: theme.text?.disabled }}>{subMessage}</Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none', border: theme.mode === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 2, mb: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: theme.mode === 'light' ? 'rgba(132,94,194,0.08)' : 'rgba(0,0,0,0.3)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>{translations.date || 'Date'}</TableCell>
              <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>{translations.time || 'Time'}</TableCell>
              <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>{translations.status || 'Status'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ bgcolor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
            {classes.map((classItem) => {
              let classDate;
              try {
                if (classItem.classDetail?.date) classDate = new Date(classItem.classDetail.date);
                else if (classItem.date) classDate = new Date(classItem.date);
                else classDate = new Date();
                if (isNaN(classDate.getTime())) classDate = new Date();
              } catch { classDate = new Date(); }
              const now = new Date();
              const isPastClass = classDate < now;
              return (
                <TableRow key={classItem.id || `class-${Math.random()}`} sx={{ backgroundColor: isPastClass && classItem.status === 'scheduled' ? (theme.mode === 'light' ? 'rgba(255,152,0,0.08)' : 'rgba(255,152,0,0.12)') : 'inherit', '&:hover': { backgroundColor: theme?.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' } }}>
                  <TableCell sx={{ color: theme.text?.primary }}>{classDate.toISOString().split('T')[0]}</TableCell>
                  <TableCell sx={{ color: theme.text?.primary }}>
                    {(classItem.time || (classItem.classDetail && (classItem.classDetail.startTime || classItem.classDetail.endTime)))
                      ? `${classItem.time || classItem.classDetail?.startTime || ''}${classItem.classDetail?.endTime ? (classItem.time || classItem.classDetail?.startTime ? ' - ' : '') + classItem.classDetail.endTime : ''}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={classItem.status || 'unknown'} sx={{ fontWeight: 500, backgroundColor: classItem.status === 'scheduled' ? (theme.mode === 'light' ? 'rgba(25,118,210,0.1)' : 'rgba(25,118,210,0.2)') : classItem.status === 'attended' ? (theme.mode === 'light' ? 'rgba(46,125,50,0.1)' : 'rgba(46,125,50,0.2)') : classItem.status === 'missed' ? (theme.mode === 'light' ? 'rgba(211,47,47,0.1)' : 'rgba(211,47,47,0.2)') : (theme.mode === 'light' ? 'rgba(158,158,158,0.1)' : 'rgba(158,158,158,0.2)'), color: classItem.status === 'scheduled' ? '#1976d2' : classItem.status === 'attended' ? '#2e7d32' : classItem.status === 'missed' ? '#d32f2f' : '#9e9e9e' }} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderPackageHistory = () => {
    if (!displayStudent.allPackages || displayStudent.allPackages.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: theme.mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)', borderRadius: 2, backgroundColor: theme.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)', mt: 2 }}>
          <Typography variant="body1" sx={{ color: theme.text?.secondary, mb: 1 }}>{translations.noPackageHistory || 'No package history available'}</Typography>
        </Box>
      );
    }
    return (
      <Box sx={{ mt: 2 }}>
        <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none', border: theme.mode === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: theme.mode === 'light' ? 'rgba(132,94,194,0.08)' : 'rgba(0,0,0,0.3)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>{translations.packageName || 'Package Name'}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>{translations.startDate || 'Start Date'}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>{translations.endDate || 'End Date'}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: theme.text?.primary }}>{translations.status || 'Status'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={{ bgcolor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
              {displayStudent.allPackages.map((pkg) => (
                <TableRow key={pkg.id} sx={{ '&:hover': { backgroundColor: theme?.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' } }}>
                  <TableCell sx={{ color: theme.text?.primary }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SchoolIcon sx={{ color: '#845EC2', fontSize: '1rem' }} />
                      {pkg.package?.name || 'Unknown Package'}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: theme.text?.primary }}>{pkg.startDate ? new Date(pkg.startDate).toISOString().split('T')[0] : 'N/A'}</TableCell>
                  <TableCell sx={{ color: theme.text?.primary }}>{pkg.endDate ? new Date(pkg.endDate).toISOString().split('T')[0] : 'N/A'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip
                        size="small"
                        label={pkg.status === 'cancelled' ? 'Cancelado por Upgrade' : (pkg.status || 'unknown')}
                        sx={{
                          fontWeight: 600,
                          bgcolor: pkg.status === 'cancelled' ? 'rgba(255, 152, 0, 0.2)' : pkg.status === 'active' ? 'rgba(46,125,50,0.1)' : 'rgba(158,158,158,0.1)',
                          color: pkg.status === 'cancelled' ? '#ef6c00' : pkg.status === 'active' ? '#2e7d32' : '#9e9e9e',
                          border: pkg.status === 'cancelled' ? '1px solid #ef6c00' : 'none'
                        }}
                      />
                      {pkg.status === 'cancelled' && pkg.notes && (
                        <Typography variant="caption" sx={{ color: theme.text?.disabled, fontStyle: 'italic', ml: 1 }}>
                          {pkg.notes}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderWeeklyScheduleCard = () => {
    if (derivedSchedule.length === 0) return null;
    const isSameTimezone = studentTimezone === ADMIN_TIMEZONE || !studentTimezone;

    return (
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2, borderRadius: 2, bgcolor: theme.mode === 'light' ? 'rgba(132,94,194,0.06)' : 'rgba(132,94,194,0.15)', border: `1px solid ${theme.mode === 'light' ? 'rgba(132,94,194,0.2)' : 'rgba(132,94,194,0.3)'}`, gap: 2 }}>
          <Avatar sx={{ bgcolor: theme.mode === 'light' ? 'rgba(132,94,194,0.12)' : 'rgba(132,94,194,0.25)', color: '#845EC2', width: 36, height: 36, flexShrink: 0 }}>
            <ScheduleIcon fontSize="small" />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block', mb: 0.5 }}>
              {translations.regularSchedule || 'Horario habitual'}
              {studentTimezone && !isSameTimezone && (
                <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center', gap: 0.3, color: '#845EC2', fontWeight: 600 }}>
                  <PublicIcon sx={{ fontSize: '0.75rem' }} />
                  {studentTimezone}
                </Box>
              )}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {derivedSchedule.map((slot, idx) => {
                const day = capitalizeDay(slot.day || slot.startTime);
                const rawStart = slot.startTime || slot.start;
                const rawEnd = slot.endTime || slot.end;
                const displayStart = studentTimezone && !isSameTimezone
                  ? convertTimeToStudentTZ(rawStart, studentTimezone)
                  : rawStart ? moment(`2024-01-01 ${rawStart}`, 'YYYY-MM-DD HH:mm').format('h:mm A') : null;
                const displayEnd = studentTimezone && !isSameTimezone
                  ? convertTimeToStudentTZ(rawEnd, studentTimezone)
                  : rawEnd ? moment(`2024-01-01 ${rawEnd}`, 'YYYY-MM-DD HH:mm').format('h:mm A') : null;
                const label = displayStart ? `${day} ${displayStart}${displayEnd ? ` – ${displayEnd}` : ''}` : day;
                return (
                  <Chip key={idx} label={label} size="small" sx={{ fontWeight: 600, bgcolor: theme.mode === 'light' ? 'rgba(132,94,194,0.12)' : 'rgba(132,94,194,0.25)', color: theme.mode === 'light' ? '#5D3E9E' : '#C9B8E8', border: `1px solid ${theme.mode === 'light' ? 'rgba(132,94,194,0.3)' : 'rgba(132,94,194,0.4)'}`, fontSize: '0.8rem', height: 28 }} />
                );
              })}
            </Box>
            {studentTimezone && !isSameTimezone && (
              <Typography variant="caption" sx={{ color: theme.text?.disabled, display: 'block', mt: 0.75, fontSize: '0.72rem' }}>
                ⏱ Hora del profesor ({ADMIN_TIMEZONE}):&nbsp;
                {derivedSchedule.map((slot, idx) => {
                  const rawStart = slot.startTime || slot.start;
                  const rawEnd = slot.endTime || slot.end;
                  const adminStart = rawStart ? moment(`2024-01-01 ${rawStart}`, 'YYYY-MM-DD HH:mm').format('h:mm A') : '';
                  const adminEnd = rawEnd ? moment(`2024-01-01 ${rawEnd}`, 'YYYY-MM-DD HH:mm').format('h:mm A') : '';
                  return `${capitalizeDay(slot.day)} ${adminStart}${adminEnd ? `–${adminEnd}` : ''}${idx < derivedSchedule.length - 1 ? ', ' : ''}`;
                })}
              </Typography>
            )}
          </Box>
        </Box>
      </Grid>
    );
  };

  // ── NUEVO: card del profesor asignado ──
  const renderAssignedTeacherCard = () => (
    <Grid item xs={12} md={6}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Avatar sx={{ bgcolor: theme.mode === 'light' ? 'rgba(214,93,177,0.1)' : 'rgba(214,93,177,0.2)', color: '#D65DB1', width: 36, height: 36, mr: 2, flexShrink: 0 }}>
          <PersonIcon fontSize="small" />
        </Avatar>
        <Box>
          <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>
            {translations.assignedTeacher || 'Profesor asignado'}
          </Typography>
          {assignedTeacher ? (
            <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
              {assignedTeacher.firstName} {assignedTeacher.lastName}
            </Typography>
          ) : (
            <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.secondary, fontStyle: 'italic' }}>
              {translations.noTeacher || 'Sin profesor asignado'}
            </Typography>
          )}
        </Box>
      </Box>
    </Grid>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 5,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          background: theme.mode === 'light' ? '#ffffff' : '#151521'
        }
      }}
    >
      <DialogTitle sx={{ pb: 2, borderBottom: theme?.mode === 'light' ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)', color: theme?.text?.primary, px: 3, pt: 3, fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: '#845EC2', color: '#fff', fontWeight: 'bold', width: 40, height: 40, mr: 2 }}>
            {displayStudent.name ? displayStudent.name[0].toUpperCase() : 'S'}
          </Avatar>
          <Typography variant="h6" component="div" sx={{ color: theme.text?.primary }}>
            {displayStudent.name} {displayStudent.surname}
          </Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: theme.text?.primary }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pb: 4, overflow: 'auto', backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Box sx={{ mb: 4 }} />

        {updateStatusLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress sx={{ color: '#845EC2' }} />
            <Typography variant="body1" sx={{ ml: 2, color: theme.text?.secondary }}>
              {translations.updatingClassStatus || 'Updating class status...'}
            </Typography>
          </Box>
        ) : (
          <>
            {/* ── INFO CARDS ── */}
            <Box sx={{ p: 3, background: theme.mode === 'light' ? 'rgba(132,94,194,0.05)' : 'rgba(132,94,194,0.1)', borderRadius: 3, mb: 3 }}>
              <Grid container spacing={3}>

                {/* Paquete */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: theme.mode === 'light' ? 'rgba(132,94,194,0.1)' : 'rgba(132,94,194,0.2)', color: '#845EC2', width: 36, height: 36, mr: 2 }}>
                      <SchoolIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>{translations.package || 'Package'}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                        {displayStudent.packages?.find(p => p.status === 'active')?.package?.name || 'No Package'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Clases restantes */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: theme.mode === 'light' ? 'rgba(255,111,145,0.1)' : 'rgba(255,111,145,0.2)', color: '#FF6F91', width: 36, height: 36, mr: 2 }}>
                      <CalendarIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>{translations.classesRemaining || 'Classes Remaining'}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                        {(() => {
                          const activePkg = displayStudent.packages?.find(p => p.status === 'active');
                          if (!activePkg) return '0';
                          return allClasses.filter(c => c.status === 'scheduled' && c.studentPackageId === activePkg.id).length.toString();
                        })()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* ── NUEVO: Profesor asignado ── */}
                {renderAssignedTeacherCard()}

                {/* Email */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: theme.mode === 'light' ? 'rgba(0,149,218,0.1)' : 'rgba(0,149,218,0.2)', color: '#0095DA', width: 36, height: 36, mr: 2 }}>
                      <EmailIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>{translations.email || 'Email'}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>{displayStudent.user?.email || 'N/A'}</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Teléfono */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: theme.mode === 'light' ? 'rgba(0,184,148,0.1)' : 'rgba(0,184,148,0.2)', color: '#00B894', width: 36, height: 36, mr: 2 }}>
                      <PhoneIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>{translations.phone || 'Phone'}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>{displayStudent.phone || 'N/A'}</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Fecha de nacimiento */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: theme.mode === 'light' ? 'rgba(255,186,8,0.1)' : 'rgba(255,186,8,0.2)', color: '#FFBA08', width: 36, height: 36, mr: 2 }}>
                      <CalendarIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>{translations.birthDate || 'Birth Date'}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                        {displayStudent.birthDate ? new Date(displayStudent.birthDate).toISOString().split('T')[0] : 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Ubicación */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: theme.mode === 'light' ? 'rgba(246,114,128,0.1)' : 'rgba(246,114,128,0.2)', color: '#F67280', width: 36, height: 36, mr: 2 }}>
                      <LocationIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.text?.secondary, display: 'block' }}>{translations.location || 'Location'}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: theme.text?.primary }}>
                        {displayStudent.city && displayStudent.country
                          ? `${displayStudent.city}, ${displayStudent.country}`
                          : displayStudent.city || displayStudent.country || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Horario habitual */}
                {renderWeeklyScheduleCard()}

              </Grid>
            </Box>

            {/* ── TABS ── */}
            <Box sx={{ width: '100%' }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ borderBottom: 1, borderColor: theme.mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', mb: 2, '& .MuiTabs-indicator': { backgroundColor: '#845EC2' }, '& .MuiTab-root': { color: theme.text?.secondary, fontWeight: 500, '&.Mui-selected': { color: '#845EC2' } } }}
              >
                <Tab label={translations.classSchedule || 'Class Schedule'} id="tab-0" aria-controls="tabpanel-0" />
                <Tab label={translations.attendedClasses || 'Attended Classes'} id="tab-1" aria-controls="tabpanel-1" />
                <Tab label={translations.packageHistory || 'Package History'} id="tab-2" aria-controls="tabpanel-2" />
              </Tabs>

              <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-0" aria-labelledby="tab-0" sx={{ pt: 1 }}>
                {activeTab === 0 && (
                  <>
                    <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ color: '#FF6F91' }} />
                      {translations.currentClasses || 'Current Classes'}
                    </Typography>
                    {renderClassTable(allClasses.filter(c => c.status === 'scheduled'), false, 'scheduled')}
                  </>
                )}
              </Box>

              <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-1" aria-labelledby="tab-1" sx={{ pt: 1 }}>
                {activeTab === 1 && (
                  <>
                    <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckIcon sx={{ color: '#2e7d32' }} />
                      {translations.attendedClasses || 'Attended Classes'}
                    </Typography>
                    {renderClassTable(allClasses.filter(c => c.status === 'attended'), false, 'attended')}
                    {pastPackages.length > 0 && Object.keys(classesByPackage).map((packageId) => {
                      const packageInfo = displayStudent.allPackages?.find(p => p.id.toString() === packageId);
                      const packageClasses = classesByPackage[packageId]?.filter(c => c.status === 'attended') || [];
                      if (!packageInfo || packageClasses.length === 0) return null;
                      return (
                        <Box key={packageId} sx={{ mt: 3 }}>
                          <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
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

              <Box role="tabpanel" hidden={activeTab !== 2} id="tabpanel-2" aria-labelledby="tab-2">
                {activeTab === 2 && (
                  <>
                    <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SchoolIcon sx={{ color: '#845EC2' }} />
                      {translations.packageHistory || 'Package History'}
                    </Typography>
                    {renderPackageHistory()}
                  </>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 3, pt: 2, borderTop: theme.mode === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)' }}>
              <Button variant="contained" startIcon={<RefreshIcon />} disabled={updateStatusLoading} onClick={() => handleUpdateStatus(student.id)} sx={{ background: '#845EC2', '&:hover': { background: '#6B46C1' }, color: 'white' }}>
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