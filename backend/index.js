import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import { Parser } from 'json2csv';
import db from './database.js';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';

import fs from 'fs';

const app = express();
const port = 3001;

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// Cache de búsquedas por ID (in-memory)
const searchCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora en milisegundos

// Función para limpiar caché expirado
const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
};

// Limpiar caché cada 30 minutos
setInterval(cleanExpiredCache, 30 * 60 * 1000);

app.use('/uploads', express.static('uploads'));

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello World!')
});

// Work Items API
app.get('/api/work-items', (req, res) => {
  db.all("SELECT * FROM work_items", [], (err, rows) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    const workItems = rows.map(item => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM work_item_notes WHERE work_item_id = ?", [item.id], (err, notes) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ ...item, notes });
                }
            });
        });
    });
    Promise.all(workItems)
        .then(results => {
            res.json(results);
        })
        .catch(err => {
            res.status(500).json({ "error": err.message });
        });
  });
});

// Obtener Work Items por proyecto específico con filtro de fechas
app.get('/api/projects/:projectId/work-items', (req, res) => {
  const { projectId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  console.log('\n=== Solicitud de Work Items ===');
  console.log('Project ID:', projectId);
  console.log('Limit:', limit, 'Offset:', offset);

  try {
    // Verificar si el proyecto existe
    db.get('SELECT * FROM proyectos WHERE id = ?', [projectId], (err, project) => {
      if (err) {
        console.error('Error verificando proyecto:', err);
        return res.status(500).json({ "error": `Error verificando proyecto: ${err.message}` });
      }

      if (!project) {
        console.warn(`Proyecto ${projectId} no encontrado`);
        return res.json({ items: [], total: 0 });
      }

      console.log('Proyecto encontrado:', project.name);

      // Contar total
      let countQuery = "SELECT COUNT(*) as total FROM work_items WHERE (project_id = ? OR azure_project_id = ?)";
      let countParams = [projectId, projectId];

      db.get(countQuery, countParams, (err, countRow) => {
        if (err) {
          console.error('Error contando items:', err);
          return res.status(500).json({ "error": `Error contando items: ${err.message}` });
        }

        const total = countRow?.total || 0;

        // Obtener items paginados - solo campos necesarios para la tabla
        let query = `SELECT w.id, w.azure_id, w.title, w.state, w.priority, w.assigned_to, w.created_date, w.due_date, 
                           w.solicitante, w.nombreTester, w.urlEvidencias,
                           COALESCE(SUM(CASE WHEN m.tipo = 'desarrollo' THEN m.porcentaje ELSE 0 END), 0) AS dev_progress,
                           COALESCE(SUM(CASE WHEN m.tipo = 'qa' THEN m.porcentaje ELSE 0 END), 0) AS qa_progress
                     FROM work_items w
                     LEFT JOIN mini_tasks m ON w.id = m.work_item_id
                     WHERE (w.project_id = ? OR w.azure_project_id = ?) 
                     GROUP BY w.id
                     ORDER BY w.created_date DESC 
                     LIMIT ? OFFSET ?`;
        let params = [projectId, projectId, parseInt(limit), parseInt(offset)];

        db.all(query, params, (err, rows) => {
          if (err) {
            console.error('Error en consulta SQL:', err);
            return res.status(500).json({ 
              "error": `Error en consulta SQL: ${err.message}`
            });
          }

          console.log(`✓ Retornando ${rows.length} items (offset ${offset})`);
          res.json({
            items: rows || [],
            total: total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + parseInt(limit)) < total
          });
        });
      });
    });
  } catch (error) {
    console.error('Error inesperado:', error);
    res.status(500).json({ "error": `Error inesperado: ${error.message}` });
  }
});

// Buscar Work Items por ID de Azure (Soporta múltiples IDs separados por coma)
app.get('/api/work-items/search/:azureIds', (req, res) => {
  // ... (previous content kept) ...
  const { azureIds } = req.params;
  
  // Verificar caché primero
  if (searchCache.has(azureIds)) {
    const cached = searchCache.get(azureIds);
    console.log(`✓ Resultado del caché para IDs: ${azureIds}`);
    res.set('X-Cache', 'HIT');
    res.set('X-Cache-Age', Math.round((Date.now() - cached.timestamp) / 1000));
    if (cached.error) {
       return res.status(404).json({ "error": cached.error });
    }
    return res.json(cached.data);
  }
  
  // Separar los IDs por comas
  const idsArray = azureIds.split(',').map(id => id.trim()).filter(id => id);
  if (idsArray.length === 0) {
      return res.json([]);
  }

  // No está en caché, buscar en BD
  // Construimos query para IN (...) tanto para azure_id como para id numérico
  const placeholders = idsArray.map(() => '?').join(',');
  const query = `
    SELECT w.id, w.azure_id, w.title, w.state, w.priority, w.assigned_to, w.created_date, w.solicitante, w.nombreTester, w.urlEvidencias,
           COALESCE(SUM(CASE WHEN m.tipo = 'desarrollo' THEN m.porcentaje ELSE 0 END), 0) AS dev_progress,
           COALESCE(SUM(CASE WHEN m.tipo = 'qa' THEN m.porcentaje ELSE 0 END), 0) AS qa_progress
    FROM work_items w
    LEFT JOIN mini_tasks m ON w.id = m.work_item_id
    WHERE w.azure_id IN (${placeholders}) OR w.id IN (${placeholders})
    GROUP BY w.id
  `;
  const params = [...idsArray, ...idsArray];

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    
    if (rows && rows.length > 0) {
      searchCache.set(azureIds, { data: rows, timestamp: Date.now() });
      console.log(`⚡ Encontrados ${rows.length} items para: ${azureIds}`);
      res.set('X-Cache', 'MISS');
      return res.json(rows);
    } else {
      searchCache.set(azureIds, { error: 'Not found', timestamp: Date.now() });
      res.set('X-Cache', 'MISS');
      return res.status(404).json({ "error": "Work items not found" });
    }
  });
});

