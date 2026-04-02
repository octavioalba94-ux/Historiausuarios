import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Grid, Card, CardContent, 
    FormControl, InputLabel, Select, MenuItem, Button, 
    CircularProgress, Alert, useTheme 
} from '@mui/material';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import axios from 'axios';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const EfficiencyDashboard = ({ projects, users }) => {
    const theme = useTheme();
    const isMatrix = theme.palette.mode === 'dark';
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        project_id: '',
        assigned_to: ''
    });

    const fetchStats = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.project_id) params.append('project_id', filters.project_id);
        if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);

        axios.get(`http://localhost:3001/api/dashboard/stats?${params.toString()}`)
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Error al cargar estadísticas');
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStats();
    }, [filters]);

    const handleExport = () => {
        const params = new URLSearchParams();
        if (filters.project_id) params.append('project_id', filters.project_id);
        if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
        window.open(`http://localhost:3001/api/dashboard/export?${params.toString()}`);
    };

    if (loading && !stats) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    const COLORS = [isMatrix ? '#00ff41' : '#1976d2', '#ff9800', '#f44336', '#4caf50'];
    
    // Prepare data for State Pie Chart
    const stateData = stats ? Object.keys(stats.byState).map(key => ({
        name: key,
        value: stats.byState[key]
    })) : [];

    // Prepare data for Efficiency Bar Chart (Top 5 items in this view)
    const efficiencyData = stats ? stats.items.slice(0, 8).map(item => ({
        name: item.title.substring(0, 15) + '...',
        desarrollo: item.dev_progress || 0,
        qa: item.qa_progress || 0
    })) : [];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AssessmentIcon fontSize="large" color="primary" />
                    Tablero de Eficiencia y Seguimiento
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExport}
                >
                    Generar Reporte
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel>Filtrar por Área (Proyecto)</InputLabel>
                    <Select
                        value={filters.project_id}
                        label="Filtrar por Área (Proyecto)"
                        onChange={(e) => setFilters({...filters, project_id: e.target.value})}
                    >
                        <MenuItem value=""><em>Todas las áreas</em></MenuItem>
                        {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel>Filtrar por Usuario</InputLabel>
                    <Select
                        value={filters.assigned_to}
                        label="Filtrar por Usuario"
                        onChange={(e) => setFilters({...filters, assigned_to: e.target.value})}
                    >
                        <MenuItem value=""><em>Todos los usuarios</em></MenuItem>
                        {users.map(u => <MenuItem key={u.id_usuario} value={u.name}>{u.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Button variant="outlined" onClick={() => setFilters({project_id: '', assigned_to: ''})}>Limpiar</Button>
            </Paper>

            {/* Top Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: isMatrix ? 'rgba(0,255,65,0.05)' : '#e3f2fd', borderLeft: '5px solid #1976d2' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom variant="overline" sx={{ fontWeight: 'bold' }}>Total Proyectos/Tareas</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{stats?.totalItems || 0}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: isMatrix ? 'rgba(0,255,65,0.05)' : '#e8f5e9', borderLeft: '5px solid #4caf50' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircleIcon color="success" />
                                <Typography color="textSecondary" gutterBottom variant="overline" sx={{ fontWeight: 'bold' }}>Eficacia (Completados)</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{stats?.completedItems || 0}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: isMatrix ? 'rgba(0,255,65,0.05)' : '#fff3e0', borderLeft: '5px solid #ff9800' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingUpIcon color="warning" />
                                <Typography color="textSecondary" gutterBottom variant="overline" sx={{ fontWeight: 'bold' }}>% Eficacia Promedio</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{stats?.avgEfficiency || 0}%</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: isMatrix ? 'rgba(0,255,65,0.05)' : '#ffebee', borderLeft: '5px solid #f44336' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ErrorIcon color="error" />
                                <Typography color="textSecondary" gutterBottom variant="overline" sx={{ fontWeight: 'bold' }}>Tareas Atrasadas</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>{stats?.overdueItems || 0}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 3, minHeight: 400 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Avance por Tarea (Muestra)</Typography>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={efficiencyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isMatrix ? '#333' : '#eee'} />
                                <XAxis dataKey="name" fontSize={10} tick={{ fill: isMatrix ? '#00ff41' : '#666' }} />
                                <YAxis domain={[0, 100]} tick={{ fill: isMatrix ? '#00ff41' : '#666' }} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: isMatrix ? '#000' : '#fff', 
                                        borderColor: isMatrix ? '#00ff41' : '#ccc',
                                        color: isMatrix ? '#00ff41' : '#000'
                                    }} 
                                    itemStyle={{ color: isMatrix ? '#00ff41' : '#000' }}
                                />
                                <Legend />
                                <Bar dataKey="desarrollo" fill="#1976d2" name="Desarrollo %" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="qa" fill="#4caf50" name="QA %" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 3, minHeight: 400 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Distribución por Estado</Typography>
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={stateData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {stateData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EfficiencyDashboard;
