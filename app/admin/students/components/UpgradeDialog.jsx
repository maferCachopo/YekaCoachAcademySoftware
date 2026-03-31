'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  TextField, Button, Grid, MenuItem, CircularProgress, FormControlLabel,
  Switch, Alert, Chip, Divider, Stepper, Step, StepLabel, IconButton, Paper
} from '@mui/material';
import { 
  TrendingUp as UpgradeIcon, 
  CalendarMonth as CalendarIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  CheckCircle as ConfirmIcon 
} from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { studentAPI, packageAPI, fetchWithAuth } from '../../../utils/api';
import TeacherAvailabilityCalendar from './TeacherAvailabilityCalendar';
import ClassSchedulingForm from './ClassSchedulingForm';
import moment from 'moment';

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDAD: Generación de fechas para el Upgrade (fuera del componente)
// ─────────────────────────────────────────────────────────────────────────────
const generateUpgradeClasses = (startDate, slotsArray, totalToCreate, teacherId) => {
  const allClasses = [];
  let currentMoment = moment(startDate);
  let found = 0;

  // Ordenamos los slots por día de la semana para que la secuencia sea lógica
  const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const sortedSlots = [...slotsArray].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

  // Buscamos clases hasta completar el cupo del upgrade
  while (found < totalToCreate) {
    const dayName = currentMoment.format('dddd').toLowerCase();
    const slot = sortedSlots.find(s => s.day === dayName);
    
    if (slot) {
      allClasses.push({
        date: currentMoment.format('YYYY-MM-DD'),
        startTime: slot.start || slot.startTime,
        endTime: slot.end || slot.endTime,
        teacherId,
        classNumber: found + 1 
      });
      found++;
    }
    currentMoment.add(1, 'day');
  }
  return allClasses;
};

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

  // AJUSTE 1: Filtro de paquetes inteligente
  const upgradeOptions = useMemo(() => {
    if (!activePkg) return [];
    const currWeeks = activePkg.package.durationWeeks || 4;
    const currFreq = activePkg.package.totalClasses / currWeeks;

    return packages.filter(p => {
        if (!p.active) return false;
        const newWeeks = p.durationWeeks || 4;
        const newFreq = p.totalClasses / newWeeks;
        // Upgrade si dura más semanas O si tiene más clases por semana
        return newWeeks > currWeeks || newFreq > currFreq;
    });
  }, [packages, activePkg]);

  const stats = useMemo(() => {
    if (!activePkg || !selectedPackageId) return null;
    const newPkg = packages.find(p => p.id === selectedPackageId);
    if (!newPkg) return null;
    const clasesUsadas = activePkg.package.totalClasses - activePkg.remainingClasses;
    const clasesACrear = newPkg.totalClasses - clasesUsadas;
    return { clasesUsadas, clasesACrear };
  }, [activePkg, selectedPackageId, packages]);

  useEffect(() => {
    if (open && student?.id) {
      fetchWithAuth(`/students/${student.id}/weekly-schedule`).then(res => {
        const initialSlots = {};
        (res.weeklySchedule || []).forEach((slot, index) => {
          initialSlots[index + 1] = { ...slot, start: slot.startTime, end: slot.endTime, phase: index + 1 };
        });
        setSlotsPerPhase(initialSlots);
      });
      fetchWithAuth(`/students/${student.id}/teacher`).then(res => {
        setTeacherId(res.teacherId);
        if (res.teacherId) fetchWithAuth(`/teachers/${res.teacherId}/schedule`).then(setTeacherSchedule);
      });
    }
  }, [open, student?.id]);

  useEffect(() => {
    if (selectedPackageId) {
      const newPkg = packages.find(p => p.id === selectedPackageId);
      if (newPkg) setTotalPhases(Math.ceil(newPkg.totalClasses / (newPkg.durationWeeks || 4)));
    }
  }, [selectedPackageId, packages]);

  const handleSlotSelect = (slot) => {
    setSlotsPerPhase(prev => ({ ...prev, [currentPhase]: { ...slot, phase: currentPhase } }));
  };

  const handleReviewClasses = () => {
    const slotsArray = Object.values(slotsPerPhase).sort((a, b) => a.phase - b.phase);
    // Función de generación (Lógica Upgrade: totalToCreate = stats.clasesACrear)
    const generated = [];
    let currentMoment = moment(startDate);
    let found = 0;
    const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const sortedSlots = slotsArray.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

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
    }
    setScheduledClasses(generated);
    setShowReview(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await studentAPI.upgradePackage(student.id, {
        newPackageId: selectedPackageId,
        teacherId,
        classes: scheduledClasses,
        weeklySchedule: Object.values(slotsPerPhase),
        startDate
      });
      setMessage({ open: true, text: 'Upgrade exitoso!', severity: 'success' });
      refreshStudents();
      onClose();
    } catch (e) {
      setMessage({ open: true, text: e.message, severity: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ bgcolor: '#845EC2', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Upgrade: {student.name} {student.surname}</Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {!showReview ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>Paquete Actual: {activePkg?.package?.name} ({activePkg?.remainingClasses} clases rest.)</Alert>
            
            <TextField select fullWidth label="Nuevo Paquete" value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)} sx={{ mb: 3 }}>
              {upgradeOptions.map(p => <MenuItem key={p.id} value={p.id}>{p.name} ({p.totalClasses} clases)</MenuItem>)}
            </TextField>

            {selectedPackageId && (
              <>
                <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'rgba(132, 94, 194, 0.05)' }}>
                    <Typography variant="body2">Clases consumidas: {stats?.clasesUsadas} | <strong>Clases nuevas a programar: {stats?.clasesACrear}</strong></Typography>
                </Paper>

                <Divider sx={{ mb: 2 }}>Ajuste de Horario Habitual</Divider>
                
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #845EC2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2">Fase {currentPhase} de {totalPhases}: {slotsPerPhase[currentPhase]?.day || 'Pendiente'}</Typography>
                  <Box>
                    <Button size="small" disabled={currentPhase === 1} onClick={() => setCurrentPhase(p => p - 1)}>Atrás</Button>
                    <Button size="small" variant="contained" disabled={currentPhase === totalPhases} onClick={() => setCurrentPhase(p => p + 1)} sx={{ ml: 1, bgcolor: '#845EC2' }}>Siguiente</Button>
                  </Box>
                </Box>

                <TeacherAvailabilityCalendar 
                  teacherSchedule={teacherSchedule} 
                  onSlotSelect={handleSlotSelect} 
                  currentStudent={student}
                  scheduledClasses={Object.values(slotsPerPhase).map(s => ({ date: moment().day(s.day).format('YYYY-MM-DD'), startTime: s.start }))}
                />

                <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField type="date" label="Fecha Inicio Upgrade" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <Button variant="contained" fullWidth onClick={handleReviewClasses} disabled={Object.keys(slotsPerPhase).length < totalPhases} sx={{ height: 55, bgcolor: '#845EC2' }}>Revisar y Generar Clases</Button>
                </Box>
              </>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>Confirmar {stats.clasesACrear} clases nuevas</Typography>
            <ClassSchedulingForm scheduledClasses={scheduledClasses} readOnly />
            <Button onClick={() => setShowReview(false)} sx={{ mt: 2 }}>Volver a editar horario</Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
        <Button onClick={onClose}>Cancelar</Button>
        {showReview && (
          <Button variant="contained" onClick={handleConfirm} disabled={loading} startIcon={<ConfirmIcon />} sx={{ bgcolor: '#4caf50' }}>
            {loading ? <CircularProgress size={24} /> : "Confirmar Upgrade Completo"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UpgradeDialog;