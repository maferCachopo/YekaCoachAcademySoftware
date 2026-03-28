import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  TextField, Button, Grid, MenuItem, CircularProgress, FormControlLabel,
  Switch, Alert, Chip, Tooltip, Autocomplete
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  AutoFixHigh as GenerateIcon,
  Public as GlobeIcon
} from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { studentAPI, packageAPI } from '../../../utils/api';
import { textFieldStyle } from '../utils/styles';
import ClassSchedulingForm from './ClassSchedulingForm';
import TeacherAvailabilityCalendar from './TeacherAvailabilityCalendar';
import { fetchWithAuth } from '../../../utils/api';
import moment from 'moment';
import 'moment-timezone';
import { ADMIN_TIMEZONE } from '../../../utils/constants';
import { getAllCountries, getTimezonesForCountry } from 'countries-and-timezones';

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES DE GENERACIÓN DE FECHAS (idénticas a AddDialog)
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
    .map(slot => ({ ...slot, firstDate: getFirstOccurrence(startDate, slot) }))
    .sort((a, b) => moment(a.firstDate).diff(moment(b.firstDate)));

  const blockDates = slotsWithFirstDate.map(slot => generateBlockDates(slot.firstDate, slot, S));

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
// COMPONENTE EDITDIALOG
// ─────────────────────────────────────────────────────────────────────────────

