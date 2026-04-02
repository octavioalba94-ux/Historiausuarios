import React, { useState, useEffect } from 'react';
import { Container, CssBaseline, Button, AppBar, Toolbar, Typography, Box, Stack } from '@mui/material';
import { Routes, Route, useNavigate, Navigate, Link } from 'react-router-dom';
import WorkItemManagement from './components/WorkItemManagement';
import UserManagement from './components/UserManagement';
import LoginPage from './components/LoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import ProjectManagement from './components/ProjectManagement';
import VoboManagement from './components/VoboManagement';
import EfficiencyDashboard from './components/EfficiencyDashboard';
import { ThemeProvider } from '@mui/material/styles';
import { normalTheme, matrixTheme } from './theme';
import { 
  DarkMode as DarkModeIcon, 
  LightMode as LightModeIcon, 
  SportsEsports as SportsEsportsIcon, 
  Dashboard as DashboardIcon, 
  Assessment as AssessmentIcon, 
  AccountTree as AccountTreeIcon, 
  People as PeopleIcon, 
  History as HistoryItemIcon, 
  VpnKey as VpnKeyIcon, 
  Logout as LogoutIcon, 
  Layers as LayersIcon
} from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

const PrivateRoute = ({ children, user }) => {
  return user ? children : <Navigate to="/login" />;
};

