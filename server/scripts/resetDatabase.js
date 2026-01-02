const { sequelize, User, Student, StudentPackage, Package, Class, StudentClass } = require('../models');

async function resetDatabase() {
  try {
    console.log('Starting database reset...');
    
    // First, get the admin user so we can preserve it
    console.log('Finding admin user...');
    const adminUser = await User.findOne({
      where: { role: 'admin' }
    });
    
    if (!adminUser) {
      console.error('Admin user not found! Aborting reset.');
      return;
    }
    
    console.log(`Found admin user: ${adminUser.username} (ID: ${adminUser.id})`);
    
    // Delete all relational data first (maintains referential integrity)
    console.log('Deleting StudentClass records...');
    await StudentClass.destroy({ where: {} });
    
    console.log('Deleting StudentPackage records...');
    await StudentPackage.destroy({ where: {} });
    
    console.log('Deleting Class records...');
    await Class.destroy({ where: {} });
    
    console.log('Deleting Student records...');
    await Student.destroy({ where: {} });
    
    // Delete non-admin users
    console.log('Deleting non-admin users...');
    await User.destroy({ 
      where: { 
        role: 'student' 
      } 
    });
    
    // Delete all packages
    console.log('Deleting Package records...');
    await Package.destroy({ where: {} });
    
    console.log('Database reset complete! Only admin user remains.');
    console.log(`Admin credentials: ${adminUser.username}`);
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  resetDatabase().then(() => {
    console.log('Reset completed, closing connection');
    sequelize.close();
    process.exit(0);
  }).catch(err => {
    console.error('Error during reset:', err);
    sequelize.close();
    process.exit(1);
  });
}

module.exports = resetDatabase; 