const EditDialog = ({
  open,
  onClose,
  student,
  formData,
  setFormData,
  packages,
  scheduledClasses,
  setScheduledClasses,
  existingClasses,
  setExistingClasses,
  setMessage,
  refreshStudents,
  initialTeacherId  
}) => {
  const [loading, setLoading] = useState(false);
  const [packageDetails, setPackageDetails] = useState(null);
  const [packageLoading, setPackageLoading] = useState(false);
  const [classesTaken, setClassesTaken] = useState(0);
  const [packageError, setPackageError] = useState('');
  const [isResetPackage, setIsResetPackage] = useState(false);
  const [originalPackageId, setOriginalPackageId] = useState(null);

  // Teacher states
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherSchedule, setTeacherSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [teacherValidationFn, setTeacherValidationFn] = useState(null);

  // Country / city / timezone states
  const [allCountries, setAllCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [timezone, setTimezone] = useState('America/Caracas');
  const [availableTimezones, setAvailableTimezones] = useState(moment.tz.names());

  // Phase / scheduling states (for reset-package flow)
  const [currentPhase, setCurrentPhase] = useState(1);
  const [totalPhases, setTotalPhases] = useState(1);
  const [packageStartDate, setPackageStartDate] = useState(null);
  const [slotsPerPhase, setSlotsPerPhase] = useState({});
  const [weeklyScheduleSlots, setWeeklyScheduleSlots] = useState([]);

  const formInitialized = useRef(false);
  const prevPackageIdRef = useRef(null);

  const { theme } = useTheme();
  const { translations } = useLanguage();

  // ─── Styles ───
  const primaryButtonStyle = {
    background: '#845EC2',
    color: '#ffffff',
    '&:hover': { background: '#6B46C1' },
  };
  const secondaryButtonStyle = {
    color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#ffffff',
    borderColor: 'rgba(132, 94, 194, 0.5)',
    '&:hover': {
      borderColor: '#845EC2',
      backgroundColor: theme?.mode === 'light' ? 'rgba(132, 94, 194, 0.08)' : 'rgba(132, 94, 194, 0.15)',
    },
  };

  // ─── Load countries when dialog opens ───
  useEffect(() => {
    if (!open) return;
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
        console.error('Error cargando países:', error);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, [open]);

  // ─── Initialize form when dialog opens ───
  useEffect(() => {
    if (open && student?.id && !formInitialized.current) {
      if (formData.package) setOriginalPackageId(formData.package);

      // Populate timezone from student data
      if (student.timezone) setTimezone(student.timezone);

      // Populate zoomLink / allowDifferentTeacher if missing from formData
      if (student.zoomLink && !formData.zoomLink) {
        setFormData(prev => ({ ...prev, zoomLink: student.zoomLink }));
      }
      if (student.allowDifferentTeacher !== undefined) {
        setFormData(prev => ({ ...prev, allowDifferentTeacher: student.allowDifferentTeacher }));
      }

      // If student has a country, pre-load cities
      if (student.country) fetchCities(student.country);

      fetchTeachers();
      if (initialTeacherId) {
        setSelectedTeacher(initialTeacherId);
        fetchTeacherSchedule(initialTeacherId);
      }
      formInitialized.current = true;
    }

    if (!open) {
      formInitialized.current = false;
      // Reset scheduling states on close
      setCurrentPhase(1);
      setTotalPhases(1);
      setPackageStartDate(null);
      setSlotsPerPhase({});
      setSelectedTeacher('');
      setTeacherSchedule(null);
      prevPackageIdRef.current = null;
      setIsResetPackage(false);
      setOriginalPackageId(null);
    }
  }, [open, student?.id]);

  // ─── Timezone: filter by country ───
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
          if (zoneNames.length === 1) setTimezone(zoneNames[0]);
        }
      } else {
        setAvailableTimezones(moment.tz.names());
      }
    } else {
      setAvailableTimezones(moment.tz.names());
    }
  }, [formData.country]);

  // ─── Timezone: predict from city ───
  useEffect(() => {
    if (formData.city && formData.city.length > 3) {
      const normalizedCity = formData.city.toLowerCase().replace(/\s+/g, '_');
      const matchedZone = availableTimezones.find(tz =>
        tz.toLowerCase().includes(normalizedCity)
      );
      if (matchedZone) setTimezone(matchedZone);
    }
  }, [formData.city, availableTimezones]);

  // ─── When package changes in reset-flow: recalculate phases ───
  useEffect(() => {
    if (isResetPackage && formData.package && formData.package !== prevPackageIdRef.current) {
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
  }, [formData.package, isResetPackage, packages]);

  // ─── Fetch package + existing classes when package selected (non-reset) ───
  useEffect(() => {
    if (open && student?.id && formData.package && !isResetPackage) {
      fetchPackageAndClasses();
    } else if (!formData.package) {
      setExistingClasses([]);
      setPackageDetails(null);
      setClassesTaken(0);
      setPackageError('');
    }
  }, [open, student?.id, formData.package, isResetPackage]);

  // ─── API helpers ───
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
    } catch {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchPackageAndClasses = async () => {
    setPackageLoading(true);
    try {
      const packageId = Number(formData.package);
      const packageData = await packageAPI.getPackageById(packageId);
      setPackageDetails(packageData);

      const allClasses = await studentAPI.getStudentClasses(student.id);
      const studentPackages = await studentAPI.getStudentPackages(student.id);
      const activePackage = studentPackages.find(p => p.packageId === packageId && p.status === 'active');

      if (!activePackage) {
        setPackageError('No active package found for this student');
        setExistingClasses([]);
        setClassesTaken(0);
        setPackageLoading(false);
        return;
      }

      const packageClasses = allClasses.filter(c => c.studentPackageId === activePackage.id);
      const attendedClasses = packageClasses.filter(c => c.status === 'attended').length;
      setClassesTaken(attendedClasses);

      const scheduledPackageClasses = packageClasses.filter(c => c.status === 'scheduled');
      setExistingClasses(scheduledPackageClasses);

      if (scheduledPackageClasses.length > 0) {
        const formattedClasses = scheduledPackageClasses.map(cls => ({
          id: cls.id,
          classId: cls.classId,
          date: cls.classDetail?.date ? moment(cls.classDetail.date).format('YYYY-MM-DD') : '',
          startTime: cls.classDetail?.startTime || '',
          endTime: cls.classDetail?.endTime || '',
          status: cls.status || 'scheduled'
        }));
        setScheduledClasses(formattedClasses);
      } else {
        setScheduledClasses([]);
      }

      const packageEndDate = moment(activePackage.endDate);
      if (packageData.totalClasses <= attendedClasses) {
        setPackageError(`All ${packageData.totalClasses} classes in this package have been used.`);
      } else if (moment().isAfter(packageEndDate)) {
        setPackageError(`Package has expired. End date was ${packageEndDate.format('YYYY-MM-DD')}.`);
      } else {
        setPackageError('');
      }
    } catch (error) {
      console.error('Error fetching package and classes:', error);
      setExistingClasses([]);
      setPackageDetails(null);
      setPackageError('Error loading package details');
    } finally {
      setPackageLoading(false);
    }
  };

  // ─── Handlers ───
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'package' && value !== originalPackageId) {
      setIsResetPackage(true);
    }
  };

  const handleTeacherChange = (e) => {
    const teacherId = e.target.value;
    setSelectedTeacher(teacherId);
    fetchTeacherSchedule(teacherId);
  };

  const handleAvailabilityValidation = (validationFn) => {
    setTeacherValidationFn(() => validationFn);
  };

  const handleScheduleChange = useCallback((slots) => {
    setWeeklyScheduleSlots(slots);
  }, []);

  const handleResetPackage = () => {
    setIsResetPackage(true);
    setScheduledClasses([]);
    setExistingClasses([]);
  };

  const handleUndoResetPackage = () => {
    setIsResetPackage(false);
    setFormData(prev => ({ ...prev, package: originalPackageId }));
    setSlotsPerPhase({});
    setPackageStartDate(null);
    fetchPackageAndClasses();
  };

  // ─── Slot selection for reset-package scheduling ───
  const handleSlotSelect = (slot) => {
    if (!formData.package) return;

    setSlotsPerPhase(prev => ({
      ...prev,
      [currentPhase]: { day: slot.day, start: slot.start, end: slot.end, phase: currentPhase }
    }));

    const selectedPkg = packages.find(pkg => pkg.id === formData.package);
    if (!selectedPkg) return;
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

  // ─── Generate dates (Step 2 of reset-package flow) ───
  const handleGenerateDates = () => {
    if (!packageStartDate) {
      setMessage({ open: true, text: 'Por favor selecciona la fecha de inicio del paquete', severity: 'warning' });
      return;
    }
    if (Object.keys(slotsPerPhase).length !== totalPhases) {
      setMessage({ open: true, text: `Debes seleccionar los ${totalPhases} bloques horarios antes de generar`, severity: 'warning' });
      return;
    }

    const selectedPkg = packages.find(pkg => pkg.id === formData.package);
    const T = selectedPkg.totalClasses;
    const S = selectedPkg.durationWeeks || 4;
    const slotsArray = Object.values(slotsPerPhase).sort((a, b) => a.phase - b.phase);

    const generatedClasses = generateAllClasses(packageStartDate, slotsArray, T, S, selectedTeacher);
    setScheduledClasses(generatedClasses.map(cls => ({ ...cls, isPreview: false })));
    setMessage({ open: true, text: `✅ ${T} clases generadas correctamente desde el ${moment(packageStartDate).format('DD/MM/YYYY')}`, severity: 'success' });
  };

  // ─── Save handler ───
  const handleSaveStudent = async () => {
    setLoading(true);
    try {
      // Basic validation
      if (!formData.name || !formData.surname || !formData.email || !formData.username) {
        setMessage({ open: true, text: 'Por favor completa todos los campos obligatorios.', severity: 'error' });
        setLoading(false);
        return;
      }
      if (formData.password && formData.password !== formData.confirmPassword) {
        setMessage({ open: true, text: 'Las contraseñas no coinciden.', severity: 'error' });
        setLoading(false);
        return;
      }

      // Validate scheduled classes if package selected and not resetting
      if (formData.package && !isResetPackage) {
        const selectedPackage = packages.find(pkg => pkg.id === formData.package);
        if (selectedPackage) {
          const validClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime);
          if (validClasses.length < selectedPackage.totalClasses) {
            setMessage({
              open: true,
              text: `Error: Debes programar las ${selectedPackage.totalClasses} clases completas. Solo llevas ${validClasses.length}.`,
              severity: 'error'
            });
            setLoading(false);
            return;
          }
          if (selectedTeacher && teacherValidationFn) {
            for (let i = 0; i < validClasses.length; i++) {
              const cls = validClasses[i];
              const validation = teacherValidationFn(cls.date, cls.startTime, cls.endTime);
              if (!validation.valid) {
                setMessage({ open: true, text: `Clase ${i + 1}: ${validation.message}`, severity: 'error' });
                setLoading(false);
                return;
              }
            }
          }
        }
      }

      // Validate scheduled classes if resetting package
      if (formData.package && isResetPackage) {
        const selectedPackage = packages.find(pkg => pkg.id === formData.package);
        if (selectedPackage) {
          const validClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime && !cls.isPreview);
          if (validClasses.length < selectedPackage.totalClasses) {
            setMessage({
              open: true,
              text: `El paquete requiere ${selectedPackage.totalClasses} clases. Llevas ${validClasses.length}. ¿Pulsaste "Generar fechas"?`,
              severity: 'error'
            });
            setLoading(false);
            return;
          }
        }
      }

      // ── 1. Update student + user ──
      const updateData = {
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        username: formData.username,
        birthDate: formData.birthDate || null,
        phone: formData.phone || '',
        city: formData.city || '',
        country: formData.country || '',
        timezone: timezone,
        active: formData.active !== false,
        zoomLink: formData.zoomLink || null,
        allowDifferentTeacher: formData.allowDifferentTeacher || false,
        updateUser: true,
        ...(formData.password ? { password: formData.password } : {})
      };

      await studentAPI.updateStudent(student.id, updateData);

      // ── 2. Handle package assignment ──
      if (formData.package) {
        if (isResetPackage || formData.package !== originalPackageId) {
          // Mark existing active package as completed
          if (originalPackageId) {
            const studentPackages = await studentAPI.getStudentPackages(student.id);
            const existingActive = studentPackages.find(
              p => p.status === 'active' && p.packageId === Number(originalPackageId)
            );
            if (existingActive) {
              await studentAPI.updateStudentPackage(student.id, existingActive.id, { status: 'completed' });
            }
          }

          // Assign new package
          const pkgDetails = await packageAPI.getPackageById(formData.package);
          const startDate = packageStartDate || new Date().toISOString().split('T')[0];
          const endDate = moment(startDate).add(pkgDetails.durationMonths || 1, 'months').format('YYYY-MM-DD');

          await studentAPI.assignPackage(student.id, {
            packageId: formData.package,
            startDate,
            endDate,
          });

          // Assign teacher if selected
          if (selectedTeacher) {
            await fetchWithAuth(`/teachers/${selectedTeacher}/students`, {
              method: 'POST',
              body: JSON.stringify({ studentId: student.id, weeklySchedule: weeklyScheduleSlots })
            });
          }

          // Schedule new classes
          const validClasses = scheduledClasses.filter(cls => cls.date && cls.startTime && cls.endTime && !cls.isPreview);
          if (validClasses.length > 0) {
            await studentAPI.scheduleClasses(student.id, {
              packageId: formData.package,
              weeklySchedule: weeklyScheduleSlots,
              classes: validClasses.map(cls => ({ ...cls, teacherId: selectedTeacher || cls.teacherId }))
            });
          }
        } else {
          // Same package — update existing classes that changed
          const classesWithIds = scheduledClasses.filter(cls => cls.classId);
          for (const updatedClass of classesWithIds) {
            const originalClass = existingClasses.find(c => c.classId === updatedClass.classId);
            if (originalClass) {
              const origDate = originalClass.classDetail?.date ? moment(originalClass.classDetail.date).format('YYYY-MM-DD') : '';
              const origStart = originalClass.classDetail?.startTime || '';
              const origEnd = originalClass.classDetail?.endTime || '';
              const hasChanges = updatedClass.date !== origDate || updatedClass.startTime !== origStart || updatedClass.endTime !== origEnd;
              if (hasChanges) {
                const classUpdateData = {};
                if (updatedClass.date) classUpdateData.date = updatedClass.date;
                if (updatedClass.startTime) classUpdateData.startTime = updatedClass.startTime;
                if (updatedClass.endTime) classUpdateData.endTime = updatedClass.endTime;
                if (Object.keys(classUpdateData).length > 0) {
                  await fetchWithAuth(`/classes/${updatedClass.classId}`, {
                    method: 'PUT',
                    body: JSON.stringify(classUpdateData)
                  });
                }
              }
            }
          }

          // Schedule brand-new classes (no classId)
          // Si hay clases nuevas SIN classId, significa que el admin rehizo el horario
          // → primero borramos las scheduled existentes, luego creamos las nuevas
          const newClasses = scheduledClasses.filter(cls => !cls.classId && cls.date && cls.startTime && cls.endTime);
          if (newClasses.length > 0) {
            const studentPackages = await studentAPI.getStudentPackages(student.id);
            const activePackage = studentPackages.find(p => p.packageId === Number(formData.package) && p.status === 'active');
            if (activePackage) {
              // ── BORRAR clases scheduled anteriores antes de crear las nuevas ──
              await fetchWithAuth(`/students/${student.id}/packages/${activePackage.id}/scheduled-classes`, {
                method: 'DELETE'
              });

              // ── Crear las nuevas clases ──
              await studentAPI.scheduleClasses(student.id, {
                packageId: formData.package,
                classes: newClasses,
                studentPackageId: activePackage.id
              });
            }
          }
        }
      }

      setMessage({ open: true, text: translations.studentUpdatedSuccess || '¡Estudiante actualizado correctamente!', severity: 'success' });
      if (typeof refreshStudents === 'function') refreshStudents();
      onClose();
    } catch (error) {
      console.error('Error updating student:', error);
      setMessage({ open: true, text: error.message || 'Error al actualizar el estudiante.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived UI values ───
  const selectedPkg = packages.find(pkg => pkg.id === formData.package);
  const allPhasesSelected = selectedPkg && isResetPackage
    ? Object.keys(slotsPerPhase).length === totalPhases
    : false;
  const datesGenerated = scheduledClasses.length > 0 && scheduledClasses.every(c => !c.isPreview);
  const remainingClasses = packageDetails ? packageDetails.totalClasses - classesTaken : 0;

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => { if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') onClose(); }}
      disableEscapeKeyDown
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 5,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          overflow: 'visible',
          bgcolor: theme.mode === 'light' ? '#fff' : '#151521',
        }
      }}
    >
      {/* ── Title ── */}
      <DialogTitle sx={{
        pb: 2,
        borderBottom: theme?.mode === 'light' ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)',
        color: theme.text?.primary,
        px: 3, pt: 3,
        fontSize: '1.5rem', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 1,
        backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d'
      }}>
        <EditIcon sx={{ color: '#0095DA' }} />
        {translations.editStudent || 'Editar Estudiante'}
      </DialogTitle>

      <DialogContent sx={{ p: 3, pb: 4, overflowY: 'auto', backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' }}>
        <Box sx={{ mb: 4 }} />

        <Grid container spacing={3} sx={{ pt: 3 }}>

          {/* ── Nombre / Apellido ── */}
          <Grid item xs={12} sm={6}>
            <TextField label={translations.firstName || 'Nombre'} name="name" value={formData.name} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label={translations.lastName || 'Apellido'} name="surname" value={formData.surname} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} />
          </Grid>

          {/* ── Fecha de nacimiento / Email ── */}
          <Grid item xs={12} sm={6}>
            <TextField label={translations.birthDate || 'Fecha de Nacimiento'} name="birthDate" type="date" value={formData.birthDate || ''} onChange={handleFormChange} fullWidth variant="outlined" InputLabelProps={{ shrink: true }} sx={{ ...textFieldStyle(theme), mt: 0 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label={translations.email || 'Email'} name="email" type="email" value={formData.email} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} />
          </Grid>

          {/* ── Username ── */}
          <Grid item xs={12} sm={6}>
            <TextField label={translations.username || 'Usuario'} name="username" value={formData.username} onChange={handleFormChange} fullWidth required variant="outlined" sx={{ ...textFieldStyle(theme), mt: 0 }} />
          </Grid>

          {/* ── Teléfono con código de país ── */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Autocomplete
                options={allCountries}
                getOptionLabel={(option) => `${option.code} ${option.dialCode}`}
                filterOptions={(options, { inputValue }) =>
                  options.filter(item =>
                    item.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                    item.dialCode.includes(inputValue) ||
                    item.code.toLowerCase().includes(inputValue.toLowerCase())
                  )
                }
                value={allCountries.find(c => c.dialCode === formData.countryCode) || null}
                onChange={(event, newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    country: newValue?.name || '',
                    city: '',
                    countryCode: newValue?.dialCode || ''
                  }));
                  if (newValue?.name) fetchCities(newValue.name);
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
                    label="Código"
                    variant="outlined"
                    sx={{ ...textFieldStyle(theme), mt: 0 }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          {loadingCountries ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.startAdornment}
                        </>
                      )
                    }}
                  />
                )}
              />
              <TextField
                label={translations.phone || 'Teléfono'}
                name="phone"
                value={formData.phone || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 15) setFormData(prev => ({ ...prev, phone: val }));
                }}
                fullWidth
                variant="outlined"
                placeholder="Número local"
                sx={{ ...textFieldStyle(theme), mt: 0 }}
              />
            </Box>
          </Grid>

          {/* ── País ── */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={allCountries}
              getOptionLabel={(option) => option.name || ''}
              value={allCountries.find(c => c.name === formData.country) || null}
              onChange={(event, newValue) => {
                setFormData(prev => ({
                  ...prev,
                  country: newValue?.name || '',
                  city: '',
                  countryCode: newValue?.dialCode || ''
                }));
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
              renderInput={(params) => (
                <TextField {...params} label={translations.country || 'País'} variant="outlined" sx={textFieldStyle(theme)} />
              )}
            />
          </Grid>

          {/* ── Ciudad ── */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={cities}
              freeSolo
              loading={loadingCities}
              value={formData.city || ''}
              onInputChange={(event, newInputValue) => setFormData(prev => ({ ...prev, city: newInputValue }))}
              disabled={!formData.country}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={translations.city || 'Ciudad'}
                  variant="outlined"
                  sx={textFieldStyle(theme)}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCities ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                  placeholder={!formData.country ? 'Selecciona un país primero' : 'Escribe o busca tu ciudad'}
                />
              )}
            />
          </Grid>

          {/* ── Zona Horaria ── */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <GlobeIcon sx={{ color: '#845EC2' }} />
              <Typography variant="subtitle2" fontWeight="bold">Zona Horaria del Estudiante</Typography>
            </Box>
            <Autocomplete
              options={availableTimezones}
              value={timezone}
              onChange={(event, newValue) => { if (newValue) setTimezone(newValue); }}
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

          {/* ── Paquete + botón reset ── */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <TextField
                select
                label={translations.package || 'Paquete'}
                name="package"
                value={formData.package}
                onChange={handleFormChange}
                fullWidth
                variant="outlined"
                sx={{ ...textFieldStyle(theme), mt: 0 }}
              >
                <MenuItem value=""><em>{translations.noPackage || 'Sin Paquete'}</em></MenuItem>
                {packages.map((pkg) => (
                  <MenuItem key={pkg.id} value={pkg.id}>{pkg.name}</MenuItem>
                ))}
              </TextField>

              {formData.package && formData.package === originalPackageId && !isResetPackage && (
                <Tooltip title="Reiniciar paquete (iniciar nuevo ciclo)">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleResetPackage}
                    sx={{ mt: 1, height: 40, minWidth: 100, ...secondaryButtonStyle }}
                  >
                    {translations.reset || 'Reiniciar'}
                  </Button>
                </Tooltip>
              )}

              {isResetPackage && (
                <Tooltip title="Deshacer y mantener el paquete actual">
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleUndoResetPackage}
                    sx={{ mt: 1, height: 40, minWidth: 100 }}
                  >
                    {translations.undo || 'Deshacer'}
                  </Button>
                </Tooltip>
              )}
            </Box>
            {isResetPackage && formData.package && (
              <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
                Asignando nuevo paquete. El paquete actual se marcará como completado.
              </Alert>
            )}
          </Grid>

          {/* ── Profesor ── */}
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label={translations.teacher || 'Profesor'}
              value={selectedTeacher}
              onChange={handleTeacherChange}
              fullWidth
              variant="outlined"
              sx={{ ...textFieldStyle(theme), mt: 0 }}
            >
              <MenuItem value=""><em>{translations.noTeacher || 'Sin Profesor'}</em></MenuItem>
              {teachers.map((teacher) => (
                <MenuItem key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* ── Zoom Link ── */}
          <Grid item xs={12}>
            <TextField
              label={translations.zoomLink || 'Zoom Meeting Link'}
              name="zoomLink"
              value={formData.zoomLink || ''}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              placeholder="https://zoom.us/j/123456789"
              sx={{ ...textFieldStyle(theme), mt: 0 }}
            />
          </Grid>

          {/* ── Switches ── */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: theme.text?.primary }}>
                {translations.allowDifferentTeacherHeader || 'Permisos de Reprogramación:'}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active !== false}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    color="success"
                  />
                }
                label={<Typography variant="body2" sx={{ color: theme.text?.secondary }}>Estudiante activo</Typography>}
                sx={{ color: theme.text?.primary }}
              />
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
            </Box>
          </Grid>

          {/* ── Cambiar contraseña ── */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 1, mb: 1, fontWeight: 500, color: theme.text?.primary }}>
              {translations.changePassword || 'Cambiar Contraseña'}
              <Typography component="span" variant="caption" sx={{ ml: 1, color: theme.text?.secondary }}>
                ({translations.leaveBlankToKeep || 'Dejar en blanco para mantener la contraseña actual'})
              </Typography>
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.newPassword || 'Nueva Contraseña'}
              name="password"
              type="password"
              value={formData.password || ''}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              sx={{ ...textFieldStyle(theme), mt: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={translations.confirmPassword || 'Confirmar Contraseña'}
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword || ''}
              onChange={handleFormChange}
              fullWidth
              variant="outlined"
              sx={{ ...textFieldStyle(theme), mt: 0 }}
            />
          </Grid>
        </Grid>

        {/* ══════════════════════════════════════════════════════════════════
            SECCIÓN DE HORARIO NUEVO (solo cuando isResetPackage = true)
            Idéntica al flujo de AddDialog: fases → calendario → generar fechas
        ══════════════════════════════════════════════════════════════════ */}
        {isResetPackage && selectedTeacher && formData.package && (
          <Box sx={{ mt: 4, p: 3, bgcolor: theme.mode === 'light' ? 'rgba(0,120,220,0.05)' : 'rgba(0,120,220,0.15)', borderRadius: 3 }}>

            {/* Paso 1: Bloques horarios */}
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
                  Configurando bloque {currentPhase} de {totalPhases}
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

            {/* Calendario de disponibilidad */}
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>{translations.teacherAvailability || 'Disponibilidad del Profesor'}</Typography>
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
              <Alert severity="info">{translations.selectTeacherFirst || 'Selecciona un profesor para ver su disponibilidad'}</Alert>
            )}

            {/* Paso 2: Fecha de inicio + generar */}
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
                  ✅ Fechas generadas desde el {moment(packageStartDate).format('DD/MM/YYYY')}.
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

        {/* ══════════════════════════════════════════════════════════════════
            SECCIÓN DE CLASES EXISTENTES (paquete actual, no reset)
        ══════════════════════════════════════════════════════════════════ */}
        {formData.package && !isResetPackage && (
          <Box sx={{
            mt: 4, p: 3,
            bgcolor: theme.mode === 'light' ? 'rgba(132,94,194,0.05)' : 'rgba(132,94,194,0.15)',
            borderRadius: 3
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: theme.text?.primary }}>
                {translations.scheduleClasses || 'Clases Programadas'}
              </Typography>
              {existingClasses.length > 0 && (
                <Chip
                  label={`${existingClasses.length} clases programadas`}
                  color="primary"
                  variant="outlined"
                  sx={{ borderColor: '#845EC2', color: theme.mode === 'light' ? '#845EC2' : '#B39CD0' }}
                />
              )}
            </Box>

            {packageLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} sx={{ color: '#845EC2' }} />
              </Box>
            ) : packageError ? (
              <Alert severity="warning" sx={{ mb: 2 }}>{packageError}</Alert>
            ) : (
              <>
                {packageDetails && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: theme.text?.secondary, mb: 1 }}>
                      Paquete: <strong>{packageDetails.name}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.text?.secondary }}>
                      Total: {packageDetails.totalClasses} | Usadas: {classesTaken} | Restantes: {remainingClasses}
                    </Typography>
                  </Box>
                )}
                <ClassSchedulingForm
                  scheduledClasses={scheduledClasses}
                  setScheduledClasses={setScheduledClasses}
                  existingClasses={existingClasses}
                  studentId={student?.id}
                  packageId={formData.package}
                  teacherId={selectedTeacher}
                  teacherValidationFn={teacherValidationFn}
                  onScheduleChange={handleScheduleChange}
                />
              </>
            )}
          </Box>
        )}

        {/* Calendario visible en modo edición normal (paquete actual, profesor seleccionado) */}
        {selectedTeacher && formData.package && !isResetPackage && (
          <Box sx={{
            mt: 4, p: 3,
            bgcolor: theme.mode === 'light' ? 'rgba(0,120,220,0.05)' : 'rgba(0,120,220,0.15)',
            borderRadius: 3
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>
              {translations.teacherAvailability || 'Disponibilidad del Profesor'}
            </Typography>
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
              <Alert severity="info">{translations.selectTeacherFirst || 'Selecciona un profesor para ver su disponibilidad'}</Alert>
            )}
          </Box>
        )}

        {/* Vista de clases generadas (reset-package flow) */}
        {isResetPackage && formData.package && (
          <Box sx={{
            mt: 4, p: 3,
            bgcolor: theme.mode === 'light' ? 'rgba(132,94,194,0.05)' : 'rgba(132,94,194,0.15)',
            borderRadius: 3
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.text?.primary }}>
              {translations.scheduleClasses || 'Clases a Programar'}
            </Typography>
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

      {/* ── Actions ── */}
      <DialogActions sx={{
        p: 3, px: 3,
        borderTop: theme?.mode === 'light' ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)',
        gap: 2,
        backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d'
      }}>
        <Button onClick={onClose} variant="outlined" sx={{ ...secondaryButtonStyle, minWidth: 120, height: 42 }}>
          {translations.cancel || 'Cancelar'}
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveStudent}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{ ...primaryButtonStyle, minWidth: 120, height: 42 }}
        >
          {loading ? (translations.saving || 'Guardando...') : (translations.saveChanges || 'Guardar Cambios')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDialog;