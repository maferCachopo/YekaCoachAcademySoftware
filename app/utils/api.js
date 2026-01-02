/**
 * API service for making requests to the backend
 */
import { getToken, clearAuthData, isTokenExpired } from './tokenUtils';
import moment from 'moment';
import 'moment-timezone';
import { ADMIN_TIMEZONE } from './constants';

// Base URL for API requests
const API_BASE_URL = '/api';  // Keep /api prefix for all API requests

// Timezone utilities
export const timezoneUtils = {
  // Get user's preferred timezone, falling back to browser timezone if not available
  getUserTimezone: (user) => {
    if (user && user.timezone) {
      return user.timezone;
    }
    return moment.tz.guess();
  },

  // Convert time from one timezone to another (user's timezone or browser timezone)
  convertToUserTime: (date, time, fromTimezone = ADMIN_TIMEZONE, userTimezone = null) => {
    if (!date || !time) return null;
    
    try {
      // Ensure time is properly formatted (HH:MM or HH:MM:SS)
      let formattedTime = time;
      if (!time.includes(':')) {
        // If time is just hours (e.g., "9" or "14"), format it as "09:00" or "14:00"
        formattedTime = time.padStart(2, '0') + ':00';
      } else if (time.length === 4 && time.indexOf(':') === 1) {
        // If time is like "9:00", format it as "09:00"
        formattedTime = '0' + time;
      }
      
      // Only log in development environment and with debug flag
      if (process.env.NODE_ENV === 'development' && window.DEBUG_TIME_CONVERSION) {
        console.log('Converting time:', { date, originalTime: time, formattedTime, fromTimezone, userTimezone });
      }
      
      // Create a moment object in the source timezone
      const sourceTime = moment.tz(`${date}T${formattedTime}`, fromTimezone);
      
      if (!sourceTime.isValid()) {
        console.error('Invalid date/time:', { date, time, formattedTime, fromTimezone });
        return null;
      }
      
      // Convert to user's timezone if provided, otherwise to browser's local timezone
      if (userTimezone) {
        return sourceTime.tz(userTimezone);
      } else {
        return sourceTime.local();
      }
    } catch (error) {
      console.error('Error converting time to user timezone:', error, { date, time, fromTimezone, userTimezone });
      return null;
    }
  },
  
  // Convert time from user timezone to admin timezone for storage
  convertFromUserToAdminTime: (date, time, userTimezone = null) => {
    if (!date || !time) return null;
    
    try {
      // Create a moment object in the user's timezone
      let sourceTime;
      if (userTimezone) {
        sourceTime = moment.tz(`${date}T${time}`, userTimezone);
      } else {
        // If no user timezone provided, assume the time is in local browser timezone
        sourceTime = moment(`${date}T${time}`);
      }
      
      // Convert to admin timezone for storage
      return sourceTime.tz(ADMIN_TIMEZONE);
    } catch (error) {
      console.error('Error converting time from user to admin timezone:', error);
      return null;
    }
  },
  
  // Legacy function for backward compatibility
  convertToLocalTime: (date, time, fromTimezone = ADMIN_TIMEZONE) => {
    if (!date || !time) return null;
    
    try {
      // Create a moment object in the source timezone
      const sourceTime = moment.tz(`${date}T${time}`, fromTimezone);
      
      // Convert to local timezone (browser timezone)
      return sourceTime.local();
    } catch (error) {
      console.error('Error converting time to local timezone:', error);
      return null;
    }
  },
  
  convertToAdminTime: (dateTime, toTimezone = ADMIN_TIMEZONE) => {
    if (!dateTime) return null;
    
    try {
      // Convert from local timezone to admin timezone
      return moment(dateTime).tz(toTimezone);
    } catch (error) {
      console.error('Error converting time to admin timezone:', error);
      return null;
    }
  },
  
  getLocalTimezone: () => {
    return moment.tz.guess();
  },
  
  // Format time in user's timezone
  formatUserTime: (date, time, fromTimezone = ADMIN_TIMEZONE, userTimezone = null, format = 'h:mm A') => {
    console.log('formatUserTime input:', { date, time, fromTimezone, userTimezone });
    
    // Make sure time is properly formatted (HH:MM)
    if (time && time.length <= 5 && !time.includes(':')) {
      // If time is just "9" or "14", format it as "09:00" or "14:00"
      if (time.length <= 2) {
        time = time.padStart(2, '0') + ':00';
      }
    }
    
    const userTime = timezoneUtils.convertToUserTime(date, time, fromTimezone, userTimezone);
    
    if (!userTime) {
      console.error('Failed to convert time:', { date, time, fromTimezone, userTimezone });
      return time; // Return original time as fallback
    }
    
    return userTime.format(format);
  },
  
  // Format time for storage in admin timezone
  formatAdminTime: (date, time, userTimezone = null, format = 'HH:mm') => {
    const adminTime = timezoneUtils.convertFromUserToAdminTime(date, time, userTimezone);
    return adminTime ? adminTime.format(format) : '';
  },
  
  // Legacy function for backward compatibility
  formatLocalTime: (date, time, fromTimezone = ADMIN_TIMEZONE, format = 'h:mm A') => {
    const localTime = timezoneUtils.convertToLocalTime(date, time, fromTimezone);
    return localTime ? localTime.format(format) : '';
  },
  
  // Debug timezone issues
  debugTimezone: (date, time, fromTimezone = ADMIN_TIMEZONE) => {
    try {
      const sourceTime = moment.tz(`${date}T${time}`, fromTimezone);
      const localTime = sourceTime.local();
      const browserTimezone = moment.tz.guess();
      
      console.group('Timezone Debug Information');
      console.log('Input:', { date, time, fromTimezone });
      console.log('Admin Time:', sourceTime.format('YYYY-MM-DD HH:mm:ss'));
      console.log('Admin Timezone:', fromTimezone);
      console.log('Local Time:', localTime.format('YYYY-MM-DD HH:mm:ss'));
      console.log('Browser Timezone:', browserTimezone);
      console.log('UTC Offset (hours):', localTime.utcOffset() / 60);
      console.log('Timezone Difference (hours):', 
        (localTime.utcOffset() - sourceTime.utcOffset()) / 60);
      console.groupEnd();
      
      return {
        inputDate: date,
        inputTime: time,
        adminTimezone: fromTimezone,
        adminTime: sourceTime.format('HH:mm'),
        localTime: localTime.format('HH:mm'),
        localTimeFormatted: localTime.format('h:mm A'),
        browserTimezone: browserTimezone,
        utcOffset: localTime.utcOffset() / 60,
        timezoneDiff: (localTime.utcOffset() - sourceTime.utcOffset()) / 60
      };
    } catch (error) {
      console.error('Timezone debugging error:', error);
      return {
        error: error.message,
        inputDate: date,
        inputTime: time,
        adminTimezone: fromTimezone
      };
    }
  }
};

