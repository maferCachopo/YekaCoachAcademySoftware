import React, { useState, useEffect, useRef , useCallback} from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  TextField, Button, Grid, MenuItem, CircularProgress, FormControlLabel, Switch,
  Divider, Alert, Paper, Tabs, Tab, Autocomplete, Chip
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Add as AddIcon, Event as EventIcon, CalendarMonth as CalendarIcon, AutoFixHigh as GenerateIcon } from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { authAPI, studentAPI, packageAPI, adminAPI } from '../../../utils/api';
import { textFieldStyle } from '../utils/styles';
import ClassSchedulingForm from './ClassSchedulingForm';
import TeacherAvailabilityCalendar from './TeacherAvailabilityCalendar';
import { fetchWithAuth } from '../../../utils/api';
import moment from 'moment';
import 'moment-timezone';
import { ADMIN_TIMEZONE } from '../../../utils/constants';


// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES DE GENERACIÓN DE FECHAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dado un startDate y un slot { day: 'monday', start: '10:00' },
 * devuelve la primera fecha en que ese slot puede ocurrir:
 *   - La fecha debe ser >= startDate
 *   - Si coincide con startDate pero la hora ya pasó → salta a la semana siguiente
 */
const getFirstOccurrence = (startDate, slot) => {
  const DAY_MAP = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  };

  const now = moment().tz(ADMIN_TIMEZONE);
  const targetDay = DAY_MAP[slot.day.toLowerCase()];
  const [slotHour, slotMin] = slot.start.split(':').map(Number);
   


  // Empezar desde el inicio de startDate
  let candidate = moment(startDate).tz(ADMIN_TIMEZONE).startOf('day');

  // Avanzar hasta el día de la semana que corresponde al slot
  while (candidate.day() !== targetDay) {
    candidate.add(1, 'day');
  }

  // Si ese candidato + hora del slot ya pasó respecto a "ahora" → siguiente semana
  const candidateWithTime = candidate.clone().hour(slotHour).minute(slotMin).second(0);
  if (candidateWithTime.isSameOrBefore(now)) {
    candidate.add(7, 'days');
  }

  return candidate.format('YYYY-MM-DD');
};

/**
 * Genera todas las fechas de UN bloque (una por semana durante S semanas).
 * firstDate ya es la primera fecha válida calculada por getFirstOccurrence.
 */
const generateBlockDates = (firstDate, slot, numWeeks) => {
  const dates = [];
  let current = moment(firstDate);
  for (let i = 0; i < numWeeks; i++) {
    dates.push({
      date: current.format('YYYY-MM-DD'),
      startTime: slot.start,
      endTime: slot.end,
      day: slot.day,
    });
    current.add(7, 'days');
  }
  return dates;
};

/**
 * Función principal:
 * Dado el startDate y todos los slots seleccionados (uno por fase),
 * genera el array final de clases con classNumber correcto.
 *
 * Lógica:
 * 1. Calcular la primera ocurrencia de cada slot desde startDate
 * 2. Ordenar slots por primera ocurrencia (el más cercano = Bloque 1)
 * 3. Generar S fechas por bloque (una por semana)
 * 4. Intercalar: clase 1 del bloque más cercano, clase 1 del 2º, clase 1 del 3º,
 *                clase 2 del bloque más cercano, etc.
 *
 * Ejemplo 12 clases, startDate martes 13 mayo, slots: lun, mié, vie
 *   → Orden por cercanía: mié(14), vie(16), lun(19)
 *   → Clase 1=mié14, 2=vie16, 3=lun19, 4=mié21, 5=vie23, 6=lun26 ...
 */
