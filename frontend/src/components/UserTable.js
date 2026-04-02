import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const UserTable = ({ users, onEdit, onDelete }) => {
    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Nombre de Usuario</TableCell>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Correo Electrónico</TableCell>
                        <TableCell>Rol</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.map((user) => (
                        <TableRow
                            key={user.id_usuario}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                            <TableCell component="th" scope="row">
                                {user.id_usuario}
                            </TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.role}</TableCell>
                            <TableCell align="right">
                                <Tooltip title="Editar">
                                    <IconButton onClick={() => onEdit(user)}>
                                        <EditIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Eliminar">
                                    <IconButton onClick={() => onDelete(user.id_usuario)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default UserTable;
