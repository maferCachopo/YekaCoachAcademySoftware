'use client';
import { 
  Box, 
  Typography, 
  Card, 
  Grid, 
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import { 
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  ShowChart as ProgressIcon,
  Inventory as PackageIcon,
  CalendarMonth as CalendarIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { COMMON_TRANSITION } from '../../../constants/styleConstants';
import { fetchWithAuth } from '../../../utils/api';
import TimezoneSelector from '../../../components/TimezoneSelector';
import moment from 'moment';

const PersonalInfoTab = ({ studentData, futureClasses, remainingReschedules, remainingClasses }) => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || { mode: 'light' }; // Add fallback
  const { translations } = useLanguage();
  const { user, setUser } = useAuth();
  
  // WhatsApp handler
  const handleWhatsAppContact = () => {
    // WhatsApp API URL with predefined message
    const phoneNumber = "ACADEMIC_DIRECTION_NUMBER"; // Replace with actual number
    const message = encodeURIComponent(`Hello, I'm ${studentData.name} ${studentData.surname}, a student at Yekacouchacademy.`);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };
  
  // Timezone update handler
  const handleTimezoneChange = async (newTimezone) => {
    try {
      const response = await fetchWithAuth('/auth/update-timezone', {
        method: 'POST',
        body: JSON.stringify({ timezone: newTimezone })
      });
      
      // Update the user in context with the new timezone
      if (response && response.timezone && setUser) {
        setUser({
          ...user,
          timezone: response.timezone
        });
      }
    } catch (error) {
      console.error('Failed to update timezone:', error);
    }
  };

  return (
    <>
      {/* Contact Information */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ 
          color: theme.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          transition: COMMON_TRANSITION
        }}>
          <PersonIcon sx={{ color: '#845EC2' }} />
          {translations.contactInformation || 'Contact Information'}
        </Typography>
        
        <Card sx={{ 
          p: 2,
          background: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
          border: theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
          transition: COMMON_TRANSITION
        }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <List disablePadding>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <EmailIcon sx={{ color: '#845EC2' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Typography variant="body2" color={theme.text.secondary} sx={{ transition: COMMON_TRANSITION }}>{translations.email || 'Email'}</Typography>}
                    secondary={<Typography variant="body1" color={theme.text.primary} sx={{ transition: COMMON_TRANSITION }}>{studentData.email || studentData.user?.email || '-'}</Typography>}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} sm={4}>
              <List disablePadding>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <PhoneIcon sx={{ color: '#D65DB1' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Typography variant="body2" color={theme.text.secondary} sx={{ transition: COMMON_TRANSITION }}>{translations.phone || 'Phone'}</Typography>}
                    secondary={<Typography variant="body1" color={theme.text.primary} sx={{ transition: COMMON_TRANSITION }}>{studentData.phone || '-'}</Typography>}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} sm={4}>
              <List disablePadding>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <LocationIcon sx={{ color: '#FF6F91' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Typography variant="body2" color={theme.text.secondary} sx={{ transition: COMMON_TRANSITION }}>{translations.location || 'Location'}</Typography>}
                    secondary={<Typography variant="body1" color={theme.text.primary} sx={{ transition: COMMON_TRANSITION }}>{(studentData.city && studentData.country) ? `${studentData.city}, ${studentData.country}` : '-'}</Typography>}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} sm={4}>
              <List disablePadding>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <CalendarIcon sx={{ color: '#FFBA08' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Typography variant="body2" color={theme.text.secondary} sx={{ transition: COMMON_TRANSITION }}>{translations.birthDate || 'Birth Date'}</Typography>}
                    secondary={<Typography variant="body1" color={theme.text.primary} sx={{ transition: COMMON_TRANSITION }}>{studentData.birthDate ? new Date(studentData.birthDate).toISOString().split('T')[0] : '-'}</Typography>}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
          
          {/* Timezone Selector */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="body2" sx={{ 
              color: theme.text.secondary, 
              fontWeight: 500, 
              mb: 1, 
              transition: COMMON_TRANSITION 
            }}>
              {translations.timezone || 'Timezone'}
            </Typography>
            <TimezoneSelector 
              value={user?.timezone} 
              onChange={handleTimezoneChange} 
            />
          </Box>
          
          {/* WhatsApp Contact Button */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<WhatsAppIcon />}
              onClick={handleWhatsAppContact}
              sx={{
                backgroundColor: '#25D366', // WhatsApp green
                '&:hover': {
                  backgroundColor: '#128C7E', // Darker WhatsApp green
                },
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 'medium',
                color: '#fff',
                boxShadow: '0 2px 10px rgba(37, 211, 102, 0.3)',
              }}
            >
              {translations.contactAcademicDirection || 'Contact Academic Direction'}
            </Button>
          </Box>
        </Card>
      </Box>

      {/* Package Info Cards */}
      {studentData && studentData.packages && studentData.packages.length > 0 && (
        <Grid container spacing={2}>
          {/* First card for package details */}
          <Grid item xs={12} md={6}>
            <Box>
              <Card sx={{ 
                p: 3, 
                background: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                border: theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
                transition: COMMON_TRANSITION
              }}>
                <Typography variant="h6" sx={{ 
                  color: theme.text.primary, 
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  transition: COMMON_TRANSITION
                }}>
                  <PackageIcon sx={{ color: '#845EC2' }} />
                  {studentData?.packages && studentData.packages[0]?.package?.name ? 
                    studentData.packages[0].package.name : 
                    translations.currentPackage || 'Current Package'}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: theme.text.secondary, fontWeight: 500, transition: COMMON_TRANSITION }}>
                      {translations.totalClasses || 'Total Classes'}:
                    </Typography>
                    <Typography variant="body1" sx={{ color: theme.text.primary, mb: 1, transition: COMMON_TRANSITION }}>
                      {studentData?.packages && studentData.packages[0]?.package?.totalClasses ? 
                        studentData.packages[0].package.totalClasses : 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: theme.text.secondary, fontWeight: 500, transition: COMMON_TRANSITION }}>
                      {translations.remainingClasses || 'Remaining Classes'}:
                    </Typography>
                    <Typography variant="body1" sx={{ color: theme.text.primary, mb: 1, transition: COMMON_TRANSITION }}>
                      {remainingClasses} {translations.classes || 'classes'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: theme.text.secondary, fontWeight: 500, transition: COMMON_TRANSITION }}>
                      {translations.validUntil || 'Valid Until'}:
                    </Typography>
                    <Typography variant="body1" sx={{ color: theme.text.primary, mb: 1, transition: COMMON_TRANSITION }}>
                      {studentData?.packages && studentData.packages[0]?.endDate ? 
                        moment(studentData.packages[0].endDate).format('MMM D, YYYY') : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: theme.text.secondary, fontWeight: 500, transition: COMMON_TRANSITION }}>
                      {translations.rescheduleCredits || 'Reschedule Credits'}:
                    </Typography>
                    <Typography variant="body1" sx={{ color: theme.text.primary, mb: 1, transition: COMMON_TRANSITION }}>
                      {remainingReschedules} {translations.remaining || 'remaining'} / {studentData?.packages && studentData.packages[0]?.package?.maxReschedules ? 
                        studentData.packages[0].package.maxReschedules : 0} {translations.total || 'total'}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>
            </Box>
          </Grid>

          {/* Second card with progress bar */}
          <Grid item xs={12} md={6}>
            <Box>
              <Card sx={{ 
                p: 3, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                border: theme.mode === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
                transition: COMMON_TRANSITION
              }}>
                <Box>
                  <Typography variant="h6" sx={{ 
                    color: theme.text.primary, 
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: COMMON_TRANSITION
                  }}>
                    <ProgressIcon sx={{ color: '#845EC2' }} />
                    {translations.packageProgress || 'Package Progress'}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ color: theme.text.secondary, mb: 1, transition: COMMON_TRANSITION }}>
                    {(() => {
                      if (!studentData?.packages || !studentData.packages[0]?.package?.totalClasses) {
                        return `0 ${translations.of || 'of'} 0 ${translations.classesUsed || 'classes used'}`;
                      }
                      
                      const totalClasses = studentData.packages[0].package.totalClasses || 0;
                      const remaining = remainingClasses;
                      const usedClasses = Math.max(0, totalClasses - remaining);
                      const percentage = totalClasses > 0 ? (usedClasses / totalClasses) * 100 : 0;
                      return `${usedClasses} ${translations.of || 'of'} ${totalClasses} ${translations.classesUsed || 'classes used'}`;
                    })()}
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 2, width: '100%', height: 8, backgroundColor: 'rgba(0, 0, 0, 0.09)', borderRadius: 2 }}>
                  <Box sx={{ 
                    width: (() => {
                      if (!studentData?.packages || 
                          !studentData.packages[0]?.package?.totalClasses) {
                        return '0%';
                      }
                      
                      const totalClasses = studentData.packages[0].package.totalClasses || 0;
                      const remaining = remainingClasses;
                      const usedClasses = Math.max(0, totalClasses - remaining);
                      const percentage = totalClasses > 0 ? (usedClasses / totalClasses) * 100 : 0;
                      return `${Math.max(0, Math.min(100, percentage))}%`; // Ensure value is between 0-100%
                    })(),
                    height: '100%',
                    backgroundColor: '#845EC2',
                    borderRadius: 2,
                    transition: COMMON_TRANSITION
                  }} />
                </Box>

                {/* Add reschedule progress indicator */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ color: theme.text.secondary, mb: 1, display: 'flex', justifyContent: 'space-between', transition: COMMON_TRANSITION }}>
                    <span>{translations.rescheduleUsage || 'Reschedule Credits Used'}</span>
                    <span>
                      {studentData?.packages && studentData.packages[0]?.usedReschedules !== undefined ? 
                        `${studentData.packages[0].usedReschedules}/${studentData.packages[0]?.package?.maxReschedules || 0}` : 
                        '0/0'}
                    </span>
                  </Typography>

                  <Box sx={{ width: '100%', height: 8, backgroundColor: 'rgba(0, 0, 0, 0.09)', borderRadius: 2 }}>
                    <Box sx={{ 
                      width: (() => {
                        if (!studentData?.packages || 
                            !studentData.packages[0]?.package?.maxReschedules || 
                            studentData.packages[0]?.package?.maxReschedules === 0) {
                          return '0%';
                        }
                        
                        const totalReschedules = studentData.packages[0].package.maxReschedules || 0;
                        const usedReschedules = studentData.packages[0].usedReschedules || 0;
                        const percentage = totalReschedules > 0 ? (usedReschedules / totalReschedules) * 100 : 0;
                        return `${Math.max(0, Math.min(100, percentage))}%`; // Ensure value is between 0-100%
                      })(),
                      height: '100%',
                      backgroundColor: '#FF6F91',
                      borderRadius: 2,
                      transition: COMMON_TRANSITION
                    }} />
                  </Box>
                </Box>
              </Card>
            </Box>
          </Grid>
        </Grid>
      )}
    </>
  );
};

export default PersonalInfoTab; 