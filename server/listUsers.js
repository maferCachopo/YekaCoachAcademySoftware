const { User, Student } = require('./models');

async function listUsers() {
  try {
    // Get all users
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role']
    });
    
    console.log(`Total users in database: ${users.length}`);
    
    // Display all users
    users.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
    });
    
    // Try to find student with ID 19 (since you mentioned that was the student ID)
    const student = await Student.findByPk(19, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }]
    });
    
    if (student) {
      console.log('\nFound student with ID 19:');
      console.log(`Student: ${student.name} ${student.surname}`);
      console.log(`User ID: ${student.userId}`);
      if (student.user) {
        console.log(`Username: ${student.user.username}, Email: ${student.user.email}`);
      }
    } else {
      console.log('\nStudent with ID 19 not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

listUsers(); 