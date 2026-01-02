require('dotenv').config();
const bcrypt = require('bcrypt');
const { User, Student, Package, StudentPackage, Class, StudentClass, RescheduleClass } = require('../models');
const { Op } = require('sequelize');

async function resetDatabase() {
  try {
    console.log('Starting database reset...');

    // Delete all data except admin user
    await RescheduleClass.destroy({ where: {} });
    await StudentClass.destroy({ where: {} });
    await Class.destroy({ where: {} });
    await StudentPackage.destroy({ where: {} });
    await Package.destroy({ where: {} });
    await Student.destroy({ where: {} });
    
    // Delete all non-admin users
    await User.destroy({
      where: {
        role: {
          [Op.ne]: 'admin'
        }
      }
    });

    console.log('Database reset completed successfully!');
    console.log('Admin credentials preserved');
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  const db = require('../models');
  
  db.sequelize.sync({ force: false }).then(() => {
    console.log('Database synchronized');
    resetDatabase().then(() => {
      console.log('Reset complete, closing connection');
      db.sequelize.close();
    });
  }).catch(err => {
    console.error('Error synchronizing database:', err);
  });
}

module.exports = resetDatabase; 