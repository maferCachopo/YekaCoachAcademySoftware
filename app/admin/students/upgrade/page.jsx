'use client';
import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableHead, 
  TableRow, TableContainer, Button, TextField, InputAdornment, 
  Avatar, CircularProgress, Chip, Snackbar, Alert 
} from '@mui/material';
import { 
  Search as SearchIcon, 
  TrendingUp as UpgradeIcon,
  EmojiEvents as TrophyIcon 
} from '@mui/icons-material';
import { studentAPI, packageAPI } from '@/app/utils/api';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import UpgradeDialog from '../components/UpgradeDialog'; // El que creamos en el paso anterior
import ThemeTransition from '@/app/components/ThemeTransition';

export default function UpgradePage() {
  const { theme } = useTheme();
  const { translations } = useLanguage();
  
  const [students, setStudents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });

  useEffect(() => {
    fetchData();
  }, []);

  // app/admin/students/upgrade/page.jsx

    const fetchData = async () => {
    try {
        setLoading(true);
        const [allStudents, allPackages] = await Promise.all([
        studentAPI.getAllStudents(),
        packageAPI.getAllPackages()
        ]);

        // Lógica de filtrado refinada:
        const candidates = allStudents.filter(student => {
        const activePkg = student.packages?.find(p => p.status === 'active');
        
        if (!activePkg) return false;

        const total = activePkg.package?.totalClasses || 0;
        const remaining = activePkg.remainingClasses || 0;
        const used = total - remaining;

        // REGLAS:
        // 1. El paquete debe tener clases restantes (si es 0, es renovación, no upgrade)
        // 2. El estudiante debe haber asistido al menos a una clase (usadas > 0)
        return remaining > 0 && used > 0;
        });

        setStudents(candidates);
        setPackages(allPackages);
    } catch (error) {
        console.error("Error loading upgrade candidates:", error);
    } finally {
        setLoading(false);
    }
    };
  const handleOpenUpgrade = (student) => {
    setSelectedStudent(student);
    setUpgradeDialogOpen(true);
  };

  const handleCloseMessage = () => {
    setMessage({ ...message, open: false });
    };

  const filteredStudents = students.filter(s => 
    `${s.name} ${s.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <ThemeTransition component={Box} sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: theme.text?.primary }}>
            Upgrade de Paquetes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Promociona a tus estudiantes a paquetes con más beneficios.
          </Typography>
        </Box>
        <TrophyIcon sx={{ fontSize: 40, color: '#FFBA08', opacity: 0.8 }} />
      </Box>

      <Card sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar estudiante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Card>

      <TableContainer component={Card} sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: theme.mode === 'light' ? '#f8f9fa' : '#252538' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Estudiante</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Paquete Actual</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Clases (Usadas / Totales)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Restantes</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.map((student) => {
              const activePkg = student.packages.find(p => p.status === 'active');
              const total = activePkg.package?.totalClasses || 0;
              const remaining = activePkg.remainingClasses || 0;
              const used = total - remaining;

              return (
                <TableRow key={student.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#845EC2', width: 32, height: 32, fontSize: '0.9rem' }}>
                        {student.name[0]}
                      </Avatar>
                      <Typography variant="body2" fontWeight={500}>
                        {student.name} {student.surname}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={activePkg.package?.name} size="small" variant="outlined" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{used} / {total}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color={remaining <= 1 ? 'error.main' : 'inherit'}>
                      {remaining}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      variant="contained" 
                      size="small" 
                      startIcon={<UpgradeIcon />}
                      onClick={() => handleOpenUpgrade(student)}
                      sx={{ 
                        bgcolor: '#845EC2', 
                        '&:hover': { bgcolor: '#6B46C1' },
                        borderRadius: 2,
                        textTransform: 'none'
                      }}
                    >
                      Upgrade
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedStudent && (
        <UpgradeDialog
          open={upgradeDialogOpen}
          onClose={() => { setUpgradeDialogOpen(false); setSelectedStudent(null); }}
          student={selectedStudent}
          packages={packages}
          refreshStudents={fetchData}
          setMessage={setMessage}
        />
      )}

    <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseMessage} 
          severity={message.severity} 
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>

    </ThemeTransition>
  );
}