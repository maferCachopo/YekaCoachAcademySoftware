import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  TextField, Button, Grid, MenuItem, CircularProgress, FormControlLabel, Switch,
  Divider, Alert, Paper, Tabs, Tab, Autocomplete
} from '@mui/material';
import { Add as AddIcon, Event as EventIcon, CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { authAPI, studentAPI, packageAPI, adminAPI } from '../../../utils/api';
import { textFieldStyle } from '../utils/styles';
import ClassSchedulingForm from './ClassSchedulingForm';
import TeacherAvailabilityCalendar from './TeacherAvailabilityCalendar';
import { fetchWithAuth } from '../../../utils/api';
import moment from 'moment'; // Importante para manejar los nombres de los días


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
  // Estados para el algoritmo de fases
  const [currentPhase, setCurrentPhase] = useState(1);
  const [totalPhases, setTotalPhases] = useState(1);
  const [blocksPerWeek, setBlocksPerWeek] = useState(1);
  const prevPackageIdRef = useRef(null);


  // Fetch teachers when the dialog opens
  useEffect(() => {
        if (open) {
          fetchTeachers();
        }
      }, [open]);

    useEffect(() => {
    // Solo actuamos si el ID del paquete cambió realmente
    if (formData.package && formData.package !== prevPackageIdRef.current) {
      const selectedPkg = packages.find(pkg => pkg.id === formData.package);
      
      if (selectedPkg) {
        const T = selectedPkg.totalClasses;
        const S = selectedPkg.durationWeeks || 4;
        const B = Math.ceil(T / S); // Bloques por semana (Fases)

        setTotalPhases(B);
        setCurrentPhase(1);
        setScheduledClasses([]); // Limpiar al cambiar de paquete
        
        prevPackageIdRef.current = formData.package; // Guardamos en la referencia
        console.log(`Paso 1 completado: Paquete ${selectedPkg.name}, Fases: ${B}`);
      }
    }
  }, [formData.package, packages]);


  // Fetch teachers list
  const fetchTeachers = async () => {
    try {
      const response = await fetchWithAuth('/teachers');
      // Filter only active teachers
      const activeTeachers = response.filter(teacher => teacher.active);
      setTeachers(activeTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setMessage({
        open: true,
        text: translations.errorFetchingTeachers || 'Error fetching teachers',
        severity: 'error'
      });
    }
  };

  // Fetch teacher's schedule when selected
  const fetchTeacherSchedule = async (teacherId) => {
    if (!teacherId) {
      setTeacherSchedule(null);
      return;
    }

    setLoadingSchedule(true);
    try {
      const scheduleData = await fetchWithAuth(`/teachers/${teacherId}/schedule`);
      setTeacherSchedule(scheduleData);
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      setMessage({
        open: true,
        text: translations.errorFetchingSchedule || 'Error fetching teacher schedule',
        severity: 'warning'
      });
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Handle teacher selection change
  const handleTeacherChange = (e) => {
    const teacherId = e.target.value;
    setSelectedTeacher(teacherId);
    
    if (teacherId) {
      fetchTeacherSchedule(teacherId);
    } else {
      setTeacherSchedule(null);
    }
  };

// Handle available slot selection from calendar

// Dentro de AddDialog.jsx

const handleSlotSelect = (slot) => {
  if (!formData.package) return;

  const selectedPkg = packages.find(pkg => pkg.id === formData.package);
  const T = selectedPkg.totalClasses;
  const S = selectedPkg.durationWeeks || 4;
  const B = totalPhases; // El B calculado arriba
  const P = currentPhase; // La fase actual

  // 1. Calcular fecha de inicio (siempre hacia adelante)
  let firstDate = moment().day(slot.day);
  const now = moment();
  if (moment(`${firstDate.format('YYYY-MM-DD')} ${slot.start}`, 'YYYY-MM-DD HH:mm').isBefore(now)) {
    firstDate.add(1, 'weeks');
  }

  // 2. Aplicación de la Fórmula y Proyección (Paso 2)
  const phaseClasses = [];
  for (let i = 0; i < S; i++) {
    const classIndex = P + (i * B);

    if (classIndex <= T) {
      phaseClasses.push({
        phase: P, // Identificador de fase
        id: `temp-${P}-${i}`, // ID temporal para React
        classNumber: classIndex,
        date: moment(firstDate).add(i, 'weeks').format('YYYY-MM-DD'),
        startTime: slot.start,
        endTime: slot.end,
        teacherId: selectedTeacher
      });
    }
  }

  // 3. Filtro de Reemplazo (Paso 2)
  setScheduledClasses(prev => {
    // Quitamos lo que hubiera de esta fase anteriormente
    const otherPhases = prev.filter(c => c.phase !== P);
    // Añadimos lo nuevo y ordenamos por número de clase
    return [...otherPhases, ...phaseClasses].sort((a, b) => a.classNumber - b.classNumber);
  });
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
      console.error("Error cargando ciudades:", error);
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
    setMessage({
      open: true,
      text: translations.fillRequiredFields || 'Por favor completa todos los campos obligatorios',
      severity: 'error'
    });
    return false;
  }

  if (formData.password !== formData.confirmPassword) {
    setMessage({ open: true, text: translations.passwordsDoNotMatch, severity: 'error' });
    return false;
  }

  if (formData.package) {
    const selectedPackage = packages.find(pkg => pkg.id === formData.package);
    if (selectedPackage) {
      // MODIFICACIÓN: Validar que el total de clases programadas coincida con el paquete
      const requiredTotal = selectedPackage.totalClasses; // Ej: 4 para paquete básico
      const filledClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime);
      
      if (filledClasses.length < requiredTotal) {
        setMessage({
          open: true,
          text: `Error: El paquete requiere programar ${requiredTotal} clases. Llevas ${filledClasses.length}.`,
          severity: 'error'
        });
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
      
      // Formateamos la data para que sea fácil de usar
      const formatted = data
        .map(country => ({
          name: country.name.common,
          code: country.cca2,
          flag: country.flags.png,
          // Algunos países tienen varios sufijos, tomamos el primero
          dialCode: country.idd.root + (country.idd.suffixes ? country.idd.suffixes[0] : '')
        }))
        // Filtramos los que no tienen dialCode y ordenamos alfabéticamente
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
      allowDifferentTeacher: formData.allowDifferentTeacher || false
    };

    // 1. Registro de Usuario y Estudiante
    const response = await authAPI.register(userData);
    
    if (response && (response.studentId || response.userId)) {
      const studentId = response.studentId;

      // 2. Asignación de Paquete
      const packageDetails = packages.find(pkg => pkg.id === formData.package);
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (packageDetails.durationMonths || 1));
      
      await studentAPI.assignPackage(studentId, {
        packageId: formData.package,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      
      // 3. Asignación de Profesor y Horario Fijo
      if (selectedTeacher) {
        // Tomamos el horario de la primera clase para definir el bloque fijo
        const weeklySchedule = scheduledClasses
          .filter(cls => cls.date && cls.startTime)
          .map(cls => ({
            day: moment(cls.date).format('dddd').toLowerCase(),
            hour: parseInt(cls.startTime.split(':')[0]),
            startTime: cls.startTime,
            endTime: cls.endTime
          })).slice(0, 1); // Solo tomamos el primer bloque como referencia fija

        const uniqueWeeklySchedule = Array.from(new Set(weeklySchedule.map(s => JSON.stringify(s)))).map(s => JSON.parse(s));

        await fetchWithAuth(`/teachers/${selectedTeacher}/students`, {
          method: 'POST',
          body: JSON.stringify({ 
            studentId: studentId,
            weeklySchedule: uniqueWeeklySchedule  
          })
        });
      }
      
      // 4. Programación de las clases físicas en el calendario (Las 4 clases)
      const validClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime);
      await studentAPI.scheduleClasses(studentId, {
        packageId: formData.package,
        classes: validClasses.map(cls => ({
          ...cls,
          teacherId: selectedTeacher
        }))
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

  const primaryButtonStyle = { background: '#845EC2', color: '#ffffff', '&:hover': { background: '#6B46C1' } };
  const secondaryButtonStyle = { color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#ffffff', borderColor: 'rgba(132, 94, 194, 0.5)', '&:hover': { borderColor: '#845EC2', backgroundColor: theme?.mode === 'light' ? 'rgba(132, 94, 194, 0.08)' : 'rgba(132, 94, 194, 0.15)' } };

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
          onClose();
        }
      }}
      disableEscapeKeyDown
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 5, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)', overflow: 'visible', bgcolor: theme.mode === 'light' ? '#fff' : '#151521' } }}
    >
      <DialogTitle sx={{ pb: 2, borderBottom: theme?.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.12)', color: theme.text?.primary, px: 3, pt: 3, fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <AddIcon sx={{ color: '#4caf50' }} />
        {translations.addStudent || 'Add Student'}
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, pb: 4, overflowY: 'auto', backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Box sx={{ mb: 4 }}></Box>
        <Grid container spacing={3} sx={{ pt: 3 }}>
          <Grid item xs={12} sm={6}><TextField label={translations.firstName} name="name" value={formData.name} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.lastName} name="surname" value={formData.surname} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.birthDate} name="birthDate" type="date" value={formData.birthDate || ''} onChange={handleFormChange} fullWidth variant="outlined" InputLabelProps={{ shrink: true }} sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.email} name="email" type="email" value={formData.email} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.username} name="username" value={formData.username} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.password} name="password" type="password" value={formData.password} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}><TextField label={translations.confirmPassword} name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleFormChange} fullWidth required variant="outlined" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* Selector de País con Búsqueda e Iniciales */}
              <Autocomplete
                options={allCountries}
                getOptionLabel={(option) => `${option.code} ${option.dialCode}`}
                // Esto permite buscar por nombre de país, dialCode o inicial (CCA2)
                filterOptions={(options, { inputValue }) => {
                  return options.filter(item => 
                    item.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                    item.dialCode.includes(inputValue) ||
                    item.code.toLowerCase().includes(inputValue.toLowerCase())
                  );
                }}
                value={allCountries.find(c => c.dialCode === formData.countryCode) || null}
                onChange={(event, newValue) => {
                  const countryName = newValue ? newValue.name : '';
                  const dialCode = newValue ? newValue.dialCode : '';
                  setFormData(prev => ({ 
                    ...prev, 
                    country: countryName, 
                    city: '',
                    countryCode: dialCode // <--- Esto actualiza el prefijo del teléfono automáticamente
                  }));
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
                  <TextField
                    {...params}
                    label="País"
                    variant="outlined"
                    sx={{ ...textFieldStyle(theme), mt: 0 }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          {loadingCountries ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              {/* Campo de Número de Teléfono */}
              <TextField
                label={translations.phone}
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, ''); // Solo números
                  // Definimos un límite genérico largo, la validación real se puede hacer al guardar
                  if (val.length <= 15) {
                    setFormData(prev => ({ ...prev, phone: val }));
                  }
                }}
                fullWidth
                variant="outlined"
                placeholder="Número local"
                sx={{ ...textFieldStyle(theme), mt: 0 }}
              />
            </Box>
          </Grid>
          {/* Campo País con Autocomplete (Corregido con Key y Automatización de Código) */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={allCountries}
              getOptionLabel={(option) => option.name || ""}
              value={allCountries.find(c => c.name === formData.country) || null}
              onChange={(event, newValue) => {
                const countryName = newValue ? newValue.name : '';
                const dialCode = newValue ? newValue.dialCode : '';
                
                // Actualizamos país, limpiamos ciudad y ponemos el código telefónico automáticamente
                setFormData(prev => ({ 
                  ...prev, 
                  country: countryName, 
                  city: '',
                  countryCode: dialCode 
                }));
                
                if (countryName) fetchCities(countryName);
              }}
              // Solución al error de la consola: Extraer la key explícitamente
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <Box 
                    component="li" 
                    key={key} 
                    {...optionProps} 
                    sx={{ display: 'flex', gap: 1, fontSize: '0.85rem' }}
                  >
                    <img src={option.flag} alt={option.code} width="20" height="14" style={{ borderRadius: '2px' }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '25px' }}>{option.code}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: '40px' }}>{option.dialCode}</Typography>
                    <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.6 }}>{option.name}</Typography>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label={translations.country} 
                  variant="outlined" 
                  sx={textFieldStyle(theme)} 
                />
              )}
            />
          </Grid>

          {/* Campo Ciudad con Autocomplete */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={cities}
              freeSolo
              loading={loadingCities}
              value={formData.city || ''}
              onInputChange={(event, newInputValue) => {
                setFormData(prev => ({ ...prev, city: newInputValue }));
              }}
              disabled={!formData.country} // Se bloquea si no hay país
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={translations.city}
                  variant="outlined"
                  sx={textFieldStyle(theme)}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCities ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  placeholder={!formData.country ? "Selecciona un país primero" : "Escribe o busca tu ciudad"}
                />
              )}
            />
          </Grid>
                    <Grid item xs={12} sm={6}>
            <TextField select label={translations.package} name="package" value={formData.package} onChange={handleFormChange} fullWidth variant="outlined" sx={{...textFieldStyle(theme), mt: 0}}>
              <MenuItem value=""><em>{translations.noPackage}</em></MenuItem>
              {packages.map((pkg) => (<MenuItem key={pkg.id} value={pkg.id}>{pkg.name}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label={translations.teacher} value={selectedTeacher} onChange={handleTeacherChange} fullWidth variant="outlined" sx={{...textFieldStyle(theme), mt: 0}}>
              <MenuItem value=""><em>{translations.noTeacher}</em></MenuItem>
              {teachers.map((teacher) => (<MenuItem key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12}><TextField label={translations.zoomLink} name="zoomLink" value={formData.zoomLink || ''} onChange={handleFormChange} fullWidth variant="outlined" placeholder="https://zoom.us/j/123456789" sx={{...textFieldStyle(theme), mt: 0}} /></Grid>
          <Grid item xs={12}> <Box sx={{ mt: 1 }}>
                {/* Texto de encabezado/explicación */}
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 1, 
                    fontWeight: 'bold', 
                    color: theme.text?.primary,
                    display: 'block' 
                  }}
                >
                  {translations.allowDifferentTeacherHeader || 'Permisos de Reprogramación:'}
                </Typography>
                
                {/* El botón de Switch */}
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={formData.allowDifferentTeacher || false} 
                      onChange={(e) => setFormData(prev => ({ ...prev, allowDifferentTeacher: e.target.checked }))} 
                      color="primary" 
                    />
                  } 
                  label={
                    <Typography variant="body2" sx={{ color: theme.text?.secondary }}>
                      {translations.allowDifferentTeacher || 'Permitir que el estudiante reagende con otros profesores disponibles'}
                    </Typography>
                  }
                  sx={{ color: theme.text?.primary }} 
                />
              </Box></Grid>
        </Grid>
        
        {selectedTeacher && (
          <Box sx={{ mt: 4, p: 3, bgcolor: theme.mode === 'light' ? 'rgba(0, 120, 220, 0.05)' : 'rgba(0, 120, 220, 0.15)', borderRadius: 3 }}>
              {formData.package && (
                <Box sx={{ 
                  mb: 3, p: 2, 
                  bgcolor: theme.mode === 'light' ? '#f8f9fa' : '#1e1e2d', 
                  borderRadius: 2, border: '2px solid #845EC2' 
                }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    {/* 1. Título dinámico según si es el último bloque o no */}
                    {currentPhase === totalPhases 
                      ? `Configurando Bloque Final (${currentPhase} de ${totalPhases})`
                      : `Configurando Bloque Horario ${currentPhase} de ${totalPhases}`
                    }
                  </Typography>
                  
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    
                    {/* 2. Botón SIEMPRE visible mientras no hayamos pasado al siguiente bloque */}
                    {currentPhase < totalPhases ? (
                      <Button 
                        size="small" variant="contained" 
                        // Solo habilitar si el usuario ya hizo clic en el calendario para esta fase
                        disabled={!scheduledClasses.some(c => c.phase === currentPhase)}
                        onClick={() => setCurrentPhase(prev => prev + 1)}
                        sx={{ bgcolor: '#845EC2' }}
                      >
                        Siguiente Bloque
                      </Button>
                    ) : (
                      // 3. En la fase final, mostramos un mensaje de estado en lugar de un botón de "Siguiente"
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {!scheduledClasses.some(c => c.phase === currentPhase) ? (
                          <Typography variant="body2" sx={{ color: 'orange', fontWeight: 'bold' }}>
                            ⚠️ Por favor, selecciona el horario en el calendario de abajo
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                            ✅ Horario completo. Puedes revisar la lista al final.
                          </Typography>
                        )}
                      </Box>
                    )}
                    
                    {/* 4. Botón Atrás: Solo si no estamos en la primera fase */}
                    {currentPhase > 1 && (
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => setCurrentPhase(prev => prev - 1)}
                      >
                        Atrás
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>{translations.teacherAvailability}</Typography>
            {loadingSchedule ? (<Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>) : teacherSchedule ? (
              <Box sx={{ height: '500px' }}><TeacherAvailabilityCalendar teacherSchedule={teacherSchedule} loading={loadingSchedule} onSlotSelect={handleSlotSelect} scheduledClasses={scheduledClasses} onAvailabilityValidation={handleAvailabilityValidation} /></Box>
            ) : (<Alert severity="info">{translations.selectTeacherFirst}</Alert>)}
          </Box>
        )}

        {formData.package && (
          <Box sx={{ mt: 4, p: 3, bgcolor: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.05)' : 'rgba(132, 94, 194, 0.15)', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>{translations.scheduleClasses}</Typography>
            <ClassSchedulingForm scheduledClasses={scheduledClasses} setScheduledClasses={setScheduledClasses} packageId={formData.package} teacherId={selectedTeacher} teacherValidationFn={teacherValidationFn} />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, px: 3, borderTop: theme?.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.12)', gap: 2, backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Button onClick={onClose} variant="outlined" sx={{...secondaryButtonStyle, minWidth: 120, height: 42}}>{translations.cancel}</Button>
        <Button variant="contained" onClick={handleAddStudent} disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null} sx={{...primaryButtonStyle, minWidth: 120, height: 42}}>
          {loading ? translations.adding : translations.addStudent}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDialog;