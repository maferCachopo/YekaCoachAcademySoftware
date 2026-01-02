'use client';

import React, { useMemo, useEffect } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import moment from 'moment-timezone';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ADMIN_TIMEZONE } from '@/app/utils/constants';
import { useLanguage } from '@/app/contexts/LanguageContext';
import CalendarButtonFix from '@/app/admin/students/components/CalendarButtonFix';

const COLORS = {
  break: (mode) => (mode === 'light' ? 'rgba(46, 125, 50, 0.75)' : 'rgba(56, 142, 60, 0.85)'),
  free: (mode) => (mode === 'light' ? 'rgba(0, 150, 136, 0.70)' : 'rgba(0, 150, 136, 0.80)'),
  classFg: (mode) => (mode === 'light' ? '#d32f2f' : '#ef5350'),
  classBorder: (mode) => (mode === 'light' ? '#b71c1c' : '#c62828'),
  holiday: (mode) => (mode === 'light' ? 'rgba(120, 120, 120, 0.55)' : 'rgba(189, 189, 189, 0.55)')
};

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

// Subtract an array of intervals from a base interval
function subtractIntervals(base, subtracts) {
  // base: { start, end } in minutes
  // subtracts: [{ start, end }] in minutes
  let result = [{ ...base }];
  for (const s of subtracts) {
    const next = [];
    for (const cur of result) {
      if (s.end <= cur.start || s.start >= cur.end) {
        // no overlap
        next.push(cur);
      } else {
        // overlap cases: split
        if (s.start > cur.start) {
          next.push({ start: cur.start, end: Math.max(cur.start, s.start) });
        }
        if (s.end < cur.end) {
          next.push({ start: Math.min(cur.end, s.end), end: cur.end });
        }
      }
    }
    result = next.filter((iv) => iv.end - iv.start > 0);
  }
  return result;
}

function getWeekdayKey(dateMoment) {
  return dateMoment.format('dddd').toLowerCase();
}

