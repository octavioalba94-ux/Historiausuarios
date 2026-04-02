import React, { useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Alert
} from '@mui/material';

const ChangePasswordModal = ({ open, onClose, onSave }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    onSave(oldPassword, newPassword);
    handleClose();
  };

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Cambiar Contraseña</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          autoFocus
          margin="dense"
          name="oldPassword"
          label="Contraseña Anterior"
          type="password"
          fullWidth
          variant="standard"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <TextField
          margin="dense"
          name="newPassword"
          label="Nueva Contraseña"
          type="password"
          fullWidth
          variant="standard"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          margin="dense"
          name="confirmPassword"
          label="Confirmar Nueva Contraseña"
          type="password"
          fullWidth
          variant="standard"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleSave}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordModal;
