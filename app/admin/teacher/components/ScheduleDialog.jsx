'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, Divider, TextField,
  Chip, Alert, CircularProgress, Paper, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip,
  FormControl, InputLabel, Select, MenuItem, Grid,
  Switch, FormControlLabel
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { fetchWithAuth } from '@/app/utils/api';
import { format, parseISO } from 'date-fns';
import TeacherAvailabilityCalendar from '../../students/components/TeacherAvailabilityCalendar';

const DAYS  = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 – 22:00
const DAY_LABELS = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié',
  thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom'
};

// Misma lógica que getSlotStatus en la página de horario general
function getSlotStatusForDialog(dayName, hour, teacher, classes) {
  if (!teacher) return { type: 'non-working', label: '' };

  // 0. Actividad permanente del profesor (max prioridad visual)
  const permanentActs = teacher._permanentActivities || [];
  const permAct = permanentActs.find(a =>
    a.dayOfWeek === dayName && parseInt((a.startTime || '').split(':')[0]) === hour
  );
  if (permAct) return {
    type: 'activity',
    label: '\uD83D\uDD01 ' + permAct.title,
    data: permAct
  };

  // 1. Asignación permanente (fixedSchedule de assignedStudents)
  const assignedStudents = teacher._assignedStudents || [];
  const permanentStudent = assignedStudents.find(s =>
    s.fixedSchedule?.some(slot =>
      slot.day?.toLowerCase() === dayName && parseInt(slot.hour) === hour
    )
  );
  if (permanentStudent) {
    const name = permanentStudent.fullName || permanentStudent.name || 'Estudiante';
    return { type: 'fixed', label: `Asignación Fija: ${name}`, data: { name, packageName: permanentStudent.packageName || '' } };
  }

  // 2. Clase puntual de esta semana
  const classAt = (classes || []).find(c => {
    try {
      const dow = format(new Date(c.date + 'T00:00:00'), 'EEEE').toLowerCase();
      return dow === dayName && parseInt((c.startTime || '').split(':')[0]) === hour;
    } catch { return false; }
  });
  if (classAt) return {
    type: 'class',
    label: `Clase: ${classAt.studentName || ''} ${classAt.studentSurname || ''}`.trim(),
    data: classAt
  };

  // 3. Horas laborales y breaks
  const workHours   = teacher.workHours?.[dayName]  || [];
  const breakHours  = teacher.breakHours?.[dayName] || [];
  const workingDays = teacher.workingDays || [];

  if (!workingDays.includes(dayName)) return { type: 'non-working', label: 'Día no laboral' };

  const inWork  = workHours.some(w  => hour >= parseInt(w.start.split(':')[0])  && hour < parseInt(w.end.split(':')[0]));
  const inBreak = breakHours.some(b => hour >= parseInt(b.start.split(':')[0]) && hour < parseInt(b.end.split(':')[0]));

  if (inBreak) return { type: 'break',     label: 'Descanso (Break)' };
  if (inWork)  return { type: 'available', label: 'Disponible'       };
  return { type: 'non-working', label: 'Fuera de jornada' };
}

