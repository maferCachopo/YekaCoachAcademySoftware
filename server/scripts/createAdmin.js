const { User } = require('../models');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: {
        username: 'admin'
      }
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123!', salt);

    const admin = await User.create({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@yekacouchacademy.com',
      role: 'admin'
    });

    console.log('Admin user created successfully:', {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser(); 