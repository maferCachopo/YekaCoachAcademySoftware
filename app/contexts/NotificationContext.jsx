'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { SnackbarProvider, useSnackbar } from 'notistack';
import { useTheme } from './ThemeContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const themeContext = useTheme();
  const theme = themeContext?.theme;
  
  const notify = {
    success: (message, options = {}) => {
      return enqueueSnackbar(message, {
        variant: 'success',
        autoHideDuration: 4000,
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        ...options,
      });
    },
    
    error: (message, options = {}) => {
      return enqueueSnackbar(message, {
        variant: 'error',
        autoHideDuration: 5000,
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        ...options,
      });
    },
    
    warning: (message, options = {}) => {
      return enqueueSnackbar(message, {
        variant: 'warning',
        autoHideDuration: 4500,
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        ...options,
      });
    },
    
    info: (message, options = {}) => {
      return enqueueSnackbar(message, {
        variant: 'info',
        autoHideDuration: 4000,
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        ...options,
      });
    },
    
    default: (message, options = {}) => {
      return enqueueSnackbar(message, {
        variant: 'default',
        autoHideDuration: 3000,
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        ...options,
      });
    },
    
    closeAll: () => {
      closeSnackbar();
    },
    
    close: (key) => {
      closeSnackbar(key);
    }
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
    </NotificationContext.Provider>
  );
}

// Wrapper component that includes both the context provider and notistack provider
export function NotificationProviderWrapper({ children }) {
  const themeContext = useTheme();
  const theme = themeContext?.theme;
  const [isMounted, setIsMounted] = useState(false);

  // Wait until component is mounted to render on the client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render anything during SSR
  if (!isMounted && typeof window === 'undefined') {
    return <>{children}</>;
  }

  return (
    <SnackbarProvider
      maxSnack={5}
      dense={false}
      preventDuplicate
      autoHideDuration={4000}
      style={{
        fontSize: '0.9rem',
        fontWeight: 500,
      }}
      // Ensure notifications appear above modals (MUI Dialog z-index is 1300)
      sx={{
        '& .notistack-SnackbarContainer': {
          zIndex: 9999,
        },
        '& .SnackbarItem-root': {
          zIndex: 9999,
        }
      }}
    >
      <NotificationProvider>{children}</NotificationProvider>
    </SnackbarProvider>
  );
}

export const useNotify = () => {
  const context = useContext(NotificationContext);
  
  // Provide a safe fallback if context is not available
  if (!context) {
    return {
      success: (msg) => console.log('Success notification (fallback):', msg),
      error: (msg) => console.error('Error notification (fallback):', msg),
      warning: (msg) => console.warn('Warning notification (fallback):', msg),
      info: (msg) => console.log('Info notification (fallback):', msg),
      default: (msg) => console.log('Default notification (fallback):', msg),
      closeAll: () => {},
      close: () => {}
    };
  }
  
  return context;
}; 