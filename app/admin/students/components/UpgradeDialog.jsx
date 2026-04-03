'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  TextField, Button, Grid, MenuItem, CircularProgress, FormControlLabel,
  Switch, Alert, Chip, Divider, IconButton, Paper
} from '@mui/material';
import { 
  TrendingUp as UpgradeIcon, 
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
  const [teacherId, setTeacherId] = useState('');
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  
  const [slotsPerPhase, setSlotsPerPhase] = useState({});
  const [currentPhase, setCurrentPhase] = useState(1);
  const [totalPhases, setTotalPhases] = useState(1);
  const [scheduledClasses, setScheduledClasses] = useState([]);
  const [showReview, setShowReview] = useState(false);

  const activePkg = useMemo(() => student?.packages?.find(p => p.status === 'active'), [student]);

  // Filtro de paquetes: solo los que representen un upgrade real
  const upgradeOptions = useMemo(() => {
    if (!activePkg) return [];
    const currWeeks = activePkg.package?.durationWeeks || 4;
    const currFreq = activePkg.package?.totalClasses / currWeeks;

    return packages.filter(p => {
      if (!p.active) return false;
      const newWeeks = p.durationWeeks || 4;
      const newFreq = p.totalClasses / newWeeks;
      return newWeeks > currWeeks || newFreq > currFreq;
    });
  }, [packages, activePkg]);

  const stats = useMemo(() => {
    if (!activePkg || !selectedPackageId) return null;
    const newPkg = packages.find(p => p.id === selectedPackageId);
    if (!newPkg) return null;
    const clasesUsadas = (activePkg.package?.totalClasses || 0) - (activePkg.remainingClasses || 0);
    const clasesACrear = newPkg.totalClasses - clasesUsadas;
    return { clasesUsadas, clasesACrear };
  }, [activePkg, selectedPackageId, packages]);

  // Cargar horario y profesor del estudiante al abrir
  useEffect(() => {
    if (!open || !student?.id) return;

    fetchWithAuth(`/students/${student.id}/weekly-schedule`).then(res => {
      const initialSlots = {};
      (res.weeklySchedule || []).forEach((slot, index) => {
        initialSlots[index + 1] = { ...slot, start: slot.startTime, end: slot.endTime, phase: index + 1 };
      });
      setSlotsPerPhase(initialSlots);
    }).catch(() => {});

    fetchWithAuth(`/students/${student.id}/teacher`).then(res => {
      if (!res.teacherId) return;
      setTeacherId(res.teacherId);
      setLoadingSchedule(true);
      fetchWithAuth(`/teachers/${res.teacherId}/schedule`)
        .then(setTeacherSchedule)
        .catch(() => {})
        .finally(() => setLoadingSchedule(false));
    }).catch(() => {});
  }, [open, student?.id]);

  // Recalcular fases cuando cambia el paquete seleccionado
  useEffect(() => {
    if (!selectedPackageId) return;
    const newPkg = packages.find(p => p.id === selectedPackageId);
    if (newPkg) {
      setTotalPhases(Math.ceil(newPkg.totalClasses / (newPkg.durationWeeks || 4)));
      setCurrentPhase(1);
      setSlotsPerPhase({});
      setScheduledClasses([]);
      setShowReview(false);
    }
  }, [selectedPackageId, packages]);

  const handleSlotSelect = (slot) => {
    setSlotsPerPhase(prev => ({ ...prev, [currentPhase]: { ...slot, phase: currentPhase } }));
  };

  const handleReviewClasses = () => {
    if (!stats || stats.clasesACrear <= 0) {
      setMessage({ open: true, text: 'No hay clases nuevas que generar', severity: 'warning' });
      return;
    }

    const slotsArray = Object.values(slotsPerPhase).sort((a, b) => a.phase - b.phase);
    const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const sortedSlots = [...slotsArray].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

    const generated = [];
    let currentMoment = moment(startDate);
    let found = 0;

    while (found < stats.clasesACrear) {
      const dayName = currentMoment.format('dddd').toLowerCase();
      const slot = sortedSlots.find(s => s.day === dayName);
      if (slot) {
        generated.push({
          date: currentMoment.format('YYYY-MM-DD'),
          startTime: slot.start || slot.startTime,
          endTime: slot.end || slot.endTime,
          classNumber: found + 1
        });
        found++;
      }
      currentMoment.add(1, 'day');
      // Safety: evitar bucle infinito si no hay slots válidos
      if (currentMoment.diff(moment(startDate), 'days') > 365) break;
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
        newPackageId: selectedPackageId,      // ✅ variable correcta
        startDate: startDate,
        classes: scheduledClasses,            // ✅ variable correcta
        weeklySchedule: Object.values(slotsPerPhase).map(s => ({
          day: s.day,
          hour: parseInt((s.start || s.startTime || '0').split(':')[0]),
          startTime: s.start || s.startTime,
          endTime: s.end || s.endTime,
        })),
        teacherId: teacherId,                 // ✅ variable correcta
      });
      setMessage({ open: true, text: '¡Upgrade exitoso!', severity: 'success' });
      if (typeof refreshStudents === 'function') refreshStudents();
      onClose();
    } catch (e) {
      setMessage({ open: true, text: e.message || 'Error al hacer upgrade', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Resetear estado al cerrar
  const handleClose = () => {
    setSelectedPackageId('');
    setStartDate(moment().format('YYYY-MM-DD'));
    setSlotsPerPhase({});
    setCurrentPhase(1);
    setTotalPhases(1);
    setScheduledClasses([]);
    setShowReview(false);
    onClose();
  };

  if (!student) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      {/* FIX: Typography con component="span" para evitar <h6> dentro de <h2> */}
      <DialogTitle sx={{ bgcolor: '#845EC2', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span">
          Upgrade: {student.name} {student.surname}
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {!showReview ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Paquete Actual: <strong>{activePkg?.package?.name}</strong> ({activePkg?.remainingClasses} clases restantes)
            </Alert>

            <TextField
              select fullWidth label="Nuevo Paquete"
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              sx={{ mb: 3 }}
            >
              {upgradeOptions.length === 0 && (
                <MenuItem disabled value="">No hay paquetes de upgrade disponibles</MenuItem>
              )}
              {upgradeOptions.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name} ({p.totalClasses} clases)</MenuItem>
              ))}
            </TextField>

            {selectedPackageId && stats && (
              <>
                <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'rgba(132, 94, 194, 0.05)' }}>
                  <Typography variant="body2">
                    Clases consumidas: <strong>{stats.clasesUsadas}</strong> &nbsp;|&nbsp;
                    Clases nuevas a programar: <strong>{stats.clasesACrear}</strong>
                  </Typography>
                </Paper>

                <Divider sx={{ mb: 2 }}>Ajuste de Horario Habitual</Divider>

                <Box sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #845EC2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2">
                    Fase {currentPhase} de {totalPhases}: {slotsPerPhase[currentPhase]?.day || 'Pendiente'}
                  </Typography>
                  <Box>
                    <Button size="small" disabled={currentPhase === 1} onClick={() => setCurrentPhase(p => p - 1)}>
                      Atrás
                    </Button>
                    <Button
                      size="small" variant="contained"
                      disabled={currentPhase === totalPhases || !slotsPerPhase[currentPhase]}
                      onClick={() => setCurrentPhase(p => p + 1)}
                      sx={{ ml: 1, bgcolor: '#845EC2' }}
                    >
                      Siguiente
                    </Button>
                  </Box>
                </Box>

                {loadingSchedule ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : teacherSchedule ? (
                  <TeacherAvailabilityCalendar
                    teacherSchedule={teacherSchedule}
                    onSlotSelect={handleSlotSelect}
                    currentStudent={student}
                    scheduledClasses={Object.values(slotsPerPhase).map(s => ({
                      date: moment().day(s.day).format('YYYY-MM-DD'),
                      startTime: s.start || s.startTime
                    }))}
                  />
                ) : (
                  <Alert severity="warning">No se encontró horario del profesor asignado.</Alert>
                )}

                <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    type="date" label="Fecha Inicio Upgrade"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button
                    variant="contained" fullWidth
                    onClick={handleReviewClasses}
                    disabled={Object.keys(slotsPerPhase).length < totalPhases || !startDate}
                    sx={{ height: 55, bgcolor: '#845EC2' }}
                  >
                    Revisar y Generar Clases
                  </Button>
                </Box>
              </>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirmar {stats?.clasesACrear} clases nuevas
            </Typography>
            <ClassSchedulingForm
              scheduledClasses={scheduledClasses}
              setScheduledClasses={setScheduledClasses}
              packageId={selectedPackageId}
              teacherId={teacherId}
            />
            <Button onClick={() => setShowReview(false)} sx={{ mt: 2 }}>
              ← Volver a editar horario
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
        <Button onClick={handleClose}>Cancelar</Button>
        {showReview && (
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={loading || scheduledClasses.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <ConfirmIcon />}
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