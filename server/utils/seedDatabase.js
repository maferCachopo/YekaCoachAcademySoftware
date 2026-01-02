require('dotenv').config();
const bcrypt = require('bcrypt');
const { User, Student, Package, StudentPackage, Class, StudentClass } = require('../models');
const moment = require('moment');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      password: 'admin123', // Will be hashed by the beforeCreate hook
      email: 'admin@yekacouchacademy.com',
      role: 'admin'
    });

    console.log('Admin user created:', adminUser.username);

    // Create packages
    const packages = await Package.bulkCreate([
      {
        name: 'Basic',
        description: 'Starter package for beginners',
        totalClasses: 4,
        durationMonths: 1,
        maxReschedules: 1,
        price: 120.00,
        active: true
      },
      {
        name: 'Standard',
        description: 'Our most popular package',
        totalClasses: 8,
        durationMonths: 1,
        maxReschedules: 2,
        price: 200.00,
        active: true
      },
      {
        name: 'Premium',
        description: 'Advanced package for serious students',
        totalClasses: 12,
        durationMonths: 1,
        maxReschedules: 3,
        price: 300.00,
        active: true
      }
    ]);

    console.log('Packages created:', packages.length);

    // Create a sample student user
    const studentUser = await User.create({
      username: 'student',
      password: 'student123', // Will be hashed by the beforeCreate hook
      email: 'student@example.com',
      role: 'student'
    });

    console.log('Student user created:', studentUser.username);

    // Create student profile
    const student = await Student.create({
      userId: studentUser.id,
      name: 'John',
      surname: 'Doe',
      phone: '+1 (555) 123-4567',
      city: 'New York',
      country: 'USA',
      joinDate: new Date(),
      active: true
    });

    console.log('Student profile created:', student.name, student.surname);

    // Assign a package to the student
    const studentPackage = await StudentPackage.create({
      studentId: student.id,
      packageId: 2, // Standard package
      startDate: moment().format('YYYY-MM-DD'),
      endDate: moment().add(1, 'month').format('YYYY-MM-DD'),
      remainingClasses: 8,
      usedReschedules: 0,
      status: 'active',
      paymentStatus: 'paid'
    });

    console.log('Package assigned to student:', studentPackage.id);

    // Create some classes
    const today = moment();
    const classes = await Class.bulkCreate([
      {
        title: 'Vocal Basics',
        description: 'Learn the fundamentals of singing',
        date: today.add(1, 'day').format('YYYY-MM-DD'),
        startTime: '09:00:00',
        endTime: '10:00:00',
        maxStudents: 1,
        status: 'scheduled'
      },
      {
        title: 'Intermediate Techniques',
        description: 'Focus on breath control and pitch',
        date: today.add(1, 'day').format('YYYY-MM-DD'),
        startTime: '14:00:00',
        endTime: '15:00:00',
        maxStudents: 1,
        status: 'scheduled'
      },
      {
        title: 'Advanced Performance',
        description: 'Stage presence and performance tips',
        date: today.add(2, 'days').format('YYYY-MM-DD'),
        startTime: '10:00:00',
        endTime: '11:00:00',
        maxStudents: 1,
        status: 'scheduled'
      },
      {
        title: 'Song Interpretation',
        description: 'Learn to express emotion through your singing',
        date: today.add(3, 'days').format('YYYY-MM-DD'),
        startTime: '15:00:00',
        endTime: '16:00:00',
        maxStudents: 1,
        status: 'scheduled'
      }
    ]);

    console.log('Classes created:', classes.length);

    // Assign the student to some classes
    const studentClasses = await StudentClass.bulkCreate([
      {
        studentId: student.id,
        classId: 1,
        studentPackageId: studentPackage.id,
        status: 'scheduled',
        canReschedule: true
      },
      {
        studentId: student.id,
        classId: 3,
        studentPackageId: studentPackage.id,
        status: 'scheduled',
        canReschedule: true
      }
    ]);

    console.log('Student assigned to classes:', studentClasses.length);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  const db = require('../models');
  
  db.sequelize.sync({ force: true }).then(() => {
    console.log('Database synchronized');
    seedDatabase().then(() => {
      console.log('Seeding complete, closing connection');
      db.sequelize.close();
    });
  }).catch(err => {
    console.error('Error synchronizing database:', err);
  });
}

module.exports = seedDatabase; 