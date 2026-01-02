/**
 * Application constants
 * This file contains various constants used throughout the application
 */

// Local storage keys
export const LOCAL_STORAGE_KEYS = {
  TOKEN: 'yekacoucha_token',
  USER: 'yekacoucha_user',
  STUDENT_DATA: 'yekacoucha_student_data',
  TEACHER_DATA: 'yekacoucha_teacher_data',
  LANGUAGE: 'yekacoucha_language',
  THEME: 'yekacoucha_theme',
  LAST_UPDATE: 'yekacoucha_last_update'
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  STUDENTS: '/students',
  TEACHERS: '/teachers',
  CLASSES: '/classes',
  PACKAGES: '/packages'
};

// App routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  STUDENT_PROFILE: '/student/profile',
  TEACHER_PROFILE: '/teacher/profile',
  ADMIN: '/admin'
};

// Default values
export const DEFAULTS = {
  LANGUAGE: 'en',
  THEME: 'light',
  ITEMS_PER_PAGE: 10
};

// Time constants (in milliseconds)
export const TIME = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000
};

// Admin timezone for scheduling classes
export const ADMIN_TIMEZONE = 'America/Caracas'; 