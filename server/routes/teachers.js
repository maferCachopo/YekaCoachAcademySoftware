const express = require('express');
const router = express.Router();
const { User, Teacher, Student, TeacherStudent, TeacherActivity, Class, StudentClass, RescheduleClass, sequelize, Task, Exam, ExamQuestion, ExamAnswer, ExamAssignment } = require('../models');
const { verifyToken, hasRole, isTeacher } = require('../middleware/auth');
const { Op } = require('sequelize');
const moment = require('moment-timezone'); // Added for available slots
const timezoneUtils = require('../utils/timezoneUtils'); // Import timezone utilities

// Apply middleware to all routes
router.use(verifyToken);

// Allow all authenticated users to access these routes
router.get('/:id/available-slots', async (req, res, next) => {
  next();
});

router.get('/available-slots', async (req, res, next) => {
  next();
});

// Get tasks assigned to the teacher
router.get('/tasks', hasRole(['teacher']), async (req, res) => {
  try {
    // Get teacher ID from auth token
    const teacher = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Get tasks assigned to this teacher
    const tasks = await Task.findAll({
      where: {
        assignedTo: teacher.id
      },
      include: [
        {
          model: Teacher,
          as: 'coordinator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    return res.json(tasks);
  } catch (error) {
    console.error('Error fetching teacher tasks:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific task by ID
router.get('/tasks/:id', hasRole(['teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get teacher ID from auth token
    const teacher = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Get task
    const task = await Task.findByPk(id, {
      include: [
        {
          model: Teacher,
          as: 'coordinator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if task is assigned to this teacher
    if (task.assignedTo !== teacher.id) {
      return res.status(403).json({ message: 'You do not have access to this task' });
    }
    
    return res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark task as in progress
router.patch('/tasks/:id/start', hasRole(['teacher']), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Get teacher ID from auth token
    const teacher = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Get task
    const task = await Task.findByPk(id);
    
    if (!task) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if task is assigned to this teacher
    if (task.assignedTo !== teacher.id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You do not have access to this task' });
    }
    
    // Check if task is in pending status
    if (task.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Task must be in pending status to start' });
    }
    
    // Update task status
    await task.update({
      status: 'in_progress'
    }, { transaction });
    
    await transaction.commit();
    
    return res.json(task);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating task status:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark task as completed
router.patch('/tasks/:id/complete', hasRole(['teacher']), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { completionDetails } = req.body;
    
    // Validate input
    if (!completionDetails) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Completion details are required' });
    }
    
    // Get teacher ID from auth token
    const teacher = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Get task
    const task = await Task.findByPk(id);
    
    if (!task) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if task is assigned to this teacher
    if (task.assignedTo !== teacher.id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You do not have access to this task' });
    }
    
    // Check if task is in pending or in_progress status
    if (task.status !== 'pending' && task.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Task must be in pending or in_progress status to complete' });
    }
    
    // Update task
    await task.update({
      status: 'completed',
      completionDetails
    }, { transaction });
    
    await transaction.commit();
    
    return res.json(task);
  } catch (error) {
    await transaction.rollback();
    console.error('Error completing task:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get assigned exams
router.get('/exams', hasRole(['teacher']), async (req, res) => {
  try {
    // Get teacher ID from auth token
    const teacher = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Get exams assigned to this teacher
    const exams = await Exam.findAll({
      where: {
        assignedTo: teacher.id,
        status: {
          [Op.in]: ['assigned', 'completed', 'approved', 'rejected']
        }
      },
      order: [['dueDate', 'ASC'], ['createdAt', 'DESC']],
      include: [
        {
          model: Teacher,
          as: 'coordinator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    return res.json(exams);
  } catch (error) {
    console.error('Error fetching teacher exams:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific exam with questions
router.get('/exams/:id', hasRole(['teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get teacher ID from auth token
    const teacher = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Check if this exam is assigned to this teacher
    let examAssignment = null;
    try {
      examAssignment = await ExamAssignment.findOne({
        where: {
          examId: id,
          teacherId: teacher.id
        }
      });
    } catch (err) {
      console.error('Error finding exam assignment:', err);
      // Continue execution even if ExamAssignment query fails
    }
    
    // For backward compatibility also check assignedTo field
    let whereCondition = {
      id: id
    };
    
    // If there's no exam assignment, then check if it's assigned via the direct relationship
    if (!examAssignment) {
      whereCondition.assignedTo = teacher.id;
    }
    
    const exam = await Exam.findOne({
      where: whereCondition,
      include: [
        {
          model: Teacher,
          as: 'coordinator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: ExamQuestion,
          as: 'questions',
          include: [
            {
              model: ExamAnswer,
              as: 'answers',
              where: { teacherId: teacher.id },
              required: false
            }
          ]
        }
      ]
    });
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found or not assigned to you' });
    }
    
    // Add the assignment status for this teacher
    const status = examAssignment ? examAssignment.status : exam.status;
    
    return res.json({
      ...exam.toJSON(),
      status
    });
  } catch (error) {
    console.error('Error fetching exam details:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit an exam answer
router.post('/exams/:examId/questions/:questionId/answer', hasRole(['teacher']), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { examId, questionId } = req.params;
    const { answerText, selectedOption } = req.body;
    
    // Get teacher ID from auth token
    const teacher = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Check if this exam is assigned to this teacher
    let examAssignment = null;
    try {
      examAssignment = await ExamAssignment.findOne({
        where: {
          examId,
          teacherId: teacher.id,
          status: 'assigned' // Only allow answering if exam is still assigned (not completed)
        }
      });
    } catch (err) {
      console.error('Error finding exam assignment for answer submission:', err);
      // Continue execution even if ExamAssignment query fails
    }
    
    // For backward compatibility also check assignedTo field
    const exam = await Exam.findOne({
      where: {
        id: examId,
        [Op.or]: [
          { assignedTo: teacher.id },
          { id: examAssignment ? examAssignment.examId : null }
        ]
      }
    });
    
    if (!exam) {
      console.log(`Exam not found with ID ${examId} for teacher ${teacher.id}`);
      await transaction.rollback();
      return res.status(404).json({ message: 'Exam not found, not assigned to you, or already completed' });
    }
    
    // For testing purposes, allow draft exams to be answered too
    const allowedStatuses = ['assigned', 'draft'];
    if (!allowedStatuses.includes(exam.status)) {
      console.log(`Exam status ${exam.status} is not allowed for answering`);
      await transaction.rollback();
      return res.status(403).json({ message: 'Exam is not in an editable state' });
    }
    
    // Check if question belongs to this exam
    let question = null;
    try {
      console.log(`Looking for question ID ${questionId} in exam ${examId}`);
      question = await ExamQuestion.findOne({
        where: {
          id: questionId,
          examId
        }
      });
      
      // If that fails, try looking for the question without the exam constraint
      if (!question) {
        console.log(`Question not found with exam constraint, trying without`);
        question = await ExamQuestion.findByPk(questionId);
        
        // If we found it but it has a different examId, that's a problem
        if (question && question.examId != examId) {
          console.log(`Question ${questionId} belongs to exam ${question.examId}, not ${examId}`);
          await transaction.rollback();
          return res.status(404).json({ message: `Question ${questionId} belongs to another exam` });
        }
      }
    } catch (err) {
      console.error('Error finding question:', err);
    }
    
    if (!question) {
      console.log(`Question with ID ${questionId} not found`);
      await transaction.rollback();
      return res.status(404).json({ message: 'Question not found or not part of this exam' });
    }
    
    // Check if answer already exists
    let answer = null;
    try {
      answer = await ExamAnswer.findOne({
        where: {
          examId,
          questionId,
          teacherId: teacher.id
        }
      });
    } catch (err) {
      console.error('Error finding existing answer:', err);
    }
    
    try {
      if (answer) {
        console.log(`Updating existing answer for question ${questionId}`);
        // Update existing answer
        if (question.responseType === 'multiple_choice' || question.responseType === 'true_false') {
          await answer.update({
            selectedOption,
            answerText: null
          }, { transaction });
        } else {
          await answer.update({
            answerText,
            selectedOption: null
          }, { transaction });
        }
      } else {
        console.log(`Creating new answer for question ${questionId}`);
        // Create new answer
        if (question.responseType === 'multiple_choice' || question.responseType === 'true_false') {
          answer = await ExamAnswer.create({
            examId,
            questionId,
            teacherId: teacher.id,
            selectedOption,
            answerText: null
          }, { transaction });
        } else {
          answer = await ExamAnswer.create({
            examId,
            questionId,
            teacherId: teacher.id,
            answerText,
            selectedOption: null
          }, { transaction });
        }
      }
    } catch (err) {
      console.error('Error saving answer:', err);
      await transaction.rollback();
      return res.status(500).json({ message: 'Error saving answer', error: err.message });
    }
    
    // Check if answer is correct for auto-grading
    if ((question.responseType === 'multiple_choice' || question.responseType === 'true_false') && 
        question.correctAnswer !== null && question.correctAnswer !== undefined) {
      try {
        const isCorrect = String(selectedOption) === String(question.correctAnswer);
        await answer.update({ isCorrect }, { transaction });
      } catch (err) {
        console.error('Error updating isCorrect flag:', err);
        // Don't fail the entire transaction just because of the auto-grading
      }
    }
    
    await transaction.commit();
    
    // Return a simplified response to avoid issues with circular references
    return res.json({
      id: answer.id,
      examId: Number(examId),
      questionId: Number(questionId),
      teacherId: teacher.id,
      answerText: answer.answerText,
      selectedOption: answer.selectedOption,
      success: true
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting answer:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit completed exam
router.patch('/exams/:id/submit', hasRole(['teacher']), async (req, res) => {
  const transaction = await sequelize.transaction();
  let examAssignment = null;
  try {
    const { id } = req.params;
    
    // Get teacher ID from auth token
    const teacher = await Teacher.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Check if this exam is assigned to this teacher
    
    console.log('Looking for exam assignment for submission');
    try {
      examAssignment = await ExamAssignment.findOne({
        where: {
          examId: id,
          teacherId: teacher.id,
          status: {
            [Op.in]: ['assigned', 'draft'] // Allow submission for both assigned and draft exams
          }
        }
      });
    } catch (err) {
      console.error('Error finding exam assignment for submission:', err);
      // Continue execution even if ExamAssignment query fails
    }
    
    if (!examAssignment) {
      console.log('No ExamAssignment found, checking legacy model');
      // Check legacy model
      const exam = await Exam.findOne({
        where: {
          id,
          assignedTo: teacher.id,
          status: {
            [Op.in]: ['assigned', 'draft'] // Allow submission for both assigned and draft exams
          }
        }
      });
      
      if (!exam) {
        console.log(`Exam not found with ID ${id} for teacher ${teacher.id}`);
        await transaction.rollback();
        return res.status(404).json({ message: 'Exam not found, not assigned to you, or already completed' });
      }
      console.log(`Found exam with status: ${exam.status}`);
      
      // Create an assignment record for backward compatibility
      try {
        console.log('Creating new ExamAssignment record');
        examAssignment = await ExamAssignment.create({
          examId: id,
          teacherId: teacher.id,
          status: 'assigned' // Create it as assigned initially
        }, { transaction });
        console.log('Created ExamAssignment successfully:', examAssignment.id);
      } catch (err) {
        console.error('Error creating exam assignment:', err);
        // If we can't create the assignment, just use the exam status directly
        examAssignment = { status: 'assigned' };
        console.log('Using fallback examAssignment object');
      }
    }
    
    // We should also update the main exam record
    try {
      // Find the exam and update its status
      const exam = await Exam.findByPk(id);
      if (exam) {
        await exam.update({
          status: 'completed'
        }, { transaction });
        console.log(`Updated exam ${id} status to completed`);
      }
    } catch (err) {
      console.error('Error updating exam status:', err);
      // Continue execution even if update fails
    }
    
    // Update assignment status
    if (examAssignment && typeof examAssignment.update === 'function') {
      try {
        await examAssignment.update({
          status: 'completed',
          completedAt: new Date()
        }, { transaction });
        console.log('Updated exam assignment status to completed');
      } catch (err) {
        console.error('Error updating exam assignment status:', err);
        // Continue execution even if update fails
      }
    } else {
      console.log('No valid ExamAssignment to update, continuing with exam status update');
    }
    
    await transaction.commit();
    console.log('Transaction committed successfully, exam submitted');
    
    return res.json({
      success: true,
      message: 'Exam submitted successfully',
      examId: parseInt(id),
      status: 'completed',
      completedAt: new Date()
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting exam:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all teachers
router.get('/', verifyToken, hasRole(['admin', 'coordinator']), async (req, res) => {
  try {
    // Get query parameter for showing inactive teachers (default to false)
    const showInactive = req.query.showInactive === 'true';
    
    // Create base query - only include active teachers unless explicitly requested
    const whereClause = !showInactive ? { active: true } : {};
    
    const teachers = await Teacher.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'email']
      }]
    });
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Get single teacher
router.get('/:id', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'email']
      }]
    });
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is requesting their own data or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ error: 'Failed to fetch teacher' });
  }
});

// Create new teacher
router.post('/', verifyToken, hasRole(['admin']), async (req, res) => {
  const { username, email, password, firstName, lastName, phone, workHours, breakHours, specialties, maxStudentsPerDay, isCoordinator, workingDays } = req.body;

  // Debug logs
  console.log('Received teacher data:', {
    workHours: JSON.stringify(workHours, null, 2),
    breakHours: JSON.stringify(breakHours, null, 2),
    specialties: JSON.stringify(specialties, null, 2)
  });

  try {
    // Start a transaction
    const result = await sequelize.transaction(async (t) => {
      // Create user first
      const user = await User.create({
        username,
        email,
        password,
        role: isCoordinator ? 'coordinator' : 'teacher'
      }, { transaction: t });

      // Debug log before teacher creation
      console.log('Creating teacher with data:', {
        userId: user.id,
        firstName,
        lastName,
        phone,
        workHours: typeof workHours,
        breakHours: typeof breakHours,
        specialties: Array.isArray(specialties),
        maxStudentsPerDay,
        isCoordinator
      });

      // Create teacher profile
      const teacher = await Teacher.create({
        userId: user.id,
        firstName,
        lastName,
        phone,
        workHours,
        breakHours,
        specialties,
        maxStudentsPerDay,
        isCoordinator,
        workingDays
      }, { transaction: t });

      return { user, teacher };
    });

    res.status(201).json(result.teacher);
  } catch (error) {
    console.error('Error creating teacher:', error);
    if (error.name === 'SequelizeValidationError') {
      console.error('Validation errors:', error.errors.map(e => e.message));
    }
    res.status(500).json({ error: 'Failed to create teacher', details: error.message });
  }
});

// Update teacher
router.put('/:id', verifyToken, hasRole(['admin']), async (req, res) => {
  const { firstName, lastName, phone, workHours, breakHours, specialties, maxStudentsPerDay, isCoordinator, active, workingDays } = req.body;

  try {
    const teacher = await Teacher.findByPk(req.params.id);
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Start a transaction
    await sequelize.transaction(async (t) => {
      // Update teacher profile
      await teacher.update({
        firstName,
        lastName,
        phone,
        workHours,
        breakHours,
        specialties,
        maxStudentsPerDay,
        isCoordinator,
        active,
        workingDays
      }, { transaction: t });

      // Update user role if coordinator status changed
      if (isCoordinator !== undefined) {
        await User.update({
          role: isCoordinator ? 'coordinator' : 'teacher'
        }, {
          where: { id: teacher.userId },
          transaction: t
        });
      }
    });

    // Fetch updated teacher with user info
    const updatedTeacher = await Teacher.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'email']
      }]
    });

    res.json(updatedTeacher);
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: 'Failed to update teacher', details: error.message });
  }
});

// Delete teacher (soft delete)
router.delete('/:id', verifyToken, hasRole(['admin']), async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Find associated user record
    const user = await User.findByPk(teacher.userId);
    
    // Start a transaction for atomicity
    const sequelize = Teacher.sequelize;
    const t = await sequelize.transaction();
    
    try {
      // Soft delete teacher by setting active to false
      await teacher.update({ active: false }, { transaction: t });
      
      // If there's a user record, also mark it as inactive
      if (user) {
        await user.update({ active: false }, { transaction: t });
      }
      
      // Find all classes where this teacher is directly assigned
      const teacherClasses = await Class.findAll({
        where: {
          teacherId: teacher.id,
          status: {
            [Op.notIn]: ['cancelled', 'completed', 'no-show']
          }
        },
        transaction: t
      });
      
      console.log(`Marking ${teacherClasses.length} classes as cancelled for deleted teacher ${teacher.id}`);
      
      // Update all directly assigned classes to be cancelled
      for (const classItem of teacherClasses) {
        await classItem.update({
          status: 'cancelled',
          notes: classItem.notes ? 
            `${classItem.notes}\n[SYSTEM] Cancelled due to teacher deletion` : 
            '[SYSTEM] Cancelled due to teacher deletion'
        }, { transaction: t });
      }
      
      // Also update any teacher-student relationships to inactive
      await TeacherStudent.update(
        { active: false },
        { 
          where: { teacherId: teacher.id, active: true },
          transaction: t 
        }
      );
      
      // Commit the transaction
      await t.commit();
      
      res.json({ 
        message: 'Teacher deactivated successfully',
        classesUpdated: teacherClasses.length 
      });
    } catch (error) {
      // If there's an error, roll back the transaction
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deactivating teacher:', error);
    res.status(500).json({ error: 'Failed to deactivate teacher' });
  }
});

// Get teacher's schedule
router.get('/:id/schedule', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const teacher = await Teacher.findByPk(teacherId);
    const { startDate, endDate } = req.query;
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is requesting their own schedule or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    // Get the user's preferred timezone (if available)
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) {
      userTimezone = req.user.timezone;
    }

    // Return work hours, break hours, and working days
    const scheduleData = {
      teacher: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName
      },
      workHours: teacher.workHours,
      breakHours: teacher.breakHours,
      workingDays: teacher.workingDays,
      activities: [],
      classes: []
    };
    
    // Build date filter for both activities and classes
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter[Op.between] = [startDate, endDate];
    } else if (startDate) {
      dateFilter[Op.gte] = startDate;
    } else if (endDate) {
      dateFilter[Op.lte] = endDate;
    }
    
    // Get teacher's activities
    const activities = await TeacherActivity.findAll({
      where: {
        teacherId: teacher.id,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });
    
    // Convert times to user's timezone
    scheduleData.activities = activities.map(activity => {
      const userTime = timezoneUtils.convertFromAdminToUserTimezone(
        activity.date,
        activity.startTime,
        userTimezone
      );
      
      return {
        ...activity.toJSON(),
        userDate: userTime.date,
        userStartTime: userTime.time
      };
    });
    
    // Get classes where this teacher is assigned
    const classesWithStudents = await Class.findAll({
      where: { 
        teacherId,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      include: [{
        model: Student,
        as: 'students',
        through: {
          model: StudentClass,
          attributes: ['status']
        },
        attributes: ['id', 'name', 'surname'],
        required: false
      }],
      attributes: ['id', 'title', 'date', 'startTime', 'endTime', 'status', 'notes', 'timezone'],
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });
    
    // Process each class to extract student information
    scheduleData.classes = classesWithStudents.map(cls => {
      const classData = cls.toJSON();
      
      // Get the first student (assuming one class has one student)
      const student = classData.students && classData.students.length > 0 ? classData.students[0] : null;
      
      // Convert times to user's timezone if needed
      const classTimezone = classData.timezone || timezoneUtils.ADMIN_TIMEZONE;
      const userClassTime = timezoneUtils.convertTimezoneSafe(
        classData.date,
        classData.startTime,
        classTimezone,
        userTimezone
      );
      
      return {
        ...classData,
        // Add student information
        studentId: student ? student.id : null,
        studentName: student ? student.name : null,
        studentSurname: student ? student.surname : null,
        // Time in user's timezone
        userDate: userClassTime.date,
        userStartTime: userClassTime.time,
        // Remove nested students array to avoid duplication
        students: undefined
      };
    });
    
    res.json(scheduleData);
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    res.status(500).json({ error: 'Failed to fetch teacher schedule' });
  }
});

// Get teacher's students
router.get('/:id/students', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const teacher = await Teacher.findByPk(teacherId);
    
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is requesting their own students or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const students = await Student.findAll({
      where: {
        active: true // Only include active students
      },
      include: [
        {
          model: Teacher,
          as: 'teachers',
          where: { id: teacherId },
          through: { 
            where: { active: true },
            attributes: ['assignedDate', 'notes']
          }
        },
        {
          model: User,
          as: 'user',
          attributes: ['email']
        }
      ]
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching teacher students:', error);
    res.status(500).json({ error: 'Failed to fetch teacher students' });
  }
});

// Assign student to teacher
router.post('/:id/students', verifyToken, hasRole(['admin']), async (req, res) => {
  try {
    const { studentId, notes } = req.body;
    const teacherId = req.params.id;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if student is already assigned to another teacher
    const existingAssignment = await TeacherStudent.findOne({
      where: {
        studentId,
        active: true,
        teacherId: { [Op.ne]: teacherId }
      }
    });

    if (existingAssignment) {
      // Get the teacher's name for a more informative error message
      const existingTeacher = await Teacher.findByPk(existingAssignment.teacherId);
      const teacherName = existingTeacher ? 
        `${existingTeacher.firstName} ${existingTeacher.lastName}` : 
        'another teacher';
        
      return res.status(400).json({ 
        error: 'Student is already assigned to another teacher',
        teacherId: existingAssignment.teacherId,
        teacherName: teacherName
      });
    }

    // Check if student is already assigned to this teacher
    const existingTeacherAssignment = await TeacherStudent.findOne({
      where: {
        studentId,
        teacherId,
        active: true
      }
    });

    if (existingTeacherAssignment) {
      return res.status(400).json({ error: 'Student is already assigned to this teacher' });
    }

    // Check if there's an inactive assignment for this student-teacher pair
    const inactiveAssignment = await TeacherStudent.findOne({
      where: {
        studentId,
        teacherId,
        active: false
      }
    });

    if (inactiveAssignment) {
      // Reactivate the existing assignment instead of creating a new one
      await inactiveAssignment.update({
        active: true,
        assignedDate: new Date(),
        notes: notes || inactiveAssignment.notes
      });
      
      return res.status(200).json(inactiveAssignment);
    }

    // Create new assignment
    const assignment = await TeacherStudent.create({
      teacherId,
      studentId,
      notes,
      assignedDate: new Date(),
      active: true
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error assigning student to teacher:', error);
    
    // Handle unique constraint errors more gracefully
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: 'Student already has a relationship with this teacher. Try removing the student first and then adding them again.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to assign student to teacher' });
  }
});

// Remove student from teacher
router.delete('/:id/students/:studentId', verifyToken, hasRole(['admin']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const studentId = req.params.studentId;
    
    const assignment = await TeacherStudent.findOne({
      where: {
        teacherId,
        studentId,
        active: true
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Soft delete by setting active to false
    await assignment.update({ active: false });

    res.json({ message: 'Student removed from teacher successfully' });
  } catch (error) {
    console.error('Error removing student from teacher:', error);
    res.status(500).json({ error: 'Failed to remove student from teacher' });
  }
});

// Completely delete student from teacher (hard delete)
router.delete('/:id/students/:studentId/hard', verifyToken, hasRole(['admin']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const studentId = req.params.studentId;
    
    const result = await TeacherStudent.destroy({
      where: {
        teacherId,
        studentId
      }
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ message: 'Student completely removed from teacher successfully' });
  } catch (error) {
    console.error('Error completely removing student from teacher:', error);
    res.status(500).json({ error: 'Failed to completely remove student from teacher' });
  }
});

// Get teacher's activities
router.get('/:id/activities', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { startDate, endDate } = req.query;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is requesting their own activities or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    let where = { teacherId };
    
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

    const activities = await TeacherActivity.findAll({
      where,
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ]
    });

    // Also get classes assigned to this teacher
    const classes = await Class.findAll({
      where: {
        teacherId,
        ...(where.date ? { date: where.date } : {})
      },
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ]
    });

    res.json({
      activities,
      classes
    });
  } catch (error) {
    console.error('Error fetching teacher activities:', error);
    res.status(500).json({ error: 'Failed to fetch teacher activities' });
  }
});

// Create teacher activity
router.post('/:id/activities', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { title, description, date, startTime, endTime, type, deadline, notes } = req.body;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is creating their own activity or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Get application timezone from config or environment
    const appTimezone = process.env.APP_TIMEZONE || 'UTC';

    const activity = await TeacherActivity.create({
      teacherId,
      title,
      description,
      date,
      startTime,
      endTime,
      type,
      deadline,
      notes,
      timezone: appTimezone,
      status: 'scheduled'
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error('Error creating teacher activity:', error);
    res.status(500).json({ error: 'Failed to create teacher activity' });
  }
});

// Update teacher activity
router.put('/:id/activities/:activityId', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const activityId = req.params.activityId;
    const { title, description, date, startTime, endTime, type, status, deadline, notes } = req.body;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is updating their own activity or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const activity = await TeacherActivity.findOne({
      where: {
        id: activityId,
        teacherId
      }
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    await activity.update({
      title,
      description,
      date,
      startTime,
      endTime,
      type,
      status,
      deadline,
      notes
    });

    res.json(activity);
  } catch (error) {
    console.error('Error updating teacher activity:', error);
    res.status(500).json({ error: 'Failed to update teacher activity' });
  }
});

// Delete teacher activity
router.delete('/:id/activities/:activityId', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const activityId = req.params.activityId;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is deleting their own activity or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const activity = await TeacherActivity.findOne({
      where: {
        id: activityId,
        teacherId
      }
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    await activity.destroy();

    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher activity:', error);
    res.status(500).json({ error: 'Failed to delete teacher activity' });
  }
});

// Get teacher's tasks
router.get('/:id/tasks', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { status } = req.query;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is requesting their own tasks or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Build filter conditions
    const whereConditions = {
      assignedTo: teacher.id
    };
    
    // Add status filter if provided
    if (status) {
      whereConditions.status = status;
    }
    
    // Get tasks from the database
    const tasks = await Task.findAll({
      where: whereConditions,
      include: [
        {
          model: Teacher,
          as: 'coordinator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [
        ['dueDate', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });
    
    // If no tasks found, return empty array
    if (!tasks || tasks.length === 0) {
      return res.json([]);
    }

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching teacher tasks:', error);
    res.status(500).json({ error: 'Failed to fetch teacher tasks' });
  }
});

// Submit a task
router.post('/:id/tasks/:taskId/submit', verifyToken, hasRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const taskId = req.params.taskId;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Ensure teacher can only submit their own tasks
    if (req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // In production, this would update the task in the database
    // For now, just return a success message
    res.json({
      success: true,
      message: 'Task submitted successfully',
      taskId: parseInt(taskId)
    });
  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

// Get teacher's exams
router.get('/:id/exams', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { status } = req.query;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is requesting their own exams or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Build query conditions
    const whereConditions = {
      assignedTo: teacherId
    };
    
    // Add status filter if provided
    if (status) {
      if (status === 'pending') {
        whereConditions.status = {
          [Op.in]: ['assigned', 'draft']
        };
      } else if (status === 'completed') {
        whereConditions.status = {
          [Op.in]: ['completed', 'approved', 'rejected']
        };
      } else {
        whereConditions.status = status;
      }
    }
    
    // Find exams in the database
    const examsData = await Exam.findAll({
      where: whereConditions,
      include: [
        {
          model: Teacher,
          as: 'coordinator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: ExamQuestion,
          as: 'questions'
        },
        {
          model: ExamAssignment,
          as: 'assignments',
          where: { teacherId: teacherId },
          required: false
        }
      ],
      order: [
        ['createdAt', 'DESC']
      ]
    });
    
    // If no exams found, return an empty array
    if (!examsData || examsData.length === 0) {
      return res.json([]);
    }
    
    // Process and format the exams data for the frontend
    const formattedExams = examsData.map(exam => {
      // Find the assignment for this teacher
      const examAssignment = exam.assignments && exam.assignments.length > 0 ? 
                          exam.assignments[0] : null;
                          
      // Use empty array for students since we don't have the relationship yet
      const students = [];
      
      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        dueDate: exam.dueDate,
        status: exam.status,
        completedDate: (exam.status === 'completed' || exam.status === 'approved' || exam.status === 'rejected') ?
                      (examAssignment?.completedAt || exam.updatedAt) : null,
        reviewNotes: examAssignment?.reviewNotes || exam.reviewNotes || null,
        students: students,
        result: exam.status === 'completed' ? 'Completed' : 
                exam.status === 'approved' ? 'Approved' : 
                exam.status === 'rejected' ? 'Rejected' : null,
        coordinator: exam.coordinator ? `${exam.coordinator.firstName} ${exam.coordinator.lastName}` : 'System Coordinator',
        totalQuestions: exam.questions ? exam.questions.length : 0
      };
    });
    
    res.json(formattedExams);
  } catch (error) {
    console.error('Error fetching teacher exams:', error);
    res.status(500).json({ error: 'Failed to fetch teacher exams' });
  }
});

// Get teacher's history (completed tasks and exams)
router.get('/:id/history', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is requesting their own history or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Get completed tasks for this teacher
    const tasks = await Task.findAll({
      where: {
        assignedTo: teacher.id,
        status: {
          [Op.in]: ['completed', 'reviewed']
        }
      },
      include: [
        {
          model: Teacher,
          as: 'coordinator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    // Format tasks based on actual Task model structure
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      completedDate: task.reviewedAt || task.updatedAt,
      dueDate: task.dueDate,
      status: task.status,
      result: task.completionDetails || 
              (task.status === 'completed' ? 'Completed' : 
               task.status === 'reviewed' ? 'Reviewed' : task.status),
      coordinator: task.coordinator ? `${task.coordinator.firstName} ${task.coordinator.lastName}` : 'System',
      reviewNotes: task.reviewNotes
    }));
    
    // Get completed exams for this teacher (legacy approach)
    const exams = await Exam.findAll({
      where: {
        assignedTo: teacher.id,
        status: {
          [Op.in]: ['completed', 'approved', 'rejected']
        }
      },
      include: [
        {
          model: Teacher,
          as: 'coordinator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: ExamQuestion,
          as: 'questions',
          attributes: ['id']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    // Get completed exam assignments (newer approach)
    const examAssignments = await ExamAssignment.findAll({
      where: {
        teacherId: teacher.id,
        status: {
          [Op.in]: ['completed', 'approved', 'rejected']
        }
      },
      include: [
        {
          model: Exam,
          as: 'exam',
          include: [
            {
              model: Teacher,
              as: 'coordinator',
              attributes: ['id', 'firstName', 'lastName']
            },
            {
              model: ExamQuestion,
              as: 'questions',
              attributes: ['id']
            }
          ]
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    // Format exams from direct assignments
    const directExams = exams.map(exam => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      completedDate: exam.reviewedAt || exam.updatedAt,
      dueDate: exam.dueDate,
      status: exam.status,
      result: exam.status === 'completed' ? 'Completed' : 
              exam.status === 'approved' ? 'Approved' : 'Rejected',
      totalQuestions: exam.questions ? exam.questions.length : 0,
      coordinator: exam.coordinator ? `${exam.coordinator.firstName} ${exam.coordinator.lastName}` : 'System',
      reviewNotes: exam.reviewNotes
    }));
    
    // Format exams from exam assignments
    const assignedExams = examAssignments.map(assignment => {
      const exam = assignment.exam;
      if (!exam) return null;
      
      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        completedDate: assignment.completedAt || assignment.updatedAt,
        dueDate: exam.dueDate,
        status: assignment.status,
        result: assignment.status === 'completed' ? 'Completed' : 
                assignment.status === 'approved' ? 'Approved' : 'Rejected',
        totalQuestions: exam.questions ? exam.questions.length : 0,
        coordinator: exam.coordinator ? `${exam.coordinator.firstName} ${exam.coordinator.lastName}` : 'System',
        reviewNotes: assignment.reviewNotes
      };
    }).filter(Boolean);
    
    // Combine exams from both sources, removing duplicates
    const examIds = new Set();
    const formattedExams = [...directExams, ...assignedExams].filter(exam => {
      if (examIds.has(exam.id)) {
        return false;
      }
      examIds.add(exam.id);
      return true;
    });
    
    const history = {
      tasks: formattedTasks,
      exams: formattedExams
    };
    
    return res.json(history);
  } catch (error) {
    console.error('Error fetching teacher history:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch history data',
      tasks: [],
      exams: []
    });
  }
});

// Get teacher's classes for today
router.get('/:id/classes', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { date, startDate, endDate } = req.query;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is requesting their own classes or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    // Get the user's preferred timezone (if available)
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) {
      userTimezone = req.user.timezone;
    }

    // Find classes for this teacher on the specified date or date range
    let where = { teacherId };
    if (date) {
      where.date = date;
    } else if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const classes = await Class.findAll({
      where,
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ],
      include: [
        {
          model: Student,
          as: 'students',
          attributes: ['id', 'name', 'surname'],
          through: {
            model: StudentClass,
            attributes: ['status', 'originalClassId', 'notes']
          }
        },
        {
          model: RescheduleClass,
          as: 'oldReschedulings',
          required: false,
          where: {
            status: 'confirmed'
          }
        }
      ]
    });

    // Filter out classes that have been rescheduled (marked as "rescheduled" in StudentClass)
    // Only show classes where the StudentClass status is "scheduled" (not "rescheduled")
    const filteredClasses = classes.filter(cls => {
      // If no students, include the class (shouldn't happen in normal cases)
      if (!cls.students || cls.students.length === 0) {
        return true;
      }

      // Check if any student has this class marked as "scheduled" (not rescheduled)
      const hasActiveStudent = cls.students.some(student => {
        const studentClass = student.StudentClass;
        return studentClass && studentClass.status === 'scheduled';
      });

      // Only include classes that have at least one active student
      return hasActiveStudent;
    });
    
    // Convert class times from admin timezone to user timezone
    const classesWithUserTimezone = filteredClasses.map(cls => {
      const userTime = timezoneUtils.convertFromAdminToUserTimezone(
        cls.date,
        cls.startTime,
        userTimezone
      );
      
      const userEndTime = timezoneUtils.convertFromAdminToUserTimezone(
        cls.date,
        cls.endTime,
        userTimezone
      );
      
      return {
        ...cls.toJSON(),
        userDate: userTime.date,
        userStartTime: userTime.time,
        userEndTime: userEndTime.time
      };
    });

    res.json(classesWithUserTimezone);
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({ error: 'Failed to fetch teacher classes' });
  }
});

// Get rescheduled classes assigned to this teacher (where they're the new teacher)
router.get('/:id/rescheduled-classes', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { startDate, endDate } = req.query;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // If teacher is requesting their own rescheduled classes or admin/coordinator
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    // Get the user's preferred timezone (if available)
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) {
      userTimezone = req.user.timezone;
    }
    
    // Find rescheduled classes where this teacher is the new teacher
    let whereClause = {};
    
    // New way - check for newTeacherId field
    whereClause.newTeacherId = teacherId;
    
    // Also check for classes where teacherId is already set directly on the class
    // and differentTeacher is true (legacy data)
    whereClause = {
      [Op.or]: [
        { newTeacherId: teacherId },
        {
          differentTeacher: true,
          '$newClass.teacherId$': teacherId
        }
      ]
    };
    
    // Add date filter if provided
    if (startDate && endDate) {
      whereClause[Op.and] = [
        sequelize.literal(`EXISTS (
          SELECT 1 FROM Classes
          WHERE Classes.id = RescheduleClass.new_class_id
          AND Classes.date BETWEEN '${startDate}' AND '${endDate}'
        )`)
      ];
    }
    
    const rescheduledClasses = await RescheduleClass.findAll({
      where: whereClause,
      include: [
        {
          model: Class,
          as: 'newClass',
          include: [{
            model: Student,
            as: 'students',
            attributes: ['id', 'name', 'surname']
          }]
        },
        {
          model: Class,
          as: 'oldClass'
        },
        {
          model: Student,
          as: 'student'
        },
        {
          model: Teacher,
          as: 'oldTeacher'
        },
        {
          model: Teacher,
          as: 'newTeacher'
        }
      ]
    });
    
    // Format the response to match the expected class structure
    // and convert times to user's timezone
    const formattedClasses = rescheduledClasses.map(reschedule => {
      const classData = reschedule.newClass;
      
      if (!classData) {
        return null; // Skip if new class data is missing
      }
      
      // Convert time from admin timezone to user timezone
      const userTime = timezoneUtils.convertFromAdminToUserTimezone(
        classData.date,
        classData.startTime,
        userTimezone
      );
      
      const userEndTime = timezoneUtils.convertFromAdminToUserTimezone(
        classData.date,
        classData.endTime,
        userTimezone
      );
      
      // Get student info
      const studentName = reschedule.student ? 
        `${reschedule.student.name} ${reschedule.student.surname || ''}`.trim() : 
        'Unknown Student';
      
      // Get teachers info
      const oldTeacherName = reschedule.oldTeacher ? 
        `${reschedule.oldTeacher.firstName} ${reschedule.oldTeacher.lastName || ''}`.trim() : 
        'Unknown Teacher';
        
      const newTeacherName = reschedule.newTeacher ? 
        `${reschedule.newTeacher.firstName} ${reschedule.newTeacher.lastName || ''}`.trim() : 
        'Current Teacher';
      
      return {
        id: classData.id,
        title: classData.title || 'Rescheduled Class',
        date: classData.date,
        startTime: classData.startTime,
        endTime: classData.endTime,
        userDate: userTime.date,
        userStartTime: userTime.time,
        userEndTime: userEndTime.time,
        status: 'scheduled',
        teacherId: classData.teacherId,
        isRescheduled: true,
        rescheduledFrom: reschedule.oldClassId,
        rescheduledAt: reschedule.rescheduledAt,
        studentId: reschedule.studentId,
        studentName: studentName,
        oldTeacherId: reschedule.oldTeacherId,
        oldTeacherName: oldTeacherName,
        newTeacherName: newTeacherName,
        isNewTeacher: reschedule.differentTeacher,
        reason: reschedule.reason
      };
    }).filter(Boolean); // Remove any null entries
    
    res.json(formattedClasses);
  } catch (error) {
    console.error('Error fetching rescheduled classes:', error);
    res.status(500).json({ error: 'Failed to fetch rescheduled classes', details: error.message });
  }
});

// Start a class
router.post('/:id/classes/:classId/start', verifyToken, hasRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const classId = req.params.classId;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Ensure teacher can only start their own classes
    if (req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // In production, this would update the class status in the database
    // For now, just return a success message
    res.json({
      success: true,
      message: 'Class started successfully',
      classId: parseInt(classId)
    });
  } catch (error) {
    console.error('Error starting class:', error);
    res.status(500).json({ error: 'Failed to start class' });
  }
});

// Submit an exam
router.post('/:id/exams/:examId/submit', verifyToken, hasRole(['teacher']), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const teacherId = req.params.id;
    const examId = req.params.examId;
    const { comments, answers } = req.body;
    
    // Validate teacher
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Ensure teacher can only submit their own exams
    if (req.user.id !== teacher.userId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    // Find the exam
    const exam = await Exam.findOne({
      where: {
        id: examId,
        assignedTo: teacherId
      },
      include: [
        {
          model: ExamQuestion,
          as: 'questions'
        }
      ]
    });
    
    if (!exam) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Exam not found or not assigned to this teacher' });
    }
    
    // Check if exam is already completed
    if (exam.status === 'completed' || exam.status === 'approved' || exam.status === 'rejected') {
      await transaction.rollback();
      return res.status(400).json({ error: 'This exam has already been completed' });
    }
    
    // Update exam status
    await exam.update({
      status: 'completed',
      reviewNotes: comments || null
    }, { transaction });
    
    // Process answers if provided
    if (answers && Array.isArray(answers) && answers.length > 0) {
      // Validate that we have answers for all questions
      const questionIds = exam.questions.map(q => q.id);
      
      for (const answer of answers) {
        if (!questionIds.includes(answer.questionId)) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Answer provided for question ID ${answer.questionId} that doesn't belong to this exam` 
          });
        }
        
        // Create exam answer
        await ExamAnswer.create({
          examId,
          questionId: answer.questionId,
          teacherId,
          answerText: answer.answerText || null,
          selectedOption: answer.selectedOption || null
        }, { transaction });
      }
    }
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Exam submitted successfully',
      examId: parseInt(examId)
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

// Submit class record
router.post('/:id/classes/:classId/record', verifyToken, hasRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const classId = req.params.classId;
    const { breathing, warmup, vocalization, observations, classType, classStatus } = req.body;
    
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Ensure teacher can only submit records for their own classes
    if (req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Find the class
    const classRecord = await Class.findOne({
      where: {
        id: classId,
        teacherId
      }
    });

    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Update class with record data and mark as completed
    await classRecord.update({
      status: 'completed',
      breathing,
      warmup,
      vocalization,
      observations,
      classType: classType || 'regular',
      classStatus: classStatus || 'given'
    });

    res.json({
      success: true,
      message: 'Class record submitted successfully',
      classId: parseInt(classId)
    });
  } catch (error) {
    console.error('Error submitting class record:', error);
    res.status(500).json({ error: 'Failed to submit class record' });
  }
});

// Reset teacher's password
router.post('/:id/reset-password', verifyToken, hasRole(['admin']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { password } = req.body;
    
    console.log(`Processing password reset for teacher ID: ${teacherId}`);
    
    // Find the teacher
    const teacher = await Teacher.findByPk(teacherId);
    
    if (!teacher) {
      console.log(`Teacher with ID ${teacherId} not found`);
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Find the user associated with this teacher
    const user = await User.findByPk(teacher.userId);
    
    if (!user) {
      console.log(`User not found for teacher ID ${teacherId} (user ID: ${teacher.userId})`);
      return res.status(404).json({ error: 'User account not found for this teacher' });
    }
    
    // Use provided password or generate a default one if not provided
    const newPassword = password || 'DefaultPass123';
    
    console.log(`Updating password for user ID ${user.id} (teacher ID: ${teacherId})`);
    
    // Set the new password - we don't need to hash it manually, the beforeUpdate hook in the User model will do it
    await user.update({ password: newPassword });
    
    console.log(`Password reset successfully for teacher ID ${teacherId} (user ID: ${user.id})`);
    
    return res.json({ 
      message: 'Password reset successfully',
      teacherId,
      userId: user.id
    });
  } catch (error) {
    console.error('Reset teacher password error:', error);
    res.status(500).json({ error: 'Failed to reset teacher password', details: error.message });
  }
});

// Get teacher's available slots
router.get('/:id/available-slots', verifyToken, async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }
    
    // Get teacher information
    const teacher = await Teacher.findByPk(teacherId);
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Get teacher's work hours and working days
    const workHours = teacher.workHours || {};
    const workingDays = teacher.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    // Get day of the week from the date
    const dayOfWeek = moment(date).format('dddd').toLowerCase();
    
    // Check if teacher works on this day
    if (!workingDays.includes(dayOfWeek)) {
      return res.json({ 
        message: 'Teacher does not work on this day',
        slots: [] 
      });
    }
    
    // Get teacher's work hours for this day
    const dayWorkHours = workHours[dayOfWeek] || [];
    
    if (dayWorkHours.length === 0) {
      return res.json({ 
        message: 'Teacher has no work hours set for this day',
        slots: [] 
      });
    }
    
    // Find all classes for the teacher on this date
    const bookedClasses = await Class.findAll({
      where: {
        date,
        [Op.or]: [
          { teacherId },
          { '$studentClasses.student.teachers.id$': teacherId } // Classes of teacher's students
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
    const bookedSlots = bookedClasses.map(cls => {
      return {
        start: cls.startTime,
        end: cls.endTime
      };
    });
    
    // Filter out booked slots from work hours
    const availableSlots = dayWorkHours.flatMap(workSlot => {
      const workStart = moment(workSlot.start, 'HH:mm');
      const workEnd = moment(workSlot.end, 'HH:mm');
      
      // Default class duration is 1 hour (60 minutes)
      const classDuration = 60; // minutes
      
      // Generate potential slots with 1-hour duration
      let slots = [];
      let currentSlotStart = workStart.clone();
      
      while (currentSlotStart.clone().add(classDuration, 'minutes').isSameOrBefore(workEnd)) {
        const currentSlotEnd = currentSlotStart.clone().add(classDuration, 'minutes');
        
        // Check if this slot overlaps with any booked slots
        const isOverlapping = bookedSlots.some(bookedSlot => {
          const bookedStart = moment(bookedSlot.start, 'HH:mm:ss');
          const bookedEnd = moment(bookedSlot.end, 'HH:mm:ss');
          
          return (
            currentSlotStart.isBefore(bookedEnd) && 
            currentSlotEnd.isAfter(bookedStart)
          );
        });
        
        if (!isOverlapping) {
          slots.push({
            start: currentSlotStart.format('HH:mm:ss'),
            end: currentSlotEnd.format('HH:mm:ss'),
            date
          });
        }
        
        // Move to next potential slot (with 30-minute intervals)
        currentSlotStart.add(30, 'minutes');
      }
      
      return slots;
    });
    
    res.json({
      teacherId,
      date,
      availableSlots
    });
    
  } catch (error) {
    console.error('Error getting teacher available slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all teachers' availability for a specific date
router.get('/available-slots', verifyToken, async (req, res) => {
  try {
    const { date, studentId } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }
    
    // First, get all teachers
    const teachers = await Teacher.findAll({
      where: {
        active: true
      }
    });

    if (!teachers || teachers.length === 0) {
      return res.json({
        message: 'No active teachers found',
        teachers: []
      });
    }
    
    // If studentId is provided, get the student's assigned teachers
    let primaryTeachers = [];
    if (studentId) {
      const student = await Student.findByPk(studentId, {
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
      
      if (student && student.teachers) {
        primaryTeachers = student.teachers.map(t => t.id);
      }
    }
    
    // Get all teachers' availability
    const teacherAvailability = [];
    
    // Process each teacher
    for (const teacher of teachers) {
      // Check if the teacher is a primary teacher for this student
      const isPrimary = primaryTeachers.includes(teacher.id);
      
      // Get teacher's work hours and working days
      const workHours = teacher.workHours || {};
      const workingDays = teacher.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      // Get day of the week from the date
      const dayOfWeek = moment(date).format('dddd').toLowerCase();
      
      // Check if teacher works on this day
      if (!workingDays.includes(dayOfWeek)) {
        // This teacher doesn't work on this day
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
            { '$studentClasses.student.teachers.id$': teacher.id } // Classes of teacher's students
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
      const bookedSlots = bookedClasses.map(cls => {
        return {
          start: cls.startTime,
          end: cls.endTime
        };
      });
      
      // Filter out booked slots from work hours
      const availableSlots = dayWorkHours.flatMap(workSlot => {
        const workStart = moment(workSlot.start, 'HH:mm');
        const workEnd = moment(workSlot.end, 'HH:mm');
        
        // Default class duration is 1 hour (60 minutes)
        const classDuration = 60; // minutes
        
        // Generate potential slots with 1-hour duration
        let slots = [];
        let currentSlotStart = workStart.clone();
        
        while (currentSlotStart.clone().add(classDuration, 'minutes').isSameOrBefore(workEnd)) {
          const currentSlotEnd = currentSlotStart.clone().add(classDuration, 'minutes');
          
          // Check if this slot overlaps with any booked slots
          const isOverlapping = bookedSlots.some(bookedSlot => {
            const bookedStart = moment(bookedSlot.start, 'HH:mm:ss');
            const bookedEnd = moment(bookedSlot.end, 'HH:mm:ss');
            
            return (
              currentSlotStart.isBefore(bookedEnd) && 
              currentSlotEnd.isAfter(bookedStart)
            );
          });
          
          if (!isOverlapping) {
            slots.push({
              start: currentSlotStart.format('HH:mm:ss'),
              end: currentSlotEnd.format('HH:mm:ss'),
              date
            });
          }
          
          // Move to next potential slot (with 30-minute intervals)
          currentSlotStart.add(30, 'minutes');
        }
        
        return slots;
      });
      
      // Add this teacher's availability to the result
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
    
    // Sort the results - primary teachers first, then by number of available slots (most to least)
    teacherAvailability.sort((a, b) => {
      // Primary teachers first
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      
      // Then by number of available slots (most to least)
      return b.availableSlots.length - a.availableSlots.length;
    });
    
    res.json({
      date,
      teachers: teacherAvailability
    });
    
  } catch (error) {
    console.error('Error getting all teachers availability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 