import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import AddIcon from '@mui/icons-material/Add';
import ImportFromAzureModal from './ImportFromAzureModal';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';

const ProjectManagement = ({ projects, onDeleteProject, onImportFromAzure, onAddProject, loggedInUser }) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const isAdmin = loggedInUser?.role?.toLowerCase() === 'admin';
  const hasAzureProjects = projects && projects.some(p => p.azure_id || p.type === 'azure');

  const handleImport = (azureData) => {
    onImportFromAzure(azureData);
    setIsImportModalOpen(false);
  };

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      onAddProject({ name: newProjectName, type: 'internal', organization: 'Interna' });
      setNewProjectName('');
      setIsAddModalOpen(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 2 }}>
        <Typography variant="h4" component="h1">
          Proyectos
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setIsAddModalOpen(true)}
              sx={{ borderColor: '#0078d4', color: '#0078d4' }}
            >
              Nuevo Proyecto Interno
            </Button>
            <Button
              variant="contained"
              startIcon={<CloudDownloadIcon />}
              onClick={() => setIsImportModalOpen(true)}
              sx={{ backgroundColor: '#0078d4', '&:hover': { backgroundColor: '#005a9e' } }}
            >
              Conectar a Azure
            </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Tipo</TableCell>
              {hasAzureProjects && <TableCell>ID de Azure</TableCell>}
              <TableCell>Nombre</TableCell>
              <TableCell>Organización</TableCell>
              {isAdmin && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>{project.id}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ 
                    color: project.type === 'internal' ? 'info.main' : 'primary.main',
                    fontWeight: 'bold'
                  }}>
                    {project.type === 'internal' ? 'INTERNO' : 'AZURE'}
                  </Typography>
                </TableCell>
                {hasAzureProjects && <TableCell>{project.azure_id || '-'}</TableCell>}
                <TableCell>{project.name}</TableCell>
                <TableCell>{project.organization || '-'}</TableCell>
                {isAdmin && (
                  <TableCell align="right">
                    <Tooltip title="Eliminar Proyecto">
                      <IconButton 
                        color="error" 
                        onClick={() => onDeleteProject(project.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal Importar de Azure */}
      <ImportFromAzureModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />

      {/* Modal Agregar Proyecto Manual */}
      <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <DialogTitle>Nuevo Proyecto Interno</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre del Proyecto"
            fullWidth
            variant="standard"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddProject} disabled={!newProjectName.trim()}>Crear</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProjectManagement;