const ScheduleDialog = ({ open, onClose, teacher, refreshTeachers }) => {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [students, setStudents] = useState([]);         // lista básica del teacher
  const [studentsInfo, setStudentsInfo] = useState([]); // lista enriquecida con paquete + clases + reagendamientos
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [classes, setClasses] = useState([]);
  const [workHours, setWorkHours] = useState({});
  const [assignedStudents, setAssignedStudents] = useState([]);

  useEffect(() => {
    if (open && teacher) {
      fetchTeacherData();
      setWorkHours(teacher.workHours || {});
    }
  }, [open, teacher]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Actividades básicas
      const activitiesResponse = await fetchWithAuth(`/teachers/${teacher.id}/activities`);
      setActivities(activitiesResponse.activities || []);

      // Schedule completo (assignedStudents + clases semanales + workHours)
      const { startDate, endDate } = (() => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(new Date(now).setDate(diff));
        const sun = new Date(new Date(mon).setDate(mon.getDate() + 6));
        const fmt = d => d.toISOString().split('T')[0];
        return { startDate: fmt(mon), endDate: fmt(sun) };
      })();
      const scheduleData = await fetchWithAuth(`/teachers/${teacher.id}/schedule?startDate=${startDate}&endDate=${endDate}`);
      setAssignedStudents(scheduleData.assignedStudents || []);
      setClasses(scheduleData.classes || activitiesResponse.classes || []);

      // Lista base de estudiantes del profesor
      const studentsBase = await fetchWithAuth(`/teachers/${teacher.id}/students`);
      setStudents(studentsBase);

      // Enriquecer cada estudiante con paquete activo + clases + reagendamientos en paralelo
      setStudentsLoading(true);
      const enriched = await Promise.all(
        (studentsBase || []).map(async (s) => {
          try {
            const [packages, studentClasses, reschedules] = await Promise.all([
              fetchWithAuth(`/students/${s.id}/packages`).catch(() => []),
              fetchWithAuth(`/students/${s.id}/classes`).catch(() => []),
              fetchWithAuth(`/reschedules?studentId=${s.id}`).catch(() => []),
            ]);

            // Paquete más reciente (primero activo, si no el más reciente en general)
            const sortedPkgs = [...(packages || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const activePkg = sortedPkgs.find(p => p.status === 'active') || sortedPkgs[0] || null;

            // Clases vistas (attended) y pendientes (scheduled)
            const attended  = (studentClasses || []).filter(sc => sc.status === 'attended' || sc.classDetail?.status === 'completed').length;
            const pending   = (studentClasses || []).filter(sc => sc.status === 'scheduled' || sc.classDetail?.status === 'scheduled').length;

            // Reagendamientos: usados vs máximo permitido por el paquete
            const usedReschedules = activePkg?.usedReschedules ?? (reschedules || []).filter(r => r.status !== 'cancelled').length;
            const maxReschedules  = activePkg?.package?.maxReschedules ?? 0;
            const remainingReschedules = Math.max(0, maxReschedules - usedReschedules);

            return {
              ...s,
              _activePkg: activePkg,
              _attended: attended,
              _pending: pending,
              _usedReschedules: usedReschedules,
              _maxReschedules: maxReschedules,
              _remainingReschedules: remainingReschedules,
            };
          } catch {
            return { ...s, _activePkg: null, _attended: 0, _pending: 0, _usedReschedules: 0, _maxReschedules: 0, _remainingReschedules: 0 };
          }
        })
      );
      setStudentsInfo(enriched);
      setStudentsLoading(false);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      setError('Failed to fetch teacher data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async () => {
    try {
      setLoading(true);
      await fetchWithAuth(`/teachers/${teacher.id}/activities`, {
        method: 'POST',
        body: JSON.stringify({
          ...activityForm,
          date: activityForm.date ? format(activityForm.date, 'yyyy-MM-dd') : null,
          startTime: activityForm.startTime ? format(activityForm.startTime, 'HH:mm:ss') : null,
          endTime:   activityForm.endTime   ? format(activityForm.endTime,   'HH:mm:ss') : null,
          isPermanent: activityForm.isPermanent,
        })
      });
      setSuccess('Activity created successfully');
      fetchTeacherData();
      setActivityForm({ title: '', description: '', date: null, startTime: null, endTime: null, type: 'other', deadline: null, isPermanent: false, _selectedDay: null, _selectedHour: null, _selectedWeek: null });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      setLoading(true);
      await fetchWithAuth(`/teachers/${teacher.id}/activities/${activityId}`, { method: 'DELETE' });
      setSuccess('Activity deleted successfully');
      fetchTeacherData();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const [activityWeekOffset, setActivityWeekOffset] = useState(0);
  const [activityForm, setActivityForm] = useState({
    title: '', description: '', date: null, startTime: null, endTime: null, type: 'other', deadline: null,
    isPermanent: false,
    _selectedDay: null, _selectedHour: null, _selectedWeek: null,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: theme?.dialog?.background,
          backgroundImage: 'none',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="h6" component="div" sx={{ color: theme?.text?.primary }}>
          {translations.teacherSchedule || 'Teacher Schedule'}: {teacher?.firstName} {teacher?.lastName}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* ✅ Pestaña "Schedule" (índice 3) eliminada — solo quedan 3 pestañas */}
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: theme?.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)'
          }}
        >
          <Tab label="Horas de Trabajo (Matriz)" />
          <Tab label={translations.students || "Students"} />
          <Tab label={translations.activities || "Activities"} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ m: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* Pestaña 0: Horario de Trabajo (matriz de solo lectura) */}
            {activeTab === 0 && (
              <Box sx={{ p: 2 }}>
                <TableContainer sx={{ maxHeight: 480, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: 'background.paper', fontWeight: 'bold', textAlign: 'center', width: 72, fontSize: '0.75rem' }}>
                          HORA
                        </TableCell>
                        {DAYS.map(day => (
                          <TableCell key={day} align="center" sx={{
                            bgcolor: 'background.paper',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            fontSize: '0.72rem',
                            color: 'primary.main',
                            minWidth: 90,
                            borderBottom: '2px solid',
                            borderColor: 'primary.main'
                          }}>
                            {DAY_LABELS[day]}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {HOURS.map(hour => (
                        <TableRow key={hour}>
                          <TableCell sx={{
                            fontWeight: 'bold',
                            textAlign: 'center',
                            bgcolor: theme?.mode === 'light' ? '#f9f9f9' : 'rgba(255,255,255,0.02)',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            fontSize: '0.75rem',
                            p: 0.5
                          }}>
                            {`${hour.toString().padStart(2, '0')}:00`}
                          </TableCell>
                          {DAYS.map(day => {
                            const enrichedTeacher = { ...teacher, workHours, _assignedStudents: assignedStudents, _permanentActivities: activities.filter(a => a.isPermanent) };
                            const status = getSlotStatusForDialog(day, hour, enrichedTeacher, classes);
                            const bgColors = {
                              fixed:        '#4B4453',
                              class:        '#845EC2',
                              activity:     theme?.mode === 'light' ? 'rgba(245,124,0,0.7)' : 'rgba(245,124,0,0.8)',
                              available:    theme?.mode === 'light' ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.25)',
                              break:        theme?.mode === 'light' ? 'rgba(255,152,0,0.15)'  : 'rgba(255,152,0,0.25)',
                              'non-working': 'transparent'
                            };
                            return (
                              <Tooltip key={day} title={status.label} arrow>
                                <TableCell sx={{
                                  height: 52,
                                  p: 0.5,
                                  bgcolor: bgColors[status.type] || 'transparent',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  transition: '0.15s'
                                }}>
                                  {status.type === 'fixed' && (
                                    <Box sx={{ color: 'white', textAlign: 'center' }}>
                                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 'bold', lineHeight: 1.2 }} noWrap>
                                        {status.data?.name}
                                      </Typography>
                                      {status.data?.packageName && (
                                        <Typography sx={{ fontSize: '0.55rem', opacity: 0.85, fontStyle: 'italic' }} noWrap>
                                          {status.data.packageName}
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                  {status.type === 'class' && (
                                    <Box sx={{ color: 'white', textAlign: 'center' }}>
                                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 'bold', lineHeight: 1.2 }} noWrap>
                                        {status.data?.studentName || status.data?.title || 'Clase'}
                                      </Typography>
                                      {status.data?.studentSurname && (
                                        <Typography sx={{ fontSize: '0.6rem', opacity: 0.9 }} noWrap>
                                          {status.data.studentSurname}
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                  {status.type === 'activity' && (
                                    <Box sx={{ color: 'white', textAlign: 'center' }}>
                                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 'bold', lineHeight: 1.2 }} noWrap>
                                        {String.fromCodePoint(0x1F501)} {status.data?.title}
                                      </Typography>
                                      <Typography sx={{ fontSize: '0.55rem', opacity: 0.9 }} noWrap>
                                        {status.data?.type || 'actividad'}
                                      </Typography>
                                    </Box>
                                  )}
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
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
                  {[
                    { color: '#4B4453',               label: 'Asignación Permanente' },
                    { color: '#845EC2',               label: 'Clase en Calendario'   },
                    { color: 'rgba(245,124,0,0.8)',   label: 'Actividad'             },
                    { color: 'rgba(76,175,80,0.4)',   label: 'Disponible'            },
                    { color: 'rgba(255,152,0,0.4)',   label: 'Descanso'              },
                  ].map(({ color, label }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Box sx={{ width: 14, height: 14, bgcolor: color, borderRadius: 0.5, flexShrink: 0 }} />
                      <Typography variant="caption" fontWeight="bold" color="text.secondary">{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Pestaña 1: Estudiantes (solo lectura, con info detallada) */}
            {activeTab === 1 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Estudiantes asignados ({studentsInfo.length})
                </Typography>

                {studentsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : studentsInfo.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    Este profesor no tiene estudiantes asignados.
                  </Typography>
                ) : (
                  <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Estudiante</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} align="center">Paquete activo</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} align="center">Inicio / Fin</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} align="center">Clases vistas</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} align="center">Pendientes</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} align="center">Reagendamientos</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {studentsInfo.map((s) => {
                          const pkg    = s._activePkg;
                          const pkgDef = pkg?.package;
                          const fmtDate = (d) => { try { return d ? format(new Date(d), 'dd/MM/yy') : '—'; } catch { return '—'; } };
                          const rescLeft = s._remainingReschedules;

                          return (
                            <TableRow key={s.id} hover>
                              {/* Nombre */}
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PersonIcon sx={{ fontSize: '1rem', color: 'primary.main', flexShrink: 0 }} />
                                  <Box>
                                    <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                                      {s.name} {s.surname}
                                    </Typography>
                                    {s.user?.email && (
                                      <Typography variant="caption" color="text.secondary">
                                        {s.user.email}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>

                              {/* Paquete */}
                              <TableCell align="center">
                                {pkgDef ? (
                                  <Chip
                                    label={pkgDef.name}
                                    size="small"
                                    color={pkg.status === 'active' ? 'primary' : 'default'}
                                    variant={pkg.status === 'active' ? 'filled' : 'outlined'}
                                    sx={{ fontSize: '0.68rem', maxWidth: 120 }}
                                  />
                                ) : (
                                  <Typography variant="caption" color="text.disabled">Sin paquete</Typography>
                                )}
                              </TableCell>

                              {/* Inicio / Fin */}
                              <TableCell align="center">
                                {pkg ? (
                                  <Box>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                      {fmtDate(pkg.startDate)}
                                    </Typography>
                                    <Typography variant="caption" display="block" color={new Date(pkg.endDate) < new Date() ? 'error.main' : 'text.secondary'}>
                                      {fmtDate(pkg.endDate)}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography variant="caption" color="text.disabled">—</Typography>
                                )}
                              </TableCell>

                              {/* Clases vistas */}
                              <TableCell align="center">
                                <Chip
                                  label={s._attended}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ fontSize: '0.72rem', minWidth: 32 }}
                                />
                              </TableCell>

                              {/* Clases pendientes */}
                              <TableCell align="center">
                                <Chip
                                  label={pkg ? pkg.remainingClasses ?? s._pending : s._pending}
                                  size="small"
                                  color={pkg && (pkg.remainingClasses ?? s._pending) <= 2 ? 'warning' : 'default'}
                                  variant="outlined"
                                  sx={{ fontSize: '0.72rem', minWidth: 32 }}
                                />
                              </TableCell>

                              {/* Reagendamientos */}
                              <TableCell align="center">
                                <Tooltip
                                  title={`Usados: ${s._usedReschedules} / Máx: ${s._maxReschedules}`}
                                  arrow
                                >
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
                                    <Chip
                                      label={`${rescLeft} restantes`}
                                      size="small"
                                      color={rescLeft === 0 ? 'error' : rescLeft === 1 ? 'warning' : 'success'}
                                      sx={{ fontSize: '0.68rem' }}
                                    />
                                    <Typography variant="caption" color="text.disabled">
                                      {s._usedReschedules}/{s._maxReschedules} usados
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Pestaña 2: Activities — matriz clickeable + formulario */}
            {activeTab === 2 && (
              <Box sx={{ display: 'flex', gap: 0, height: 520, overflow: 'hidden' }}>

                {/* ── PANEL IZQUIERDO: Matriz semanal clickeable ── */}
                <Box sx={{
                  width: 420, flexShrink: 0,
                  borderRight: '1px solid', borderColor: 'divider',
                  display: 'flex', flexDirection: 'column'
                }}>
                  {/* Selector de semana */}
                  <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <IconButton size="small" onClick={() => setActivityWeekOffset(w => w - 1)}>
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>‹</span>
                    </IconButton>
                    <Typography variant="caption" fontWeight="bold" sx={{ flex: 1, textAlign: 'center' }}>
                      {(() => {
                        const base = new Date();
                        base.setDate(base.getDate() - base.getDay() + 1 + activityWeekOffset * 7);
                        const end = new Date(base); end.setDate(base.getDate() + 6);
                        return `${format(base, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`;
                      })()}
                    </Typography>
                    <IconButton size="small" onClick={() => setActivityWeekOffset(w => w + 1)}>
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>›</span>
                    </IconButton>
                  </Box>

                  {/* Leyenda compacta */}
                  <Box sx={{ px: 1.5, py: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    {[
                      { color: '#4B4453', label: 'Fijo' },
                      { color: '#845EC2', label: 'Clase' },
                      { color: 'rgba(76,175,80,0.5)', label: 'Libre' },
                      { color: 'rgba(255,152,0,0.5)', label: 'Break' },
                      { color: 'rgba(239,83,80,0.35)', label: 'Cancelada' },
                    ].map(({ color, label }) => (
                      <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        <Box sx={{ width: 10, height: 10, bgcolor: color, borderRadius: 0.3, flexShrink: 0 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>{label}</Typography>
                      </Box>
                    ))}
                    <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.62rem', ml: 'auto' }}>
                      Click en celda para pre-llenar hora
                    </Typography>
                  </Box>

                  {/* Tabla */}
                  <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                    <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 44, p: '4px 2px', fontSize: '0.65rem', fontWeight: 'bold', textAlign: 'center', bgcolor: 'background.paper' }}>H</TableCell>
                          {DAYS.map(day => {
                            // compute actual date for this day in the selected week
                            const base = new Date();
                            base.setDate(base.getDate() - base.getDay() + 1 + activityWeekOffset * 7);
                            const dayIdx = DAYS.indexOf(day);
                            const d = new Date(base); d.setDate(base.getDate() + dayIdx);
                            return (
                              <TableCell key={day} align="center" sx={{
                                p: '4px 2px', fontSize: '0.62rem', fontWeight: '900',
                                color: 'primary.main', bgcolor: 'background.paper',
                                borderBottom: '2px solid', borderColor: 'primary.main',
                                lineHeight: 1.2
                              }}>
                                {DAY_LABELS[day]}<br />
                                <span style={{ fontWeight: 400, opacity: 0.7 }}>{format(d, 'd/M')}</span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {HOURS.map(hour => (
                          <TableRow key={hour}>
                            <TableCell sx={{ p: '2px', textAlign: 'center', fontSize: '0.62rem', fontWeight: 'bold', bgcolor: 'action.hover' }}>
                              {`${hour}:00`}
                            </TableCell>
                            {DAYS.map(day => {
                              const enrichedTeacher = { ...teacher, workHours, _assignedStudents: assignedStudents, _permanentActivities: activities.filter(a => a.isPermanent) };
                              const status = getSlotStatusForDialog(day, hour, enrichedTeacher, classes);

                              // also check if there's already an activity in this slot
                              const base = new Date();
                              base.setDate(base.getDate() - base.getDay() + 1 + activityWeekOffset * 7);
                              const dayIdx = DAYS.indexOf(day);
                              const cellDate = new Date(base); cellDate.setDate(base.getDate() + dayIdx);
                              const cellDateStr = format(cellDate, 'yyyy-MM-dd');

                              const existingActivity = activities.find(a => {
                                try {
                                  // One-time: exact date match
                                  if (!a.isPermanent) return a.date === cellDateStr && parseInt((a.startTime || '').split(':')[0]) === hour;
                                  // Permanent: matches weekday
                                  return a.dayOfWeek === day && parseInt((a.startTime || '').split(':')[0]) === hour;
                                } catch { return false; }
                              });

                              // cancelled class = class slot but status cancelled
                              const isCancelled = status.type === 'class' && status.data?.status === 'cancelled';
                              const isClickable = (status.type === 'available' || isCancelled || status.type === 'non-working') && status.type !== 'activity';

                              const bgColors = {
                                fixed:         '#4B4453',
                                class:         isCancelled ? 'rgba(239,83,80,0.35)' : '#845EC2',
                                activity:      theme?.mode === 'light' ? 'rgba(245,124,0,0.7)' : 'rgba(245,124,0,0.8)',
                                available:     theme?.mode === 'light' ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.25)',
                                break:         theme?.mode === 'light' ? 'rgba(255,152,0,0.15)' : 'rgba(255,152,0,0.25)',
                                'non-working': 'transparent',
                              };

                              const isSelected = activityForm._selectedDay === day
                                && activityForm._selectedHour === hour
                                && activityForm._selectedWeek === activityWeekOffset;

                              return (
                                <Tooltip key={day} title={existingActivity ? `Actividad: ${existingActivity.title}` : (isClickable ? '+ Crear actividad aquí' : status.label)} arrow>
                                  <TableCell
                                    onClick={() => {
                                      if (!isClickable && !isCancelled) return;
                                      const startH = `${String(hour).padStart(2,'0')}:00`;
                                      const endH   = `${String(hour + 1).padStart(2,'0')}:00`;
                                      const dateObj = new Date(cellDate);
                                      setActivityForm(f => ({
                                        ...f,
                                        date: dateObj,
                                        startTime: new Date(`1970-01-01T${startH}`),
                                        endTime:   new Date(`1970-01-01T${endH}`),
                                        _selectedDay: day,
                                        _selectedHour: hour,
                                        _selectedWeek: activityWeekOffset,
                                      }));
                                    }}
                                    sx={{
                                      height: 36, p: '2px',
                                      bgcolor: isSelected
                                        ? 'rgba(132,94,194,0.45)'
                                        : existingActivity
                                          ? 'rgba(33,150,243,0.25)'
                                          : bgColors[status.type] || 'transparent',
                                      border: isSelected ? '2px solid #845EC2' : '1px solid',
                                      borderColor: isSelected ? '#845EC2' : 'divider',
                                      cursor: isClickable || isCancelled ? 'pointer' : 'default',
                                      transition: '0.15s',
                                      '&:hover': isClickable || isCancelled ? { opacity: 0.75, outline: '2px solid #845EC2' } : {},
                                    }}
                                  >
                                    {status.type === 'fixed' && (
                                      <Typography sx={{ color: 'white', fontSize: '0.55rem', textAlign: 'center', lineHeight: 1.1 }} noWrap>
                                        {status.data?.name}
                                      </Typography>
                                    )}
                                    {status.type === 'class' && (
                                      <Typography sx={{ color: 'white', fontSize: '0.55rem', textAlign: 'center', lineHeight: 1.1 }} noWrap>
                                        {isCancelled ? '✗ Cancelada' : (status.data?.studentName || 'Clase')}
                                      </Typography>
                                    )}
                                    {existingActivity && status.type !== 'activity' && (
                                      <Typography sx={{ color: '#1565c0', fontSize: '0.55rem', textAlign: 'center', lineHeight: 1.1, fontWeight: 'bold' }} noWrap>
                                        📌 {existingActivity.title}
                                      </Typography>
                                    )}
                                    {status.type === 'activity' && (
                                      <Box sx={{ textAlign: 'center' }}>
                                        <Typography sx={{ color: 'white', fontSize: '0.55rem', fontWeight: 'bold', lineHeight: 1.1 }} noWrap>
                                          🔁 {status.data?.title}
                                        </Typography>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.5rem' }} noWrap>
                                          {status.data?.type || 'actividad'}
                                        </Typography>
                                      </Box>
                                    )}
                                  </TableCell>
                                </Tooltip>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* ── PANEL DERECHO: Formulario + lista de actividades ── */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Formulario */}
                  <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <EventIcon sx={{ fontSize: '1rem' }} />
                      {activityForm._selectedDay
                        ? `Nueva actividad — ${DAY_LABELS[activityForm._selectedDay]} ${activityForm.date ? format(activityForm.date, 'dd/MM/yyyy') : ''} ${String(activityForm._selectedHour).padStart(2,'0')}:00`
                        : 'Nueva actividad (selecciona un slot en la matriz)'}
                    </Typography>

                    <Grid container spacing={1.5}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth size="small"
                          label="Título *"
                          value={activityForm.title}
                          onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                          placeholder="Ej: Preparación de clase, Reunión, etc."
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth size="small" multiline rows={2}
                          label="Descripción"
                          value={activityForm.description}
                          onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Fecha *"
                            value={activityForm.date}
                            onChange={(date) => setActivityForm({ ...activityForm, date })}
                            renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Tipo</InputLabel>
                          <Select
                            value={activityForm.type}
                            onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                            label="Tipo"
                          >
                            <MenuItem value="class">Clase</MenuItem>
                            <MenuItem value="meeting">Reunión</MenuItem>
                            <MenuItem value="preparation">Preparación</MenuItem>
                            <MenuItem value="other">Otro</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={activityForm.isPermanent}
                              onChange={(e) => setActivityForm({ ...activityForm, isPermanent: e.target.checked })}
                              color="secondary"
                              size="small"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight={activityForm.isPermanent ? 600 : 400}>
                                {activityForm.isPermanent ? '🔁 Permanente — se repite cada semana este día' : '📅 Puntual — solo el día seleccionado'}
                              </Typography>
                              {activityForm.isPermanent && (
                                <Typography variant="caption" color="text.secondary">
                                  Se puede borrar en cualquier momento. Aparecerá en el historial por cada semana pasada.
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{ alignItems: 'flex-start', mt: 0.5 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <TimePicker
                            label="Inicio *"
                            value={activityForm.startTime}
                            onChange={(time) => setActivityForm({ ...activityForm, startTime: time })}
                            renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <TimePicker
                            label="Fin *"
                            value={activityForm.endTime}
                            onChange={(time) => setActivityForm({ ...activityForm, endTime: time })}
                            renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          variant="contained" fullWidth size="small"
                          startIcon={<AddIcon />}
                          onClick={handleCreateActivity}
                          disabled={!activityForm.title || !activityForm.date || !activityForm.startTime || !activityForm.endTime}
                          sx={{ bgcolor: '#845EC2', '&:hover': { bgcolor: '#6b46c1' } }}
                        >
                          Crear actividad
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Lista de actividades existentes */}
                  <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      ACTIVIDADES REGISTRADAS ({activities.length})
                    </Typography>
                    {activities.length === 0 ? (
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                        No hay actividades aún.
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                        {[...activities].sort((a, b) => new Date(a.date) - new Date(b.date)).map((activity) => (
                          <Paper key={activity.id} elevation={0} sx={{
                            p: 1.2,
                            border: '1px solid', borderColor: 'divider',
                            borderRadius: 1.5,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 1
                          }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {activity.isPermanent && (
                                  <Tooltip title="Actividad permanente — se repite cada semana" arrow>
                                    <Typography sx={{ fontSize: '0.75rem', cursor: 'help' }}>🔁</Typography>
                                  </Tooltip>
                                )}
                                <Typography variant="body2" fontWeight={600} noWrap>{activity.title}</Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {activity.isPermanent
                                  ? `Cada ${activity.dayOfWeek || ''} • ${activity.startTime?.slice(0,5)}–${activity.endTime?.slice(0,5)}`
                                  : (() => { try { return format(parseISO(activity.date), 'EEE dd/MM/yy'); } catch { return activity.date; } })() + ` • ${activity.startTime?.slice(0,5)}–${activity.endTime?.slice(0,5)}`
                                }
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                              <Chip size="small" label={activity.type} color="primary" variant="outlined" sx={{ fontSize: '0.62rem', height: 20 }} />
                              <IconButton size="small" onClick={() => handleDeleteActivity(activity.id)} color="error" sx={{ p: 0.3 }}>
                                <CloseIcon sx={{ fontSize: '0.9rem' }} />
                              </IconButton>
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
        <Button onClick={onClose} color="inherit">{translations.close || "Close"}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleDialog;