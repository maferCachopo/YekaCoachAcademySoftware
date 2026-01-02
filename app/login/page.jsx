'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Button,
  Typography,
  Card,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { 
  Login as LoginIcon,
  MusicNote,
  ArrowBack as ArrowBackIcon,
  School
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { FormTextField } from '../components/Form';
import Image from 'next/image';

export default function LoginPage() {
  const { theme } = useTheme();
  const { translations, toggleLanguage, language } = useLanguage();
  const { login, loading: authLoading, error: authError } = useAuth();
  const notify = useNotify();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Set up react-hook-form
  const { control, handleSubmit, formState: { errors, isDirty, isValid }, reset } = useForm({
    defaultValues: {
      username: '',
      password: ''
    },
    mode: 'onChange'
  });

  // Get redirect URL from query parameters
  const redirectUrl = searchParams.get('redirect');

  const onSubmit = useCallback(async (data) => {
    setError('');
    setLoading(true);
    
    try {
      const result = await login(data, rememberMe, 'student');
      console.log('DEBUG - Login page - Login result:', result);
      
      if (!result.success) {
        // Check if this is a wrong portal error - show generic message for security
        if (result.code === 'WRONG_PORTAL') {
          const errorMessage = translations.loginFailed || 'Invalid credentials. Please check your username and password.';
          setError(errorMessage);
          notify.error(errorMessage);
        } else if (result.error && (
          result.error.includes('account has been deactivated') || 
          result.error.includes('cuenta ha sido desactivada')
        )) {
          setError(result.error || translations.accountInactive || 'Your account has been deactivated by the administrator.');
          notify.error(result.error || translations.accountInactive || 'Your account has been deactivated by the administrator.');
        } else {
          setError(result.error || 'Login failed. Please try again.');
          notify.error(result.error || translations.loginFailed || 'Login failed. Please try again.');
        }
        // Ensure the form doesn't reset when there's an error
        return false;
      } else {
        // Show success notification
        notify.success(translations.loginSuccess || 'Login successful');
        
        // Only redirect on success
        if (redirectUrl) {
          router.push(redirectUrl);
        }
        // Otherwise the AuthContext will handle redirection based on role
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'An unexpected error occurred');
      notify.error(error.message || translations.unexpectedError || 'An unexpected error occurred');
      // Ensure the form doesn't reset when there's an error
      return false;
    } finally {
      setLoading(false);
    }
  }, [login, rememberMe, notify, translations, redirectUrl, router]);

  // When auth error changes, update our local error state
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // Handle form submission with explicit prevention of default behavior
  const handleFormSubmit = useCallback((e) => {
    // Make sure to prevent default form submission behavior 
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Additional prevention
    }
    
    // Use the react-hook-form handleSubmit properly
    return handleSubmit(data => {
      // Call onSubmit and catch any errors to prevent page refresh
      return onSubmit(data).catch(err => {
        console.error('Form submission error:', err);
        return false;
      });
    })(e);
  }, [handleSubmit, onSubmit]);

  // Navigate back to landing page
  const handleBackToLanding = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    router.push('/');
  }, [router]);

  // Use auth context error if available
  const displayError = error || authError;
  // Combine loading states
  const isLoading = loading || authLoading;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme?.palette?.primary?.main || '#845EC2'} 0%, ${theme?.palette?.secondary?.main || '#D65DB1'} 100%)`,
        px: 2
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: '100%',
          borderRadius: 4,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          background: theme?.card?.background || 'white',
          backdropFilter: 'blur(10px)',
          border: theme?.card?.border || 'none',
          transition: 'all 0.3s ease'
        }}
      >
        <Box
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme?.palette?.primary?.main || '#845EC2'} 0%, ${theme?.palette?.secondary?.main || '#D65DB1'} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3
            }}
          >
            <MusicNote sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: theme?.text?.primary || 'inherit',
              textAlign: 'center'
            }}
          >
            YekaCoach Academy
          </Typography>
          
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              color: theme?.text?.secondary || 'grey',
              textAlign: 'center',
              mb: 2
            }}
          >
            {language === 'en' ? 'Student Portal' : 'Portal de Estudiantes'}
          </Typography>
          
          <Box 
            onClick={toggleLanguage} 
            sx={{ 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              mb: 3
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme?.text?.secondary || 'grey',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              {language === 'en' ? 'English' : 'Español'}
            </Typography>
          </Box>
          
          {displayError && (
            <Alert 
              severity="error" 
              sx={{ 
                width: '100%', 
                mb: 3,
                '.MuiAlert-message': {
                  color: '#5F2120'
                }
              }}
            >
              {displayError}
            </Alert>
          )}
          
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFormSubmit(e);
              return false;
            }}
            noValidate
            sx={{
              width: '100%'
            }}
          >
            <FormTextField
              control={control}
              name="username"
              label={translations.username || "Username"}
              required
              rules={{
                required: translations.usernameRequired || "Username is required"
              }}
              fullWidth
              variant="outlined"
              disabled={isLoading}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'transparent',
                  '& fieldset': {
                    borderColor: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
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
                  color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: '#845EC2',
                  },
                },
                '& .MuiInputBase-input': {
                  color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#fff',
                },
              }}
            />
            
            <FormTextField
              control={control}
              name="password"
              label={translations.password || "Password"}
              type="password"
              required
              rules={{
                required: translations.passwordRequired || "Password is required"
              }}
              fullWidth
              variant="outlined"
              disabled={isLoading}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'transparent',
                  '& fieldset': {
                    borderColor: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
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
                  color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: '#845EC2',
                  },
                },
                '& .MuiInputBase-input': {
                  color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#fff',
                },
              }}
            />
            
            <FormControlLabel
              control={
                <Checkbox 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  sx={{
                    color: '#845EC2',
                    '&.Mui-checked': {
                      color: '#845EC2',
                    },
                  }}
                />
              }
              label={
                <Typography 
                  variant="body2" 
                  sx={{ color: theme?.text?.secondary || 'grey' }}
                >
                  {translations.rememberMe || "Remember me"}
                </Typography>
              }
              sx={{ mb: 2 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
              disabled={isLoading || !isDirty || !isValid}
              sx={{
                mt: 1,
                mb: 2,
                py: 1.5,
                background: '#845EC2',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: '#6B46C1',
                },
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              {isLoading 
                ? (translations.loggingIn || "Logging in...") 
                : (translations.login || "Login")}
            </Button>
            
            <Button
              onClick={handleBackToLanding}
              fullWidth
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              sx={{
                py: 1.5,
                borderColor: 'rgba(132, 94, 194, 0.5)',
                color: theme?.text?.primary || 'rgba(0, 0, 0, 0.87)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#845EC2',
                  backgroundColor: 'rgba(132, 94, 194, 0.08)',
                },
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
              }}
            >
              {translations.backToHome || "Back to Home"}
            </Button>
            
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                color: theme?.text?.secondary || 'grey',
                fontSize: '0.875rem',
                mt: 2
              }}
            >
              <School sx={{ fontSize: 16 }} />
              <Typography variant="body2">
                {language === 'en' 
                  ? 'For Students Only' 
                  : 'Solo para Estudiantes'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
} 