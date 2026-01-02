'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import { FormTextField } from './';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotify } from '../../contexts/NotificationContext';

/**
 * A reusable Change Password dialog component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {function} props.onClose - Function to call when dialog is closed
 */
export default function ChangePasswordForm({ open, onClose }) {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const { changePassword, loading } = useAuth();
  const notify = useNotify();
  
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const { control, handleSubmit, reset, watch, formState: { errors, isValid } } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    mode: 'onChange'
  });
  
  // Watch the new password field to compare with confirm password
  const newPassword = watch('newPassword');
  
  const onSubmit = async (data) => {
    setError('');
    setSuccess(false);
    
    if (data.newPassword !== data.confirmPassword) {
      setError(translations.passwordsDoNotMatch || 'Passwords do not match');
      return;
    }
    
    try {
      const result = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      
      if (result.success) {
        setSuccess(true);
        // Reset the form
        reset();
        
        // Close dialog after successful password change (after 2 seconds)
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(result.error || translations.changePasswordFailed || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error.message || translations.changePasswordFailed || 'Failed to change password');
    }
  };
  
  const handleClose = () => {
    // Reset form and states
    reset();
    setError('');
    setSuccess(false);
    onClose();
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : handleClose}
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: '100%',
          maxWidth: 500,
          background: theme.mode === 'light' ? '#ffffff' : theme?.card?.background,
          backdropFilter: 'blur(10px)',
          border: theme?.card?.border,
          color: theme.mode === 'light' ? '#000000' : theme?.text?.primary,
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 2,
        borderBottom: `1px solid ${theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`,
        color: theme.mode === 'light' ? '#000000' : theme?.text?.primary,
        fontSize: '1.5rem',
        fontWeight: 600,
      }}>
        {translations.changePassword || 'Change Password'}
      </DialogTitle>
      
      <DialogContent sx={{ 
        p: 3, 
        pt: 3,
        backgroundColor: theme.mode === 'light' ? '#ffffff' : theme?.card?.background,
      }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
          >
            {translations.passwordChangeSuccess || 'Password changed successfully!'}
          </Alert>
        )}
        
        <Box 
          component="form" 
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <FormTextField 
            control={control}
            name="currentPassword"
            label={translations.currentPassword || 'Current Password'}
            type="password"
            required
            rules={{
              required: translations.currentPasswordRequired || 'Current password is required'
            }}
            fullWidth
            variant="outlined"
            disabled={loading || success}
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
          
          <FormTextField 
            control={control}
            name="newPassword"
            label={translations.newPassword || 'New Password'}
            type="password"
            required
            rules={{
              required: translations.newPasswordRequired || 'New password is required',
              minLength: {
                value: 8,
                message: translations.passwordMinLength || 'Password must be at least 8 characters'
              }
            }}
            fullWidth
            variant="outlined"
            disabled={loading || success}
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
          
          <FormTextField 
            control={control}
            name="confirmPassword"
            label={translations.confirmPassword || 'Confirm Password'}
            type="password"
            required
            rules={{
              required: translations.confirmPasswordRequired || 'Please confirm your password',
              validate: value => 
                value === newPassword || (translations.passwordsDoNotMatch || 'Passwords do not match')
            }}
            fullWidth
            variant="outlined"
            disabled={loading || success}
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
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3,
        borderTop: `1px solid ${theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`,
        gap: 2,
        backgroundColor: theme.mode === 'light' ? '#ffffff' : theme?.card?.background,
      }}>
        <Button 
          onClick={handleClose}
          variant="outlined"
          disabled={loading}
          sx={{
            color: theme.mode === 'light' ? '#000000' : theme?.text?.primary,
            borderColor: 'rgba(132, 94, 194, 0.5)',
            '&:hover': {
              borderColor: '#845EC2',
              backgroundColor: 'rgba(132, 94, 194, 0.08)',
            },
          }}
        >
          {translations.cancel || 'Cancel'}
        </Button>
        
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={loading || success || !isValid}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{
            background: '#845EC2',
            color: '#fff',
            '&:hover': {
              background: '#6B46C1',
            },
            '&.Mui-disabled': {
              background: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
              color: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
            }
          }}
        >
          {loading ? (translations.saving || 'Saving...') : (translations.save || 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 