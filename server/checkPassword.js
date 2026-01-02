const { User } = require('./models');
const bcrypt = require('bcrypt');

async function checkUserPassword() {
  try {
    // Get the user with ID 20
    const user = await User.findByPk(20);
    
    if (!user) {
      console.log('User with ID 20 not found');
      return;
    }
    
    console.log('User found:', {
      id: user.id,
      username: user.username,
      email: user.email,
      // Don't log the full hash for security
      passwordHash: user.password.substring(0, 20) + '...'
    });
    
    // Check if 123456 is the correct password
    const testPassword = '123456';
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);
    
    console.log(`Is password "${testPassword}" valid? ${isPasswordValid}`);
    
    // Manually hash 123456 and update user's password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testPassword, salt);
    
    console.log('New password hash created');
    
    // Update password directly (skip hooks)
    await User.update(
      { password: hashedPassword },
      { 
        where: { id: 20 },
        individualHooks: false
      }
    );
    
    console.log(`Password for user ID 20 has been reset to "${testPassword}"`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

checkUserPassword(); 