function App() {
  const [workItems, setWorkItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'normal';
  });
  const navigate = useNavigate();

  const toggleTheme = () => {
    const newMode = themeMode === 'normal' ? 'matrix' : 'normal';
    setThemeMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const currentTheme = themeMode === 'matrix' ? matrixTheme : normalTheme;

  const fetchWorkItems = () => {
    fetch('http://localhost:3001/api/work-items')
      .then(response => response.json())
      .then(data => {
        setWorkItems(data);
      });
  };

  const fetchUsers = () => {
    fetch('http://localhost:3001/api/users')
      .then(response => response.json())
      .then(data => {
        setUsers(data);
      });
  };

  const fetchProjects = () => {
    fetch('http://localhost:3001/api/projects')
      .then(response => response.json())
      .then(data => {
        setProjects(data);
      });
  };

  useEffect(() => {
    if (loggedInUser) {
      fetchWorkItems();
      fetchUsers();
      fetchProjects();
    }
  }, [loggedInUser]);

  const handleUpdate = (id, updatedData) => {
    let targetId = id;
    let data = updatedData;

    // Si el primer argumento es un objeto, intentamos extraer el ID y normalizar los datos
    if (typeof id === 'object' && id !== null) {
      targetId = id.id || id.id_cambio || id.azure_id;
      if (updatedData === undefined) {
        data = id;
      }
    }

    const originalWorkItems = [...workItems];
    let updatedItem = null;
    // Usamos '==' para comparar ID para evitar problemas de tipos (string vs number)
    const updatedWorkItems = workItems.map(c => {
      if (c.id == targetId) {
        updatedItem = { ...c, ...data };
        return updatedItem;
      }
      return c;
    });

    if (!updatedItem) {
      console.error("Error: Work item with ID not found for update:", targetId);
      return;
    }

    setWorkItems(updatedWorkItems);

    fetch(`http://localhost:3001/api/work-items/${targetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedItem)
    })
    .then(response => {
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    })
    .then(() => {
      fetchWorkItems();
      setIsEditModalOpen(false);
      setSelectedWorkItem(null);
    }) 
    .catch(error => {
      console.error('Error updating work item:', error);
      setWorkItems(originalWorkItems); 
    });
  };

  const handleSave = (newWorkItem) => {
    fetch('http://localhost:3001/api/work-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWorkItem)
    })
    .then(response => response.json())
    .then(() => {
      fetchWorkItems();
      setIsModalOpen(false);
    })
    .catch(error => console.error('Error adding work item:', error));
  };

  const handleDelete = (workItemId) => {
    fetch(`http://localhost:3001/api/work-items/${workItemId}`, {
      method: 'DELETE',
    })
    .then(response => {
      if (!response.ok) throw new Error('Delete failed');
      fetchWorkItems();
    })
    .catch(error => console.error('Error deleting work item:', error));
  };

  const handleExport = () => {
    window.open('http://localhost:3001/api/work-items/export');
  };

  const handleOpenEditModal = (workItem) => {
    setSelectedWorkItem(workItem);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setSelectedWorkItem(null);
    setIsEditModalOpen(false);
  };

  const handleDeleteProject = (projectId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto? Se eliminarán todos los Work Items asociados.')) {
      fetch(`http://localhost:3001/api/projects/${projectId}`, {
        method: 'DELETE',
      })
      .then(response => {
        if (!response.ok) throw new Error('Delete project failed');
        fetchProjects();
        fetchWorkItems(); // In case some were deleted
      })
      .catch(error => console.error('Error deleting project:', error));
    }
  };

  const handleAddProject = (projectData) => {
    fetch('http://localhost:3001/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    })
    .then(response => response.json())
    .then(() => {
      fetchProjects();
    })
    .catch(error => console.error('Error adding project:', error));
  };

  const handleImportFromAzure = (azureData) => {
    fetch('http://localhost:3001/api/import-from-azure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(azureData)
    })
    .then(response => response.json())
    .then(data => {
      alert(data.message || 'Importación completada');
      fetchProjects();
      fetchWorkItems();
    })
    .catch(error => {
      console.error('Error importing from Azure:', error);
      alert('Error en la importación: ' + error.message);
    });
  };

  const handlePasswordChange = (oldPassword, newPassword) => {
    fetch('http://localhost:3001/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: loggedInUser.id_usuario, oldPassword, newPassword })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Password change failed');
      }
      return response.json();
    })
    .then(() => {
      setIsChangePasswordModalOpen(false);
      alert('Password changed successfully');
    })
    .catch(error => {
      console.error('Error changing password:', error);
      alert('Failed to change password');
    });
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    navigate('/login');
  };

  return (
    <>
      <CssBaseline />
      <AppBar 
        position="sticky" 
        elevation={themeMode === 'matrix' ? 0 : 4}
        sx={{ 
          background: themeMode === 'matrix' 
            ? 'rgba(0, 0, 0, 0.9)' 
            : 'linear-gradient(90deg, #1976d2 0%, #1565c0 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: themeMode === 'matrix' ? '2px solid #00ff41' : 'none',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: 70 }}>
            {/* Logo Section */}
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '12px',
                  backgroundColor: themeMode === 'matrix' ? 'rgba(0, 255, 65, 0.1)' : 'rgba(255, 255, 255, 0.15)',
                  border: `1px solid ${themeMode === 'matrix' ? '#00ff41' : 'rgba(255, 255, 255, 0.3)'}`,
                }}
              >
                <LayersIcon sx={{ color: themeMode === 'matrix' ? '#00ff41' : 'white' }} />
              </Box>
              <Typography
                variant="h5"
                noWrap
                sx={{
                  fontWeight: 800,
                  letterSpacing: '.1rem',
                  color: 'inherit',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  background: themeMode === 'matrix' 
                    ? 'linear-gradient(45deg, #00ff41 30%, #008f11 90%)'
                    : 'none',
                  WebkitBackgroundClip: themeMode === 'matrix' ? 'text' : 'none',
                  WebkitTextFillColor: themeMode === 'matrix' ? 'transparent' : 'inherit',
                }}
              >
                Tabulador de Cambios
              </Typography>
            </Stack>
            
            {/* Navigation Menu */}
            {loggedInUser && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Work Items">
                  <Button 
                    color="inherit" 
                    component={Link} 
                    to="/"
                    startIcon={<DashboardIcon />}
                    sx={{ 
                      borderRadius: 2,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                    }}
                  >
                    Items
                  </Button>
                </Tooltip>

                <Tooltip title="Proyectos">
                  <Button 
                    color="inherit" 
                    component={Link} 
                    to="/projects"
                    startIcon={<AccountTreeIcon />}
                    sx={{ 
                      borderRadius: 2,
                      px: 2,
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                    }}
                  >
                    Proyectos
                  </Button>
                </Tooltip>

                {loggedInUser.role === 'admin' && (
                  <>
                    <Tooltip title="Métricas y Eficiencia">
                      <Button 
                        color="inherit" 
                        component={Link} 
                        to="/dashboard"
                        startIcon={<AssessmentIcon />}
                        sx={{ 
                          borderRadius: 2,
                          px: 2,
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                        }}
                      >
                        Métricas
                      </Button>
                    </Tooltip>

                    <Tooltip title="Gestión de Usuarios">
                      <Button 
                        color="inherit" 
                        component={Link} 
                        to="/users"
                        startIcon={<PeopleIcon />}
                        sx={{ 
                          borderRadius: 2,
                          px: 2,
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                        }}
                      >
                        Usuarios
                      </Button>
                    </Tooltip>
                    
                    <Tooltip title="Historial VoBo">
                      <Button 
                        color="inherit" 
                        component={Link} 
                        to="/vobo-list"
                        startIcon={<HistoryItemIcon />}
                        sx={{ 
                          borderRadius: 2,
                          px: 2,
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                        }}
                      >
                        VoBo
                      </Button>
                    </Tooltip>
                  </>
                )}

                <Box sx={{ borderLeft: '1px solid rgba(255,255,255,0.2)', height: 24, mx: 1 }} />

                <Tooltip title={`Usuario: ${loggedInUser.name || loggedInUser.username}`}>
                  <Typography variant="body2" sx={{ mr: 1, fontWeight: 'bold', display: { xs: 'none', md: 'block' } }}>
                    👤 {loggedInUser.name || loggedInUser.username}
                  </Typography>
                </Tooltip>

                <Tooltip title="Cambiar Contraseña">
                  <IconButton 
                    color="inherit" 
                    onClick={() => setIsChangePasswordModalOpen(true)}
                    sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
                  >
                    <VpnKeyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Cerrar Sesión">
                  <IconButton 
                    color="inherit" 
                    onClick={handleLogout}
                    sx={{ 
                      '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ff1744' } 
                    }}
                  >
                    <LogoutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}

            <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
              <Tooltip title={themeMode === 'normal' ? "Activar Modo Matriz" : "Activar Modo Normal"}>
                <IconButton 
                  onClick={toggleTheme} 
                  sx={{ 
                    color: themeMode === 'matrix' ? '#00ff41' : 'white',
                    backgroundColor: themeMode === 'matrix' ? 'rgba(0, 255, 65, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                    '&:hover': { 
                      backgroundColor: themeMode === 'matrix' ? 'rgba(0, 255, 65, 0.2)' : 'rgba(255, 255, 255, 0.2)' 
                    }
                  }}
                >
                  {themeMode === 'normal' ? <SportsEsportsIcon /> : <LightModeIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <ThemeProvider theme={currentTheme}>
        <CssBaseline />
        <Container maxWidth={false} sx={{ 
          mt: 3, 
          px: { xs: 2, sm: 4, md: 6 },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          transition: 'all 0.3s ease'
        }}>
        <Routes>
          <Route path="/login" element={<LoginPage setLoggedInUser={setLoggedInUser} />} />
          <Route
            path="/"
            element={
              <PrivateRoute user={loggedInUser}>
                <WorkItemManagement
                  loggedInUser={loggedInUser}
                  workItems={workItems}
                  users={users}
                  projects={projects}
                  isModalOpen={isModalOpen}
                  isEditModalOpen={isEditModalOpen}
                  selectedWorkItem={selectedWorkItem}
                  handleUpdate={handleUpdate}
                  handleSave={handleSave}
                  handleDelete={handleDelete}
                  handleExport={handleExport}
                  setIsModalOpen={setIsModalOpen}
                  handleOpenEditModal={handleOpenEditModal}
                  handleCloseEditModal={handleCloseEditModal}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute user={loggedInUser}>
                {loggedInUser?.role === 'admin' ? <UserManagement users={users} fetchUsers={fetchUsers} /> : <Navigate to="/" />}
              </PrivateRoute>
            }
          />
            <Route
              path="/projects"
              element={
                <PrivateRoute user={loggedInUser}>
                  <ProjectManagement 
                    projects={projects} 
                    onDeleteProject={handleDeleteProject}
                    onImportFromAzure={handleImportFromAzure}
                    onAddProject={handleAddProject}
                    loggedInUser={loggedInUser}
                  />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute user={loggedInUser}>
                  {loggedInUser?.role === 'admin' ? (
                    <EfficiencyDashboard projects={projects} users={users} />
                  ) : (
                    <Navigate to="/" />
                  )}
                </PrivateRoute>
              }
            />
            <Route
              path="/vobo-list"
              element={
                <PrivateRoute user={loggedInUser}>
                  {loggedInUser?.role === 'admin' ? <VoboManagement /> : <Navigate to="/" />}
                </PrivateRoute>
              }
            />
          </Routes>
      </Container>
      </ThemeProvider>
      
      <ChangePasswordModal
        open={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSave={handlePasswordChange}
      />
    </>
  );
}

export default App;
