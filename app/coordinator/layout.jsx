'use client';
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  IconButton, 
  Toolbar, 
  AppBar, 
  Typography, 
  Avatar,
  useMediaQuery
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Assignment as TaskIcon,
  Grading as ExamIcon,
  History as HistoryIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import ThemeToggle from '@/app/components/ThemeToggle';
import LanguageToggle from '@/app/components/LanguageToggle';
import TimezoneToggle from '@/app/components/TimezoneToggle';
import ThemeTransition from '@/app/components/ThemeTransition';

// Drawer width
const DRAWER_WIDTH = 240;

export default function CoordinatorLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const muiTheme = useMuiTheme();
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
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    { text: 'Dashboard', href: '/coordinator/dashboard', icon: DashboardIcon },
    { text: 'Teacher Schedules', href: '/coordinator/teachers', icon: PersonIcon },
    { text: 'Task Management', href: '/coordinator/tasks', icon: TaskIcon },
    { text: 'Exam Creation', href: '/coordinator/exams', icon: ExamIcon },
    { text: 'History', href: '/coordinator/history', icon: HistoryIcon },
  ];

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
          {!sidebarOpen && !isMobile ? '' : translations.coordinatorPanel || 'Coordinator Panel'}
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
          {user?.firstName?.charAt(0) || 'C'}
        </Avatar>
        {(sidebarOpen || isMobile) && (
          <Box sx={{ ml: 2 }}>
            <Typography variant="subtitle2" sx={{ color: theme?.text?.primary }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" sx={{ color: theme?.text?.secondary }}>
              {translations.coordinator || 'Coordinator'}
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <ListItem
              key={item.text}
              disablePadding
              sx={{ mb: 0.5 }}
            >
              <ListItemButton
                onClick={() => router.push(item.href)}
                sx={{
                  borderRadius: 1,
                  backgroundColor: isActive 
                    ? theme?.sidebar?.activeBg || 'rgba(132, 94, 194, 0.1)' 
                    : 'transparent',
                  color: isActive 
                    ? theme?.sidebar?.activeText || theme?.palette?.primary?.main || '#845EC2'
                    : theme?.text?.primary,
                  '&:hover': {
                    backgroundColor: theme?.sidebar?.hoverBg || 'rgba(132, 94, 194, 0.05)',
                  },
                  justifyContent: !sidebarOpen && !isMobile ? 'center' : 'flex-start',
                  px: !sidebarOpen && !isMobile ? 0 : 2
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: sidebarOpen || isMobile ? 40 : 36,
                    color: isActive 
                      ? theme?.sidebar?.activeText || theme?.palette?.primary?.main || '#845EC2'
                      : theme?.text?.primary,
                    marginRight: !sidebarOpen && !isMobile ? 0 : 2,
                    justifyContent: !sidebarOpen && !isMobile ? 'center' : 'flex-start'
                  }}
                >
                  <item.icon />
                </ListItemIcon>
                {(sidebarOpen || isMobile) && (
                  <ListItemText primary={translations[item.text.toLowerCase()] || item.text} />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      {/* Bottom Actions */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: sidebarOpen || isMobile ? 'space-between' : 'center',
          mb: 2
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
          disablePadding
          sx={{ mb: 0.5 }}
        >
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 1,
              color: theme?.text?.primary,
              '&:hover': {
                backgroundColor: theme?.sidebar?.hoverBg || 'rgba(132, 94, 194, 0.05)',
              },
              justifyContent: !sidebarOpen && !isMobile ? 'center' : 'flex-start',
              px: !sidebarOpen && !isMobile ? 0 : 2
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: sidebarOpen || isMobile ? 40 : 36,
                color: theme?.text?.primary,
                marginRight: !sidebarOpen && !isMobile ? 0 : 2,
                justifyContent: !sidebarOpen && !isMobile ? 'center' : 'flex-start'
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            {(sidebarOpen || isMobile) && (
              <ListItemText primary={translations.logout || 'Logout'} />
            )}
          </ListItemButton>
        </ListItem>
      </Box>
    </ThemeTransition>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh', 
      background: theme?.background?.default || (theme?.mode === 'light' ? '#F8F9FC' : '#1A1F2B') 
    }}>
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
              {translations.coordinatorPanel || 'Coordinator Panel'}
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
          p: 3, 
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