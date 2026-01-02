'use client';
import { 
  Box, 
  Typography, 
  Card, 
  Chip,
  Divider,
  Paper
} from '@mui/material';
import { 
  Inventory as PackageIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  LocalOffer as LocalOfferIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import moment from 'moment';
import 'moment-timezone';
import { useAuth } from '../../../contexts/AuthContext';
import { getCookie, COOKIE_NAMES } from '../../../utils/cookieUtils';

const PackageHistoryTab = ({ studentData }) => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || { mode: 'light' }; // Add fallback
  const { translations } = useLanguage();
  const { user } = useAuth();
  
  // Get user's timezone
  const userTimezone = user?.timezone || getCookie(COOKIE_NAMES.TIMEZONE);
  
  // Get all packages from student data
  const packages = studentData?.packages || [];

  return (
    <Box sx={{ 
      maxHeight: '70vh', 
      overflow: 'auto',
      pr: 1,
      // Custom scrollbar
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: theme.mode === 'light' ? '#f1f1f1' : '#2d2d2d',
        borderRadius: '10px',
      },
      '&::-webkit-scrollbar-thumb': {
        background: theme.mode === 'light' ? '#c1c1c1' : '#555',
        borderRadius: '10px',
      },
      '&::-webkit-scrollbar-thumb:hover': {
        background: theme.mode === 'light' ? '#a1a1a1' : '#777',
      },
    }}>
      <Typography variant="h6" sx={{ 
        color: theme.text.primary,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 2,
        position: 'sticky',
        top: 0,
        backgroundColor: theme.mode === 'light' ? '#fff' : theme.background.paper,
        zIndex: 10,
        py: 1
      }}>
        <PackageIcon sx={{ color: '#845EC2' }} />
        {translations.packageHistory || 'Package History'}
      </Typography>
      
      {packages && packages.length > 0 ? (
        packages.map((pkg, index) => (
          <Card
            key={pkg.id || `package-${index}`}
            sx={{
              mb: 3,
              p: 2,
              background: pkg.status === 'active' 
                ? (theme.mode === 'light' ? 'rgba(132, 94, 194, 0.05)' : 'rgba(132, 94, 194, 0.15)')
                : (theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)'),
              border: pkg.status === 'active'
                ? '1px solid rgba(132, 94, 194, 0.3)'
                : (theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)'),
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Status indicator */}
            {pkg.status === 'active' && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'linear-gradient(135deg, transparent 70%, rgba(132, 94, 194, 0.1) 70%)',
              }} />
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
              <Typography variant="h6" sx={{ color: theme.text.primary, fontWeight: 600 }}>
                {pkg.package?.name || 'Package'}
              </Typography>
              <Chip 
                size="small" 
                icon={pkg.status === 'active' ? <CheckCircleIcon /> : <EventIcon />} 
                label={pkg.status === 'active' ? (translations.active || "Active") : (translations.completed || "Completed")} 
                color={pkg.status === 'active' ? "primary" : "default"} 
                sx={{ 
                  height: 24,
                  backgroundColor: pkg.status === 'active' ? 'rgba(132, 94, 194, 0.2)' : undefined,
                  color: pkg.status === 'active' ? '#845EC2' : undefined,
                }} 
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                backgroundColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                borderRadius: 1,
                px: 1.5,
                py: 0.5
              }}>
                <CalendarIcon sx={{ color: '#845EC2', mr: 1, fontSize: '1rem' }} />
                <Typography variant="body2" sx={{ color: theme.text.secondary }}>
                  {pkg.startDate ? moment(pkg.startDate).tz(userTimezone).format('MMM D, YYYY') : 'Start date not available'} 
                  <ArrowForwardIcon sx={{ fontSize: '0.8rem', mx: 0.5, verticalAlign: 'middle' }} />
                  {pkg.endDate ? moment(pkg.endDate).tz(userTimezone).format('MMM D, YYYY') : 'End date not available'}
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                backgroundColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                borderRadius: 1,
                px: 1.5,
                py: 0.5
              }}>
                <LocalOfferIcon sx={{ color: '#D65DB1', mr: 1, fontSize: '1rem' }} />
                <Typography variant="body2" sx={{ color: theme.text.secondary }}>
                  {translations.totalClasses || 'Total Classes'}: {pkg.totalClasses || pkg.package?.totalClasses || 'N/A'}
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 1.5 }} />

            
            {pkg.notes && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="body2" sx={{ color: theme.text.secondary, fontWeight: 500 }}>
                  {translations.notes || 'Notes'}:
                </Typography>
                <Typography variant="body2" sx={{ color: theme.text.primary, mt: 0.5 }}>
                  {pkg.notes}
                </Typography>
              </>
            )}
          </Card>
        ))
      ) : (
        <Paper sx={{ 
          p: 3, 
          textAlign: 'center',
          background: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
          borderRadius: 2
        }}>
          <Typography variant="body1" sx={{ color: theme.text.secondary }}>
            {translations.noPackageHistory || 'No package history available'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default PackageHistoryTab;