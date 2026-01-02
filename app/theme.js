'use client';
import { createTheme } from '@mui/material/styles';

// Common settings for both themes
const commonSettings = {
  typography: {
    fontFamily: 'Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: 'transparent',
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: 'rgba(128, 128, 128, 0.4)',
            minHeight: 24,
          },
          '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
            backgroundColor: 'rgba(128, 128, 128, 0.6)',
          },
          '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
            backgroundColor: 'rgba(128, 128, 128, 0.6)',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(128, 128, 128, 0.6)',
          },
          '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: 'none',
          ':hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          ':hover': {
            boxShadow: 'none',
          },
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '10px 20px',
          fontSize: '0.9375rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          ':first-of-type': {
            borderRadius: '8px 8px 0 0',
          },
          ':last-of-type': {
            borderRadius: '0 0 8px 8px',
          },
          '&:before': {
            display: 'none',
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          overflow: 'hidden',
        },
      },
    },
  },
};

// Light theme
const lightTheme = createTheme({
  ...commonSettings,
  palette: {
    mode: 'light',
    primary: {
      main: '#845EC2',
      dark: '#6B46C1',
      light: '#A084DC',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF6F91',
      dark: '#E94976',
      light: '#FF8DA9',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#F44336',
      dark: '#D32F2F',
      light: '#E57373',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FFA726',
      dark: '#F57C00',
      light: '#FFB74D',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    info: {
      main: '#29B6F6',
      dark: '#0288D1',
      light: '#4FC3F7',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    success: {
      main: '#66BB6A',
      dark: '#388E3C',
      light: '#81C784',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    background: {
      default: '#F8F9FC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827', // Darker primary text for better contrast
      secondary: '#4B5563', // Darker secondary text
      disabled: 'rgba(0, 0, 0, 0.48)', // Improved disabled text contrast
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    action: {
      active: 'rgba(0, 0, 0, 0.64)', // Increased contrast for active actions
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(132, 94, 194, 0.12)', // Increased contrast for selected state
      disabled: 'rgba(0, 0, 0, 0.36)', // Improved disabled state contrast
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid rgba(0, 0, 0, 0.08)',
  },
  sidebar: {
    background: '#FFFFFF',
    hoverBg: 'rgba(0, 0, 0, 0.04)',
    activeBg: 'rgba(132, 94, 194, 0.12)', // Slightly increased for better visibility
    activeText: '#6B46C1', // Explicitly set active text color for better contrast
  },
  text: {
    primary: '#111827', // Darker primary text for better contrast
    secondary: '#4B5563', // Darker secondary text
    disabled: 'rgba(0, 0, 0, 0.48)', // Improved disabled text contrast
  },
  components: {
    ...commonSettings.components,
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: '#111827', // Ensure table headers have good contrast
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        h4: {
          color: '#111827', // Ensure headings have good contrast
          fontWeight: 600,
        },
      },
    },
  },
});

// Dark theme
const darkTheme = createTheme({
  ...commonSettings,
  palette: {
    mode: 'dark',
    primary: {
      main: '#845EC2',
      dark: '#6B46C1',
      light: '#A084DC',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF6F91',
      dark: '#E94976',
      light: '#FF8DA9',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#FF5252',
      dark: '#D50000',
      light: '#FF8A80',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FFD740',
      dark: '#FFC400',
      light: '#FFE57F',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    info: {
      main: '#40C4FF',
      dark: '#00B0FF',
      light: '#80D8FF',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    success: {
      main: '#69F0AE',
      dark: '#00E676',
      light: '#B9F6CA',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    background: {
      default: '#1A1F2B',
      paper: '#1f2937',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      active: 'rgba(255, 255, 255, 0.7)',
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.3)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
    },
  },
  card: {
    background: '#1f2937',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  sidebar: {
    background: '#1A1D29',
    hoverBg: 'rgba(255, 255, 255, 0.1)',
    activeBg: 'rgba(255, 255, 255, 0.2)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    disabled: 'rgba(255, 255, 255, 0.5)',
  },
});

export { lightTheme, darkTheme }; 