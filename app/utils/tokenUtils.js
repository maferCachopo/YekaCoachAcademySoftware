/**
 * Utility functions for JWT token management in the client
 */

/**
 * Get the stored token from localStorage or sessionStorage
 * @returns {string|null} The stored token or null if not found
 */
export const getToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
};

/**
 * Store a token in either localStorage (persistent) or sessionStorage (session only)
 * @param {string} token - The JWT token to store
 * @param {boolean} rememberMe - Whether to store in localStorage (true) or sessionStorage (false)
 */
export const storeToken = (token, rememberMe) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Clear any existing tokens first
  clearToken();
  
  // Store in the appropriate storage
  if (rememberMe) {
    localStorage.setItem('token', token);
  } else {
    sessionStorage.setItem('token', token);
  }
};

/**
 * Clear the stored token from both localStorage and sessionStorage
 */
export const clearToken = () => {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

/**
 * Store user data in either localStorage or sessionStorage
 * @param {Object} user - The user object to store
 * @param {boolean} rememberMe - Whether to use localStorage or sessionStorage
 */
export const storeUser = (user, rememberMe) => {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Clear any existing user data first
  clearUser();
  
  // Store in the appropriate storage
  const userStr = JSON.stringify(user);
  if (rememberMe) {
    localStorage.setItem('user', userStr);
  } else {
    sessionStorage.setItem('user', userStr);
  }
};

/**
 * Get the stored user from localStorage or sessionStorage
 * @returns {Object|null} The stored user object or null if not found
 */
export const getUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!userStr) {
    console.log('AUTH DEBUG - No user found in storage');
    return null;
  }
  
  try {
    const user = JSON.parse(userStr);
    console.log('AUTH DEBUG - Retrieved user from storage:', { 
      id: user.id,
      username: user.username,
      role: user.role,
      hasStudentProperty: !!user.student,
      hasTeacherProperty: !!user.teacher,
      teacherId: user.teacherId,
      firstName: user.firstName,
      lastName: user.lastName
    });
    return user;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    clearUser();
    return null;
  }
};

/**
 * Clear the stored user from both localStorage and sessionStorage
 */
export const clearUser = () => {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem('user');
  sessionStorage.removeItem('user');
};

/**
 * Parse a JWT token to get its payload
 * @param {string} token - The JWT token to parse
 * @returns {Object|null} The decoded payload or null if invalid
 */
export const parseToken = (token) => {
  if (!token) {
    return null;
  }
  
  try {
    // Split the token into its parts
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode the base64 string
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

/**
 * Check if the stored token is expired
 * @returns {boolean} True if the token is expired or invalid, false otherwise
 */
export const isTokenExpired = () => {
  const token = getToken();
  if (!token) {
    return true;
  }
  
  try {
    const payload = parseToken(token);
    if (!payload || !payload.exp) {
      return true;
    }
    
    // Check if the expiration timestamp is in the past
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Check if the user is authenticated with a valid token
 * @returns {boolean} True if authenticated, false otherwise
 */
export const isAuthenticated = () => {
  return !!getToken() && !isTokenExpired();
};

/**
 * Get the user role from the stored token
 * @returns {string|null} The user role or null if not found
 */
export const getUserRole = () => {
  const token = getToken();
  if (!token) {
    return null;
  }
  
  try {
    const payload = parseToken(token);
    return payload?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

/**
 * Clear all authentication data (tokens and user info)
 */
export const clearAuthData = () => {
  clearToken();
  clearUser();
}; 