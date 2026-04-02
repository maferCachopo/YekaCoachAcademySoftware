const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  
  // Agregar columna weeklySchedule si no existe
  db.run(`ALTER TABLE TeacherStudents ADD COLUMN weeklySchedule TEXT DEFAULT '[]'`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
      } else {
        console.error('- Error al agregar columna:', err.message);
      }
    } else {
    }
  });
});

db.close();