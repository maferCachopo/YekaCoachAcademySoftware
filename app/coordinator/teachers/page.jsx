'use client';
import { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Chip, 
  Button, 
  CircularProgress,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import { 
  Person as PersonIcon,
  Search as SearchIcon,
  CalendarMonth as CalendarIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
// Import fetchWithAuth and timezone utilities
import { fetchWithAuth, timezoneUtils } from '@/app/utils/api';
import { ADMIN_TIMEZONE } from '@/app/utils/constants';

export default function TeacherSchedules() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth('/coordinator/teachers');
        setTeachers(data);
      } catch (err) {
        console.error('Error fetching teachers:', err);
        setError(err.message || 'Failed to fetch teachers');
        // Do not use mock data, just set empty array if fetch fails
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeachers();
  }, []);

  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return fullName.includes(searchLower) || 
           teacher.specialties.some(s => s.toLowerCase().includes(searchLower)) ||
           teacher.user.email.toLowerCase().includes(searchLower);
  });

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const formatWorkHours = (workHours) => {
    if (!workHours) return 'No work hours set';
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const { user } = useAuth();
    const userTimezone = user?.timezone || null;
    
    // Function to convert time from admin timezone to user timezone
    const formatTimeToUserTimezone = (time, day) => {
      if (!time) return time;
      
      // We need a valid date for the conversion, so we use the current week's corresponding day
      const today = new Date();
      const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
      
      if (dayIndex === -1) {
        // If day isn't recognized, use today's date as fallback
        return timezoneUtils.formatUserTime(today.toISOString().split('T')[0], time, ADMIN_TIMEZONE, userTimezone);
      }
      
      // Calculate the date for the specified day in the current week
      const dayDiff = dayIndex - today.getDay();
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + dayDiff);
      
      const dateString = targetDate.toISOString().split('T')[0];
      
      return timezoneUtils.formatUserTime(dateString, time, ADMIN_TIMEZONE, userTimezone);
    };
    
    return (
      <List dense>
        {days.map(day => {
          const hours = workHours[day];
          if (!hours || hours.length === 0) return null;
          
          return (
            <ListItem key={day}>
              <ListItemText 
                primary={day.charAt(0).toUpperCase() + day.slice(1)} 
                secondary={
                  <Box component="span" sx={{ display: 'block' }}>
                    {hours.map((slot, i) => (
                      <Chip 
                        key={i}
                        label={`${formatTimeToUserTimezone(slot.start, day)} - ${formatTimeToUserTimezone(slot.end, day)}`}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Teacher Schedules
      </Typography>

      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search teachers by name, specialty..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton onClick={clearSearch} edge="end">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      <Tabs 
        value={selectedTab} 
        onChange={handleTabChange} 
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="All Teachers" />
        <Tab label="By Specialty" />
        <Tab label="By Availability" />
      </Tabs>

      {selectedTab === 0 && (
        <Grid container spacing={3}>
          {filteredTeachers.length > 0 ? (
            filteredTeachers.map(teacher => (
              <Grid item xs={12} md={6} lg={4} key={teacher.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <Typography variant="h6">
                        {teacher.firstName} {teacher.lastName}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {teacher.user.email}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      {teacher.specialties && teacher.specialties.map((specialty, i) => (
                        <Chip 
                          key={i}
                          label={specialty}
                          color="primary"
                          variant="outlined"
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Work Hours:
                    </Typography>
                    
                    {formatWorkHours(teacher.workHours)}
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Link href={`/coordinator/teachers/${teacher.id}`} passHref>
                        <Button 
                          variant="outlined" 
                          startIcon={<CalendarIcon />}
                          component="a"
                        >
                          View Detailed Schedule
                        </Button>
                      </Link>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography>No teachers found matching your search criteria.</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {selectedTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography>Specialty filter view will be implemented here.</Typography>
        </Paper>
      )}

      {selectedTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography>Availability filter view will be implemented here.</Typography>
        </Paper>
      )}
    </Box>
  );
} 