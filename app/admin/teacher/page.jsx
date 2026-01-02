'use client';
import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableHead, 
  TableRow, TableContainer, Button, TextField, IconButton, Avatar, 
  Chip, Tooltip, CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon,
  LockReset as LockResetIcon, School as TeacherIcon,
  Search as SearchIcon, Close as CloseIcon,
  Refresh as RefreshIcon, Event as EventIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTheme } from '@/app/contexts/ThemeContext';
import ThemeToggle from '@/app/components/ThemeToggle';
import LanguageToggle from '@/app/components/LanguageToggle';
import ThemeTransition from '@/app/components/ThemeTransition';
import AddDialog from './components/AddDialog';
import EditDialog from './components/EditDialog';
import ViewDialog from './components/ViewDialog';
import ScheduleDialog from './components/ScheduleDialog';
import ConfirmationDialog from '@/app/components/ConfirmationDialog';
import { fetchWithAuth } from '@/app/utils/api';
import { teacherAPI } from '@/app/utils/teacherAPI';

// Table headers
const getHeaders = (translations) => [
  { id: 'name', label: translations.name || 'Name' },
  { id: 'email', label: translations.email || 'Email' },
  { id: 'phone', label: translations.phone || 'Phone' },
  { id: 'workHours', label: translations.workHours || 'Work Hours' },
  { id: 'coordinator', label: translations.role || 'Role' },
  { id: 'status', label: translations.status || 'Status' },
  { id: 'actions', label: translations.actions || 'Actions' },
];

// Custom hook to handle page scroll
const useScrollRestoration = () => {
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);
};