// Local storage keys
const LOCAL_STORAGE_KEYS = {
  RESCHEDULED_CLASSES: 'yekacoucha_rescheduled_classes',
  STUDENT_DATA: 'yekacoucha_student_data',
  USER_DATA: 'yekacoucha_user_data',
  CLASS_UPDATES: 'yekacoucha_class_updates'
};

// Local storage helper functions
const getLocalData = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error(`Error getting data from localStorage for key ${key}:`, e);
    return null;
  }
};

const setLocalData = (key, data) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error setting data to localStorage for key ${key}:`, e);
  }
};

// Generic fetch function with authentication
export const fetchWithAuth = async (url, options = {}) => {
  try {
    const token = getToken();
    
    console.log(`DEBUG - Auth token available: ${!!token}`);
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('DEBUG - Added Authorization header');
    } else {
      console.warn('DEBUG - No auth token found, request will be unauthorized');
    }
    
    console.log(`DEBUG - API Request: ${options.method || 'GET'} ${API_BASE_URL}${url}`);
    if (options.body) {
      try {
        console.log('DEBUG - Request body:', JSON.parse(options.body));
      } catch (e) {
        console.log('DEBUG - Request body (raw):', options.body);
      }
    }
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    }).catch(err => {
      // Connection errors like network issues are caught here
      console.error(`DEBUG - Connection error for ${url}:`, err.message);
      
      if (!navigator.onLine) {
        console.warn('DEBUG - Browser is offline, network requests will fail');
        throw new Error('You are currently offline. Please check your internet connection.');
      } else {
        console.warn(`DEBUG - Network request failed but browser reports online status`);
        throw new Error(`Unable to connect to the server (${err.message}). Please try again later.`);
      }
    });
    
    // Don't redirect on 401 during login attempts
    if (response.status === 401 && url !== '/auth/login') {
      // Handle unauthorized (expired token, etc)
      clearAuthData();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
        return null;
      }
    }
    
    // Handle non-JSON responses (like 404 or server errors)
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      let errorData = {};
      
      try {
        // Try to parse as JSON
        errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`;
        
        // Special handling for 403 responses that might indicate inactive account
        if (response.status === 403 && (
          errorData.error === 'account_inactive' || 
          errorMessage.includes('account has been deactivated')
        )) {
          console.warn('Account inactive detected:', errorMessage);
          const error = new Error(errorMessage);
          error.status = response.status;
          error.response = response;
          error.data = errorData;
          error.error = errorData.error || 'account_inactive';
          throw error;
        }
        
        // Special handling for wrong portal error
        if (response.status === 401 && errorData.code === 'WRONG_PORTAL') {
          console.warn('Wrong portal access detected:', errorMessage);
          const error = new Error(errorMessage);
          error.status = response.status;
          error.response = response;
          error.data = errorData;
          throw error;
        }
        
        // Special handling for student assignment errors
        if (response.status === 400 && errorData.error === 'Student is already assigned to another teacher') {
          console.warn('Student already assigned error:', errorData);
          const error = new Error(errorMessage);
          error.status = response.status;
          error.response = response;
          error.data = errorData;
          throw error;
        }
      } catch (e) {
        // If not JSON, use text directly
        errorMessage = errorText || `Server error: ${response.status} ${response.statusText}`;
      }
      
      console.error(`API error for ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
        data: errorData
      });
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.response = response;
      error.data = errorData;
      throw error;
    }
    
    // For successful responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`DEBUG - API Response from ${url}:`, data);
      return data;
    } else {
      // Handle non-JSON successful responses
      const text = await response.text();
      console.log(`DEBUG - API Response (non-JSON) from ${url}:`, text);
      return { success: true, data: text };
    }
  } catch (error) {
    // Detailed error logging to help diagnose the issue
    if (!error.status) {
      console.error(`Network error for ${url}:`, error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Check for CORS issues
      if (error.message && error.message.includes('NetworkError') || 
          error.message.includes('Failed to fetch')) {
        console.error('Possible CORS issue or server unreachable');
      }

      // Check for browser offline
      if (!navigator.onLine) {
        console.error('Browser is offline - network requests will fail');
      }
    } else {
      console.error(`API error for ${url}:`, {
        status: error.status,
        message: error.message,
        data: error.data || {}
      });
    }
    throw error;
  }
};

// Add the helper function for updating local storage after rescheduling
const updateLocalStorageAfterReschedule = (rescheduledClasses, studentId, oldClassId, newClassId, oldClassData, newClassData) => {
  // Add to rescheduled classes in local storage
  rescheduledClasses.push({
    oldClassId: oldClassId,
    newClassId: newClassId,
    studentId: studentId,
    rescheduledAt: new Date().toISOString(),
    oldClassData: { ...oldClassData },
    newClassData: { ...newClassData }
  });
  
  // Save to local storage
  setLocalData(LOCAL_STORAGE_KEYS.RESCHEDULED_CLASSES, rescheduledClasses);
  
  // Update local student data
  const studentData = getLocalData(LOCAL_STORAGE_KEYS.STUDENT_DATA) || {};
  const studentRecord = studentData[studentId] || { classes: [] };
  
  // Remove old class and add new class
  studentRecord.classes = studentRecord.classes.filter(c => c.id !== oldClassId);
  studentRecord.classes.push(newClassData);
  
  // Update package info - increment used reschedules
  if (!studentRecord.packages) {
    studentRecord.packages = { usedReschedules: 1, rescheduleRemaining: 1 };
  } else {
    studentRecord.packages.usedReschedules = (studentRecord.packages.usedReschedules || 0) + 1;
    studentRecord.packages.rescheduleRemaining = Math.max(0, (studentRecord.packages.rescheduleRemaining || 1) - 1);
  }
  
  // Save updated student data
  studentData[studentId] = studentRecord;
  setLocalData(LOCAL_STORAGE_KEYS.STUDENT_DATA, studentData);
  
  // Record update timestamp
  const updates = getLocalData(LOCAL_STORAGE_KEYS.CLASS_UPDATES) || {};
  updates.lastUpdate = new Date().toISOString();
  setLocalData(LOCAL_STORAGE_KEYS.CLASS_UPDATES, updates);
};

// Auth API
export const authAPI = {
  login: async (credentials, loginType = null) => {
    const loginData = { ...credentials };
    if (loginType) {
      loginData.loginType = loginType;
    }
    
    return fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    });
  },
  
  logout: async () => {
    try {
      await fetchWithAuth('/auth/logout', {
        method: 'POST',
      });
    } finally {
      clearAuthData();
    }
  },
  
  getCurrentUser: async () => {
    // Check if token is expired first to avoid unnecessary API calls
    if (isTokenExpired()) {
      clearAuthData();
      throw new Error('Session expired');
    }
    
    try {
      return await fetchWithAuth('/auth/me');
    } catch (error) {
      // Check if this is an inactive account error
      if (error.status === 403 && (
        error.error === 'account_inactive' || 
        (error.message && error.message.includes('account has been deactivated'))
      )) {
        // Make sure the error is properly structured for handling in AuthContext
        const enhancedError = new Error(error.message || 'Your account has been deactivated by the administrator.');
        enhancedError.error = 'account_inactive';
        throw enhancedError;
      }
      throw error;
    }
  },
  
  changePassword: async (passwordData) => {
    return fetchWithAuth('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  },

  register: async (userData) => {
    return fetchWithAuth('/auth/register-student', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  // Add the missing resetStudentPassword function
  resetStudentPassword: async (studentId, newPassword) => {
    return fetchWithAuth(`/auth/reset-password/${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },
  
  updateTimezone: async (timezone) => {
    return fetchWithAuth('/auth/update-timezone', {
      method: 'POST',
      body: JSON.stringify({ timezone }),
    });
  },
};