// NUEVO: Buscar Work Items por palabra clave (ID, Usuario, Título) - Alta velocidad
app.get('/api/work-items/search-keyword', (req, res) => {
  const { q } = req.query;
  console.log(`🔍 Búsqueda por palabra clave: "${q}"`);

  if (!q || q.trim() === '') {
    return res.json([]);
  }

  const term = `%${q.trim()}%`;
  
  // Query optimizada para buscar en múltiples campos
  // Limitamos a 50 para máxima velocidad de respuesta
  const query = `
    SELECT w.id, w.azure_id, w.title, w.state, w.priority, w.assigned_to, w.created_date, w.due_date,
           w.solicitante, w.nombreTester, w.urlEvidencias,
           COALESCE(SUM(CASE WHEN m.tipo = 'desarrollo' THEN m.porcentaje ELSE 0 END), 0) AS dev_progress,
           COALESCE(SUM(CASE WHEN m.tipo = 'qa' THEN m.porcentaje ELSE 0 END), 0) AS qa_progress
    FROM work_items w
    LEFT JOIN mini_tasks m ON w.id = m.work_item_id
    WHERE w.azure_id LIKE ? 
       OR w.id LIKE ? 
       OR w.assigned_to LIKE ? 
       OR w.solicitante LIKE ? 
       OR w.title LIKE ?
       OR w.nombreTester LIKE ?
    GROUP BY w.id
    ORDER BY w.created_date DESC
    LIMIT 100
  `;
  
  const params = [term, term, term, term, term, term];

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('❌ Error en búsqueda por palabra clave:', err.message);
      return res.status(500).json({ "error": err.message });
    }
    console.log(`✓ Retornando ${rows?.length || 0} resultados para: ${q}`);
    res.json(rows || []);
  });
});

app.post('/api/work-items', async (req, res) => {
  const newWorkItem = req.body;
  const { project_id } = newWorkItem;

  // Si no hay azure_id, verificamos si el proyecto es interno para generar uno
  if (!newWorkItem.azure_id && project_id) {
    db.get('SELECT type FROM proyectos WHERE id = ?', [project_id], (err, project) => {
      if (err) return res.status(500).json({ "error": err.message });
      
      if (project && project.type === 'internal') {
        // Generar un ID interno basado en el siguiente ID disponible
        db.get('SELECT MAX(id) as maxId FROM work_items', [], (err, row) => {
          const nextId = (row?.maxId || 0) + 1;
          const generatedId = `INT-${nextId.toString().padStart(4, '0')}`;
          insertWorkItem(generatedId);
        });
      } else {
        insertWorkItem(null);
      }
    });
  } else {
    insertWorkItem(newWorkItem.azure_id || null);
  }

  function insertWorkItem(azureId) {
    const sql = 'INSERT INTO work_items (azure_id, title, state, description, priority, acceptance_criteria, assigned_to, created_date, changed_date, project_id, azure_project_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const params = [
      azureId, 
      newWorkItem.title, 
      newWorkItem.state || 'New', 
      newWorkItem.description || '', 
      newWorkItem.priority || 2, 
      newWorkItem.acceptance_criteria || '', 
      newWorkItem.assigned_to || '', 
      newWorkItem.created_date || new Date().toISOString(), 
      newWorkItem.changed_date || new Date().toISOString(),
      project_id || null,
      newWorkItem.azure_project_id || null,
      newWorkItem.due_date || null
    ];

    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error inserting work item:', err.message);
        res.status(400).json({ "error": err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, ...newWorkItem, azure_id: azureId });
    });
  }
});

app.put('/api/work-items/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  // No actualices el ID
  delete updatedData.id;
  delete updatedData.notes;

  const fields = Object.keys(updatedData).map(field => `${field} = ?`).join(', ');
  const values = [...Object.values(updatedData), id];
  
  const sql = `UPDATE work_items SET ${fields} WHERE id = ?`;

  db.run(sql, values, function(err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({ message: "Work item updated successfully" });
  });
});

app.delete('/api/work-items/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM work_items WHERE id = ?', id, function(err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.status(204).send();
  });
});

app.get('/api/work-items/:id/notes', (req, res) => {
    const { id } = req.params;
    db.all("SELECT * FROM work_item_notes WHERE work_item_id = ?", [id], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/work-items/:id/notes', upload.single('file'), (req, res) => {
    console.log('Request Body:', req.body);
    console.log('Request File:', req.file);
    const { id } = req.params;
    const { content, user, type } = req.body;
    const file = req.file;

    if (file) {
        const sql = 'INSERT INTO work_item_notes (work_item_id, type, content, format, user, created_at, file_path, file_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const params = [id, 'attachment', content, file.mimetype, user, new Date().toISOString(), file.path, file.originalname];
        db.run(sql, params, function (err) {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            res.status(201).json({ id: this.lastID });
        });
    } else {
        const sql = 'INSERT INTO work_item_notes (work_item_id, type, content, user, created_at) VALUES (?, ?, ?, ?, ?)';
        const params = [id, type, content, user, new Date().toISOString()];
        db.run(sql, params, function (err) {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            res.status(201).json({ id: this.lastID });
        });
    }
});

app.get('/api/attachments/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM work_item_notes WHERE id = ? AND type = 'attachment'", [id], (err, row) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        if (row) {
            res.download(row.file_path, row.file_name);
        } else {
            res.status(404).json({ "error": "Attachment not found" });
        }
    });
});

// Files API
app.get('/api/work-items/:id/files', (req, res) => {
    const { id } = req.params;
    db.all("SELECT * FROM files WHERE work_item_id = ?", [id], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/work-items/:id/files', upload.single('file'), (req, res) => {
    const { id } = req.params;
    const file = req.file;

    if (file) {
        const sql = 'INSERT INTO files (work_item_id, file_name, file_path, created_at) VALUES (?, ?, ?, ?)';
        const params = [id, file.originalname, file.path, new Date().toISOString()];
        db.run(sql, params, function (err) {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            res.status(201).json({ id: this.lastID });
        });
    } else {
        res.status(400).json({ "error": "No file uploaded" });
    }
});

app.get('/api/files/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM files WHERE id = ?", [id], (err, row) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        if (row) {
            res.download(row.file_path, row.file_name);
        } else {
            res.status(404).json({ "error": "File not found" });
        }
    });
});




// Mini-tasks API
app.get('/api/work-items/:id/mini-tasks', (req, res) => {
    const { id } = req.params;
    db.all("SELECT * FROM mini_tasks WHERE work_item_id = ? ORDER BY fecha_creacion ASC", [id], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/work-items/:id/mini-tasks', (req, res) => {
    const { id } = req.params;
    const { titulo, nota, porcentaje, tipo, usuario } = req.body;
    const taskTipo = tipo || 'desarrollo';
    
    const sql = 'INSERT INTO mini_tasks (work_item_id, titulo, nota, porcentaje, fecha_creacion, tipo, usuario) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const params = [id, titulo, nota, porcentaje, new Date().toISOString(), taskTipo, usuario || 'Sistema'];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, work_item_id: id, titulo, nota, porcentaje, fecha_creacion: params[4], tipo: taskTipo, usuario: params[6] });
    });
});

app.put('/api/mini-tasks/:id', (req, res) => {
    const { id } = req.params;
    const { titulo, nota, porcentaje, tipo } = req.body;
    
    const sql = 'UPDATE mini_tasks SET titulo = ?, nota = ?, porcentaje = ?, tipo = ? WHERE id = ?';
    db.run(sql, [titulo, nota, porcentaje, tipo || 'desarrollo', id], function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ message: "Mini-task updated successfully", id, titulo, nota, porcentaje, tipo: tipo || 'desarrollo' });
    });
});

app.delete('/api/mini-tasks/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM mini_tasks WHERE id = ?', id, function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.status(204).send();
    });
});

// Rechazo desde QA a Desarrollo
app.post('/api/work-items/:id/qa-reject', async (req, res) => {
    const { id } = req.params; // Work Item ID
    const { nota, porcentajeDeducir, usuario } = req.body;
    let deduction = parseInt(porcentajeDeducir) || 0;

    if (deduction <= 0 || !nota) {
        return res.status(400).json({ "error": "Invalid deduction percentage or missing note" });
    }

    db.all("SELECT * FROM mini_tasks WHERE work_item_id = ? AND tipo = 'desarrollo'", [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(400).json({ "error": "No desarrollo tasks found to deduct from" });
        }

        const deductionPerTask = Math.floor(deduction / rows.length);
        const remainder = deduction % rows.length;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // Acumular los errores para no responder el success prematuramente
            let hasError = false;

            rows.forEach((row, index) => {
                let thisDeduction = deductionPerTask;
                if (index < remainder) { // Repartir el residuo entre los primeros n elementos
                    thisDeduction++;
                }
                
                let newPercentage = row.porcentaje - thisDeduction;
                if (newPercentage < 0) newPercentage = 0; // Prevenir negativos lógicos, aunque requiera que dev suba más.

                db.run('UPDATE mini_tasks SET porcentaje = ? WHERE id = ?', [newPercentage, row.id], function(err) {
                    if (err) hasError = true;
                });
            });

            // Registrar el reporte de QA en Desarrollo
            const logSql = "INSERT INTO mini_tasks (work_item_id, titulo, nota, porcentaje, fecha_creacion, tipo, usuario) VALUES (?, ?, ?, ?, ?, ?, ?)";
            const logParams = [id, "Rechazo de QA", nota, 0, new Date().toISOString(), 'desarrollo', usuario || 'Sistema (QA)'];
            db.run(logSql, logParams, function(err) {
                 if (err) hasError = true;
            });

            db.run("COMMIT", (err) => {
                if (hasError || err) {
                    return res.status(500).json({ "error": "Transaction failed during deduction update" });
                }
                res.json({ "message": "Deduction applied and logged successfully" });
            });
        });
    });
});

// File Uploads Endpoints
app.get('/api/work-items/:id/files', (req, res) => {
    const { id } = req.params;
    db.all('SELECT * FROM files WHERE work_item_id = ? ORDER BY created_at DESC', [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        res.json(rows);
    });
});

app.post('/api/work-items/:id/files', upload.single('file'), (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ "error": "No file uploaded" });
    }

    const { originalname, path: filePath } = req.file;
    const createdAt = new Date().toISOString();
    const usuario = req.body.usuario || 'Sistema';

    const sql = 'INSERT INTO files (work_item_id, file_name, file_path, created_at, usuario) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [id, originalname, filePath, createdAt, usuario], function(err) {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        res.status(201).json({
            id: this.lastID,
            work_item_id: id,
            file_name: originalname,
            file_path: filePath,
            created_at: createdAt,
            usuario: usuario
        });
    });
});

app.get('/api/files/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM files WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ "error": err.message });
        }
        if (!row) {
            return res.status(404).json({ "error": "File not found" });
        }
        res.download(path.resolve(row.file_path), row.file_name);
    });
});

app.delete('/api/files/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM files WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ "error": err.message });
        if (!row) return res.status(404).json({ "error": "File not found" });
        
        db.run('DELETE FROM files WHERE id = ?', [id], function(err) {
            if (err) return res.status(400).json({ "error": err.message });
            try {
                if (fs.existsSync(row.file_path)) {
                    fs.unlinkSync(row.file_path);
                }
            } catch (e) {
                console.error("Error deleting file physically:", e.message);
            }
            res.status(204).send();
        });
    });
});


app.get('/api/work-items/qa-ready', (req, res) => {
    const sql = `
        SELECT 
            w.id, 
            w.azure_id, 
            w.title, 
            w.state,
            ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'qa' THEN m.porcentaje ELSE 0 END), 0), 2) AS qa_progress
        FROM work_items w
        LEFT JOIN mini_tasks m ON w.id = m.work_item_id
        WHERE LOWER(w.state) NOT IN ('closed', 'completed', 'cerrado', 'completado')
        GROUP BY w.id, w.azure_id, w.title, w.state
        HAVING ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'desarrollo' THEN m.porcentaje ELSE 0 END), 0), 1) >= 99.9
           AND ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'qa' THEN m.porcentaje ELSE 0 END), 0), 1) < 99.9
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching qa-ready items:", err);
            return res.status(500).json({ "error": err.message });
        }
        res.json(rows);
    });
});

app.get('/api/work-items/dev-in-progress', (req, res) => {
    const sql = `
        SELECT 
            w.id, 
            w.azure_id, 
            w.title, 
            w.state,
            ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'desarrollo' THEN m.porcentaje ELSE 0 END), 0), 2) AS dev_progress
        FROM work_items w
        LEFT JOIN mini_tasks m ON w.id = m.work_item_id
        WHERE LOWER(w.state) NOT IN ('closed', 'completed', 'cerrado', 'completado')
        GROUP BY w.id, w.azure_id, w.title, w.state
        HAVING dev_progress > 0 AND dev_progress < 99.9
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching dev-in-progress items:", err);
            return res.status(500).json({ "error": err.message });
        }
        res.json(rows);
    });
});

app.get('/api/work-items/qa-in-progress', (req, res) => {
    const sql = `
        SELECT 
            w.id, 
            w.azure_id, 
            w.title, 
            w.state,
            ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'qa' THEN m.porcentaje ELSE 0 END), 0), 2) AS qa_progress
        FROM work_items w
        LEFT JOIN mini_tasks m ON w.id = m.work_item_id
        WHERE LOWER(w.state) NOT IN ('closed', 'completed', 'cerrado', 'completado')
        GROUP BY w.id, w.azure_id, w.title, w.state
        HAVING ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'desarrollo' THEN m.porcentaje ELSE 0 END), 0), 1) >= 99.9
           AND qa_progress > 0 AND qa_progress < 99.9
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching qa-in-progress items:", err);
            return res.status(500).json({ "error": err.message });
        }
        res.json(rows);
    });
});

app.get('/api/work-items/vobo-ready', (req, res) => {
    const sql = `
        SELECT 
            w.id, 
            w.azure_id, 
            w.title, 
            w.state,
            ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'qa' THEN m.porcentaje ELSE 0 END), 0), 2) AS qa_progress
        FROM work_items w
        LEFT JOIN mini_tasks m ON w.id = m.work_item_id
        WHERE LOWER(w.state) NOT IN ('closed', 'completed', 'cerrado', 'completado')
          AND w.vobo_status != 'approved'
        GROUP BY w.id, w.azure_id, w.title, w.state
        HAVING ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'desarrollo' THEN m.porcentaje ELSE 0 END), 0), 1) >= 99.9
           AND ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'qa' THEN m.porcentaje ELSE 0 END), 0), 1) >= 99.9
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching vobo-ready items:", err);
            return res.status(500).json({ "error": err.message });
        }
        res.json(rows);
    });
});

app.post('/api/work-items/:id/vobo-approve', upload.single('file'), (req, res) => {
    const { id } = req.params;
    const { notas, usuario } = req.body;
    const file = req.file;
    const fecha = new Date().toISOString();

    const sql = `
        UPDATE work_items 
        SET vobo_status = 'approved', 
            vobo_fecha = ?, 
            vobo_notas = ?, 
            vobo_usuario = ?, 
            vobo_file_path = ?, 
            vobo_file_name = ?,
            state = 'Completed',
            changed_date = ?
        WHERE id = ?
    `;
    const params = [
        fecha, 
        notas || '', 
        usuario || 'Admin', 
        file ? file.path : null, 
        file ? file.originalname : null,
        fecha,
        id
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error("Error approving VoBo:", err);
            return res.status(500).json({ "error": err.message });
        }
        res.json({ message: "VoBo otorgado y Work Item finalizado." });
    });
});

app.post('/api/work-items/:id/vobo-reject', (req, res) => {
    const { id } = req.params;
    const { nota, usuario } = req.body;
    const deduction = 10;

    db.all("SELECT * FROM mini_tasks WHERE work_item_id = ? AND tipo = 'qa'", [id], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        if (!rows || rows.length === 0) return res.status(400).json({ "error": "No QA tasks found to deduct from" });

        const deductionPerTask = Math.floor(deduction / rows.length);
        const remainder = deduction % rows.length;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            let hasError = false;

            rows.forEach((row, index) => {
                let thisDeduction = deductionPerTask;
                if (index < remainder) thisDeduction++;
                let newPercentage = row.porcentaje - thisDeduction;
                if (newPercentage < 0) newPercentage = 0;

                db.run('UPDATE mini_tasks SET porcentaje = ? WHERE id = ?', [newPercentage, row.id], (err) => {
                    if (err) hasError = true;
                });
            });

            // Log rejection note in QA area
            const logSql = "INSERT INTO mini_tasks (work_item_id, titulo, nota, porcentaje, fecha_creacion, tipo, usuario) VALUES (?, ?, ?, ?, ?, ?, ?)";
            const logParams = [id, "Rechazo de VoBo", nota, 0, new Date().toISOString(), 'qa', usuario || 'Admin'];
            db.run(logSql, logParams, (err) => {
                 if (err) hasError = true;
            });

            db.run("COMMIT", (err) => {
                if (hasError || err) return res.status(500).json({ "error": "Transaction failed during VoBo rejection" });
                res.json({ "message": "VoBo rechazado. El avance de QA se ha reducido un 10%." });
            });
        });
    });
});

app.get('/api/work-items/vobo-completed', (req, res) => {
    const sql = `
        SELECT w.*, 
               COALESCE(SUM(CASE WHEN m.tipo = 'desarrollo' THEN m.porcentaje ELSE 0 END), 0) AS dev_progress,
               COALESCE(SUM(CASE WHEN m.tipo = 'qa' THEN m.porcentaje ELSE 0 END), 0) AS qa_progress
        FROM work_items w
        LEFT JOIN mini_tasks m ON w.id = m.work_item_id
        WHERE w.vobo_status = 'approved'
        GROUP BY w.id
        ORDER BY w.vobo_fecha DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});

app.post('/api/work-items/:id/approve', (req, res) => {
    const { id } = req.params;
    const sql = "UPDATE work_items SET state = 'Completed', changed_date = ? WHERE id = ?";
    db.run(sql, [new Date().toISOString(), id], function(err) {
        if (err) {
            console.error("Error approving work item:", err);
            return res.status(500).json({ "error": err.message });
        }
        res.json({ message: "Work item approved and completed successfully" });
    });
});

app.get('/api/reports/daily-dev-progress', (req, res) => {
    let { date } = req.query;
    if (!date) {
        date = new Date().toISOString().split('T')[0];
    }

    const sql = `
        SELECT 
            m.id,
            w.id AS work_item_id,
            w.azure_id,
            w.title,
            m.porcentaje,
            m.usuario,
            m.fecha_creacion,
            m.nota,
            m.titulo AS proceso_realizado
        FROM mini_tasks m
        JOIN work_items w ON m.work_item_id = w.id
        WHERE m.tipo = 'desarrollo' 
          AND date(m.fecha_creacion) = date(?)
        ORDER BY m.fecha_creacion DESC
    `;

    db.all(sql, [date], (err, rows) => {
        if (err) {
            console.error("Error fetching daily dev progress:", err);
            return res.status(500).json({ "error": err.message });
        }
        res.json(rows);
    });
});

app.get('/api/reports/daily-qa-progress', (req, res) => {
    let { date } = req.query;
    if (!date) {
        date = new Date().toISOString().split('T')[0];
    }

    const sql = `
        SELECT 
            m.id,
            w.id AS work_item_id,
            w.azure_id,
            w.title,
            m.porcentaje,
            m.usuario,
            m.fecha_creacion,
            m.nota,
            m.titulo AS proceso_realizado
        FROM mini_tasks m
        JOIN work_items w ON m.work_item_id = w.id
        WHERE m.tipo = 'qa' 
          AND date(m.fecha_creacion) = date(?)
          AND w.id NOT IN (
              SELECT work_item_id 
              FROM mini_tasks 
              WHERE tipo = 'qa' 
              GROUP BY work_item_id 
              HAVING ROUND(SUM(porcentaje), 1) >= 99.9
          )
        ORDER BY m.fecha_creacion DESC
    `;

    db.all(sql, [date], (err, rows) => {
        if (err) {
            console.error("Error fetching daily qa progress:", err);
            return res.status(500).json({ "error": err.message });
        }
        res.json(rows);
    });
});

app.get('/api/reports/daily-evidence', (req, res) => {
    const { startDate, endDate, date, user, taskId } = req.query;
    
    // Fallback for backward compatibility or direct 'date' usage
    const start = startDate || date;
    const end = endDate || start;

    if (!start) {
        return res.status(400).json({ error: "Start date parameter is required (YYYY-MM-DD)" });
    }

    let sql = `
        SELECT 
            w.azure_id AS "ID Azure",
            w.title AS "Título del Work Item",
            w.state AS "Estado de Tarea",
            m.titulo AS "Proceso Realizado",
            m.nota AS "Evidencia / Nota",
            m.porcentaje || '%' AS "Porcentaje Aportado",
            (SELECT COALESCE(SUM(p.porcentaje), 0) FROM mini_tasks p WHERE p.work_item_id = w.id AND p.tipo = 'desarrollo') || '%' AS "Progreso Dev Total",
            (SELECT COALESCE(SUM(p.porcentaje), 0) FROM mini_tasks p WHERE p.work_item_id = w.id AND p.tipo = 'qa') || '%' AS "Progreso QA Total",
            m.tipo AS "Área (Dev/QA)",
            m.usuario AS "Usuario",
            m.fecha_creacion AS "Fecha de Registro"
        FROM mini_tasks m
        JOIN work_items w ON m.work_item_id = w.id
        WHERE date(m.fecha_creacion) BETWEEN date(?) AND date(?)
    `;
    const params = [start, end];

    if (user && user.trim() !== '') {
        sql += ` AND m.usuario = ?`;
        params.push(user.trim());
    }

    if (taskId && taskId.trim() !== '') {
        sql += ` AND (w.azure_id = ? OR w.id = ?)`;
        params.push(taskId.trim(), taskId.trim());
    }

    sql += ` ORDER BY m.fecha_creacion ASC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error("Error generating daily evidence report:", err);
            return res.status(500).json({ error: err.message });
        }

        const dateStr = start === end ? start : `${start}_a_${end}`;

        if (rows.length === 0) {
            // Devuelve un CSV vacío con encabezados en lugar de error
            const fields = ["ID Azure", "Título del Work Item", "Estado de Tarea", "Proceso Realizado", "Evidencia / Nota", "Porcentaje Aportado", "Área (Dev/QA)", "Usuario", "Fecha de Registro"];
            const parser = new Parser({ fields });
            const csv = parser.parse([]);
            res.header('Content-Type', 'text/csv');
            res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            const fileName = user ? `evidencia_trabajo_${user}_${dateStr}.csv` : `evidencia_trabajo_${dateStr}.csv`;
            res.attachment(fileName);
            return res.send(csv);
        }

        try {
            const parser = new Parser();
            const csv = parser.parse(rows);
            res.header('Content-Type', 'text/csv');
            res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            const fileName = user ? `evidencia_trabajo_${user}_${dateStr}.csv` : `evidencia_trabajo_${dateStr}.csv`;
            res.attachment(fileName);
            res.send(csv);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error generating CSV' });
        }
    });
});

app.get('/api/work-items/export', (req, res) => {
  db.all("SELECT * FROM work_items", [], (err, rows) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    const fields = ['id', 'azure_id', 'title', 'state', 'description', 'priority', 'acceptance_criteria', 'assigned_to', 'created_date', 'changed_date'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(rows);

    res.header('Content-Type', 'text/csv');
    res.attachment('work_items.csv');
    res.send(csv);
  });
});

app.get('/api/projects', (req, res) => {
    db.all("SELECT * FROM proyectos", [], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/projects', (req, res) => {
    const { name, organization, type } = req.body;
    const sql = 'INSERT INTO proyectos (name, organization, type) VALUES (?, ?, ?)';
    const params = [name, organization || 'Interna', type || 'internal'];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, name, organization, type: type || 'internal' });
    });
});

app.delete('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM proyectos WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.status(204).send();
    });
});

// Azure DevOps Import API - Importa proyectos y Work Items
app.post('/api/import-from-azure', async (req, res) => {
    const { organization, pat } = req.body;

    if (!organization || !pat) {
        return res.status(400).json({ message: 'Missing organization or PAT' });
    }

    const projectUrl = `https://dev.azure.com/${organization}/_apis/projects?api-version=7.1`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
    };

    try {
        // Obtener todos los proyectos
        const projectResponse = await axios.get(projectUrl, { headers });
        const projects = projectResponse.data.value;

        // Guardar proyectos en BD
        const projectSql = 'INSERT OR IGNORE INTO proyectos (azure_id, name, organization) VALUES (?, ?, ?)';
        const projectStmt = db.prepare(projectSql);

        projects.forEach(project => {
            projectStmt.run(
                project.id,
                project.name,
                organization
            );
        });

        projectStmt.finalize();

        // Ahora obtener Work Items de cada proyecto
        const workItemSql = 'INSERT OR IGNORE INTO work_items (azure_id, title, state, description, priority, assigned_to, created_date, changed_date, project_id, azure_project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const workItemStmt = db.prepare(workItemSql);
        
        let totalWorkItems = 0;

        // Procesar cada proyecto
        for (const project of projects) {
            try {
                // Obtener project_id local de la BD
                const localProject = await new Promise((resolve, reject) => {
                    db.get('SELECT id FROM proyectos WHERE azure_id = ?', [project.id], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (!localProject) {
                    console.warn(`Could not find local project ID for Azure project ${project.id}`);
                    continue;
                }

                // Usar WIQL para obtener todos los work items del proyecto
                const wiqlBody = {
                    'query': 'SELECT [System.Id], [System.Title], [System.State], [System.Description], [System.Priority], [System.AssignedTo], [System.CreatedDate], [System.ChangedDate] FROM workitems'
                };

                const wiqlUrl = `https://dev.azure.com/${organization}/${project.id}/_apis/wit/wiql?api-version=7.1`;
                const wiqlResponse = await axios.post(wiqlUrl, wiqlBody, { headers });
                const workItemIds = wiqlResponse.data.workItems.map(wi => wi.id);

                if (workItemIds.length > 0) {
                    // Obtener detalles de cada work item en batch (máximo 200 por request)
                    const batchSize = 200;
                    for (let i = 0; i < workItemIds.length; i += batchSize) {
                        const batch = workItemIds.slice(i, i + batchSize).join(',');
                        const detailsUrl = `https://dev.azure.com/${organization}/_apis/wit/workitems?ids=${batch}&api-version=7.1&$expand=relations`;
                        const detailsResponse = await axios.get(detailsUrl, { headers });

                        detailsResponse.data.value.forEach(workItem => {
                            const fields = workItem.fields;
                            workItemStmt.run(
                                workItem.id,
                                fields['System.Title'] || 'No Title',
                                fields['System.State'] || 'New',
                                fields['System.Description'] || '',
                                fields['System.Priority'] || 0,
                                fields['System.AssignedTo'] ? fields['System.AssignedTo'].displayName : '',
                                fields['System.CreatedDate'] || new Date().toISOString(),
                                fields['System.ChangedDate'] || new Date().toISOString(),
                                localProject.id,
                                project.id
                            );
                            totalWorkItems++;
                        });
                    }
                }
            } catch (projectError) {
                console.warn(`Error fetching work items for project ${project.name}:`, projectError.message);
                // Continuar con el siguiente proyecto
            }
        }

        workItemStmt.finalize((err) => {
            if (err) {
                console.error('Error saving work items:', err);
                res.status(500).json({ "error": err.message });
                return;
            }
            res.json({ 
                message: `${projects.length} projects and ${totalWorkItems} work items imported successfully`,
                projectsCount: projects.length,
                workItemsCount: totalWorkItems
            });
        });

    } catch (error) {
        console.error('Error importing from Azure DevOps:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to import projects from Azure DevOps: ' + (error.message || 'Unknown error') });
    }
});


// User API
app.get('/api/users', (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({ message: 'Login successful', user });
  });
});

