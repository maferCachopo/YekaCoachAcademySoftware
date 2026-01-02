'use client';

import { useEffect } from 'react';

/**
 * Component that adds a style tag to override the global CSS rule
 * that hides elements with "next" in their class names.
 * This specifically fixes FullCalendar navigation buttons.
 */
const CalendarButtonFix = () => {
  useEffect(() => {
    // Create a style element
    const styleEl = document.createElement('style');
    
    // Add CSS rule to override the global CSS that hides next/prev buttons
    styleEl.innerHTML = `
      /* Override the global CSS rule that hides next buttons */
      .fc-prev-button, 
      .fc-next-button, 
      .fc-today-button {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    `;
    
    // Append the style element to the document head
    document.head.appendChild(styleEl);
    
    // Clean up on unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default CalendarButtonFix;