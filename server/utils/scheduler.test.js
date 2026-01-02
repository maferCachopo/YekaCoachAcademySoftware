const { updateClassStatus } = require('./scheduler');
const db = require('../models');
const { Class, StudentClass, StudentPackage } = db;

/**
 * This is a simple test framework to manually test the class status update functionality
 * Run with: node utils/scheduler.test.js
 */
async function testUpdateClassStatus() {
  try {
    console.log('Starting scheduler test...');
    
    // Mock a class that has passed its end time
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Create a test class
    const testClass = await Class.create({
      title: 'Test Class',
      description: 'Test class for scheduler',
      date: yesterday.toISOString().split('T')[0],
      startTime: '10:00:00',
      endTime: '11:00:00',
      maxStudents: 1,
      status: 'scheduled'
    });
    
    console.log(`Created test class with ID: ${testClass.id}`);
    
    // Create a test package
    const testPackage = await db.Package.create({
      name: 'Test Package',
      description: 'Test package for scheduler',
      totalClasses: 10,
      durationMonths: 1,
      maxReschedules: 2,
      price: 100,
      active: true
    });
    
    console.log(`Created test package with ID: ${testPackage.id}`);
    
    // Create a test student
    const testUser = await db.User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'student'
    });
    
    const testStudent = await db.Student.create({
      userId: testUser.id,
      name: 'Test',
      surname: 'Student',
      phone: '1234567890',
      city: 'Test City',
      country: 'Test Country',
      active: true
    });
    
    console.log(`Created test student with ID: ${testStudent.id}`);
    
    // Create a test student package
    const testStudentPackage = await StudentPackage.create({
      studentId: testStudent.id,
      packageId: testPackage.id,
      startDate: yesterday.toISOString().split('T')[0],
      endDate: new Date(yesterday.setMonth(yesterday.getMonth() + 1)).toISOString().split('T')[0],
      remainingClasses: 10,
      usedReschedules: 0,
      status: 'active',
      paymentStatus: 'paid'
    });
    
    console.log(`Created test student package with ID: ${testStudentPackage.id}`);
    
    // Create a test student class
    const testStudentClass = await StudentClass.create({
      studentId: testStudent.id,
      classId: testClass.id,
      studentPackageId: testStudentPackage.id,
      status: 'scheduled',
      canReschedule: true
    });
    
    console.log(`Created test student class with ID: ${testStudentClass.id}`);
    
    // Run the update class status function
    console.log('Running updateClassStatus...');
    await updateClassStatus();
    
    // Check if the class status has been updated
    const updatedClass = await Class.findByPk(testClass.id);
    console.log(`Updated class status: ${updatedClass.status}`);
    
    // Check if the student class status has been updated
    const updatedStudentClass = await StudentClass.findByPk(testStudentClass.id);
    console.log(`Updated student class status: ${updatedStudentClass.status}`);
    
    // Check if the student package remaining classes has been decremented
    const updatedStudentPackage = await StudentPackage.findByPk(testStudentPackage.id);
    console.log(`Updated student package remaining classes: ${updatedStudentPackage.remainingClasses}`);
    
    // Cleanup (optional)
    console.log('Cleaning up test data...');
    await testStudentClass.destroy();
    await testStudentPackage.destroy();
    await testStudent.destroy();
    await testUser.destroy();
    await testClass.destroy();
    await testPackage.destroy();
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testUpdateClassStatus(); 