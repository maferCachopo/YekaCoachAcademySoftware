'use client';
import { Box } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

/**
 * A wrapper component that provides standardized transitions for theme changes
 * Use this component to wrap elements that should have smooth theme transitions
 */
export default function ThemeTransition({ children, component = Box, ...props }) {
  const { theme } = useTheme();
  const Component = component;

  return (
    <Component
      className="theme-transition"
      sx={{
        transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Component>
  );
} 