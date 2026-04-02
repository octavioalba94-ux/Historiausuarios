import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Divider, List, ListItem, ListItemText, 
    IconButton, TextField, Button, Grid, LinearProgress, Tabs, Tab,
    Dialog, DialogTitle, DialogContent, DialogActions, Link 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axios from 'axios';
import FileManager from './FileManager';

const WorkItemDetails = ({ workItem, loggedInUser, onProgressUpdate }) => {
    const theme = useTheme();
    const isMatrix = theme.palette.mode === 'dark';
    const [miniTasks, setMiniTasks] = useState([]);
    const [tabIndex, setTabIndex] = useState(0);

    // Form states
    const [newTitle, setNewTitle] = useState('');
    const [newNote, setNewNote] = useState('');
    const [newPercentage, setNewPercentage] = useState('');
    const [editingTask, setEditingTask] = useState(null);

    // VoBo states
    const [voboNota, setVoboNota] = useState('');
    const [voboFile, setVoboFile] = useState(null);
    const [isVoboLoading, setIsVoboLoading] = useState(false);

    // QA Reject Dialog states
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [rejectNota, setRejectNota] = useState('');
    const [rejectPercentage, setRejectPercentage] = useState('');

    const fetchTasks = () => {
        if (!workItem) return;
        axios.get(`http://localhost:3001/api/work-items/${workItem.id}/mini-tasks`)
            .then(response => {
                setMiniTasks(response.data);
            })
            .catch(error => {
                console.error('Error fetching mini-tasks:', error);
            });
    };

    useEffect(() => {
        fetchTasks();
    }, [workItem]);

    const desarrolloTasks = miniTasks.filter(t => t.tipo === 'desarrollo');
    const qaTasks = miniTasks.filter(t => t.tipo === 'qa');

    const totalDesarrollo = desarrolloTasks.reduce((sum, task) => sum + (Number(task.porcentaje) || 0), 0);
    const totalQA = qaTasks.reduce((sum, task) => sum + (Number(task.porcentaje) || 0), 0);

    const userRole = loggedInUser?.role?.toLowerCase() || '';
    const canEditDev = userRole === 'desarrollador' || userRole === 'admin';
    const canEditQA = userRole === 'qa' || userRole === 'admin';
    const isQATabUnlocked = totalDesarrollo >= 100;

    const currentTabTotal = tabIndex === 0 ? totalDesarrollo : totalQA;
    const currentTabTasks = tabIndex === 0 ? desarrolloTasks : qaTasks;
    const currentTipo = tabIndex === 0 ? 'desarrollo' : 'qa';
    const canEditCurrentTab = tabIndex === 0 ? canEditDev : (isQATabUnlocked && canEditQA);

    const handleTabChange = (event, newValue) => {
        if (newValue === 1 && !isQATabUnlocked) {
            alert('La pestaña de QA solo se habilita cuando Desarrollo llega al 100%.');
            return;
        }
        setTabIndex(newValue);
        resetForm();
    };

    const handleAddOrEdit = () => {
        const perc = Number(newPercentage);
        if (!newTitle.trim() || isNaN(perc) || perc <= 0) {
            alert('Por favor, ingresa un título válido y un porcentaje mayor a 0.');
            return;
        }

        const currentTotalExcludingEdit = editingTask 
            ? currentTabTotal - editingTask.porcentaje
            : currentTabTotal;

        if (currentTotalExcludingEdit + perc > 100) {
            alert(`El porcentaje total de esta sección no puede superar el 100%. Disponible: ${100 - currentTotalExcludingEdit}%`);
            return;
        }

        if (editingTask) {
            axios.put(`http://localhost:3001/api/mini-tasks/${editingTask.id}`, {
                titulo: newTitle,
                nota: newNote,
                porcentaje: perc,
                tipo: currentTipo
            }).then(response => {
                 setMiniTasks(miniTasks.map(t => t.id === editingTask.id ? response.data : t));
                 resetForm();
                 if (onProgressUpdate) onProgressUpdate();
            }).catch(e => {
                 console.error("Error editing task", e);
                 alert("Hubo un error al actualizar la tarea");
            });
        } else {
            axios.post(`http://localhost:3001/api/work-items/${workItem.id}/mini-tasks`, {
                titulo: newTitle,
                nota: newNote,
                porcentaje: perc,
                tipo: currentTipo,
                usuario: loggedInUser?.username || 'Usuario'
            }).then(response => {
                setMiniTasks([...miniTasks, response.data]);
                resetForm();
                if (onProgressUpdate) onProgressUpdate();
            }).catch(e => {
                 console.error("Error adding task", e);
                 alert("Hubo un error al agregar la tarea");
            });
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Seguro que deseas eliminar este proceso?')) {
            axios.delete(`http://localhost:3001/api/mini-tasks/${id}`)
                .then(() => {
                    setMiniTasks(miniTasks.filter(t => t.id !== id));
                    if(editingTask && editingTask.id === id) resetForm();
                    if (onProgressUpdate) onProgressUpdate();
                })
                .catch(e => console.error("Error deleting task", e));
        }
    };

    const handleEditClick = (task) => {
        setEditingTask(task);
        setNewTitle(task.titulo);
        setNewNote(task.nota || '');
        setNewPercentage(task.porcentaje);
    };

    const resetForm = () => {
        setEditingTask(null);
        setNewTitle('');
        setNewNote('');
        setNewPercentage('');
    };

    const submitQaReject = () => {
        const perc = Number(rejectPercentage);
        if (!rejectNota.trim() || isNaN(perc) || perc <= 0 || perc > 100) {
            alert('Por favor agrega una nota detallada del error y un porcentaje de deducción válido (1-100).');
            return;
        }

        axios.post(`http://localhost:3001/api/work-items/${workItem.id}/qa-reject`, {
            nota: rejectNota,
            porcentajeDeducir: perc,
            usuario: loggedInUser?.username || 'Usuario'
        }).then(() => {
            alert('Error reportado. Se ha deducido el progreso de Desarrollo exitosamente.');
            setIsRejectOpen(false);
            setRejectNota('');
            setRejectPercentage('');
            fetchTasks(); // Reload all tasks to get the new distributions
            setTabIndex(0); // Switch back to Dev tab so they can see it
            if (onProgressUpdate) onProgressUpdate();
        }).catch(e => {
            console.error(e);
            alert('Ocurrió un problema al enviar el rechazo.');
        });
    };

    const renderProgressBar = (value, color) => (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress variant="determinate" value={value} color={color} sx={{ height: 10, borderRadius: 5 }} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary">{`${value}%`}</Typography>
            </Box>
        </Box>
    );

    const handleVoboApprove = () => {
        if (!voboNota.trim()) {
            alert('Por favor agrega una nota para el Visto Bueno.');
            return;
        }
        setIsVoboLoading(true);
        const formData = new FormData();
        formData.append('notas', voboNota);
        formData.append('usuario', loggedInUser?.username || 'Admin');
        if (voboFile) {
            formData.append('file', voboFile);
        }

        axios.post(`http://localhost:3001/api/work-items/${workItem.id}/vobo-approve`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(() => {
            alert('Visto Bueno otorgado exitosamente.');
            setIsVoboLoading(false);
            setVoboNota('');
            setVoboFile(null);
            if (onProgressUpdate) onProgressUpdate();
        }).catch(e => {
            console.error(e);
            alert('Error al otorgar VoBo.');
            setIsVoboLoading(false);
        });
    };

    const handleVoboReject = () => {
        if (!voboNota.trim()) {
            alert('Por favor explica por qué no se dio el VoBo.');
            return;
        }
        if (!window.confirm('¿Confirmas el rechazo de VoBo? Se descontará el 10% del progreso de QA.')) return;

        setIsVoboLoading(true);
        axios.post(`http://localhost:3001/api/work-items/${workItem.id}/vobo-reject`, {
            nota: voboNota,
            usuario: loggedInUser?.username || 'Admin'
        }).then(() => {
            alert('VoBo rechazado. El avance de QA se ha reducido un 10%.');
            setIsVoboLoading(false);
            setVoboNota('');
            if (onProgressUpdate) onProgressUpdate();
        }).catch(e => {
            console.error(e);
            alert('Error al rechazar VoBo.');
            setIsVoboLoading(false);
        });
    };

    return (
        <Box sx={{ margin: 2 }}>
            {workItem.description && (
                <Paper 
                    elevation={0}
                    sx={{ 
                        p: 2, 
                        mb: 2, 
                        backgroundColor: isMatrix ? 'rgba(0, 255, 65, 0.05)' : '#fdfdfd',
                        border: `1px solid ${isMatrix ? 'rgba(0, 255, 65, 0.2)' : '#eee'}`,
                        borderRadius: 2
                    }}
                >
                    <Typography variant="overline" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        Descripción / Historia de Usuario
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                        {workItem.description}
                    </Typography>
                </Paper>
            )}

            <Paper sx={{ mb: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth">
                    <Tab label="Procesos y Avance Desarrollo" />
                    <Tab 
                        label="Procesos y Avance QA" 
                        disabled={!isQATabUnlocked} 
                        sx={{ opacity: isQATabUnlocked ? 1 : 0.5 }}
                    />
                    {userRole === 'admin' && (
                        <Tab 
                            label="Proceso y Avance VoBo" 
                            disabled={totalQA < 100 && workItem.vobo_status !== 'approved'}
                            sx={{ opacity: (totalQA >= 100 || workItem.vobo_status === 'approved') ? 1 : 0.5 }}
                        />
                    )}
                </Tabs>
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{tabIndex === 0 ? "Progreso de Desarrollo" : "Progreso de QA"}</span>
                        {workItem.urlEvidencias && (workItem.urlEvidencias.startsWith('http') || workItem.urlEvidencias.includes('www.')) && (
                            <Link
                                href={workItem.urlEvidencias.startsWith('http') ? workItem.urlEvidencias : `https://${workItem.urlEvidencias}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ 
                                    fontSize: '0.8rem',
                                    color: isMatrix ? '#00ff41' : '#1976D2',
                                    textDecoration: 'underline'
                                }}
                            >
                                🔗 Ver Evidencias
                            </Link>
                        )}
                    </Typography>
                    
                    {renderProgressBar(currentTabTotal, tabIndex === 0 ? 'primary' : 'success')}

                    {tabIndex === 1 && canEditQA && (
                        <Box sx={{ mb: 3, textAlign: 'right' }}>
                            <Button 
                                variant="outlined" 
                                color="error" 
                                startIcon={<WarningAmberIcon />}
                                onClick={() => setIsRejectOpen(true)}
                            >
                                Reportar Error y Regresar a Desarrollo
                            </Button>
                        </Box>
                    )}

                    <Divider sx={{ marginY: 2 }} />

                    {canEditCurrentTab ? (
                        <>
                            {/* Form */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                {editingTask ? 'Editar Proceso' : 'Agregar Nuevo Proceso'}
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={8}>
                                    <TextField fullWidth label="Título del proceso" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} size="small" />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Porcentaje (%)" type="number" value={newPercentage} onChange={(e) => setNewPercentage(e.target.value)} size="small" InputProps={{ inputProps: { min: 1, max: 100 } }} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField fullWidth label="Nota (opcional)" multiline rows={2} value={newNote} onChange={(e) => setNewNote(e.target.value)} size="small" />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button variant="contained" color="primary" onClick={handleAddOrEdit}>
                                        {editingTask ? 'Actualizar Proceso' : 'Agregar Proceso'}
                                    </Button>
                                    {editingTask && (
                                        <Button variant="outlined" color="secondary" onClick={resetForm} sx={{ ml: 1 }}>
                                            Cancelar
                                        </Button>
                                    )}
                                </Grid>
                            </Grid>
                            <Divider sx={{ marginY: 3 }} />
                        </>
                    ) : (
                        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 3 }}>
                            <Typography variant="body2" color="text.secondary" align="center">
                                No tienes permisos para editar los procesos en esta sección o la sección está bloqueada.
                            </Typography>
                        </Box>
                    )}

                    {/* List of Tasks */}
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Historial de Procesos</Typography>
                    <List>
                        {currentTabTasks.map(task => (
                            <ListItem key={task.id} 
                                secondaryAction={
                                    canEditCurrentTab && task.porcentaje > 0 && (
                                        <Box>
                                            <IconButton edge="end" aria-label="edit" onClick={() => handleEditClick(task)} sx={{ mr: 1 }}>
                                                <EditIcon color="primary" />
                                            </IconButton>
                                            {userRole === 'admin' && (
                                                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(task.id)}>
                                                    <DeleteIcon color="error" />
                                                </IconButton>
                                            )}
                                        </Box>
                                    )
                                }
                                sx={{ backgroundColor: task.porcentaje === 0 ? '#ffebee' : '#f9f9f9', mb: 1, borderRadius: 1 }}
                            >
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: task.porcentaje === 0 ? '#c62828' : '#1976d2' }}>
                                            {task.titulo} • <span style={{color: '#ff6f00'}}>{task.porcentaje}%</span>
                                        </Typography>
                                    }
                                    secondary={
                                        <>
                                            {task.nota && <Typography variant="body2" sx={{ mt: 0.5 }}>{task.nota}</Typography>}
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                Registrado por <strong>{task.usuario || 'Sistema'}</strong> el {new Date(task.fecha_creacion).toLocaleString()}
                                                {task.porcentaje === 0 && ' (Deducción por QA)'}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                        {currentTabTasks.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                Aún no hay procesos registrados en esta sección.
                            </Typography>
                        )}
                    </List>
                    
                    {tabIndex === 2 && (
                        <Box sx={{ mt: 3 }}>
                            <Divider sx={{ mb: 3 }} />
                            {workItem.vobo_status === 'approved' ? (
                                <Box sx={{ p: 3, bgcolor: isMatrix ? 'rgba(0, 255, 65, 0.1)' : '#E8F5E9', borderRadius: 2, border: `1px solid ${isMatrix ? '#00ff41' : '#2E7D32'}` }}>
                                    <Typography variant="h6" sx={{ color: isMatrix ? '#00ff41' : '#1B5E20', fontWeight: 'bold', mb: 1 }}>
                                        ✅ Visto Bueno Otorgado
                                    </Typography>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Fecha:</strong> {new Date(workItem.vobo_fecha).toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Usuario:</strong> {workItem.vobo_usuario}
                                    </Typography>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Notas:</strong> {workItem.vobo_notas}
                                    </Typography>
                                    {workItem.vobo_file_path && (
                                        <Box sx={{ mt: 2 }}>
                                            <Button 
                                                variant="outlined" 
                                                color="success" 
                                                href={`http://localhost:3001/${workItem.vobo_file_path}`} 
                                                download={workItem.vobo_file_name}
                                                size="small"
                                            >
                                                📄 Descargar Documento VoBo
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            ) : (
                                <Box>
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Otorgar Visto Bueno Final
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField 
                                                fullWidth 
                                                label="Notas de VoBo/Aprobación" 
                                                multiline 
                                                rows={3} 
                                                value={voboNota} 
                                                onChange={(e) => setVoboNota(e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" gutterBottom>Documento de VoBo (opcional):</Typography>
                                            <input 
                                                type="file" 
                                                onChange={(e) => setVoboFile(e.target.files[0])}
                                                style={{ marginBottom: '16px', display: 'block' }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sx={{ display: 'flex', gap: 2 }}>
                                            <Button 
                                                variant="contained" 
                                                color="success" 
                                                onClick={handleVoboApprove}
                                                disabled={isVoboLoading}
                                            >
                                                {isVoboLoading ? 'Procesando...' : 'Dar Visto Bueno'}
                                            </Button>
                                            <Button 
                                                variant="contained" 
                                                color="error" 
                                                onClick={handleVoboReject}
                                                disabled={isVoboLoading}
                                            >
                                                {isVoboLoading ? 'Procesando...' : 'Rechazar VoBo (-10% QA)'}
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Reject Dialog */}
            <Dialog open={isRejectOpen} onClose={() => setIsRejectOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: '#d32f2f' }}>Regresar a Desarrollo</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Ingresa una nota describiendo el error encontrado y el porcentaje que consideras que debe restarse del progreso de Desarrollo. El porcentaje se descontará equitativamente de las tareas existentes.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Porcentaje a descontar (%)"
                        type="number"
                        value={rejectPercentage}
                        onChange={(e) => setRejectPercentage(e.target.value)}
                        sx={{ mb: 2 }}
                        InputProps={{ inputProps: { min: 1, max: 100 } }}
                    />
                    <TextField
                        fullWidth
                        label="Nota descriptiva del error"
                        multiline
                        rows={4}
                        value={rejectNota}
                        onChange={(e) => setRejectNota(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsRejectOpen(false)}>Cancelar</Button>
                    <Button onClick={submitQaReject} color="error" variant="contained">Confirmar Rechazo</Button>
                </DialogActions>
            </Dialog>

            {workItem && <FileManager workItem={workItem} loggedInUser={loggedInUser} />}
        </Box>
    );
};

export default WorkItemDetails;
