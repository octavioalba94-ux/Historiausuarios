import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./db.sqlite');

console.log('🔍 Verificando duplicados por ID en work_items...\n');

db.serialize(() => {
  // Encontrar IDs duplicados
  db.all(`
    SELECT azure_id, COUNT(*) as count 
    FROM work_items 
    GROUP BY azure_id 
    HAVING count > 1 
    ORDER BY count DESC
  `, (err, duplicates) => {
    if (err) {
      console.error('❌ Error:', err.message);
      return;
    }

    if (duplicates.length === 0) {
      console.log('✓ ¡Sin duplicados! Todos los azure_id son únicos\n');
      db.close();
      return;
    }

    console.log(`⚠️ Encontrados ${duplicates.length} IDs duplicados:\n`);
    duplicates.forEach((dup, idx) => {
      console.log(`${idx + 1}. azure_id: ${dup.azure_id} - ${dup.count} registros`);
    });

    console.log('\n🧹 Limpiando duplicados...\n');

    // Para cada ID duplicado, mantener solo el más reciente
    let cleaned = 0;
    let processed = 0;

    duplicates.forEach((dup) => {
      // Obtener todos los registros de este ID ordenados por created_date (más reciente primero)
      db.all(`
        SELECT id, azure_id, created_date 
        FROM work_items 
        WHERE azure_id = ? 
        ORDER BY created_date DESC
      `, [dup.azure_id], (err, rows) => {
        if (err) {
          console.error(`Error obteniendo registros para ${dup.azure_id}:`, err.message);
          return;
        }

        // Mantener el primero (más reciente) y eliminar los demás
        if (rows.length > 1) {
          const idsToDelete = rows.slice(1).map(r => r.id);
          const placeholders = idsToDelete.map(() => '?').join(',');
          
          db.run(`DELETE FROM work_items WHERE id IN (${placeholders})`, idsToDelete, function(err) {
            if (err) {
              console.error(`Error eliminando duplicados de ${dup.azure_id}:`, err.message);
            } else {
              console.log(`✓ ${dup.azure_id}: mantenido 1, eliminados ${idsToDelete.length}`);
              cleaned++;
            }
            
            processed++;
            if (processed === duplicates.length) {
              console.log(`\n✅ Limpieza completada: ${cleaned} IDs limpiados`);
              db.close();
            }
          });
        } else {
          processed++;
          if (processed === duplicates.length) {
            console.log(`\n✅ Limpieza completada: ${cleaned} IDs limpiados`);
            db.close();
          }
        }
      });
    });
  });
});
