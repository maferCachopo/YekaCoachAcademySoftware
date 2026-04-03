import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  TextField, Button, Grid, MenuItem, CircularProgress, FormControlLabel, Switch,
  Divider, Alert, Paper, Tabs, Tab, Autocomplete, Chip
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
  Add as AddIcon, 
  Event as EventIcon, 
  CalendarMonth as CalendarIcon, 
  AutoFixHigh as GenerateIcon, 
  Public as GlobeIcon 
} from '@mui/icons-material';
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
import { getAllCountries, getTimezonesForCountry } from 'countries-and-timezones';

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES DE GENERACIÓN DE FECHAS
// ─────────────────────────────────────────────────────────────────────────────

const getFirstOccurrence = (startDate, slot) => {
  const DAY_MAP = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  };

  const now = moment().tz(ADMIN_TIMEZONE);
  const targetDay = DAY_MAP[slot.day.toLowerCase()];
  const [slotHour, slotMin] = slot.start.split(':').map(Number);

  let candidate = moment(startDate).tz(ADMIN_TIMEZONE).startOf('day');

  while (candidate.day() !== targetDay) {
    candidate.add(1, 'day');
  }

  const candidateWithTime = candidate.clone().hour(slotHour).minute(slotMin).second(0);
  if (candidateWithTime.isSameOrBefore(now)) {
    candidate.add(7, 'days');
  }

  return candidate.format('YYYY-MM-DD');
};

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

