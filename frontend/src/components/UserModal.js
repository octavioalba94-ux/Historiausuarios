import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';

const UserModal = ({ user, onSave, onClose }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('desarrollador');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setRole(user.role || 'desarrollador');
            setName(user.name || '');
            setEmail(user.email || '');
        } else {
            setUsername('');
            setRole('desarrollador');
            setPassword('');
            setName('');
            setEmail('');
        }
    }, [user]);

    const handleSave = () => {
        const userData = { ...user, username, role, name, email };
        if (password) {
            userData.password = password;
        }
        onSave(userData);
    };

    return (
        <Dialog open={true} onClose={onClose}>
            <DialogTitle>{user ? 'Editar Usuario' : 'Añadir Usuario'}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    id="username"
                    label="Nombre de Usuario"
                    type="text"
                    fullWidth
                    variant="standard"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                    margin="dense"
                    id="name"
                    label="Nombre"
                    type="text"
                    fullWidth
                    variant="standard"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <TextField
                    margin="dense"
                    id="email"
                    label="Correo Electrónico"
                    type="email"
                    fullWidth
                    variant="standard"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    margin="dense"
                    id="password"
                    label="Contraseña"
                    type="password"
                    fullWidth
                    variant="standard"
                    placeholder={user ? 'Dejar en blanco para no cambiar' : ''}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <FormControl fullWidth margin="dense" variant="standard">
                    <InputLabel id="role-select-label">Rol</InputLabel>
                    <Select
                        labelId="role-select-label"
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        label="Rol"
                    >
                        <MenuItem value="desarrollador">Desarrollador</MenuItem>
                        <MenuItem value="QA">QA</MenuItem>
                        <MenuItem value="admin">Administrador</MenuItem>
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserModal;
