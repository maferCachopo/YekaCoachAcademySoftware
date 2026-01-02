// Common style constants for consistent UI across the application

// Transition timing - matches the CSS variables in globals.css
export const COMMON_TRANSITION = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0ms';
export const COMMON_TRANSITION_DURATION = '0.3s';
export const COMMON_TRANSITION_TIMING = 'ease';

// Theme-specific colors
export const PRIMARY_COLOR = '#845EC2';
export const SECONDARY_COLOR = '#FF6F91';

// Add the ADMIN_TIMEZONE constant
export const ADMIN_TIMEZONE = 'America/Caracas';

// Export an object with all constants for easier imports
export default {
  COMMON_TRANSITION,
  COMMON_TRANSITION_DURATION,
  COMMON_TRANSITION_TIMING,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  ADMIN_TIMEZONE
}; 