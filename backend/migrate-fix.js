import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./db.sqlite', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

db.serialize(() => {
    // Función auxiliar para agregar columna si no existe
    const addColumnIfNotExists = (tableName, columnName, columnType) => {
        return new Promise((resolve) => {
            db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
                if (err) {
                    console.error(`Error checking ${tableName}:`, err.message);
                    resolve();
                    return;
                }

                const columnExists = columns.some(col => col.name === columnName);
                if (!columnExists) {
                    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`, (err) => {
                        if (err) {
                            console.error(`Error adding ${columnName} to ${tableName}:`, err.message);
                        } else {
                            console.log(`✓ Added column ${columnName} to ${tableName}`);
                        }
                        resolve();
                    });
                } else {
                    console.log(`✓ Column ${columnName} already exists in ${tableName}`);
                    resolve();
                }
            });
        });
    };

    // Crear tabla proyectos si no existe
    db.run(`CREATE TABLE IF NOT EXISTS proyectos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        azure_id TEXT UNIQUE,
        name TEXT,
        organization TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating proyectos table:', err.message);
        } else {
            console.log('✓ Proyectos table OK');
        }
    });

    // Crear tabla work_items si no existe
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
        internal_notes TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating work_items table:', err.message);
        } else {
            console.log('✓ Work_items table OK');
        }
    });

    // Agregar columnas faltantes a work_items
    setTimeout(async () => {
        console.log('\n📋 Agregando columnas faltantes...');
        await addColumnIfNotExists('work_items', 'project_id', 'INTEGER');
        await addColumnIfNotExists('work_items', 'azure_project_id', 'TEXT');
        await addColumnIfNotExists('work_items', 'casosPrueba', 'TEXT');
        await addColumnIfNotExists('work_items', 'parent', 'TEXT');
        await addColumnIfNotExists('work_items', 'parentExiste', 'INTEGER');
        await addColumnIfNotExists('work_items', 'attachments', 'INTEGER');
        await addColumnIfNotExists('work_items', 'nombreTester', 'TEXT');
        await addColumnIfNotExists('work_items', 'urlEvidencias', 'TEXT');
        await addColumnIfNotExists('work_items', 'solicitante', 'TEXT');
        await addColumnIfNotExists('work_items', 'descripcionCompleta', 'TEXT');
        console.log('\n✓ Migración completada exitosamente\n');
        
        // Mostrar información de la tabla
        db.all("PRAGMA table_info(work_items)", (err, columns) => {
            if (err) {
                console.error('Error:', err);
            } else {
                console.log('Columnas en work_items:');
                columns.forEach(col => {
                    console.log(`  - ${col.name} (${col.type})`);
                });
            }
            
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('\n✓ Conexión cerrada');
                }
                process.exit(0);
            });
        });
    }, 500);
});