// Student API
export const studentAPI = {
  getAllStudents: async (includeInactive = false) => {
    return await fetchWithAuth(`/students${includeInactive ? '?showInactive=true' : ''}`);
  },
  
  getStudentById: async (id) => {
    try {
      const studentData = await fetchWithAuth(`/students/${id}`);
      console.log('DEBUG - getStudentById response includes zoomLink:', !!studentData.zoomLink, studentData);
      return studentData;
    } catch (error) {
      console.error('Error fetching student by ID:', error);
      throw error;
    }
  },
  
  deleteStudent: async (id) => {
    try {
      return await fetchWithAuth(`/students/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },
  
  // Add the student profile endpoint
  getStudentProfile: async (id) => {
    try {
      // Skip trying to get from API first since we know it's not working
      // and go straight to the fallback implementation
      const basicProfile = await fetchWithAuth(`/students/${id}`);
      
      // Enhance with packages and classes if possible - using safer approach with individual error handling
      let enhancedProfile = { ...basicProfile };
      
      // Get packages - with error handling
      try {
        const packages = await studentAPI.getStudentPackages(id);
        enhancedProfile.packages = packages;
      } catch (packagesError) {
        console.warn('Could not fetch student packages:', packagesError);
        enhancedProfile.packages = [];
      }
      
      // Get classes - with error handling
      try {
        const classes = await studentAPI.getStudentClasses(id);
        enhancedProfile.classes = classes;
      } catch (classesError) {
        console.warn('Could not fetch student classes:', classesError);
        enhancedProfile.classes = [];
      }
      
      return enhancedProfile;
    } catch (error) {
      console.error('Error getting student profile:', error);
      throw error;
    }
  },
  
  updateStudent: async (id, data) => {
    console.log('DEBUG - updateStudent called with:', { id, data });
    try {
      const response = await fetchWithAuth(`/students/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      console.log('DEBUG - Student update successful:', response);
      return response;
    } catch (error) {
      console.error('DEBUG - Student update failed:', error);
      throw error;
    }
  },
  
  getStudentDashboard: async (id) => {
    try {
      return await fetchWithAuth(`/students/${id}/dashboard`);
    } catch (error) {
      console.error('Error fetching student dashboard:', error);
      
      // Try to get local data as fallback
      const localData = getLocalData(`student_${id}_dashboard`);
      if (localData) {
        console.warn('Using cached dashboard data due to API error');
        return localData;
      }
      
      // If no local data, try to build a minimal dashboard from profile data
      try {
        console.warn('Attempting to build minimal dashboard from profile data');
        const profile = await studentAPI.getStudentProfile(id);
        if (profile) {
          return {
            student: profile,
            packages: profile.packages || [],
            classes: profile.classes || [],
            upcomingClasses: profile.classes?.filter(c => new Date(c.dateTime) > new Date()) || [],
            message: 'Dashboard constructed from profile data (limited functionality)'
          };
        }
      } catch (profileError) {
        console.error('Failed to build dashboard from profile:', profileError);
      }
      
      // If all else fails, return an empty structure
      return {
        student: { id },
        packages: [],
        classes: [],
        upcomingClasses: [],
        error: 'Failed to load dashboard data'
      };
    }
  },
  
  // Get all student packages
  getStudentPackages: async (id) => {
    return await fetchWithAuth(`/students/${id}/packages`);
  },
  
  // Get a specific student package by ID
  getStudentPackage: async (packageId) => {
    // The server router shows that there's a specific endpoint for student packages
    // But we need to try different formats because the API might vary
    
    try {
      console.log(`Looking for StudentPackage information for ID: ${packageId}`);
      
      // First, check if this is a combined ID (studentId_packageId)
      let studentId = null;
      let actualPackageId = packageId;
      
      if (packageId && typeof packageId === 'string' && packageId.includes('_')) {
        const parts = packageId.split('_');
        studentId = parts[0];
        actualPackageId = parts[1];
        console.log(`Split combined ID: studentId=${studentId}, packageId=${actualPackageId}`);
      }
      
      // If we have both IDs, try the most precise endpoint
      if (studentId && actualPackageId) {
        try {
          console.log(`Trying direct endpoint: /students/${studentId}/packages/${actualPackageId}`);
          const response = await fetchWithAuth(`/students/${studentId}/packages/${actualPackageId}`);
          console.log('Success with direct endpoint:', response);
          return response;
        } catch (directError) {
          console.error(`Direct endpoint failed: ${directError.message}`);
          // Continue to fallbacks
        }
      }
      
      // Try getting all packages for that student and filtering to find the one we want
      if (studentId) {
        try {
          console.log(`Trying to get all packages for student ${studentId}`);
          const allPackages = await fetchWithAuth(`/students/${studentId}/packages`);
          
          if (Array.isArray(allPackages) && allPackages.length > 0) {
            // Find the exact package if possible
            const exactPackage = allPackages.find(p => 
              p.id == actualPackageId || 
              p.packageId == actualPackageId
            );
            
            if (exactPackage) {
              console.log('Found exact package in student packages:', exactPackage);
              return exactPackage;
            }
            
            // Otherwise, return the active package or the first one
            const activePackage = allPackages.find(p => p.status === 'active');
            if (activePackage) {
              console.log('Found active package:', activePackage);
              return activePackage;
            }
            
            // Last resort - just return the first package
            console.log('Returning first package as fallback:', allPackages[0]);
            return allPackages[0];
          }
        } catch (allPackagesError) {
          console.error(`Failed to get all packages: ${allPackagesError.message}`);
          // Continue to fallbacks
        }
      }
      
      // If we can't get the package info, create a fallback structure
      console.warn('All approaches failed, using fallback package structure');
      const now = new Date();
      
      // Calculate a dynamic end date (6 months from now)
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(now.getMonth() + 6);
      const fallbackEndDate = sixMonthsLater;
      
      return {
        id: packageId,
        packageId: actualPackageId,
        studentId: studentId || 'unknown',
        startDate: now.toISOString(),
        endDate: fallbackEndDate.toISOString(),
        validUntil: fallbackEndDate.toISOString(),
        status: 'active',
        remainingClasses: 10, // Give a reasonable number of classes
        rescheduleRemaining: 5, // Give a reasonable number of reschedules
        usedReschedules: 0,
        totalClasses: 20, // Default value
        durationMonths: 6,
        fetchError: true,
        errorMessage: 'Could not retrieve package information from server'
      };
    } catch (error) {
      console.error(`Unexpected error in getStudentPackage: ${error.message}`);
      
      // Provide a fallback structure
      const now = new Date();
      
      // Calculate a dynamic end date (6 months from now)
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(now.getMonth() + 6);
      const fallbackEndDate = sixMonthsLater;
      
      return {
        id: packageId,
        startDate: now.toISOString(),
        endDate: fallbackEndDate.toISOString(),
        validUntil: fallbackEndDate.toISOString(),
        status: 'active',
        remainingClasses: 10, // Give a reasonable number of classes
        rescheduleRemaining: 5, // Give a reasonable number of reschedules
        usedReschedules: 0,
        durationMonths: 6,
        fetchError: true,
        errorMessage: error.message || 'Unexpected error retrieving package information'
      };
    }
  },
  
  assignPackage: async (studentId, packageData) => {
    console.log('DEBUG - assignPackage called with:', { studentId, packageData });
    try {
      const response = await fetchWithAuth(`/students/${studentId}/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(packageData),
      });
      console.log('DEBUG - Package assignment successful:', response);
      return response;
    } catch (error) {
      console.error('DEBUG - Package assignment failed:', error);
      throw error;
    }
  },
  
  updateStudentPackage: async (studentId, packageId, data) => {
    console.log('DEBUG - updateStudentPackage called with:', { studentId, packageId, data });
    try {
      const response = await fetchWithAuth(`/students/${studentId}/packages/${packageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      console.log('DEBUG - Package update successful:', response);
      return response;
    } catch (error) {
      console.error('DEBUG - Package update failed:', error);
      throw error;
    }
  },
  
  deactivatePackage: async (studentId, packageId) => {
    return await fetchWithAuth(`/students/${studentId}/packages/${packageId}/deactivate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  
  // Get all student classes
  getStudentClasses: async (id) => {
    return await fetchWithAuth(`/students/${id}/classes`);
  },
  
  scheduleClasses: async (studentId, classesData) => {
    console.log('DEBUG - scheduleClasses called with:', { studentId, classesData });
    try {
      // Add timezone information to each class
      const classesWithTimezone = {
        ...classesData,
        classes: classesData.classes.map(cls => ({
          ...cls,
          timezone: ADMIN_TIMEZONE // Add explicit timezone marker
        }))
      };
      
      const response = await fetchWithAuth(`/students/${studentId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classesWithTimezone),
      });
      console.log('DEBUG - Class scheduling successful:', response);
      return response;
    } catch (error) {
      console.error('DEBUG - Class scheduling failed:', error);
      throw error;
    }
  },
  
  updateClass: async (classId, classData) => {
    return await fetchWithAuth(`/classes/${classId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(classData),
    });
  },
  
  // Endpoint to create a reschedule record
  createRescheduleRecord: async (studentId, oldClassId, newClassData, teacherId, differentTeacher = false) => {
    try {
      console.log('DEBUG - Creating reschedule record via API:', {
        studentId,
        oldClassId,
        newClassData,
        teacherId,
        differentTeacher
      });
      
      // Call the reschedule endpoint
      return await fetchWithAuth(`/students/${studentId}/reschedules`, {
        method: 'POST',
        body: JSON.stringify({
          oldClassId,
          newClassData,
          teacherId, // Include the teacher ID in the request
          differentTeacher, // Include the differentTeacher flag
          reason: differentTeacher 
            ? 'Rescheduled by student with a different teacher'
            : 'Rescheduled by student'
        }),
      });
    } catch (error) {
      console.error('Failed to create reschedule record:', error.message);
      throw error;
    }
  },
  
  // Update the rescheduleClass function to support custom time and durations
  rescheduleClass: async (studentClassId, newDate, endDate) => {
    // Check if we have the required parameters
    if (!studentClassId || !newDate) {
      throw new Error('Missing required parameters for rescheduling');
    }
    
    // Format the request with all parameters
    const requestBody = {
      studentClassId: studentClassId,
      newDate: newDate instanceof Date ? newDate.toISOString() : newDate,
      endDate: endDate instanceof Date ? endDate.toISOString() : endDate
    };
    
    try {
      return await fetchWithAuth('/students/reschedule-class', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      console.error('Error in rescheduleClass:', error);
      throw error;
    }
  },
  
  // Get all student reschedules
  getStudentReschedules: async (id) => {
    return await fetchWithAuth(`/students/${id}/reschedules`);
  },
  
  // Check for updates to student data (useful for components to detect changes)
  checkForUpdates: () => {
    return getLocalData(LOCAL_STORAGE_KEYS.CLASS_UPDATES)?.lastUpdate || null;
  },
  
  // Save student data to local storage
  saveStudentData: (studentId, data) => {
    const studentData = getLocalData(LOCAL_STORAGE_KEYS.STUDENT_DATA) || {};
    studentData[studentId] = { ...studentData[studentId], ...data };
    setLocalData(LOCAL_STORAGE_KEYS.STUDENT_DATA, studentData);
    
    // Update timestamp
    const updates = getLocalData(LOCAL_STORAGE_KEYS.CLASS_UPDATES) || {};
    updates.lastUpdate = new Date().toISOString();
    setLocalData(LOCAL_STORAGE_KEYS.CLASS_UPDATES, updates);
  },
  
  // Get student data from local storage
  getLocalStudentData: (studentId) => {
    const studentData = getLocalData(LOCAL_STORAGE_KEYS.STUDENT_DATA) || {};
    return studentData[studentId] || null;
  },
  
  // Sync data between student profile and dashboard
  syncStudentProfileAndDashboard: async (studentId) => {
    try {
      // Get the latest data from local storage
      const localStudentData = getLocalData(LOCAL_STORAGE_KEYS.STUDENT_DATA) || {};
      const studentRecord = localStudentData[studentId];
      
      if (!studentRecord) {
        console.warn('No local student data to sync');
        return false;
      }
      
      // Store a special flag in local storage to indicate cross-component sync needed
      const syncInfo = getLocalData('yekacoucha_cross_component_sync') || {};
      syncInfo.lastSync = new Date().toISOString();
      syncInfo.triggeredBy = 'profile';
      syncInfo.affectedStudentId = studentId;
      setLocalData('yekacoucha_cross_component_sync', syncInfo);
      
      // Create an event that other components can listen for
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const syncEvent = new CustomEvent('yekacoucha_data_changed', { 
          detail: { 
            studentId,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(syncEvent);
      }
      
      // Record update timestamp
      const updates = getLocalData(LOCAL_STORAGE_KEYS.CLASS_UPDATES) || {};
      updates.lastUpdate = new Date().toISOString();
      setLocalData(LOCAL_STORAGE_KEYS.CLASS_UPDATES, updates);
      
      return true;
    } catch (error) {
      console.error('Error syncing student data between components:', error);
      return false;
    }
  },
  
  // Check for cross-component synchronization
  checkForCrossComponentSync: () => {
    const syncInfo = getLocalData('yekacoucha_cross_component_sync') || {};
    return syncInfo.lastSync ? syncInfo : null;
  },

  // Get assigned teachers for a student
  getStudentTeachers: async (studentId) => {
    try {
      console.log('Fetching teachers for student ID:', studentId);
      return await fetchWithAuth(`/students/${studentId}/teachers`);
    } catch (error) {
      console.error('Error fetching student teachers:', error);
      
      // Create a fallback teacher if the API call fails
      console.log('Returning fallback teacher data');
      return [
        {
          id: 1, // Fallback ID
          firstName: 'Your',
          lastName: 'Teacher',
          email: '',
          // Add minimal required properties
          workHours: {}
        }
      ];
    }
  },
};

// Package API
export const packageAPI = {
  getAllPackages: async () => {
    return fetchWithAuth('/packages');
  },
  
  getActivePackages: async () => {
    return fetchWithAuth('/packages/active');
  },
  
  getPackageById: async (id) => {
    return fetchWithAuth(`/packages/${id}`);
  },
  
  createPackage: async (packageData) => {
    return fetchWithAuth('/packages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(packageData),
    });
  },
  
  updatePackage: async (id, packageData) => {
    return fetchWithAuth(`/packages/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(packageData),
    });
  },
  
  getPackageStudents: async (id) => {
    return fetchWithAuth(`/packages/${id}/students`);
  },
};

