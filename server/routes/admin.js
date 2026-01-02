const express = require('express');
const { Student, User, StudentPackage, Package, Class, StudentClass, RescheduleClass, Teacher } = require('../models');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');
const { updateClassStatus, updateStudentClassStatus } = require('../utils/scheduler');
const moment = require('moment-timezone');
const timezoneUtils = require('../utils/timezoneUtils');

const router = express.Router();

// Apply verifyToken middleware to all routes first
router.use(verifyToken);

// Verify admin role for all routes
router.use(isAdmin);

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    // Get total students count
    const totalStudents = await Student.count();
    
    // Get active packages count
    const activePackages = await StudentPackage.count({
      where: { status: 'active' }
    });
    
    // Get classes scheduled for today
    const today = new Date().toISOString().split('T')[0];
    const classesToday = await Class.count({
      where: {
        date: today
      }
    });
    
    res.json({
      totalStudents,
      activePackages,
      classesToday
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get global teacher schedule view (all teachers together)
router.get('/teachers/schedule', async (req, res) => {
  try {
    const { startDate, endDate, teacherId } = req.query;
    
    // Build the where clause for date filtering
    let where = {};
    
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
      // Default to current week if no dates provided
      const today = moment().startOf('day');
      const startOfWeek = today.clone().startOf('week').format('YYYY-MM-DD');
      const endOfWeek = today.clone().endOf('week').format('YYYY-MM-DD');
      
      where.date = {
        [Op.between]: [startOfWeek, endOfWeek]
      };
    }
    
    // Build the query options
    const queryOptions = {
      where,
      include: [
        {
          model: Student,
          as: 'students',
          through: {
            attributes: ['status']
          },
          include: [
            {
              model: Teacher,
              as: 'teachers',
              through: {
                where: { active: true },
                attributes: []
              },
              attributes: ['id', 'firstName', 'lastName'],
              required: false
            }
          ]
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ],
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ]
    };
    
    // If teacher filter is provided, we need to handle it specially
    if (teacherId) {
      // We need to find classes where either:
      // 1. The class has the teacherId directly assigned
      // 2. The class has a student who is assigned to the teacher
      
      // First, get all classes with direct teacher assignment
      const directlyAssignedClasses = await Class.findAll({
        ...queryOptions,
        where: {
          ...where,
          teacherId
        }
      });
      
      // Then, get all classes where students are assigned to this teacher
      const studentAssignedClasses = await Class.findAll({
        ...queryOptions,
        include: [
          {
            model: Student,
            as: 'students',
            through: {
              attributes: ['status']
            },
            include: [
              {
                model: Teacher,
                as: 'teachers',
                through: {
                  where: { active: true },
                  attributes: []
                },
                where: { id: teacherId },
                attributes: ['id', 'firstName', 'lastName'],
                required: true
              }
            ],
            required: true
          },
          {
            model: Teacher,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName'],
            required: false
          }
        ]
      });
      
      // Combine and deduplicate the results
      const allClassIds = new Set();
      const combinedClasses = [];
      
      // Process directly assigned classes
      for (const classItem of directlyAssignedClasses) {
        const classData = classItem.toJSON();
        allClassIds.add(classData.id);
        combinedClasses.push(classData);
      }
      
      // Process student-assigned classes
      for (const classItem of studentAssignedClasses) {
        const classData = classItem.toJSON();
        if (!allClassIds.has(classData.id)) {
          allClassIds.add(classData.id);
          combinedClasses.push(classData);
        }
      }
      
      // Process classes to ensure teacher information is available
      const processedClasses = combinedClasses.map(classData => {
        // If class doesn't have a teacher directly assigned but student has an assigned teacher
        if (!classData.teacher && classData.students && classData.students.length > 0) {
          // Find the first student with an assigned teacher
          for (const student of classData.students) {
            if (student.teachers && student.teachers.length > 0) {
              classData.teacher = student.teachers[0];
              break;
            }
          }
        }
        
        return classData;
      });
      
      return res.json(processedClasses);
    }
    
    // If no teacher filter, proceed with normal query
    const classes = await Class.findAll(queryOptions);
    
    // Process classes to ensure teacher information is available
    const processedClasses = classes.map(classItem => {
      const classData = classItem.toJSON();
      
      // If class doesn't have a teacher directly assigned but student has an assigned teacher
      if (!classData.teacher && classData.students && classData.students.length > 0) {
        // Find the first student with an assigned teacher
        for (const student of classData.students) {
          if (student.teachers && student.teachers.length > 0) {
            classData.teacher = student.teachers[0];
            break;
          }
        }
      }
      
      return classData;
    });
    
    res.json(processedClasses);
  } catch (error) {
    console.error('Get teacher schedule error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get given classes (classes that have been held)
router.get('/teachers/given-classes', async (req, res) => {
  try {
    const { startDate, endDate, teacherId } = req.query;
    
    // Build the where clause
    let where = {
      status: 'completed' // Only get completed classes
    };
    
    // Date filtering
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
      // Default to current day if no dates provided
      const today = moment().format('YYYY-MM-DD');
      where.date = {
        [Op.eq]: today
      };
    }
    
    // Build the query options
    const queryOptions = {
      where,
      include: [
        {
          model: Student,
          as: 'students',
          through: {
            attributes: ['status', 'feedback']
          },
          include: [
            {
              model: Teacher,
              as: 'teachers',
              through: {
                where: { active: true },
                attributes: []
              },
              attributes: ['id', 'firstName', 'lastName'],
              required: false
            }
          ]
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ],
      order: [
        ['date', 'DESC'],
        ['startTime', 'DESC']
      ]
    };
    
    // If teacher filter is provided, we need to handle it specially
    if (teacherId) {
      // We need to find classes where either:
      // 1. The class has the teacherId directly assigned
      // 2. The class has a student who is assigned to the teacher
      
      // First, get all classes with direct teacher assignment
      const directlyAssignedClasses = await Class.findAll({
        ...queryOptions,
        where: {
          ...where,
          teacherId
        }
      });
      
      // Then, get all classes where students are assigned to this teacher
      const studentAssignedClasses = await Class.findAll({
        ...queryOptions,
        include: [
          {
            model: Student,
            as: 'students',
            through: {
              attributes: ['status', 'feedback']
            },
            include: [
              {
                model: Teacher,
                as: 'teachers',
                through: {
                  where: { active: true },
                  attributes: []
                },
                where: { id: teacherId },
                attributes: ['id', 'firstName', 'lastName'],
                required: true
              }
            ],
            required: true
          },
          {
            model: Teacher,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName'],
            required: false
          }
        ]
      });
      
      // Combine and deduplicate the results
      const allClassIds = new Set();
      const combinedClasses = [];
      
      // Process directly assigned classes
      for (const classItem of directlyAssignedClasses) {
        const classData = classItem.toJSON();
        allClassIds.add(classData.id);
        combinedClasses.push(classData);
      }
      
      // Process student-assigned classes
      for (const classItem of studentAssignedClasses) {
        const classData = classItem.toJSON();
        if (!allClassIds.has(classData.id)) {
          allClassIds.add(classData.id);
          combinedClasses.push(classData);
        }
      }
      
      // Process classes to ensure teacher information is available
      const processedClasses = combinedClasses.map(classData => {
        // If class doesn't have a teacher directly assigned but student has an assigned teacher
        if (!classData.teacher && classData.students && classData.students.length > 0) {
          // Find the first student with an assigned teacher
          for (const student of classData.students) {
            if (student.teachers && student.teachers.length > 0) {
              classData.teacher = student.teachers[0];
              break;
            }
          }
        }
        
        return classData;
      });
      
      return res.json(processedClasses);
    }
    
    // If no teacher filter, proceed with normal query
    const classes = await Class.findAll(queryOptions);
    
    // Process classes to ensure teacher information is available
    const processedClasses = classes.map(classItem => {
      const classData = classItem.toJSON();
      
      // If class doesn't have a teacher directly assigned but student has an assigned teacher
      if (!classData.teacher && classData.students && classData.students.length > 0) {
        // Find the first student with an assigned teacher
        for (const student of classData.students) {
          if (student.teachers && student.teachers.length > 0) {
            classData.teacher = student.teachers[0];
            break;
          }
        }
      }
      
      return classData;
    });
    
    res.json(processedClasses);
  } catch (error) {
    console.error('Get given classes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get upcoming classes for the next 7 days
router.get('/upcoming-classes', async (req, res) => {
  try {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);
    
    const classes = await Class.findAll({
      where: {
        date: {
          [Op.between]: [today.toISOString().split('T')[0], next7Days.toISOString().split('T')[0]]
        },
        status: 'scheduled'
      },
      include: [
        {
          model: Student,
          as: 'students'
        }
      ],
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ]
    });
    
    return res.json(classes);
  } catch (error) {
    console.error('Get upcoming classes error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get students whose packages are about to expire (next 7 days)
router.get('/expiring-packages', async (req, res) => {
  try {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);
    
    const expiringPackages = await StudentPackage.findAll({
      where: {
        status: 'active',
        endDate: {
          [Op.between]: [today.toISOString().split('T')[0], next7Days.toISOString().split('T')[0]]
        }
      },
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['username', 'email']
            }
          ]
        },
        {
          model: Package,
          as: 'package'
        }
      ]
    });
    
    return res.json(expiringPackages);
  } catch (error) {
    console.error('Get expiring packages error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get students with low remaining classes (3 or fewer)
router.get('/low-class-count', async (req, res) => {
  try {
    const lowClassPackages = await StudentPackage.findAll({
      where: {
        status: 'active',
        remainingClasses: {
          [Op.lte]: 3,
          [Op.gt]: 0
        }
      },
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['username', 'email']
            }
          ]
        },
        {
          model: Package,
          as: 'package'
        }
      ]
    });
    
    return res.json(lowClassPackages);
  } catch (error) {
    console.error('Get low class count error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recently completed classes with pending feedback
router.get('/pending-feedback', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const completedClasses = await Class.findAll({
      where: {
        status: 'completed',
        date: {
          [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0]
        }
      },
      include: [
        {
          model: Student,
          as: 'students',
          through: {
            where: {
              status: 'attended',
              feedback: null
            }
          }
        }
      ],
      order: [['date', 'DESC']]
    });
    
    return res.json(completedClasses);
  } catch (error) {
    console.error('Get pending feedback error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Endpoint to manually update class statuses and remaining classes
router.post('/update-class-status', async (req, res) => {
  try {
    await updateClassStatus();
    
    res.status(200).json({ 
      success: true, 
      message: 'Class statuses and remaining classes updated successfully' 
    });
  } catch (error) {
    console.error('Error updating class statuses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating class statuses', 
      error: error.message 
    });
  }
});

// Endpoint to update a specific student's class statuses
router.post('/update-student-classes/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Verify student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found'
      });
    }
    
    // Update the student's class statuses
    const updatedCount = await updateStudentClassStatus(studentId);
    
    res.status(200).json({ 
      success: true, 
      message: `${updatedCount} class(es) updated for student`,
      updatedCount
    });
  } catch (error) {
    console.error('Error updating student class statuses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating student class statuses', 
      error: error.message 
    });
  }
});

// Get all rescheduled classes for admin dashboard
router.get('/rescheduled-classes', async (req, res) => {
  try {
    // Get user timezone if available
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) {
      userTimezone = req.user.timezone;
    }
    
    const reschedules = await RescheduleClass.findAll({
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'surname']
        },
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
        },
        {
          model: Teacher,
          as: 'oldTeacher'
        },
        {
          model: Teacher,
          as: 'newTeacher'
        }
      ],
      order: [['rescheduledAt', 'DESC']]
    });
    
    // Add timezone-converted dates and teacher information
    const enhancedReschedules = reschedules.map(reschedule => {
      const rescheduleData = reschedule.toJSON();
      
      // Convert times from admin to user timezone
      if (rescheduleData.oldClass) {
        const oldClassUserTime = timezoneUtils.convertFromAdminToUserTimezone(
          rescheduleData.oldClass.date,
          rescheduleData.oldClass.startTime,
          userTimezone
        );
        rescheduleData.oldClass.userDate = oldClassUserTime.date;
        rescheduleData.oldClass.userStartTime = oldClassUserTime.time;
      }
      
      if (rescheduleData.newClass) {
        const newClassUserTime = timezoneUtils.convertFromAdminToUserTimezone(
          rescheduleData.newClass.date,
          rescheduleData.newClass.startTime,
          userTimezone
        );
        rescheduleData.newClass.userDate = newClassUserTime.date;
        rescheduleData.newClass.userStartTime = newClassUserTime.time;
      }
      
      // Add teacher name information if available
      if (rescheduleData.oldTeacher) {
        rescheduleData.oldTeacherName = `${rescheduleData.oldTeacher.firstName} ${rescheduleData.oldTeacher.lastName}`;
      }
      
      if (rescheduleData.newTeacher) {
        rescheduleData.newTeacherName = `${rescheduleData.newTeacher.firstName} ${rescheduleData.newTeacher.lastName}`;
      }
      
      // Add timezone information
      rescheduleData.adminTimezone = timezoneUtils.ADMIN_TIMEZONE;
      rescheduleData.userTimezone = userTimezone;
      
      return rescheduleData;
    });
    
    return res.json(enhancedReschedules);
  } catch (error) {
    console.error('Get all reschedules error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit a reschedule record to the database (for admin-initiated reschedules)
router.post('/reschedules', async (req, res) => {
  try {
    const { studentId, oldClassId, newClassId, reason } = req.body;
    
    // Validate input
    if (!studentId || !oldClassId || !newClassId) {
      return res.status(400).json({ 
        message: 'Student ID, old class ID, and new class ID are required' 
      });
    }
    
    // Forward to the reschedules service
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/reschedules/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({
        studentId,
        oldClassId,
        newClassData: { id: newClassId },
        reason: reason || 'Admin rescheduled'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }
    
    const result = await response.json();
    return res.status(201).json(result);
  } catch (error) {
    console.error('Admin reschedule error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update class teacherId based on student-teacher assignments
router.post('/update-class-teachers', async (req, res) => {
  try {
    // Find all classes that don't have a teacherId set
    const classesWithoutTeacher = await Class.findAll({
      where: {
        teacherId: null
      },
      include: [
        {
          model: Student,
          as: 'students',
          include: [
            {
              model: Teacher,
              as: 'teachers',
              through: {
                where: { active: true }
              }
            }
          ]
        }
      ]
    });

    console.log(`Found ${classesWithoutTeacher.length} classes without a teacher assigned`);
    
    // Keep track of updated classes
    const updatedClasses = [];
    
    // For each class, check if students have assigned teachers
    for (const classItem of classesWithoutTeacher) {
      // Skip if no students
      if (!classItem.students || classItem.students.length === 0) {
        continue;
      }
      
      // Find the first student with an assigned teacher
      for (const student of classItem.students) {
        if (student.teachers && student.teachers.length > 0) {
          // Update the class with the teacher ID
          await classItem.update({
            teacherId: student.teachers[0].id
          });
          
          updatedClasses.push({
            classId: classItem.id,
            teacherId: student.teachers[0].id,
            teacherName: `${student.teachers[0].firstName} ${student.teachers[0].lastName}`
          });
          
          break; // Stop after finding the first teacher
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Updated ${updatedClasses.length} classes with teacher assignments`,
      updatedClasses
    });
  } catch (error) {
    console.error('Update class teachers error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 