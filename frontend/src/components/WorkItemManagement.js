import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import WorkItemTable from './WorkItemTable';
import Toolbar from './Toolbar';
import AddWorkItemModal from './AddWorkItemModal';
import EditWorkItemModal from './EditWorkItemModal';
import ReportModal from './ReportModal';
import DevProgressPanel from './DevProgressPanel';
import QaProgressPanel from './QaProgressPanel';
import axios from 'axios';

import { Typography, Box, Alert, Card, CardContent, Grid, Chip, CircularProgress, Button, Paper } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import IconButton from '@mui/material/IconButton';

const WorkItemManagement = ({
  loggedInUser,
  workItems,
  users,
  projects,
  isModalOpen,
  isEditModalOpen,
  selectedWorkItem,
  handleUpdate,
  handleSave,
  handleDelete,
  handleExport,
  setIsModalOpen,
  handleOpenEditModal,
  handleCloseEditModal,
}) => {
  const theme = useTheme();
  const isMatrix = theme.palette.mode === 'dark';
  const [selectedProject, setSelectedProject] = useState(null);
  const [filterType, setFilterType] = useState('text');
  const [filterValue, setFilterValue] = useState('');
  const [projectWorkItems, setProjectWorkItems] = useState([]);
  const [loadingProject, setLoadingProject] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchCache, setSearchCache] = useState({});
  const [keywordCache, setKeywordCache] = useState({}); // Nuevo: Caché para palabras clave
  const [isFromCache, setIsFromCache] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(null);
  const [pendingKeywordSearch, setPendingKeywordSearch] = useState(null); // Nuevo: Debounce para keyword
  const [isReportModalOpen, setIsReportModalOpen] = useState(false); // Added state
  const [voboItems, setVoboItems] = useState([]);
  const [devInProgressItems, setDevInProgressItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const PAGE_SIZE = 10;
  const SEARCH_DEBOUNCE_MS = 300;

  // --- Fetchers y Sincronización (Hoisted) ---
  function fetchVobo() {
    const role = loggedInUser?.role?.toLowerCase();
    if (role === 'admin') {
      axios.get('http://localhost:3001/api/work-items/vobo-ready')
        .then(res => setVoboItems(res.data))
        .catch(err => console.error(err));
    }
  }

  function fetchDevInProgress() {
    const role = loggedInUser?.role?.toLowerCase();
    if (role === 'admin' || role === 'desarrollo' || role === 'desarrollador') {
      axios.get('http://localhost:3001/api/work-items/dev-in-progress')
        .then(res => setDevInProgressItems(res.data))
        .catch(err => console.error(err));
    }
  }

  const refreshAllPanels = useCallback(() => {
    fetchVobo();
    fetchDevInProgress();
    setRefreshKey(prev => prev + 1);
  }, [loggedInUser]); // Depende de loggedInUser porque las funciones internas lo usan mentalmente, 
                      // aunque las funciones hoisted no cambian su identidad, acceden a los props actuales.
  // ---------------------------------

  const handleApprove = (id) => {
    if (window.confirm('¿Estás seguro de que deseas aprobar y finalizar este Work Item?')) {
      axios.post(`http://localhost:3001/api/work-items/${id}/approve`)
        .then(() => {
          refreshAllPanels();
          alert('Work Item aprobado y finalizado.');
        })
        .catch(err => {
            console.error(err);
            alert('Error al aprobar el Work Item.');
        });
    }
  };

  useEffect(() => {
    refreshAllPanels();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(refreshAllPanels, 30000);
    return () => clearInterval(interval);
  }, [refreshAllPanels, workItems]);

  // Cargar Work Items cuando se selecciona un proyecto (primera página)
  // Limpiar estado cuando cambia el proyecto (no cargar automáticamente)
  useEffect(() => {
    if (selectedProject) {
      setErrorMessage('');
      setProjectWorkItems([]);
      setTotalItems(0);
      setHasMore(false);
      setCurrentOffset(0);
      setFilterValue('');
      setFilterType('project');
    } else {
      setProjectWorkItems([]);
      setTotalItems(0);
      setHasMore(false);
      setErrorMessage('');
    }
  }, [selectedProject]);

  // Debounce para búsquedas por ID
  useEffect(() => {
    if (pendingSearch === null) return;

    const timer = setTimeout(() => {
      performSearch(pendingSearch);
      setPendingSearch(null);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [pendingSearch]);

  // NUEVO: Debounce para búsquedas por Palabra Clave
  useEffect(() => {
    if (pendingKeywordSearch === null) return;

    const timer = setTimeout(() => {
      performKeywordSearch(pendingKeywordSearch);
      setPendingKeywordSearch(null);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [pendingKeywordSearch]);

  const performKeywordSearch = (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Verificar caché
    if (keywordCache[trimmedQuery]) {
      setProjectWorkItems(keywordCache[trimmedQuery].data);
      setTotalItems(keywordCache[trimmedQuery].data.length);
      setIsFromCache(true);
      setLoadingProject(false);
      setErrorMessage('');
      return;
    }

    setLoadingProject(true);
    setErrorMessage('');
    setIsFromCache(false);

    axios.get(`http://localhost:3001/api/work-items/search-keyword?q=${encodeURIComponent(trimmedQuery)}`)
      .then(response => {
        const results = response.data;
        setKeywordCache(prev => ({ ...prev, [trimmedQuery]: { data: results } }));
        setProjectWorkItems(results);
        setTotalItems(results.length);
        setHasMore(false);
        setLoadingProject(false);
      })
      .catch(error => {
        console.error('Error in keyword search:', error);
        setErrorMessage('Error al realizar la búsqueda por palabra clave');
        setLoadingProject(false);
      });
  };

  const performSearch = (searchId) => {
    const trimmedId = searchId.trim();
    
    // Verificar caché primero
    if (searchCache[trimmedId]) {
      console.log('✓ Resultado del caché:', trimmedId);
      const cachedResult = searchCache[trimmedId];
      if (cachedResult.error) {
        setProjectWorkItems([]);
        setTotalItems(0);
        setHasMore(false);
        setErrorMessage(cachedResult.error);
      } else {
        setProjectWorkItems(cachedResult.data);
        setTotalItems(cachedResult.data.length);
        setHasMore(false);
        setErrorMessage('');
      }
      setIsFromCache(true);
      setLoadingProject(false);
      return;
    }

    // No está en caché, hacer solicitud al servidor
    setLoadingProject(true);
    setErrorMessage('');
    setIsFromCache(false);
    
    axios.get(`http://localhost:3001/api/work-items/search/${encodeURIComponent(trimmedId)}`, { timeout: 30000 })
      .then(response => {
        console.log('✓ Resultado del servidor:', trimmedId);
        const results = Array.isArray(response.data) ? response.data : [response.data];
        
        // Guardar en caché
        setSearchCache(prev => ({
          ...prev,
          [trimmedId]: { data: results }
        }));
        setProjectWorkItems(results);
        setTotalItems(results.length);
        setHasMore(false);
        setLoadingProject(false);
      })
      .catch(error => {
        console.error('Error searching by ID:', error);
        const errorMsg = `No encontrado: ${error.response?.status === 404 ? 'ID no existe' : error.message}`;
        // Guardar error en caché también
        setSearchCache(prev => ({
          ...prev,
          [trimmedId]: { error: errorMsg }
        }));
        setProjectWorkItems([]);
        setTotalItems(0);
        setHasMore(false);
        setErrorMessage(errorMsg);
        setLoadingProject(false);
      });
  };

  const handleFilterChange = (value, type = 'text') => {
    if (type === 'id') {
      setFilterValue(value);
      setFilterType('id');
      
      // Si el valor está vacío, mostrar nada
      if (!value || value.trim() === '') {
        setProjectWorkItems([]);
        setTotalItems(0);
        setHasMore(false);
        setErrorMessage('');
        setIsFromCache(false);
        setPendingSearch(null);
        return;
      }
      
      // Programar búsqueda con debounce
      setPendingSearch(value);
    } else if (type === 'project') {
      // Solo cambiar proyecto, no hacer nada más
      setFilterValue('');
      setFilterType('project');
      setProjectWorkItems([]);
      setErrorMessage('');
      setIsFromCache(false);
      setPendingSearch(null);
    } else {
      // Búsqueda por texto (palabra clave) - Ahora con backend y debounce
      setFilterValue(value);
      setFilterType('text');
      setIsFromCache(false);
      
      if (!value || value.trim() === '') {
          setProjectWorkItems([]);
          setPendingKeywordSearch(null);
          return;
      }
      
      setPendingKeywordSearch(value);
    }
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    setFilterValue('');
    setFilterType('project');
  };

  // Determinar qué datos mostrar
  const getDisplayItems = () => {
    // Si es búsqueda por ID o Palabra Clave, usamos projectWorkItems que es donde se guarda el resultado del backend
    if (filterType === 'id' || filterType === 'text') {
      return Array.isArray(projectWorkItems) ? projectWorkItems : [];
    }

    let items = selectedProject ? (projectWorkItems || []) : (workItems || []);
    
    // Asegurar que siempre es un array
    if (!Array.isArray(items)) {
      items = [];
    }

    // Filtro de texto (Palabra clave / Coincidencia)
    // El usuario solicitó buscar en ID o Usuario y que sea rápido.
    if (filterType === 'text' && filterValue) {
      const lowerFilter = filterValue.toLowerCase().trim();
      items = items.filter(item => {
        // Coincidencia en ID (Local o Azure)
        const matchesId = (
          item.id?.toString().includes(lowerFilter) || 
          item.azure_id?.toString().includes(lowerFilter)
        );

        // Coincidencia en Usuario (Asignado o Solicitante)
        const matchesUser = (
          item.assigned_to?.toLowerCase().includes(lowerFilter) || 
          item.solicitante?.toLowerCase().includes(lowerFilter) ||
          item.nombreTester?.toLowerCase().includes(lowerFilter)
        );

        // También mantenemos título para no romper la funcionalidad existente, 
        // pero priorizamos lo solicitado.
        const matchesGeneral = (
          item.title?.toLowerCase().includes(lowerFilter) ||
          item.description?.toLowerCase().includes(lowerFilter)
        );

        return matchesId || matchesUser || matchesGeneral;
      });
    }

    return items;
  };

  const filteredWorkItems = getDisplayItems();
  const selectedProjectData = selectedProject 
    ? projects?.find(p => p.id === selectedProject)
    : null;



  return (
    <>
      <Box sx={{ 
        mt: 2, 
        mb: 4, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end',
        borderBottom: `2px solid ${isMatrix ? 'rgba(0, 255, 65, 0.3)' : 'rgba(0, 0, 0, 0.05)'}`,
        pb: 1
      }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
          📋 Work Items
        </Typography>
        {selectedProjectData && (
          <Typography variant="h6" sx={{ color: isMatrix ? '#00ff41' : 'primary.main', fontWeight: 600 }}>
            {selectedProjectData.name}
          </Typography>
        )}
      </Box>

      <Toolbar
        onExport={handleExport}
        onFilter={handleFilterChange}
        onProjectChange={handleProjectChange}
        projects={projects}
        selectedProject={selectedProject}
        onReportClick={() => setIsReportModalOpen(true)}
        onAddClick={() => setIsModalOpen(true)}
      />

      {selectedProjectData && (
        <Box sx={{ 
          mb: 4, 
          p: 3,
          borderRadius: 4,
          background: isMatrix 
            ? 'linear-gradient(135deg, rgba(0, 255, 65, 0.05) 0%, rgba(0, 0, 0, 0) 100%)' 
            : 'linear-gradient(135deg, #E3F2FD 0%, #FFFFFF 100%)',
          border: `1px solid ${isMatrix ? 'rgba(0, 255, 65, 0.2)' : 'rgba(25, 118, 210, 0.1)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 3
        }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 3, 
            backgroundColor: isMatrix ? 'rgba(0, 255, 65, 0.1)' : '#BBDEFB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FolderIcon sx={{ fontSize: 40, color: isMatrix ? '#00ff41' : '#1976D2' }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: isMatrix ? '#00ff41' : '#1565C0', mb: 0.5 }}>
              {selectedProjectData.name}
            </Typography>
            {selectedProjectData.organization && (
              <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 500 }}>
                Organización: <strong>{selectedProjectData.organization}</strong>
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold', opacity: 0.6 }}>
              ESTADÍSTICAS DEL PROYECTO
            </Typography>
            <Chip 
              label={`${filteredWorkItems.length} Items Encontrados`} 
              color="primary" 
              variant={isMatrix ? "outlined" : "filled"}
              sx={{ fontWeight: 'bold', borderRadius: 2 }}
            />
          </Box>
        </Box>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2, color: 'black' }}>
          ⚠️ {errorMessage}
        </Alert>
      )}

      {isFromCache && projectWorkItems.length > 0 && (
        <Alert severity="success" sx={{ mb: 2, color: 'black', backgroundColor: '#E8F5E9' }}>
          ✓ Resultado del caché - Carga instantánea sin latencia de red
        </Alert>
      )}

      {filterType === 'id' && filterValue && !isFromCache && loadingProject && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<Typography>🔍</Typography>}>
          Buscando Work Items con ID: <strong>{filterValue}</strong>
        </Alert>
      )}

      {filterType === 'id' && filterValue && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<Typography>🔍</Typography>}>
          Mostrando <strong>{filteredWorkItems.length} resultado{filteredWorkItems.length !== 1 ? 's' : ''}</strong> para el/los ID(s): <strong>{filterValue}</strong>
        </Alert>
      )}

      {filterType === 'text' && filterValue && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<Typography>🔍</Typography>}>
          Buscando por palabra clave: <strong>{filterValue}</strong>
        </Alert>
      )}

      {/* Centro de Acciones Unificado */}
      {(devInProgressItems.length > 0 || voboItems.length > 0) && (
        <Paper 
          elevation={0}
          sx={{ 
            mb: 4, 
            p: 3, 
            borderRadius: 4, 
            backgroundColor: isMatrix ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.02)',
            border: `1px dashed ${isMatrix ? 'rgba(0, 255, 65, 0.3)' : 'rgba(0,0,0,0.1)'}`
          }}
        >
          <Typography variant="overline" sx={{ fontWeight: 800, mb: 2, display: 'block', color: 'text.secondary' }}>
            🎯 Centro de Acciones Prioritarias
          </Typography>

          <Grid container spacing={3}>
            {/* Panel Desarrollo */}
            {(['admin', 'desarrollo', 'desarrollador'].includes(loggedInUser?.role?.toLowerCase())) && devInProgressItems.length > 0 && (
              <Grid item xs={12} md={voboItems.length > 0 ? 6 : 12}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                      💻 Desarrollo en Proceso
                    </Typography>
                    <IconButton size="small" onClick={fetchDevInProgress}><RefreshIcon fontSize="small" /></IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {devInProgressItems.map(item => (
                      <Chip
                        key={item.id}
                        label={`${item.azure_id || item.id} | ${item.dev_progress}%`}
                        onClick={() => handleFilterChange(item.azure_id?.toString() || item.id.toString(), 'id')}
                        color="primary"
                        variant="outlined"
                        size="small"
                        sx={{ borderRadius: 1.5, fontWeight: 600, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.1)' } }}
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>
            )}

            {/* Panel VoBo */}
            {(loggedInUser?.role?.toLowerCase() === 'admin') && voboItems.length > 0 && (
              <Grid item xs={12} md={devInProgressItems.length > 0 ? 6 : 12}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                      ✅ Pendientes de VoBo
                    </Typography>
                    <IconButton size="small" onClick={fetchVobo}><RefreshIcon fontSize="small" /></IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {voboItems.map(item => (
                      <Chip
                        key={item.id}
                        label={item.azure_id || item.id}
                        onClick={() => handleFilterChange(item.azure_id?.toString() || item.id.toString(), 'id')}
                        onDelete={() => handleApprove(item.id)}
                        deleteIcon={<CheckIcon />}
                        color="success"
                        variant="outlined"
                        size="small"
                        sx={{ borderRadius: 1.5, fontWeight: 600, cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      <DevProgressPanel loggedInUser={loggedInUser} onFilter={handleFilterChange} refreshTrigger={refreshKey} />
      <QaProgressPanel loggedInUser={loggedInUser} onFilter={handleFilterChange} refreshTrigger={refreshKey} />

      {loadingProject ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {projectWorkItems.length > 0 && (
            <WorkItemTable
              workItems={filteredWorkItems}
              onOpenEdit={handleOpenEditModal}
              onDelete={handleDelete}
              loggedInUser={loggedInUser}
              onProgressUpdate={refreshAllPanels}
            />
          )}
        </>
      )}

      <AddWorkItemModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        users={users}
        projects={projects}
      />

      <EditWorkItemModal
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        workItem={selectedWorkItem}
        onSave={handleUpdate}
        users={users}
      />
      
      <ReportModal 
        open={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        users={users} 
        loggedInUser={loggedInUser} 
      />
    </>
  );
};

export default WorkItemManagement;