// Class API
export const classAPI = {
  getAllClasses: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return fetchWithAuth(`/classes?${queryParams}`);
  },
  
  getClassById: async (id) => {
    return fetchWithAuth(`/classes/${id}`);
  },
  
  createClass: async (classData) => {
    return fetchWithAuth('/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    });
  },
  
  updateClass: async (id, classData) => {
    return fetchWithAuth(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData),
    });
  },
  
  getClassStudents: async (id) => {
    return fetchWithAuth(`/classes/${id}/students`);
  },
  
  completeClass: async (id, feedbackData) => {
    return fetchWithAuth(`/classes/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  },
  
  assignStudent: async (id, assignData) => {
    return fetchWithAuth(`/classes/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(assignData),
    });
  },
  
  getAvailableClasses: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return fetchWithAuth(`/classes/available?${queryParams}`);
  },
};

// Admin API
export const adminAPI = {
  getDashboardStats: async () => {
    return fetchWithAuth('/admin/stats');
  },
  
  getUpcomingClasses: async () => {
    return fetchWithAuth('/admin/upcoming-classes');
  },
  
  getExpiringPackages: async () => {
    return fetchWithAuth('/admin/expiring-packages');
  },
  
  getLowClassCount: async () => {
    return fetchWithAuth('/admin/low-class-count');
  },
  
  getPendingFeedback: async () => {
    return fetchWithAuth('/admin/pending-feedback');
  },
  
  updateClassStatus: async () => {
    return fetchWithAuth('/admin/update-class-status', {
      method: 'POST',
    });
  },
  
  updateStudentClassStatus: async (studentId) => {
    return fetchWithAuth(`/admin/update-student-classes/${studentId}`, {
      method: 'POST',
    });
  },
  
  // Get all rescheduled classes for admin dashboard
  getRescheduledClasses: async () => {
    try {
      // Get from the dedicated endpoint
      return await fetchWithAuth('/admin/rescheduled-classes');
    } catch (error) {
      console.error('Failed to fetch rescheduled classes:', error.message);
      throw error;
    }
  },
  
  // Submit a rescheduled class record to the database
  submitRescheduleRecord: async (rescheduleData) => {
    return fetchWithAuth('/admin/reschedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rescheduleData),
    });
  },
  // Sync local rescheduled classes with the server
  syncRescheduledClasses: async () => {
    try {
      // Get all rescheduled classes from local storage
      const localReschedules = getLocalData(LOCAL_STORAGE_KEYS.RESCHEDULED_CLASSES) || [];
      
      if (localReschedules.length === 0) {
        console.log('No local rescheduled classes to sync');
        return { success: true, message: 'No local data to sync', syncedCount: 0 };
      }
      
      // Submit them all to the server
      const response = await fetchWithAuth('/admin/sync-reschedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reschedules: localReschedules }),
      });
      
      console.log('Sync response:', response);
      return response;
    } catch (error) {
      console.error('Failed to sync rescheduled classes:', error);
      throw error;
    }
  },
  // Get global teacher schedule (all teachers)
  getTeacherSchedule: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return fetchWithAuth(`/admin/teachers/schedule?${queryParams}`);
  },
  
  // Get given classes (completed classes)
  getGivenClasses: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return fetchWithAuth(`/admin/teachers/given-classes?${queryParams}`);
  },
  
  // Get all teachers for dropdowns
  getAllTeachers: async (includeInactive = false) => {
    return fetchWithAuth(`/teachers${includeInactive ? '?showInactive=true' : ''}`);
  },
  
  // Update class teacherId based on student-teacher assignments
  updateClassTeachers: async () => {
    return fetchWithAuth('/admin/update-class-teachers', {
      method: 'POST'
    });
  },
};

