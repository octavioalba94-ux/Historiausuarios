import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const ReportModal = ({ open, onClose, users, loggedInUser }) => {
    const isAdmin = loggedInUser?.role === 'admin';
    const today = new Date().toISOString().split('T')[0];
    
    // Default to today
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    
    // Default to empty for admin so they can download all, or logged in user for others
    const [selectedUser, setSelectedUser] = useState(isAdmin ? '' : (loggedInUser?.username || ''));
    const [selectedTaskId, setSelectedTaskId] = useState('');

    const handleDownload = () => {
        // Añadimos un timestamp para evitar que el navegador guarde en caché el archivo y garantice la descarga en tiempo real
        let url = `http://localhost:3001/api/reports/daily-evidence?startDate=${startDate}&endDate=${endDate}&t=${Date.now()}`;
        
        if (selectedUser) {
            url += `&user=${encodeURIComponent(selectedUser)}`;
        }
        if (isAdmin && selectedTaskId) {
            url += `&taskId=${encodeURIComponent(selectedTaskId)}`;
        }
        
        window.open(url, '_blank');
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Reporte de Evidencias Diarias</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
                    {isAdmin 
                        ? "Selecciona un rango de fechas y filtros para descargar el reporte de procesos, evidencias y notas."
                        : "Selecciona una fecha para descargar el reporte de tus procesos, evidencias y notas registras en ese día."
                    }
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label={isAdmin ? "Fecha Inicio" : "Fecha del Reporte"}
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                if (!isAdmin) setEndDate(e.target.value);
                            }}
                        />
                        {isAdmin && (
                            <TextField
                                label="Fecha Fin"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        )}
                    </Box>

                    <FormControl fullWidth variant="outlined">
                        <InputLabel shrink id="user-select-label">
                            Usuario
                        </InputLabel>
                        <Select
                            labelId="user-select-label"
                            label="Usuario"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            disabled={!isAdmin}
                            displayEmpty
                        >
                            {isAdmin && <MenuItem value=""><em>Todos los usuarios</em></MenuItem>}
                            {!isAdmin && <MenuItem value={loggedInUser?.username}>{loggedInUser?.name || loggedInUser?.username}</MenuItem>}
                            {isAdmin && users && users.map((u) => (
                                <MenuItem key={u.id_usuario} value={u.username}>
                                    {u.name || u.username} ({u.role})
                                </MenuItem>
                            ))}
                        </Select>
                        {isAdmin && (
                            <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary', ml: 1.5 }}>
                                Deja en blanco para descargar todo el avance del periodo.
                            </Typography>
                        )}
                    </FormControl>

                    {isAdmin && (
                        <TextField
                            label="ID de Tarea / Azure ID (Opcional)"
                            placeholder="Ej. 84027"
                            fullWidth
                            value={selectedTaskId}
                            onChange={(e) => setSelectedTaskId(e.target.value)}
                            helperText="Filtra las evidencias de un Work Item específico."
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button onClick={onClose}>Cancelar</Button>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleDownload}
                    startIcon={<DownloadIcon />}
                >
                    Descargar CSV
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReportModal;
