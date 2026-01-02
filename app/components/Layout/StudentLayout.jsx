'use client';
import { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Person as ProfileIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

const DRAWER_WIDTH = 240;

export default function StudentLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme } = useTheme();
  const { translations } = useLanguage();
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { text: translations.dashboard || 'Dashboard', icon: DashboardIcon, path: '/student/dashboard' },
    { text: translations.classCalendar || 'Calendar', icon: CalendarIcon, path: '/student/calendar' },
    { text: translations.profile || 'Profile', icon: ProfileIcon, path: '/student/profile' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Router navigation is handled in the auth context
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
          Piano Academy
        </Typography>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
      <List>
        {menuItems.map((item) => (
          <ListItem
            key={item.text}
            component={motion.div}
            whileHover={{ x: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            button
            sx={{
              my: 1,
              mx: 2,
              borderRadius: 2,
              color: 'white',
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <item.icon />
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', mt: 'auto' }} />
      <List>
        <ListItem
          component={motion.div}
          whileHover={{ x: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          button
          onClick={handleLogout}
          sx={{
            my: 1,
            mx: 2,
            borderRadius: 2,
            color: 'white',
          }}
        >
          <ListItemIcon sx={{ color: 'white' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary={translations.logout || "Logout"} />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ 
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
    }}>
      <Box
        component="nav"
        sx={{
          width: { sm: DRAWER_WIDTH },
          flexShrink: { sm: 0 }
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              width: DRAWER_WIDTH,
              background: 'transparent',
              border: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              width: DRAWER_WIDTH,
              background: 'transparent',
              border: 'none',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <IconButton
          color="inherit"
          edge="start"
          onClick={() => setMobileOpen(!mobileOpen)}
          sx={{ mr: 2, display: { sm: 'none' }, color: 'white' }}
        >
          <MenuIcon />
        </IconButton>
        {children}
      </Box>
    </Box>
  );
} 