export default function CalendarView({ teacherSchedule, startDate, endDate, onRangeChange }) {
  const { theme } = useTheme();
  const { translations, language } = useLanguage();

  useEffect(() => {
    try {
      moment.locale(language === 'es' ? 'es' : 'en');
    } catch {}
  }, [language]);

  const { events, minTime, maxTime } = useMemo(() => {
    if (!teacherSchedule || !startDate || !endDate) return [];

    const workHours = teacherSchedule.workHours || {};
    const breakHours = teacherSchedule.breakHours || {};
    const classes = teacherSchedule.classes || [];

    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');
    const mode = theme.mode;

    const evts = [];
    let minMinutes = Number.POSITIVE_INFINITY;
    let maxMinutes = 0;

    // Index classes by date for faster lookup
    const classesByDate = classes.reduce((acc, cls) => {
      if (!cls.date || !cls.startTime || !cls.endTime) return acc;
      (acc[cls.date] = acc[cls.date] || []).push({
        start: timeToMinutes(cls.startTime),
        end: timeToMinutes(cls.endTime)
      });
      return acc;
    }, {});

    // Iterate through dates in range
    for (let d = start.clone(); d.isSameOrBefore(end, 'day'); d.add(1, 'day')) {
      const dateStr = d.format('YYYY-MM-DD');
      const weekday = getWeekdayKey(d);
      const dayWork = Array.isArray(workHours[weekday]) ? workHours[weekday] : [];
      const dayBreaks = Array.isArray(breakHours[weekday]) ? breakHours[weekday] : [];
      const dayClasses = classesByDate[dateStr] || [];

      if (dayWork.length === 0) {
        // Holiday/off day background
        evts.push({
          id: `holiday-${dateStr}`,
          title: 'Holiday/Off',
          start: dateStr,
          end: dateStr,
          allDay: true,
          display: 'background',
          backgroundColor: COLORS.holiday(mode),
          extendedProps: { type: 'holiday' }
        });
        continue;
      }

      // Consider work hours for time-window computation, but do not render them
      dayWork.forEach((slot) => {
        if (!slot.start || !slot.end) return;
        minMinutes = Math.min(minMinutes, timeToMinutes(slot.start));
        maxMinutes = Math.max(maxMinutes, timeToMinutes(slot.end));
      });

      dayBreaks.forEach((slot, idx) => {
        if (!slot.start || !slot.end) return;
        minMinutes = Math.min(minMinutes, timeToMinutes(slot.start));
        maxMinutes = Math.max(maxMinutes, timeToMinutes(slot.end));
        evts.push({
          id: `break-${dateStr}-${idx}`,
          title: 'Break',
          start: `${dateStr}T${slot.start}`,
          end: `${dateStr}T${slot.end}`,
          display: 'background',
          backgroundColor: COLORS.break(mode),
          extendedProps: { type: 'break' }
        });
      });

      // Classes as foreground events (so overlaps are auto-laid out by FullCalendar)
      ;(teacherSchedule.classes || [])
        .filter((c) => c.date === dateStr)
        .forEach((c) => {
          const sMin = timeToMinutes(c.startTime);
          const eMin = timeToMinutes(c.endTime);
          minMinutes = Math.min(minMinutes, sMin);
          maxMinutes = Math.max(maxMinutes, eMin);
          evts.push({
            id: `class-${c.id}`,
            title: c.title || 'Class',
            start: `${dateStr}T${c.startTime}`,
            end: `${dateStr}T${c.endTime}`,
            backgroundColor: COLORS.classFg(mode),
            borderColor: COLORS.classBorder(mode),
            textColor: '#ffffff',
            extendedProps: {
              type: 'class',
              studentName: c.studentName || (c.students && c.students[0] ? `${c.students[0].name} ${c.students[0].surname || ''}`.trim() : undefined),
              teacherName: teacherSchedule?.teacher ? `${teacherSchedule.teacher.firstName} ${teacherSchedule.teacher.lastName}` : undefined,
              title: c.title,
              raw: c
            }
          });
        });

      // Compute free work hours = work - breaks - classes
      const subtracts = [
        ...dayBreaks.map((b) => ({ start: timeToMinutes(b.start), end: timeToMinutes(b.end) })),
        ...dayClasses
      ];
      dayWork.forEach((w, idx) => {
        if (!w.start || !w.end) return;
        const base = { start: timeToMinutes(w.start), end: timeToMinutes(w.end) };
        const freeIntervals = subtractIntervals(base, subtracts);
        freeIntervals.forEach((iv, j) => {
          minMinutes = Math.min(minMinutes, iv.start);
          maxMinutes = Math.max(maxMinutes, iv.end);
          evts.push({
            id: `free-${dateStr}-${idx}-${j}`,
            title: 'Free',
            start: `${dateStr}T${minutesToTime(iv.start)}`,
            end: `${dateStr}T${minutesToTime(iv.end)}`,
            display: 'background',
            backgroundColor: COLORS.free(mode),
            extendedProps: { type: 'free' }
          });
        });
      });
    }

    // Determine min/max times with padding
    if (!Number.isFinite(minMinutes)) {
      minMinutes = 6 * 60; // default 06:00
    }
    minMinutes = Math.max(0, minMinutes - 30);
    maxMinutes = Math.min(24 * 60, Math.max(maxMinutes + 30, minMinutes + 60));

    const minTime = minutesToTime(minMinutes);
    const maxTime = maxMinutes >= 24 * 60 ? '24:00:00' : minutesToTime(maxMinutes);

    return { events: evts, minTime, maxTime };
  }, [teacherSchedule, startDate, endDate, theme.mode]);

  return (
    <Box>
      <CalendarButtonFix />
      {/* Legend */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Legend color={COLORS.break(theme.mode)} label={translations.breakHours || 'Break hours'} />
        <Legend color={COLORS.free(theme.mode)} label={translations.freeHours || 'Free hours'} />
        <Legend color={COLORS.classFg(theme.mode)} label={translations.classes || 'Classes'} />
        <Legend color={COLORS.holiday(theme.mode)} label={translations.holiday || 'Holiday/Off'} />
      </Stack>

      <Box sx={{
        height: '620px',
        '& .fc': {
          fontFamily: 'inherit',
          '--fc-border-color': theme.mode === 'light' ? '#e0e0e0' : '#424242',
          '--fc-page-bg-color': theme.mode === 'light' ? '#ffffff' : '#1e1e2d',
          '--fc-neutral-bg-color': theme.mode === 'light' ? '#f5f5f5' : '#2c2c3a',
          '--fc-today-bg-color': theme.mode === 'light' ? 'rgba(3, 169, 244, 0.1)' : 'rgba(3, 169, 244, 0.2)'
        },
        '& .fc-timegrid-slot': { height: '26px !important' },
        '& .fc-col-header-cell': { backgroundColor: theme.mode === 'light' ? '#f5f5f5' : '#2c2c3a' },
        // Foreground class event styling
        '& .fc-event.evt-class': {
          backgroundColor: `${COLORS.classFg(theme.mode)} !important`,
          borderColor: `${COLORS.classBorder(theme.mode)} !important`,
          color: '#ffffff !important',
          fontWeight: 600,
          borderRadius: '6px',
          boxShadow: theme.mode === 'light' ? '0 2px 6px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.35)'
        }
      }}>
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek' }}
          buttonText={{ today: translations.today || 'Today', week: translations.week || 'Week' }}
          locale={language === 'es' ? esLocale : undefined}
          slotMinTime={minTime || '06:00:00'}
          slotMaxTime={maxTime || '22:00:00'}
          allDaySlot={false}
          height="100%"
          events={events}
          nowIndicator
          timeZone={ADMIN_TIMEZONE}
          stickyHeaderDates
          slotDuration="00:30:00"
          slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: false }}
          navLinks={false}
          rerenderDelay={200}
          eventClassNames={(arg) => {
            if (arg.event.extendedProps?.type === 'class') return ['evt-class'];
            return [];
          }}
          eventDidMount={(arg) => {
            if (arg.event.extendedProps?.type === 'class') {
              const sName = arg.event.extendedProps.studentName || 'Student';
              const title = arg.event.extendedProps.title || 'Class';
              const startStr = moment(arg.event.start).format('HH:mm');
              const endStr = moment(arg.event.end).format('HH:mm');
              arg.el.title = `${title}\n${sName}\n${startStr} - ${endStr}`;
            }
          }}
          datesSet={(arg) => {
            if (typeof onRangeChange === 'function') {
              onRangeChange({ start: arg.start, end: arg.end });
            }
          }}
        />
      </Box>
    </Box>
  );
}

function Legend({ color, label }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ width: 14, height: 14, borderRadius: 0.5, backgroundColor: color, border: '1px solid rgba(0,0,0,0.15)' }} />
      <Typography variant="caption">{label}</Typography>
    </Stack>
  );
}

