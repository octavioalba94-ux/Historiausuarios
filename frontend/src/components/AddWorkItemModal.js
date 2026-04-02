import React, { useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';

const initialState = {
  azure_id: '',
  title: '',
  description: '',
  priority: 2,
  assigned_to: '',
  internal_notes: '',
  project_id: '',
  due_date: ''
};

const AddWorkItemModal = ({ open, onClose, onSave, users, projects }) => {
  const [formState, setFormState] = useState(initialState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const selectedProject = projects.find(p => p.id === formState.project_id);
  const isInternal = selectedProject?.type === 'internal';

  const handleSave = () => {
    onSave({ 
        ...formState, 
        state: 'Nuevo', 
        created_date: new Date().toISOString(),
        azure_project_id: selectedProject?.azure_id || null
    });
    handleClose();
  };
  
  const handleClose = () => {
      setFormState(initialState);
      onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Agregar Nuevo Elemento de Trabajo</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel>Proyecto</InputLabel>
          <Select
            name="project_id"
            value={formState.project_id}
            onChange={handleChange}
            required
          >
            {projects && projects.map(project => (
              <MenuItem key={project.id} value={project.id}>
                {project.name} {project.type === 'internal' ? '(Interno)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          margin="dense"
          name="azure_id"
          label={isInternal ? "ID Interno (Opcional)" : "ID de Azure DevOps"}
          type="text"
          fullWidth
          variant="standard"
          value={formState.azure_id || ''}
          onChange={handleChange}
          placeholder={isInternal ? "Se generará automáticamente si queda vacío" : "Ej: 12345"}
        />
        <TextField
          autoFocus
          margin="dense"
          name="title"
          label="Título"
          type="text"
          fullWidth
          variant="standard"
          value={formState.title}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          name="description"
          label="Descripción"
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="standard"
          value={formState.description}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          name="internal_notes"
          label="Notas Internas"
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="standard"
          value={formState.internal_notes}
          onChange={handleChange}
        />
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel>Prioridad</InputLabel>
          <Select
            name="priority"
            value={formState.priority}
            onChange={handleChange}
          >
            <MenuItem value={1}>1</MenuItem>
            <MenuItem value={2}>2</MenuItem>
            <MenuItem value={3}>3</MenuItem>
            <MenuItem value={4}>4</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense" variant="standard">
          <InputLabel>Asignado a</InputLabel>
          <Select
            name="assigned_to"
            value={formState.assigned_to}
            onChange={handleChange}
          >
            {users.map(user => (
              <MenuItem key={user.id_usuario} value={user.name}>{user.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          name="due_date"
          label="Fecha Límite (Entrega)"
          type="date"
          fullWidth
          variant="standard"
          value={formState.due_date}
          onChange={handleChange}
          InputLabelProps={{
            shrink: true,
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={!formState.project_id}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddWorkItemModal;
