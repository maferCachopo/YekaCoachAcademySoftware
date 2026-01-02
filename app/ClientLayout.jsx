'use client';
import React, { useState, useEffect } from 'react';
import { checkServerConnection } from './utils/serverCheck';
import Loading from './components/Loading';
import { usePathname } from 'next/navigation';

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const [serverStatus, setServerStatus] = useState({
    checking: true,
    connected: false,
    error: null
  });
  
  // Add timeout to prevent infinite loading
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Skip server check for landing page
  const shouldSkipServerCheck = pathname === '/' || pathname === '';

  useEffect(() => {
    // Skip the server check for landing page (home route)
    if (shouldSkipServerCheck) {
      setServerStatus({
        checking: false,
        connected: true,
        error: null
      });
      return;
    }

    const checkServer = async () => {
      try {
        const result = await checkServerConnection();
        console.log('Server check result:', result);
        
        setServerStatus({
          checking: false,
          connected: result.success,
          error: result.success ? null : (result.error || 'Failed to connect to the server')
        });
      } catch (error) {
        console.error('Server check error:', error);
        setServerStatus({
          checking: false,
          connected: false,
          error: error.message || 'An unexpected error occurred'
        });
      }
    };

    checkServer();
    
    // Increase timeout from 5 to 10 seconds to allow more time for server to start
    const timeoutId = setTimeout(() => {
      console.log('Timeout reached, continuing to app');
      setTimeoutReached(true);
    }, 10000);
    
    return () => clearTimeout(timeoutId);
  }, [shouldSkipServerCheck, pathname]);

  const handleRetry = () => {
    setServerStatus({
      checking: true,
      connected: false,
      error: null
    });
    setTimeoutReached(false);
    
    // Trigger check again
    checkServerConnection().then(result => {
      setServerStatus({
        checking: false,
        connected: result.success,
        error: result.success ? null : (result.error || 'Failed to connect to the server')
      });
    }).catch(error => {
      setServerStatus({
        checking: false,
        connected: false,
        error: error.message || 'An unexpected error occurred'
      });
    });
    
    // Increase timeout for retry to 10 seconds
    setTimeout(() => {
      setTimeoutReached(true);
    }, 10000);
  };

  // If landing page or timeout reached, render children anyway
  if (shouldSkipServerCheck || timeoutReached) {
    return children;
  }

  // If still checking, show loading state
  if (serverStatus.checking) {
    return <Loading message="Connecting to server..." />;
  }

  // If connection failed, show error with retry
  if (!serverStatus.connected) {
    return (
      <Loading 
        error={{ message: serverStatus.error }} 
        onRetry={handleRetry} 
        onContinue={() => setTimeoutReached(true)}
      />
    );
  }

  // If connected, render the children
  return children;
} 