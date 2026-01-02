'use client';
import { Box, CircularProgress, Typography, Button, Fade } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useState, useEffect } from 'react';

export default function Loading({ message, error, onRetry, onContinue, fullPage = true, showOverlay = true }) {
  const themeContext = useTheme();
  const theme = themeContext?.theme || {};
  const isDark = themeContext?.isDark || false;
  
  const languageContext = useLanguage();
  const translations = languageContext?.translations || {};
  const [loadingTime, setLoadingTime] = useState(0);
  
  // Initialize visible to true to avoid hydration mismatch
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // Track how long we've been loading
    if (!error) {
      const interval = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [error]);
  
  // Show server connection warning after 5 seconds of loading
  const showConnectionWarning = loadingTime > 5 && !error;
  
  const containerStyles = fullPage ? {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
    backgroundColor: showOverlay ? (isDark ? 'rgba(18, 18, 18, 0.9)' : 'rgba(245, 245, 245, 0.9)') : 'transparent',
    backdropFilter: 'blur(4px)'
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    minHeight: 200,
    backgroundColor: 'transparent'
  };
  
  return (
    <Box sx={containerStyles}>
      {error ? (
        // Error state
        <>
          <Box sx={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: theme?.palette?.error?.main || '#f44336',
            color: '#fff',
            fontSize: '2.5rem',
            fontWeight: 'bold',
            mb: 3
          }}>
            !
          </Box>
          
          <Typography 
            variant="h5" 
            sx={{ 
              color: isDark ? '#fff' : '#212B36',
              fontWeight: 600,
              textAlign: 'center',
              mb: 2,
              px: 2
            }}
          >
            {translations.serverError || 'Server Error'}
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
              textAlign: 'center',
              mb: 4,
              maxWidth: 500,
              px: 2
            }}
          >
            {error.message || translations.serverConnectionError || 'Unable to connect to the server. Please try again.'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {onRetry && (
              <Button 
                variant="contained"
                onClick={onRetry}
                sx={{
                  bgcolor: theme?.palette?.primary?.main || '#845EC2',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: theme?.palette?.primary?.dark || '#6A3FAE',
                  },
                }}
              >
                {translations.retry || 'Retry'}
              </Button>
            )}
            
            {onContinue && (
              <Button 
                variant="outlined"
                onClick={onContinue}
                sx={{
                  color: isDark ? '#fff' : '#212B36',
                  borderColor: theme?.palette?.warning?.main || '#ff9800',
                  '&:hover': {
                    bgcolor: 'rgba(255, 152, 0, 0.08)',
                  },
                }}
              >
                {translations.continueWithoutServer || 'Continue without server'}
              </Button>
            )}
          </Box>
        </>
      ) : (
        // Loading state
        <>
          <CircularProgress 
            size={fullPage ? 60 : 40} 
            thickness={4}
            sx={{ 
              color: theme?.palette?.primary?.main || '#845EC2',
              mb: 3
            }} 
          />
          
          <Typography 
            variant="h6" 
            sx={{ 
              color: isDark ? '#fff' : '#212B36',
              fontWeight: 500,
              textAlign: 'center',
              maxWidth: 400,
              px: 2
            }}
          >
            {typeof window !== 'undefined' ? (message || translations.loading || 'Loading...') : 'Initializing application...'}
          </Typography>
        </>
      )}
    </Box>
  );
} 