const generateAllClasses = (startDate, slotsPerPhase, totalClasses, durationWeeks, teacherId) => {
  const S = durationWeeks; // semanas de duración (= clases por bloque)
  const B = slotsPerPhase.length; // número de bloques/fases

  // Paso 1 y 2: calcular primera ocurrencia y ordenar por cercanía
  const slotsWithFirstDate = slotsPerPhase
    .map(slot => ({
      ...slot,
      firstDate: getFirstOccurrence(startDate, slot),
    }))
    .sort((a, b) => moment(a.firstDate).diff(moment(b.firstDate)));

  // Paso 3: generar las fechas de cada bloque ordenado
  const blockDates = slotsWithFirstDate.map(slot =>
    generateBlockDates(slot.firstDate, slot, S)
  );

  // Paso 4: intercalar y asignar classNumber
  const allClasses = [];
  for (let week = 0; week < S; week++) {
    for (let block = 0; block < B; block++) {
      const classNumber = week * B + block + 1; // 1-based
      if (classNumber > totalClasses) break;
      allClasses.push({
        id: `temp-${block}-${week}`,
        phase: block + 1,          // 1-based, según orden de cercanía
        classNumber,
        ...blockDates[block][week],
        teacherId: teacherId || undefined,
      });
    }
  }

  return allClasses;
};


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────

