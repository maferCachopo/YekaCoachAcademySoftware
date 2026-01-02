'use client';
import { TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import { useState } from 'react';
import { useController } from 'react-hook-form';
import { Visibility, VisibilityOff, InfoOutlined } from '@mui/icons-material';

/**
 * A controlled TextField component that integrates with React Hook Form
 * 
 * @param {Object} props - Component props
 * @param {string} props.name - Field name (required for react-hook-form)
 * @param {Object} props.control - react-hook-form control object
 * @param {string} props.label - Input label
 * @param {string} props.helperText - Helper text displayed below the input
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.type - Input type (text, password, email, etc.)
 * @param {Object} props.rules - react-hook-form validation rules
 * @param {string} props.placeholder - Input placeholder
 * @param {function} props.onChange - Additional onChange handler
 * @param {function} props.onBlur - Additional onBlur handler
 * @param {string} props.tooltip - Optional tooltip text
 * @param {Object} props.sx - Additional MUI styling
 * @param {Object} props.InputProps - Additional props for the Input component
 * @param {boolean} props.fullWidth - Whether the field should take full width
 * @param {boolean} props.multiline - Whether the field is multiline
 * @param {number} props.rows - Number of rows for multiline input
 */
export default function FormTextField({
  name,
  control,
  label,
  helperText,
  required = false,
  type = 'text',
  rules = {},
  placeholder,
  onChange: externalOnChange,
  onBlur: externalOnBlur,
  tooltip,
  sx,
  InputProps,
  fullWidth = true,
  multiline = false,
  rows,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  // Default required message if the field is required but no message is provided
  if (required && !rules.required) {
    rules.required = `${label || name} is required`;
  }

  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
    rules,
    defaultValue: '',
  });

  // Handle onChange with potential external handler
  const handleChange = (e) => {
    field.onChange(e);
    if (externalOnChange) externalOnChange(e);
  };

  // Handle onBlur with potential external handler
  const handleBlur = (e) => {
    field.onBlur();
    if (externalOnBlur) externalOnBlur(e);
  };

  // Determine the input type (for password visibility toggle)
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  // Combine input props
  const combinedInputProps = {
    ...InputProps,
    ...(type === 'password' && {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton
            aria-label="toggle password visibility"
            onClick={togglePasswordVisibility}
            edge="end"
            size="small"
          >
            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
          </IconButton>
        </InputAdornment>
      ),
    }),
    ...(tooltip && {
      endAdornment: (
        <InputAdornment position="end">
          <Tooltip title={tooltip} arrow placement="top">
            <IconButton edge="end" size="small">
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </InputAdornment>
      ),
    }),
  };

  return (
    <TextField
      {...field}
      value={field.value || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      label={label}
      type={inputType}
      error={!!error}
      helperText={error ? error.message : helperText}
      placeholder={placeholder}
      InputProps={combinedInputProps}
      fullWidth={fullWidth}
      multiline={multiline}
      rows={rows}
      required={required}
      sx={{
        mb: 2,
        ...sx,
      }}
      {...rest}
    />
  );
} 