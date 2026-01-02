/**
 * Utility to check if the backend server is running
 */

// Base URL for API requests
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

/**
 * Checks if the API server is accessible
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const checkServerConnection = async () => {
  try {
    console.log(`Checking server connection to ${API_BASE_URL}/ping...`);
    
    const controller = new AbortController();
    // Increase timeout from 5 to 8 seconds
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    // Try to fetch a simple endpoint that doesn't require auth
    const response = await fetch(`${API_BASE_URL}/ping`, {
      method: 'GET',
      credentials: 'omit', // Don't send cookies
      cache: 'no-store', // Don't use cache
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log('Server connection check result:', response.status);
    
    // Any response indicates the server is at least running
    return {
      success: true,
      status: response.status
    };
  } catch (error) {
    console.error('Server connection check failed:', error.name, error.message);
    
    // Always show detailed error in development mode but allow app to continue
    if (process.env.NODE_ENV === 'development') {
      console.warn('Running in development mode - allowing to continue even without server connection');
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Server connection timed out. The server might be starting up or not running.',
          devMode: true
        };
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Could not reach the server. Please make sure the server is running on port 3001.',
          devMode: true
        };
      }
      
      return {
        success: false,
        error: `Development mode: ${error.message}`,
        devMode: true
      };
    }
    
    // Handle different error types for production
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Connection timed out. Server might be down or too slow to respond.'
      };
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'Could not reach the server. Please make sure the server is running on port 3001.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to connect to server'
    };
  }
};

/**
 * Waits until server is available or max attempts are reached
 * @param {number} maxAttempts Maximum number of attempts
 * @param {number} interval Interval between attempts in ms
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const waitForServer = async (maxAttempts = 5, interval = 2000) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await checkServerConnection();
    
    if (result.success) {
      return { success: true };
    }
    
    console.log(`Server connection attempt ${attempt + 1} failed, retrying in ${interval}ms...`);
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return { 
    success: false, 
    error: `Server unavailable after ${maxAttempts} attempts` 
  };
}; 