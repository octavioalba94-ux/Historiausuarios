import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Button, TextField, FormControl, InputLabel, Select, MenuItem, Paper, Divider, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const Toolbar = ({ onExport, onFilter, onProjectChange, projects, selectedProject, onReportClick, onAddClick }) => {
  const theme = useTheme();
  const isMatrix = theme.palette.mode === 'dark';
  const [searchById, setSearchById] = useState('');

  const handleSearchById = () => {
    if (searchById.trim()) {
      onFilter(searchById, 'id');
    }
  };

  const handleClearFilters = () => {
    setSearchById('');
    onFilter('', 'text');
    onProjectChange(null);
  };

  const handleProjectChange = (e) => {
    onProjectChange(e.target.value);
    setSearchById('');
    onFilter('', 'project');
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2.5, 
        mb: 3, 
        backgroundColor: isMatrix ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: 4,
        border: `1px solid ${isMatrix ? 'rgba(0, 255, 65, 0.3)' : 'rgba(25, 118, 210, 0.2)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Project Selector - Sleeker version */}
        <FormControl size="small" sx={{ minWidth: 250 }}>
          <InputLabel>Proyecto / Área</InputLabel>
          <Select
            value={selectedProject || ''}
            onChange={handleProjectChange}
            label="Proyecto / Área"
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value=""><em>Todos los Proyectos</em></MenuItem>
            {projects && projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Unified Search */}
        <TextField
          placeholder="Buscar por ID, Usuario o Título..."
          variant="outlined"
          size="small"
          onChange={(e) => onFilter(e.target.value, 'text')}
          sx={{ 
            flexGrow: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: isMatrix ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
            }
          }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />

        <Tooltip title="Búsqueda exacta por ID">
          <TextField
            label="ID Exacto"
            variant="outlined"
            size="small"
            value={searchById}
            onChange={(e) => setSearchById(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchById()}
            sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Tooltip>

        <Button
          variant="contained"
          onClick={handleSearchById}
          size="small"
          sx={{ 
            borderRadius: 2, 
            height: 40,
            backgroundColor: isMatrix ? '#00ff41' : '#1976D2',
            color: isMatrix ? '#000' : '#fff',
            fontWeight: 'bold',
            '&:hover': { backgroundColor: isMatrix ? '#00cc33' : '#1565C0' }
          }}
        >
          Buscar
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddClick}
            size="small"
            sx={{ 
              borderRadius: 2,
              backgroundColor: isMatrix ? '#00ff41' : '#2E7D32',
              color: isMatrix ? '#000' : '#fff',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: isMatrix ? '#00cc33' : '#1B5E20' }
            }}
          >
            Nueva Historia
          </Button>

          <Button
            variant="outlined"
            startIcon={<CalendarMonthIcon />}
            onClick={onReportClick}
            size="small"
            sx={{ borderRadius: 2, fontWeight: 'bold' }}
          >
            Reporte Diarío
          </Button>
        </Box>

        <Button
          variant="text"
          startIcon={<ClearIcon />}
          onClick={handleClearFilters}
          size="small"
          color="inherit"
          sx={{ opacity: 0.7 }}
        >
          Limpiar Filtros
        </Button>
      </Box>
    </Paper>
  );
};

export default Toolbar;
