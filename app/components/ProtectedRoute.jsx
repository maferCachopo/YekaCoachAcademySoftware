'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import Loading from './Loading';

/**
 * A wrapper component that protects routes based on authentication and roles
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - The child components to render if authenticated
 * @param {Array<string>} props.roles - Optional array of roles that can access this route
 * @param {string} props.redirectTo - Where to redirect if not authenticated or not authorized
 * @param {string} props.loadingMessage - Message to display while checking auth status
 */
export default function ProtectedRoute({
  children,
  roles = [],
  redirectTo = null, // Will be determined dynamically
  loadingMessage = 'Checking authentication...',
}) {
  const { user, isAuthenticated, loading, initializing } = useAuth();
  const router = useRouter();
  const notify = useNotify();
  const { translations } = useLanguage();

  useEffect(() => {
    // Skip during initialization phase, handled by AuthProvider
    if (initializing) return;

    if (!loading) {
      if (!isAuthenticated) {
        // User is not authenticated, redirect to appropriate login
        notify?.error(translations?.sessionExpired || 'Your session has expired. Please log in again.');
        
        // Determine redirect URL based on required roles
        const shouldUseInternalLogin = roles.some(role => 
          ['admin', 'teacher', 'coordinator'].includes(role)
        );
        
        const loginPath = shouldUseInternalLogin ? '/internal-login' : '/login';
        router.push(redirectTo || loginPath);
        return;
      }

      // Check if user has required role or is a teacher with coordinator access for coordinator routes
      const hasRequiredRole = roles.length === 0 || 
        roles.includes(user?.role) || 
        (roles.includes('coordinator') && user?.role === 'teacher' && user?.teacher?.isCoordinator);

      if (!hasRequiredRole) {
        // User is authenticated but doesn't have the required role
        notify?.error(translations?.unauthorized || 'You are not authorized to access this page.');
        
        // Redirect based on user role
        if (user?.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (user?.role === 'student') {
          router.push('/student/dashboard');
        } else if (user?.role === 'coordinator') {
          router.push('/coordinator/dashboard');
        } else if (user?.role === 'teacher') {
          // Check if teacher has coordinator flag
          if (user?.teacher?.isCoordinator) {
            router.push('/coordinator/dashboard');
          } else {
            router.push('/teacher/dashboard');
          }
        } else {
          // Determine redirect URL based on required roles for unauthorized access
          const shouldUseInternalLogin = roles.some(role => 
            ['admin', 'teacher', 'coordinator'].includes(role)
          );
          
          const loginPath = shouldUseInternalLogin ? '/internal-login' : '/login';
          router.push(redirectTo || loginPath);
        }
      }
    }
  }, [isAuthenticated, loading, initializing, user, roles, router, redirectTo, notify, translations]);

  // Show loading while authentication is being checked
  if (loading || initializing) {
    return <Loading message={loadingMessage} />;
  }

  // Check if user has required role or is a teacher with coordinator access for coordinator routes
  const hasRequiredRole = roles.length === 0 || 
    roles.includes(user?.role) || 
    (roles.includes('coordinator') && user?.role === 'teacher' && user?.teacher?.isCoordinator);

  // If user doesn't have required role, show unauthorized message (redirect is handled in useEffect)
  if (!hasRequiredRole) {
    return <Loading message={translations?.unauthorized || 'Unauthorized access'} />;
  }

  // User is authenticated and authorized, render the children
  return <>{children}</>;
} 