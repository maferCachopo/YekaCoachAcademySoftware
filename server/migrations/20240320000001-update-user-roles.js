'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For SQLite, we need to recreate the table with the new column type
    await queryInterface.sequelize.query(`
      PRAGMA foreign_keys=OFF;
      
      BEGIN TRANSACTION;
      
      -- Create a temporary table with the new structure
      CREATE TABLE Users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'student', 'teacher', 'coordinator')) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      );
      
      -- Copy data from the old table
      INSERT INTO Users_new 
      SELECT * FROM Users;
      
      -- Drop the old table
      DROP TABLE Users;
      
      -- Rename the new table to the original name
      ALTER TABLE Users_new RENAME TO Users;
      
      COMMIT;
      
      PRAGMA foreign_keys=ON;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // For the down migration, we'll convert teacher and coordinator roles back to student
    await queryInterface.sequelize.query(`
      UPDATE Users 
      SET role = 'student' 
      WHERE role IN ('teacher', 'coordinator');
    `);
  }
}; 