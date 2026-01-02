'use client';
import Layout from '@/app/components/Layout/Layout';
import { Box, Typography } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import TimezoneToggle from '../components/TimezoneToggle';

export default function StudentLayout({ children }) {
  const { theme } = useTheme();

  return (
    <Layout role="student">
      <Box sx={{ 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          mb: 1
        }}>
          <ThemeToggle />
          <LanguageToggle />
          <TimezoneToggle />
        </Box>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 2,
          ml: { xs: 1, sm: 3 },
          flexWrap: 'wrap'
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 1,
            backgroundColor: theme.isDark ? 'rgba(132, 94, 194, 0.2)' : '#845EC220'
          }}>
            <Box sx={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              backgroundColor: '#845EC2' 
            }} />
            <Typography variant="caption" sx={{ color: theme.text.primary }}>
              Can Reschedule
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 1,
            backgroundColor: theme.isDark ? 'rgba(255, 111, 145, 0.2)' : '#FF6F9120'
          }}>
            <Box sx={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              backgroundColor: '#FF6F91' 
            }} />
            <Typography variant="caption" sx={{ color: theme.text.primary }}>
              Cannot Reschedule
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 1,
            backgroundColor: theme.isDark ? 'rgba(255, 215, 0, 0.2)' : '#FFD70020'
          }}>
            <Box sx={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              backgroundColor: '#FFD700' 
            }} />
            <Typography variant="caption" sx={{ color: theme.text.primary }}>
              Class Passed
            </Typography>
          </Box>
        </Box>
        {children}
      </Box>
    </Layout>
  );
}