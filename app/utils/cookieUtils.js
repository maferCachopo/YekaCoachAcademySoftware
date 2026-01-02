'use client';

/**
 * Utility functions for cookie management
 */

// Cookie names
export const COOKIE_NAMES = {
  TIMEZONE: 'yekacoucha_timezone',
  THEME: 'yekacoucha_theme',
  LANGUAGE: 'yekacoucha_language'
};

/**
 * Set a cookie with the given name and value
 * @param {string} name - The name of the cookie
 * @param {string} value - The value to store
 * @param {number} days - The number of days until the cookie expires (default: 365)
 */
export const setCookie = (name, value, days = 365) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
};

/**
 * Get a cookie value by name
 * @param {string} name - The name of the cookie to retrieve
 * @returns {string|null} The cookie value or null if not found
 */
export const getCookie = (name) => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length);
    }
  }
  
  return null;
};

/**
 * Delete a cookie by name
 * @param {string} name - The name of the cookie to delete
 */
export const deleteCookie = (name) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
};