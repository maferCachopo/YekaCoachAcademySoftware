const express = require('express');
const { RescheduleClass, Student, Class, StudentClass, StudentPackage, Package } = require('../models');
const { verifyToken, isSelfOrAdmin, isAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');
const moment = require('moment');

const router = express.Router();

// Create a new reschedule record (used by both API and direct client requests)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { studentId, oldClassId, newClassData, reason, teacherId, differentTeacher } = req.body;
    
    // Validate input
    if (!studentId || !oldClassId || !newClassData) {
      return res.status(400).json({ 
        message: 'Student ID, old class ID, and new class data are required' 
      });
    }
    
    // Verify student exists
    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: StudentPackage,
          as: 'packages',
          where: { status: 'active' },
          required: false,
          include: [
            {
              model: Package,
              as: 'package'
            }
          ]
        }
      ]
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Verify old class exists and belongs to student
    const oldStudentClass = await StudentClass.findOne({
      where: { 
        studentId, 
        classId: oldClassId,
        status: { [Op.in]: ['scheduled'] } // Only allow rescheduling scheduled classes
      },
      include: [
        {
          model: Class,
          as: 'classDetail'
        }
      ]
    });
    
    if (!oldStudentClass) {
      return res.status(404).json({ 
        message: 'Class not found or not eligible for rescheduling'
      });
    }
    
    // Get student's active package
    const activePackage = student.packages && student.packages.length > 0 
      ? student.packages[0] 
      : null;
    
    if (!activePackage) {
      return res.status(400).json({ 
        message: 'Student has no active package'
      });
    }
    
    // Check if student has reschedule credits remaining
    if (activePackage.usedReschedules >= activePackage.package.maxReschedules) {
      return res.status(400).json({ 
        message: 'No reschedule credits remaining in the active package' 
      });
    }
    
    // Check timing (at least 2 hours before class)
    const classDate = moment(`${oldStudentClass.classDetail.date} ${oldStudentClass.classDetail.startTime}`, 'YYYY-MM-DD HH:mm:ss');
    const now = moment();
    const hoursDifference = classDate.diff(now, 'hours', true);
    
    if (hoursDifference < 2) {
      return res.status(400).json({ 
        message: 'Classes can only be rescheduled at least 2 hours before they start' 
      });
    }
    
    // First, try to find if the new class slot exists in the database
    let newClass;
    
    if (newClassData.id) {
      // If an ID is provided, look up the class
      newClass = await Class.findByPk(newClassData.id);
    } else {
      // Otherwise, find or create a class slot for the specified time
      const [createdClass, created] = await Class.findOrCreate({
        where: {
          date: newClassData.date,
          startTime: newClassData.startTime,
          endTime: newClassData.endTime || moment(newClassData.startTime, 'HH:mm:ss').add(1, 'hour').format('HH:mm:ss'),
          status: 'scheduled'
        },
        defaults: {
          title: newClassData.title || 'Individual Class',
          description: newClassData.description || `Rescheduled class for student ${student.name}`,
          maxStudents: 1,
          teacherId: teacherId // Use the specified teacher ID if provided
        }
      });
      
      newClass = createdClass;
    }
    
    if (!newClass) {
      return res.status(404).json({ message: 'New class slot not found or could not be created' });
    }
    
    // Check if this is a different teacher reschedule
    const oldTeacherId = oldStudentClass.classDetail.teacherId;
    const isDifferentTeacher = differentTeacher || (teacherId && oldTeacherId && teacherId !== oldTeacherId);
    
    // Create reschedule record with differentTeacher flag
    const rescheduleRecord = await RescheduleClass.create({
      studentId,
      oldClassId: oldClassId,
      newClassId: newClass.id,
      rescheduledAt: new Date(),
      reason: reason || 'Student rescheduled',
      studentPackageId: activePackage.id,
      differentTeacher: isDifferentTeacher, // Set the differentTeacher flag
      status: 'confirmed'
    });
    
    // Update the old class status to 'rescheduled'
    oldStudentClass.status = 'rescheduled';
    oldStudentClass.canReschedule = false;
    
    // Add information about the different teacher if applicable
    if (isDifferentTeacher) {
      oldStudentClass.notes = `Rescheduled to class #${newClass.id} on ${moment(newClass.date).format('MMM DD, YYYY')} with a different teacher`;
    } else {
      oldStudentClass.notes = `Rescheduled to class #${newClass.id} on ${moment(newClass.date).format('MMM DD, YYYY')}`;
    }
    
    await oldStudentClass.save();
    
    // Update teacher ID if provided and not already set
    if (teacherId && !newClass.teacherId) {
      newClass.teacherId = teacherId;
      await newClass.save();
    }

    // Create a new student-class association for the new class
    const newStudentClass = await StudentClass.create({
      studentId,
      classId: newClass.id,
      studentPackageId: activePackage.id,
      status: 'scheduled',
      canReschedule: false, // Can't reschedule a rescheduled class
      originalClassId: oldClassId,
      notes: isDifferentTeacher 
        ? `Rescheduled from class #${oldClassId} with a different teacher` 
        : `Rescheduled from class #${oldClassId}`
    });
    
    // Update the student package used reschedules count
    activePackage.usedReschedules += 1;
    await activePackage.save();
    
    return res.status(201).json({
      message: isDifferentTeacher
        ? 'Class rescheduled successfully with a different teacher'
        : 'Class rescheduled successfully',
      reschedule: rescheduleRecord,
      oldClass: oldStudentClass,
      newClass: {
        ...newClass.toJSON(),
        studentClass: newStudentClass
      },
      differentTeacher: isDifferentTeacher
    });
  } catch (error) {
    console.error('Create reschedule error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all reschedules for a student
router.get('/student/:studentId', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const reschedules = await RescheduleClass.findAll({
      where: { studentId },
      include: [
        {
          model: Class,
          as: 'oldClass'
        },
        {
          model: Class,
          as: 'newClass'
        },
        {
          model: StudentPackage,
          as: 'studentPackage',
          include: [
            {
              model: Package,
              as: 'package'
            }
          ]
        }
      ],
      order: [['rescheduledAt', 'DESC']]
    });
    
    return res.json(reschedules);
  } catch (error) {
    console.error('Get student reschedules error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all reschedules (admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const reschedules = await RescheduleClass.findAll({
      include: [
        {
          model: Student,
          as: 'student'
        },
        {
          model: Class,
          as: 'oldClass'
        },
        {
          model: Class,
          as: 'newClass'
        }
      ],
      order: [['rescheduledAt', 'DESC']]
    });
    
    return res.json(reschedules);
  } catch (error) {
    console.error('Get all reschedules error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update reschedule status (admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        message: 'Valid status (pending, confirmed, cancelled) is required' 
      });
    }
    
    const reschedule = await RescheduleClass.findByPk(id);
    
    if (!reschedule) {
      return res.status(404).json({ message: 'Reschedule record not found' });
    }
    
    // Update the status
    reschedule.status = status;
    await reschedule.save();
    
    // If cancelled, need to update the related classes
    if (status === 'cancelled') {
      // Find the related student classes
      const oldStudentClass = await StudentClass.findOne({
        where: { 
          studentId: reschedule.studentId, 
          classId: reschedule.oldClassId,
          status: 'rescheduled'
        }
      });
      
      const newStudentClass = await StudentClass.findOne({
        where: { 
          studentId: reschedule.studentId, 
          classId: reschedule.newClassId,
          status: 'scheduled'
        }
      });
      
      // Revert the old class to scheduled
      if (oldStudentClass) {
        oldStudentClass.status = 'scheduled';
        oldStudentClass.canReschedule = true;
        oldStudentClass.notes = 'Reinstated after cancelled reschedule';
        await oldStudentClass.save();
      }
      
      // Cancel the new class
      if (newStudentClass) {
        newStudentClass.status = 'cancelled';
        newStudentClass.notes = 'Cancelled due to reschedule cancellation';
        await newStudentClass.save();
      }
      
      // Decrement the used reschedules count in the student package
      const studentPackage = await StudentPackage.findByPk(reschedule.studentPackageId);
      if (studentPackage) {
        studentPackage.usedReschedules = Math.max(0, studentPackage.usedReschedules - 1);
        await studentPackage.save();
      }
    }
    
    return res.json({
      message: 'Reschedule status updated successfully',
      reschedule
    });
  } catch (error) {
    console.error('Update reschedule status error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a reschedule record (admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const reschedule = await RescheduleClass.findByPk(id);
    
    if (!reschedule) {
      return res.status(404).json({ message: 'Reschedule record not found' });
    }
    
    await reschedule.destroy();
    
    return res.json({
      message: 'Reschedule record deleted successfully'
    });
  } catch (error) {
    console.error('Delete reschedule error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 