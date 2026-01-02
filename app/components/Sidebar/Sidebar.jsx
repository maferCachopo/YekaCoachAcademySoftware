'use client';
import { useState, useEffect } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, IconButton, SwipeableDrawer, Divider, useMediaQuery } from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  People as StudentsIcon,
  Class as ClassesIcon,
  Book as PackagesIcon,
  Logout as LogoutIcon,
  MusicNote as MusicIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  School as TeacherIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import ThemeTransition from '../ThemeTransition';

// Define menu items based on role
const menuItems = {
  admin: [
    { title: 'Dashboard', icon: DashboardIcon, path: '/admin/dashboard' },
    { title: 'Students', icon: StudentsIcon, path: '/admin/students' },
    { title: 'Teachers', icon: TeacherIcon, path: '/admin/teacher' },
    { title: 'Schedule', icon: CalendarIcon, path: '/admin/teacher/schedule' },
    { title: 'Packages', icon: PackagesIcon, path: '/admin/packages' },
  ],
  student: [
    { title: 'Dashboard', icon: DashboardIcon, path: '/student/dashboard' },
    { title: 'Profile', icon: PersonIcon, path: '/student/profile' },
  ]
};

export default function Sidebar({ open, onToggle, role = 'admin' }) {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { translations } = useLanguage();
  const { logout } = useAuth();
  const isMobile = useMediaQuery('(max-width:768px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dashboardFullscreen, setDashboardFullscreen] = useState(false);
  
  const items = menuItems[role] || menuItems.admin;
  
  // Listen for dashboard fullscreen events
  useEffect(() => {
    const handleFullscreenChange = (event) => {
      if (event.detail && typeof event.detail.fullscreen === 'boolean') {
        setDashboardFullscreen(event.detail.fullscreen);
      }
    };
    
    window.addEventListener('dashboard_fullscreen', handleFullscreenChange);
    
    return () => {
      window.removeEventListener('dashboard_fullscreen', handleFullscreenChange);
    };
  }, []);
  
  // Notify other components when sidebar state changes
  useEffect(() => {
    // Create a custom event with the current sidebar state
    const event = new CustomEvent('sidebar_state_change', {
      detail: { open: isMobile ? false : open }
    });
    
    // Dispatch the event
    window.dispatchEvent(event);
  }, [open, isMobile]);
  
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
      
      // Dispatch an event for mobile menu state changes too
      const event = new CustomEvent('sidebar_state_change', {
        detail: { open: !mobileOpen }
      });
      window.dispatchEvent(event);
    } else {
      onToggle();
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
      flexDirection: 'column'
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isMobile || open ? 'space-between' : 'center',
        mb: 3,
        height: 56
      }}>
        {isMobile || open ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MusicIcon sx={{ 
                fontSize: 24,
                mr: 2,
                color: theme.text.primary 
              }} />
              <Typography variant="h6" sx={{ 
                fontSize: '1.1rem',
                fontWeight: 600,
                color: theme.text.primary
              }}>
                {role === 'admin' ? 'Admin Panel' : translations.appName}
              </Typography>
            </Box>
            <IconButton 
              onClick={handleToggle}
              sx={{ 
                color: theme.text.primary,
                '&:hover': {
                  backgroundColor: theme.sidebar.hoverBg
                }
              }}
            >
              {isMobile ? <CloseIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </>
        ) : (
          <IconButton 
            onClick={handleToggle}
            sx={{ 
              color: theme.text.primary,
              '&:hover': {
                backgroundColor: theme.sidebar.hoverBg
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      {isMobile && (
        <Divider sx={{ mb: 2, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
      )}

      <List sx={{ 
        px: 1, 
        flex: 1,
        '& .MuiTypography-root': {
          fontSize: isMobile ? '1rem' : 'inherit'
        }
      }}>
        {items.map((item) => (
          <ThemeTransition 
            component={ListItem}
            button
            key={item.title}
            onClick={() => router.push(item.path)}
            sx={{
              borderRadius: 1,
              mb: 1,
              py: isMobile ? 2 : 1.5,
              justifyContent: (isMobile || open) ? 'flex-start' : 'center',
              backgroundColor: pathname === item.path ? theme.sidebar.hoverBg : 'transparent',
              '&:hover': {
                backgroundColor: theme.sidebar.hoverBg,
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: pathname === item.path ? (theme.isDark ? '#845EC2' : '#6A4B9D') : theme.text.primary,
              minWidth: (isMobile || open) ? 40 : 'auto',
              mr: (isMobile || open) ? 2 : 0,
              fontSize: isMobile ? '24px' : '20px'
            }}>
              <item.icon fontSize="inherit" />
            </ListItemIcon>
            {(isMobile || open) && <ListItemText 
              primary={translations[item.title.toLowerCase()] || item.title}
              sx={{ 
                color: pathname === item.path ? (theme.isDark ? '#845EC2' : '#6A4B9D') : theme.text.primary
              }}
            />}
          </ThemeTransition>
        ))}
      </List>

      <ThemeTransition
        component={ListItem}
        button
        onClick={handleLogout}
        sx={{
          borderRadius: 1,
          py: isMobile ? 2 : 1.5,
          justifyContent: (isMobile || open) ? 'flex-start' : 'center',
          '&:hover': {
            backgroundColor: theme.sidebar.hoverBg,
          },
        }}
      >
        <ListItemIcon sx={{ 
          color: theme.text.primary,
          minWidth: (isMobile || open) ? 40 : 'auto',
          mr: (isMobile || open) ? 2 : 0,
          fontSize: isMobile ? '24px' : '20px'
        }}>
          <LogoutIcon fontSize="inherit" />
        </ListItemIcon>
        {(isMobile || open) && <ListItemText 
          primary={translations.logout}
          sx={{ color: theme.text.primary }}
        />}
      </ThemeTransition>
    </ThemeTransition>
  );

  // Mobile version uses SwipeableDrawer
  if (isMobile) {
    return (
      <>
        {!dashboardFullscreen && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleToggle}
            sx={{
              position: 'fixed',
              top: 15,
              left: 15,
              zIndex: 1100,
              backgroundColor: theme.isDark ? 'rgba(30, 36, 51, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              color: theme.text.primary,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              '&:hover': {
                backgroundColor: theme.isDark ? 'rgba(40, 46, 61, 0.9)' : 'rgba(245, 245, 245, 0.9)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <SwipeableDrawer
          anchor="left"
          open={mobileOpen && !dashboardFullscreen}
          onClose={() => setMobileOpen(false)}
          onOpen={() => setMobileOpen(true)}
          disableBackdropTransition={false}
          disableDiscovery={false}
          sx={{
            '& .MuiDrawer-paper': {
              width: '280px',
              boxSizing: 'border-box',
              background: theme?.sidebar?.background || (theme.mode === 'light' ? '#ffffff' : '#1a1f2b'),
              color: theme.text.primary,
              borderRight: 'none',
              boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
              transition: 'background-color 0.3s ease, color 0.3s ease',
            },
          }}
        >
          {sidebarContent}
        </SwipeableDrawer>
      </>
    );
  }

  // Desktop version uses permanent Drawer
  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: open ? '240px' : '80px',
        flexShrink: 0,
        display: dashboardFullscreen ? 'none' : 'block',
        '& .MuiDrawer-paper': {
          width: open ? '240px' : '80px',
          boxSizing: 'border-box',
          background: theme?.sidebar?.background || (theme.mode === 'light' ? '#ffffff' : '#1a1f2b'),
          color: theme.text.primary,
          borderRight: 'none',
          overflowX: 'hidden',
          transition: 'width 0.3s ease, background-color 0.3s ease, color 0.3s ease',
          position: 'fixed',
          height: '100vh',
          zIndex: 1200,
        },
      }}
    >
      {sidebarContent}
    </Drawer>
  );
} 