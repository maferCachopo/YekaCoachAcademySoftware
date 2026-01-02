// Text field style
export const textFieldStyle = (theme) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.mode === 'light' ? '#fff' : 'rgba(255, 255, 255, 0.05)',
    '& fieldset': {
      borderColor: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)',
    },
    '&:hover fieldset': {
      borderColor: '#845EC2',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#845EC2',
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
    '&.Mui-focused': {
      color: '#845EC2',
    },
  },
  '& .MuiInputBase-input': {
    color: theme.mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
    padding: '14px 14px',
  },
});

// Table headers - use this function to get translated headers
export const getHeaders = (translations) => [
  { id: 'name', label: translations.name || 'Name' },
  { id: 'email', label: translations.email || 'Email' },
  { id: 'phone', label: translations.phone || 'Phone' },
  { id: 'location', label: translations.location || 'Location' },
  { id: 'package', label: translations.package || 'Package' },
  { id: 'status', label: translations.status || 'Status' },
  { id: 'actions', label: translations.actions || 'Actions' },
];

// Legacy support for direct headers import
export const headers = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'location', label: 'Location' },
  { id: 'package', label: 'Package' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions' },
]; 