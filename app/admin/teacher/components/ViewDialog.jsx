'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  Box, IconButton, Typography, Avatar,
  Tabs, Tab, Chip, Grid, Divider,
  CircularProgress, Table, TableBody, TableCell,
  TableHead, TableRow, TableContainer, Paper,
  TextField, Button, ButtonGroup, Alert,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AccessTime as TimeIcon,
  Assignment as TaskIcon,
  Quiz as ExamIcon,
  CalendarMonth as CalendarIcon,
  FilterList as FilterIcon,
  Event as ActivityIcon,
  Loop as PermanentIcon
} from '@mui/icons-material';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { fetchWithAuth } from '@/app/utils/api';
import moment from 'moment';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const ACTIVITY_TYPE_LABELS = {
  class:       'Clase',
  meeting:     'Reunión',
  preparation: 'Preparación',
  other:       'Otro',
};
const ACTIVITY_TYPE_COLORS = {
  class:       { color: '#1976d2', bg: 'rgba(25,118,210,0.12)' },
  meeting:     { color: '#845EC2', bg: 'rgba(132,94,194,0.12)' },
  preparation: { color: '#f57c00', bg: 'rgba(245,124,0,0.12)'  },
  other:       { color: '#9e9e9e', bg: 'rgba(158,158,158,0.12)' },
};

const StatusChip = ({ status }) => {
  const map = {
    completed: { label: 'Completado', color: '#2e7d32', bg: 'rgba(46,125,50,0.12)' },
    approved:  { label: 'Aprobado',   color: '#1976d2', bg: 'rgba(25,118,210,0.12)' },
    reviewed:  { label: 'Revisado',   color: '#845EC2', bg: 'rgba(132,94,194,0.12)' },
    rejected:  { label: 'Rechazado',  color: '#d32f2f', bg: 'rgba(211,47,47,0.12)' },
    attended:  { label: 'Dada',       color: '#2e7d32', bg: 'rgba(46,125,50,0.12)' },
  };
  const s = map[status] || { label: status || '—', color: '#9e9e9e', bg: 'rgba(158,158,158,0.12)' };
  return (
    <Chip size="small" label={s.label}
      sx={{ fontWeight: 600, bgcolor: s.bg, color: s.color, border: `1px solid ${s.color}33` }}
    />
  );
};

