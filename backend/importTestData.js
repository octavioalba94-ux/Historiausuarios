import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./db.sqlite');



db.serialize(() => {
  // Primero, obtener el project_id del proyecto "Findep Transformación Digital"
  db.get('SELECT id FROM proyectos WHERE name = ? AND organization = ?', 
    ['Findep Transformación Digital', 'findepdev'],
    (err, project) => {
      if (err) {
        console.error('Error:', err);
        return;
      }

      const projectId = project?.id || 1;

      console.log(`Insertando ${testData.length} Work Items de prueba...`);
      let inserted = 0;

      for (const item of testData) {
        db.run(
          `INSERT OR REPLACE INTO work_items 
          (azure_id, title, state, description, priority, acceptance_criteria, assigned_to, 
           created_date, changed_date, project_id, azure_project_id, casosPrueba, 
           nombreTester, urlEvidencias, solicitante, descripcionCompleta) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.azure_id, item.title, item.state, item.description, item.priority,
            item.description, item.assigned_to, item.created_date, item.changed_date,
            projectId, 'Findep Transformación Digital', item.casosPrueba,
            item.nombreTester, item.urlEvidencias, item.solicitante, item.description
          ],
          (err) => {
            if (err) {
              console.error(`Error insertando item ${item.azure_id}:`, err);
            } else {
              console.log(`✓ Insertado: ${item.title}`);
              inserted++;
            }
          }
        );
      }

      setTimeout(() => {
        console.log(`\n✓ Importación completada: ${inserted} Work Items guardados`);
        db.close();
      }, 2000);
    }
  );
});
