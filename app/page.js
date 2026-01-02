'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  useMediaQuery,
  Divider
} from '@mui/material';
import { 
  Menu as MenuIcon,
  MusicNote as MusicNoteIcon,
  CheckCircle as CheckIcon,
  School as SchoolIcon,
  EventNote as EventNoteIcon,
  Person as PersonIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTheme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import ThemeToggle from './components/ThemeToggle';
import LanguageToggle from './components/LanguageToggle';
import TimezoneToggle from './components/TimezoneToggle';

export default function LandingPage() {
  const { theme } = useTheme();
  const { translations, language } = useLanguage();
  const muiTheme = useMuiTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Wait for client-side hydration to complete
  useEffect(() => {
    setMounted(true);
  }, []);

  // If not mounted yet, render a placeholder that exactly matches server-side render
  if (!mounted) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        background: theme?.mode === 'light' ? '#f5f7fa' : '#121212',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box component="span" sx={{ display: 'none' }} />
      </Box>
    );
  }
  
  // Features section data
  const features = [
    {
      icon: <SchoolIcon fontSize="large" sx={{ color: theme?.mode === 'light' ? '#845EC2' : '#9B6DDF' }} />,
      title: language === 'en' ? 'Singing Lessons' : 'Clases de Canto',
      description: language === 'en' 
        ? 'Professional vocal training tailored to your level and goals.' 
        : 'Entrenamiento vocal profesional adaptado a tu nivel y objetivos.'
    },
    {
      icon: <EventNoteIcon fontSize="large" sx={{ color: theme?.mode === 'light' ? '#D65DB1' : '#E76BC3' }} />,
      title: language === 'en' ? 'Flexible Scheduling' : 'Horarios Flexibles',
      description: language === 'en'
        ? 'Book and manage your classes easily with our intuitive platform.'
        : 'Reserva y administra tus clases fácilmente con nuestra plataforma intuitiva.'
    },
    {
      icon: <PersonIcon fontSize="large" sx={{ color: theme?.mode === 'light' ? '#FF6F91' : '#FF8FAB' }} />,
      title: language === 'en' ? 'Progress Tracking' : 'Seguimiento de Progreso',
      description: language === 'en'
        ? 'Monitor your development with personalized feedback after each class.'
        : 'Monitorea tu desarrollo con retroalimentación personalizada después de cada clase.'
    }
  ];

  // Testimonials data
  const testimonials = [
    {
      quote: language === 'en'
        ? 'Yeka Couch Academy has transformed my singing skills completely. The personalized approach makes all the difference!'
        : 'Yeka Couch Academy ha transformado mis habilidades de canto por completo. ¡El enfoque personalizado hace toda la diferencia!',
      author: 'Maria S., Student'
    },
    {
      quote: language === 'en'
        ? 'The scheduling system is seamless. I can easily manage my singing classes around my work schedule.'
        : 'El sistema de programación es perfecto. Puedo administrar fácilmente mis clases de canto alrededor de mi horario de trabajo.',
      author: 'Carlos R., Professional'
    },
    {
      quote: language === 'en'
        ? 'My vocal range has expanded tremendously in just a few months. The progress tracking feature helps me see my improvement.'
        : 'Mi rango vocal se ha expandido enormemente en solo unos meses. La función de seguimiento de progreso me ayuda a ver mi mejora.',
      author: 'Sarah T., Performer'
    }
  ];

  const toggleDrawer = (open) => (event) => {
    if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  return (
    <Box 
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      sx={{ 
        minHeight: '100vh',
        background: theme?.mode === 'light' ? '#f5f7fa' : '#121212',
        color: theme?.mode === 'light' ? '#2D3748' : '#f5f5f5',
        transition: 'background 0.3s ease',
        overflow: 'auto',
      }}
    >
      {/* Navigation */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          background: theme?.mode === 'light' 
            ? 'rgba(255, 255, 255, 0.95)' 
            : 'rgba(18, 18, 18, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${theme?.mode === 'light' 
            ? 'rgba(0, 0, 0, 0.05)' 
            : 'rgba(255, 255, 255, 0.1)'}`,
          color: theme?.mode === 'light' ? '#2D3748' : '#f5f5f5',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MusicNoteIcon 
                sx={{ 
                  mr: 1, 
                  color: theme?.mode === 'light' ? '#845EC2' : '#9B6DDF',
                  fontSize: { xs: 28, md: 32 }
                }} 
              />
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: 'bold',
                  color: theme?.mode === 'light' ? '#2D3748' : '#f5f5f5',
                  fontSize: { xs: '1rem', md: '1.3rem' }
                }}
              >
                Yeka Couch Academy
              </Typography>
            </Box>
            
            {isMobile ? (
              <IconButton
                aria-label="open drawer"
                edge="end"
                onClick={toggleDrawer(true)}
                sx={{ color: theme?.palette?.text?.primary || (theme?.mode === 'light' ? '#2D3748' : '#f5f5f5') }}
              >
                <MenuIcon />
              </IconButton>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ThemeToggle />
                  <LanguageToggle />
                  <TimezoneToggle />
                </Box>
                
                <Button
                  variant="contained"
                  onClick={() => router.push('/login')}
                  sx={{
                    background: theme?.palette?.primary?.main || '#845EC2',
                    boxShadow: 'none',
                    '&:hover': {
                      background: theme?.palette?.primary?.dark || '#6B46C1',
                      boxShadow: 'none',
                    },
                    textTransform: 'none',
                    px: 3,
                  }}
                >
                  {language === 'en' ? 'Log In' : 'Iniciar Sesión'}
                </Button>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        PaperProps={{
          sx: {
            width: 240,
            backgroundColor: theme?.palette?.background?.paper || (theme?.mode === 'light' ? '#fff' : '#1a1a1a'),
            color: theme?.palette?.text?.primary || (theme?.mode === 'light' ? '#2D3748' : '#f5f5f5'),
          }
        }}
      >
        <Box
          sx={{ width: 240, p: 2 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton>
              <ChevronRightIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <ThemeToggle />
            <LanguageToggle />
            <TimezoneToggle />
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => router.push('/login')}
              sx={{
                background: theme?.palette?.primary?.main || '#845EC2',
                boxShadow: 'none',
                '&:hover': {
                  background: theme?.palette?.primary?.dark || '#6B46C1',
                  boxShadow: 'none',
                },
                textTransform: 'none',
                py: 1,
              }}
            >
              {language === 'en' ? 'Log In' : 'Iniciar Sesión'}
            </Button>
          </Box>
        </Box>
      </Drawer>
      
      {/* Hero Section */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        sx={{
          pt: { xs: 12, md: 20 },
          pb: { xs: 8, md: 12 },
          px: 2,
          background: theme?.mode === 'light'
            ? `linear-gradient(135deg, ${theme?.palette?.primary?.main || '#845EC2'}15 0%, ${theme?.palette?.secondary?.main || '#D65DB1'}15 100%)`
            : `linear-gradient(135deg, ${theme?.palette?.primary?.main || '#845EC2'}30 0%, ${theme?.palette?.secondary?.main || '#D65DB1'}30 100%)`,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                mb: 3,
                background: `linear-gradient(135deg, ${theme?.palette?.primary?.main || '#845EC2'} 0%, ${theme?.palette?.secondary?.main || '#D65DB1'} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {language === 'en' 
                ? 'Find Your Voice with Yeka Couch Academy' 
                : 'Encuentra Tu Voz con Yeka Couch Academy'}
            </Typography>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <Typography
              variant="h6"
              component="p"
              sx={{
                mb: 5,
                color: theme?.palette?.text?.secondary || (theme?.mode === 'light' ? '#4A5568' : '#b0b0b0'),
                fontSize: { xs: '1rem', md: '1.25rem' },
                maxWidth: '80%',
                mx: 'auto',
              }}
            >
              {language === 'en'
                ? 'Professional vocal training with a personalized approach. Book classes, track progress, and develop your singing skills on your schedule.'
                : 'Entrenamiento vocal profesional con un enfoque personalizado. Reserva clases, haz seguimiento de tu progreso y desarrolla tus habilidades de canto según tu horario.'}
            </Typography>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/login')}
              sx={{
                background: theme?.palette?.primary?.main || '#845EC2',
                padding: '12px 30px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                borderRadius: '30px',
                boxShadow: '0 10px 20px rgba(132, 94, 194, 0.3)',
                '&:hover': {
                  background: theme?.palette?.primary?.dark || '#6B46C1',
                  boxShadow: '0 15px 25px rgba(132, 94, 194, 0.4)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {language === 'en' ? 'Start Now' : 'Comenzar Ahora'}
            </Button>
          </motion.div>
        </Container>
      </Box>
      
      {/* Features Section */}
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        sx={{
          py: { xs: 8, md: 12 },
          px: 2,
          backgroundColor: theme?.palette?.background?.paper || (theme?.mode === 'light' ? '#ffffff' : '#1a1a1a'),
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{
              mb: 6,
              fontWeight: 'bold',
              color: theme?.palette?.text?.primary || (theme?.mode === 'light' ? '#2D3748' : '#f5f5f5'),
            }}
          >
            {language === 'en' ? 'Our Features' : 'Nuestras Características'}
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid 
                item 
                xs={12} 
                md={4} 
                key={index}
                component={motion.div}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: `1px solid ${theme?.mode === 'light' 
                      ? 'rgba(0, 0, 0, 0.05)' 
                      : 'rgba(255, 255, 255, 0.1)'}`,
                    backgroundColor: theme?.palette?.background?.paper || (theme?.mode === 'light' ? '#ffffff' : '#1a1a1a'),
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme?.mode === 'light' 
                        ? '0 10px 30px rgba(0, 0, 0, 0.1)' 
                        : '0 10px 30px rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 4, textAlign: 'center' }}>
                    <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                    <Typography 
                      variant="h5" 
                      component="h3" 
                      gutterBottom
                      sx={{ 
                        fontWeight: 'bold',
                        color: theme?.palette?.text?.primary || (theme?.mode === 'light' ? '#2D3748' : '#f5f5f5'),
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography 
                      sx={{ 
                        color: theme?.palette?.text?.secondary || (theme?.mode === 'light' ? '#4A5568' : '#b0b0b0'),
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      
      {/* Testimonials Section */}
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        sx={{
          py: { xs: 8, md: 12 },
          px: 2,
          backgroundColor: theme?.mode === 'light'
            ? 'rgba(132, 94, 194, 0.05)'
            : 'rgba(132, 94, 194, 0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{
              mb: 6,
              fontWeight: 'bold',
              color: theme?.palette?.text?.primary || (theme?.mode === 'light' ? '#2D3748' : '#f5f5f5'),
            }}
          >
            {language === 'en' ? 'What Our Students Say' : 'Lo Que Dicen Nuestros Estudiantes'}
          </Typography>
          
          <Grid container spacing={4}>
            {testimonials.map((testimonial, index) => (
              <Grid 
                item 
                xs={12} 
                md={4} 
                key={index}
                component={motion.div}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: `1px solid ${theme?.mode === 'light' 
                      ? 'rgba(0, 0, 0, 0.05)' 
                      : 'rgba(255, 255, 255, 0.1)'}`,
                    backgroundColor: theme?.palette?.background?.paper || (theme?.mode === 'light' ? '#ffffff' : '#1a1a1a'),
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 4 }}>
                    <Typography 
                      variant="body1" 
                      paragraph
                      sx={{ 
                        fontStyle: 'italic',
                        color: theme?.palette?.text?.primary || (theme?.mode === 'light' ? '#2D3748' : '#f5f5f5'),
                        mb: 2
                      }}
                    >
                      "{testimonial.quote}"
                    </Typography>
                    <Typography 
                      variant="subtitle2"
                      sx={{ 
                        fontWeight: 'bold',
                        color: theme?.palette?.primary?.main || '#845EC2',
                      }}
                    >
                      — {testimonial.author}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      
      {/* CTA Section */}
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        sx={{
          py: { xs: 8, md: 12 },
          px: 2,
          textAlign: 'center',
          background: `linear-gradient(135deg, ${theme?.palette?.primary?.main || '#845EC2'} 0%, ${theme?.palette?.secondary?.main || '#D65DB1'} 100%)`,
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: 'white',
              mb: 3,
            }}
          >
            {language === 'en' 
              ? 'Ready to Start Your Singing Journey?' 
              : '¿Listo para Comenzar tu Viaje Vocal?'}
          </Typography>
          
          <Typography
            variant="h6"
            paragraph
            sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              mb: 5,
              maxWidth: '80%',
              mx: 'auto',
            }}
          >
            {language === 'en'
              ? 'Join Yeka Couch Academy today and transform your singing abilities with expert guidance.'
              : 'Únete a Yeka Couch Academy hoy y transforma tus habilidades de canto con orientación experta.'}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              component={motion.button}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              variant="contained"
              size="large"
              onClick={() => router.push('/login')}
              sx={{
                py: 1.5,
                px: 4,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: '#ffffff',
                color: theme?.palette?.primary?.main || '#845EC2',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  background: '#f8f9fa',
                  boxShadow: '0 6px 15px rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              {language === 'en' ? 'Start Now' : 'Comenzar Ahora'}
            </Button>
          </Box>
        </Container>
      </Box>
      
      {/* Footer */}
      <Box
        sx={{
          py: 4,
          px: 2,
          backgroundColor: theme?.palette?.background?.paper || (theme?.mode === 'light' ? '#ffffff' : '#1a1a1a'),
          borderTop: `1px solid ${theme?.mode === 'light' 
            ? 'rgba(0, 0, 0, 0.05)' 
            : 'rgba(255, 255, 255, 0.1)'}`,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <MusicNoteIcon 
                  sx={{ 
                    mr: 1, 
                    color: theme?.palette?.primary?.main || '#845EC2',
                  }} 
                />
                <Typography
                  variant="h6"
                  noWrap
                  sx={{
                    fontWeight: 'bold',
                    color: theme?.palette?.text?.primary || (theme?.mode === 'light' ? '#2D3748' : '#f5f5f5'),
                  }}
                >
                  Yeka Couch Academy
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'center' } }}>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'center' }, gap: 3 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme?.palette?.text?.secondary || (theme?.mode === 'light' ? '#4A5568' : '#b0b0b0'),
                    '&:hover': {
                      color: theme?.palette?.primary?.main || '#845EC2',
                    },
                    cursor: 'pointer',
                  }}
                >
                  {language === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
                </Typography>
                
                <Typography
                  variant="body2"
                  sx={{
                    color: theme?.palette?.text?.secondary || (theme?.mode === 'light' ? '#4A5568' : '#b0b0b0'),
                    '&:hover': {
                      color: theme?.palette?.primary?.main || '#845EC2',
                    },
                    cursor: 'pointer',
                  }}
                >
                  {language === 'en' ? 'Terms of Service' : 'Términos de Servicio'}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Typography
                variant="body2"
                sx={{
                  color: theme?.palette?.text?.secondary || (theme?.mode === 'light' ? '#4A5568' : '#b0b0b0'),
                }}
              >
                © {new Date().getFullYear()} Yeka Couch Academy. {language === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
