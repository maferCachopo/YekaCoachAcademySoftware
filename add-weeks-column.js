const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  
  db.run(`ALTER TABLE Packages ADD COLUMN durationWeeks INTEGER DEFAULT 4`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
      } else {
        console.error('- Error:', err.message);
      }
    } else {
      
      // Opcional: Actualizar el paquete Premium (id 3) a 12 semanas si ya existe
      db.run(`UPDATE Packages SET durationWeeks = 12 WHERE name LIKE '%Premium%' OR id = 3`);
      db.run(`UPDATE Packages SET durationWeeks = 4 WHERE durationWeeks IS NULL`);
    }
  });
});

db.close();