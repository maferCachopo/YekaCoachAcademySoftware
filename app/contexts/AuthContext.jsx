'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, timezoneUtils } from '../utils/api';
import { useRouter, usePathname } from 'next/navigation';
import { 
  getToken, 
  getUser, 
  storeToken, 
  storeUser, 
  clearAuthData,
  isTokenExpired,
  isAuthenticated
} from '../utils/tokenUtils';
import { ADMIN_TIMEZONE } from '../constants/styleConstants';
import { getCookie, setCookie, COOKIE_NAMES } from '../utils/cookieUtils';
import Loading from '../components/Loading';
import { useNotify } from './NotificationContext';
import { useLanguage } from './LanguageContext';

// Create the auth context
const AuthContext = createContext();

// Hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}

// Auth provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const notify = useNotify();
  const { translations } = useLanguage();

  // Load user from storage on initial load
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check if we have a stored user
        const storedUser = getUser();
        console.log('DEBUG - AuthContext - Stored user from getUser():', storedUser);
        
        // Check for timezone in cookies
        const cookieTimezone = getCookie(COOKIE_NAMES.TIMEZONE);
        
        // If no timezone is set in cookies, set it to admin timezone
        if (!cookieTimezone) {
          console.log('DEBUG - AuthContext - Setting default admin timezone:', ADMIN_TIMEZONE);
          setCookie(COOKIE_NAMES.TIMEZONE, ADMIN_TIMEZONE);
        }
        
        if (storedUser) {
          // Always override user timezone with cookie timezone if available
          if (cookieTimezone) {
            console.log('DEBUG - Overriding user timezone with cookie timezone:', cookieTimezone);
            storedUser.timezone = cookieTimezone;
            // Update stored user with timezone
            storeUser(storedUser, localStorage.getItem('token') !== null);
          }
          
          console.log('DEBUG - AuthContext - Setting user from storage with teacherId:', storedUser.teacherId);
          setUser(storedUser);
        } else {
          // Try to fetch current user if token exists but no stored user
          const token = getToken();
          
          if (token && !isTokenExpired()) {
            try {
              console.log('DEBUG - AuthContext - Fetching current user with token');
              const userData = await authAPI.getCurrentUser();
              console.log('DEBUG - AuthContext - Received user data from API:', userData);
              
              // If we have a timezone in cookies but not in user data, add it
              if (cookieTimezone && !userData.timezone) {
                userData.timezone = cookieTimezone;
                // Also update on the server
                try {
                  await authAPI.updateTimezone(cookieTimezone);
                } catch (tzErr) {
                  console.error("Failed to update timezone on server:", tzErr);
                }
              }
              
              setUser(userData);
              
              // Store user in the same storage as the token
              storeUser(userData, localStorage.getItem('token') !== null);
            } catch (fetchErr) {
              console.error("DEBUG - AuthContext - Failed to fetch current user:", fetchErr);
              // Check if account is inactive
              if (fetchErr.error === 'account_inactive') {
                clearAuthData();
                notify?.error(translations?.accountInactive || 'Your account has been deactivated by the administrator.');
                router.push('/login');
              } else {
                throw fetchErr;
              }
            }
          }
        }
      } catch (err) {
        console.error("DEBUG - AuthContext - Failed to load user:", err);
        // Clear potentially invalid tokens
        clearAuthData();
        
        if (err.message === 'Session expired') {
          notify?.info(translations?.sessionExpired || 'Your session has expired. Please log in again.');
        }
      } finally {
        setInitializing(false);
      }
    };

    loadUser();
  }, [notify, translations]);

  // Login function
  const login = async (credentials, rememberMe, loginType = null) => {
    setLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      console.log('LOGIN DEBUG - Login attempt with username:', credentials.username);
      const response = await authAPI.login(credentials, loginType);
      const { token, user } = response;
      
      console.log('LOGIN DEBUG - Login successful, received user:', {
        id: user.id,
        username: user.username,
        role: user.role,
        hasStudentData: !!user.student
      });
      
      // If this is a student but missing student data, fetch it
      if (user.role === 'student' && !user.student) {
        console.log('LOGIN DEBUG - Student user is missing student data, fetching it');
        try {
          // Fetch current user which should include student data
          const currentUserData = await authAPI.getCurrentUser();
          console.log('LOGIN DEBUG - Fetched current user with student data:', {
            userId: currentUserData.id,
            studentId: currentUserData.student?.id
          });
          
          // Use the enhanced user data with student information
          if (currentUserData.student) {
            user.student = currentUserData.student;
          }
        } catch (err) {
          console.error('LOGIN DEBUG - Failed to fetch student data:', err);
          // Check if the account is inactive
          if (err.error === 'account_inactive') {
            const errorMessage = err.message || translations?.accountInactive || 'Your account has been deactivated by the administrator.';
            setError(errorMessage);
            return { success: false, error: errorMessage };
          }
        }
      }
      
      // Store token and user
      storeToken(token, rememberMe);
      storeUser(user, rememberMe);
      
      setUser(user);
      
      // Redirect based on role and coordinator flag
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'student') {
        router.push('/student/dashboard');
      } else if (user.role === 'coordinator') {
        router.push('/coordinator/dashboard');
      } else if (user.role === 'teacher') {
        // Check if teacher has coordinator flag
        if (user.teacher?.isCoordinator) {
          router.push('/coordinator/dashboard');
        } else {
          router.push('/teacher/dashboard');
        }
      }
      
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || translations?.loginFailed || 'Login failed. Please try again.';
      
      // Don't set error in context for WRONG_PORTAL cases - let login component handle it
      if (!err.data || err.data.code !== 'WRONG_PORTAL') {
        setError(errorMessage);
      }
      
      // Include the error code if available
      const result = { success: false, error: errorMessage };
      if (err.data && err.data.code) {
        result.code = err.data.code;
      }
      
      return result;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    
    // Store user role before clearing auth data
    const userRole = user?.role;
    
    try {
      await authAPI.logout();
      
      // Show logout success notification
      notify?.success(translations?.logoutSuccess || 'You have been successfully logged out.');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear storage regardless of API call success
      clearAuthData();
      
      setUser(null);
      setLoading(false);
      
      // Redirect based on user role
      if (userRole === 'admin' || userRole === 'teacher' || userRole === 'coordinator') {
        router.push('/internal-login');
      } else {
        router.push('/login');
      }
    }
  };

  // Change password function
  const changePassword = async (passwordData) => {
    setLoading(true);
    setError(null);
    
    try {
      await authAPI.changePassword(passwordData);
      
      // Show success notification
      notify?.success(translations?.passwordChangeSuccess || 'Password changed successfully!');
      
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || translations?.changePasswordFailed || 'Failed to change password';
      setError(errorMessage);
      
      // Show error notification
      notify?.error(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update user timezone
  const updateTimezone = async (timezone) => {
    setLoading(true);
    setError(null);
    
    try {
      // Always store in cookie for persistence across sessions
      setCookie(COOKIE_NAMES.TIMEZONE, timezone);
      
      // Also store in localStorage for backward compatibility
      if (typeof window !== 'undefined') {
        localStorage.setItem('yekacoucha_timezone', timezone);
      }
      
      // Update on server if user is logged in
      if (user) {
        await authAPI.updateTimezone(timezone);
        
        // Update user object
        setUser({
          ...user,
          timezone
        });
        
        // Update stored user
        const updatedUser = {
          ...user,
          timezone
        };
        storeUser(updatedUser, localStorage.getItem('token') !== null);
      }
      
      // Show success notification
      notify?.success(translations?.timezoneUpdateSuccess || 'Timezone updated successfully!');
      
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || translations?.timezoneUpdateFailed || 'Failed to update timezone';
      setError(errorMessage);
      
      // Show error notification
      notify?.error(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Auth context value
  const value = {
    user,
    setUser,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    isAuthenticated: isAuthenticated() && !!user,
    loading,
    initializing,
    error,
    login,
    logout,
    changePassword,
    updateTimezone,
  };

  // Check if we're on the landing page (root path) or login pages
  const isLandingPage = pathname === '/';
  const isLoginPage = pathname === '/login';
  const isInternalLoginPage = pathname === '/internal-login';
  
  // Only show the loading component during the application's initial loading
  // And don't show it on the landing page or login pages to prevent flickering
  // Add a check for window to ensure this only runs on client-side
  if (initializing && !isLoginPage && !isLandingPage && !isInternalLoginPage && typeof window !== 'undefined') {
    // Use a consistent message on both client and server to avoid hydration issues
    return <Loading message="Initializing application..." />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext; 