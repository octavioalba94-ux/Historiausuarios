import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./backend/db.sqlite');
db.serialize(() => {
  db.get("SELECT COUNT(*) as count FROM work_items", (err, row) => {
    console.log("Work Items Count:", row.count);
  });
  db.get("SELECT COUNT(*) as count FROM mini_tasks", (err, row) => {
    console.log("Mini Tasks Count:", row.count);
  });
});
db.close();
