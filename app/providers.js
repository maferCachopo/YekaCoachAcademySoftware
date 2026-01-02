'use client';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProviderWrapper } from './contexts/NotificationContext';

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <NotificationProviderWrapper>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NotificationProviderWrapper>
      </LanguageProvider>
    </ThemeProvider>
  );
} 