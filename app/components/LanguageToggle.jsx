'use client';
import { IconButton, Tooltip } from '@mui/material';
import { Translate as TranslateIcon } from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useTheme } from '../contexts/ThemeContext';

const LanguageToggle = () => {
  const { language, toggleLanguage, translations } = useLanguage();
  const { theme } = useTheme();
  const { isDark } = useTheme();

  // Get appropriate tooltip text from translations if available
  const tooltipText = language === 'en' 
    ? (translations?.switchToSpanish || "Switch to Spanish") 
    : (translations?.switchToEnglish || "Switch to English");
    
  return (
    <Tooltip title={tooltipText} placement="bottom" arrow>
      <IconButton
        onClick={toggleLanguage}
        aria-label="Toggle language"
        sx={{
          color: isDark ? 'white' : '#2D3748',
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          '&:hover': {
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <TranslateIcon />
      </IconButton>
    </Tooltip>
  );
};

export default LanguageToggle; 