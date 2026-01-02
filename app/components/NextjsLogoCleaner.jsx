'use client';
import { useEffect } from 'react';

/**
 * This component uses client-side JavaScript to find and remove
 * any Next.js logos or badges that might be injected into the DOM
 * at runtime.
 */
const NextjsLogoCleaner = () => {
  useEffect(() => {
    // Function to remove Next.js badges/logos
    const removeNextjsBadges = () => {
      // List of selectors that might match Next.js badges
      const selectors = [
        '#__next-build-watcher',
        '[data-nextjs-dialog-overlay]',
        '[data-nextjs-dialog]',
        '[data-nextjs-toast]',
        '.nextjs-container',
        // Look for elements positioned in bottom corners
        // (where Next.js typically adds its badge)
        'div[style*="position: fixed"][style*="bottom: 0"][style*="left: 0"]',
        'div[style*="position: fixed"][style*="bottom: 0"][style*="right: 0"]',
        // Targeting logos specifically
        'img[alt*="next"], img[src*="next"], svg[aria-label*="next"]'
      ];

      // For each selector, try to find and remove matching elements
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (element && element.parentNode) {
              element.parentNode.removeChild(element);
              console.log(`Removed Next.js element with selector: ${selector}`);
            }
          });
        } catch (e) {
          // Silent fail, don't break the app if something goes wrong
        }
      });
    };

    // Run on mount
    removeNextjsBadges();

    // Set up a mutation observer to catch any dynamically added badges
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      // Check if any mutations look like they could be related to Next.js
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          shouldCheck = true;
        }
      });
      
      if (shouldCheck) {
        removeNextjsBadges();
      }
    });

    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup observer on component unmount
    return () => observer.disconnect();
  }, []);

  return null; // This component doesn't render anything
};

export default NextjsLogoCleaner; 