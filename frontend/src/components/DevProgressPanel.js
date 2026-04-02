import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { Card, CardContent, Typography, Box, CircularProgress, Chip, TextField, Alert } from '@mui/material';
import axios from 'axios';
import CodeIcon from '@mui/icons-material/Code';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';

const DevProgressPanel = ({ loggedInUser, onFilter, refreshTrigger }) => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only allow admin and desarrollo roles
  const allowedRoles = ['admin', 'desarrollo', 'developer', 'dev', 'desarrollador'];
  const userRole = loggedInUser?.role?.toLowerCase();
  
  const hasAccess = allowedRoles.includes(userRole);

  useEffect(() => {
    if (!hasAccess) return;

    const fetchProgress = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`http://localhost:3001/api/reports/daily-dev-progress?date=${date}`);
        setProgressData(response.data);
      } catch (err) {
        console.error('Error fetching dev progress', err);
        setError('Error al cargar el avance diario de desarrollo.');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();

    // Auto-refresh every 30 seconds if looking at "today"
    const today = new Date().toISOString().split('T')[0];
    let interval;
    if (date === today) {
      interval = setInterval(fetchProgress, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [date, hasAccess, refreshTrigger]);

  const handleManualRefresh = () => {
    // Definimos fetchProgress fuera del useEffect para poder llamarla manualmente
    const fetchProgress = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`http://localhost:3001/api/reports/daily-dev-progress?date=${date}`);
        setProgressData(response.data);
      } catch (err) {
        console.error('Error fetching dev progress', err);
        setError('Error al cargar el avance diario de desarrollo.');
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  };

  const theme = useTheme();
  const isMatrix = theme.palette.mode === 'dark';

  if (!hasAccess) {
    return null;
  }

  // Calculate total progress percentage for the day if needed, or just show list
  const totalPercentage = progressData.reduce((sum, item) => sum + (Number(item.porcentaje) || 0), 0);

  return (
    <Card sx={{ 
      mb: 2, 
      backgroundColor: isMatrix ? 'rgba(0, 255, 65, 0.05)' : '#E3F2FD', 
      borderLeft: `5px solid ${isMatrix ? '#00ff41' : '#1565C0'}`,
      borderColor: isMatrix ? '#00ff41' : 'inherit'
    }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: isMatrix ? '#00ff41' : '#0D47A1', display: 'flex', alignItems: 'center' }}>
            <CodeIcon sx={{ mr: 1, fontSize: 20 }} /> Avance Diario de Desarrollo
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
             <TextField
               type="date"
               size="small"
               value={date}
               onChange={(e) => setDate(e.target.value)}
               sx={{ backgroundColor: isMatrix ? '#0d0d0d' : '#fff', borderRadius: 1 }}
               inputProps={{
                 max: new Date().toISOString().split('T')[0]
               }}
             />
             <IconButton size="small" onClick={handleManualRefresh} sx={{ color: '#0D47A1' }} title="Refrescar">
               <RefreshIcon fontSize="small" />
             </IconButton>
             <Chip 
               label={`Avance Total: ${totalPercentage}%`} 
               color="primary" 
               size="small" 
               sx={{ fontWeight: 'bold' }} 
             />
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            <CircularProgress size={24} />
          </Box>
        ) : progressData.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No se registró avance de desarrollo para esta fecha.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {progressData.map((item) => (
              <Chip
                key={item.id}
                label={`ID: ${item.azure_id || item.work_item_id} | ${item.porcentaje}% | Usuario: ${item.usuario}`}
                onClick={() => onFilter && onFilter(item.azure_id?.toString() || item.work_item_id.toString(), 'id')}
                color="primary"
                variant="outlined"
                sx={{ 
                  fontWeight: '500', 
                  backgroundColor: isMatrix ? '#000' : '#fff', 
                  borderColor: isMatrix ? '#00ff41' : 'primary.main',
                  cursor: 'pointer',
                  '& .MuiChip-label': { px: 1.5 }
                }}
                title={item.title}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DevProgressPanel;