export default function Teachers() {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  useScrollRestoration();
  
  // Get headers with translations
  const headers = getHeaders(translations);
  
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    password: '',
    confirmPassword: '',
    isResetting: false
  });

  // Fetch teachers data
  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/teachers');
      setTeachers(response);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setMessage({
        open: true,
        text: error.message || 'Failed to fetch teachers',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTeachers();
  }, []);

  // Check if device is mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter teachers based on search query
  const filteredTeachers = teachers.filter(teacher => {
    const name = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
    const email = teacher.user?.email?.toLowerCase() || '';
    const phone = teacher.phone?.toLowerCase() || '';
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

  const handleViewTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setViewOpen(true);
  };

  const handleEditTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setEditOpen(true);
  };

  const handleAddTeacher = () => {
    setAddOpen(true);
  };

  const handleSchedule = (teacher) => {
    setSelectedTeacher(teacher);
    setScheduleOpen(true);
  };

  const handleOpenResetPassword = (teacher) => {
    setSelectedTeacher(teacher);
    setResetPasswordData({
      password: '',
      confirmPassword: '',
      isResetting: false
    });
    setResetPasswordOpen(true);
  };

  const handleResetPassword = async () => {
    // Validate passwords match
    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      setMessage({
        open: true,
        text: translations.passwordsDoNotMatch || 'Passwords do not match',
        severity: 'error'
      });
      return;
    }

    // Validate password is not empty
    if (!resetPasswordData.password) {
      setMessage({
        open: true,
        text: translations.passwordRequired || 'Password is required',
        severity: 'error'
      });
      return;
    }

    try {
      setResetPasswordData(prev => ({ ...prev, isResetting: true }));
      
      console.log(`Attempting to reset password for teacher ID: ${selectedTeacher.id}`);
      
      await fetchWithAuth(`/teachers/${selectedTeacher.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: resetPasswordData.password }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Password reset successful');
      
      setMessage({
        open: true,
        text: translations.passwordResetSuccess || 'Password reset successfully',
        severity: 'success'
      });
      
      // Close the dialog
      setResetPasswordOpen(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      setMessage({
        open: true,
        text: error.message || 'Failed to reset password',
        severity: 'error'
      });
    } finally {
      setResetPasswordData(prev => ({ ...prev, isResetting: false }));
    }
  };

  const handleResetPasswordChange = (e) => {
    const { name, value } = e.target;
    setResetPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const refreshTeachers = () => {
    fetchTeachers();
  };
  
  // Handle delete teacher
  const handleOpenDeleteDialog = (teacher) => {
    setSelectedTeacher(teacher);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;
    
    try {
      setIsDeleting(true);
      
      await teacherAPI.deleteTeacher(selectedTeacher.id);
      
      // Update UI by removing the deleted teacher
      setTeachers((prevTeachers) => 
        prevTeachers.filter(teacher => teacher.id !== selectedTeacher.id)
      );
      
      // Show success message
      setMessage({
        open: true,
        text: translations.teacherDeleteSuccess || 'Teacher deleted successfully',
        severity: 'success'
      });
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setSelectedTeacher(null);
    } catch (error) {
      console.error('Error deleting teacher:', error);
      setMessage({
        open: true,
        text: error.message || translations.errorDeletingTeacher || 'Error deleting teacher',
        severity: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
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
          {translations.teacherManagement || 'Teacher Management'}
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
            onClick={refreshTeachers}
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
            onClick={handleAddTeacher}
            size={isMobile ? "small" : "medium"}
            sx={{
              ...primaryButtonStyle,
              px: { xs: 2, sm: 3 },
              height: { xs: 36, sm: 40 },
              ...(isMobile && { flex: '1 1 auto' })
            }}
          >
            {isMobile ? 'Add' : 'Add Teacher'}
          </Button>
        </Box>
      </Box>
      
      {/* Search Box and Teachers Table */}
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
        {/* Search Box */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center',
          gap: 2,
          borderBottom: '1px solid',
          borderColor: theme.mode === 'light' 
            ? 'rgba(0, 0, 0, 0.1)' 
            : 'rgba(255, 255, 255, 0.1)',
        }}>
          <TextField
            placeholder={translations.searchTeachers || "Search teachers..."}
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: theme.text?.secondary }} />,
              sx: {
                backgroundColor: theme.mode === 'light' ? 'white' : 'rgba(0, 0, 0, 0.15)',
                '& fieldset': {
                  borderColor: theme.mode === 'light' 
                    ? 'rgba(0, 0, 0, 0.15)' 
                    : 'rgba(255, 255, 255, 0.15)',
                },
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
            {filteredTeachers.length} {translations.teachers || 'Teachers'}
          </Typography>
        </Box>
        
        {/* Teachers Table */}
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
                      ...(isMobile && header.id === 'workHours' ? { display: 'none' } : {}),
                      ...(header.id === 'phone' ? { minWidth: '120px' } : {})
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
                      {translations.loading || 'Loading teachers...'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headers.length} align="center" sx={{ py: 5 }}>
                    <Typography variant="body1" sx={{ color: theme.text?.secondary }}>
                      {searchQuery 
                        ? (translations.noTeachersFound || 'No teachers found matching your search.') 
                        : (translations.noTeachers || 'No teachers available. Add your first teacher!')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers.map((teacher, index) => (
                  <TableRow 
                    key={teacher.id} 
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
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ 
                          bgcolor: '#845EC2', 
                          width: { xs: 28, sm: 32 }, 
                          height: { xs: 28, sm: 32 },
                          mr: { xs: 1, sm: 1.5 },
                          fontSize: { xs: '0.8rem', sm: '1rem' }
                        }}>
                          {teacher.firstName ? teacher.firstName[0].toUpperCase() : 'T'}
                        </Avatar>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 500,
                          fontSize: { xs: '0.8rem', sm: 'inherit' }
                        }}>
                          {teacher.firstName} {teacher.lastName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{teacher.user?.email}</TableCell>
                    <TableCell>
                      {teacher.phone}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {Object.keys(teacher.workHours || {}).length} days configured
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={teacher.isCoordinator ? 'Coordinator' : 'Teacher'}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          bgcolor: teacher.isCoordinator
                            ? theme.mode === 'light' ? 'rgba(132, 94, 194, 0.1)' : 'rgba(132, 94, 194, 0.2)'
                            : theme.mode === 'light' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.2)',
                          color: teacher.isCoordinator ? '#845EC2' : '#1976d2',
                          fontSize: { xs: '0.7rem', sm: '0.8rem' },
                          height: { xs: 20, sm: 24 }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={teacher.active ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          bgcolor: teacher.active
                            ? theme.mode === 'light' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.2)'
                            : theme.mode === 'light' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.2)',
                          color: teacher.active ? '#2e7d32' : '#d32f2f',
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
                            onClick={() => handleViewTeacher(teacher)}
                            sx={{ color: theme.mode === 'light' ? '#845EC2' : '#B39CD0' }}
                          >
                            <ViewIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={translations.edit || 'Edit'} placement="top" arrow>
                          <IconButton 
                            size="small"
                            onClick={() => handleEditTeacher(teacher)}
                            sx={{ color: theme.mode === 'light' ? '#00a8ff' : '#74b9ff' }}
                          >
                            <EditIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={translations.schedule || 'Schedule'} placement="top" arrow>
                          <IconButton 
                            size="small"
                            onClick={() => handleSchedule(teacher)}
                            sx={{ color: theme.mode === 'light' ? '#4CAF50' : '#81C784' }}
                          >
                            <EventIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={translations.resetPassword || 'Reset Password'} placement="top" arrow>
                          <IconButton 
                            size="small"
                            onClick={() => handleOpenResetPassword(teacher)}
                            sx={{ color: theme.mode === 'light' ? '#ff9f43' : '#feca57' }}
                          >
                            <LockResetIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={translations.delete || 'Delete'} placement="top" arrow>
                          <IconButton 
                            size="small"
                            onClick={() => handleOpenDeleteDialog(teacher)}
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

      {/* Dialogs */}
      <ViewDialog
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher}
      />

      <EditDialog
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher}
        setMessage={setMessage}
        refreshTeachers={refreshTeachers}
      />

      <AddDialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
        }}
        setMessage={setMessage}
        refreshTeachers={refreshTeachers}
      />

      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => {
          setScheduleOpen(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher}
        refreshTeachers={refreshTeachers}
      />

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordOpen}
        onClose={() => {
          if (!resetPasswordData.isResetting) {
            setResetPasswordOpen(false);
            setSelectedTeacher(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle 
          sx={{ 
            bgcolor: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.1)' : 'rgba(132, 94, 194, 0.2)',
            color: theme.text?.primary
          }}
        >
          {translations.resetPassword || 'Reset Password'} 
          {selectedTeacher && ` - ${selectedTeacher.firstName} ${selectedTeacher.lastName}`}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 3, color: theme.text?.secondary }}>
            {translations.resetPasswordDesc || 'Enter a new password for this teacher.'}
          </Typography>
          
          <TextField
            name="password"
            label={translations.newPassword || "New Password"}
            type="password"
            fullWidth
            value={resetPasswordData.password}
            onChange={handleResetPasswordChange}
            margin="normal"
            variant="outlined"
            disabled={resetPasswordData.isResetting}
          />
          
          <TextField
            name="confirmPassword"
            label={translations.confirmPassword || "Confirm Password"}
            type="password"
            fullWidth
            value={resetPasswordData.confirmPassword}
            onChange={handleResetPasswordChange}
            margin="normal"
            variant="outlined"
            disabled={resetPasswordData.isResetting}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => {
              setResetPasswordOpen(false);
              setSelectedTeacher(null);
            }}
            color="inherit"
            disabled={resetPasswordData.isResetting}
          >
            {translations.cancel || 'Cancel'}
          </Button>
          <Button
            onClick={handleResetPassword}
            variant="contained"
            sx={primaryButtonStyle}
            disabled={
              resetPasswordData.isResetting || 
              !resetPasswordData.password || 
              resetPasswordData.password !== resetPasswordData.confirmPassword
            }
            startIcon={
              resetPasswordData.isResetting ? 
                <CircularProgress size={20} color="inherit" /> : 
                <LockResetIcon />
            }
          >
            {resetPasswordData.isResetting 
              ? (translations.resetting || 'Resetting...') 
              : (translations.resetPassword || 'Reset Password')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteTeacher}
        title={translations.confirmDelete || 'Confirm Delete'}
        message={translations.confirmDeleteTeacherMessage || 
          `Are you sure you want to delete ${selectedTeacher?.firstName} ${selectedTeacher?.lastName}? This action cannot be undone.`}
        confirmButtonText={translations.delete || 'Delete'}
        cancelButtonText={translations.cancel || 'Cancel'}
        isLoading={isDeleting}
        theme={theme}
      />

      {/* Message Snackbar */}
      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={() => setMessage({ ...message, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setMessage({ ...message, open: false })}
          severity={message.severity}
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </ThemeTransition>
  );
} 