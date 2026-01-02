const express = require('express');
const { Student, User, StudentPackage, Package, Class, StudentClass, RescheduleClass, Teacher } = require('../models');
const { verifyToken, isAdmin, isSelfOrAdmin, isTeacherForStudent } = require('../middleware/auth');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

// Define admin timezone directly since server doesn't have constants file
const ADMIN_TIMEZONE = process.env.ADMIN_TIMEZONE || 'America/Caracas';
const bcrypt = require('bcrypt');

const router = express.Router();

// Get all students (admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    // Get query parameter for showing inactive students (default to false)
    const showInactive = req.query.showInactive === 'true';
    
    // Create base query - only include active students unless explicitly requested
    const whereClause = !showInactive ? { active: true } : {};
    
    const students = await Student.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'email']
        },
        {
          model: StudentPackage,
          as: 'packages',
          where: { status: 'active' },
          required: false,
          include: [
            {
              model: Package,
              as: 'package',
              attributes: ['name', 'totalClasses', 'maxReschedules']
            }
          ]
        }
      ]
    });
    
    return res.json(students);
  } catch (error) {
    console.error('Get all students error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student by ID
router.get('/:id', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`DEBUG - Getting student by ID: ${id}, requested by user ID: ${req.user.id}`);
    
    const student = await Student.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'email']
        },
        {
          model: StudentPackage,
          as: 'packages',
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
      console.error(`DEBUG - Student with ID ${id} not found`);
      return res.status(404).json({ 
        message: 'Student not found', 
        detail: `No student record exists with ID ${id}` 
      });
    }
    
    console.log(`DEBUG - Found student: ${student.name} ${student.surname}, userId: ${student.userId}`);
    return res.json(student);
  } catch (error) {
    console.error('Get student error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update student
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      surname,
      birthDate,
      phone,
      city,
      country,
      zoomLink,
      active,
      allowDifferentTeacher,
      notes,
      // If we're updating user data too
      updateUser,
      email,
      username,
      password
    } = req.body;

    // Find the student
    const student = await Student.findByPk(id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update student data
    await student.update({
      name: name !== undefined ? name : student.name,
      surname: surname !== undefined ? surname : student.surname,
      birthDate: birthDate !== undefined ? birthDate : student.birthDate,
      phone: phone !== undefined ? phone : student.phone,
      city: city !== undefined ? city : student.city,
      country: country !== undefined ? country : student.country,
      zoomLink: zoomLink !== undefined ? zoomLink : student.zoomLink,
      active: active !== undefined ? active : student.active,
      allowDifferentTeacher: allowDifferentTeacher !== undefined ? allowDifferentTeacher : student.allowDifferentTeacher,
      notes: notes !== undefined ? notes : student.notes
    });

    // If updateUser is true, update the User record as well
    if (updateUser) {
      const user = await User.findByPk(student.userId);

      if (user) {
        const updates = {};

        if (email !== undefined) updates.email = email;
        if (username !== undefined) updates.username = username;

        // Update user data
        await user.update(updates);

        // If password is provided, update it
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await user.update({ password: hashedPassword });
        }
      }
    }

    // Get updated student with user data
    const updatedStudent = await Student.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'email']
        }
      ]
    });

    return res.json(updatedStudent);
  } catch (error) {
    console.error('Update student error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete student (admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the student
    const student = await Student.findByPk(id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Find associated user record
    const user = await User.findByPk(student.userId);
    
    // Start a transaction for atomicity
    const sequelize = Student.sequelize;
    const t = await sequelize.transaction();
    
    try {
      // First, update the student to be inactive (soft delete)
      await student.update({ active: false }, { transaction: t });
      
      // If there's a user record, also mark it as inactive
      if (user) {
        await user.update({ active: false }, { transaction: t });
      }
      
      // Find all student's classes and mark them as cancelled
      const studentClasses = await StudentClass.findAll({
        where: {
          studentId: id,
          status: {
            [Op.notIn]: ['cancelled', 'completed', 'no-show']
          }
        },
        transaction: t
      });
      
      console.log(`Marking ${studentClasses.length} classes as cancelled for deleted student ${id}`);
      
      // Update all classes to be cancelled
      for (const studentClass of studentClasses) {
        await studentClass.update({ 
          status: 'cancelled',
          notes: studentClass.notes ? 
            `${studentClass.notes}\n[SYSTEM] Cancelled due to student deletion` : 
            '[SYSTEM] Cancelled due to student deletion'
        }, { transaction: t });
      }
      
      // Commit the transaction
      await t.commit();
    
    return res.json({
        message: 'Student deleted successfully', 
        studentId: id,
        classesUpdated: studentClasses.length
    });
  } catch (error) {
      // If there's an error, roll back the transaction
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Delete student error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all student classes
router.get('/:id/classes', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, status } = req.query;
    
    // First check if student exists and is active
    const student = await Student.findByPk(id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // If request is from a teacher and the student is inactive, return empty array
    if (req.user.role === 'teacher' && !student.active) {
      console.log(`Teacher ${req.user.id} attempted to access classes for inactive student ${id}`);
      return res.json([]);
    }
    
    const whereClause = { studentId: id };
    
    // Add status filter if provided
    if (status) {
      whereClause.status = status;
    }
    
    // Add date filter if provided
    if (date) {
      const startOfDay = moment.tz(date, ADMIN_TIMEZONE).startOf('day').toDate();
      const endOfDay = moment.tz(date, ADMIN_TIMEZONE).endOf('day').toDate();
      
      whereClause.dateTime = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }
    
    const studentClasses = await StudentClass.findAll({
      where: whereClause,
      include: [
        {
          model: Class,
          as: 'classDetail' // Fixed association alias to match what's defined in the model
        }
        // Removed Teacher inclusion as it's not directly associated
      ],
      order: [
        [{ model: Class, as: 'classDetail' }, 'date', 'ASC'],
        [{ model: Class, as: 'classDetail' }, 'startTime', 'ASC']
      ]
    });
    
    return res.json(studentClasses);
    } catch (error) {
    console.error('Get student classes error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all student packages
router.get('/:id/packages', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const studentPackages = await StudentPackage.findAll({
      where: { studentId: id },
      include: [
        {
          model: Package,
          as: 'package'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.json(studentPackages);
  } catch (error) {
    console.error('Get student packages error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific student package
router.get('/:id/packages/:packageId', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const { id, packageId } = req.params;
    
    // First try to find by StudentPackage.id (if packageId looks like a StudentPackage ID)
    let studentPackage = await StudentPackage.findOne({
      where: { 
        studentId: id,
        id: packageId  // Try finding by StudentPackage.id first
      },
      include: [
        {
          model: Package,
          as: 'package'
        }
      ]
    });
    
    // If not found, try finding by Package.id
    if (!studentPackage) {
      studentPackage = await StudentPackage.findOne({
        where: { 
          studentId: id,
          packageId: packageId  // Try finding by Package.id
        },
        include: [
          {
            model: Package,
            as: 'package'
          }
        ]
      });
    }
    
    if (!studentPackage) {
      return res.status(404).json({ message: 'Student package not found' });
    }
    
    return res.json(studentPackage);
  } catch (error) {
    console.error('Get student package error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a specific student package
router.put('/:id/packages/:packageId', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id, packageId } = req.params;
    const updateData = req.body;
    
    console.log(`DEBUG - Updating student package - Student ID: ${id}, Package ID: ${packageId}`);
    console.log('DEBUG - Update data:', updateData);
    
    // First try to find by StudentPackage.id (if packageId looks like a StudentPackage ID)
    let studentPackage = await StudentPackage.findOne({
      where: { 
        studentId: id,
        id: packageId  // Try finding by StudentPackage.id first
      }
    });
    
    // If not found, try finding by Package.id
    if (!studentPackage) {
      studentPackage = await StudentPackage.findOne({
        where: { 
          studentId: id,
          packageId: packageId  // Try finding by Package.id
        }
      });
    }
    
    if (!studentPackage) {
      console.log(`DEBUG - Student package not found - Student ID: ${id}, Package ID: ${packageId}`);
      return res.status(404).json({ message: 'Student package not found' });
    }
    
    console.log(`DEBUG - Found student package with ID: ${studentPackage.id}`);
    
    // Update the student package
    await studentPackage.update(updateData);
    
    // Return updated package with related data
    const updatedPackage = await StudentPackage.findByPk(studentPackage.id, {
      include: [
        {
          model: Package,
          as: 'package'
        }
      ]
    });
    
    console.log('DEBUG - Student package updated successfully:', updatedPackage.toJSON());
    return res.json(updatedPackage);
  } catch (error) {
    console.error('Update student package error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Deactivate a student package
router.put('/:id/packages/:packageId/deactivate', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id, packageId } = req.params;
    
    console.log(`DEBUG - Deactivating student package - Student ID: ${id}, Package ID: ${packageId}`);
    
    // First try to find by StudentPackage.id (if packageId looks like a StudentPackage ID)
    let studentPackage = await StudentPackage.findOne({
      where: { 
        studentId: id,
        id: packageId  // Try finding by StudentPackage.id first
      }
    });
    
    // If not found, try finding by Package.id
    if (!studentPackage) {
      studentPackage = await StudentPackage.findOne({
        where: { 
          studentId: id,
          packageId: packageId  // Try finding by Package.id
        }
      });
    }
    
    if (!studentPackage) {
      return res.status(404).json({ message: 'Student package not found' });
    }
    
    // Update status to inactive
    await studentPackage.update({ status: 'inactive' });
    
    // Return updated package with related data
    const updatedPackage = await StudentPackage.findByPk(studentPackage.id, {
      include: [
        {
          model: Package,
          as: 'package'
        }
      ]
    });
    
    console.log('DEBUG - Student package deactivated successfully:', updatedPackage.toJSON());
    return res.json(updatedPackage);
  } catch (error) {
    console.error('Deactivate student package error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Assign a package to a student
router.post('/:id/packages', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { packageId, startDate, endDate } = req.body;
    
    // Validate input
    if (!packageId) {
      return res.status(400).json({ message: 'Package ID is required' });
    }
    
    // Check if student exists
    const student = await Student.findByPk(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if package exists
    const packageData = await Package.findByPk(packageId);
    if (!packageData) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    // Calculate start and end dates if not provided
    const packageStartDate = startDate || new Date().toISOString().split('T')[0];
    let packageEndDate = endDate;
    
    // If end date is not provided, calculate based on package duration
    if (!packageEndDate && packageData.durationMonths) {
      const endDateObj = new Date(packageStartDate);
      endDateObj.setMonth(endDateObj.getMonth() + packageData.durationMonths);
      packageEndDate = endDateObj.toISOString().split('T')[0];
    }
    
    // Create student package
    const studentPackage = await StudentPackage.create({
      studentId: id,
      packageId,
      startDate: packageStartDate,
      endDate: packageEndDate,
      status: 'active',
      remainingClasses: packageData.totalClasses,
      rescheduleRemaining: packageData.maxReschedules
    });
    
    // Include package details in response
    const result = await StudentPackage.findByPk(studentPackage.id, {
      include: [
        {
          model: Package,
          as: 'package'
        }
      ]
    });
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Assign package error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Schedule classes for a student
router.post('/:id/schedule', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { packageId, classes } = req.body;
    
    // Validate input
    if (!packageId) {
      return res.status(400).json({ message: 'Package ID is required' });
    }
    
    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({ message: 'Classes array is required' });
    }
    
    // Check if student exists
    const student = await Student.findByPk(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if package exists and is assigned to the student
    const studentPackage = await StudentPackage.findOne({
      where: {
        studentId: id,
        packageId,
        status: 'active'
      }
    });
    
    if (!studentPackage) {
      return res.status(404).json({ message: 'Active package not found for this student' });
    }
    
    // Check if student has enough remaining classes
    if (studentPackage.remainingClasses < classes.length) {
      return res.status(400).json({ 
        message: `Not enough remaining classes. Student has ${studentPackage.remainingClasses} but trying to schedule ${classes.length}` 
      });
    }
    
    // Process each class
    const scheduledClasses = [];
    
    for (const classData of classes) {
      // Validate class data
      if (!classData.date || !classData.startTime || !classData.endTime) {
        return res.status(400).json({ 
          message: 'Each class must have date, startTime, and endTime' 
        });
      }
      
      // Create or find class slot
      const [classSlot, created] = await Class.findOrCreate({
        where: {
          date: classData.date,
          startTime: classData.startTime,
          endTime: classData.endTime
        },
        defaults: {
          title: 'Individual Class',
          maxStudents: 1,
          status: 'scheduled',
          teacherId: classData.teacherId || null,
          timezone: classData.timezone
        }
      });
      
      // Check if the student is already assigned to this class
      const existingAssignment = await StudentClass.findOne({
        where: {
          studentId: id,
          classId: classSlot.id
        }
      });
      
      if (existingAssignment) {
        // Skip this class as the student is already assigned
        continue;
      }
      
      // Create student class assignment
      const studentClass = await StudentClass.create({
        studentId: id,
        classId: classSlot.id,
        studentPackageId: studentPackage.id,
        status: 'scheduled',
        canReschedule: true
      });
      
      // Add to the result array
      scheduledClasses.push({
        ...classSlot.toJSON(),
        studentClassId: studentClass.id
      });
    }
    
    // Update remaining classes count
    const updatedRemainingClasses = studentPackage.remainingClasses - scheduledClasses.length;
    await studentPackage.update({
      remainingClasses: updatedRemainingClasses
    });
    
    return res.status(201).json({
      message: 'Classes scheduled successfully',
      scheduledClasses,
      remainingClasses: updatedRemainingClasses
    });
  } catch (error) {
    console.error('Schedule classes error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a reschedule record for a student
router.post('/:id/reschedules', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { oldClassId, newClassData, teacherId, differentTeacher, reason } = req.body;
    
    // Forward the request to the reschedules service with the studentId from params
    const rescheduleData = {
      studentId: id,
      oldClassId,
      newClassData,
      teacherId,
      differentTeacher,
      reason: reason || 'Rescheduled by student'
    };
    
    // Make internal API call to the reschedules create endpoint
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/reschedules/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify(rescheduleData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }
    
    const result = await response.json();
    return res.status(201).json(result);
  } catch (error) {
    console.error('Student reschedule error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get reschedules for a student
router.get('/:id/reschedules', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const reschedules = await RescheduleClass.findAll({
      where: { studentId: id },
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

// Get teacher availability for a student on a specific date
router.get('/:id/teacher-availability', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }
    
    console.log(`DEBUG - Getting teacher availability - Student ID: ${id}, Date: ${date}`);
    
    // First, get the student and check their allowDifferentTeacher permission
    const student = await Student.findByPk(id, {
      include: [
        {
          model: Teacher,
          as: 'teachers',
          through: {
            where: { active: true }
          }
        }
      ]
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    console.log(`DEBUG - Student ${student.name} allowDifferentTeacher: ${student.allowDifferentTeacher}`);
    console.log(`DEBUG - Student assigned teachers:`, student.teachers?.map(t => `${t.firstName} ${t.lastName} (ID: ${t.id})`));
    
    // Get available teachers based on student's permission
    let teachers;
    if (student.allowDifferentTeacher) {
      // Student can reschedule with any active teacher
      teachers = await Teacher.findAll({
        where: {
          active: true
        }
      });
      console.log(`DEBUG - Student can use any teacher, found ${teachers.length} active teachers`);
    } else {
      // Student can only reschedule with their assigned teachers
      teachers = student.teachers || [];
      console.log(`DEBUG - Student restricted to assigned teachers, found ${teachers.length} assigned teachers`);
      
      if (teachers.length === 0) {
        return res.json({
          message: 'You are not allowed to reschedule with different teachers and have no assigned teachers. Please contact support.',
          teachers: [],
          allowDifferentTeacher: false,
          restricted: true
        });
      }
    }
    
    if (teachers.length === 0) {
      return res.json({
        message: 'No teachers available',
        teachers: [],
        allowDifferentTeacher: student.allowDifferentTeacher
      });
    }
    
    // Get primary teacher IDs for this student
    const primaryTeachers = student.teachers ? student.teachers.map(t => t.id) : [];
    
    // Get all teachers' availability for the specified date
    const teacherAvailability = [];
    
    // Process each teacher
    for (const teacher of teachers) {
      // Check if the teacher is a primary teacher for this student
      const isPrimary = primaryTeachers.includes(teacher.id);
      
      // Get teacher's work hours and working days
      const workHours = teacher.workHours || {};
      const workingDays = teacher.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      console.log(`DEBUG - Teacher ${teacher.firstName} ${teacher.lastName} work data:`, {
        workHours,
        workingDays,
        date,
      });
      
      // Get day of the week from the date
      const dayOfWeek = moment(date).format('dddd').toLowerCase();
      
      console.log(`DEBUG - Checking day: ${dayOfWeek}, workingDays includes: ${workingDays.includes(dayOfWeek)}`);
      
      // Check if teacher works on this day
      if (!workingDays.includes(dayOfWeek)) {
        // This teacher doesn't work on this day
        console.log(`DEBUG - Teacher ${teacher.firstName} doesn't work on ${dayOfWeek}`);
        teacherAvailability.push({
          teacher: {
            id: teacher.id,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            email: teacher.email
          },
          isPrimary,
          availableSlots: []
        });
        continue;
      }
      
      // Get teacher's work hours for this day
      const dayWorkHours = workHours[dayOfWeek] || [];
      
      console.log(`DEBUG - Teacher ${teacher.firstName} work hours for ${dayOfWeek}:`, dayWorkHours);
      
      if (dayWorkHours.length === 0) {
        // This teacher has no work hours set for this day
        teacherAvailability.push({
          teacher: {
            id: teacher.id,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            email: teacher.email
          },
          isPrimary,
          availableSlots: []
        });
        continue;
      }
      
      // Find all classes for this teacher on this date
      const bookedClasses = await Class.findAll({
        where: {
          date,
          [Op.or]: [
            { teacherId: teacher.id },
            { '$studentClasses.student.teachers.id$': teacher.id }
          ]
        },
        include: [
          {
            model: StudentClass,
            as: 'studentClasses',
            include: [
              {
                model: Student,
                as: 'student',
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
          }
        ]
      });
      
      // Convert booked classes to time ranges
      const bookedSlots = bookedClasses.map(cls => ({
        startTime: cls.startTime,
        endTime: cls.endTime
      }));
      
      // Generate available slots based on work hours minus booked slots
      const availableSlots = [];
      
      for (const workHour of dayWorkHours) {
        // Work hours are stored as {start: "09:00", end: "17:00"} format
        const { start, end } = workHour;
        
        if (!start || !end) {
          console.log(`DEBUG - Invalid work hour format for teacher ${teacher.id}:`, workHour);
          continue;
        }
        
        // Generate 1-hour slots within work hours
        const startMoment = moment(`${date} ${start}`, 'YYYY-MM-DD HH:mm');
        const endMoment = moment(`${date} ${end}`, 'YYYY-MM-DD HH:mm');
        
        let currentSlot = startMoment.clone();
        
        while (currentSlot.clone().add(1, 'hour').isSameOrBefore(endMoment)) {
          const slotStart = currentSlot.format('HH:mm:ss');
          const slotEnd = currentSlot.clone().add(1, 'hour').format('HH:mm:ss');
          
          // Check if this slot conflicts with any booked class
          const isConflict = bookedSlots.some(booked => {
            const bookedStart = moment(`${date} ${booked.startTime}`, 'YYYY-MM-DD HH:mm:ss');
            const bookedEnd = moment(`${date} ${booked.endTime}`, 'YYYY-MM-DD HH:mm:ss');
            const slotStartMoment = moment(`${date} ${slotStart}`, 'YYYY-MM-DD HH:mm:ss');
            const slotEndMoment = moment(`${date} ${slotEnd}`, 'YYYY-MM-DD HH:mm:ss');
            
            return slotStartMoment.isBefore(bookedEnd) && slotEndMoment.isAfter(bookedStart);
          });
          
          if (!isConflict) {
            availableSlots.push({
              startTime: slotStart,
              endTime: slotEnd,
              duration: 60 // minutes
            });
          }
          
          currentSlot.add(1, 'hour');
        }
      }
      
      teacherAvailability.push({
        teacher: {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: teacher.email
        },
        isPrimary,
        availableSlots
      });
    }
    
    console.log(`DEBUG - Returning availability for ${teacherAvailability.length} teachers`);
    
    return res.json({
      date,
      allowDifferentTeacher: student.allowDifferentTeacher,
      teachers: teacherAvailability
    });
  } catch (error) {
    console.error('Get teacher availability error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;