'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  TextField, Button, MenuItem, CircularProgress,
  Alert, Divider, IconButton, Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as ConfirmIcon
} from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { studentAPI, fetchWithAuth } from '../../../utils/api';
import TeacherAvailabilityCalendar from './TeacherAvailabilityCalendar';
import ClassSchedulingForm from './ClassSchedulingForm';
import moment from 'moment';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: UpgradeDialog
// ─────────────────────────────────────────────────────────────────────────────
const UpgradeDialog = ({ open, onClose, student, packages, setMessage, refreshStudents }) => {
  const { theme } = useTheme();
  const { translations } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [startDate, setStartDate] = useState(moment().format('YYYY-MM-DD'));

  // ── Profesor ──
  const [currentTeacherId, setCurrentTeacherId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [allTeachers, setAllTeachers] = useState([]);
  const [teacherSchedule, setTeacherSchedule] = useState(null);

  const [slotsPerPhase, setSlotsPerPhase] = useState({});
  const [currentPhase, setCurrentPhase] = useState(1);
  const [totalPhases, setTotalPhases] = useState(1);
  const [scheduledClasses, setScheduledClasses] = useState([]);
  const [showReview, setShowReview] = useState(false);

  const activePkg = useMemo(
    () => student?.packages?.find(p => p.status === 'active'),
    [student]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ALGORITMO DE UPGRADE:
  // Válido si:
  //   (a) clases/semana nuevo > clases/semana actual  → más intensivo
  //   (b) clases/semana iguales Y semanas nuevo > semanas actual → mismo ritmo, más duración
  // ─────────────────────────────────────────────────────────────────────────
  const upgradeOptions = useMemo(() => {
    if (!activePkg?.package) return [];

    const currWeeks = activePkg.package.durationWeeks || 4;
    const currTotal = activePkg.package.totalClasses || 0;
    const currFreq = currWeeks > 0 ? currTotal / currWeeks : 0;

    return packages.filter(p => {
      if (!p.active) return false;
      if (p.id === activePkg.packageId) return false;

      const newWeeks = p.durationWeeks || 4;
      const newFreq = newWeeks > 0 ? p.totalClasses / newWeeks : 0;

      const masIntensivo = newFreq > currFreq;
      const mismoRitmoMasDuracion = newFreq === currFreq && newWeeks > currWeeks;

      return masIntensivo || mismoRitmoMasDuracion;
    });
  }, [packages, activePkg]);

  const stats = useMemo(() => {
    if (!activePkg || !selectedPackageId) return null;
    const newPkg = packages.find(p => p.id === selectedPackageId);
    if (!newPkg) return null;
    const clasesUsadas = (activePkg.package?.totalClasses || 0) - (activePkg.remainingClasses || 0);
    const clasesACrear = newPkg.totalClasses - clasesUsadas;
    return { clasesUsadas, clasesACrear: Math.max(clasesACrear, 0), newPkg };
  }, [activePkg, selectedPackageId, packages]);

  // ── Al abrir: cargar todo ──
  useEffect(() => {
    if (!open || !student?.id) return;

    fetchWithAuth('/teachers')
      .then(res => setAllTeachers(Array.isArray(res) ? res.filter(t => t.active) : []))
      .catch(() => setAllTeachers([]));

    fetchWithAuth(`/students/${student.id}/weekly-schedule`)
      .then(res => {
        const initialSlots = {};
        (res.weeklySchedule || []).forEach((slot, i) => {
          initialSlots[i + 1] = { ...slot, start: slot.startTime, end: slot.endTime, phase: i + 1 };
        });
        setSlotsPerPhase(initialSlots);
      })
      .catch(() => {});

    fetchWithAuth(`/students/${student.id}/teacher`)
      .then(res => {
        const tid = res?.teacherId || '';
        setCurrentTeacherId(tid);
        setSelectedTeacherId(tid);
        if (tid) loadTeacherSchedule(tid);
      })
      .catch(() => {});
  }, [open, student?.id]);

  // ── Recalcular fases al cambiar paquete ──
  useEffect(() => {
    if (!selectedPackageId) return;
    const newPkg = packages.find(p => p.id === selectedPackageId);
    if (newPkg) {
      const weeks = newPkg.durationWeeks || 4;
      const freq = weeks > 0 ? Math.round(newPkg.totalClasses / weeks) : 1;
      setTotalPhases(freq);
      setCurrentPhase(1);
      setSlotsPerPhase({});
      setScheduledClasses([]);
      setShowReview(false);
    }
  }, [selectedPackageId, packages]);

  // ── Recargar calendario al cambiar profesor ──
  useEffect(() => {
    if (!selectedTeacherId) { setTeacherSchedule(null); return; }
    loadTeacherSchedule(selectedTeacherId);
  }, [selectedTeacherId]);

  const loadTeacherSchedule = async (teacherId) => {
    setLoadingSchedule(true);
    try {
      const data = await fetchWithAuth(`/teachers/${teacherId}/schedule`);
      setTeacherSchedule(data);
    } catch {
      setTeacherSchedule(null);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleSlotSelect = (slot) => {
    setSlotsPerPhase(prev => ({ ...prev, [currentPhase]: { ...slot, phase: currentPhase } }));
  };

  const handleReviewClasses = () => {
    if (!stats || stats.clasesACrear <= 0) {
      setMessage({ open: true, text: 'No hay clases nuevas que generar', severity: 'warning' });
      return;
    }
    if (Object.keys(slotsPerPhase).length < totalPhases) {
      setMessage({ open: true, text: `Debes seleccionar los ${totalPhases} bloques horarios`, severity: 'warning' });
      return;
    }

    const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const sortedSlots = Object.values(slotsPerPhase)
      .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

    const generated = [];
    let current = moment(startDate);
    let found = 0;
    let safety = 0;

    while (found < stats.clasesACrear && safety < 500) {
      safety++;
      const dayName = current.format('dddd').toLowerCase();
      const slot = sortedSlots.find(s => s.day === dayName);
      if (slot) {
        generated.push({
          date: current.format('YYYY-MM-DD'),
          startTime: slot.start || slot.startTime,
          endTime: slot.end || slot.endTime,
          teacherId: selectedTeacherId || undefined,
          classNumber: found + 1
        });
        found++;
      }
      current.add(1, 'day');
    }

    setScheduledClasses(generated);
    setShowReview(true);
  };

  const handleConfirm = async () => {
    if (!selectedPackageId || scheduledClasses.length === 0) {
      setMessage({ open: true, text: 'Faltan datos para confirmar el upgrade', severity: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await studentAPI.upgradePackage(student.id, {
        newPackageId: selectedPackageId,
        startDate,
        classes: scheduledClasses,
        weeklySchedule: Object.values(slotsPerPhase).map(s => ({
          day: s.day,
          hour: parseInt((s.start || s.startTime || '0').split(':')[0]),
          startTime: s.start || s.startTime,
          endTime: s.end || s.endTime,
        })),
        teacherId: selectedTeacherId,
      });

      // Si cambió de profesor, actualizar la relación TeacherStudent
      if (selectedTeacherId && selectedTeacherId !== currentTeacherId) {
        if (currentTeacherId) {
          await fetchWithAuth(`/teachers/${currentTeacherId}/students/${student.id}`, {
            method: 'DELETE'
          }).catch(() => {});
        }
        // La nueva relación se crea en el backend del upgrade con el teacherId enviado
      }

      setMessage({ open: true, text: '¡Upgrade realizado con éxito!', severity: 'success' });
      if (typeof refreshStudents === 'function') refreshStudents();
      handleClose();
    } catch (e) {
      setMessage({ open: true, text: e.message || 'Error al hacer upgrade', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPackageId('');
    setStartDate(moment().format('YYYY-MM-DD'));
    setSelectedTeacherId('');
    setCurrentTeacherId('');
    setTeacherSchedule(null);
    setSlotsPerPhase({});
    setCurrentPhase(1);
    setTotalPhases(1);
    setScheduledClasses([]);
    setShowReview(false);
    onClose();
  };

  if (!student) return null;

  const allPhasesSelected = Object.keys(slotsPerPhase).length >= totalPhases;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, bgcolor: theme.mode === 'light' ? '#fff' : '#1e1e2d' } }}
    >
      {/* Título — component="span" para evitar h6 dentro de h2 */}
      <DialogTitle sx={{ bgcolor: '#845EC2', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span">
          Upgrade: {student.name} {student.surname}
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        {!showReview ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {/* Info paquete actual */}
            <Alert severity="info">
              Paquete actual: <strong>{activePkg?.package?.name}</strong>
              &nbsp;·&nbsp;{activePkg?.package?.totalClasses} clases
              &nbsp;·&nbsp;{activePkg?.package?.durationWeeks} semanas
              &nbsp;·&nbsp;{(() => {
                const w = activePkg?.package?.durationWeeks || 1;
                const t = activePkg?.package?.totalClasses || 0;
                return Math.round(t / w);
              })()} clase(s)/semana
              &nbsp;·&nbsp;<strong>{activePkg?.remainingClasses} restantes</strong>
            </Alert>

            {/* Selector de paquete */}
            <TextField
              select fullWidth
              label="Nuevo Paquete"
              value={selectedPackageId}
              onChange={e => setSelectedPackageId(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: theme.mode === 'light' ? '#fff' : 'rgba(255,255,255,0.05)' } }}
            >
              {upgradeOptions.length === 0 && (
                <MenuItem disabled value="">Sin opciones de upgrade disponibles</MenuItem>
              )}
              {upgradeOptions.map(p => {
                const freq = p.durationWeeks > 0 ? Math.round(p.totalClasses / p.durationWeeks) : 0;
                return (
                  <MenuItem key={p.id} value={p.id}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>
                        {p.totalClasses} clases · {p.durationWeeks} semanas · {freq}x/semana
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              })}
            </TextField>

            {selectedPackageId && stats && (
              <>
                {/* Resumen */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: theme.mode === 'light' ? 'rgba(132,94,194,0.05)' : 'rgba(132,94,194,0.1)', borderColor: 'rgba(132,94,194,0.3)' }}>
                  <Typography variant="body2" sx={{ color: theme.mode === 'light' ? '#333' : '#ddd' }}>
                    Clases ya tomadas:&nbsp;<strong>{stats.clasesUsadas}</strong>
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    Clases nuevas a programar:&nbsp;<strong style={{ color: '#845EC2' }}>{stats.clasesACrear}</strong>
                  </Typography>
                </Paper>

                <Divider />

                {/* ── Selector de profesor ── */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: theme.mode === 'light' ? '#333' : '#ddd' }}>
                    Profesor para las nuevas clases
                  </Typography>
                  <TextField
                    select fullWidth
                    label="Seleccionar Profesor"
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: theme.mode === 'light' ? '#fff' : 'rgba(255,255,255,0.05)' } }}
                  >
                    <MenuItem value=""><em>Sin profesor</em></MenuItem>
                    {allTeachers.map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                        {t.id === currentTeacherId && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, color: '#845EC2', fontWeight: 600 }}>
                            · actual
                          </Typography>
                        )}
                      </MenuItem>
                    ))}
                  </TextField>
                  {selectedTeacherId && selectedTeacherId !== currentTeacherId && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Al confirmar, el profesor asignado al estudiante cambiará.
                    </Alert>
                  )}
                </Box>

                <Divider />

                {/* ── Bloques horarios ── */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: theme.mode === 'light' ? '#333' : '#ddd' }}>
                    Paso 1 — Selecciona {totalPhases} bloque{totalPhases > 1 ? 's' : ''} horario{totalPhases > 1 ? 's' : ''} en el calendario
                    &nbsp;({Object.keys(slotsPerPhase).length}/{totalPhases} seleccionados)
                  </Typography>

                  {/* Navegación de fases */}
                  <Box sx={{ mb: 2, p: 2, bgcolor: theme.mode === 'light' ? '#f8f9fa' : '#252538', borderRadius: 2, border: '2px solid #845EC2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: theme.mode === 'light' ? '#333' : '#ddd' }}>
                      Configurando bloque&nbsp;<strong>{currentPhase}</strong>&nbsp;de&nbsp;<strong>{totalPhases}</strong>:&nbsp;
                      {slotsPerPhase[currentPhase]
                        ? <strong style={{ color: '#845EC2' }}>{slotsPerPhase[currentPhase].day} · {slotsPerPhase[currentPhase].start || slotsPerPhase[currentPhase].startTime}</strong>
                        : <em style={{ color: '#aaa' }}>haz clic en el calendario</em>
                      }
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="outlined" disabled={currentPhase === 1} onClick={() => setCurrentPhase(p => p - 1)}>
                        ← Atrás
                      </Button>
                      <Button size="small" variant="contained" disabled={currentPhase === totalPhases || !slotsPerPhase[currentPhase]} onClick={() => setCurrentPhase(p => p + 1)} sx={{ bgcolor: '#845EC2' }}>
                        Siguiente →
                      </Button>
                    </Box>
                  </Box>

                  {/* Calendario */}
                  {!selectedTeacherId ? (
                    <Alert severity="info">Selecciona un profesor arriba para ver su disponibilidad.</Alert>
                  ) : loadingSchedule ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress sx={{ color: '#845EC2' }} />
                    </Box>
                  ) : teacherSchedule ? (
                    <TeacherAvailabilityCalendar
                      teacherSchedule={teacherSchedule}
                      onSlotSelect={handleSlotSelect}
                      currentStudent={student}
                      scheduledClasses={Object.values(slotsPerPhase).map(s => ({
                        date: moment().day(s.day || 'monday').format('YYYY-MM-DD'),
                        startTime: s.start || s.startTime
                      }))}
                    />
                  ) : (
                    <Alert severity="warning">No se pudo cargar el horario del profesor.</Alert>
                  )}
                </Box>

                <Divider />

                {/* ── Fecha de inicio ── */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: theme.mode === 'light' ? '#333' : '#ddd' }}>
                    Paso 2 — Fecha de inicio del nuevo paquete
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <TextField
                      type="date"
                      label="Fecha de inicio"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: moment().format('YYYY-MM-DD') }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: theme.mode === 'light' ? '#fff' : 'rgba(255,255,255,0.05)' } }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleReviewClasses}
                      disabled={!allPhasesSelected || !startDate || stats.clasesACrear <= 0}
                      sx={{
                        height: 56, px: 3,
                        bgcolor: '#845EC2', '&:hover': { bgcolor: '#6B46C1' },
                        '&:disabled': { bgcolor: 'rgba(0,0,0,0.12)' }
                      }}
                    >
                      Revisar y generar clases →
                    </Button>
                  </Box>
                  {!allPhasesSelected && (
                    <Typography variant="caption" sx={{ color: '#aaa', mt: 0.5, display: 'block' }}>
                      Completa los {totalPhases} bloques horarios en el calendario primero.
                    </Typography>
                  )}
                </Box>
              </>
            )}
          </Box>
        ) : (
          // ── Revisión ──
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Se generaron <strong>{scheduledClasses.length}</strong> clases nuevas
              {selectedTeacherId !== currentTeacherId && selectedTeacherId && (
                <> · El profesor será cambiado al confirmar</>
              )}.
            </Alert>
            <ClassSchedulingForm
              scheduledClasses={scheduledClasses}
              setScheduledClasses={setScheduledClasses}
              packageId={selectedPackageId}
              teacherId={selectedTeacherId}
            />
            <Button onClick={() => setShowReview(false)} sx={{ mt: 2, color: '#845EC2' }}>
              ← Volver a editar
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: theme.mode === 'light' ? '#f8f9fa' : '#252538' }}>
        <Button onClick={handleClose} sx={{ color: theme.mode === 'light' ? '#555' : '#aaa' }}>
          Cancelar
        </Button>
        {showReview && (
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={loading || scheduledClasses.length === 0}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ConfirmIcon />}
            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
          >
            {loading ? 'Procesando...' : 'Confirmar Upgrade'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UpgradeDialog;