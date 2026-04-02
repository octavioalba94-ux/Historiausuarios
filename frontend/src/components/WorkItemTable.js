import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  Box,
  Typography,
} from '@mui/material';
import WorkItemRow from './WorkItemRow';

const WorkItemTable = ({ workItems, onOpenEdit, onDelete, loggedInUser, onProgressUpdate }) => {
  const theme = useTheme();
  const isMatrix = theme.palette.mode === 'dark';
  const [orderBy, setOrderBy] = useState('id');
  const [order, setOrder] = useState('asc');

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getSortedWorkItems = () => {
    const sorted = [...workItems].sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Manejar valores nulos
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Comparación numérica o string
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Comparación de strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    return sorted;
  };

  const sortedWorkItems = getSortedWorkItems();

  const getRowColor = (item) => {
    if (isMatrix) return 'transparent'; // Matrix uses black background with green text

    const dev = Number(item.dev_progress) || 0;
    const qa = Number(item.qa_progress) || 0;
    const state = item.state?.toLowerCase();

    // Prioridad 1: Completado/Cerrado (Verde o Gris según prefieras)
    if (['completed', 'closed', 'done', 'completado', 'cerrado'].includes(state)) {
      return '#F5F5F5'; // Gris claro para terminados
    }

    // Prioridad 2: Listo para VoBo (Verde)
    if (dev >= 100 && qa >= 100) return '#C8E6C9'; 

    // Prioridad 3: QA en Proceso (Morado - solicitado por usuario)
    if (dev >= 100 && qa > 0 && qa < 100) return '#E1BEE7'; 

    // Prioridad 4: Listo para QA (Púrpura claro)
    if (dev >= 100 && qa === 0) return '#F3E5F5';

    // Prioridad 5: Desarrollo en Proceso (Azul)
    if (dev > 0 && dev < 100) return '#E3F2FD';

    return '#FFFFFF';
  };

  return (
    <>
      {workItems.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No hay Work Items para mostrar
          </Typography>
        </Box>
      ) : (
        <TableContainer 
          component={Paper} 
          elevation={0}
          sx={{ 
            borderRadius: 4, 
            overflow: 'hidden',
            border: `1px solid ${isMatrix ? 'rgba(0, 255, 65, 0.2)' : 'rgba(0, 0, 0, 0.05)'}`,
            backgroundColor: isMatrix ? 'rgba(0, 0, 0, 0.2)' : '#fff'
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  bgcolor: isMatrix ? '#000' : '#f8f9fa', 
                  color: isMatrix ? '#00ff41' : 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  borderBottom: `2px solid ${isMatrix ? '#00ff41' : 'rgba(0,0,0,0.05)'}`
                }} />
                {[
                  { id: 'azure_id', label: 'ID', width: '80px' },
                  { id: 'title', label: 'Título', minWidth: '250px' },
                  { id: 'state', label: 'Estado', width: '120px' },
                  { id: 'dev_progress', label: 'Dev %', width: '80px' },
                  { id: 'qa_progress', label: 'QA %', width: '80px' },
                  { id: 'priority', label: 'Prior.', width: '80px' },
                  { id: 'assigned_to', label: 'Asignado', minWidth: '150px' },
                  { id: 'created_date', label: 'Creado', width: '120px' },
                  { id: 'due_date', label: 'Límite', width: '120px' }
                ].map((col) => (
                  <TableCell 
                    key={col.id}
                    sx={{ 
                      bgcolor: isMatrix ? '#000' : '#f8f9fa', 
                      color: isMatrix ? '#00ff41' : 'text.secondary',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      width: col.width,
                      minWidth: col.minWidth,
                      borderBottom: `2px solid ${isMatrix ? '#00ff41' : 'rgba(0,0,0,0.05)'}`
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleRequestSort(col.id)}
                      sx={{ 
                        color: `${isMatrix ? '#00ff41' : 'inherit'} !important`,
                        '& .MuiTableSortLabel-icon': { color: `${isMatrix ? '#00ff41' : 'inherit'} !important` }
                      }}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                {/* Solicitante y Tester (Columnas Secundarias) */}
                {[
                  { id: 'solicitante', label: 'Solicitante' },
                  { id: 'nombreTester', label: 'Tester' }
                ].map((col) => (
                  <TableCell 
                    key={col.id}
                    sx={{ 
                      bgcolor: isMatrix ? '#000' : '#f8f9fa', 
                      color: isMatrix ? '#00ff41' : 'text.secondary',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      borderBottom: `2px solid ${isMatrix ? '#00ff41' : 'rgba(0,0,0,0.05)'}`
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleRequestSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell 
                  sx={{ 
                    bgcolor: isMatrix ? '#000' : '#f8f9fa', 
                    color: isMatrix ? '#00ff41' : 'text.secondary',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    borderBottom: `2px solid ${isMatrix ? '#00ff41' : 'rgba(0,0,0,0.05)'}`
                  }}
                >
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedWorkItems.map((workItem) => (
                <WorkItemRow
                  key={workItem.id}
                  workItem={workItem}
                  onOpenEdit={onOpenEdit}
                  onDelete={onDelete}
                  loggedInUser={loggedInUser}
                  backgroundColor={getRowColor(workItem)}
                  onProgressUpdate={onProgressUpdate}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default WorkItemTable;
