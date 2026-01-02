'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Switch,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  TableContainer,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  CalendarMonth as CalendarIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageToggle from '../../components/LanguageToggle';
import { packageAPI } from '../../utils/api';
import Loading from '../../components/Loading';
import ThemeTransition from '../../components/ThemeTransition';

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

export default function Packages() {
  const { translations } = useLanguage();
  const { theme } = useTheme();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewStudentsOpen, setViewStudentsOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    totalClasses: 4,
    durationMonths: 1,
    maxReschedules: 1,
    price: 0,
  });
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });

  // Apply scroll restoration
  useScrollRestoration();

  // Check if device is mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch packages data
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        const data = await packageAPI.getAllPackages();
        setPackages(data);
      } catch (error) {
        console.error('Error fetching packages:', error);
        setMessage({
          open: true,
          text: translations.errorLoadingPackages || 'Error loading packages. Please try again.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [translations]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'price' || name === 'totalClasses' || name === 'durationMonths' || name === 'maxReschedules' ? Number(value) : value });
  };

  const handleAddPackage = () => {
    setFormData({
      name: '',
      description: '',
      totalClasses: 4,
      durationMonths: 1,
      maxReschedules: 1,
      price: 0,
      active: true,
    });
    setOpen(true);
  };

  const handleEditPackage = (pkg) => {
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      totalClasses: pkg.totalClasses,
      durationMonths: pkg.durationMonths,
      maxReschedules: pkg.maxReschedules,
      price: pkg.price,
      active: pkg.active,
    });
    setSelectedPackage(pkg);
    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await packageAPI.createPackage(formData);
      
      // The server returns an object with the created package in a 'package' property
      const newPackage = response.package || response;
      
      setPackages([...packages, newPackage]);
      setOpen(false);
      setMessage({
        open: true,
        text: translations.packageAddedSuccess || 'Package added successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error creating package:', error);
      setMessage({
        open: true,
        text: error.message || translations.errorAddingPackage || 'Error adding package. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const response = await packageAPI.updatePackage(selectedPackage.id, formData);
      
      // The server returns an object with the updated package in a 'package' property
      const updatedPackage = response.package || response;
      
      setPackages(packages.map(pkg => pkg.id === selectedPackage.id ? updatedPackage : pkg));
      setEditOpen(false);
      setMessage({
        open: true,
        text: translations.packageUpdatedSuccess || 'Package updated successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating package:', error);
      setMessage({
        open: true,
        text: error.message || translations.errorUpdatingPackage || 'Error updating package. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const packageToUpdate = packages.find(pkg => pkg.id === id);
      if (!packageToUpdate) return;
      
      // Create a temporary updated version for immediate UI update
      const tempUpdatedPackage = {
        ...packageToUpdate,
        active: !packageToUpdate.active
      };
      
      // Update UI immediately to avoid flicker
      setPackages(packages.map(pkg => pkg.id === id ? tempUpdatedPackage : pkg));
      
      const updatedData = { active: !packageToUpdate.active };
      const result = await packageAPI.updatePackage(id, updatedData);
      
      // After API call completes, update with actual server data
      if (result && result.package) {
        setPackages(packages.map(pkg => pkg.id === id ? result.package : pkg));
      }
      
      setMessage({
        open: true,
        text: tempUpdatedPackage.active 
          ? (translations.packageActivatedSuccess || 'Package activated successfully!') 
          : (translations.packageDeactivatedSuccess || 'Package deactivated successfully!'),
        severity: 'success'
      });
    } catch (error) {
      console.error('Error toggling package status:', error);
      
      // Revert the UI change if there was an error
      setPackages(packages.map(pkg => pkg.id === id ? { ...pkg, active: !pkg.active } : pkg));
      
      setMessage({
        open: true,
        text: error.message || translations.errorUpdatingPackage || 'Error updating package. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleViewStudents = async (packageId) => {
    try {
      if (!packageId || isNaN(Number(packageId))) {
        setMessage({
          open: true,
          text: translations.invalidPackageId || 'Invalid package ID',
          severity: 'error'
        });
        return;
      }
      
      setLoading(true);
      setStudentSearchQuery(''); // Reset search when opening modal
      
      // Set the selected package name for display in the dialog
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        setSelectedPackage(pkg);
      } else {
        // If package not found in state, try to fetch it
        try {
          const packageData = await packageAPI.getPackageById(packageId);
          if (packageData) {
            setSelectedPackage(packageData);
          }
        } catch (packageError) {
          console.error('Error fetching package details:', packageError);
        }
      }
      
      const data = await packageAPI.getPackageStudents(packageId);
      
      // Group student packages by student ID to handle multiple packages per student
      const studentPackagesMap = (Array.isArray(data) ? data : []).reduce((acc, studentPackage) => {
        if (!studentPackage.student) return acc;
        
        const studentId = studentPackage.student.id;
        if (!acc[studentId]) {
          acc[studentId] = {
            student: studentPackage.student,
            packages: []
          };
        }
        
        acc[studentId].packages.push(studentPackage);
        return acc;
      }, {});
      
      // Convert map to array
      const groupedStudents = Object.values(studentPackagesMap);
      
      setSelectedStudents(groupedStudents);
      setViewStudentsOpen(true);
    } catch (error) {
      console.error('Error fetching package students:', error);
      setMessage({
        open: true,
        text: error.message || translations.errorFetchingStudents || 'Error fetching students. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMessage = () => {
    setMessage({ ...message, open: false });
  };

  // Filter students based on search query - This is a new function
  const filteredStudents = selectedStudents.filter(studentData => {
    if (!studentSearchQuery.trim()) return true;
    
    const fullName = `${studentData.student?.name || ''} ${studentData.student?.surname || ''}`.toLowerCase();
    const email = studentData.student?.user?.email?.toLowerCase() || '';
    const query = studentSearchQuery.toLowerCase();
    
    return fullName.includes(query) || email.includes(query);
  });

  if (loading && packages.length === 0) {
    return <Loading />;
  }

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
      {/* Header */}
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
          {translations.packageManagement}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1, sm: 2 }, 
          alignItems: 'center',
          width: { xs: '100%', sm: 'auto' }
        }}>
          <ThemeToggle />
          <LanguageToggle />
          <Button
            component={motion.button}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddPackage}
            size={isMobile ? "small" : "medium"}
            sx={{
              background: '#845EC2',
              '&:hover': {
                background: '#6B46C1',
              },
              color: 'white',
              px: { xs: 2, sm: 3 },
              height: { xs: 36, sm: 40 },
              flex: { xs: 1, sm: 'auto' },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            {isMobile ? (translations.addNew || 'Add New') : translations.addNewPackage}
          </Button>
        </Box>
      </Box>

      {/* Packages Table */}
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
            minWidth: { xs: 400, sm: 'auto' },
            transition: 'all 0.3s ease',
          },
          '& .MuiTableContainer-root': {
            maxHeight: 'none',
            overflow: { xs: 'auto', sm: 'visible' },
          },
          boxShadow: theme.mode === 'light' 
            ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' 
            : '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '0.95rem' },
                  color: theme?.text?.primary,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  py: { xs: 1.5, sm: 2 },
                  px: { xs: 1, sm: 2 },
                }}>{translations.packageName || 'Package Name'}</TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  fontSize: { xs: '0.8rem', sm: '0.95rem' }, 
                  color: theme?.text?.primary,
                  display: { xs: 'none', sm: 'table-cell' },
                }}>
                  {translations.description || 'Description'}
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  fontSize: { xs: '0.8rem', sm: '0.95rem' }, 
                  color: theme?.text?.primary,
                }}>
                  {translations.totalClasses || 'Total Classes'}
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  fontSize: { xs: '0.8rem', sm: '0.95rem' }, 
                  color: theme?.text?.primary,
                  display: { xs: 'none', sm: 'table-cell' },
                }}>
                  {translations.maxReschedules || 'Max Reschedules'}
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  fontSize: { xs: '0.8rem', sm: '0.95rem' }, 
                  color: theme?.text?.primary,
                }}>
                  {translations.status || 'Status'}
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  fontSize: { xs: '0.8rem', sm: '0.95rem' }, 
                  color: theme?.text?.primary,
                }}>
                  {translations.actions || 'Actions'}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow 
                  key={pkg.id}
                  sx={{
                    '& td': {
                      color: theme?.text?.primary,
                      borderColor: theme?.mode === 'light' 
                        ? 'rgba(0, 0, 0, 0.1)' 
                        : 'rgba(255, 255, 255, 0.08)',
                      padding: { xs: '10px 8px', sm: '12px 16px' },
                      fontSize: { xs: '0.8rem', sm: 'inherit' }
                    },
                    transition: 'background-color 0.3s ease',
                    '&:hover': {
                      backgroundColor: theme?.mode === 'light' 
                        ? 'rgba(0, 0, 0, 0.02)' 
                        : 'rgba(255, 255, 255, 0.03)',
                    },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SchoolIcon sx={{ color: '#845EC2', fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                      {pkg.name}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{pkg.description}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ color: '#D65DB1', fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                      {pkg.totalClasses}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RefreshIcon sx={{ color: '#FF6F91', fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                      {pkg.maxReschedules}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={pkg.active}
                      onChange={() => handleToggleActive(pkg.id)}
                      color="primary"
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#845EC2',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#845EC2',
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={translations.edit || 'Edit'} placement="top" arrow>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditPackage(pkg)}
                          sx={{ color: '#845EC2' }}
                        >
                          <EditIcon fontSize={isMobile ? "small" : "medium"} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={translations.viewStudents || 'View Students'} placement="top" arrow>
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewStudents(pkg.id)}
                          sx={{ color: '#D65DB1' }}
                        >
                          <SchoolIcon fontSize={isMobile ? "small" : "medium"} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add Package Dialog */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            width: '100%',
            maxWidth: { xs: '95%', sm: 500 },
            minHeight: { xs: 'auto', sm: 600 },
            background: theme?.mode === 'light' ? '#fff' : '#1a1a1a',
            color: theme?.text?.primary,
            padding: 0,
            '& ::-webkit-scrollbar': {
              width: '8px',
            },
            '& ::-webkit-scrollbar-track': {
              background: theme?.mode === 'light' ? '#f1f1f1' : '#2d2d2d',
            },
            '& ::-webkit-scrollbar-thumb': {
              background: theme?.mode === 'light' ? '#888' : '#555',
              borderRadius: '4px',
              '&:hover': {
                background: theme?.mode === 'light' ? '#555' : '#777',
              },
            },
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
        }}>
          {translations.addNewPackage}
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 3, sm: 4 }, pb: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 4 } }}>
            <TextField
              label={translations.packageName || 'Package Name'}
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={textFieldStyle(theme)}
            />
            <TextField
              label={translations.description || 'Description'}
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={textFieldStyle(theme)}
            />
            <TextField
              label={translations.totalClasses || 'Total Classes'}
              name="totalClasses"
              type="number"
              value={formData.totalClasses}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={textFieldStyle(theme)}
            />
            <TextField
              label={translations.durationMonths || 'Duration (Months)'}
              name="durationMonths"
              type="number"
              value={formData.durationMonths}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
            <TextField
              label={translations.maxReschedules || 'Max Reschedules'}
              name="maxReschedules"
              type="number"
              value={formData.maxReschedules}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
            <TextField
              label={translations.price || 'Price'}
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 2, sm: 3 }, 
          px: { xs: 2, sm: 4 },
          gap: { xs: 1, sm: 2 },
          borderTop: theme?.mode === 'light' 
            ? '1px solid rgba(0, 0, 0, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.12)',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          <Button 
            onClick={() => setOpen(false)}
            variant="outlined"
            fullWidth={isMobile}
            sx={{
              ...secondaryButtonStyle(theme),
              minWidth: { xs: '100%', sm: 120 },
              height: { xs: 36, sm: 42 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            {translations.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            fullWidth={isMobile}
            sx={{
              ...primaryButtonStyle,
              minWidth: { xs: '100%', sm: 120 },
              height: { xs: 36, sm: 42 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            {translations.save}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Package Dialog - make similar responsive changes as the Add Package Dialog */}
      <Dialog 
        open={editOpen} 
        onClose={() => setEditOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            width: '100%',
            maxWidth: { xs: '95%', sm: 500 },
            minHeight: { xs: 'auto', sm: 600 },
            background: theme?.mode === 'light' ? '#fff' : '#1a1a1a',
            color: theme?.text?.primary,
            padding: 0,
            '& ::-webkit-scrollbar': {
              width: '8px',
            },
            '& ::-webkit-scrollbar-track': {
              background: theme?.mode === 'light' ? '#f1f1f1' : '#2d2d2d',
            },
            '& ::-webkit-scrollbar-thumb': {
              background: theme?.mode === 'light' ? '#888' : '#555',
              borderRadius: '4px',
              '&:hover': {
                background: theme?.mode === 'light' ? '#555' : '#777',
              },
            },
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
        }}>
          {translations.editPackage}
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 3, sm: 4 }, pb: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 4 } }}>
            <TextField
              label={translations.packageName || 'Package Name'}
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={textFieldStyle(theme)}
            />
            <TextField
              label={translations.description || 'Description'}
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={textFieldStyle(theme)}
            />
            <TextField
              label={translations.totalClasses || 'Total Classes'}
              name="totalClasses"
              type="number"
              value={formData.totalClasses}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={textFieldStyle(theme)}
            />
            <TextField
              label={translations.durationMonths || 'Duration (Months)'}
              name="durationMonths"
              type="number"
              value={formData.durationMonths}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
            <TextField
              label={translations.maxReschedules || 'Max Reschedules'}
              name="maxReschedules"
              type="number"
              value={formData.maxReschedules}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
            <TextField
              label={translations.price || 'Price'}
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              margin="normal"
              sx={{
                ...textFieldStyle(theme),
                mt: 0
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 2, sm: 3 }, 
          px: { xs: 2, sm: 4 },
          gap: { xs: 1, sm: 2 },
          borderTop: theme?.mode === 'light' 
            ? '1px solid rgba(0, 0, 0, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.12)',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          <Button 
            onClick={() => setEditOpen(false)}
            variant="outlined"
            fullWidth={isMobile}
            sx={{
              ...secondaryButtonStyle(theme),
              minWidth: { xs: '100%', sm: 120 },
              height: { xs: 36, sm: 42 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            {translations.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            fullWidth={isMobile}
            sx={{
              ...primaryButtonStyle,
              minWidth: { xs: '100%', sm: 120 },
              height: { xs: 36, sm: 42 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            {translations.saveChanges}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Students Dialog - also make responsive */}
      <Dialog 
        open={viewStudentsOpen} 
        onClose={() => setViewStudentsOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            width: '100%',
            maxWidth: { xs: '95%', sm: 700 },
            maxHeight: '90vh',
            background: theme?.mode === 'light' ? '#fff' : '#1a1a1a',
            color: theme?.text?.primary,
            padding: 0,
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
        }}>
          {selectedPackage ? 
            `${translations.studentsUsing || 'Students Using'} ${selectedPackage.name}` :
            translations.studentsUsingPackage || 'Students Using This Package'
          }
        </DialogTitle>
        
        <Box sx={{ 
          px: { xs: 2, sm: 3 },
          pt: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: theme?.mode === 'light' 
            ? '1px solid rgba(0, 0, 0, 0.08)' 
            : '1px solid rgba(255, 255, 255, 0.08)',
          pb: 2,
          backgroundColor: theme.mode === 'light'
            ? 'rgba(132, 94, 194, 0.05)'
            : 'rgba(132, 94, 194, 0.15)',
        }}>
          <TextField
            placeholder={translations.searchStudents || 'Search students...'}
            value={studentSearchQuery}
            onChange={(e) => setStudentSearchQuery(e.target.value)}
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
              width: '100%',
            }}
          />
        </Box>
        
        <DialogContent sx={{ 
          p: { xs: 1, sm: 2 },
          overflowY: 'auto',
          background: theme?.mode === 'light' ? '#fff' : '#1a1a1a',
          minHeight: '300px',
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress size={40} sx={{ color: '#845EC2' }} />
            </Box>
          ) : filteredStudents.length > 0 ? (
            <Box>
              {filteredStudents.map((studentData) => (
                <Card key={studentData.student.id} sx={{ 
                  mb: 2, 
                  borderRadius: 2,
                  boxShadow: theme.mode === 'light' 
                    ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' 
                    : '0 2px 6px rgba(0,0,0,0.3)',
                  overflow: 'hidden',
                  backgroundColor: theme.mode === 'light' ? '#fff' : 'rgba(42, 50, 74, 0.7)'
                }}>
                  <Box sx={{ 
                    p: 2,
                    bgcolor: theme.mode === 'light' ? 'rgba(132, 94, 194, 0.1)' : 'rgba(132, 94, 194, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}>
                    <Avatar sx={{ 
                      bgcolor: '#845EC2', 
                      width: { xs: 32, sm: 40 }, 
                      height: { xs: 32, sm: 40 },
                      fontSize: { xs: '0.9rem', sm: '1.1rem' }
                    }}>
                      {studentData.student?.name ? studentData.student.name[0].toUpperCase() : 'S'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ 
                        fontWeight: 600,
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        color: theme.text?.primary
                      }}>
                        {studentData.student?.name} {studentData.student?.surname}
                      </Typography>
                      {studentData.student?.user?.email && (
                        <Typography variant="body2" sx={{ 
                          color: theme.text?.secondary,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' }
                        }}>
                          {studentData.student.user.email}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  
                  <Table size="small">
                    <TableHead sx={{ 
                      bgcolor: theme.mode === 'light' 
                        ? 'rgba(132, 94, 194, 0.05)' 
                        : 'rgba(132, 94, 194, 0.1)'
                    }}>
                      <TableRow>
                        <TableCell sx={{ 
                          fontWeight: 600,
                          fontSize: { xs: '0.75rem', sm: '0.8rem' },
                          color: theme.mode === 'light' ? '#5D3E9E' : '#9D7DD6',
                          py: 1
                        }}>
                          {translations.purchaseDate || 'Purchase Date'}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 600,
                          fontSize: { xs: '0.75rem', sm: '0.8rem' },
                          color: theme.mode === 'light' ? '#5D3E9E' : '#9D7DD6',
                          py: 1
                        }}>
                          {translations.remainingClasses || 'Remaining Classes'}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 600,
                          fontSize: { xs: '0.75rem', sm: '0.8rem' },
                          color: theme.mode === 'light' ? '#5D3E9E' : '#9D7DD6',
                          py: 1
                        }}>
                          {translations.status || 'Status'}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentData.packages.map((studentPackage) => (
                        <TableRow key={studentPackage.id}>
                          <TableCell sx={{ 
                            fontSize: { xs: '0.75rem', sm: '0.8rem' },
                            py: 1
                          }}>
                            {new Date(studentPackage.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell sx={{ 
                            fontSize: { xs: '0.75rem', sm: '0.8rem' },
                            py: 1
                          }}>
                            {studentPackage.remainingClasses}
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Box 
                              component="span" 
                              sx={{
                                py: { xs: 0.2, sm: 0.3 },
                                px: { xs: 0.8, sm: 1 },
                                borderRadius: '4px',
                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                fontWeight: 'medium',
                                backgroundColor: getStatusColor(studentPackage.status, theme),
                                color: getStatusTextColor(studentPackage.status)
                              }}
                            >
                              {studentPackage.status}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px',
              color: theme?.text?.secondary,
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}>
              {studentSearchQuery 
                ? (translations.noStudentsFound || 'No students found matching your search')
                : (translations.noStudentsFound || 'No students found for this package')}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 2, sm: 3 }, 
          px: { xs: 2, sm: 4 },
          borderTop: theme?.mode === 'light' 
            ? '1px solid rgba(0, 0, 0, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.12)',
        }}>
          <Button 
            onClick={() => setViewStudentsOpen(false)}
            variant="outlined"
            sx={{
              ...secondaryButtonStyle(theme),
              minWidth: { xs: '100%', sm: 120 },
              height: { xs: 36, sm: 42 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            {translations.close || 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
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
            fontSize: { xs: '0.8rem', sm: '0.875rem' }
          }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </ThemeTransition>
  );
}

// Styles
const textFieldStyle = (theme) => ({
  marginTop: 1,
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme?.mode === 'light' ? '#fff' : 'rgba(255, 255, 255, 0.05)',
    height: 56,
    '& fieldset': {
      borderColor: theme?.mode === 'light' 
        ? 'rgba(0, 0, 0, 0.23)' 
        : 'rgba(255, 255, 255, 0.23)',
    },
    '&:hover fieldset': {
      borderColor: '#845EC2',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#845EC2',
    },
  },
  '& .MuiInputLabel-root': {
    color: theme?.mode === 'light' 
      ? 'rgba(0, 0, 0, 0.7)' 
      : 'rgba(255, 255, 255, 0.7)',
    '&.Mui-focused': {
      color: '#845EC2',
    },
    transform: 'translate(14px, 20px) scale(1)',
    '&.MuiInputLabel-shrink': {
      transform: 'translate(14px, -6px) scale(0.75)',
    },
  },
  '& .MuiInputBase-input': {
    color: theme?.mode === 'light' 
      ? 'rgba(0, 0, 0, 0.87)' 
      : 'rgba(255, 255, 255, 0.87)',
    padding: '14px 14px',
  },
});

const primaryButtonStyle = {
  background: '#845EC2',
  color: '#ffffff',
  '&:hover': {
    background: '#6B46C1',
  },
};

const secondaryButtonStyle = (theme) => ({
  color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#ffffff',
  borderColor: 'rgba(132, 94, 194, 0.5)',
  '&:hover': {
    borderColor: '#845EC2',
    backgroundColor: theme?.mode === 'light'
      ? 'rgba(132, 94, 194, 0.08)'
      : 'rgba(132, 94, 194, 0.15)',
  },
});

// Helper functions for status colors - add these near other style functions
const getStatusColor = (status, theme) => {
  switch (status) {
    case 'active':
      return theme.mode === 'light' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.2)';
    case 'completed':
      return theme.mode === 'light' ? 'rgba(63, 81, 181, 0.1)' : 'rgba(63, 81, 181, 0.2)';
    case 'expired':
      return theme.mode === 'light' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.2)';
    case 'cancelled':
      return theme.mode === 'light' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.2)';
    default:
      return theme.mode === 'light' ? 'rgba(158, 158, 158, 0.1)' : 'rgba(158, 158, 158, 0.2)';
  }
};

const getStatusTextColor = (status) => {
  switch (status) {
    case 'active':
      return '#4caf50';
    case 'completed':
      return '#3f51b5';
    case 'expired':
      return '#ff9800';
    case 'cancelled':
      return '#f44336';
    default:
      return '#9e9e9e';
  }
}; 