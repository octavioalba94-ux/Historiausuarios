import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./db.sqlite');

console.log('🔧 Creando índices para optimizar búsquedas...\n');

db.serialize(() => {
  // Índice para búsquedas por azure_id (PRIMARY)
  db.run(`CREATE INDEX IF NOT EXISTS idx_azure_id ON work_items(azure_id)`, (err) => {
    if (err) {
      console.error('❌ Error creando índice azure_id:', err.message);
    } else {
      console.log('✓ Índice en azure_id creado/existente');
    }
  });

  // Índice para búsquedas por id (PRIMARY)
  db.run(`CREATE INDEX IF NOT EXISTS idx_id ON work_items(id)`, (err) => {
    if (err) {
      console.error('❌ Error creando índice id:', err.message);
    } else {
      console.log('✓ Índice en id creado/existente');
    }
  });

  // Índice compuesto para búsquedas rápidas
  db.run(`CREATE INDEX IF NOT EXISTS idx_search ON work_items(azure_id, id)`, (err) => {
    if (err) {
      console.error('❌ Error creando índice compuesto:', err.message);
    } else {
      console.log('✓ Índice compuesto creado/existente');
    }
  });

  // Índice para assigned_to
  db.run(`CREATE INDEX IF NOT EXISTS idx_assigned_to ON work_items(assigned_to)`, (err) => {
    if (err) {
      console.error('❌ Error creando índice assigned_to:', err.message);
    } else {
      console.log('✓ Índice en assigned_to creado/existente');
    }
  });

  // Índice para solicitante
  db.run(`CREATE INDEX IF NOT EXISTS idx_solicitante ON work_items(solicitante)`, (err) => {
    if (err) {
      console.error('❌ Error creando índice solicitante:', err.message);
    } else {
      console.log('✓ Índice en solicitante creado/existente');
    }
  });

  // Analizar tabla para optimizar queries
  db.run(`ANALYZE work_items`, (err) => {
    if (err) {
      console.error('❌ Error analizando tabla:', err.message);
    } else {
      console.log('✓ Tabla analizada para optimizar');
    }
  });

  setTimeout(() => {
    console.log('\n✅ Migración de índices completada');
    db.close();
  }, 1000);
});
