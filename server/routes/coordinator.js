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
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) {
      userTimezone = req.user.timezone;
    }
    
    const { startDate, endDate, teacherId } = req.query;
    let whereClause = {};
    
    if (teacherId) {
      whereClause = {
        [Op.or]: [
          { oldTeacherId: teacherId },
          { newTeacherId: teacherId },
          { '$newClass.teacherId$': teacherId },
          { '$oldClass.teacherId$': teacherId }
        ]
      };
    }
    
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
        { model: Student, as: 'student', attributes: ['id', 'name', 'surname'] },
        { model: Class, as: 'oldClass' },
        { model: Class, as: 'newClass' },
        { model: Teacher, as: 'oldTeacher' },
        { model: Teacher, as: 'newTeacher' }
      ],
      order: [['rescheduledAt', 'DESC']]
    });
    
    const enhancedReschedules = reschedules.map(reschedule => {
      const rescheduleData = reschedule.toJSON();
      if (rescheduleData.oldClass) {
        const oldClassUserTime = timezoneUtils.convertFromAdminToUserTimezone(
          rescheduleData.oldClass.date, rescheduleData.oldClass.startTime, userTimezone
        );
        rescheduleData.oldClass.userDate = oldClassUserTime.date;
        rescheduleData.oldClass.userStartTime = oldClassUserTime.time;
      }
      if (rescheduleData.newClass) {
        const newClassUserTime = timezoneUtils.convertFromAdminToUserTimezone(
          rescheduleData.newClass.date, rescheduleData.newClass.startTime, userTimezone
        );
        rescheduleData.newClass.userDate = newClassUserTime.date;
        rescheduleData.newClass.userStartTime = newClassUserTime.time;
      }
      if (rescheduleData.oldTeacher) rescheduleData.oldTeacherName = `${rescheduleData.oldTeacher.firstName} ${rescheduleData.oldTeacher.lastName}`;
      if (rescheduleData.newTeacher) rescheduleData.newTeacherName = `${rescheduleData.newTeacher.firstName} ${rescheduleData.newTeacher.lastName}`;
      
      rescheduleData.adminTimezone = timezoneUtils.ADMIN_TIMEZONE;
      rescheduleData.userTimezone = userTimezone;
      return rescheduleData;
    });
    
    return res.json(enhancedReschedules);
  } catch (error) {
    console.error('Error fetching rescheduled classes:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =====================================================================
// RUTA MODIFICADA: Get teacher schedule (INCLUYE weeklySchedule)
// =====================================================================
router.get('/teachers/:id/schedule', async (req, res) => {
  try {
    const teacherId = req.params.id;
    
    // Buscamos al profesor incluyendo sus estudiantes y la tabla pivot (TeacherStudent)
    const teacher = await Teacher.findByPk(teacherId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['email', 'username']
        },
        {
          model: Student,
          as: 'students',
          attributes: ['id', 'name', 'surname', 'phone'],
          through: { 
            model: TeacherStudent,
            as: 'TeacherStudent', // Alias consistente con el frontend
            attributes: ['weeklySchedule', 'active'], // TRAEMOS EL HORARIO PERMANENTE
            where: { active: true }
          },
          include: [{ model: User, as: 'user', attributes: ['email'] }]
        }
      ],
      attributes: ['id', 'firstName', 'lastName', 'phone', 'workHours', 'breakHours', 'specialties', 'isCoordinator', 'workingDays']
    });
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const assignedStudents = teacher.students || [];

    // Obtener las clases del calendario (instancias reales)
    const classesWithStudents = await Class.findAll({
      where: { teacherId },
      include: [{
        model: Student,
        as: 'students',
        through: { attributes: ['status'] },
        attributes: ['id', 'name', 'surname'],
        required: false
      }],
      attributes: ['id', 'title', 'date', 'startTime', 'endTime', 'status', 'notes']
    });
    
    const teacherClasses = classesWithStudents.map(cls => {
      const classData = cls.toJSON();
      const student = classData.students && classData.students.length > 0 ? classData.students[0] : null;
      return {
        ...classData,
        studentId: student ? student.id : null,
        studentName: student ? `${student.name} ${student.surname}` : null,
        students: undefined
      };
    });

    // Obtener las reprogramaciones
    const rescheduledClasses = await RescheduleClass.findAll({
      where: { [Op.or]: [{ oldTeacherId: teacherId }, { newTeacherId: teacherId }] },
      include: [{ model: Student, as: 'student' }, { model: Class, as: 'oldClass' }, { model: Class, as: 'newClass' }]
    });
    
    // Obtener zona horaria del usuario para conversiones
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) {
      userTimezone = req.user.timezone;
    }
    
    const response = {
      teacher: {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          user: teacher.user
      },
      assignedStudents, // Estos incluyen el .TeacherStudent.weeklySchedule
      workHours: teacher.workHours,
      breakHours: teacher.breakHours,
      workingDays: teacher.workingDays,
      classes: teacherClasses,
      rescheduledClasses: rescheduledClasses.map(r => r.toJSON()),
      adminTimezone: timezoneUtils.ADMIN_TIMEZONE,
      userTimezone: userTimezone,
      tasks: [],
      exams: []
    };

    // Procesar fechas de reprogramaciones para la zona horaria del usuario
    response.rescheduledClasses = response.rescheduledClasses.map(reschedule => {
      if (reschedule.oldClass) {
        const oldTime = timezoneUtils.convertFromAdminToUserTimezone(reschedule.oldClass.date, reschedule.oldClass.startTime, userTimezone);
        reschedule.oldClass.userDate = oldTime.date;
        reschedule.oldClass.userStartTime = oldTime.time;
      }
      if (reschedule.newClass) {
        const newTime = timezoneUtils.convertFromAdminToUserTimezone(reschedule.newClass.date, reschedule.newClass.startTime, userTimezone);
        reschedule.newClass.userDate = newTime.date;
        reschedule.newClass.userStartTime = newTime.time;
      }
      return reschedule;
    });

    return res.json(response);

  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update task status (review a completed task)
router.patch('/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.status !== 'completed' || status !== 'reviewed') return res.status(400).json({ message: 'Invalid status transition' });

    await task.update({ status, reviewNotes, reviewedAt: new Date() });
    const updatedTask = await Task.findByPk(id, {
      include: [
          { model: Teacher, as: 'assignedTeacher', attributes: ['id', 'firstName', 'lastName'] },
          { model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });
    return res.json(updatedTask);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/tasks/history', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { status: { [Op.in]: ['completed', 'reviewed', 'cancelled'] } },
      include: [
          { model: Teacher, as: 'assignedTeacher', attributes: ['id', 'firstName', 'lastName'] },
          { model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    return res.json(tasks.map(t => ({ ...t.toJSON(), assignedTo: t.assignedTeacher ? t.assignedTeacher.id : null })));
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/exams/history', async (req, res) => {
  try {
    const exams = await Exam.findAll({
      where: { status: { [Op.in]: ['completed', 'approved', 'rejected'] } },
      include: [
          { model: Teacher, as: 'assignedTeacher', attributes: ['id', 'firstName', 'lastName'] },
          { model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] },
          { model: ExamQuestion, as: 'questions', attributes: ['id'] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    return res.json(exams.map(e => ({ ...e.toJSON(), assignedTo: e.assignedTeacher ? e.assignedTeacher.id : null, totalQuestions: e.questions ? e.questions.length : 0 })));
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      include: [
          { model: Teacher, as: 'assignedTeacher', attributes: ['id', 'firstName', 'lastName'] },
          { model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json(tasks.map(t => ({ ...t.toJSON(), assignedTo: t.assignedTeacher ? t.assignedTeacher.id : null })));
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const { title, description, dueDate, assignedTo } = req.body;
    const coordinator = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!coordinator) return res.status(403).json({ message: 'Not authorized' });

    const task = await Task.create({ title, description, dueDate: dueDate || null, assignedTo, assignedBy: coordinator.id, status: 'pending' });
    const taskWithTeacher = await Task.findByPk(task.id, {
      include: [
          { model: Teacher, as: 'assignedTeacher', attributes: ['id', 'firstName', 'lastName'] },
          { model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });
    return res.status(201).json(taskWithTeacher);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/exams', async (req, res) => {
  try {
    const exams = await Exam.findAll({
      include: [
          { model: Teacher, as: 'assignedTeacher', attributes: ['id', 'firstName', 'lastName'] },
          { model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] },
          { model: ExamQuestion, as: 'questions', attributes: ['id'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json(exams.map(e => ({ ...e.toJSON(), assignedTo: e.assignedTeacher ? e.assignedTeacher.id : null, totalQuestions: e.questions ? e.questions.length : 0 })));
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/exams', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { title, description, dueDate, assignedTo, questions } = req.body;
    const coordinator = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!coordinator) return res.status(403).json({ message: 'Not authorized' });

    const exam = await Exam.create({
      title, description, dueDate: dueDate || null, createdBy: coordinator.id, status: 'draft',
      totalQuestions: questions ? questions.length : 0, assignedTo: assignedTo[0]
    }, { transaction });

    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        await ExamQuestion.create({ examId: exam.id, ...q }, { transaction });
      }
    }
    for (const tId of assignedTo) {
      await ExamAssignment.create({ examId: exam.id, teacherId: tId, status: 'assigned' }, { transaction });
    }
    await transaction.commit();

    const createdExam = await Exam.findByPk(exam.id, {
      include: [
          { model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] },
          { model: ExamQuestion, as: 'questions' },
          { model: ExamAssignment, as: 'assignments', include: [{ model: Teacher, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] }] }
      ]
    });
    return res.status(201).json(createdExam);
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;