'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  Avatar, 
  Grid, 
  Divider, 
  Button, 
  IconButton,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Stack
} from '@mui/material';
import { 
  Lock as LockIcon,
  History as HistoryIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Inventory as PackageIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../utils/api';
import { COMMON_TRANSITION } from '../../constants/styleConstants';
import moment from 'moment';
import Loading from '../../components/Loading';

// Import the extracted components
import PersonalInfoTab from './components/PersonalInfoTab';
import ClassesTab from './components/ClassesTab';
import HistoryTab from './components/HistoryTab';
import ClassHistoryTab from './components/ClassHistoryTab';
import PackageHistoryTab from './components/PackageHistoryTab';
import RescheduleModal from './components/RescheduleModalContainer';
import ChangePasswordDialog from './components/ChangePasswordDialog';

export default function StudentProfile() {
  const themeContext = useTheme();
  const theme = themeContext?.theme || { mode: 'light' }; 
  const mode = themeContext?.mode || 'light';
  const isDark = themeContext?.isDark || false;
  const { translations, language } = useLanguage();
  const { user, changePassword, loading: authLoading, error: authError } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [studentData, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allClasses, setAllClasses] = useState([]);
  const [futureClasses, setFutureClasses] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    city: '',
    country: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [remainingReschedules, setRescheduleCredits] = useState(0);
  const [remainingClasses, setRemainingClasses] = useState(0);

  // State for the reschedule modal
  const [rescheduleModal, setRescheduleModal] = useState({ 
    open: false, 
    classId: null,
    selectedDate: null,
    selectedTime: null 
  });

  // Set up data fetching and polls for updates
  useEffect(() => {
    // Initial data fetch
    fetchStudentData();
    
    // Set up a polling interval to check for updates from other components
    const checkUpdateInterval = setInterval(() => {
      const lastUpdate = studentAPI.checkForUpdates();
      const lastFetchTime = lastFetchRef.current;
      
      // If there's a new update since our last fetch, refresh data
      if (lastUpdate && lastFetchTime && new Date(lastUpdate) > new Date(lastFetchTime)) {
        fetchStudentData();
      }
    }, 5000); // Check every 5 seconds
    
    // Cleanup
    return () => {
      clearInterval(checkUpdateInterval);
    };
  }, [user]);
  
  // Keep track of last fetch time
  const lastFetchRef = useRef(null);
  useEffect(() => {
    if (!loading) {
      lastFetchRef.current = new Date().toISOString();
    }
  }, [loading]);

  // Helper function to get student ID from user object
  const getStudentId = () => {
    if (!user) return null;
    
    // Check if user has studentId directly
    if (user.studentId) return user.studentId;
    
    // Check if user has student object with id
    if (user.student && user.student.id) return user.student.id;
    
    // If the user is a student with an ID, use that as last resort
    if (user.role === 'student' && user.id) return user.id;
    
    // If no id is found, check localStorage as a fallback
    if (typeof window !== 'undefined') {
      try {
        const storedUserStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (storedUserStr) {
          try {
            const parsedUser = JSON.parse(storedUserStr);
            
            if (parsedUser.studentId) return parsedUser.studentId;
            if (parsedUser.student && parsedUser.student.id) return parsedUser.student.id;
            if (parsedUser.role === 'student' && parsedUser.id) return parsedUser.id;
          } catch (e) {
            console.error('Failed to parse user from localStorage', e);
          }
        }
      } catch (e) {
        console.error('Error accessing localStorage', e);
      }
    }
    
    return null;
  };

  // Function to fetch student data
  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const userId = getStudentId();
      if (!userId) {
        console.error("No user ID found for fetching student data");
        setLoading(false);
        return;
      }

      // Fetch student profile data from API
      const studentData = await studentAPI.getStudentProfile(userId);

      if (!studentData || !studentData.id) {
        throw new Error("Failed to fetch student profile data");
      }

      // Set student data
      setStudent(studentData);
      
      // Set form data with student profile details
      setFormData({
        name: studentData.name || '',
        surname: studentData.surname || '',
        email: studentData.email || studentData.user?.email || '',
        phone: studentData.phone || '',
        city: studentData.city || '',
        country: studentData.country || ''
      });
      
      // Process classes and organize them
      let classes = studentData.classes || [];
      
      // Add extra info to classes
      classes = classes.map(cls => {
        // Calculate if class is reschedulable (24 hours in advance)
        const classDate = cls.classDetail?.date ? new Date(`${cls.classDetail.date}T${cls.classDetail.startTime || '00:00'}`) : null;
        const canReschedule = classDate && (new Date() < new Date(classDate.getTime() - 2 * 60 * 60 * 1000));
        
        return {
          ...cls,
          canReschedule
        };
      });

      // Find reschedule credits from student packages
      let remainingReschedules = 0;
      let classesRemaining = 0;
      
      if (studentData.packages && studentData.packages.length > 0) {
        const activePackage = studentData.packages[0];
        
        // Get remaining reschedules
        if (activePackage.package && activePackage.package.maxReschedules) {
          const maxReschedules = activePackage.package.maxReschedules;
          const usedReschedules = activePackage.usedReschedules || 0;
          remainingReschedules = Math.max(0, maxReschedules - usedReschedules);
        }
        
        // Get remaining classes
        if (activePackage.package && typeof activePackage.remainingClasses !== 'undefined') {
          classesRemaining = activePackage.remainingClasses;
        }
      }
      
      setRescheduleCredits(remainingReschedules);
      setRemainingClasses(classesRemaining);
      
      // Set future classes - classes with dates in the future
      const now = new Date();
      const futureClasses = classes.filter(cls => {
        if (!cls.classDetail?.date) return false;
        const classDate = new Date(`${cls.classDetail.date}T${cls.classDetail.startTime || '00:00'}`);
        return classDate > now && cls.status !== 'canceled';
      });
      
      setAllClasses(classes);
      setFutureClasses(futureClasses);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching student data:", error);
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSavePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(translations.passwordsDoNotMatch || 'Passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError(translations.passwordTooShort || 'Password must be at least 6 characters');
      return;
    }
    
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Close dialog after 2 seconds on success
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError(error.message || translations.errorChangingPassword || 'Error changing password');
    }
  };

  const handleCloseMessage = () => {
    setMessage({ ...message, open: false });
  };

  const handleOpenReschedule = (classId) => {
    // Find the class object
    const classToReschedule = allClasses.find(c => c.id === classId);
    
    if (!classToReschedule) {
      console.error(`Class with ID ${classId} not found`);
      return;
    }
    
    // Check if student has reschedule credits
    if (remainingReschedules <= 0) {
      setMessage({
        open: true,
        text: translations.noRescheduleCredits || 'You have no reschedule credits remaining',
        severity: 'error'
      });
      return;
    }
    
    // Check if class can be rescheduled (less than 2 hours before)
    if (!classToReschedule.canReschedule) {
      setMessage({
        open: true,
        text: translations.cannotReschedule || 'This class cannot be rescheduled (less than 2 hours before start)',
        severity: 'error'
      });
      return;
    }
    
    // Open the reschedule modal with the selected class
    setRescheduleModal({
      open: true,
      classId,
      classData: classToReschedule
    });
  };

  const handleRescheduleConfirm = async (selectionData) => {
    // Check if we have all the data we need from the updated RescheduleModal component
    if (selectionData.studentId && selectionData.classId && selectionData.newClassData) {
      try {
        // Use the createRescheduleRecord method that matches the server endpoint
        const result = await studentAPI.createRescheduleRecord(
          selectionData.studentId,
          selectionData.classId,
          selectionData.newClassData
        );
        
        // Show success message
        setMessage({
          open: true,
          text: translations.classRescheduled || 'Class rescheduled successfully',
          severity: 'success'
        });
        
        // Close the reschedule modal
        setRescheduleModal({ open: false, classId: null });
        
        // Refresh data to show updated classes
        fetchStudentData();
      } catch (error) {
        console.error("Error rescheduling class:", error);
        setMessage({
          open: true,
          text: error.message || translations.errorRescheduling || 'Error rescheduling class',
          severity: 'error'
        });
      }
      return;
    }
    
    // Fallback to the old implementation for backward compatibility
    const { selectedDate, selectedTime } = selectionData;
    
    if (!selectedDate || !selectedTime || !rescheduleModal.classId) {
      console.error("Missing required data for rescheduling");
      return;
    }
    
    try {
      // Format the date for API
      const formattedDate = selectedDate.format('YYYY-MM-DD');
      
      // Find the class to reschedule
      const classToReschedule = allClasses.find(c => c.id === rescheduleModal.classId);
      
      if (!classToReschedule) {
        throw new Error("Class not found");
      }
      
      // Calculate end time (2 hours after start)
      const endTime = moment(`${formattedDate}T${selectedTime}`)
        .add(2, 'hours')
        .format('HH:mm');
      
      // Format the data for the new API
      const studentId = user?.student?.id;
      const newClassData = {
        date: formattedDate,
        startTime: selectedTime,
        endTime: endTime,
        title: classToReschedule.title || 'Rescheduled Class'
      };
      
      // Use the createRescheduleRecord method that matches the server endpoint
      const result = await studentAPI.createRescheduleRecord(
        studentId, 
        rescheduleModal.classId,
        newClassData
      );
      
      // Show success message
      setMessage({
        open: true,
        text: translations.classRescheduled || 'Class rescheduled successfully',
        severity: 'success'
      });
      
      // Close the reschedule modal
      setRescheduleModal({ open: false, classId: null });
      
      // Refresh data to show updated classes
      fetchStudentData();
    } catch (error) {
      console.error("Error rescheduling class:", error);
      setMessage({
        open: true,
        text: error.message || translations.errorRescheduling || 'Error rescheduling class',
        severity: 'error'
      });
    }
  };

  if (loading) {
    return (
      <Loading 
        message={translations.loadingProfileData || "Loading profile data..."} 
        fullPage={true}
        showOverlay={true}
      />
    );
  }

  return (
    <Box className="profile-page" sx={{ 
      maxWidth: '100%',
      px: { xs: 2, sm: 3, md: 4 },
      py: { xs: 2, sm: 3 }
    }}>
      {/* Student Header Card */}
      <Card sx={{ 
        mb: 3,
        borderRadius: 3,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.07)',
        overflow: 'hidden',
        backgroundColor: theme.mode === 'light' ? '#fff' : theme.background.paper,
        transition: COMMON_TRANSITION
      }}>
        {/* Purple gradient banner */}
        <Box sx={{ 
          height: '120px',
          background: 'linear-gradient(135deg, #845EC2 0%, #D65DB1 100%)',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1
        }}>
          {/* Decorative elements */}
          <Box sx={{ 
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            top: '-150px',
            right: '-100px'
          }} />
          <Box sx={{ 
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            bottom: '-100px',
            left: '50px'
          }} />
        </Box>

        {/* Profile Content */}
        <Box sx={{ 
          px: { xs: 3, md: 4 },
          pb: 3,
          mt: '-50px',
          position: 'relative',
          zIndex: 2
        }}>
          <Grid container spacing={3} alignItems="center">
            {/* Avatar */}
            <Grid item xs={12} sm="auto">
              <Avatar
                src={studentData.avatarUrl || studentData.user?.avatarUrl || '/images/avatar-placeholder.png'}
                alt={`${studentData.name} ${studentData.surname}`}
                sx={{ 
                  width: { xs: 100, sm: 120 },
                  height: { xs: 100, sm: 120 },
                  border: '5px solid white',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                  backgroundColor: '#845EC2',
                  fontSize: '2.5rem',
                  transition: COMMON_TRANSITION
                }}
              />
            </Grid>

            {/* Student Info */}
            <Grid item xs={12} sm>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, color: theme.text.primary, transition: COMMON_TRANSITION }}>
                  {studentData.name} {studentData.surname}
                </Typography>
                <Typography variant="body1" sx={{ color: theme.text.secondary, mb: 2, transition: COMMON_TRANSITION }}>
                  @{studentData.username || studentData.user?.username}
                </Typography>
                
                <Button 
                  variant="outlined"
                  size="small"
                  startIcon={<LockIcon />}
                  onClick={() => setChangePasswordOpen(true)}
                  sx={{
                    borderColor: 'rgba(132, 94, 194, 0.6)',
                    color: '#845EC2',
                    '&:hover': {
                      borderColor: '#845EC2',
                      backgroundColor: 'rgba(132, 94, 194, 0.08)',
                    }
                  }}
                >
                  {translations.changePassword || 'Change Password'}
                </Button>
              </Box>
            </Grid>

            {/* Package Info Card */}
            <Grid item xs={12} sm={12} md={4} lg={3} sx={{ 
              mt: { xs: 2, sm: 2, md: '-45px' },
              mb: { xs: 0, sm: 0, md: '45px' },
              display: 'flex',
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
              position: 'relative',
              zIndex: 30
            }}>
              <Card sx={{ 
                p: 2.5, 
                borderRadius: 2,
                backgroundColor: theme.mode === 'light' 
                  ? 'rgba(255, 255, 255, 0.98)' 
                  : 'rgba(30, 30, 30, 0.95)',
                border: '1px solid rgba(132, 94, 194, 0.3)',
                width: { xs: '100%', sm: '350px', md: '280px' },
                transition: COMMON_TRANSITION,
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: '#845EC2', 
                  textAlign: 'center',
                  mb: 2
                }}>
                  {studentData.packages && studentData.packages[0]?.package?.name ? 
                    studentData.packages[0].package.name : 'Premium Package'}
                </Typography>
                
                <Divider sx={{ my: 1, borderColor: 'rgba(132, 94, 194, 0.2)' }} />
                
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: theme.text.secondary, mb: 0.5, transition: COMMON_TRANSITION }}>
                        {translations.classes ? 
                          translations.classes.charAt(0).toUpperCase() + translations.classes.slice(1) : 
                          'Classes'}
                        <br />
                        {translations.remaining ? 
                          translations.remaining.charAt(0).toUpperCase() + translations.remaining.slice(1) : 
                          'Remaining'}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#845EC2', transition: COMMON_TRANSITION }}>
                        {remainingClasses}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: theme.text.secondary, mb: 0.5, transition: COMMON_TRANSITION }}>
                        {translations.reschedule ? 
                          translations.reschedule.charAt(0).toUpperCase() + translations.reschedule.slice(1) : 
                          'Reschedule'}
                        <br />
                        {translations.credits ? 
                          translations.credits.charAt(0).toUpperCase() + translations.credits.slice(1) : 
                          'Credits'}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#845EC2', transition: COMMON_TRANSITION }}>
                        {remainingReschedules}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Card>

      {/* Tabs Section */}
      <Card sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.07)',
        overflow: 'hidden',
        backgroundColor: theme.mode === 'light' ? '#fff' : theme.background.paper,
        transition: COMMON_TRANSITION
      }}>
        <Box sx={{ 
          px: 1,
          borderBottom: '1px solid',
          borderColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
          transition: COMMON_TRANSITION
        }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="profile tabs"
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#845EC2',
                height: 3,
                borderRadius: '3px 3px 0 0'
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                minWidth: { xs: 'auto', sm: 120 },
                fontWeight: 500,
                fontSize: '1rem',
                py: 2,
                color: theme.text.secondary,
                '&.Mui-selected': {
                  color: '#845EC2',
                  fontWeight: 600,
                },
              },
            }}
          >
            <Tab 
              icon={<PersonIcon sx={{ fontSize: '1.2rem' }} />} 
              iconPosition="start" 
              label={translations.info || "Info"} 
              id="profile-tab-0" 
              aria-controls="profile-tabpanel-0" 
            />
            <Tab 
              icon={<EventIcon sx={{ fontSize: '1.2rem' }} />} 
              iconPosition="start" 
              label={translations.classes || "Classes"} 
              id="profile-tab-1" 
              aria-controls="profile-tabpanel-1" 
            />
            <Tab 
              icon={<HistoryIcon sx={{ fontSize: '1.2rem' }} />} 
              iconPosition="start" 
              label={translations.classHistory || "Class History"} 
              id="profile-tab-2" 
              aria-controls="profile-tabpanel-2" 
            />
            <Tab 
              icon={<PackageIcon sx={{ fontSize: '1.2rem' }} />} 
              iconPosition="start" 
              label={translations.packageHistory || "Package History"} 
              id="profile-tab-3" 
              aria-controls="profile-tabpanel-3" 
            />
          </Tabs>
        </Box>
        
        {/* Tab Panels */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Personal Info Tab */}
          {tabValue === 0 && (
            <PersonalInfoTab 
              studentData={studentData} 
              futureClasses={futureClasses} 
              remainingClasses={remainingClasses}
              remainingReschedules={remainingReschedules} 
            />
          )}

          {/* Classes Tab */}
          {tabValue === 1 && (
            <ClassesTab 
              allClasses={allClasses} 
              futureClasses={futureClasses} 
              handleOpenReschedule={handleOpenReschedule} 
            />
          )}

          {/* Class History Tab */}
          {tabValue === 2 && (
            <ClassHistoryTab 
              studentData={studentData}
              allClasses={allClasses} 
            />
          )}

          {/* Package History Tab */}
          {tabValue === 3 && (
            <PackageHistoryTab 
              studentData={studentData}
            />
          )}
        </Box>
      </Card>
      
      {/* Change Password Dialog */}
      <ChangePasswordDialog 
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        passwordData={passwordData}
        setPasswordData={setPasswordData}
        onSave={handleSavePassword}
        passwordError={passwordError}
        passwordSuccess={passwordSuccess}
        authLoading={authLoading}
        authError={authError}
      />
      
      {/* Reschedule Modal */}
      <RescheduleModal
        open={rescheduleModal.open}
        onClose={() => setRescheduleModal({ open: false, classId: null })}
        event={rescheduleModal.classData}
        onReschedule={handleRescheduleConfirm}
      />
      
      {/* Notification Snackbar */}
      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseMessage} 
          severity={message.severity} 
          variant="filled"
          sx={{ 
            width: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}