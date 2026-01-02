const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User, Student, Teacher, sequelize } = require('../models');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password, loginType } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ where: { username } });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = await user.validPassword(password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Validate user role matches login type
    if (loginType === 'student') {
      if (user.role !== 'student') {
        return res.status(401).json({ 
          message: 'Invalid credentials',
          code: 'WRONG_PORTAL'
        });
      }
    } else if (loginType === 'internal') {
      if (user.role === 'student') {
        return res.status(401).json({ 
          message: 'Invalid credentials',
          code: 'WRONG_PORTAL'
        });
      }
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Prepare response data
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      timezone: user.timezone
    };
    
    // Generate token
    let token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // If teacher, include teacher data
    if (user.role === 'teacher' || user.role === 'coordinator') {
      console.log(`SERVER DEBUG - User ${user.username} is a teacher, fetching teacher data`);
      
      try {
        // Log all teachers to see if any exist
        const allTeachers = await Teacher.findAll();
        console.log(`SERVER DEBUG - Total teachers in database: ${allTeachers.length}`);
        
        // Check if Teacher model is correctly defined
        console.log(`SERVER DEBUG - Teacher model attributes:`, Object.keys(Teacher.rawAttributes));
        
        const teacher = await Teacher.findOne({ 
          where: { userId: user.id },
          attributes: ['id', 'firstName', 'lastName', 'phone', 'isCoordinator', 'active']
        });
        
        console.log(`SERVER DEBUG - Teacher query result:`, teacher ? 'Found' : 'Not found');
        
        if (teacher) {
          console.log(`SERVER DEBUG - Found teacher record for ${user.username}: ID ${teacher.id}, Name: ${teacher.firstName} ${teacher.lastName}`);
          
          // Check if teacher is active
          if (!teacher.active) {
            return res.status(403).json({ message: 'Your account has been deactivated by the administrator. Please contact support for assistance.' });
          }
          
          userData.teacher = {
            id: teacher.id,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            phone: teacher.phone,
            isCoordinator: teacher.isCoordinator
          };
          
          // Add teacherId to user data as well for easier access
          userData.teacherId = teacher.id;
          userData.firstName = teacher.firstName;
          userData.lastName = teacher.lastName;
          
          // If teacher has coordinator flag, update the role in userData
          if (teacher.isCoordinator) {
            console.log(`SERVER DEBUG - Teacher ${user.username} has coordinator flag, updating role`);
            userData.role = 'coordinator';
          }
          
          // Regenerate token to include teacherId for teacher users
          token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, teacherId: teacher.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );
        } else {
          console.error(`SERVER DEBUG - No teacher record found for user ID ${user.id}`);
        }
      } catch (error) {
        console.error('SERVER DEBUG - Error fetching teacher data:', error);
      }
    }
    
    // If student, include student data
    if (user.role === 'student') {
      try {
        const student = await Student.findOne({ where: { userId: user.id } });
        
        if (student) {
          userData.student = {
            id: student.id,
            name: student.name,
            surname: student.surname,
            birthDate: student.birthDate,
            phone: student.phone,
            zoomLink: student.zoomLink
          };
          
          userData.studentId = student.id;
          userData.firstName = student.name;
          userData.lastName = student.surname;
          
          // Regenerate token to include studentId for student users
          token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, studentId: student.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      }
    }
    
    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout route
router.post('/logout', verifyToken, (req, res) => {
  // In JWT auth, the token is stateless, so actual logout happens client-side
  // by removing the token. This route is for any server-side cleanup needed.
  res.json({ message: 'Logged out successfully' });
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check current password
    const isValidPassword = await user.validPassword(currentPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register student
router.post('/register-student', async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      name,
      surname,
      birthDate,
      phone,
      city,
      country,
      zoomLink,
      allowDifferentTeacher
    } = req.body;
    
    // Validate input
    if (!username || !password || !email || !name || !surname) {
      return res.status(400).json({ message: 'Required fields: username, password, email, name, surname' });
    }
    
    // Check if username or email already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    
    console.log('DEBUG - Creating user and student with data:', {
      username,
      email,
      name,
      surname
    });
    
    // Create user
    const user = await User.create({
      username,
      password,
      email,
      role: 'student',
      timezone: 'UTC'
    });
    
    console.log('DEBUG - User created:', {
      id: user.id,
      username: user.username
    });
    
    // Create student profile
    const student = await Student.create({
      userId: user.id,
      name,
      surname,
      birthDate: birthDate || null,
      phone: phone || null,
      city: city || null,
      country: country || null,
      zoomLink: zoomLink || null,
      allowDifferentTeacher: allowDifferentTeacher || false,
      joinDate: new Date()
    });
    
    console.log('DEBUG - Student created:', {
      id: student.id,
      name: student.name,
      userId: student.userId
    });
    
    return res.status(201).json({
      message: 'Student registered successfully',
      userId: user.id,
      username: user.username,
      studentId: student.id
    });
  } catch (error) {
    console.error('Student registration error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    console.log('SERVER DEBUG - /auth/me called for user:', {
      id: user.id,
      username: user.username,
      role: user.role
    });
    
    // Get fresh user data from the database
    const userData = await User.findByPk(user.id, {
      attributes: ['id', 'username', 'email', 'role', 'timezone']
    });
    
    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prepare response data
    const responseData = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      timezone: userData.timezone
    };
    
    // If teacher, include teacher data
    if (user.role === 'teacher' || user.role === 'coordinator') {
      console.log('SERVER DEBUG - /me - User is a teacher, fetching teacher data');
      
      try {
        // Log all teachers to see if any exist
        const allTeachers = await Teacher.findAll();
        console.log(`SERVER DEBUG - /me - Total teachers in database: ${allTeachers.length}`);
        
        const teacher = await Teacher.findOne({ 
          where: { userId: user.id },
          attributes: ['id', 'firstName', 'lastName', 'phone', 'isCoordinator', 'active']
        });
        
        console.log(`SERVER DEBUG - /me - Teacher query result:`, teacher ? 'Found' : 'Not found');
        
        if (teacher) {
          console.log('SERVER DEBUG - /me - Found teacher record:', {
            teacherId: teacher.id,
            userId: user.id,
            name: `${teacher.firstName} ${teacher.lastName}`
          });
          
          // Check if teacher is active
          if (!teacher.active) {
            return res.status(403).json({ 
              error: 'account_inactive', 
              message: 'Your account has been deactivated by the administrator. Please contact support for assistance.' 
            });
          }
          
          responseData.teacher = {
            id: teacher.id,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            phone: teacher.phone,
            isCoordinator: teacher.isCoordinator
          };
          
          // Add teacherId to user data as well for easier access
          responseData.teacherId = teacher.id;
          responseData.firstName = teacher.firstName;
          responseData.lastName = teacher.lastName;
          
          // If teacher has coordinator flag, update the role
          if (teacher.isCoordinator) {
            console.log('SERVER DEBUG - /me - Teacher has coordinator flag, updating role');
            responseData.role = 'coordinator';
          }
        } else {
          console.error(`SERVER DEBUG - /me - No teacher record found for user ID ${user.id}`);
        }
      } catch (error) {
        console.error('SERVER DEBUG - /me - Error fetching teacher data:', error);
      }
    }
    
    // If student, include student data
    if (user.role === 'student') {
      try {
        const student = await Student.findOne({ where: { userId: user.id } });
        
        if (student) {
          responseData.student = {
            id: student.id,
            name: student.name,
            surname: student.surname,
            birthDate: student.birthDate,
            phone: student.phone,
            zoomLink: student.zoomLink
          };
          
          responseData.studentId = student.id;
          responseData.firstName = student.name;
          responseData.lastName = student.surname;
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      }
    }
    
    res.json(responseData);
  } catch (error) {
    console.error('Error in /auth/me:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset student password (admin only)
router.post('/reset-password/:studentId', verifyToken, isAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { newPassword } = req.body;
    
    // Validate input
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    
    // Find student
    const student = await Student.findByPk(studentId);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Find associated user
    const user = await User.findByPk(student.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found for this student' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user timezone
router.post('/update-timezone', verifyToken, async (req, res) => {
  try {
    const { timezone } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!timezone) {
      return res.status(400).json({ message: 'Timezone is required' });
    }
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update timezone
    user.timezone = timezone;
    await user.save();
    
    res.json({ 
      message: 'Timezone updated successfully',
      timezone: user.timezone
    });
  } catch (error) {
    console.error('Update timezone error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;