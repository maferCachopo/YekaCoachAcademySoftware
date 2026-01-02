'use client';
import { IconButton, Box, Tooltip, Badge } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const { isDark, toggleTheme, mode } = useTheme();
  const [storedTheme, setStoredTheme] = useState(null);
  const [isFirstRender, setIsFirstRender] = useState(true);

  // Check localStorage to see if theme is being stored properly
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const localTheme = localStorage.getItem('yekacoachacademy_theme_mode');
        setStoredTheme(localTheme);
        
        // Log theme state for debugging
        console.log(`Theme Toggle - Current mode: ${mode}, localStorage: ${localTheme}`);
        
        if (localTheme !== mode && !isFirstRender) {
          console.warn(`Theme mismatch - context: ${mode}, localStorage: ${localTheme}`);
          // Attempt to fix by writing current theme to localStorage
          localStorage.setItem('yekacoachacademy_theme_mode', mode);
        }
        
        setIsFirstRender(false);
      } catch (error) {
        console.error('Error reading theme from localStorage:', error);
      }
    }
  }, [mode, isFirstRender]);

  // Enhanced toggle function with localStorage verification
  const handleToggleTheme = () => {
    toggleTheme();
    
    // Verify the toggle worked in localStorage after a short delay
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        try {
          const localTheme = localStorage.getItem('yekacoachacademy_theme_mode');
          setStoredTheme(localTheme);
          
          // After toggle, localStorage should have the opposite of isDark
          const expectedTheme = isDark ? 'light' : 'dark';
          if (localTheme !== expectedTheme) {
            console.warn(`Theme not saved correctly after toggle. Expected: ${expectedTheme}, Got: ${localTheme}`);
            // Force correction
            localStorage.setItem('yekacoachacademy_theme_mode', expectedTheme);
          }
        } catch (error) {
          console.error('Error verifying theme toggle in localStorage:', error);
        }
      }
    }, 100);
  };

  // Determine if there's an issue with theme persistence
  const hasThemeMismatch = storedTheme !== null && storedTheme !== mode;

  return (
    <Tooltip 
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      placement="bottom"
      arrow
    >
      <Badge
        variant="dot"
        color={hasThemeMismatch ? "error" : "success"}
        overlap="circular"
        invisible={!hasThemeMismatch}
      >
        <IconButton
          onClick={handleToggleTheme}
          sx={{
            color: isDark ? 'white' : '#2D3748',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          {isDark ? <LightMode /> : <DarkMode />}
        </IconButton>
      </Badge>
    </Tooltip>
  );
} 