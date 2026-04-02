import React, { useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';

const ImportFromAzureModal = ({ open, onClose, onImport }) => {
  const [organization, setOrganization] = useState('');
  const [pat, setPat] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = () => {
    setLoading(true);
    try {
      onImport({ organization, pat });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOrganization('');
      setPat('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Importar desde Azure DevOps</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 }}>
            <CircularProgress />
            <Typography variant="body2" color="textSecondary">
              Extrayendo proyectos y Work Items...
            </Typography>
          </Box>
        ) : (
          <>
            <TextField
              autoFocus
              margin="dense"
              name="organization"
              label="Organización"
              type="text"
              fullWidth
              variant="standard"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="dense"
              name="pat"
              label="Token de Acceso Personal (PAT)"
              type="password"
              fullWidth
              variant="standard"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              disabled={loading}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleImport} disabled={loading || !organization || !pat} variant="contained">
          {loading ? 'Importando...' : 'Importar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportFromAzureModal;
