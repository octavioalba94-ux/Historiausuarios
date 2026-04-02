import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Divider, List, ListItem, ListItemText, IconButton, Button } from '@mui/material';
import { Download, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const FileManager = ({ workItem, loggedInUser }) => {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleDeleteFile = (id) => {
        if (window.confirm('¿Seguro que deseas eliminar este archivo permanentemente?')) {
            axios.delete(`http://localhost:3001/api/files/${id}`)
                .then(() => {
                    setFiles(files.filter(f => f.id !== id));
                })
                .catch(error => console.error("Error deleting file:", error));
        }
    };

    useEffect(() => {
        if (workItem) {
            axios.get(`http://localhost:3001/api/work-items/${workItem.id}/files`)
                .then(response => {
                    setFiles(response.data);
                })
                .catch(error => {
                    console.error('Error fetching files:', error);
                });
        }
    }, [workItem]);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleFileUpload = () => {
        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('usuario', loggedInUser?.username || 'Usuario');

            axios.post(`http://localhost:3001/api/work-items/${workItem.id}/files`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
                .then(response => {
                    axios.get(`http://localhost:3001/api/work-items/${workItem.id}/files`)
                        .then(res => {
                            setFiles(res.data);
                        });
                })
                .catch(error => {
                    console.error('Error uploading file:', error);
                });
        }
    };

    return (
        <Box sx={{ marginTop: 2 }}>
            <Paper sx={{ padding: 2 }}>
                <Typography variant="h6">Archivos</Typography>
                <Divider sx={{ marginY: 1 }} />
                <List>
                    {files.map(file => (
                        <ListItem key={file.id}>
                            <ListItemText
                                primary={file.file_name}
                                secondary={`Subido por ${file.usuario || 'Sistema'} el ${new Date(file.created_at).toLocaleString()}`}
                            />
                            <Box>
                                <IconButton href={`http://localhost:3001/api/files/${file.id}`} download color="primary">
                                    <Download />
                                </IconButton>
                                {loggedInUser?.role === 'admin' && (
                                    <IconButton onClick={() => handleDeleteFile(file.id)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                )}
                            </Box>
                        </ListItem>
                    ))}
                </List>
                <Divider sx={{ marginY: 1 }} />
                <Box sx={{ marginTop: 2 }}>
                    <input type="file" onChange={handleFileChange} />
                    <Button variant="contained" color="primary" onClick={handleFileUpload} sx={{ marginTop: 1 }}>
                        Subir Archivo
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default FileManager;
