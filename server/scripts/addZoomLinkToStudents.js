const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Sequelize } = require('sequelize');
const { sequelize } = require('../models');

async function addZoomLinkToStudents() {
  try {
    console.log('Starting migration: Adding zoomLink column to Students table...');
    
    // Check if the column already exists to avoid errors
    const checkQuery = `
      SELECT name FROM pragma_table_info('Students') WHERE name = 'zoomLink';
    `;
    
    const [checkResults] = await sequelize.query(checkQuery);
    
    if (checkResults.length > 0) {
      console.log('Column zoomLink already exists in Students table. Skipping migration.');
      return;
    }
    
    // Add the zoomLink column
    await sequelize.query(`
      ALTER TABLE Students ADD COLUMN zoomLink TEXT;
    `);
    
    console.log('Migration completed successfully: zoomLink column added to Students table.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addZoomLinkToStudents()
    .then(() => {
      console.log('Migration script completed.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error during migration:', err);
      process.exit(1);
    });
}

module.exports = addZoomLinkToStudents; 