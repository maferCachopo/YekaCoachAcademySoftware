'use client';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';

/**
 * A reusable confirmation dialog component
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {function} props.onClose - Function to call when the dialog is closed
 * @param {function} props.onConfirm - Function to call when the action is confirmed
 * @param {string} props.title - The dialog title
 * @param {string} props.message - The confirmation message
 * @param {string} props.confirmButtonText - The text for the confirm button
 * @param {string} props.cancelButtonText - The text for the cancel button
 * @param {boolean} props.isLoading - Whether the confirmation action is in progress
 * @param {Object} props.theme - The current theme object
 * @returns {JSX.Element}
 */
const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  isLoading = false,
  theme
}) => {
  // Styles based on theme
  const buttonStyles = {
    confirm: {
      backgroundColor: '#d32f2f',
      color: '#ffffff',
      '&:hover': {
        backgroundColor: '#b71c1c',
      }
    },
    cancel: {
      color: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : '#ffffff',
      borderColor: 'rgba(0, 0, 0, 0.23)',
      '&:hover': {
        borderColor: theme?.mode === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
        backgroundColor: theme?.mode === 'light'
          ? 'rgba(0, 0, 0, 0.04)'
          : 'rgba(255, 255, 255, 0.08)',
      }
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => !isLoading && onClose()}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: '5px',
          backgroundColor: theme?.mode === 'light' ? '#fff' : '#151521',
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: theme?.mode === 'light' 
          ? '1px solid rgba(0, 0, 0, 0.12)' 
          : '1px solid rgba(255, 255, 255, 0.12)',
        color: theme?.text?.primary,
      }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography sx={{ color: theme?.text?.primary }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{
        p: 2,
        borderTop: theme?.mode === 'light' 
          ? '1px solid rgba(0, 0, 0, 0.12)' 
          : '1px solid rgba(255, 255, 255, 0.12)',
      }}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button 
            onClick={onClose} 
            variant="outlined" 
            disabled={isLoading}
            sx={buttonStyles.cancel}
          >
            {cancelButtonText}
          </Button>
          <Button 
            onClick={onConfirm} 
            variant="contained" 
            disabled={isLoading}
            sx={buttonStyles.confirm}
          >
            {isLoading ? 'Processing...' : confirmButtonText}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;