'use client';
import { useState, useEffect } from 'react';
import { Box, Grid, Card, Typography, Button, Snackbar, Alert, TextField, InputAdornment, Container, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  People as PeopleIcon,
  Class as ClassIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import LanguageToggle from '../../components/LanguageToggle';
import ThemeToggle from '../../components/ThemeToggle';
import { adminAPI } from '../../utils/api';
import Loading from '../../components/Loading';
import moment from 'moment';

// Custom hook to handle page scroll
const useScrollRestoration = () => {
  useEffect(() => {
    // Disable auto scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Reset scroll position when component mounts
    window.scrollTo(0, 0);
    
    return () => {
      // Re-enable auto scroll restoration when component unmounts
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);
};

// Helper function to format reschedule data
const formatRescheduleData = (reschedules) => {
  return reschedules.map(reschedule => {
    // Get the full student name
    const studentName = reschedule.student ? 
      `${reschedule.student.name} ${reschedule.student.surname || ''}`.trim() : 
      'Unknown Student';
    
    // Extract date and times for old class - use timezone-converted values if available
    const oldClassDate = reschedule.oldClass?.userDate || reschedule.oldClass?.date;

    // Format old and new times
    const oldTime = reschedule.oldClass?.userStartTime ? 
      `${reschedule.oldClass.userStartTime.substring(0, 5)}` : 
      reschedule.oldClass?.startTime ? 
        `${reschedule.oldClass.startTime.substring(0, 5)}` :
        '';
    
    const newTime = reschedule.newClass?.userStartTime ? 
      `${reschedule.newClass.userStartTime.substring(0, 5)}` : 
      reschedule.newClass?.startTime ? 
        `${reschedule.newClass.startTime.substring(0, 5)}` :
        '';
    
    // Format dates
    const oldDate = oldClassDate ? moment(oldClassDate).format('MMM DD, YYYY') : '';
    const newDate = (reschedule.newClass?.userDate || reschedule.newClass?.date) ? 
      moment(reschedule.newClass?.userDate || reschedule.newClass?.date).format('MMM DD, YYYY') : 
      '';
    
    // Get teacher information
    const oldTeacherName = reschedule.oldTeacherName || 
      (reschedule.oldTeacher ? 
        `${reschedule.oldTeacher.firstName} ${reschedule.oldTeacher.lastName || ''}`.trim() : 
        'Unknown');
        
    const newTeacherName = reschedule.newTeacherName || 
      (reschedule.newTeacher ? 
        `${reschedule.newTeacher.firstName} ${reschedule.newTeacher.lastName || ''}`.trim() : 
        'Unknown');
    
    // Determine if this is a different teacher reschedule
    const differentTeacher = reschedule.differentTeacher || 
      (oldTeacherName !== newTeacherName && 
       oldTeacherName !== 'Unknown' && 
       newTeacherName !== 'Unknown');
    
    return {
      id: reschedule.id,
      student: studentName,
      oldDate,
      oldTime,
      newDate, 
      newTime,
      reason: reschedule.reason,
      oldTeacher: oldTeacherName,
      newTeacher: newTeacherName,
      differentTeacher,
      userTimezone: reschedule.userTimezone,
      adminTimezone: reschedule.adminTimezone
    };
  });
};

const StatCard = ({ icon: Icon, title, value, color }) => {
  const { theme } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02, translateY: -3 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        minHeight: { xs: 110, sm: 130, md: 140 },
        borderRadius: 3,
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        backdropFilter: 'blur(10px)',
        color: 'white',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.3s ease',
        height: '100%',
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: { xs: 1.5, sm: 2, md: 2.5 } 
      }}>
        <Box sx={{
          bgcolor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          p: { xs: 1.2, sm: 1.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon sx={{ fontSize: { xs: 32, sm: 40, md: 48 } }} />
        </Box>
        <Box>
          <Typography 
            variant="body1"
            sx={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              mb: 0.5,
              fontWeight: 500,
              letterSpacing: '0.5px',
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="h3"
            sx={{ 
              color: 'white', 
              fontWeight: 700,
              letterSpacing: '0.5px',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '2.8rem' },
            }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

const RecentReschedules = ({ recentReschedules = [], onRefresh }) => {
  const { translations } = useLanguage();
  const { theme } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReschedules, setFilteredReschedules] = useState(recentReschedules);
  
  // Filter reschedules when searchTerm or recentReschedules change
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredReschedules(recentReschedules);
      return;
    }
    
    const lowercaseTerm = searchTerm.trim().toLowerCase();
    const filtered = recentReschedules.filter(reschedule => 
      reschedule.student.toLowerCase().includes(lowercaseTerm) || 
      reschedule.reason?.toLowerCase().includes(lowercaseTerm)
    );
    
    setFilteredReschedules(filtered);
  }, [searchTerm, recentReschedules]);

  return (
    <Card 
      sx={{ 
        mt: 4,
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        border: `1px solid ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
      }}
    >
      {/* Header with refresh button */}
      <Box sx={{ 
        p: { xs: 2, sm: 3 },
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        borderBottom: `1px solid ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
      }}>
        <Typography 
          variant="h5" 
          sx={{ 
            color: theme.text.primary,
            fontWeight: 600,
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}
        >
          {translations.recentRescheduledClasses}
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          width: { xs: '100%', sm: 'auto' },
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <TextField
            placeholder={translations.searchStudents || "Search students..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            size="small"
            sx={{
              minWidth: { xs: '100%', sm: '200px' },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: '0.9rem',
                backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: '1.2rem', color: theme.text.secondary }} />
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            sx={{
              borderRadius: 2,
              borderColor: 'rgba(132, 94, 194, 0.5)',
              color: theme?.text?.primary,
              height: 40,
              '&:hover': {
                borderColor: '#845EC2',
                backgroundColor: 'rgba(132, 94, 194, 0.08)',
              },
              ...(isMobile && {
                width: '100%',
              })
            }}
          >
            {translations.refresh || "Refresh"}
          </Button>
        </Box>
      </Box>
      
      {/* Reschedules content */}
      <Box sx={{ p: { xs: 0, sm: 0 } }}>
        {filteredReschedules.length > 0 ? (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: 0, sm: 0 },
          }}>
            {filteredReschedules.map((reschedule, index) => (
              <Box 
                key={reschedule.id || index}
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderBottom: `1px solid ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
                  borderRight: { 
                    xs: 'none', 
                    md: index % 2 === 0 ? `1px solid ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}` : 'none' 
                  },
                  backgroundColor: theme.mode === 'dark' ? 
                    (index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent') : 
                    (index % 2 === 0 ? 'rgba(0, 0, 0, 0.01)' : 'transparent'),
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    color: theme.text.primary,
                    mb: 1,
                    fontSize: { xs: '1rem', sm: '1.1rem' }
                  }}
                >
                  {reschedule.student}
                </Typography>
                
                <Box sx={{ 
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: { xs: 1, sm: 3 },
                  mt: 2
                }}>
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        color: theme.text.secondary, 
                        fontWeight: 500,
                        mb: 0.5,
                        fontSize: '0.8rem'
                      }}
                    >
                      {translations.from}:
                    </Typography>
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1
                    }}>
                      <Box sx={{
                        bgcolor: '#FFC107',
                        width: 4,
                        height: 36,
                        borderRadius: 1,
                        mr: 1.5
                      }} />
                      <Box>
                        <Typography sx={{ 
                          fontWeight: 500,
                          color: theme.text.primary,
                          fontSize: '0.95rem'
                        }}>
                          {reschedule.oldDate}
                        </Typography>
                        <Typography sx={{ 
                          color: theme.text.secondary,
                          fontSize: '0.85rem'
                        }}>
                          {reschedule.oldTime}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        color: theme.text.secondary, 
                        fontWeight: 500,
                        mb: 0.5,
                        fontSize: '0.8rem'
                      }}
                    >
                      {translations.to}:
                    </Typography>
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1
                    }}>
                      <Box sx={{
                        bgcolor: '#4CAF50',
                        width: 4,
                        height: 36,
                        borderRadius: 1,
                        mr: 1.5
                      }} />
                      <Box>
                        <Typography sx={{ 
                          fontWeight: 500,
                          color: theme.text.primary,
                          fontSize: '0.95rem'
                        }}>
                          {reschedule.newDate}
                        </Typography>
                        <Typography sx={{ 
                          color: theme.text.secondary,
                          fontSize: '0.85rem'
                        }}>
                          {reschedule.newTime}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                
                {reschedule.differentTeacher && (
                  <Box sx={{ mt: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '0.85rem',
                        color: theme.palette?.success?.main || '#4CAF50',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ marginRight: '4px' }}>👨‍🏫</span> Teacher change: {reschedule.oldTeacher} → {reschedule.newTeacher}
                    </Typography>
                  </Box>
                )}
                
                {reschedule.reason && (
                  <Box sx={{ mt: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '0.85rem',
                        color: theme.text.secondary,
                        fontStyle: 'italic',
                        borderLeft: `3px solid ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
                        pl: 1.5,
                        py: 0.5,
                      }}
                    >
                      "{reschedule.reason}"
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ 
            p: 4, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flexDirection: 'column',
            gap: 2
          }}>
            <HistoryIcon sx={{ 
              fontSize: 60, 
              color: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' 
            }} />

            <Typography variant="body1" sx={{ color: theme.text.secondary }}>
              {searchTerm.trim() !== '' 
                ? (translations.noSearchResults || 'No students found matching your search')
                : (translations.noRecentReschedules || 'No recent reschedules')}
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  // Apply scroll restoration
  useScrollRestoration();
  
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    activePackages: 0,
    classesToday: 0,
    recentReschedules: []
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({
    open: false,
    text: '',
    severity: 'success'
  });
  
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        
        // Get dashboard stats
        const statsData = await adminAPI.getDashboardStats();
        
        // Get reschedule data separately to ensure complete data
        const reschedules = await adminAPI.getRescheduledClasses();
        
        // Format the reschedule data
        const formattedReschedules = formatRescheduleData(reschedules);
        
        // Combine all data
        setDashboardData({
          ...statsData,
          recentReschedules: formattedReschedules
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboardStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshReschedules = async () => {
    try {
      setLoading(true);
      
      // Get reschedule data
      const reschedules = await adminAPI.getRescheduledClasses();
      
      // Format the reschedule data
      const formattedReschedules = formatRescheduleData(reschedules);
      
      // Update dashboard data
      setDashboardData(prev => ({
        ...prev,
        recentReschedules: formattedReschedules
      }));
      
      // Show success message
      setMessage({
        open: true,
        text: translations.rescheduleDataRefreshed || 'Reschedule data refreshed successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error refreshing reschedule data:', error);
      
      // Show error message
      setMessage({
        open: true,
        text: `${translations.errorRefreshingReschedules || 'Error refreshing reschedules'}: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMessage = () => {
    setMessage({ ...message, open: false });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <Container maxWidth="xl" sx={{ 
      py: { xs: 2, sm: 3, md: 4 },
    }}>
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: { xs: 3, sm: 4 },
        gap: { xs: 2, sm: 0 },
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: theme.text.primary,
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '1.7rem', md: '1.9rem' },
          }}
        >
          {translations.dashboardOverview}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1.5, sm: 2 },
          flexWrap: 'wrap',
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'space-between', sm: 'flex-end' },
        }}>
          <ThemeToggle />
          <LanguageToggle />
        </Box>
      </Box>
      
      {/* Content Section */}
      <Box>
        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard 
              icon={PeopleIcon}
              title={translations.totalStudents}
              value={dashboardData.totalStudents}
              color="#845EC2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard 
              icon={ClassIcon}
              title={translations.activePackages}
              value={dashboardData.activePackages}
              color="#D65DB1"
            />
          </Grid>
          <Grid item xs={12} sm={12} md={4}>
            <StatCard 
              icon={ScheduleIcon}
              title={translations.classesToday}
              value={dashboardData.classesToday}
              color="#FF6F91"
            />
          </Grid>
        </Grid>

        <RecentReschedules 
          recentReschedules={dashboardData.recentReschedules || []} 
          onRefresh={handleRefreshReschedules}
        />
      </Box>

      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={handleCloseMessage}
        anchorOrigin={{ 
          vertical: 'bottom', 
          horizontal: 'center' 
        }}
        sx={{
          width: { xs: '90%', sm: 'auto' },
          bottom: { xs: 16, sm: 24 }
        }}
      >
        <Alert 
          onClose={handleCloseMessage} 
          severity={message.severity}
          sx={{
            width: '100%',
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            borderRadius: 2,
          }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Container>
  );
}
