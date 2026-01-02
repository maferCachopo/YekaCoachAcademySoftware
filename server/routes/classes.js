const express = require('express');
const { Class, Student, StudentClass, StudentPackage, sequelize } = require('../models');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get all classes (with filters)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { date, startDate, endDate, status } = req.query;
    
    let where = {};
    
    // Filter by specific date
    if (date) {
      where.date = date;
    }
    
    // Filter by date range
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      where.date = {
        [Op.lte]: endDate
      };
    }
    
    // Filter by status
    if (status) {
      where.status = status;
    }
    
    const classes = await Class.findAll({
      where,
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ]
    });
    
    return res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get class by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const classData = await Class.findByPk(id, {
      include: [
        {
          model: Student,
          as: 'students'
        }
      ]
    });
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    return res.json(classData);
  } catch (error) {
    console.error('Get class error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create class (admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      date, 
      startTime, 
      endTime, 
      maxStudents 
    } = req.body;
    
    // Validate input
    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({ 
        message: 'Title, date, start time, and end time are required' 
      });
    }
    
    // Create class
    const classData = await Class.create({
      title,
      description: description || null,
      date,
      startTime,
      endTime,
      maxStudents: maxStudents || 1,
      status: 'scheduled'
    });
    
    return res.status(201).json({
      message: 'Class created successfully',
      class: classData
    });
  } catch (error) {
    console.error('Create class error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update class (admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      date, 
      startTime, 
      endTime, 
      maxStudents, 
      status 
    } = req.body;
    
    const classData = await Class.findByPk(id);
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Update fields
    if (title) classData.title = title;
    if (description !== undefined) classData.description = description;
    if (date) classData.date = date;
    if (startTime) classData.startTime = startTime;
    if (endTime) classData.endTime = endTime;
    if (maxStudents) classData.maxStudents = maxStudents;
    if (status) classData.status = status;
    
    await classData.save();
    
    return res.json({
      message: 'Class updated successfully',
      class: classData
    });
  } catch (error) {
    console.error('Update class error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get students enrolled in this class
router.get('/:id/students', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const studentClasses = await StudentClass.findAll({
      where: { classId: id },
      include: ['student']
    });
    
    return res.json(studentClasses);
  } catch (error) {
    console.error('Get class students error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark a class as completed (admin only)
router.post('/:id/complete', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { studentFeedback } = req.body; // Array of { studentId, feedback, attended }
    
    const classData = await Class.findByPk(id);
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Mark class as completed
    classData.status = 'completed';
    await classData.save();
    
    // Update student records if feedback is provided
    if (studentFeedback && Array.isArray(studentFeedback)) {
      for (const feedback of studentFeedback) {
        const { studentId, feedbackText, attended } = feedback;
        
        const studentClass = await StudentClass.findOne({
          where: { classId: id, studentId }
        });
        
        if (studentClass) {
          // Update student class status and feedback
          studentClass.status = attended ? 'attended' : 'missed';
          if (feedbackText) {
            studentClass.feedback = feedbackText;
          }
          await studentClass.save();
          
          // If attended, decrement remaining classes in package
          if (attended) {
            const studentPackage = await StudentPackage.findByPk(studentClass.studentPackageId);
            if (studentPackage && studentPackage.remainingClasses > 0) {
              studentPackage.remainingClasses -= 1;
              await studentPackage.save();
            }
          }
        }
      }
    }
    
    return res.json({
      message: 'Class marked as completed successfully',
      class: classData
    });
  } catch (error) {
    console.error('Complete class error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Assign a student to a class (admin only)
router.post('/:id/assign', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, studentPackageId } = req.body;
    
    // Validate input
    if (!studentId || !studentPackageId) {
      return res.status(400).json({ 
        message: 'Student ID and student package ID are required' 
      });
    }
    
    // Check class exists
    const classData = await Class.findByPk(id);
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check student exists
    const student = await Student.findByPk(studentId);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check package exists and has remaining classes
    const studentPackage = await StudentPackage.findByPk(studentPackageId);
    
    if (!studentPackage) {
      return res.status(404).json({ message: 'Student package not found' });
    }
    
    if (studentPackage.remainingClasses <= 0) {
      return res.status(400).json({ message: 'Student has no remaining classes in this package' });
    }
    
    // Check if student is already assigned to this class
    const existingAssignment = await StudentClass.findOne({
      where: { studentId, classId: id }
    });
    
    if (existingAssignment) {
      return res.status(400).json({ message: 'Student is already assigned to this class' });
    }
    
    // Check class capacity
    const assignedStudents = await StudentClass.count({
      where: { classId: id }
    });
    
    if (assignedStudents >= classData.maxStudents) {
      return res.status(400).json({ message: 'Class is at full capacity' });
    }
    
    // Create student class assignment
    const studentClass = await StudentClass.create({
      studentId,
      classId: id,
      studentPackageId,
      status: 'scheduled',
      canReschedule: true
    });
    
    return res.status(201).json({
      message: 'Student assigned to class successfully',
      studentClass
    });
  } catch (error) {
    console.error('Assign student to class error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available classes for rescheduling
router.get('/available', verifyToken, async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    
    let where = {
      status: 'scheduled'
    };
    
    // Filter by specific date
    if (date) {
      where.date = date;
    }
    
    // Filter by date range
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      where.date = {
        [Op.lte]: endDate
      };
    } else {
      // Default: future classes
      where.date = {
        [Op.gte]: new Date().toISOString().split('T')[0]
      };
    }
    
    const classes = await Class.findAll({
      where,
      attributes: {
        include: [
          [
            // Calculate available slots
            sequelize.literal(`(
              maxStudents - (
                SELECT COUNT(*) 
                FROM StudentClasses 
                WHERE StudentClasses.classId = Class.id
              )
            )`),
            'availableSlots'
          ]
        ]
      },
      having: sequelize.literal('availableSlots > 0'),
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ]
    });
    
    return res.json(classes);
  } catch (error) {
    console.error('Get available classes error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 