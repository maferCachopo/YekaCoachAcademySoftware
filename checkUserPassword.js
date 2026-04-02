const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Use absolute path to database file in root directory
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);


// Check if user exists
db.get("SELECT * FROM Users WHERE id = ?", [20], async (err, row) => {
  if (err) {
    console.error('Error querying database:', err);
    db.close();
    return;
  }
  
  if (!row) {
    
    // List all users
    db.all("SELECT id, username, email FROM Users", [], (err, rows) => {
      if (err) {
        console.error('Error listing users:', err);
      } else {
        rows.forEach(user => {
        });
      }
      db.close();
    });
    return;
  }
  
  
  
  // Test if 123456 is already the correct password
  const testPassword = '123456';
  let isValid = false;
  
  if (row.password) {
    try {
      isValid = await bcrypt.compare(testPassword, row.password);
    } catch (error) {
      console.error('Error comparing passwords:', error);
    }
  }
  
  
  // Generate a new hash for 123456
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(testPassword, salt);
  
  // Update the password in the database
  db.run("UPDATE Users SET password = ? WHERE id = ?", 
    [hashedPassword, 20], function(err) {
    if (err) {
      console.error('Error updating password:', err);
    } else {
    }
    
    db.close();
  });
}); 