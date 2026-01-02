'use client';
import { 
  Box, 
  Typography, 
  Card, 
  Chip,
  Divider
} from '@mui/material';
import { 
  History as HistoryIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  Check as CheckIcon,
  Inventory as PackageIcon
} from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import moment from 'moment';
import 'moment-timezone';
import { timezoneUtils } from '../../../utils/api';
import { ADMIN_TIMEZONE } from '../../../utils/constants';
import { useAuth } from '../../../contexts/AuthContext';
import { getCookie, COOKIE_NAMES } from '../../../utils/cookieUtils';

const HistoryTab = ({ allClasses, studentData }) => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || { mode: 'light' }; // Add fallback
  const { translations } = useLanguage();
  const { user } = useAuth();
  
  // Get user's timezone
  const userTimezone = user?.timezone || getCookie(COOKIE_NAMES.TIMEZONE);
  
  // Filter classes with "attended" status
  const attendedClasses = allClasses ? allClasses.filter(cls => cls.status === 'attended') : [];

  // Function to get package name by package ID
  const getPackageName = (packageId) => {
    if (!studentData.packages || !studentData.packages.length) return 'Unknown Package';
    
    const foundPackage = studentData.packages.find(pkg => pkg.id === packageId);
    return foundPackage ? foundPackage.package.name : 'Unknown Package';
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ 
        color: theme.text.primary,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 2
      }}>
        <HistoryIcon sx={{ color: '#845EC2' }} />
        {translations.completedClasses || 'Completed Classes'}
      </Typography>
      
      {attendedClasses && attendedClasses.length > 0 ? (
        attendedClasses.map((cls, index) => (
          <Card
            key={cls.id || `completed-${index}`}
            sx={{
              mb: 2,
              p: 2,
              background: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
              border: theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ color: theme.text.primary, fontWeight: 600 }}>
                {cls.classDetail?.title || 'Class'}
              </Typography>
              <Chip 
                size="small" 
                icon={<CheckIcon />} 
                label={translations.completed || "Completed"} 
                color="success" 
                sx={{ height: 24 }} 
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarIcon sx={{ color: '#845EC2', mr: 1, fontSize: '1rem' }} />
                <Typography variant="body2" sx={{ color: theme.text.secondary }}>
                  {cls.classDetail?.date ? moment(cls.classDetail.date).tz(userTimezone).format('MMM D, YYYY') : 'Date not available'}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimeIcon sx={{ color: '#D65DB1', mr: 1, fontSize: '1rem' }} />
                <Typography variant="body2" sx={{ color: theme.text.secondary }}>
                  {cls.classDetail?.date && cls.classDetail?.startTime && cls.classDetail?.endTime ? 
                    `${timezoneUtils.convertToUserTime(cls.classDetail.date, cls.classDetail.startTime, ADMIN_TIMEZONE, userTimezone).format('h:mm A')} - ${timezoneUtils.convertToUserTime(cls.classDetail.date, cls.classDetail.endTime, ADMIN_TIMEZONE, userTimezone).format('h:mm A')}` : 'Time not available'}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PackageIcon sx={{ color: '#845EC2', mr: 1, fontSize: '1rem' }} />
              <Typography variant="body2" sx={{ color: theme.text.secondary }}>
                {translations.package || 'Package'}: {getPackageName(cls.studentPackageId)}
              </Typography>
            </Box>

            <Divider sx={{ my: 1 }} />
            
            <Typography variant="body2" sx={{ color: theme.text.secondary, fontWeight: 500 }}>
              {translations.feedback || 'Feedback'}:
            </Typography>
            <Typography variant="body2" sx={{ color: theme.text.primary, mt: 0.5 }}>
              {cls.feedback || translations.noFeedback || 'No feedback provided'}
            </Typography>
          </Card>
        ))
      ) : (
        <Box sx={{ 
          p: 3, 
          textAlign: 'center',
          background: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
          borderRadius: 2
        }}>
          <Typography variant="body1" sx={{ color: theme.text.secondary }}>
            {translations.noCompletedClasses || 'No completed classes yet'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default HistoryTab; 