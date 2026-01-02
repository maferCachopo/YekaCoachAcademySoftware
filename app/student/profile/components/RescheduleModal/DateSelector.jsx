'use client';

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '../../../../contexts/ThemeContext';
import moment from 'moment';

const DateSelector = ({ 
  availableDates, 
  selectedDate, 
  setSelectedDate, 
  translations, 
  loadingPackage 
}) => {
  const { theme } = useTheme();
  
  return (
    <>
      <Typography variant="h6" sx={{ 
        mt: 3, 
        mb: 2,
        fontWeight: 'bold',
        fontSize: { xs: '1rem', sm: '1.1rem' },
        color: '#845EC2'
      }}>
        {translations.selectNewDate || 'Select New Date'}:
      </Typography>
      <Box sx={{ 
        maxHeight: '300px', 
        overflow: 'auto',
        mb: 4,
        pr: 1,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: theme.mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.3)' : 'rgba(132, 94, 194, 0.5)',
          borderRadius: '10px',
          '&:hover': {
            backgroundColor: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.5)' : 'rgba(132, 94, 194, 0.7)',
          },
        },
      }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: 'repeat(auto-fill, minmax(100px, 1fr))', 
            sm: 'repeat(auto-fill, minmax(120px, 1fr))'
          }, 
          gap: 2, 
        }}>
          {loadingPackage ? (
            <Typography variant="body2" sx={{ color: theme.text?.secondary, py: 2, gridColumn: '1 / -1', textAlign: 'center' }}>
              {translations.loadingDates || 'Loading available dates...'}
            </Typography>
          ) : availableDates.length > 0 ? (
            availableDates.map((date) => (
              <Button
                key={date.format('YYYY-MM-DD')}
                variant={selectedDate?.isSame(date, 'day') ? "contained" : "outlined"}
                onClick={() => {
                  console.log("Date button clicked:", date.format('YYYY-MM-DD'));
                  setSelectedDate(date);
                  console.log("setSelectedDate called with:", date.format('YYYY-MM-DD'));
                }}
                sx={{ 
                  py: { xs: 1.5, sm: 2 },
                  borderColor: '#845EC2',
                  color: selectedDate?.isSame(date, 'day') ? 'white' : '#845EC2',
                  backgroundColor: selectedDate?.isSame(date, 'day') ? '#845EC2' : 'transparent',
                  '&:hover': {
                    backgroundColor: selectedDate?.isSame(date, 'day') 
                      ? '#845EC2' 
                      : theme.mode === 'light' ? 'rgba(132, 94, 194, 0.1)' : 'rgba(132, 94, 194, 0.2)',
                    borderColor: '#845EC2',
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  borderRadius: '10px',
                  transition: 'all 0.3s ease',
                  boxShadow: selectedDate?.isSame(date, 'day') ? '0 4px 12px rgba(132, 94, 194, 0.3)' : 'none',
                }}
              >
                <Typography variant="caption" sx={{ opacity: 0.8 }}>{date.format('ddd')}</Typography>
                <Typography sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}>{date.format('MMM D')}</Typography>
              </Button>
            ))
          ) : (
            <Typography variant="body2" sx={{ color: theme.text?.secondary, py: 2, gridColumn: '1 / -1', textAlign: 'center' }}>
              {translations.noAvailableDates || 'No dates available for rescheduling within your package period. Please try again later or contact support.'}
            </Typography>
          )}
        </Box>
      </Box>
    </>
  );
};

export default DateSelector;