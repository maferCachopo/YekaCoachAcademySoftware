'use client';
import { Box } from '@mui/material';
import Sidebar from '../Sidebar/Sidebar';
import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeTransition from '../ThemeTransition';

export default function Layout({ children, role = 'admin' }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [fullscreenContent, setFullscreenContent] = useState(false);

  // Ensure hydration is complete before rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for fullscreen state from children
  useEffect(() => {
    const handleFullscreenChange = (event) => {
      if (event.detail && typeof event.detail.fullscreen === 'boolean') {
        setFullscreenContent(event.detail.fullscreen);
      }
    };
    
    window.addEventListener('dashboard_fullscreen', handleFullscreenChange);
    
    return () => {
      window.removeEventListener('dashboard_fullscreen', handleFullscreenChange);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const sidebarWidth = sidebarOpen ? '240px' : '80px';

  return (
    <ThemeTransition 
      sx={{ 
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: theme?.background?.default || (theme?.mode === 'light' ? '#f5f5f5' : '#1a1f2b'),
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >
      <Sidebar 
        open={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
        role={role}
      />
      <ThemeTransition
        component="main"
        sx={{
          flexGrow: 1,
          position: 'absolute',
          top: 0,
          left: fullscreenContent ? 0 : sidebarWidth,
          right: 0,
          bottom: 0,
          height: '100vh',
          transition: 'left 0.3s ease, background-color 0.3s ease',
          overflow: 'auto',
          backgroundColor: theme?.background?.default || (theme?.mode === 'light' ? '#f5f5f5' : '#1a1f2b'),
          padding: 0,
          width: fullscreenContent ? '100vw' : `calc(100vw - ${sidebarWidth})`,
        }}
      >
        {children}
      </ThemeTransition>
    </ThemeTransition>
  );
}