export default function ViewDialog({ open, onClose, teacher }) {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError,   setHistoryError]   = useState(null);
  const [tasks,          setTasks]          = useState([]);
  const [exams,          setExams]          = useState([]);
  const [activities,     setActivities]     = useState([]);   // ← NEW

  const [givenClasses,   setGivenClasses]   = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError,   setClassesError]   = useState(null);

  const [quickFilter, setQuickFilter] = useState('week');
  const [fromDate,    setFromDate]    = useState('');

  // ── Activity filters (NEW) ──
  const [actSearch,     setActSearch]     = useState('');
  const [actTypeFilter, setActTypeFilter] = useState('all');

  const today = moment().format('YYYY-MM-DD');

  // ── Load given classes ──
  const loadGivenClasses = useCallback(async (filter, from) => {
    if (!teacher?.id) return;
    if (filter === 'custom' && !from) { setGivenClasses([]); return; }

    setClassesLoading(true);
    setClassesError(null);
    try {
      let url = `/teachers/${teacher.id}/given-classes`;
      const params = [];
      if (filter === 'week') {
        params.push(`startDate=${moment().subtract(7, 'days').format('YYYY-MM-DD')}`, `endDate=${today}`);
      } else if (filter === 'custom' && from) {
        params.push(`startDate=${from}`, `endDate=${today}`);
      }
      if (params.length) url += '?' + params.join('&');
      const data = await fetchWithAuth(url);
      setGivenClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading given classes:', err);
      setClassesError('No se pudieron cargar las clases dadas.');
      setGivenClasses([]);
    } finally {
      setClassesLoading(false);
    }
  }, [teacher?.id, today]);

  // ── Load history when entering Tab 2 ──
  useEffect(() => {
    if (!open || !teacher?.id || activeTab !== 2) return;

    setHistoryLoading(true);
    setHistoryError(null);
    fetchWithAuth(`/teachers/${teacher.id}/history`)
      .then(data => {
        setTasks(data?.tasks      || []);
        setExams(data?.exams      || []);
        setActivities(data?.activities || []);   // ← NEW
      })
      .catch(() => setHistoryError('No se pudieron cargar tareas/exámenes.'))
      .finally(() => setHistoryLoading(false));

    loadGivenClasses(quickFilter, fromDate);
  }, [open, teacher?.id, activeTab]);

  // ── Reload given classes on filter change ──
  useEffect(() => {
    if (!open || !teacher?.id || activeTab !== 2) return;
    loadGivenClasses(quickFilter, fromDate);
  }, [quickFilter, fromDate]);

  // ── Reset on close ──
  useEffect(() => {
    if (!open) {
      setActiveTab(0);
      setTasks([]); setExams([]); setActivities([]);
      setGivenClasses([]);
      setHistoryError(null); setClassesError(null);
      setQuickFilter('week'); setFromDate('');
      setActSearch(''); setActTypeFilter('all');
    }
  }, [open]);

  if (!teacher) return null;

  // ── Filtered activities ──
  const filteredActivities = activities.filter(a => {
    const matchSearch = (a.title || '').toLowerCase().includes(actSearch.toLowerCase()) ||
                        (a.description || '').toLowerCase().includes(actSearch.toLowerCase());
    const matchType = actTypeFilter === 'all' || a.type === actTypeFilter;
    return matchSearch && matchType;
  });

  const formatTimeSlots = (slots) => {
    if (!slots || !Array.isArray(slots) || slots.length === 0)
      return <Typography variant="body2" color="text.secondary">—</Typography>;
    return slots.map((s, i) => (
      <Typography key={i} variant="body2">{s.start} – {s.end}</Typography>
    ));
  };

  const getWorkingHoursText = () => {
    if (!teacher.workHours) return '0 días';
    return `${Object.keys(teacher.workHours).filter(d =>
      Array.isArray(teacher.workHours[d]) && teacher.workHours[d].length > 0
    ).length} días configurados`;
  };

  const getBreakHoursText = () => {
    if (!teacher.breakHours) return '0 días';
    return `${Object.keys(teacher.breakHours).filter(d =>
      Array.isArray(teacher.breakHours[d]) && teacher.breakHours[d].length > 0
    ).length} días configurados`;
  };

  const cellSx = {
    color: theme.text?.primary,
    borderColor: theme.mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
  };
  const headCellSx = {
    fontWeight: 700,
    color: theme.mode === 'light' ? '#5D3E9E' : '#9D7DD6',
    bgcolor: theme.mode === 'light' ? 'rgba(132,94,194,0.07)' : 'rgba(0,0,0,0.25)',
    borderColor: theme.mode === 'light' ? 'rgba(132,94,194,0.2)' : 'rgba(132,94,194,0.3)',
  };

  const EmptyState = ({ msg }) => (
    <Box sx={{
      p: 4, textAlign: 'center', border: '1px dashed',
      borderColor: theme.mode === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)',
      borderRadius: 2,
      bgcolor: theme.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)'
    }}>
      <Typography variant="body2" sx={{ color: theme.text?.secondary }}>{msg}</Typography>
    </Box>
  );

  const filterButtons = [
    { key: 'week',   label: 'Última semana' },
    { key: 'custom', label: 'Desde fecha...' },
    { key: 'all',    label: 'Todas' },
  ];

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
          backgroundImage: 'none'
        }
      }}
    >
      {/* ── Header ── */}
      <DialogTitle sx={{
        m: 0, p: 2, color: theme.text?.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: theme.mode === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#845EC2', width: 48, height: 48 }}>
            {teacher.firstName ? teacher.firstName[0].toUpperCase() : 'T'}
          </Avatar>
          <Box>
            <Typography variant="h6" component="span" sx={{ fontWeight: 600, display: 'block' }}>
              {teacher.firstName} {teacher.lastName}
            </Typography>
            <Chip size="small"
              label={teacher.isCoordinator ? 'Coordinator' : 'Teacher'}
              sx={{
                fontWeight: 500, mt: 0.5,
                bgcolor: teacher.isCoordinator
                  ? theme.mode === 'light' ? 'rgba(132,94,194,0.1)' : 'rgba(132,94,194,0.2)'
                  : theme.mode === 'light' ? 'rgba(25,118,210,0.1)' : 'rgba(25,118,210,0.2)',
                color: teacher.isCoordinator ? '#845EC2' : '#1976d2',
              }}
            />
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: theme.text?.secondary }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* ── Tabs ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': { color: theme.text?.secondary, '&.Mui-selected': { color: '#845EC2' } },
            '& .MuiTabs-indicator': { backgroundColor: '#845EC2' },
          }}
        >
          <Tab label={translations.overview || 'Overview'} />
          <Tab label={translations.schedule  || 'Schedule'} />
          <Tab label={translations.history   || 'History'} />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{
        borderColor: theme.mode === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
        bgcolor: theme.mode === 'light' ? '#fff' : '#1e1e2d'
      }}>

        {/* ══ TAB 0: OVERVIEW ══ */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: theme.text?.primary }}>
              {translations.contactInfo || 'Contact Information'}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: theme.text?.primary }}>
                  <EmailIcon sx={{ color: '#845EC2' }} />
                  <Typography>{teacher.user?.email || '—'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: theme.text?.primary }}>
                  <PhoneIcon sx={{ color: '#845EC2' }} />
                  <Typography>{teacher.phone || '—'}</Typography>
                </Box>
              </Grid>
            </Grid>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: theme.text?.primary }}>
              {translations.workInfo || 'Work Information'}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: theme.text?.primary }}>
                  <TimeIcon sx={{ color: '#845EC2' }} />
                  <Typography>{translations.workHours  || 'Work Hours'}:  {getWorkingHoursText()}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: theme.text?.primary }}>
                  <TimeIcon sx={{ color: '#845EC2' }} />
                  <Typography>{translations.breakHours || 'Break Hours'}: {getBreakHoursText()}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ══ TAB 1: SCHEDULE ══ */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            {['workHours', 'breakHours'].map(type => (
              <Grid item xs={12} key={type}>
                <Typography variant="subtitle1" sx={{
                  mb: 2, mt: type === 'breakHours' ? 1 : 0,
                  fontWeight: 600, color: theme.text?.primary,
                  display: 'flex', alignItems: 'center', gap: 1
                }}>
                  <TimeIcon sx={{ color: '#845EC2' }} />
                  {type === 'workHours' ? (translations.workHours || 'Work Hours') : (translations.breakHours || 'Break Hours')}
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCellSx, width: '30%' }}>{translations.day || 'Day'}</TableCell>
                        <TableCell sx={headCellSx}>{translations.timeSlots || 'Time Slots'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {DAYS_OF_WEEK.map(day => (
                        <TableRow key={day}>
                          <TableCell sx={{ ...cellSx, textTransform: 'capitalize' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {day}
                              {(day === 'saturday' || day === 'sunday') && (
                                <Chip size="small" label="Holiday"
                                  sx={{ bgcolor: 'rgba(211,47,47,0.1)', color: '#d32f2f', fontWeight: 500 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={cellSx}>
                            {day === 'saturday' || day === 'sunday'
                              ? <Typography variant="body2" color="text.secondary">Holiday</Typography>
                              : formatTimeSlots(teacher[type]?.[day])}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            ))}
          </Grid>
        )}

        {/* ══ TAB 2: HISTORY ══ */}
        {activeTab === 2 && (
          <Box>
            {historyLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 2 }}>
                <CircularProgress size={40} sx={{ color: '#845EC2' }} />
                <Typography variant="body2" sx={{ color: theme.text?.secondary }}>Cargando historial...</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

                {/* ── CLASES DADAS ── */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: theme.text?.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ color: '#2e7d32' }} />
                      Clases dadas
                      {!classesLoading && (
                        <Chip size="small" label={givenClasses.length}
                          sx={{ bgcolor: 'rgba(46,125,50,0.12)', color: '#2e7d32', fontWeight: 700, ml: 0.5 }}
                        />
                      )}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FilterIcon sx={{ color: theme.text?.secondary, fontSize: '1.1rem' }} />
                      <ButtonGroup size="small">
                        {filterButtons.map(opt => (
                          <Button key={opt.key}
                            onClick={() => setQuickFilter(opt.key)}
                            variant={quickFilter === opt.key ? 'contained' : 'outlined'}
                            sx={{
                              textTransform: 'none',
                              bgcolor:     quickFilter === opt.key ? '#845EC2' : 'transparent',
                              borderColor: '#845EC2',
                              color:       quickFilter === opt.key ? '#fff' : '#845EC2',
                              fontWeight:  quickFilter === opt.key ? 700 : 400,
                              '&:hover': { bgcolor: quickFilter === opt.key ? '#6B46C1' : 'rgba(132,94,194,0.08)', borderColor: '#845EC2' }
                            }}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </ButtonGroup>
                    </Box>
                  </Box>

                  {quickFilter === 'custom' && (
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, borderRadius: 2,
                      bgcolor: theme.mode === 'light' ? 'rgba(132,94,194,0.04)' : 'rgba(132,94,194,0.1)',
                      border: '1px solid rgba(132,94,194,0.25)', flexWrap: 'wrap'
                    }}>
                      <Typography variant="body2" sx={{ color: theme.text?.secondary, whiteSpace: 'nowrap' }}>Desde:</Typography>
                      <TextField
                        type="date" size="small" value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        inputProps={{ max: today }}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          width: 170,
                          '& .MuiOutlinedInput-root': {
                            bgcolor: theme.mode === 'light' ? '#fff' : 'rgba(255,255,255,0.05)',
                            '& fieldset': { borderColor: 'rgba(132,94,194,0.4)' },
                            '&:hover fieldset': { borderColor: '#845EC2' },
                            '&.Mui-focused fieldset': { borderColor: '#845EC2' },
                          },
                          '& .MuiInputBase-input': { color: theme.text?.primary }
                        }}
                      />
                      <Typography variant="body2" sx={{ color: theme.text?.secondary, whiteSpace: 'nowrap' }}>
                        hasta hoy <strong>({moment().format('DD/MM/YYYY')})</strong>
                      </Typography>
                    </Box>
                  )}

                  {quickFilter === 'week' && (
                    <Typography variant="caption" sx={{ color: theme.text?.secondary, mb: 1.5, display: 'block' }}>
                      Del {moment().subtract(7, 'days').format('DD/MM/YYYY')} al {moment().format('DD/MM/YYYY')}
                    </Typography>
                  )}
                  {quickFilter === 'custom' && fromDate && (
                    <Typography variant="caption" sx={{ color: theme.text?.secondary, mb: 1.5, display: 'block' }}>
                      Del {moment(fromDate).format('DD/MM/YYYY')} al {moment().format('DD/MM/YYYY')}
                    </Typography>
                  )}

                  {classesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress size={28} sx={{ color: '#845EC2' }} />
                    </Box>
                  ) : classesError ? (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>{classesError}</Alert>
                  ) : quickFilter === 'custom' && !fromDate ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      Selecciona una fecha de inicio para ver las clases en ese rango.
                    </Alert>
                  ) : givenClasses.length === 0 ? (
                    <EmptyState msg={quickFilter === 'week' ? 'No hay clases dadas en los últimos 7 días.' : 'No hay clases dadas en el rango seleccionado.'} />
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headCellSx}>Fecha</TableCell>
                            <TableCell sx={headCellSx}>Hora</TableCell>
                            <TableCell sx={headCellSx}>Estudiante</TableCell>
                            <TableCell sx={headCellSx}>Estado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {givenClasses.map((row, idx) => (
                            <TableRow key={`${row.classId}-${row.studentId}-${idx}`}
                              sx={{ '&:hover': { bgcolor: theme.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' } }}
                            >
                              <TableCell sx={cellSx}>
                                <Typography variant="body2" fontWeight={500}>
                                  {row.date ? moment(row.date).format('DD/MM/YYYY') : '—'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: theme.text?.secondary, textTransform: 'capitalize' }}>
                                  {row.date ? moment(row.date).format('dddd') : ''}
                                </Typography>
                              </TableCell>
                              <TableCell sx={cellSx}>
                                <Typography variant="body2">
                                  {row.startTime && row.endTime
                                    ? `${String(row.startTime).substring(0, 5)} – ${String(row.endTime).substring(0, 5)}`
                                    : row.startTime || '—'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={cellSx}>
                                <Typography variant="body2" fontWeight={500}>
                                  {row.studentName} {row.studentSurname}
                                </Typography>
                              </TableCell>
                              <TableCell sx={cellSx}>
                                <StatusChip status={row.studentClassStatus || 'attended'} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                {historyError && <Alert severity="warning" sx={{ borderRadius: 2 }}>{historyError}</Alert>}

                <Divider />

                {/* ── TAREAS ── */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, color: theme.text?.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TaskIcon sx={{ color: '#845EC2' }} />
                    Tareas completadas
                    <Chip size="small" label={tasks.length}
                      sx={{ bgcolor: 'rgba(132,94,194,0.12)', color: '#845EC2', fontWeight: 700, ml: 0.5 }}
                    />
                  </Typography>
                  {tasks.length === 0 ? <EmptyState msg="No hay tareas completadas." /> : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headCellSx}>Tarea</TableCell>
                            <TableCell sx={headCellSx}>Fecha límite</TableCell>
                            <TableCell sx={headCellSx}>Completada</TableCell>
                            <TableCell sx={headCellSx}>Coordinador</TableCell>
                            <TableCell sx={headCellSx}>Estado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tasks.map(task => (
                            <TableRow key={task.id}
                              sx={{ '&:hover': { bgcolor: theme.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' } }}
                            >
                              <TableCell sx={cellSx}>
                                <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
                                {task.description && (
                                  <Typography variant="caption" sx={{ color: theme.text?.secondary }}>{task.description}</Typography>
                                )}
                              </TableCell>
                              <TableCell sx={cellSx}>{task.dueDate       ? moment(task.dueDate).format('DD/MM/YYYY')       : '—'}</TableCell>
                              <TableCell sx={cellSx}>{task.completedDate ? moment(task.completedDate).format('DD/MM/YYYY') : '—'}</TableCell>
                              <TableCell sx={cellSx}>{task.coordinator || '—'}</TableCell>
                              <TableCell sx={cellSx}>
                                <StatusChip status={task.status} />
                                {task.reviewNotes && (
                                  <Typography variant="caption" sx={{ display: 'block', color: theme.text?.secondary, mt: 0.5 }}>
                                    {task.reviewNotes}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                <Divider />

                {/* ── EXÁMENES ── */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, color: theme.text?.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ExamIcon sx={{ color: '#1976d2' }} />
                    Exámenes
                    <Chip size="small" label={exams.length}
                      sx={{ bgcolor: 'rgba(25,118,210,0.12)', color: '#1976d2', fontWeight: 700, ml: 0.5 }}
                    />
                  </Typography>
                  {exams.length === 0 ? <EmptyState msg="No hay exámenes registrados." /> : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headCellSx}>Examen</TableCell>
                            <TableCell sx={headCellSx}>Preguntas</TableCell>
                            <TableCell sx={headCellSx}>Completado</TableCell>
                            <TableCell sx={headCellSx}>Coordinador</TableCell>
                            <TableCell sx={headCellSx}>Estado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {exams.map(exam => (
                            <TableRow key={exam.id}
                              sx={{ '&:hover': { bgcolor: theme.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' } }}
                            >
                              <TableCell sx={cellSx}>
                                <Typography variant="body2" fontWeight={600}>{exam.title}</Typography>
                                {exam.description && (
                                  <Typography variant="caption" sx={{ color: theme.text?.secondary }}>{exam.description}</Typography>
                                )}
                              </TableCell>
                              <TableCell sx={cellSx}>{exam.totalQuestions ?? '—'}</TableCell>
                              <TableCell sx={cellSx}>{exam.completedDate ? moment(exam.completedDate).format('DD/MM/YYYY') : '—'}</TableCell>
                              <TableCell sx={cellSx}>{exam.coordinator || '—'}</TableCell>
                              <TableCell sx={cellSx}>
                                <StatusChip status={exam.status} />
                                {exam.reviewNotes && (
                                  <Typography variant="caption" sx={{ display: 'block', color: theme.text?.secondary, mt: 0.5 }}>
                                    {exam.reviewNotes}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                <Divider />

                {/* ══════════════════════════════════════════════════
                    ── ACTIVIDADES PASADAS (NEW) ──
                ══════════════════════════════════════════════════ */}
                <Box>
                  {/* Header + filtros */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: theme.text?.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ActivityIcon sx={{ color: '#f57c00' }} />
                      Actividades pasadas
                      <Chip size="small" label={filteredActivities.length}
                        sx={{ bgcolor: 'rgba(245,124,0,0.12)', color: '#f57c00', fontWeight: 700, ml: 0.5 }}
                      />
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel sx={{ fontSize: '0.75rem' }}>Tipo</InputLabel>
                        <Select
                          value={actTypeFilter}
                          onChange={e => setActTypeFilter(e.target.value)}
                          label="Tipo"
                          sx={{ fontSize: '0.75rem' }}
                        >
                          <MenuItem value="all">Todos</MenuItem>
                          <MenuItem value="class">Clase</MenuItem>
                          <MenuItem value="meeting">Reunión</MenuItem>
                          <MenuItem value="preparation">Preparación</MenuItem>
                          <MenuItem value="other">Otro</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        placeholder="Buscar…"
                        value={actSearch}
                        onChange={e => setActSearch(e.target.value)}
                        InputProps={{
                          startAdornment: <FilterIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '0.9rem' }} />,
                          sx: { fontSize: '0.75rem' }
                        }}
                        sx={{ width: 140 }}
                      />
                    </Box>
                  </Box>

                  {activities.length === 0 ? (
                    <EmptyState msg="No hay actividades pasadas registradas." />
                  ) : filteredActivities.length === 0 ? (
                    <EmptyState msg="No hay actividades que coincidan con el filtro." />
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headCellSx}>Actividad</TableCell>
                            <TableCell sx={headCellSx}>Fecha</TableCell>
                            <TableCell sx={headCellSx}>Horario</TableCell>
                            <TableCell sx={headCellSx} align="center">Tipo</TableCell>
                            <TableCell sx={headCellSx} align="center">Recurrencia</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredActivities.map(a => {
                            const typeStyle = ACTIVITY_TYPE_COLORS[a.type] || ACTIVITY_TYPE_COLORS.other;
                            return (
                              <TableRow key={a.id}
                                sx={{ '&:hover': { bgcolor: theme.mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' } }}
                              >
                                <TableCell sx={cellSx}>
                                  <Typography variant="body2" fontWeight={600}>{a.title}</Typography>
                                  {a.description && (
                                    <Typography variant="caption" sx={{ color: theme.text?.secondary }}>
                                      {a.description.length > 60 ? a.description.slice(0, 60) + '…' : a.description}
                                    </Typography>
                                  )}
                                </TableCell>

                                <TableCell sx={cellSx}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {a.date ? moment(a.date).format('DD/MM/YYYY') : '—'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: theme.text?.secondary, textTransform: 'capitalize' }}>
                                    {a.date ? moment(a.date).format('dddd') : ''}
                                  </Typography>
                                </TableCell>

                                <TableCell sx={cellSx}>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    {a.startTime ? String(a.startTime).slice(0, 5) : '—'}
                                    {' – '}
                                    {a.endTime   ? String(a.endTime).slice(0, 5)   : '—'}
                                  </Typography>
                                </TableCell>

                                <TableCell sx={cellSx} align="center">
                                  <Chip size="small"
                                    label={ACTIVITY_TYPE_LABELS[a.type] || a.type}
                                    sx={{
                                      fontWeight: 600, fontSize: '0.65rem',
                                      bgcolor: typeStyle.bg,
                                      color:   typeStyle.color,
                                      border: `1px solid ${typeStyle.color}33`
                                    }}
                                  />
                                </TableCell>

                                <TableCell sx={cellSx} align="center">
                                  {a.isPermanent ? (
                                    <Chip size="small"
                                      icon={<PermanentIcon sx={{ fontSize: '0.8rem !important' }} />}
                                      label="🔁 Permanente"
                                      sx={{
                                        fontWeight: 600, fontSize: '0.62rem',
                                        bgcolor: 'rgba(132,94,194,0.12)',
                                        color:   '#845EC2',
                                        border:  '1px solid rgba(132,94,194,0.33)'
                                      }}
                                    />
                                  ) : (
                                    <Chip size="small" label="Puntual"
                                      sx={{
                                        fontWeight: 500, fontSize: '0.62rem',
                                        bgcolor: theme.mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                                        color: theme.text?.secondary,
                                      }}
                                    />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

              </Box>
            )}
          </Box>
        )}

      </DialogContent>
    </Dialog>
  );
}