import React, { useState } from 'react';
import UserTable from './UserTable';
import UserModal from './UserModal';
import { Container, Typography, Button, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const UserManagement = ({ users, fetchUsers }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const handleAddUser = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (userId) => {
        await fetch(`http://localhost:3001/api/users/${userId}`, {
            method: 'DELETE',
        });
        fetchUsers();
    };

    const handleSaveUser = async (user) => {
        if (user.id_usuario) {
            await fetch(`http://localhost:3001/api/users/${user.id_usuario}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user),
            });
        } else {
            await fetch('http://localhost:3001/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user),
            });
        }
        fetchUsers();
        setIsModalOpen(false);
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h1">
                    Gestión de Usuarios
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddUser}
                >
                    Añadir Usuario
                </Button>
            </Box>
            <UserTable
                users={users}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
            />
            {isModalOpen && (
                <UserModal
                    user={selectedUser}
                    onSave={handleSaveUser}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </Container>
    );
};

export default UserManagement;
