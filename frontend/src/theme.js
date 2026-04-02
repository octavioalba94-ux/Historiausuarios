import { createTheme } from '@mui/material/styles';

const normalTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const matrixTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff41', // Matrix Green
    },
    secondary: {
      main: '#008f11', // Darker Matrix Green
    },
    background: {
      default: '#000000', // Black
      paper: '#0d0d0d', // Very dark grey
    },
    text: {
      primary: '#00ff41',
      secondary: '#008f11',
    },
    divider: '#008f11',
  },
  typography: {
    fontFamily: '"Roboto Mono", "Courier New", monospace',
    h1: { color: '#00ff41' },
    h2: { color: '#00ff41' },
    h3: { color: '#00ff41' },
    h4: { color: '#00ff41', fontWeight: 'bold' },
    h5: { color: '#00ff41' },
    h6: { color: '#00ff41' },
    body1: { color: '#00ff41' },
    body2: { color: '#00ff41' },
    subtitle1: { color: '#00ff41' },
    subtitle2: { color: '#00ff41' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderColor: '#00ff41',
          color: '#00ff41',
          '&:hover': {
            backgroundColor: 'rgba(0, 255, 65, 0.1)',
            borderColor: '#00ff41',
          },
        },
        contained: {
          backgroundColor: '#008f11',
          color: '#000',
          '&:hover': {
            backgroundColor: '#00ff41',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #008f11',
          boxShadow: '0 0 10px rgba(0, 255, 65, 0.2)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#000',
          borderBottom: '2px solid #00ff41',
          color: '#00ff41',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#000',
          border: '1px solid #008f11',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: '#00ff41',
          borderBottom: '1px solid #008f11',
        },
        head: {
          fontWeight: 'bold',
          backgroundColor: '#0d0d0d',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#008f11',
            },
            '&:hover fieldset': {
              borderColor: '#00ff41',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00ff41',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#008f11',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#00ff41',
          },
          '& .MuiInputBase-input': {
            color: '#00ff41',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        filledSuccess: {
          backgroundColor: '#004d00',
          color: '#00ff41',
        },
        filledInfo: {
          backgroundColor: '#001a4d',
          color: '#00ff41',
        },
        filledError: {
          backgroundColor: '#4d0000',
          color: '#ff4100',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        outlined: {
          borderColor: '#008f11',
          color: '#00ff41',
        },
      },
    },
  },
});

export { normalTheme, matrixTheme };
