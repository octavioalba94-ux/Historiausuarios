import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, TableSortLabel, 
    Link, CircularProgress, IconButton, Alert, TextField
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const VoboManagement = () => {
    const theme = useTheme();
    const isMatrix = theme.palette.mode === 'dark';
    const navigate = useNavigate();
    
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [orderBy, setOrderBy] = useState('vobo_fecha');
    const [order, setOrder] = useState('desc');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchVoboCompleted = () => {
        setLoading(true);
        axios.get('http://localhost:3001/api/work-items/vobo-completed')
            .then(res => {
                setItems(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Error al cargar historias con VoBo');
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchVoboCompleted();
    }, []);

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const getSortedItems = () => {
        let filtered = items;
        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            filtered = items.filter(item => 
                String(item.azure_id || '').includes(lowSearch) || 
                String(item.id || '').includes(lowSearch) ||
                (item.title || '').toLowerCase().includes(lowSearch) ||
                (item.vobo_usuario || '').toLowerCase().includes(lowSearch)
            );
        }

        return [...filtered].sort((a, b) => {
            let aVal = a[orderBy] || '';
            let bVal = b[orderBy] || '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            
            if (order === 'asc') return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
        });
    };

    const sortedItems = getSortedItems();

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <IconButton onClick={() => navigate('/')} color="primary">
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    ✅ Historias con VoBo Finalizado
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ mb: 3 }}>
                <TextField 
                    fullWidth 
                    label="Buscar en historial de VoBo (ID, Título, Usuario)..." 
                    variant="outlined" 
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ backgroundColor: isMatrix ? 'rgba(0,0,0,0.3)' : '#fff' }}
                />
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: isMatrix ? '#000' : '#f5f5f5', color: isMatrix ? '#00ff41' : 'inherit' }}>
                                <TableSortLabel active={orderBy === 'azure_id'} direction={orderBy === 'azure_id' ? order : 'asc'} onClick={() => handleRequestSort('azure_id')}>
                                    ID
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: isMatrix ? '#000' : '#f5f5f5', color: isMatrix ? '#00ff41' : 'inherit' }}>
                                <TableSortLabel active={orderBy === 'title'} direction={orderBy === 'title' ? order : 'asc'} onClick={() => handleRequestSort('title')}>
                                    Título
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: isMatrix ? '#000' : '#f5f5f5', color: isMatrix ? '#00ff41' : 'inherit' }}>
                                <TableSortLabel active={orderBy === 'vobo_fecha'} direction={orderBy === 'vobo_fecha' ? order : 'asc'} onClick={() => handleRequestSort('vobo_fecha')}>
                                    Fecha VoBo
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: isMatrix ? '#000' : '#f5f5f5', color: isMatrix ? '#00ff41' : 'inherit' }}>
                                <TableSortLabel active={orderBy === 'vobo_usuario'} direction={orderBy === 'vobo_usuario' ? order : 'asc'} onClick={() => handleRequestSort('vobo_usuario')}>
                                    Usuario Admin
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: isMatrix ? '#000' : '#f5f5f5', color: isMatrix ? '#00ff41' : 'inherit' }}>
                                Notas de VoBo
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: isMatrix ? '#000' : '#f5f5f5', color: isMatrix ? '#00ff41' : 'inherit' }}>
                                Documento
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedItems.map((item) => (
                            <TableRow key={item.id} hover sx={{ 
                                backgroundColor: isMatrix ? 'transparent' : 'inherit',
                                borderBottom: isMatrix ? '1px solid #00ff41' : 'none'
                            }}>
                                <TableCell sx={{ color: isMatrix ? '#00ff41' : 'inherit' }}>{item.azure_id || item.id}</TableCell>
                                <TableCell sx={{ color: isMatrix ? '#00ff41' : 'inherit', fontWeight: '500' }}>{item.title}</TableCell>
                                <TableCell sx={{ color: isMatrix ? '#00ff41' : 'inherit' }}>{new Date(item.vobo_fecha).toLocaleString()}</TableCell>
                                <TableCell sx={{ color: isMatrix ? '#00ff41' : 'inherit' }}>{item.vobo_usuario}</TableCell>
                                <TableCell sx={{ color: isMatrix ? '#00ff41' : 'inherit', maxWidth: '300px' }}>{item.vobo_notas}</TableCell>
                                <TableCell>
                                    {item.vobo_file_path ? (
                                        <Link 
                                            href={`http://localhost:3001/${item.vobo_file_path}`} 
                                            download={item.vobo_file_name}
                                            sx={{ color: isMatrix ? '#00ff41' : '#1976D2', textDecoration: 'underline' }}
                                        >
                                            📄 Descargar
                                        </Link>
                                    ) : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default VoboManagement;