// Coordinator API
export const coordinatorAPI = {
  // Get all teachers for coordinator view
  getAllTeachers: async () => {
    return fetchWithAuth('/coordinator/teachers');
  },
  
  // Get teacher schedule with assigned students and classes
  getTeacherSchedule: async (teacherId, params = {}) => {
    const queryString = Object.keys(params).length > 0
      ? `?${new URLSearchParams(params).toString()}`
      : '';
    return fetchWithAuth(`/coordinator/teachers/${teacherId}/schedule${queryString}`);
  },
  
  // Get all rescheduled classes
  getRescheduledClasses: async (params = {}) => {
    const queryString = Object.keys(params).length > 0
      ? `?${new URLSearchParams(params).toString()}`
      : '';
    return fetchWithAuth(`/coordinator/rescheduled-classes${queryString}`);
  },
  
  // Get dashboard data for coordinator
  getDashboardData: async () => {
    try {
      // Get teachers count
      const teachersData = await fetchWithAuth('/coordinator/teachers');
      const teachersCount = teachersData?.length || 0;
      
      // Get task statistics
      const taskData = await fetchWithAuth('/coordinator/tasks');
      
      // Get exam statistics
      const examsData = await fetchWithAuth('/coordinator/exams');
      
      // Get recent rescheduled classes
      const rescheduledClasses = await fetchWithAuth('/coordinator/rescheduled-classes');
      
      return {
        teachersCount,
        taskData,
        examsData,
        rescheduledClasses
      };
    } catch (error) {
      console.error('Error fetching coordinator dashboard data:', error);
      throw error;
    }
  }
};

