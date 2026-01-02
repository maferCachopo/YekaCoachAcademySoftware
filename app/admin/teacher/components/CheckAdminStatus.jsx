'use client';
import { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, Alert } from '@mui/material';
import { useAuth } from '@/app/contexts/AuthContext';
import { fetchWithAuth } from '@/app/utils/api';

export default function CheckAdminStatus() {
  const { user } = useAuth();
  const [authStatus, setAuthStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkAuth = async () => {
    setLoading(true);
    try {
      // Check if we have a user and what role they have
      const token = localStorage.getItem('token');
      const userJson = localStorage.getItem('user');
      const sessionToken = sessionStorage.getItem('token');
      const sessionUser = sessionStorage.getItem('user');

      // Test API connection
      const testResult = await fetchWithAuth('/ping');

      setAuthStatus({
        user,
        hasToken: !!token,
        token: token ? token.substring(0, 15) + '...' : null,
        userStored: userJson ? JSON.parse(userJson) : null,
        hasSessionToken: !!sessionToken,
        sessionToken: sessionToken ? sessionToken.substring(0, 15) + '...' : null,
        sessionUser: sessionUser ? JSON.parse(sessionUser) : null,
        apiTest: testResult
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthStatus({
        error: error.message || 'Failed to check auth status',
        errorDetails: error
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: 3, mb: 3, maxWidth: 800 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Admin Authentication Status</Typography>
      
      <Button 
        variant="contained" 
        onClick={checkAuth} 
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? 'Checking...' : 'Check Auth Status'}
      </Button>
      
      {authStatus && (
        <Box sx={{ mt: 2 }}>
          <Alert severity={authStatus.error ? 'error' : 'info'} sx={{ mb: 2 }}>
            {authStatus.error 
              ? `Auth check failed: ${authStatus.error}` 
              : 'Auth check completed'}
          </Alert>
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Current User:</Typography>
          <pre style={{ backgroundColor: '#f5f5f5', padding: 10, overflow: 'auto', maxHeight: 200 }}>
            {JSON.stringify(authStatus.user, null, 2)}
          </pre>
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Local Storage:</Typography>
          <Typography variant="body2">Has Token: {authStatus.hasToken ? 'Yes' : 'No'}</Typography>
          {authStatus.token && (
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              Token: {authStatus.token}
            </Typography>
          )}
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Local Storage User:</Typography>
          <pre style={{ backgroundColor: '#f5f5f5', padding: 10, overflow: 'auto', maxHeight: 200 }}>
            {JSON.stringify(authStatus.userStored, null, 2)}
          </pre>
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Session Storage:</Typography>
          <Typography variant="body2">Has Token: {authStatus.hasSessionToken ? 'Yes' : 'No'}</Typography>
          {authStatus.sessionToken && (
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              Token: {authStatus.sessionToken}
            </Typography>
          )}
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Session Storage User:</Typography>
          <pre style={{ backgroundColor: '#f5f5f5', padding: 10, overflow: 'auto', maxHeight: 200 }}>
            {JSON.stringify(authStatus.sessionUser, null, 2)}
          </pre>
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>API Test:</Typography>
          <pre style={{ backgroundColor: '#f5f5f5', padding: 10, overflow: 'auto', maxHeight: 200 }}>
            {JSON.stringify(authStatus.apiTest, null, 2)}
          </pre>
        </Box>
      )}
    </Card>
  );
}