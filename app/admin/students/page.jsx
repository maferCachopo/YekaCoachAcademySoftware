'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableHead, 
  TableRow, TableContainer, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Avatar, Chip, Tooltip,
  Snackbar, Alert, CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon,
  LockReset as LockResetIcon, LocationOn as LocationIcon,
  Search as SearchIcon, Close as CloseIcon,
  Refresh as RefreshIcon, Delete as DeleteIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageToggle from '../../components/LanguageToggle';
import { useRouter } from 'next/navigation';
import { studentAPI, packageAPI, authAPI, adminAPI } from '../../utils/api';
import ThemeTransition from '../../components/ThemeTransition';

// Import components
import ViewDialog from './components/ViewDialog';
import EditDialog from './components/EditDialog';
import AddDialog from './components/AddDialog';
import ClassSchedulingForm from './components/ClassSchedulingForm';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Import utilities
import { textFieldStyle, getHeaders } from './utils/styles';
import { formatPackage } from './utils/formatters';

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

export default function Students() {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const router = useRouter();
  
  // Get headers with translations
  const headers = getHeaders(translations);
  
  // Apply scroll restoration
  useScrollRestoration();
  
  const [students, setStudents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [resetPassOpen, setResetPassOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    username: '',
    phone: '',
    city: '',
    country: '',
    birthDate: '',
    active: true,
    password: '',
    confirmPassword: '',
    package: ''
  });
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [scheduledClasses, setScheduledClasses] = useState([]);
  const [existingClasses, setExistingClasses] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if device is mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch students and packages in parallel with individual error handling
        let studentsData = [];
        let packagesData = [];
        
        try {
          studentsData = await studentAPI.getAllStudents();
        } catch (studentsError) {
          console.error('Error fetching students:', studentsError);
        }
        
        try {
          packagesData = await packageAPI.getAllPackages();
        } catch (packagesError) {
          console.error('Error fetching packages:', packagesError);
        }
        
        if (studentsData.length === 0) {
          setStudents([]);
          setPackages(packagesData);
          setLoading(false);
          return;
        }
        
        // Process student data with better error handling
        const enhancedStudentsData = await Promise.all(
          studentsData.map(async (student) => {
            try {
              const activePackage = student.packages?.find(pkg => pkg.status === 'active');
              if (activePackage) {
                try {
                  const classes = await studentAPI.getStudentClasses(student.id);
                  const scheduledClassesCount = classes.filter(c => c.status === 'scheduled').length;
                  const allClassesAttended = classes.length > 0 && classes.every(c => c.status === 'attended');
                  
                  if (allClassesAttended) {
                    activePackage.remainingClasses = 0;
                  } else if (scheduledClassesCount > activePackage.remainingClasses) {
                    activePackage.remainingClasses = scheduledClassesCount;
                  }
                  
                  return { ...student, classes: classes || [] };
                } catch (error) {
                  console.error(`Error fetching classes for student ${student.id}:`, error);
                  return student;
                }
              }
              return student;
            } catch (studentError) {
              console.error(`Error processing student ${student.id}:`, studentError);
              return student;
            }
          })
        );
        
        setStudents(enhancedStudentsData);
        setPackages(packagesData);
      } catch (error) {
        console.error('Error in fetchData:', error);
        setMessage({
          open: true,
          text: translations.errorLoadingData || 'Error loading data. Please try again.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [translations]);

  // Function to manually refresh students data
  const refreshStudents = () => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [studentsData, packagesData] = await Promise.all([
          studentAPI.getAllStudents(),
          packageAPI.getAllPackages()
        ]);
        
        const enhancedStudentsData = await Promise.all(
          studentsData.map(async (student) => {
            
            try {
              // Get all student classes
              const classes = await studentAPI.getStudentClasses(student.id);
              
              // Get all packages for the student
              const allPackages = await studentAPI.getStudentPackages(student.id);
              
              // Get active package if exists
              let activePackage = student.packages?.find(pkg => pkg.status === 'active');
              
              // Get scheduled classes
              const scheduledClasses = classes.filter(c => c.status === 'scheduled');
              
              if (scheduledClasses.length > 0) {
                // Find packages with scheduled classes
                const packagesWithScheduledClasses = new Set(scheduledClasses.map(c => c.studentPackageId));
                
                // Check if any of these packages are marked as completed
                for (const packageId of packagesWithScheduledClasses) {
                  const packageWithScheduledClasses = allPackages.find(p => p.id === packageId);
                  
                  if (packageWithScheduledClasses) {
                    // Count scheduled classes for this specific package
                    const packageScheduledClasses = scheduledClasses.filter(c => c.studentPackageId === packageId);
                    
                    // If package is completed but has scheduled classes, it should be active
                    if (packageWithScheduledClasses.status === 'completed' && packageScheduledClasses.length > 0) {
                      // If this is a package that appears in student.packages, update it
                      const studentPackageIndex = student.packages?.findIndex(p => p.id === packageId);
                      if (studentPackageIndex >= 0) {
                        student.packages[studentPackageIndex].status = 'active';
                        student.packages[studentPackageIndex].remainingClasses = packageScheduledClasses.length;
                      } else if (!activePackage) {
                        // If student has no active package, this should be it
                        activePackage = packageWithScheduledClasses;
                        activePackage.status = 'active';
                        activePackage.remainingClasses = packageScheduledClasses.length;
                        
                        // Add to student.packages if it doesn't exist
                        if (!student.packages) {
                          student.packages = [activePackage];
                        } else {
                          student.packages.push(activePackage);
                        }
                      }
                    }
                  }
                }
              }
              
              // Handle remaining classes count for active package if it exists
              if (activePackage) {
                const packageScheduledClasses = scheduledClasses.filter(c => c.studentPackageId === activePackage.id);
                const scheduledClassesCount = packageScheduledClasses.length;
                
                // Set remaining classes to exactly match scheduled classes count
                activePackage.remainingClasses = scheduledClassesCount;
                
                console.log('DEBUG - Table refresh - Setting remaining classes:', {
                  studentId: student.id,
                  packageId: activePackage.id,
                  scheduledClassesCount,
                  newRemainingClasses: activePackage.remainingClasses
                });
              }
              
              return { ...student, classes: classes, allPackages: allPackages };
            } catch (error) {
              console.error(`Error processing student ${student.id}:`, error);
              return student;
            }
          })
        );
        
        setStudents(enhancedStudentsData);
        setPackages(packagesData);
      } catch (error) {
        console.error('Error refreshing students:', error);
        setMessage({
          open: true,
          text: 'Error refreshing data. Please try again.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  };

  const handleViewStudent = async (student) => {
    try {
      const updatedStudent = {
        ...student,
      };
      
      setSelectedStudent(updatedStudent);
      setViewOpen(true);
      
      // The ViewDialog component will handle its own data fetching and loading state
    } catch (error) {
      console.error('Error fetching student details:', error);
      setMessage({
        open: true,
        text: 'Error loading student details',
        severity: 'error'
      });
    }
  };

  const handleEditStudent = async (student) => {
    try {
      // Get the student's classes if they have an active package
      const activePackage = student.packages?.find(pkg => pkg.status === 'active');
      
      // Set the form data
      setFormData({
        id: student.id,
        name: student.name || '',
        surname: student.surname || '',
        email: student.user?.email || '',
        username: student.user?.username || '',
        birthDate: student.birthDate || '',
        phone: student.phone || '',
        city: student.city || '',
        country: student.country || '',
        zoomLink: student.zoomLink || '',
        active: student.active,
        password: '',
        confirmPassword: '',
        package: activePackage?.packageId || ''
      });
      
      // Set the selected student and open the dialog
      setSelectedStudent(student);
      setEditOpen(true);
    } catch (error) {
      console.error('Error preparing student for edit:', error);
      setMessage({
        open: true,
        text: 'Error loading student details',
        severity: 'error'
      });
    }
  };

  const handleAddStudent = () => {
    // Reset form data
    setFormData({
      name: '',
      surname: '',
      email: '',
      username: '',
      phone: '',
      city: '',
      country: '',
      birthDate: '',
      zoomLink: '',
      password: '',
      confirmPassword: '',
      package: ''
    });
    
    // Reset scheduled classes
    setScheduledClasses([]);
    setExistingClasses([]);
    
    // Open the dialog
    setAddOpen(true);
  };

  const handleScheduledClassesChange = useCallback((classes) => {
    setScheduledClasses(classes);
  }, []);

  const handleResetPassword = async (studentId) => {
    try {
      // Check if passwords match
      if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
        setMessage({
          open: true,
          text: translations.passwordsDoNotMatch || 'Passwords do not match',
          severity: 'error'
        });
        return;
      }
      
      // Check if password is empty
      if (!resetPasswordData.newPassword) {
        setMessage({
          open: true,
          text: translations.passwordRequired || 'Password is required',
          severity: 'error'
        });
        return;
      }
      
      // Reset the password
      await authAPI.resetStudentPassword(studentId, resetPasswordData.newPassword);
      
      // Show success message
      setMessage({
        open: true,
        text: translations.passwordResetSuccess || 'Password reset successfully',
        severity: 'success'
      });
      
      // Close the dialog
      setResetPassOpen(false);
      
      // Reset the form
      setResetPasswordData({
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      setMessage({
        open: true,
        text: translations.errorResettingPassword || 'Error resetting password',
        severity: 'error'
      });
    }
  };

  const handleOpenResetPassword = (student) => {
    setSelectedStudent(student);
    setResetPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
    setResetPassOpen(true);
  };

  const handleCloseResetPassDialog = () => {
    setResetPassOpen(false);
    setResetPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleCloseMessage = () => {
    setMessage(prev => ({ ...prev, open: false }));
  };

  const handlePasswordChange = useCallback((e) => {
    const { name, value } = e.target;
    setResetPasswordData(prev => ({ ...prev, [name]: value }));
  }, []);
  
  // Handle delete student
  const handleOpenDeleteDialog = (student) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    
    try {
      setIsDeleting(true);
      
      await studentAPI.deleteStudent(selectedStudent.id);
      
      // Update UI by removing the deleted student
      setStudents((prevStudents) => 
        prevStudents.filter(student => student.id !== selectedStudent.id)
      );
      
      // Show success message
      setMessage({
        open: true,
        text: translations.studentDeleteSuccess || 'Student deleted successfully',
        severity: 'success'
      });
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error deleting student:', error);
      setMessage({
        open: true,
        text: error.message || translations.errorDeletingStudent || 'Error deleting student',
        severity: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter students based on search query
  const filteredStudents = students.filter(student => {
    const name = `${student.name} ${student.surname}`.toLowerCase();
    const email = student.user?.email?.toLowerCase() || '';
    const phone = student.phone?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return name.includes(query) || email.includes(query) || phone.includes(query);
  });

  // Styles
  const primaryButtonStyle = {
    background: '#845EC2',
    color: '#ffffff',
    '&:hover': {
      background: '#6B46C1',
    },
    fontSize: { xs: '0.8rem', sm: '0.875rem' }
  };

  const secondaryButtonStyle = {
    color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#ffffff',
    borderColor: 'rgba(132, 94, 194, 0.5)',
    '&:hover': {
      borderColor: '#845EC2',
      backgroundColor: theme?.mode === 'light'
        ? 'rgba(132, 94, 194, 0.08)'
        : 'rgba(132, 94, 194, 0.15)',
    },
    fontSize: { xs: '0.8rem', sm: '0.875rem' }
  };

  return (
    <ThemeTransition
      component={Box}
      sx={{ 
        background: theme?.background?.default,
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 2, sm: 3 },
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'auto',
      }}
    >
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: { xs: 2, sm: 4 },
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: theme?.text?.primary,
            fontWeight: 'bold',
            fontSize: { xs: '1.4rem', sm: '1.7rem' },
          }}
        >
          {translations.students || 'Students'}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1, sm: 2 }, 
          alignItems: 'center',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <ThemeToggle />
          <LanguageToggle />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshStudents}
            size={isMobile ? "small" : "medium"}
            sx={{
              ...secondaryButtonStyle,
              height: { xs: 36, sm: 40 },
              ...(isMobile && { flex: '1 1 auto' })
            }}
          >
            {isMobile ? (translations.refreshShort || 'Refresh') : (translations.refresh || 'Refresh')}
          </Button>
          <Button
            component={motion.button}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddStudent}
            size={isMobile ? "small" : "medium"}
            sx={{
              ...primaryButtonStyle,
              px: { xs: 2, sm: 3 },
              height: { xs: 36, sm: 40 },
              ...(isMobile && { flex: '1 1 auto' })
            }}
          >
            {isMobile ? (translations.addShort || 'Add') : (translations.addStudent || 'Add Student')}
          </Button>
        </Box>
      </Box>
      
      {/* Search Box and Students Table combined */}
      <Card
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ 
          borderRadius: 2,
          background: theme?.card?.background,
          backdropFilter: 'blur(10px)',
          border: theme?.card?.border,
          transition: 'all 0.3s ease',
          '& .MuiTable-root': {
            minWidth: { xs: 650, sm: 'auto' },
            transition: 'all 0.3s ease',
          },
          '& .MuiTableContainer-root': {
            maxHeight: 'none',
            overflow: { xs: 'auto', sm: 'visible' },
          },
          boxShadow: theme.mode === 'light' 
            ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' 
            : '0 2px 6px rgba(0,0,0,0.3)',
          mb: 4,
          overflow: 'hidden',
        }}
      >
        {/* Integrated Search Box */}
        <Box sx={{ 
          px: { xs: 1.5, sm: 3 }, 
          py: { xs: 1.5, sm: 2 }, 
          borderBottom: theme.mode === 'light' 
            ? '1px solid rgba(0, 0, 0, 0.08)' 
            : '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          backgroundColor: theme.mode === 'light'
            ? 'rgba(132, 94, 194, 0.05)'
            : 'rgba(132, 94, 194, 0.15)',
          gap: { xs: 1, sm: 0 }
        }}>
          <TextField
            placeholder={translations.searchStudents || 'Search students...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: theme.text?.secondary, mr: 1 }} />,
              sx: {
                bgcolor: theme.mode === 'light' ? 'white' : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                '& fieldset': {
                  borderColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
                  borderRadius: '8px',
                  borderWidth: theme.mode === 'light' ? '1px' : '0',
                },
                '&:hover fieldset': {
                  borderColor: theme.mode === 'light' 
                    ? 'rgba(132, 94, 194, 0.5)' 
                    : 'rgba(132, 94, 194, 0.5)',
                  borderWidth: theme.mode === 'light' ? '1px' : '1px',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#845EC2',
                  borderWidth: '1px',
                },
                boxShadow: theme.mode === 'light' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                fontSize: { xs: '0.8rem', sm: '0.875rem' }
              }
            }}
            sx={{
              width: { xs: '100%', sm: 300 },
            }}
          />
          <Typography 
            variant="body2" 
            sx={{ 
              color: theme.text?.secondary,
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          >
            {filteredStudents.length} {translations.students || 'Students'}
          </Typography>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead sx={{ 
              bgcolor: theme.mode === 'light' 
                ? 'rgba(132, 94, 194, 0.12)' 
                : 'rgba(132, 94, 194, 0.2)'
            }}>
              <TableRow>
                {headers.map((header) => (
                  <TableCell 
                    key={header.id}
                    sx={{ 
                      fontWeight: 600,
                      color: theme.mode === 'light' ? '#5D3E9E' : '#9D7DD6',
                      fontSize: { xs: '0.8rem', sm: '0.95rem' },
                      borderBottom: '1px solid',
                      borderColor: theme.mode === 'light' 
                        ? 'rgba(132, 94, 194, 0.2)' 
                        : 'rgba(132, 94, 194, 0.3)',
                      py: { xs: 1.25, sm: 1.75 },
                      px: { xs: 1, sm: 2 },
                      ...(isMobile && header.id === 'phone' ? { display: 'none' } : {}),
                      ...(isMobile && header.id === 'location' ? { display: 'none' } : {})
                    }}
                  >
                    {translations[header.id] || header.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody sx={{ 
              bgcolor: theme.mode === 'light' 
                ? '#fff' 
                : 'rgba(42, 50, 74, 0.7)'
            }}>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={headers.length} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={40} sx={{ color: '#845EC2' }} />
                    <Typography variant="body1" sx={{ mt: 2, color: theme.text?.secondary }}>
                      {translations.loading || 'Loading students...'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headers.length} align="center" sx={{ py: 5 }}>
                    <Typography variant="body1" sx={{ color: theme.text?.secondary }}>
                      {searchQuery 
                        ? (translations.noStudentsFound || 'No students found matching your search.') 
                        : (translations.noStudents || 'No students available. Add your first student!')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student, index) => (
                  <TableRow 
                    key={student.id} 
                    hover
                    sx={{
                      '& td': {
                        color: theme?.text?.primary,
                        borderColor: theme?.mode === 'light' 
                          ? 'rgba(0, 0, 0, 0.08)' 
                          : 'rgba(255, 255, 255, 0.05)',
                        padding: { xs: '10px 8px', sm: '14px 16px' },
                        fontSize: { xs: '0.8rem', sm: 'inherit' }
                      },
                      backgroundColor: index % 2 === 0 
                        ? 'transparent'
                        : theme.mode === 'light' 
                          ? 'rgba(249, 246, 255, 0.7)' 
                          : 'rgba(132, 94, 194, 0.05)',
                      transition: 'background-color 0.3s ease',
                      '&:hover': {
                        backgroundColor: theme?.mode === 'light' 
                          ? 'rgba(132, 94, 194, 0.07)' 
                          : 'rgba(132, 94, 194, 0.12)',
                      },
                    }}
                  >
                    <TableCell sx={{ color: theme.text?.primary }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ 
                          bgcolor: '#845EC2', 
                          width: { xs: 28, sm: 32 }, 
                          height: { xs: 28, sm: 32 },
                          mr: { xs: 1, sm: 1.5 },
                          fontSize: { xs: '0.8rem', sm: '1rem' }
                        }}>
                          {student.name ? student.name[0].toUpperCase() : 'S'}
                        </Avatar>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 500,
                          fontSize: { xs: '0.8rem', sm: 'inherit' }
                        }}>
                          {student.name} {student.surname}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      color: theme.text?.primary,
                      fontSize: { xs: '0.8rem', sm: 'inherit' }
                    }}>
                      {student.user?.email || '-'}
                    </TableCell>
                    <TableCell sx={{ 
                      color: theme.text?.primary,
                      display: { xs: 'none', sm: 'table-cell' }
                    }}>
                      {student.phone || '-'}
                    </TableCell>
                    <TableCell sx={{ 
                      color: theme.text?.primary,
                      display: { xs: 'none', sm: 'table-cell' }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationIcon sx={{ color: '#FF6F91', fontSize: '1rem', mr: 0.5 }} />
                        <Typography variant="body2">
                          {student.city}{student.city && student.country ? ', ' : ''}{student.country || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: theme.text?.primary }}>
                      {formatPackage(student, theme, translations)}
                    </TableCell>
                    <TableCell sx={{ color: theme.text?.primary }}>
                      <Chip
                        label={student.active === false ? 'inactive' : 'active'}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          bgcolor: student.active !== false
                            ? theme.mode === 'light' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.2)' 
                            : theme.mode === 'light' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.2)',
                          color: student.active !== false ? '#2e7d32' : '#d32f2f',
                          fontSize: { xs: '0.7rem', sm: '0.8rem' },
                          height: { xs: 20, sm: 24 }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex' }}>
                        <Tooltip title={translations.view || 'View'} placement="top" arrow>
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewStudent(student)}
                            sx={{ color: theme.mode === 'light' ? '#845EC2' : '#B39CD0' }}
                          >
                            <ViewIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={translations.edit || 'Edit'} placement="top" arrow>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditStudent(student)}
                            sx={{ color: theme.mode === 'light' ? '#00a8ff' : '#74b9ff' }}
                          >
                            <EditIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={translations.resetPassword || 'Reset Password'} placement="top" arrow>
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenResetPassword(student)}
                            sx={{ color: theme.mode === 'light' ? '#ff9f43' : '#feca57' }}
                          >
                            <LockResetIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={translations.delete || 'Delete'} placement="top" arrow>
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenDeleteDialog(student)}
                            sx={{ color: theme.mode === 'light' ? '#d32f2f' : '#f44336' }}
                          >
                            <DeleteIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* View Dialog */}
      <ViewDialog
        open={viewOpen} 
        onClose={() => setViewOpen(false)}
        student={selectedStudent}
        setMessage={setMessage}
      />

      {/* Edit Dialog */}
      <EditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={selectedStudent}
        formData={formData}
        setFormData={setFormData}
        packages={packages}
        scheduledClasses={scheduledClasses}
        setScheduledClasses={handleScheduledClassesChange}
        existingClasses={existingClasses}
        setExistingClasses={setExistingClasses}
        setMessage={setMessage}
        refreshStudents={refreshStudents}
      />

      {/* Add Dialog */}
      <AddDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        formData={formData}
        setFormData={setFormData}
        packages={packages}
        scheduledClasses={scheduledClasses}
        setScheduledClasses={handleScheduledClassesChange}
        setMessage={setMessage}
        refreshStudents={refreshStudents}
      />

      {/* Reset Password Dialog */}
      <Dialog 
        open={resetPassOpen} 
        onClose={handleCloseResetPassDialog}
        PaperProps={{
          sx: {
            borderRadius: '5px',
            width: '100%',
            maxWidth: { xs: '95%', sm: 500 },
            background: theme?.mode === 'light' ? '#fff' : '#151521',
            color: theme?.text?.primary,
            padding: 0,
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 2,
          borderBottom: theme?.mode === 'light' 
            ? '1px solid rgba(0, 0, 0, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.12)',
          color: theme?.text?.primary,
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 3 },
          fontSize: { xs: '1.2rem', sm: '1.5rem' },
          fontWeight: 600,
          backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d'
        }}>
          {translations.resetPassword}
        </DialogTitle>
        <DialogContent sx={{ 
          p: { xs: 2, sm: 3 }, 
          pb: { xs: 2, sm: 3 }, 
          overflowY: 'auto', 
          backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d' 
        }}>
          <Box sx={{ mb: 4 }}></Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField 
              label={translations.newPassword}
              name="newPassword"
              type="password"
              value={resetPasswordData.newPassword}
              onChange={handlePasswordChange}
              fullWidth
              variant="outlined"
              sx={textFieldStyle(theme)}
            />
            <TextField 
              label={translations.confirmPassword}
              name="confirmPassword"
              type="password"
              value={resetPasswordData.confirmPassword}
              onChange={handlePasswordChange}
              fullWidth
              variant="outlined"
              sx={textFieldStyle(theme)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 2, sm: 3 },
          borderTop: theme?.mode === 'light' 
            ? '1px solid rgba(0, 0, 0, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.12)',
          gap: { xs: 1, sm: 2 },
          backgroundColor: theme.mode === 'light' ? '#fff' : '#1e1e2d',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          <Button 
            onClick={handleCloseResetPassDialog}
            variant="outlined"
            fullWidth={isMobile}
            sx={{
              ...secondaryButtonStyle,
              minWidth: { xs: '100%', sm: 120 },
              height: { xs: 36, sm: 42 },
            }}
          >
            {translations.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={() => handleResetPassword(selectedStudent.id)}
            fullWidth={isMobile}
            sx={{
              ...primaryButtonStyle,
              minWidth: { xs: '100%', sm: 120 },
              height: { xs: 36, sm: 42 },
            }}
          >
            {translations.resetPassword}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteStudent}
        title={translations.confirmDelete || 'Confirm Delete'}
        message={translations.confirmDeleteStudentMessage || 
          `Are you sure you want to delete ${selectedStudent?.name} ${selectedStudent?.surname}? This action cannot be undone.`}
        confirmButtonText={translations.delete || 'Delete'}
        cancelButtonText={translations.cancel || 'Cancel'}
        isLoading={isDeleting}
        theme={theme}
      />

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
          bottom: { xs: 16, sm: 24 },
          zIndex: 9999 // Ensure it appears above modals
        }}
      >
        <Alert 
          onClose={handleCloseMessage} 
          severity={message.severity}
          sx={{
            width: '100%',
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            zIndex: 9999 // Ensure alert appears above modals
          }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </ThemeTransition>
  );
} 