const AddDialog = ({ 
  open, 
  onClose, 
  formData, 
  setFormData, 
  packages, 
  scheduledClasses,
  setScheduledClasses, 
  setMessage,
  refreshStudents
}) => {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [teacherValidationFn, setTeacherValidationFn] = useState(null);
  const { translations } = useLanguage();
  const { theme } = useTheme();
  const [allCountries, setAllCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [weeklyScheduleSlots, setWeeklyScheduleSlots] = useState([]);

  // Estados para el algoritmo de fases
  const [currentPhase, setCurrentPhase] = useState(1);
  const [totalPhases, setTotalPhases] = useState(1);

  // ── NUEVO: fecha de inicio del paquete y slots seleccionados por fase ──
  const [packageStartDate, setPackageStartDate] = useState(null);
  // slotsPerPhase: { [phaseNumber]: { day, start, end } }
  const [slotsPerPhase, setSlotsPerPhase] = useState({});

  const prevPackageIdRef = useRef(null);

  // ─── Fetch teachers cuando abre el dialog ───
  useEffect(() => {
    if (open) {
      fetchTeachers();
    }
  }, [open]);

  // ─── Reset al cerrar ───
  useEffect(() => {
    if (!open) {
      setCurrentPhase(1);
      setTotalPhases(1);
      setPackageStartDate(null);
      setSlotsPerPhase({});
      setSelectedTeacher('');
      setTeacherSchedule(null);
      prevPackageIdRef.current = null;
    }
  }, [open]);

    const handleScheduleChange = useCallback((slots) => {
    setWeeklyScheduleSlots(slots);
     }, []);

  // ─── Cuando cambia el paquete: recalcular fases ───
  useEffect(() => {
    if (formData.package && formData.package !== prevPackageIdRef.current) {
      const selectedPkg = packages.find(pkg => pkg.id === formData.package);
      if (selectedPkg) {
        const T = selectedPkg.totalClasses;
        const S = selectedPkg.durationWeeks || 4;
        const B = Math.ceil(T / S);

        setTotalPhases(B);
        setCurrentPhase(1);
        setScheduledClasses([]);
        setSlotsPerPhase({});
        setPackageStartDate(null);
        prevPackageIdRef.current = formData.package;
      }
    }
  }, [formData.package, packages]);

  const fetchTeachers = async () => {
    try {
      const response = await fetchWithAuth('/teachers');
      setTeachers(response.filter(t => t.active));
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setMessage({ open: true, text: translations.errorFetchingTeachers || 'Error fetching teachers', severity: 'error' });
    }
  };

  const fetchTeacherSchedule = async (teacherId) => {
    if (!teacherId) { setTeacherSchedule(null); return; }
    setLoadingSchedule(true);
    try {
      const scheduleData = await fetchWithAuth(`/teachers/${teacherId}/schedule`);
      setTeacherSchedule(scheduleData);
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      setMessage({ open: true, text: translations.errorFetchingSchedule || 'Error fetching teacher schedule', severity: 'warning' });
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleTeacherChange = (e) => {
    const teacherId = e.target.value;
    setSelectedTeacher(teacherId);
    fetchTeacherSchedule(teacherId);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 1: El admin hace clic en el calendario → guarda el slot de esta fase
  // NO genera fechas todavía, solo registra qué slot fue seleccionado.
  // ─────────────────────────────────────────────────────────────────────────
  const handleSlotSelect = (slot) => {
    if (!formData.package) return;

    // Guardar el slot para la fase actual (lo usaremos al generar)
    setSlotsPerPhase(prev => ({
      ...prev,
      [currentPhase]: {
        day: slot.day,
        start: slot.start,
        end: slot.end,
        phase: currentPhase,
      }
    }));

    // Preview inmediato usando la fecha actual como referencia temporal
    // (se recalculará correctamente al pulsar "Generar fechas")
    const selectedPkg = packages.find(pkg => pkg.id === formData.package);
    const T = selectedPkg.totalClasses;
    const S = selectedPkg.durationWeeks || 4;
    const B = totalPhases;
    const P = currentPhase;

    let firstDate = moment().day(slot.day);
    const now = moment();
    if (moment(`${firstDate.format('YYYY-MM-DD')} ${slot.start}`, 'YYYY-MM-DD HH:mm').isBefore(now)) {
      firstDate.add(1, 'weeks');
    }

    const phaseClasses = [];
    for (let i = 0; i < S; i++) {
      const classIndex = P + (i * B);
      if (classIndex <= T) {
        phaseClasses.push({
          phase: P,
          id: `temp-${P}-${i}`,
          classNumber: classIndex,
          date: moment(firstDate).add(i, 'weeks').format('YYYY-MM-DD'),
          startTime: slot.start,
          endTime: slot.end,
          teacherId: selectedTeacher,
          isPreview: true, // marcamos que son fechas provisionales
        });
      }
    }

    setScheduledClasses(prev => {
      const otherPhases = prev.filter(c => c.phase !== P);
      return [...otherPhases, ...phaseClasses].sort((a, b) => a.classNumber - b.classNumber);
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 2: El admin escribe startDate y pulsa "Generar fechas"
  // Aquí sí se recalculan todas las fechas con la lógica de cercanía.
  // ─────────────────────────────────────────────────────────────────────────
  const handleGenerateDates = () => {
    if (!packageStartDate) {
      setMessage({ open: true, text: 'Por favor selecciona la fecha de inicio del paquete', severity: 'warning' });
      return;
    }

    const allSlotsSelected = Object.keys(slotsPerPhase).length === totalPhases;
    if (!allSlotsSelected) {
      setMessage({ open: true, text: `Debes seleccionar los ${totalPhases} bloques horarios antes de generar`, severity: 'warning' });
      return;
    }

    const selectedPkg = packages.find(pkg => pkg.id === formData.package);
    const T = selectedPkg.totalClasses;
    const S = selectedPkg.durationWeeks || 4;

    // Convertir el objeto slotsPerPhase a array ordenado por número de fase
    const slotsArray = Object.values(slotsPerPhase).sort((a, b) => a.phase - b.phase);

    const generatedClasses = generateAllClasses(
      packageStartDate,
      slotsArray,
      T,
      S,
      selectedTeacher
    );

    setScheduledClasses(generatedClasses.map(cls => ({ ...cls, isPreview: false })));
    setMessage({ open: true, text: `✅ ${T} clases generadas correctamente desde el ${moment(packageStartDate).format('DD/MM/YYYY')}`, severity: 'success' });
  };

  // ─── Helpers ───
  const fetchCities = async (countryName) => {
    if (!countryName) return;
    setLoadingCities(true);
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName })
      });
      const data = await response.json();
      setCities(data.error ? [] : data.data.sort());
    } catch (error) {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleAvailabilityValidation = (validationFn) => {
    setTeacherValidationFn(() => validationFn);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.surname || !formData.email || !formData.username || !formData.password) {
      setMessage({ open: true, text: translations.fillRequiredFields || 'Por favor completa todos los campos obligatorios', severity: 'error' });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setMessage({ open: true, text: translations.passwordsDoNotMatch, severity: 'error' });
      return false;
    }
    if (formData.package) {
      const selectedPackage = packages.find(pkg => pkg.id === formData.package);
      if (selectedPackage) {
        const requiredTotal = selectedPackage.totalClasses;
        const filledClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime && !cls.isPreview);
        if (filledClasses.length < requiredTotal) {
          setMessage({ open: true, text: `Error: El paquete requiere ${requiredTotal} clases. Llevas ${filledClasses.length}. ¿Pulsaste "Generar fechas"?`, severity: 'error' });
          return false;
        }
      }
    }
    return true;
  };

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,idd,cca2,flags');
        const data = await response.json();
        const formatted = data
          .map(country => ({
            name: country.name.common,
            code: country.cca2,
            flag: country.flags.png,
            dialCode: country.idd.root + (country.idd.suffixes ? country.idd.suffixes[0] : '')
          }))
          .filter(c => c.dialCode)
          .sort((a, b) => a.name.localeCompare(b.name));
        setAllCountries(formatted);
      } catch (error) {
        console.error("Error cargando países:", error);
      } finally {
        setLoadingCountries(false);
      }
    };
    if (open) fetchCountries();
  }, [open]);

  const handleAddStudent = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const userData = {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        name: formData.name,
        surname: formData.surname,
        birthDate: formData.birthDate || null,
        phone: formData.phone || '',
        city: formData.city || '',
        country: formData.country || '',
        zoomLink: formData.zoomLink || '',
        allowDifferentTeacher: formData.allowDifferentTeacher || false,
        weeklySchedule: weeklyScheduleSlots 
      };

      const response = await authAPI.register(userData);

      if (response && (response.studentId || response.userId)) {
        const studentId = response.studentId;

        const packageDetails = packages.find(pkg => pkg.id === formData.package);
        const startDate = packageStartDate || new Date().toISOString().split('T')[0];
        const endDate = moment(startDate).add(packageDetails.durationMonths || 1, 'months').format('YYYY-MM-DD');

        await studentAPI.assignPackage(studentId, {
          packageId: formData.package,
          startDate,
          endDate,
        });

        if (selectedTeacher) {
          const weeklySchedule = scheduledClasses
            .filter(cls => cls.date && cls.startTime)
            .map(cls => ({
              day: moment(cls.date).format('dddd').toLowerCase(),
              hour: parseInt(cls.startTime.split(':')[0]),
              startTime: cls.startTime,
              endTime: cls.endTime
            }))
            .slice(0, 1);

          const uniqueWeeklySchedule = Array.from(new Set(weeklySchedule.map(s => JSON.stringify(s)))).map(s => JSON.parse(s));

          await fetchWithAuth(`/teachers/${selectedTeacher}/students`, {
            method: 'POST',
            body: JSON.stringify({ studentId, weeklySchedule: weeklyScheduleSlots })

          });
        }

        const validClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime && !cls.isPreview);
        await studentAPI.scheduleClasses(studentId, {
          packageId: formData.package,
          weeklySchedule: weeklyScheduleSlots,
          classes: validClasses.map(cls => ({ ...cls, teacherId: selectedTeacher }))
        });

        setMessage({ open: true, text: translations.studentAddedSuccess, severity: 'success' });
        if (typeof refreshStudents === 'function') refreshStudents();
        onClose();
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setMessage({ open: true, text: error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Derivados para UI ───
  const selectedPkg = packages.find(pkg => pkg.id === formData.package);
  const allPhasesSelected = selectedPkg
    ? Object.keys(slotsPerPhase).length === totalPhases
    : false;
  const datesGenerated = scheduledClasses.length > 0 && scheduledClasses.every(c => !c.isPreview);

  const primaryButtonStyle = { background: '#845EC2', color: '#ffffff', '&:hover': { background: '#6B46C1' } };
  const secondaryButtonStyle = { color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#ffffff', borderColor: 'rgba(132, 94, 194, 0.5)', '&:hover': { borderColor: '#845EC2', backgroundColor: theme?.mode === 'light' ? 'rgba(132, 94, 194, 0.08)' : 'rgba(132, 94, 194, 0.15)' } };

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => { if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') onClose(); }}
      disableEscapeKeyDown
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 5, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', overflow: 'visible', bgcolor: theme.mode === 'light' ? '#fff' : '#151521' } }}
    >
      <DialogTitle sx={{ pb: 2, borderBottom: theme?.mode === 'light' ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)', color: theme.text?.primary, px: 3, pt: 3, fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <AddIcon sx={{ color: '#4caf50' }} />
        {translations.addStudent || 'Add Student'}
      </DialogTitle>

      <DialogContent sx={{ p: 3, pb: 4, overflowY: 'auto', backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Box sx={{ mb: 4 }} />

        {/* ── Datos personales ── */}
        <Grid container spacing={3} sx={{ pt: 3 }}>
          <Grid item xs={12} sm={6}><TextField label={translations.firstName} name="name" value={formData.name} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.lastName} name="surname" value={formData.surname} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.birthDate} name="birthDate" type="date" value={formData.birthDate || ''} onChange={handleFormChange} fullWidth variant="outlined" InputLabelProps={{ shrink: true }} sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.email} name="email" type="email" value={formData.email} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.username} name="username" value={formData.username} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.password} name="password" type="password" value={formData.password} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.confirmPassword} name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>

          {/* Teléfono */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Autocomplete
                options={allCountries}
                getOptionLabel={(option) => `${option.code} ${option.dialCode}`}
                filterOptions={(options, { inputValue }) => options.filter(item =>
                  item.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                  item.dialCode.includes(inputValue) ||
                  item.code.toLowerCase().includes(inputValue.toLowerCase())
                )}
                value={allCountries.find(c => c.dialCode === formData.countryCode) || null}
                onChange={(event, newValue) => {
                  setFormData(prev => ({ ...prev, country: newValue?.name || '', city: '', countryCode: newValue?.dialCode || '' }));
                }}
                loading={loadingCountries}
                disableClearable
                sx={{ width: '160px' }}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ display: 'flex', gap: 1, fontSize: '0.85rem' }}>
                    <img src={option.flag} alt={option.code} width="20" />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{option.code}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{option.dialCode}</Typography>
                    <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.6 }}>{option.name}</Typography>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField {...params} label="País" variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }}
                    InputProps={{ ...params.InputProps, startAdornment: (<>{loadingCountries ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.startAdornment}</>) }}
                  />
                )}
              />
              <TextField
                label={translations.phone} name="phone" value={formData.phone}
                onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); if (val.length <= 15) setFormData(prev => ({ ...prev, phone: val })); }}
                fullWidth variant="outlined" placeholder="Número local"
                sx={{ ...textFieldStyle(theme), mt: 0 }}
              />
            </Box>
          </Grid>

          {/* País */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={allCountries}
              getOptionLabel={(option) => option.name || ""}
              value={allCountries.find(c => c.name === formData.country) || null}
              onChange={(event, newValue) => {
                setFormData(prev => ({ ...prev, country: newValue?.name || '', city: '', countryCode: newValue?.dialCode || '' }));
                if (newValue?.name) fetchCities(newValue.name);
              }}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <Box component="li" key={key} {...optionProps} sx={{ display: 'flex', gap: 1, fontSize: '0.85rem' }}>
                    <img src={option.flag} alt={option.code} width="20" height="14" style={{ borderRadius: '2px' }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '25px' }}>{option.code}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: '40px' }}>{option.dialCode}</Typography>
                    <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.6 }}>{option.name}</Typography>
                  </Box>
                );
              }}
              renderInput={(params) => <TextField {...params} label={translations.country} variant="outlined" sx={textFieldStyle(theme)} />}
            />
          </Grid>

          {/* Ciudad */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={cities} freeSolo loading={loadingCities}
              value={formData.city || ''}
              onInputChange={(event, newInputValue) => setFormData(prev => ({ ...prev, city: newInputValue }))}
              disabled={!formData.country}
              renderInput={(params) => (
                <TextField {...params} label={translations.city} variant="outlined" sx={textFieldStyle(theme)}
                  InputProps={{ ...params.InputProps, endAdornment: (<>{loadingCities ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>) }}
                  placeholder={!formData.country ? "Selecciona un país primero" : "Escribe o busca tu ciudad"}
                />
              )}
            />
          </Grid>

          {/* Paquete */}
          <Grid item xs={12} sm={6}>
            <TextField select label={translations.package} name="package" value={formData.package} onChange={handleFormChange} fullWidth variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }}>
              <MenuItem value=""><em>{translations.noPackage}</em></MenuItem>
              {packages.map((pkg) => (<MenuItem key={pkg.id} value={pkg.id}>{pkg.name}</MenuItem>))}
            </TextField>
          </Grid>

          {/* Profesor */}
          <Grid item xs={12} sm={6}>
            <TextField select label={translations.teacher} value={selectedTeacher} onChange={handleTeacherChange} fullWidth variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }}>
              <MenuItem value=""><em>{translations.noTeacher}</em></MenuItem>
              {teachers.map((teacher) => (<MenuItem key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</MenuItem>))}
            </TextField>
          </Grid>

          <Grid item xs={12}><TextField label={translations.zoomLink} name="zoomLink" value={formData.zoomLink || ''} onChange={handleFormChange} fullWidth variant="outlined" placeholder="https://zoom.us/j/123456789" sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>

          <Grid item xs={12}>
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: theme.text?.primary, display: 'block' }}>
                {translations.allowDifferentTeacherHeader || 'Permisos de Reprogramación:'}
              </Typography>
              <FormControlLabel
                control={<Switch checked={formData.allowDifferentTeacher || false} onChange={(e) => setFormData(prev => ({ ...prev, allowDifferentTeacher: e.target.checked }))} color="primary" />}
                label={<Typography variant="body2" sx={{ color: theme.text?.secondary }}>{translations.allowDifferentTeacher || 'Permitir que el estudiante reagende con otros profesores disponibles'}</Typography>}
                sx={{ color: theme.text?.primary }}
              />
            </Box>
          </Grid>
        </Grid>

        {/* ══════════════════════════════════════════════════════════════════
            SECCIÓN DE HORARIO — solo si hay profesor y paquete seleccionados
        ══════════════════════════════════════════════════════════════════ */}
        {selectedTeacher && formData.package && (
          <Box sx={{ mt: 4, p: 3, bgcolor: theme.mode === 'light' ? 'rgba(0,120,220,0.05)' : 'rgba(0,120,220,0.15)', borderRadius: 3 }}>

            {/* ── PASO 1: Selector de bloques ── */}
            <Box sx={{ mb: 3, p: 2, bgcolor: theme.mode === 'light' ? '#f8f9fa' : '#1e1e2d', borderRadius: 2, border: '2px solid #845EC2' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                Paso 1 — Selecciona los bloques horarios ({Object.keys(slotsPerPhase).length} de {totalPhases} seleccionados)
              </Typography>

              {/* Chips mostrando los slots ya seleccionados */}
              {Object.keys(slotsPerPhase).length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {Object.entries(slotsPerPhase)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([phase, slot]) => (
                      <Chip
                        key={phase}
                        label={`Bloque ${phase}: ${slot.day} ${slot.start}–${slot.end}`}
                        color="primary"
                        variant="outlined"
                        size="small"
                        onDelete={() => {
                          setSlotsPerPhase(prev => { const n = { ...prev }; delete n[phase]; return n; });
                          setScheduledClasses(prev => prev.filter(c => c.phase !== Number(phase)));
                        }}
                      />
                    ))}
                </Box>
              )}

              {/* Navegación de fases */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: theme.text?.secondary, mr: 1 }}>
                  Configurando bloque {currentPhase} de {totalPhases} — haz clic en el calendario de abajo
                </Typography>
                {slotsPerPhase[currentPhase] && (
                  <Chip label={`✓ ${slotsPerPhase[currentPhase].day} ${slotsPerPhase[currentPhase].start}`} color="success" size="small" />
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                {currentPhase > 1 && (
                  <Button size="small" variant="outlined" onClick={() => setCurrentPhase(p => p - 1)}>← Atrás</Button>
                )}
                {currentPhase < totalPhases && (
                  <Button
                    size="small" variant="contained"
                    disabled={!slotsPerPhase[currentPhase]}
                    onClick={() => setCurrentPhase(p => p + 1)}
                    sx={{ bgcolor: '#845EC2' }}
                  >
                    Siguiente bloque →
                  </Button>
                )}
              </Box>
            </Box>

            {/* ── Calendario de disponibilidad ── */}
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>{translations.teacherAvailability}</Typography>
            {loadingSchedule ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
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
              <Alert severity="info">{translations.selectTeacherFirst}</Alert>
            )}

            {/* ── PASO 2: Fecha de inicio + botón Generar ── */}
            <Box sx={{
              mt: 3, p: 2,
              bgcolor: theme.mode === 'light' ? '#f8f9fa' : '#1e1e2d',
              borderRadius: 2,
              border: `2px solid ${allPhasesSelected ? '#845EC2' : 'rgba(0,0,0,0.12)'}`,
              opacity: allPhasesSelected ? 1 : 0.5,
              transition: 'all 0.2s',
            }}>
              <Typography variant="subtitle1" fontWeight="bold" color={allPhasesSelected ? 'primary' : 'text.secondary'} sx={{ mb: 2 }}>
                Paso 2 — Fecha de inicio del paquete
                {!allPhasesSelected && (
                  <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.disabled' }}>
                    (Selecciona todos los bloques primero)
                  </Typography>
                )}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <DatePicker
                    label="Fecha de inicio del paquete"
                    value={packageStartDate ? moment(packageStartDate) : null}
                    onChange={(date) => {
                      setPackageStartDate(date ? date.format('YYYY-MM-DD') : null);
                      // Si cambia la fecha, limpiar fechas generadas para forzar regenerar
                      setScheduledClasses(prev => prev.map(c => ({ ...c, isPreview: true })));
                    }}
                    minDate={moment()}
                    disabled={!allPhasesSelected}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: textFieldStyle(theme),
                        helperText: 'Primera fecha posible en que el estudiante puede tomar clases',
                      }
                    }}
                  />
                </LocalizationProvider>

                <Button
                  variant="contained"
                  startIcon={<GenerateIcon />}
                  disabled={!allPhasesSelected || !packageStartDate}
                  onClick={handleGenerateDates}
                  sx={{
                    bgcolor: '#845EC2',
                    '&:hover': { bgcolor: '#6B46C1' },
                    '&:disabled': { bgcolor: 'rgba(0,0,0,0.12)' },
                    height: 40,
                    alignSelf: 'flex-start',
                  }}
                >
                  Generar fechas
                </Button>
              </Box>

              {/* Estado de generación */}
              {datesGenerated && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  ✅ Fechas generadas. El bloque más cercano al {moment(packageStartDate).format('DD/MM/YYYY')} fue asignado como Clase 1.
                  Revisa el detalle abajo.
                </Alert>
              )}
              {scheduledClasses.some(c => c.isPreview) && packageStartDate && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  ⚠️ Las fechas mostradas son provisionales. Pulsa "Generar fechas" para confirmar.
                </Alert>
              )}
            </Box>
          </Box>
        )}

        {/* ── Vista de clases generadas ── */}
        {formData.package && (
          <Box sx={{ mt: 4, p: 3, bgcolor: theme.mode === 'light' ? 'rgba(132,94,194,0.05)' : 'rgba(132,94,194,0.15)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>{translations.scheduleClasses}</Typography>
            <ClassSchedulingForm
              scheduledClasses={scheduledClasses}
              setScheduledClasses={setScheduledClasses}
              packageId={formData.package}
              teacherId={selectedTeacher}
              teacherValidationFn={teacherValidationFn}
              onScheduleChange={handleScheduleChange} 
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, px: 3, borderTop: theme?.mode === 'light' ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)', gap: 2, backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Button onClick={onClose} variant="outlined" sx={{ ...secondaryButtonStyle, minWidth: 120, height: 42 }}>{translations.cancel}</Button>
        <Button variant="contained" onClick={handleAddStudent} disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null} sx={{ ...primaryButtonStyle, minWidth: 120, height: 42 }}>
          {loading ? translations.adding : translations.addStudent}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDialog;