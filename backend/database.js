import sqlite3 from 'sqlite3';

// open the database
let db = new sqlite3.Database('./db.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

db.get("PRAGMA foreign_keys = ON;");

// Function to add a column to a table if it doesn't exist
const addColumnIfNotExists = (tableName, columnName, columnType) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
        if (err) {
            console.error(`Error checking table info for ${tableName}:`, err.message);
            return;
        }
        
        const columnExists = columns.some(column => column.name === columnName);
        
        if (!columnExists) {
            db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`, (err) => {
                if (err) {
                    console.error(`Error adding column ${columnName} to ${tableName}:`, err.message);
                } else {
                    console.log(`Column ${columnName} added to ${tableName}.`);
                }
            });
        }
    });
};

db.serialize(() => {
  // Create changes table
  db.run(`CREATE TABLE IF NOT EXISTS changes (
    id_cambio TEXT PRIMARY KEY,
    descripcion TEXT,
    prioridad TEXT,
    responsable TEXT,
    fecha_limite TEXT,
    notas_tecnicas TEXT,
    estado TEXT,
    fecha_cierre TEXT
  )`, (err) => {
    if (err) {
      console.error('Error creating changes table:', err.message);
    } else {
      console.log('Changes table created or already exists.');
    }
  });

  // Create documents table
  db.run(`CREATE TABLE IF NOT EXISTS documents (
    id_registro INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cambio TEXT,
    tipo_entrada TEXT,
    contenido TEXT,
    formato TEXT,
    usuario TEXT,
    fecha_creacion TEXT,
    FOREIGN KEY (id_cambio) REFERENCES changes (id_cambio) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating documents table:', err.message);
    } else {
      console.log('Documents table created or already exists.');
    }
  });

  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created or already exists.');
      // Add new columns if they don't exist
      addColumnIfNotExists('users', 'name', 'TEXT');
      addColumnIfNotExists('users', 'email', 'TEXT');
    }
  });

  // Create faculties table
  db.run(`CREATE TABLE IF NOT EXISTS faculties (
    id_facultad INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    descripcion TEXT
  )`, (err) => {
    if (err) {
      console.error('Error creating faculties table:', err.message);
    } else {
      console.log('Faculties table created or already exists.');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS proyectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    azure_id TEXT UNIQUE,
    name TEXT,
    organization TEXT
  )`, (err) => {
    if (err) {
      console.error('Error creating proyectos table:', err.message);
    } else {
      console.log('Proyectos table created or already exists.');
    }
  });

  // Create mini_tasks table
  db.run(`CREATE TABLE IF NOT EXISTS mini_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_item_id INTEGER,
    titulo TEXT,
    nota TEXT,
    porcentaje INTEGER,
    fecha_creacion TEXT,
    tipo TEXT DEFAULT 'desarrollo',
    usuario TEXT
  )`, (err) => {
    if (err) {
      console.error('Error creating mini_tasks table:', err.message);
    } else {
      console.log('Mini_tasks table created or already exists.');
      addColumnIfNotExists('mini_tasks', 'tipo', "TEXT DEFAULT 'desarrollo'");
      addColumnIfNotExists('mini_tasks', 'usuario', "TEXT");
    }
  });

  // Create files table for FileManager
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_item_id INTEGER,
    file_name TEXT,
    file_path TEXT,
    created_at TEXT,
    usuario TEXT
  )`, (err) => {
    if (err) {
      console.error('Error creating files table:', err.message);
    } else {
      console.log('Files table created or already exists.');
      addColumnIfNotExists('files', 'usuario', "TEXT");
    }
  });

  // New columns for VoBo workflow
  addColumnIfNotExists('work_items', 'vobo_status', "TEXT DEFAULT 'pending'");
  addColumnIfNotExists('work_items', 'vobo_fecha', "TEXT");
  addColumnIfNotExists('work_items', 'vobo_notas', "TEXT");
  addColumnIfNotExists('work_items', 'vobo_usuario', "TEXT");
  addColumnIfNotExists('work_items', 'vobo_file_path', "TEXT");
  addColumnIfNotExists('work_items', 'vobo_file_name', "TEXT");
  addColumnIfNotExists('work_items', 'due_date', "TEXT");
  addColumnIfNotExists('proyectos', 'type', "TEXT DEFAULT 'azure'");
});

export default db;