// Availability API
export const availabilityAPI = {
  // Get available dates within a date range
  getAvailableDates: async (startDate, endDate, studentId, teacherId) => {
    try {
      // Validate inputs
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }
      
      if (!studentId) {
        throw new Error('Student ID is required');
      }
      
      // Parse dates to ensure they're valid
      const start = moment(startDate);
      const end = moment(endDate);
      
      if (!start.isValid() || !end.isValid()) {
        throw new Error('Invalid date format');
      }
      
      // Ensure start date is not after end date
      if (start.isAfter(end)) {
        throw new Error('Start date cannot be after end date');
      }
      
      // Check if date range is too large (server has a 90-day limit)
      const maxDays = 90;
      const daysDiff = end.diff(start, 'days');
      
      if (daysDiff > maxDays) {
        console.warn(`Date range (${daysDiff} days) exceeds maximum of ${maxDays} days. Server will limit results.`);
      }
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('startDate', start.format('YYYY-MM-DD'));
      params.append('endDate', end.format('YYYY-MM-DD'));
      params.append('studentId', studentId);
      
      if (teacherId) {
        params.append('teacherId', teacherId);
      }
      
      const response = await fetchWithAuth(`/availability/dates?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('Error fetching available dates:', error);
      throw error;
    }
  }
};

// Teacher API
export const teacherAPI = {
  // Get teacher profile
  getTeacherProfile: async (id) => {
    return fetchWithAuth(`/teachers/${id}`);
  },
  
  // Get teacher's dashboard data
  getDashboard: async (id) => {
    try {
      console.log('DEBUG - teacherAPI.getDashboard - Starting with teacherId:', id);
      
      // Get today's classes
      const today = new Date().toISOString().split('T')[0];
      console.log('DEBUG - teacherAPI.getDashboard - Fetching activities for date:', today);
      
      // Get teacher's own classes for today
      const teacherClasses = await fetchWithAuth(`/teachers/${id}/activities?startDate=${today}&endDate=${today}`);
      console.log('DEBUG - teacherAPI.getDashboard - Received classes data:', teacherClasses);
      
      // Get pending tasks
      console.log('DEBUG - teacherAPI.getDashboard - Fetching pending tasks');
      const tasks = await fetchWithAuth(`/teachers/${id}/tasks?status=pending`);
      console.log('DEBUG - teacherAPI.getDashboard - Received tasks data:', tasks);
      
      // Get assigned students
      console.log('DEBUG - teacherAPI.getDashboard - Fetching assigned students');
      const students = await fetchWithAuth(`/teachers/${id}/students`);
      console.log('DEBUG - teacherAPI.getDashboard - Received students data:', students);
      
      // Get classes for each assigned student (similar to getTodaysClasses)
      let studentClasses = [];
      if (students && students.length > 0) {
        console.log('DEBUG - teacherAPI.getDashboard - Fetching student classes');
        const promises = students.map(async (student) => {
          try {
            // Fetch student classes for today
            const classes = await fetchWithAuth(`/students/${student.id}/classes?date=${today}`);
              
            // Add student info to each class
            return classes.map(cls => ({
              ...cls,
              studentName: `${student.name} ${student.surname}`,
              studentId: student.id,
              isStudentClass: true
            }));
          } catch (error) {
            console.error(`Error fetching classes for student ${student.id}:`, error);
            return [];
          }
        });
        
        // Wait for all promises to resolve
        const studentClassesArrays = await Promise.all(promises);
        studentClasses = studentClassesArrays.flat();
        console.log('DEBUG - teacherAPI.getDashboard - Received student classes:', studentClasses.length);
      }
      
      return {
        classes: { 
          classes: [...(teacherClasses.classes || []), ...studentClasses],
          activities: teacherClasses.activities || []
        },
        tasks,
        students
      };
    } catch (error) {
      console.error('DEBUG - teacherAPI.getDashboard - Error:', error);
      throw error;
    }
  },
  
    // Get teacher's schedule
  getSchedule: async (id, { startDate, endDate }) => {
    try {
      // Get basic schedule data (work hours, break hours)
      const scheduleData = await fetchWithAuth(`/teachers/${id}/schedule?startDate=${startDate}&endDate=${endDate}`);

      // Get classes (now includes filtering for only active/current classes)
      const classes = await fetchWithAuth(`/teachers/${id}/classes?startDate=${startDate}&endDate=${endDate}`);

      // Get rescheduled classes (where this teacher is the new teacher) for activities
      const rescheduledClasses = await fetchWithAuth(`/teachers/${id}/rescheduled-classes?startDate=${startDate}&endDate=${endDate}`);

      // Classes are now properly filtered on the backend, so just use them as-is
      // But still filter out any potential duplicates with rescheduled classes for activities
      const allActivities = [];
      const activityIds = new Set();

      // Add existing activities
      if (scheduleData.activities && Array.isArray(scheduleData.activities)) {
        scheduleData.activities.forEach(activity => {
          if (activity && activity.id && !activityIds.has(activity.id)) {
            activityIds.add(activity.id);
            allActivities.push(activity);
          }
        });
      }

      // Add rescheduled classes as activities (avoiding duplicates with classes)
      if (Array.isArray(rescheduledClasses)) {
        rescheduledClasses.forEach(cls => {
          if (cls && cls.id && !activityIds.has(cls.id)) {
            activityIds.add(cls.id);
            allActivities.push(cls);
          }
        });
      }

      // Return the properly filtered data
      return {
        ...scheduleData,
        classes: classes || [], // Backend now filters classes properly
        activities: allActivities
      };
    } catch (error) {
      console.error('Error in teacherAPI.getSchedule:', error);
      throw error;
    }
  },
  
  // Get teacher's activities
  getActivities: async (id, { startDate, endDate }) => {
    return fetchWithAuth(`/teachers/${id}/activities?startDate=${startDate}&endDate=${endDate}`);
  },
  
  // Get teacher's tasks
  getTasks: async (id, { status } = {}) => {
    const query = status ? `?status=${status}` : '';
    return fetchWithAuth(`/teachers/${id}/tasks${query}`);
  },
  
  // Get teacher's today's classes
  getTodaysClasses: async (id) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get teacher's own classes for today
      const teacherClasses = await fetchWithAuth(`/teachers/${id}/classes?date=${today}`);
      
      // Get assigned students
      const students = await fetchWithAuth(`/teachers/${id}/students`);
      
      // Get classes for each assigned student
      let studentClasses = [];
      if (students && students.length > 0) {
        const promises = students.map(async (student) => {
          try {
            // Fetch student classes for today
            const classes = await fetchWithAuth(`/students/${student.id}/classes?date=${today}`);
              
            // Add student info to each class
            return classes.map(cls => ({
              ...cls,
              studentName: `${student.name} ${student.surname}`,
              studentId: student.id,
              isStudentClass: true
            }));
          } catch (error) {
            console.error(`Error fetching classes for student ${student.id}:`, error);
            return [];
          }
        });
        
        // Wait for all promises to resolve
        const studentClassesArrays = await Promise.all(promises);
        studentClasses = studentClassesArrays.flat();
      }
      
      // Combine teacher's classes with student classes
      return {
        classes: [...teacherClasses, ...studentClasses]
      };
    } catch (error) {
      console.error('Error fetching today\'s classes:', error);
      throw error;
    }
  },
  
  // Get teacher's history (completed tasks and exams)
  getHistory: async (id) => {
    try {
      return await fetchWithAuth(`/teachers/${id}/history`);
    } catch (error) {
      console.error('Error fetching teacher history:', error);
      throw error;
    }
  },
  
  // Get assigned students
  getAssignedStudents: async (id) => {
    return fetchWithAuth(`/teachers/${id}/students`);
  },
  
  // Get teacher's exams
  getExams: async (id, params = {}) => {
    try {
      // Build query string from params
      const queryParams = new URLSearchParams();
      if (params.status) {
        queryParams.append('status', params.status);
      }
      
      const queryString = queryParams.toString();
      const endpoint = `/teachers/${id}/exams${queryString ? `?${queryString}` : ''}`;
      console.log('DEBUG - Fetching teacher exams from endpoint:', endpoint);
      
      const response = await fetchWithAuth(endpoint);
      console.log('DEBUG - Received teacher exams data:', response);
      return response;
    } catch (error) {
      console.error('DEBUG - Error fetching teacher exams:', error);
      throw new Error(`Failed to fetch exams: ${error.message}`);
    }
  },
  
  getExamDetails: async (id) => {
    try {
      console.log('DEBUG - Fetching exam details for exam ID:', id);
      const response = await fetchWithAuth(`/teachers/exams/${id}`);
      console.log('DEBUG - Received exam details:', response);
      return response;
    } catch (error) {
      console.error('DEBUG - Error fetching exam details:', error);
      throw new Error(`Failed to fetch exam details: ${error.message}`);
    }
  },
  
  saveExamAnswer: async (examId, questionId, data) => {
    try {
      console.log('DEBUG - Saving exam answer:', { examId, questionId, data });
      const response = await fetchWithAuth(`/teachers/exams/${examId}/questions/${questionId}/answer`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      console.log('DEBUG - Answer saved successfully:', response);
      return response;
    } catch (error) {
      console.error('DEBUG - Error saving exam answer:', error);
      throw new Error(`Failed to save answer: ${error.message}`);
    }
  },
  
  submitExam: async (id) => {
    try {
      console.log('DEBUG - Submitting exam ID:', id);
      const response = await fetchWithAuth(`/teachers/exams/${id}/submit`, {
        method: 'PATCH'
      });
      console.log('DEBUG - Exam submitted successfully:', response);
      return response;
    } catch (error) {
      console.error('DEBUG - Error submitting exam:', error);
      throw new Error(`Failed to submit exam: ${error.message}`);
    }
  },

  // Get teacher's available slots (no conflict with assigned students)
  getTeacherAvailableSlots: async (teacherId, date, studentId) => {
    try {
      if (!studentId) {
        console.error('Student ID is required for getting teacher available slots');
        throw new Error('Student ID is required for getting teacher available slots');
      }
      
      const formattedDate = date instanceof Date ? date.toISOString().split('T')[0] : date;
      const response = await fetchWithAuth(`/students/${studentId}/teacher/${teacherId}/available-slots?date=${formattedDate}`);
      return response;
    } catch (error) {
      console.error('Error fetching teacher available slots:', error);
      throw error;
    }
  },
  
  // Get all teachers' availability for a specific date
  getAllTeachersAvailability: async (date, studentId) => {
    try {
      if (!studentId) {
        console.error('Student ID is required for getting teacher availability');
        throw new Error('Student ID is required for getting teacher availability');
      }
      
      const formattedDate = date instanceof Date ? date.toISOString().split('T')[0] : date;
      const url = `/students/${studentId}/teacher-availability?date=${formattedDate}`;
      
      console.log(`Calling API: ${url}`);
      const response = await fetchWithAuth(url);
      
      // Debug the response structure
      if (response && response.teachers) {
        const teachersWithSlots = response.teachers.filter(t => 
          t.availableSlots && t.availableSlots.length > 0
        );
        console.log(`API returned ${response.teachers.length} teachers, ${teachersWithSlots.length} with slots`);
        
        // Log the first teacher with slots if any
        if (teachersWithSlots.length > 0) {
          const sampleTeacher = teachersWithSlots[0];
          console.log(`Sample teacher ${sampleTeacher.teacher.id} has ${sampleTeacher.availableSlots.length} slots. First slot:`, 
            sampleTeacher.availableSlots[0]);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching all teachers availability:', error);
      throw error;
    }
  },
}; 