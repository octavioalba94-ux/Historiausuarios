import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { Card, CardContent, Typography, Box, CircularProgress, Chip, TextField, Alert, Divider } from '@mui/material';
import axios from 'axios';
import BugReportIcon from '@mui/icons-material/BugReport';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';

const QaProgressPanel = ({ loggedInUser, onFilter, refreshTrigger }) => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [progressData, setProgressData] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Allow admin and QA/Dev roles for visibility
  const allowedRoles = ['admin', 'qa'];
  const userRole = loggedInUser?.role?.toLowerCase();
  
  const hasAccess = allowedRoles.includes(userRole);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [progressRes, pendingRes] = await Promise.all([
        axios.get(`http://localhost:3001/api/reports/daily-qa-progress?date=${date}`),
        axios.get('http://localhost:3001/api/work-items/qa-ready')
      ]);
      setProgressData(progressRes.data);
      setPendingItems(pendingRes.data);
    } catch (err) {
      console.error('Error fetching QA data', err);
      setError('Error al cargar la información de QA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;
    fetchAllData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [date, hasAccess, refreshTrigger]);

  const handleManualRefresh = () => {
    fetchAllData();
  };

  const theme = useTheme();
  const isMatrix = theme.palette.mode === 'dark';

  if (!hasAccess) {
    return null;
  }

  const totalPercentage = progressData.reduce((sum, item) => sum + (Number(item.porcentaje) || 0), 0);

  return (
    <Card sx={{ 
      mb: 2, 
      backgroundColor: isMatrix ? 'rgba(0, 255, 65, 0.05)' : '#F3E5F5', 
      borderLeft: `5px solid ${isMatrix ? '#00ff41' : '#7B1FA2'}`,
      borderColor: isMatrix ? '#00ff41' : 'inherit'
    }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: isMatrix ? '#00ff41' : '#4A148C', display: 'flex', alignItems: 'center' }}>
            <BugReportIcon sx={{ mr: 1, fontSize: 20 }} /> 📊 Avance Diario de QA
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
             <IconButton size="small" onClick={handleManualRefresh} sx={{ color: '#4A148C' }} title="Refrescar">
               <RefreshIcon fontSize="small" />
             </IconButton>
             <Chip 
               label={`Avance Total: ${totalPercentage}%`} 
               color="secondary" 
               size="small" 
               sx={{ fontWeight: 'bold' }} 
             />
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

        {loading && progressData.length === 0 && pendingItems.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            <CircularProgress size={24} color="secondary" />
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {pendingItems.length === 0 && progressData.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.8rem', width: '100%', textAlign: 'center', py: 2 }}>
                  No hay historias pendientes ni avance registrado para esta fecha.
                </Typography>
              ) : (
                <>
                  {/* Chips de Pendientes (Dashed) */}
                  {pendingItems.map((item) => (
                    <Chip
                      key={`pending-${item.id}`}
                      label={`ID: ${item.azure_id || item.id} | Pendiente QA`}
                      onClick={() => onFilter && onFilter(item.azure_id?.toString() || item.id.toString(), 'id')}
                      color="secondary"
                      variant="outlined"
                      size="small"
                      sx={{ 
                        fontWeight: 'bold', 
                        backgroundColor: '#fff', 
                        cursor: 'pointer',
                        borderStyle: 'dashed'
                      }}
                      title={item.title}
                    />
                  ))}
                  
                  {/* Chips de Avance (Solid) */}
                  {progressData.map((item) => (
                    <Chip
                      key={`progress-${item.id}`}
                      label={`ID: ${item.azure_id || item.work_item_id} | ${item.porcentaje}% | ${item.usuario}`}
                      onClick={() => onFilter && onFilter(item.azure_id?.toString() || item.work_item_id.toString(), 'id')}
                      color="secondary"
                      variant="outlined"
                      size="small"
                      sx={{ 
                        fontWeight: '500', 
                        backgroundColor: isMatrix ? '#000' : '#EDE7F6', 
                        borderColor: isMatrix ? '#00ff41' : 'secondary.main',
                        cursor: 'pointer'
                      }}
                      title={item.title || item.nota}
                    />
                  ))}
                </>
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default QaProgressPanel;