app.post('/api/users', async (req, res) => {
  const newUser = req.body;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newUser.password, salt);
  
  const sql = 'INSERT INTO users (username, password, role, name, email) VALUES (?, ?, ?, ?, ?)';
  const params = [newUser.username, hashedPassword, newUser.role, newUser.name, newUser.email];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.status(201).json({
      "id_usuario": this.lastID,
      ...newUser
    });
  });
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
  
    if (updatedData.password) {
        const salt = await bcrypt.genSalt(10);
        updatedData.password = await bcrypt.hash(updatedData.password, salt);
    }

    const updateFields = Object.keys(updatedData).filter(key => key !== 'id_usuario');
    const setClause = updateFields.map(key => `${key} = ?`).join(', ');
    const params = updateFields.map(key => updatedData[key]);
    params.push(id);

    const sql = `UPDATE users SET ${setClause} WHERE id_usuario = ?`;
  
    db.run(sql, params, function(err) {
      if (err) {
        res.status(400).json({ "error": err.message });
        return;
      }
      res.json({ message: "User updated successfully" });
    });
  });
  
  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
  
    db.run('DELETE FROM users WHERE id_usuario = ?', id, function(err) {
      if (err) {
        res.status(400).json({ "error": err.message });
        return;
      }
      res.status(204).send();
    });
  });

app.post('/api/users/change-password', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    db.get('SELECT * FROM users WHERE id_usuario = ?', [userId], async (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const passwordMatch = await bcrypt.compare(oldPassword, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        db.run('UPDATE users SET password = ? WHERE id_usuario = ?', [hashedPassword, userId], function(err) {
            if (err) {
                return res.status(400).json({ "error": err.message });
            }
            res.json({ message: "Password updated successfully" });
        });
    });
});

// Dashboard Statistics Endpoint
app.get('/api/dashboard/stats', (req, res) => {
    const { project_id, assigned_to } = req.query;
    
    let query = `
        SELECT 
            wi.id, 
            wi.title, 
            wi.state, 
            wi.assigned_to, 
            wi.due_date, 
            wi.vobo_status,
            p.name as project_name,
            (SELECT SUM(mt.porcentaje) FROM mini_tasks mt WHERE mt.work_item_id = wi.id AND mt.tipo = 'desarrollo') as dev_progress,
            (SELECT SUM(mt.porcentaje) FROM mini_tasks mt WHERE mt.work_item_id = wi.id AND mt.tipo = 'qa') as qa_progress
        FROM work_items wi
        LEFT JOIN proyectos p ON wi.project_id = p.id
        WHERE 1=1
    `;
    
    const params = [];
    if (project_id) {
        query += " AND wi.project_id = ?";
        params.push(project_id);
    }
    if (assigned_to) {
        query += " AND wi.assigned_to = ?";
        params.push(assigned_to);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Error fetching dashboard stats' });
        }

        const now = new Date();
        const stats = {
            totalItems: rows.length,
            completedItems: rows.filter(r => r.vobo_status === 'approved').length,
            overdueItems: rows.filter(r => {
                if (!r.due_date || r.vobo_status === 'approved') return false;
                return new Date(r.due_date) < now;
            }).length,
            avgEfficiency: rows.length > 0 
                ? (rows.reduce((sum, r) => sum + ((r.dev_progress || 0) + (r.qa_progress || 0)) / 2, 0) / rows.length).toFixed(1)
                : 0,
            byState: {
                'Nuevo': rows.filter(r => r.state === 'Nuevo').length,
                'En Progreso': rows.filter(r => r.state === 'En Progreso').length,
                'Completado': rows.filter(r => r.vobo_status === 'approved').length
            },
            items: rows
        };

        res.json(stats);
    });
});

// Dashboard Export Endpoint
app.get('/api/dashboard/export', (req, res) => {
    const { project_id, assigned_to } = req.query;
    
    let query = `
        SELECT 
            wi.id, 
            wi.title as Titulo, 
            wi.state as Estado, 
            wi.assigned_to as Responsable, 
            wi.due_date as Fecha_Limite, 
            wi.vobo_status as Estatus_VoBo,
            p.name as Proyecto,
            COALESCE((SELECT SUM(mt.porcentaje) FROM mini_tasks mt WHERE mt.work_item_id = wi.id AND mt.tipo = 'desarrollo'), 0) as Progreso_Dev,
            COALESCE((SELECT SUM(mt.porcentaje) FROM mini_tasks mt WHERE mt.work_item_id = wi.id AND mt.tipo = 'qa'), 0) as Progreso_QA
        FROM work_items wi
        LEFT JOIN proyectos p ON wi.project_id = p.id
        WHERE 1=1
    `;
    
    const params = [];
    if (project_id) {
        query += " AND wi.project_id = ?";
        params.push(project_id);
    }
    if (assigned_to) {
        query += " AND wi.assigned_to = ?";
        params.push(assigned_to);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        try {
            const parser = new Parser();
            const csv = parser.parse(rows);
            res.header('Content-Type', 'text/csv');
            res.attachment(`reporte_eficiencia_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csv);
        } catch (e) {
            res.status(500).json({ error: 'Error generating CSV' });
        }
    });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
