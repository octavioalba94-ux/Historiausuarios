import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./db.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    // Drop old tables
    db.run('DROP TABLE IF EXISTS documents', (err) => {
        if (err) {
            console.error('Error dropping documents table:', err.message);
        } else {
            console.log('Documents table dropped.');
        }
    });

    db.run('DROP TABLE IF EXISTS changes', (err) => {
        if (err) {
            console.error('Error dropping changes table:', err.message);
        } else {
            console.log('Changes table dropped.');
        }
    });

    // Create work_items table
    db.run(`CREATE TABLE IF NOT EXISTS work_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        azure_id INTEGER UNIQUE,
        title TEXT,
        state TEXT,
        description TEXT,
        priority INTEGER,
        acceptance_criteria TEXT,
        assigned_to TEXT,
        created_date TEXT,
        changed_date TEXT,
        internal_notes TEXT,
        project_id INTEGER,
        azure_project_id TEXT,
        FOREIGN KEY (project_id) REFERENCES proyectos (id) ON DELETE CASCADE
    )`, (err) => {
        if (err) {
            console.error('Error creating work_items table:', err.message);
        } else {
            console.log('Work_items table created.');
        }
    });

    // Create work_item_notes table
    db.run(`CREATE TABLE IF NOT EXISTS work_item_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_item_id INTEGER,
        type TEXT,
        content TEXT,
        format TEXT,
        user TEXT,
        created_at TEXT,
        file_path TEXT,
        file_name TEXT,
        FOREIGN KEY (work_item_id) REFERENCES work_items (id) ON DELETE CASCADE
    )`, (err) => {
        if (err) {
            console.error('Error creating work_item_notes table:', err.message);
        } else {
            console.log('Work_item_notes table created.');
        }
    });

    // Create files table
    db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_item_id INTEGER,
        file_name TEXT,
        file_path TEXT,
        created_at TEXT,
        FOREIGN KEY (work_item_id) REFERENCES work_items (id) ON DELETE CASCADE
    )`, (err) => {
        if (err) {
            console.error('Error creating files table:', err.message);
        } else {
            console.log('Files table created.');
        }
    });
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Closed the database connection.');
});
