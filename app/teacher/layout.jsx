'use client';
import { useState, useEffect } from 'react';
import {
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  IconButton, 
  Divider, 
  useMediaQuery,
  AppBar,
  Toolbar,
  Avatar
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  CalendarMonth as ScheduleIcon,
  Assignment as TasksIcon,
  School as ExamsIcon,
  History as HistoryIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ThemeTransition from '../components/ThemeTransition';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import TimezoneToggle from '../components/TimezoneToggle';

const DRAWER_WIDTH = 240;

// Define menu items
const menuItems = [
  { title: 'Dashboard', icon: DashboardIcon, path: '/teacher/dashboard' },
  { title: 'Schedule', icon: ScheduleIcon, path: '/teacher/schedule' },
  { title: 'Tasks', icon: TasksIcon, path: '/teacher/tasks' },
  { title: 'Exams', icon: ExamsIcon, path: '/teacher/exams' },
  { title: 'History', icon: HistoryIcon, path: '/teacher/history' },
];

export default function TeacherLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { translations } = useLanguage();
  const { logout, user } = useAuth();
  const isMobile = useMediaQuery('(max-width:768px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Close mobile drawer when navigating
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [pathname, isMobile]);

  // Handle sidebar toggle based on device type
  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      // Router navigation is handled in the auth context
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Render sidebar content
  const sidebarContent = (
    <ThemeTransition sx={{ 
      p: 2,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: theme?.sidebar?.background || theme?.palette?.background?.default,
    }}>
      {/* Sidebar Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            color: theme?.text?.primary,
            fontWeight: 'bold',
            flexGrow: 1,
            ml: isMobile || !sidebarOpen ? 0 : 1
          }}
        >
          {!sidebarOpen && !isMobile ? '' : translations.teacherPortal || 'Teacher Portal'}
        </Typography>
        <IconButton onClick={handleToggle}>
          {isMobile ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* User Info */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 3,
        px: 1
      }}>
        <Avatar 
          sx={{ 
            width: 40, 
            height: 40,
            bgcolor: theme?.palette?.primary?.main || '#845EC2'
          }}
        >
          {user?.firstName?.charAt(0) || 'T'}
        </Avatar>
        {(sidebarOpen || isMobile) && (
          <Box sx={{ ml: 2 }}>
            <Typography variant="subtitle2" sx={{ color: theme?.text?.primary }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" sx={{ color: theme?.text?.secondary }}>
              {translations.teacher || 'Teacher'}
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItem
              key={item.title}
              button
              onClick={() => router.push(item.path)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                backgroundColor: isActive 
                  ? theme?.sidebar?.activeBg || 'rgba(132, 94, 194, 0.1)' 
                  : 'transparent',
                color: isActive 
                  ? theme?.sidebar?.activeText || theme?.palette?.primary?.main || '#845EC2'
                  : theme?.text?.primary,
                '&:hover': {
                  backgroundColor: theme?.sidebar?.hoverBg || 'rgba(132, 94, 194, 0.05)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: sidebarOpen || isMobile ? 40 : 56,
                  color: isActive 
                    ? theme?.sidebar?.activeText || theme?.palette?.primary?.main || '#845EC2'
                    : theme?.text?.primary,
                }}
              >
                <item.icon />
              </ListItemIcon>
              {(sidebarOpen || isMobile) && (
                <ListItemText 
                  primary={translations[item.title.toLowerCase()] || item.title} 
                />
              )}
            </ListItem>
          );
        })}
      </List>
      
      {/* Bottom Actions */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: sidebarOpen || isMobile ? 'space-between' : 'center',
          mb: 2,
          px: sidebarOpen || isMobile ? 2 : 0,
          alignItems: 'center'
        }}>
          {(sidebarOpen || isMobile) && (
            <>
              <ThemeToggle />
              <LanguageToggle />
              <TimezoneToggle />
            </>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 1,
            color: theme?.text?.primary,
            '&:hover': {
              backgroundColor: theme?.sidebar?.hoverBg || 'rgba(132, 94, 194, 0.05)',
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: sidebarOpen || isMobile ? 40 : 56,
              color: theme?.text?.primary,
            }}
          >
            <LogoutIcon />
          </ListItemIcon>
          {(sidebarOpen || isMobile) && (
            <ListItemText primary={translations.logout || 'Logout'} />
          )}
        </ListItem>
      </Box>
    </ThemeTransition>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: theme?.background?.default || (theme?.mode === 'light' ? '#F8F9FC' : '#1A1F2B') }}>
      {/* Sidebar for desktop */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          open={sidebarOpen}
          sx={{
            width: sidebarOpen ? DRAWER_WIDTH : 72,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarOpen ? DRAWER_WIDTH : 72,
              boxSizing: 'border-box',
              border: 'none',
              boxShadow: theme?.mode === 'light' 
                ? '0px 0px 10px rgba(0, 0, 0, 0.1)' 
                : '0px 0px 10px rgba(0, 0, 0, 0.3)',
              transition: 'width 0.2s ease-in-out',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}
      
      {/* Sidebar for mobile */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              border: 'none',
              boxShadow: theme?.mode === 'light' 
                ? '0px 0px 10px rgba(0, 0, 0, 0.1)' 
                : '0px 0px 10px rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}
      
      {/* Mobile AppBar */}
      {isMobile && (
        <AppBar 
          position="fixed" 
          sx={{ 
            backgroundColor: theme?.card?.background || theme?.palette?.background?.paper,
            color: theme?.text?.primary,
            boxShadow: theme?.mode === 'light' 
              ? '0px 0px 10px rgba(0, 0, 0, 0.1)' 
              : '0px 0px 10px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {translations.teacherPortal || 'Teacher Portal'}
            </Typography>
            <ThemeToggle />
            <LanguageToggle />
            <TimezoneToggle />
          </Toolbar>
        </AppBar>
      )}
      
      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 0,
          width: { sm: `calc(100% - ${sidebarOpen ? DRAWER_WIDTH : 72}px)` },
          ml: { sm: 0 },
          mt: isMobile ? 8 : 0,
          transition: 'all 0.2s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          background: theme?.background?.default || (theme?.mode === 'light' ? '#F8F9FC' : '#1A1F2B'),
        }}
      >
        {children}
      </Box>
    </Box>
  );
} 