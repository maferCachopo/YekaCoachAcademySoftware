'use client';
import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography,
  Button, 
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { COMMON_TRANSITION } from '../../../constants/styleConstants';

const ChangePasswordDialog = ({ 
  open, 
  onClose, 
  passwordData, 
  setPasswordData, 
  onSave, 
  passwordError, 
  passwordSuccess, 
  authLoading, 
  authError 
}) => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || { mode: 'light' }; // Add fallback
  const { translations } = useLanguage();

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => {
        if (!authLoading) {
          onClose();
        }
      }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: '100%',
          maxWidth: 500,
          background: theme.mode === 'light' ? '#ffffff' : theme?.card?.background,
          backdropFilter: 'blur(10px)',
          border: theme?.card?.border,
          color: theme.mode === 'light' ? '#000000' : theme?.text?.primary,
          transition: COMMON_TRANSITION
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 2,
        borderBottom: `1px solid ${theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`,
        color: theme.mode === 'light' ? '#000000' : theme?.text?.primary,
        fontSize: '1.5rem',
        fontWeight: 600,
        transition: COMMON_TRANSITION
      }}>
        {translations.changePassword || 'Change Password'}
      </DialogTitle>
      <DialogContent sx={{ 
        p: 3, 
        pt: 3,
        backgroundColor: theme.mode === 'light' ? '#ffffff' : theme?.card?.background,
        transition: COMMON_TRANSITION
      }}>
        {passwordError && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
          >
            {passwordError}
          </Alert>
        )}
        
        {passwordSuccess && (
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
          >
            {translations.passwordChangeSuccess || 'Password changed successfully!'}
          </Alert>
        )}
        
        {authError && !passwordError && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
          >
            {authError}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField 
            label={translations.currentPassword || 'Current Password'}
            name="currentPassword"
            type="password"
            value={passwordData.currentPassword}
            onChange={handlePasswordChange}
            fullWidth
            variant="outlined"
            disabled={authLoading || passwordSuccess}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                '& fieldset': {
                  borderColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.42)' : 'rgba(255, 255, 255, 0.23)',
                  borderWidth: '1px',
                },
                '&:hover fieldset': {
                  borderColor: '#845EC2',
                  borderWidth: '1px',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#845EC2',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                '&.Mui-focused': {
                  color: '#845EC2',
                },
              },
              '& .MuiInputBase-input': {
                color: theme.mode === 'light' ? '#000000' : '#ffffff',
              },
              mb: 2,
            }}
          />
          
          <TextField 
            label={translations.newPassword || 'New Password'}
            name="newPassword"
            type="password"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            fullWidth
            variant="outlined"
            disabled={authLoading || passwordSuccess}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                '& fieldset': {
                  borderColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.42)' : 'rgba(255, 255, 255, 0.23)',
                  borderWidth: '1px',
                },
                '&:hover fieldset': {
                  borderColor: '#845EC2',
                  borderWidth: '1px',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#845EC2',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                '&.Mui-focused': {
                  color: '#845EC2',
                },
              },
              '& .MuiInputBase-input': {
                color: theme.mode === 'light' ? '#000000' : '#ffffff',
              },
              mb: 2,
            }}
          />
          
          <TextField 
            label={translations.confirmPassword || 'Confirm Password'}
            name="confirmPassword"
            type="password"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            fullWidth
            variant="outlined"
            disabled={authLoading || passwordSuccess}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                '& fieldset': {
                  borderColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.42)' : 'rgba(255, 255, 255, 0.23)',
                  borderWidth: '1px',
                },
                '&:hover fieldset': {
                  borderColor: '#845EC2',
                  borderWidth: '1px',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#845EC2',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                '&.Mui-focused': {
                  color: '#845EC2',
                },
              },
              '& .MuiInputBase-input': {
                color: theme.mode === 'light' ? '#000000' : '#ffffff',
              },
              mb: 2,
            }}
            error={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== ''}
            helperText={
              passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== '' 
                ? (translations.passwordsDoNotMatch || 'Passwords do not match') 
                : ''
            }
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ 
        p: 3,
        borderTop: `1px solid ${theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`,
        gap: 2,
        backgroundColor: theme.mode === 'light' ? '#ffffff' : theme?.card?.background,
        transition: COMMON_TRANSITION
      }}>
        <Button 
          onClick={() => {
            if (!authLoading) {
              onClose();
            }
          }}
          variant="outlined"
          disabled={authLoading}
          sx={{
            color: theme.mode === 'light' ? '#000000' : theme?.text?.primary,
            borderColor: 'rgba(132, 94, 194, 0.5)',
            '&:hover': {
              borderColor: '#845EC2',
              backgroundColor: 'rgba(132, 94, 194, 0.08)',
            },
            transition: COMMON_TRANSITION,
          }}
        >
          {translations.cancel || 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={
            authLoading ||
            passwordSuccess ||
            !passwordData.currentPassword || 
            !passwordData.newPassword || 
            !passwordData.confirmPassword ||
            passwordData.newPassword !== passwordData.confirmPassword
          }
          startIcon={authLoading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{
            background: '#845EC2',
            color: '#fff',
            '&:hover': {
              background: '#6B46C1',
            },
            '&.Mui-disabled': {
              background: theme.mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
              color: theme.mode === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
            },
            transition: COMMON_TRANSITION,
          }}
        >
          {authLoading ? (translations.saving || 'Saving...') : (translations.save || 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog; 