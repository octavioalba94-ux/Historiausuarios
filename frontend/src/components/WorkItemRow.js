import React, { useState } from 'react';
import { TableRow, TableCell, Chip, IconButton, Menu, MenuItem, ListItemIcon, Typography, Collapse, Box, Link } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { MoreVert, Edit, Delete, KeyboardArrowDown, KeyboardArrowUp, Visibility } from '@mui/icons-material';
import WorkItemDetails from './WorkItemDetails';

const WorkItemRow = ({ workItem, onOpenEdit, onDelete, loggedInUser, backgroundColor, onProgressUpdate }) => {
  const theme = useTheme();
  const isMatrix = theme.palette.mode === 'dark';
  const [anchorEl, setAnchorEl] = useState(null);
  const [open, setOpen] = useState(false);
  const menuOpen = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 1:
        return 'error';
      case 2:
        return 'warning';
      case 3:
        return 'success';
      case 4:
        return 'info';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 1:
        return '🔴 Crítica';
      case 2:
        return '🟠 Alta';
      case 3:
        return '🟢 Media';
      case 4:
        return '🔵 Baja';
      default:
        return 'Normal';
    }
  };

  const getStateLabel = (state) => {
    const labels = {
      'new': { label: 'Nuevo', variant: 'outlined' },
      'active': { label: 'En Progreso', variant: 'filled' },
      'in progress': { label: 'En Progreso', variant: 'filled' },
      'resolved': { label: 'Resuelto', variant: 'filled' },
      'completed': { label: 'Completado', variant: 'filled' },
      'closed': { label: 'Cerrado', variant: 'filled' },
      'done': { label: 'Hecho', variant: 'filled' },
    };
    return labels[state?.toLowerCase()] || { label: state, variant: 'outlined' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const stateInfo = getStateLabel(workItem.state);

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: backgroundColor || '#FAFAFA',
          '&:hover': {
            backgroundColor: isMatrix ? 'rgba(0, 255, 65, 0.05)' : 'rgba(25, 118, 210, 0.04)',
          },
          borderLeft: (workItem.due_date && new Date(workItem.due_date) < new Date() && workItem.vobo_status !== 'approved')
            ? `4px solid #d32f2f`
            : '4px solid transparent'
        }}
      >
        <TableCell sx={{ width: '40px' }}>
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ color: isMatrix ? '#00ff41' : 'primary.main' }}
          >
            {open ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
          </IconButton>
        </TableCell>

        <TableCell sx={{ fontWeight: 700, color: isMatrix ? '#00ff41' : 'primary.main', fontSize: '0.85rem' }}>
          #{workItem.azure_id || workItem.id}
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}>
            {workItem.title}
          </Typography>
        </TableCell>

        <TableCell>
          <Chip
            label={stateInfo.label}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.65rem',
              borderRadius: 1,
              height: 20,
              textTransform: 'uppercase',
              bgcolor: isMatrix ? 'rgba(0,255,65,0.1)' : 'rgba(0,0,0,0.05)'
            }}
          />
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 800, color: (workItem.dev_progress >= 100) ? 'success.main' : 'warning.main', fontSize: '0.8rem' }}>
            {workItem.dev_progress || 0}%
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 800, color: (workItem.qa_progress >= 100) ? 'success.main' : 'secondary.main', fontSize: '0.8rem' }}>
            {workItem.qa_progress || 0}%
          </Typography>
        </TableCell>

        <TableCell>
          <Chip
            label={getPriorityLabel(workItem.priority).replace(/[^\w\s]/gi, '').trim()}
            color={getPriorityColor(workItem.priority)}
            size="small"
            sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20, borderRadius: 1 }}
          />
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
            {workItem.assigned_to || '-'}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {formatDate(workItem.created_date)}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography 
            variant="caption" 
            sx={{ 
              fontWeight: 'bold',
              color: (workItem.due_date && new Date(workItem.due_date) < new Date() && workItem.vobo_status !== 'approved') 
                ? '#d32f2f' 
                : 'text.secondary'
            }}
          >
            {formatDate(workItem.due_date)}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="caption">{workItem.solicitante || '-'}</Typography>
        </TableCell>

        <TableCell>
          <Typography variant="caption">{workItem.nombreTester || '-'}</Typography>
        </TableCell>

        <TableCell>
           <Box sx={{ display: 'flex', gap: 0.5 }}>
             <IconButton 
               size="small" 
               onClick={() => onOpenEdit(workItem)}
               title="Editar"
               sx={{ color: isMatrix ? '#00ff41' : 'primary.main' }}
             >
               <Edit fontSize="small" />
             </IconButton>
             
             {workItem.urlEvidencias && (
               <IconButton 
                 size="small" 
                 component="a" 
                 href={workItem.urlEvidencias.startsWith('http') ? workItem.urlEvidencias : `https://${workItem.urlEvidencias}`}
                 target="_blank"
                 title="Ver Evidencias"
               >
                 <Visibility fontSize="small" />
               </IconButton>
             )}
           </Box>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={13}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ 
              py: 3, 
              px: { xs: 2, md: 6 }, 
              backgroundColor: isMatrix ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)',
              borderBottom: `2px solid ${isMatrix ? '#00ff41' : 'rgba(0,0,0,0.05)'}`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <WorkItemDetails 
                workItem={workItem} 
                loggedInUser={loggedInUser} 
                onProgressUpdate={onProgressUpdate}
              />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};



export default WorkItemRow;
