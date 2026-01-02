'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from '../theme';


const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'yekacoachacademy_theme_mode';

export function ThemeProvider({ children }) {
  // Initialize with light theme as default instead of empty string
  const [mode, setMode] = useState('light');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // On initial load, check localStorage for theme preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedMode = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
          setMode(savedMode);
        } else {
          // Check system preference
          const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const initialMode = prefersDarkMode ? 'dark' : 'light';
          setMode(initialMode);
          localStorage.setItem(THEME_STORAGE_KEY, initialMode);
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
        // Fallback to light mode
        setMode('light');
      } finally {
        setIsInitialized(true);
      }
    }
  }, []);
  
  // Update localStorage when theme changes (but only after initialization)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized && mode) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch (error) {
        console.error('Error saving theme to localStorage:', error);
      }
    }
  }, [mode, isInitialized]);

  const currentTheme = mode === 'light' ? lightTheme : darkTheme;
  
  // Create a combined theme object that includes MUI theme + our custom properties
  const theme = {
    ...currentTheme,
    mode: mode,
    isDark: mode === 'dark',
    text: currentTheme.text,
    card: currentTheme.card,
    sidebar: currentTheme.sidebar,
    background: currentTheme.palette.background
  };
  
  const toggleTheme = () => {
    setMode(prevMode => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, newMode);
        } catch (error) {
          console.error('Error saving theme to localStorage:', error);
        }
      }
      return newMode;
    });
  };
  
  // Don't return null during initialization - always render with a default theme
  // to prevent the blank screen issue
  
  return (
    <ThemeContext.Provider value={{ theme, mode, isDark: mode === 'dark', toggleTheme }}>
      <MuiThemeProvider theme={currentTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext); 