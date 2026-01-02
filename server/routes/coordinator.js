const express = require('express');
const router = express.Router();
const { User, Teacher, Student, TeacherStudent, Class, Exam, ExamQuestion, ExamAnswer, ExamAssignment, Task, RescheduleClass, sequelize } = require('../models');
const { verifyToken, hasRole, isCoordinator } = require('../middleware/auth');
const { Op } = require('sequelize');
const timezoneUtils = require('../utils/timezoneUtils');

// Apply middleware to all routes
router.use(verifyToken, isCoordinator);

// Get all teachers for coordinator view
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.findAll({
      where: { active: true },
      attributes: ['id', 'firstName', 'lastName', 'phone', 'isCoordinator', 'specialties', 'workHours', 'breakHours', 'workingDays'],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'email']
        }
      ]
    });
    
    return res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers for coordinator:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get rescheduled classes for coordinator view
router.get('/rescheduled-classes', async (req, res) => {
  try {
    // Get user timezone if available
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) {
      userTimezone = req.user.timezone;
    }
    
    // Get optional date range filter
    const { startDate, endDate, teacherId } = req.query;
    
    // Build where clause for filtering
    let whereClause = {};
    
    // Add teacherId filter if provided
    if (teacherId) {
      whereClause = {
        [Op.or]: [
          { oldTeacherId: teacherId },
          { newTeacherId: teacherId },
          // For legacy data without explicit teacher IDs
          { '$newClass.teacherId$': teacherId },
          { '$oldClass.teacherId$': teacherId }
        ]
      };
    }
    
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
    
    const reschedules = await RescheduleClass.findAll({
      where: whereClause,
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
    console.error('Error fetching rescheduled classes for coordinator:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get teacher schedule
router.get('/teachers/:id/schedule', async (req, res) => {
  try {
    const teacherId = req.params.id;
    console.log(`Fetching schedule for teacher ID: ${teacherId}`);
    
    const teacher = await Teacher.findByPk(teacherId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['email', 'username']
      }],
      attributes: ['id', 'firstName', 'lastName', 'phone', 'workHours', 'breakHours', 'specialties', 'isCoordinator', 'workingDays']
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Get assigned students for this teacher using proper association
    const teacherWithStudents = await Teacher.findByPk(teacherId, {
      include: [{
        model: Student,
        as: 'students',
        attributes: ['id', 'name', 'surname', 'phone'],
        through: { 
          model: TeacherStudent,
          attributes: [],
          where: { active: true }
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['email']
        }]
      }]
    });
    
    const assignedStudents = teacherWithStudents ? teacherWithStudents.students : [];
    console.log(`Found ${assignedStudents.length} assigned students for teacher ${teacherId}`);
    if (assignedStudents.length > 0) {
      console.log("Student IDs:", assignedStudents.map(s => s.id));
    }
    
    // First, check if there are any classes at all in the database
    const allClassesInSystem = await Class.count();
    console.log(`Total classes in system: ${allClassesInSystem}`);
    
    // Check if there are any classes for this teacher (direct query)
    const teacherClassesCount = await Class.count({ 
      where: { teacherId }
    });
    console.log(`Classes with teacherId=${teacherId}: ${teacherClassesCount}`);
    
    // If there are classes for this teacher, get them with student information
    let teacherClasses = [];
    if (teacherClassesCount > 0) {
      // Get classes with their associated students
      const classesWithStudents = await Class.findAll({
        where: { teacherId },
        include: [{
          model: Student,
          as: 'students',
          through: {
            model: sequelize.models.StudentClass,
            attributes: ['status']
          },
          attributes: ['id', 'name', 'surname'],
          required: false
        }],
        attributes: ['id', 'title', 'date', 'startTime', 'endTime', 'status', 'notes']
      });
      
      // Process each class to extract student information
      teacherClasses = classesWithStudents.map(cls => {
        const classData = cls.toJSON();
        
        // Get the first student (assuming one class has one student)
        const student = classData.students && classData.students.length > 0 ? classData.students[0] : null;
        
        return {
          ...classData,
          // Add student information
          studentId: student ? student.id : null,
          studentName: student ? student.name : null,
          studentSurname: student ? student.surname : null,
          // Remove nested students array to avoid duplication
          students: undefined
        };
      });
      
      console.log(`Found ${teacherClasses.length} classes for teacher ${teacherId}`);
      if (teacherClasses.length > 0) {
        console.log("First few classes with student info:", JSON.stringify(teacherClasses.slice(0, 2), null, 2));
      }
    }
    
    // Get rescheduled classes where this teacher is involved
    const rescheduledClasses = await RescheduleClass.findAll({
      where: {
        [Op.or]: [
          { oldTeacherId: teacherId },
          { newTeacherId: teacherId }
        ]
      },
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
      ]
    });
    
    // Get classes for assigned students
    let studentClasses = [];
    if (assignedStudents.length > 0) {
      // Get classes directly assigned to this teacher's students
      const studentIds = assignedStudents.map(student => student.id);
      
      for (const studentId of studentIds) {
        // For each student, get their classes
        const classes = await Class.findAll({
          include: [{
            model: Student,
            as: 'students',
            through: {
              model: sequelize.models.StudentClass,
              where: { 
                studentId,
                status: { [Op.in]: ['scheduled', 'attended'] }
              }
            },
            where: { id: studentId },
            required: true
          }],
          attributes: ['id', 'title', 'date', 'startTime', 'endTime', 'status', 'teacherId', 'notes']
        });
        
        // Add each class with student info
        const student = assignedStudents.find(s => s.id === studentId);
        for (const cls of classes) {
          const classWithStudentInfo = {
            ...cls.toJSON(),
            studentId,
            studentName: student ? `${student.name} ${student.surname}` : 'Unknown'
          };
          studentClasses.push(classWithStudentInfo);
        }
      }
      
      console.log(`Found ${studentClasses.length} classes for students of teacher ${teacherId}`);
    }
    
    // Combine all the schedule data
    // Prepare classes array by combining teacher classes and student classes
    const allClasses = [...teacherClasses];
    
    // Add student classes that aren't already in the list (to avoid duplicates)
    studentClasses.forEach(studentClass => {
      if (!allClasses.find(c => c.id === studentClass.id)) {
        allClasses.push(studentClass);
      }
    });
    
    const schedule = {
      teacher,
      assignedStudents,
      workHours: teacher.workHours,
      breakHours: teacher.breakHours,
      workingDays: teacher.workingDays,
      classes: allClasses,
      rescheduledClasses: rescheduledClasses.map(r => r.toJSON())
    };
    
    // Get user timezone
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) {
      userTimezone = req.user.timezone;
    }
    
    // Convert times to user timezone
    const convertedSchedule = {
      ...schedule,
      adminTimezone: timezoneUtils.ADMIN_TIMEZONE,
      userTimezone: userTimezone,
      // Ensure tasks and exams are included
      tasks: [],
      exams: [],
      rescheduledClasses: schedule.rescheduledClasses.map(reschedule => {
        // Add timezone-converted dates
        if (reschedule.oldClass) {
          const oldClassUserTime = timezoneUtils.convertFromAdminToUserTimezone(
            reschedule.oldClass.date,
            reschedule.oldClass.startTime,
            userTimezone
          );
          reschedule.oldClass.userDate = oldClassUserTime.date;
          reschedule.oldClass.userStartTime = oldClassUserTime.time;
        }
        
        if (reschedule.newClass) {
          const newClassUserTime = timezoneUtils.convertFromAdminToUserTimezone(
            reschedule.newClass.date,
            reschedule.newClass.startTime,
            userTimezone
          );
          reschedule.newClass.userDate = newClassUserTime.date;
          reschedule.newClass.userStartTime = newClassUserTime.time;
        }
        
        return reschedule;
      })
    };
    
    return res.json(convertedSchedule);
  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get tasks history
// Update task status (review a completed task)
router.patch('/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    // Get task
    const task = await Task.findByPk(id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Validate status transition
    if (task.status !== 'completed' || status !== 'reviewed') {
      return res.status(400).json({ message: 'Invalid status transition' });
    }
    
    // Update task
    await task.update({
      status,
      reviewNotes,
      reviewedAt: new Date()
    });
    
    // Get updated task with related data
    const updatedTask = await Task.findByPk(id, {
      include: [{
        model: Teacher,
        as: 'assignedTeacher',
        attributes: ['id', 'firstName', 'lastName']
      }, {
        model: Teacher,
        as: 'coordinator',
        attributes: ['id', 'firstName', 'lastName']
      }]
    });
    
    return res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task status:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/tasks/history', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: {
        status: {
          [Op.in]: ['completed', 'reviewed', 'cancelled']
        }
      },
      include: [{
        model: Teacher,
        as: 'assignedTeacher',
        attributes: ['id', 'firstName', 'lastName']
      }, {
        model: Teacher,
        as: 'coordinator',
        attributes: ['id', 'firstName', 'lastName']
      }],
      order: [['updatedAt', 'DESC']]
    });
    
    // Transform to match frontend expectations
    const formattedTasks = tasks.map(task => {
      const taskData = task.toJSON();
      return {
        ...taskData,
        assignedTo: taskData.assignedTeacher ? taskData.assignedTeacher.id : null
      };
    });
    
    return res.json(formattedTasks);
  } catch (error) {
    console.error('Error fetching tasks history:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get exams history
router.get('/exams/history', async (req, res) => {
  try {
    const exams = await Exam.findAll({
      where: {
        status: {
          [Op.in]: ['completed', 'approved', 'rejected']
        }
      },
      include: [{
        model: Teacher,
        as: 'assignedTeacher',
        attributes: ['id', 'firstName', 'lastName']
      }, {
        model: Teacher,
        as: 'coordinator',
        attributes: ['id', 'firstName', 'lastName']
      }, {
        model: ExamQuestion,
        as: 'questions',
        attributes: ['id']
      }],
      order: [['updatedAt', 'DESC']]
    });
    
    // Transform to match frontend expectations
    const formattedExams = exams.map(exam => {
      const examData = exam.toJSON();
      return {
        ...examData,
        assignedTo: examData.assignedTeacher ? examData.assignedTeacher.id : null,
        totalQuestions: examData.questions ? examData.questions.length : 0
      };
    });
    
    return res.json(formattedExams);
  } catch (error) {
    console.error('Error fetching exams history:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get tasks for coordinator dashboard
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: {},
      include: [{
        model: Teacher,
        as: 'assignedTeacher',
        attributes: ['id', 'firstName', 'lastName']
      }, {
        model: Teacher,
        as: 'coordinator',
        attributes: ['id', 'firstName', 'lastName']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    // Transform to match frontend expectations
    const formattedTasks = tasks.map(task => {
      const taskData = task.toJSON();
      return {
        ...taskData,
        assignedTo: taskData.assignedTeacher ? taskData.assignedTeacher.id : null
      };
    });
    
    return res.json(formattedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new task
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, dueDate, assignedTo } = req.body;
    
    // Validate required fields
    if (!title || !description || !assignedTo) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Get the coordinator ID from the logged-in user
    const coordinator = await Teacher.findOne({
      where: { userId: req.user.id }
    });
    
    if (!coordinator) {
      return res.status(403).json({ message: 'Not authorized to create tasks' });
    }
    
    // Create the task
    const task = await Task.create({
      title,
      description,
      dueDate: dueDate || null,
      assignedTo,
      assignedBy: coordinator.id,
      status: 'pending'
    });
    
    // Return the created task with teacher info
    const taskWithTeacher = await Task.findByPk(task.id, {
      include: [{
        model: Teacher,
        as: 'assignedTeacher',
        attributes: ['id', 'firstName', 'lastName']
      }, {
        model: Teacher,
        as: 'coordinator',
        attributes: ['id', 'firstName', 'lastName']
      }]
    });
    
    return res.status(201).json(taskWithTeacher);
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get exams for coordinator dashboard
router.get('/exams', async (req, res) => {
  try {
    const exams = await Exam.findAll({
      include: [{
        model: Teacher,
        as: 'assignedTeacher',
        attributes: ['id', 'firstName', 'lastName']
      }, {
        model: Teacher,
        as: 'coordinator',
        attributes: ['id', 'firstName', 'lastName']
      }, {
        model: ExamQuestion,
        as: 'questions',
        attributes: ['id']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    // Transform to match frontend expectations
    const formattedExams = exams.map(exam => {
      const examData = exam.toJSON();
      return {
        ...examData,
        assignedTo: examData.assignedTeacher ? examData.assignedTeacher.id : null,
        totalQuestions: examData.questions ? examData.questions.length : 0
      };
    });
    
    return res.json(formattedExams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new exam
router.post('/exams', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { title, description, dueDate, assignedTo, questions } = req.body;
    
    // Validate required fields
    if (!title || !Array.isArray(assignedTo) || assignedTo.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Get the coordinator ID from the logged-in user
    const coordinator = await Teacher.findOne({
      where: { userId: req.user.id }
    });
    
    if (!coordinator) {
      return res.status(403).json({ message: 'Not authorized to create exams' });
    }
    
    // Create the exam
    const exam = await Exam.create({
      title,
      description,
      dueDate: dueDate || null,
      createdBy: coordinator.id,
      status: 'draft',
      totalQuestions: questions ? questions.length : 0,
      // Set assignedTo to the first teacher for backward compatibility
      // The database has a NOT NULL constraint on this field
      assignedTo: assignedTo[0]
    }, { transaction });
    
    // Create exam questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      for (const question of questions) {
        await ExamQuestion.create({
          examId: exam.id,
          questionNumber: question.questionNumber,
          questionText: question.questionText,
          responseType: question.responseType,
          options: question.options,
          correctAnswer: question.correctAnswer,
          points: question.points || 1
        }, { transaction });
      }
    }
    
    // Create exam assignments for teachers
    for (const teacherId of assignedTo) {
      await ExamAssignment.create({
        examId: exam.id,
        teacherId,
        status: 'assigned'
      }, { transaction });
    }
    
    await transaction.commit();
    
    // Return the created exam with all details
    const createdExam = await Exam.findByPk(exam.id, {
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
          include: [{
            model: Teacher,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName']
          }]
        }
      ]
    });
    
    return res.status(201).json(createdExam);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating exam:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;