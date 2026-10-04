import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { forwardRef, useState } from 'react';

export const PasswordField = forwardRef<HTMLDivElement, TextFieldProps>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <TextField
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible((current) => !current)}
                edge="end"
              >
                {visible ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    );
  },
);
