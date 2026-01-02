const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Use absolute path to database file in root directory
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log(`Connecting to database at: ${dbPath}`);

// Check if user exists
db.get("SELECT * FROM Users WHERE id = ?", [20], async (err, row) => {
  if (err) {
    console.error('Error querying database:', err);
    db.close();
    return;
  }
  
  if (!row) {
    console.log('User with ID 20 not found in the database');
    
    // List all users
    db.all("SELECT id, username, email FROM Users", [], (err, rows) => {
      if (err) {
        console.error('Error listing users:', err);
      } else {
        console.log('Users in database:');
        rows.forEach(user => {
          console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
        });
      }
      db.close();
    });
    return;
  }
  
  console.log('User found:', {
    id: row.id,
    username: row.username,
    email: row.email,
    // Don't log the full hash for security
    passwordHash: row.password ? (row.password.substring(0, 20) + '...') : 'null'
  });
  
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
  
  console.log(`Is password "${testPassword}" valid? ${isValid}`);
  
  // Generate a new hash for 123456
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(testPassword, salt);
  
  // Update the password in the database
  db.run("UPDATE Users SET password = ? WHERE id = ?", 
    [hashedPassword, 20], function(err) {
    if (err) {
      console.error('Error updating password:', err);
    } else {
      console.log(`Password reset successful! Changes: ${this.changes} rows affected`);
      console.log(`New password for user ID 20 is set to: ${testPassword}`);
    }
    
    db.close();
  });
}); 