const generateAllClasses = (startDate, slotsPerPhase, totalClasses, durationWeeks, teacherId) => {
  const S = durationWeeks;
  const B = slotsPerPhase.length;

  const slotsWithFirstDate = slotsPerPhase
    .map(slot => ({
      ...slot,
      firstDate: getFirstOccurrence(startDate, slot),
    }))
    .sort((a, b) => moment(a.firstDate).diff(moment(b.firstDate)));

  const blockDates = slotsWithFirstDate.map(slot =>
    generateBlockDates(slot.firstDate, slot, S)
  );

  const allClasses = [];
  for (let week = 0; week < S; week++) {
    for (let block = 0; block < B; block++) {
      const classNumber = week * B + block + 1;
      if (classNumber > totalClasses) break;
      allClasses.push({
        id: `temp-${block}-${week}`,
        phase: block + 1,
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
  const [timezone, setTimezone] = useState('America/Caracas');
  const [availableTimezones, setAvailableTimezones] = useState(moment.tz.names());
  const [searchOptions, setSearchOptions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const regexEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

  const [currentPhase, setCurrentPhase] = useState(1);
  const [totalPhases, setTotalPhases] = useState(1);

  const [packageStartDate, setPackageStartDate] = useState(null);
  const [slotsPerPhase, setSlotsPerPhase] = useState({});

  const prevPackageIdRef = useRef(null);

  const [usernameError, setUsernameError] = useState('');

  // ─── Fetch teachers cuando abre el dialog ───
  useEffect(() => {
    if (open) {
      fetchTeachers();
      setUsernameError('');
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

  // 1. Cuando cambia el país, filtrar zonas horarias
  useEffect(() => {
    if (formData.country) {
      const countries = getAllCountries();
      const countryEntry = Object.values(countries).find(
        c => c.name.toLowerCase() === formData.country.toLowerCase()
      );

      if (countryEntry) {
        const zones = getTimezonesForCountry(countryEntry.id);
        if (zones && zones.length > 0) {
          const zoneNames = zones.map(z => z.name);
          setAvailableTimezones(zoneNames);
          if (zoneNames.length === 1) {
            setTimezone(zoneNames[0]);
          }
        }
      } else {
        setAvailableTimezones(moment.tz.names());
      }
    } else {
      setAvailableTimezones(moment.tz.names());
    }
  }, [formData.country]);

  // 2. Cuando cambia la ciudad, intentar predecir la zona
  useEffect(() => {
    if (formData.city && formData.city.length > 3) {
      const normalizedCity = formData.city.toLowerCase().replace(/\s+/g, '_');
      const matchedZone = availableTimezones.find(tz => 
        tz.toLowerCase().includes(normalizedCity)
      );
      if (matchedZone) {
        setTimezone(matchedZone);
      }
    }
  }, [formData.city, availableTimezones]);

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

  const handleTimezoneSearch = async (query) => {
    if (query.length < 3) return;
    setIsFetching(true);
    try {
      const res = await fetch(`https://api.teleport.org/api/cities/?search=${query}`);
      const data = await res.json();
      const results = data._embedded['city:search-results'].map(item => ({
        label: item.matching_full_name,
        detailsUrl: item._links['city:item'].href
      }));
      setSearchOptions(results);
    } catch (error) {
      console.error("Error buscando ciudades:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSelectCity = async (cityItem) => {
    if (!cityItem) return;
    try {
      const res = await fetch(cityItem.detailsUrl);
      const data = await res.json();
      const ianaTimezone = data._links['city:timezone'].name;
      setTimezone(ianaTimezone);
    } catch (error) {
      console.error("Error obteniendo zona horaria:", error);
    }
  };

  const handleTeacherChange = (e) => {
    const teacherId = e.target.value;
    setSelectedTeacher(teacherId);
    fetchTeacherSchedule(teacherId);
  };

  const handleSlotSelect = (slot) => {
    if (!formData.package) return;

    setSlotsPerPhase(prev => ({
      ...prev,
      [currentPhase]: {
        day: slot.day,
        start: slot.start,
        end: slot.end,
        phase: currentPhase,
      }
    }));

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
          isPreview: true,
        });
      }
    }

    setScheduledClasses(prev => {
      const otherPhases = prev.filter(c => c.phase !== P);
      return [...otherPhases, ...phaseClasses].sort((a, b) => a.classNumber - b.classNumber);
    });
  };

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
    if (name === 'username') setUsernameError('');
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.surname || !formData.email || !formData.username || !formData.password) {
      setMessage({ open: true, text: translations.fillRequiredFields || 'Por favor completa todos los campos obligatorios', severity: 'error' });
      return false;
    }
    if (!regexEmail.test(formData.email)) {
      setMessage({ open: true, text: translations.fillRequiredFields || 'Formato de correo invalido', severity: 'error' });
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

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 1: handleAddStudent corregido
  // - studentId se extrae DESPUÉS de obtener la respuesta
  // - El bloque de paquete/clases solo corre si hay formData.package
  // - weeklyScheduleFromClasses se construye desde slotsPerPhase (no weeklyScheduleSlots vacío)
  // ─────────────────────────────────────────────────────────────────────────
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
        timezone: timezone,
        zoomLink: formData.zoomLink || '',
        allowDifferentTeacher: formData.allowDifferentTeacher || false,
        weeklySchedule: weeklyScheduleSlots
      };

      const response = await authAPI.register(userData);

      // ✅ FIX: obtener studentId AQUÍ, después de la respuesta
      const studentId = response?.studentId;
      if (!studentId) {
        throw new Error('No se recibió el ID del estudiante del servidor');
      }

      // ✅ FIX: solo ejecutar lógica de paquete si se seleccionó uno
      if (formData.package) {
        const packageDetails = packages.find(pkg => pkg.id === formData.package);
        const startDate = packageStartDate || new Date().toISOString().split('T')[0];
        const endDate = moment(startDate).add(packageDetails?.durationMonths || 1, 'months').format('YYYY-MM-DD');

        await studentAPI.assignPackage(studentId, {
          packageId: formData.package,
          startDate,
          endDate,
        });

        // ✅ FIX: weeklySchedule construido desde slotsPerPhase (fuente correcta)
        const weeklyScheduleFromClasses = Object.values(slotsPerPhase).map(slot => ({
          day: slot.day,
          hour: parseInt(slot.start.split(':')[0]),
          startTime: slot.start,
          endTime: slot.end,
        }));

        if (selectedTeacher) {
          await fetchWithAuth(`/teachers/${selectedTeacher}/students`, {
            method: 'POST',
            body: JSON.stringify({ studentId, weeklySchedule: weeklyScheduleFromClasses })
          });
        }

        const validClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime && !cls.isPreview);
        if (validClasses.length > 0) {
          await studentAPI.scheduleClasses(studentId, {
            packageId: formData.package,
            weeklySchedule: weeklyScheduleFromClasses,
            classes: validClasses.map(cls => ({ ...cls, teacherId: selectedTeacher || undefined }))
          });
        }
      }

      setMessage({ open: true, text: translations.studentAddedSuccess, severity: 'success' });
      if (typeof refreshStudents === 'function') refreshStudents();
      onClose();

    } catch (error) {
      console.error('Error al guardar estudiante:', error);
      if (error.status === 409 || error.message?.toLowerCase().includes('exists')) {
        setUsernameError('Este nombre de usuario ya está en uso, no lo puedes usar');
        setFormData(prev => ({ ...prev, username: '' }));
        setMessage({ open: true, text: 'Error: El usuario ya existe', severity: 'error' });
      } else {
        setMessage({ open: true, text: error.message || 'Error desconocido', severity: 'error' });
      }
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
          <Grid item xs={12} sm={6}><TextField label={translations.username} name="username" value={formData.username} onChange={handleFormChange} fullWidth required variant="outlined" error={!!usernameError} helperText={usernameError} sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.password} name="password" type="password" value={formData.password} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.confirmPassword} name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} /></Grid>

          {/* Teléfono */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* ✅ FIX 2: extraer key de props para evitar el warning de React */}
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
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box component="li" key={key} {...optionProps} sx={{ display: 'flex', gap: 1, fontSize: '0.85rem' }}>
                      <img src={option.flag} alt={option.code} width="20" />
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{option.code}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{option.dialCode}</Typography>
                      <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.6 }}>{option.name}</Typography>
                    </Box>
                  );
                }}
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

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <GlobeIcon sx={{ color: '#845EC2' }} />
              <Typography variant="subtitle2" fontWeight="bold">Zona Horaria del Estudiante</Typography>
            </Box>
            <Autocomplete
              options={availableTimezones}
              value={timezone}
              onChange={(event, newValue) => {
                if (newValue) setTimezone(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Seleccionar Zona Horaria"
                  variant="outlined"
                  sx={textFieldStyle(theme)}
                  helperText="Se ajusta automáticamente según el País y Ciudad seleccionados"
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