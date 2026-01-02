'use client';

import React from 'react';
import { Box, Typography, Button, Chip, Alert, CircularProgress } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import InfoIcon from '@mui/icons-material/Info';
import { Person as TeacherIcon } from '@mui/icons-material';

const TeacherSelector = ({
  assignedTeachers,
  availableTeachers,
  selectedTeacher,
  handleSelectTeacher,
  useAnotherTeacher,
  allowDifferentTeacher,
  handleToggleTeacherView,
  availableSlots,
  loadingAllTeachers,
  translations
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ 
        mt: 3, 
        mb: 2,
        fontWeight: 'bold',
        fontSize: { xs: '1rem', sm: '1.1rem' },
        color: '#845EC2'
      }}>
        {translations.selectTeacher || 'Select Teacher'}:
      </Typography>
      
      {/* Show the toggle button only if there are assigned teachers AND student is allowed different teachers */}
      {assignedTeachers && assignedTeachers.length > 0 && allowDifferentTeacher ? (
        <Button
          variant={useAnotherTeacher ? "contained" : "outlined"}
          onClick={handleToggleTeacherView}
          startIcon={useAnotherTeacher ? <CheckIcon /> : <TeacherIcon />}
          color={availableSlots.length === 0 ? "warning" : "primary"}
          sx={{ 
            backgroundColor: useAnotherTeacher ? '#FF9671' : 'transparent',
            borderColor: availableSlots.length === 0 ? '#FF9671' : '#845EC2',
            color: useAnotherTeacher ? '#fff' : (availableSlots.length === 0 ? '#FF9671' : '#845EC2'),
            '&:hover': {
              backgroundColor: useAnotherTeacher ? '#FF7F50' : (availableSlots.length === 0 ? 'rgba(255, 150, 113, 0.1)' : 'rgba(132, 94, 194, 0.1)'),
              borderColor: availableSlots.length === 0 ? '#FF9671' : '#845EC2'
            },
            mb: 2,
            animation: availableSlots.length === 0 ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%': {
                boxShadow: '0 0 0 0 rgba(255, 150, 113, 0.4)',
              },
              '70%': {
                boxShadow: '0 0 0 10px rgba(255, 150, 113, 0)',
              },
              '100%': {
                boxShadow: '0 0 0 0 rgba(255, 150, 113, 0)',
              },
            }
          }}
        >
          {useAnotherTeacher 
            ? (translations.showingAllTeachers || "Showing all teachers") 
            : (availableSlots.length === 0 
                ? (translations.noSlotsAvailableTryOtherTeachers || "No slots available - try other teachers") 
                : (translations.seeOtherTeachers || "See other teachers' schedules"))}
        </Button>
      ) : (
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontStyle: 'italic' }}>
          {translations.allTeachersShown || 'Showing all available teachers for the selected date'}
        </Typography>
      )}
      
      {/* Show restriction message if student is not allowed different teachers */}
      {assignedTeachers && assignedTeachers.length > 0 && !allowDifferentTeacher && (
        <Alert 
          severity="info" 
          icon={<InfoIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            {translations.restrictedToAssignedTeachers || 'You can only reschedule with your assigned teachers.'}
          </Typography>
        </Alert>
      )}

      {/* Show assigned teachers section if useAnotherTeacher is false and there are assigned teachers */}
      {!useAnotherTeacher && assignedTeachers && assignedTeachers.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#845EC2' }}>
            {translations.yourTeachers || 'Your Teachers:'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {assignedTeachers.map((teacher) => (
              <Button
                key={teacher?.id || 'default'}
                variant={selectedTeacher?.id === teacher?.id ? "contained" : "outlined"}
                size="small"
                onClick={() => handleSelectTeacher(teacher)}
                startIcon={<TeacherIcon />}
                endIcon={teacher?.slotsCount ? 
                  <Chip 
                    size="small" 
                    label={teacher.slotsCount || 0}
                    sx={{ 
                      height: 18, 
                      fontSize: '0.7rem',
                      bgcolor: selectedTeacher?.id === teacher?.id ? 'rgba(255,255,255,0.3)' : 'rgba(132, 94, 194, 0.2)',
                      color: selectedTeacher?.id === teacher?.id ? '#fff' : '#845EC2',
                      fontWeight: 'bold',
                    }}
                  /> : null
                }
                disabled={!teacher || teacher.slotsCount === 0}
                sx={{
                  backgroundColor: selectedTeacher?.id === teacher?.id ? '#845EC2' : 'transparent',
                  borderColor: '#845EC2',
                  color: selectedTeacher?.id === teacher?.id ? '#fff' : '#845EC2',
                  '&:hover': {
                    backgroundColor: selectedTeacher?.id === teacher?.id ? '#6A4B9D' : 'rgba(132, 94, 194, 0.1)',
                    borderColor: '#845EC2'
                  },
                }}
              >
                {teacher ? `${teacher.firstName || ''} ${teacher.lastName || ''}` : 'Teacher'}
              </Button>
            ))}
          </Box>
          
          {/* Always show other teachers section when useAnotherTeacher is true */}
          <Box sx={{ mt: assignedTeachers?.length > 0 ? 3 : 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#FF9671' }}>
              {translations.otherAvailableTeachers || (assignedTeachers?.length > 0 ? 'Other Available Teachers:' : 'Available Teachers:')}
            </Typography>
            
            {availableTeachers && availableTeachers.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableTeachers.map((teacher) => (
                  <Button
                    key={teacher?.id || `teacher-${Math.random()}`}
                    variant={selectedTeacher?.id === teacher?.id ? "contained" : "outlined"}
                    size="small"
                    onClick={() => handleSelectTeacher(teacher)}
                    startIcon={<TeacherIcon />}
                    endIcon={teacher?.slotsCount ? 
                      <Chip 
                        size="small" 
                        label={teacher.slotsCount || 0}
                        sx={{ 
                          height: 18, 
                          fontSize: '0.7rem',
                          bgcolor: selectedTeacher?.id === teacher?.id ? 'rgba(255,255,255,0.3)' : 'rgba(255, 150, 113, 0.2)',
                          color: selectedTeacher?.id === teacher?.id ? '#fff' : '#FF9671',
                          fontWeight: 'bold',
                        }}
                      /> : null
                    }
                    disabled={!teacher || teacher.slotsCount === 0}
                    sx={{
                      backgroundColor: selectedTeacher?.id === teacher?.id ? '#FF9671' : 'transparent',
                      borderColor: '#FF9671',
                      color: selectedTeacher?.id === teacher?.id ? '#fff' : '#FF9671',
                      '&:hover': {
                        backgroundColor: selectedTeacher?.id === teacher?.id ? '#FF7F50' : 'rgba(255, 150, 113, 0.1)',
                        borderColor: '#FF9671'
                      },
                    }}
                  >
                    {teacher ? `${teacher.firstName || ''} ${teacher.lastName || ''}` : 'Teacher'}
                  </Button>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                {translations.noOtherTeachers || 'No other teachers available for this date.'}
              </Typography>
            )}
          </Box>
          
          {loadingAllTeachers && (
            <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
              <CircularProgress size={20} sx={{ mr: 1, color: '#FF9671' }} />
              <Typography variant="body2">
                {translations.loadingTeachers || 'Loading available teachers...'}
              </Typography>
            </Box>
          )}
        </Box>
      )}
      
      {/* Always show if using another teacher OR if there are no assigned teachers */}
      {(useAnotherTeacher || !assignedTeachers || assignedTeachers.length === 0) && (
        <Alert 
          severity="info" 
          icon={<InfoIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            {translations.differentTeacherInfo || (
              assignedTeachers && assignedTeachers.length > 0 
                ? "You can choose to reschedule your class with a different teacher if your assigned teacher's schedule doesn't work for you."
                : "Select an available teacher for your rescheduled class."
            )}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default TeacherSelector;