import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';

const EditWorkItemModal = ({ open, onClose, workItem, onSave, users }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (workItem) {
      setTitle(workItem.title || '');
      setDescription(workItem.description || '');
      setState(workItem.state || '');
      setPriority(workItem.priority || '');
      setAssignedTo(workItem.assigned_to || '');
      setDueDate(workItem.due_date || '');
    }
  }, [workItem]);

  const handleSave = () => {
    onSave(workItem.id, { 
      title,
      description,
      state, 
      priority, 
      assigned_to: assignedTo, 
      due_date: dueDate 
    });
    onClose();
  };

  if (!workItem) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          backdropFilter: 'blur(15px)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
          Editar Item: {workItem.azure_id || workItem.id}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <TextField
          fullWidth
          label="Título"
          variant="standard"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ mb: 3 }}
        />

        <TextField
          fullWidth
          label="Descripción"
          variant="standard"
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl fullWidth variant="standard">
            <InputLabel>Estado</InputLabel>
            <Select value={state} label="Estado" onChange={(e) => setState(e.target.value)}>
              <MenuItem value="Nuevo">Nuevo</MenuItem>
              <MenuItem value="Activo">Activo</MenuItem>
              <MenuItem value="Resuelto">Resuelto</MenuItem>
              <MenuItem value="Cerrado">Cerrado</MenuItem>
              <MenuItem value="Eliminado">Eliminado</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth variant="standard">
            <InputLabel>Prioridad</InputLabel>
            <Select value={priority} label="Prioridad" onChange={(e) => setPriority(e.target.value)}>
              <MenuItem value={1}>1 - Crítica</MenuItem>
              <MenuItem value={2}>2 - Alta</MenuItem>
              <MenuItem value={3}>3 - Media</MenuItem>
              <MenuItem value={4}>4 - Baja</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <FormControl fullWidth variant="standard" sx={{ mb: 3 }}>
          <InputLabel>Asignado a</InputLabel>
          <Select value={assignedTo} label="Asignado a" onChange={(e) => setAssignedTo(e.target.value)}>
            {users.map(user => (
              <MenuItem key={user.id_usuario} value={user.name}>{user.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Fecha Límite"
          type="date"
          variant="standard"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} sx={{ fontWeight: 700 }}>Cancelar</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          sx={{ 
            fontWeight: 800, 
            borderRadius: 2,
            px: 4,
            boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)'
          }}
        >
          Guardar Cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditWorkItemModal;

