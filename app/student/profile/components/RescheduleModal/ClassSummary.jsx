'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { Event as EventIcon, AccessTime } from '@mui/icons-material';
import { Person as TeacherIcon } from '@mui/icons-material';

const ClassSummary = ({ 
  selectedTeacher, 
  getFormattedEventDate, 
  getFormattedDuration, 
  translations,
  theme 
}) => {
  return (
    <>
      <Box sx={{ 
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 1,
        fontSize: { xs: '0.9rem', sm: '1rem' },
        mb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon sx={{ color: '#FF6F91', fontSize: { xs: 18, sm: 20 } }} />
          <Typography component="span" variant="body1"><strong>{translations.currentClass || 'Current class'}:</strong></Typography>
        </Box>
        <Typography component="span" variant="body1" sx={{ color: theme.text?.secondary }}>
          {getFormattedEventDate()}
        </Typography>
      </Box>

      <Box sx={{ 
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 1,
        mb: 3,
        fontSize: { xs: '0.9rem', sm: '1rem' }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime sx={{ color: '#845EC2', fontSize: { xs: 18, sm: 20 } }} />
          <Typography component="span" variant="body1"><strong>{translations.classDuration || 'Class Duration'}:</strong></Typography>
        </Box>
        <Typography component="span" variant="body1" sx={{ color: theme.text?.secondary }}>
          {getFormattedDuration()}
        </Typography>
      </Box>

      {/* Teacher Information */}
      {selectedTeacher && (
        <Box sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1,
          mb: 3,
          fontSize: { xs: '0.9rem', sm: '1rem' }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TeacherIcon sx={{ color: '#FF9671', fontSize: { xs: 18, sm: 20 } }} />
            <Typography component="span" variant="body1"><strong>{translations.yourTeacher || 'Your Teacher'}:</strong></Typography>
          </Box>
          <Typography component="span" variant="body1" sx={{ color: theme.text?.secondary }}>
            {`${selectedTeacher.firstName} ${selectedTeacher.lastName}`}
          </Typography>
        </Box>
      )}
    </>
  );
};

export default ClassSummary;