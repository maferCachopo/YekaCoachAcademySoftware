const express = require('express');
const router = express.Router();
const { User, Teacher, Student, TeacherStudent, TeacherActivity, Class, StudentClass, StudentPackage, Package, RescheduleClass, sequelize, Task, Exam, ExamQuestion, ExamAnswer, ExamAssignment } = require('../models');
const { verifyToken, hasRole, isTeacher } = require('../middleware/auth');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const timezoneUtils = require('../utils/timezoneUtils');

router.use(verifyToken);

router.get('/:id/available-slots', async (req, res, next) => { next(); });
router.get('/available-slots', async (req, res, next) => { next(); });

router.get('/tasks', hasRole(['teacher']), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    const tasks = await Task.findAll({
      where: { assignedTo: teacher.id },
      include: [{ model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']]
    });
    return res.json(tasks);
  } catch (error) {
    console.error('Error fetching teacher tasks:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/tasks/:id', hasRole(['teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    const task = await Task.findByPk(id, {
      include: [{ model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }]
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assignedTo !== teacher.id) return res.status(403).json({ message: 'You do not have access to this task' });
    return res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.patch('/tasks/:id/start', hasRole(['teacher']), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!teacher) { await transaction.rollback(); return res.status(404).json({ message: 'Teacher not found' }); }
    const task = await Task.findByPk(id);
    if (!task) { await transaction.rollback(); return res.status(404).json({ message: 'Task not found' }); }
    if (task.assignedTo !== teacher.id) { await transaction.rollback(); return res.status(403).json({ message: 'You do not have access to this task' }); }
    if (task.status !== 'pending') { await transaction.rollback(); return res.status(400).json({ message: 'Task must be in pending status to start' }); }
    await task.update({ status: 'in_progress' }, { transaction });
    await transaction.commit();
    return res.json(task);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating task status:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.patch('/tasks/:id/complete', hasRole(['teacher']), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { completionDetails } = req.body;
    if (!completionDetails) { await transaction.rollback(); return res.status(400).json({ message: 'Completion details are required' }); }
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!teacher) { await transaction.rollback(); return res.status(404).json({ message: 'Teacher not found' }); }
    const task = await Task.findByPk(id);
    if (!task) { await transaction.rollback(); return res.status(404).json({ message: 'Task not found' }); }
    if (task.assignedTo !== teacher.id) { await transaction.rollback(); return res.status(403).json({ message: 'You do not have access to this task' }); }
    if (task.status !== 'pending' && task.status !== 'in_progress') { await transaction.rollback(); return res.status(400).json({ message: 'Task must be in pending or in_progress status to complete' }); }
    await task.update({ status: 'completed', completionDetails }, { transaction });
    await transaction.commit();
    return res.json(task);
  } catch (error) {
    await transaction.rollback();
    console.error('Error completing task:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/exams', hasRole(['teacher']), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    const exams = await Exam.findAll({
      where: { assignedTo: teacher.id, status: { [Op.in]: ['assigned', 'completed', 'approved', 'rejected'] } },
      order: [['dueDate', 'ASC'], ['createdAt', 'DESC']],
      include: [{ model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }]
    });
    return res.json(exams);
  } catch (error) {
    console.error('Error fetching teacher exams:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/exams/:id', hasRole(['teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    let examAssignment = null;
    try { examAssignment = await ExamAssignment.findOne({ where: { examId: id, teacherId: teacher.id } }); } catch (err) { console.error('Error finding exam assignment:', err); }
    let whereCondition = { id };
    if (!examAssignment) whereCondition.assignedTo = teacher.id;
    const exam = await Exam.findOne({
      where: whereCondition,
      include: [
        { model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] },
        { model: ExamQuestion, as: 'questions', include: [{ model: ExamAnswer, as: 'answers', where: { teacherId: teacher.id }, required: false }] }
      ]
    });
    if (!exam) return res.status(404).json({ message: 'Exam not found or not assigned to you' });
    const status = examAssignment ? examAssignment.status : exam.status;
    return res.json({ ...exam.toJSON(), status });
  } catch (error) {
    console.error('Error fetching exam details:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/exams/:examId/questions/:questionId/answer', hasRole(['teacher']), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { examId, questionId } = req.params;
    const { answerText, selectedOption } = req.body;
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!teacher) { await transaction.rollback(); return res.status(404).json({ message: 'Teacher not found' }); }
    let examAssignment = null;
    try { examAssignment = await ExamAssignment.findOne({ where: { examId, teacherId: teacher.id, status: 'assigned' } }); } catch (err) { console.error('Error finding exam assignment for answer submission:', err); }
    const exam = await Exam.findOne({ where: { id: examId, [Op.or]: [{ assignedTo: teacher.id }, { id: examAssignment ? examAssignment.examId : null }] } });
    if (!exam) { await transaction.rollback(); return res.status(404).json({ message: 'Exam not found, not assigned to you, or already completed' }); }
    const allowedStatuses = ['assigned', 'draft'];
    if (!allowedStatuses.includes(exam.status)) { await transaction.rollback(); return res.status(403).json({ message: 'Exam is not in an editable state' }); }
    let question = null;
    try {
      question = await ExamQuestion.findOne({ where: { id: questionId, examId } });
      if (!question) {
        question = await ExamQuestion.findByPk(questionId);
        if (question && question.examId != examId) { await transaction.rollback(); return res.status(404).json({ message: `Question ${questionId} belongs to another exam` }); }
      }
    } catch (err) { console.error('Error finding question:', err); }
    if (!question) { await transaction.rollback(); return res.status(404).json({ message: 'Question not found or not part of this exam' }); }
    let answer = null;
    try { answer = await ExamAnswer.findOne({ where: { examId, questionId, teacherId: teacher.id } }); } catch (err) { console.error('Error finding existing answer:', err); }
    try {
      if (answer) {
        if (question.responseType === 'multiple_choice' || question.responseType === 'true_false') {
          await answer.update({ selectedOption, answerText: null }, { transaction });
        } else {
          await answer.update({ answerText, selectedOption: null }, { transaction });
        }
      } else {
        if (question.responseType === 'multiple_choice' || question.responseType === 'true_false') {
          answer = await ExamAnswer.create({ examId, questionId, teacherId: teacher.id, selectedOption, answerText: null }, { transaction });
        } else {
          answer = await ExamAnswer.create({ examId, questionId, teacherId: teacher.id, answerText, selectedOption: null }, { transaction });
        }
      }
    } catch (err) { console.error('Error saving answer:', err); await transaction.rollback(); return res.status(500).json({ message: 'Error saving answer', error: err.message }); }
    if ((question.responseType === 'multiple_choice' || question.responseType === 'true_false') && question.correctAnswer !== null && question.correctAnswer !== undefined) {
      try { const isCorrect = String(selectedOption) === String(question.correctAnswer); await answer.update({ isCorrect }, { transaction }); } catch (err) { console.error('Error updating isCorrect flag:', err); }
    }
    await transaction.commit();
    return res.json({ id: answer.id, examId: Number(examId), questionId: Number(questionId), teacherId: teacher.id, answerText: answer.answerText, selectedOption: answer.selectedOption, success: true });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting answer:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.patch('/exams/:id/submit', hasRole(['teacher']), async (req, res) => {
  const transaction = await sequelize.transaction();
  let examAssignment = null;
  try {
    const { id } = req.params;
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!teacher) { await transaction.rollback(); return res.status(404).json({ message: 'Teacher not found' }); }
    try { examAssignment = await ExamAssignment.findOne({ where: { examId: id, teacherId: teacher.id, status: { [Op.in]: ['assigned', 'draft'] } } }); } catch (err) { console.error('Error finding exam assignment for submission:', err); }
    if (!examAssignment) {
      const exam = await Exam.findOne({ where: { id, assignedTo: teacher.id, status: { [Op.in]: ['assigned', 'draft'] } } });
      if (!exam) { await transaction.rollback(); return res.status(404).json({ message: 'Exam not found, not assigned to you, or already completed' }); }
      try { examAssignment = await ExamAssignment.create({ examId: id, teacherId: teacher.id, status: 'assigned' }, { transaction }); } catch (err) { console.error('Error creating exam assignment:', err); examAssignment = { status: 'assigned' }; }
    }
    try { const exam = await Exam.findByPk(id); if (exam) await exam.update({ status: 'completed' }, { transaction }); } catch (err) { console.error('Error updating exam status:', err); }
    if (examAssignment && typeof examAssignment.update === 'function') {
      try { await examAssignment.update({ status: 'completed', completedAt: new Date() }, { transaction }); } catch (err) { console.error('Error updating exam assignment status:', err); }
    }
    await transaction.commit();
    return res.json({ success: true, message: 'Exam submitted successfully', examId: parseInt(id), status: 'completed', completedAt: new Date() });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting exam:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', verifyToken, hasRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const showInactive = req.query.showInactive === 'true';
    const whereClause = !showInactive ? { active: true } : {};
    const teachers = await Teacher.findAll({
      where: whereClause,
      include: [{ model: User, as: 'user', attributes: ['username', 'email'] }]
    });
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

router.get('/:id', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['username', 'email'] }]
    });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ error: 'Failed to fetch teacher' });
  }
});

router.post('/', verifyToken, hasRole(['admin']), async (req, res) => {
  const { username, email, password, firstName, lastName, phone, workHours, breakHours, specialties, maxStudentsPerDay, isCoordinator, workingDays } = req.body;
  try {
    const result = await sequelize.transaction(async (t) => {
      const user = await User.create({ username, email, password, role: isCoordinator ? 'coordinator' : 'teacher' }, { transaction: t });
      const teacher = await Teacher.create({ userId: user.id, firstName, lastName, phone, workHours, breakHours, specialties, maxStudentsPerDay, isCoordinator, workingDays }, { transaction: t });
      return { user, teacher };
    });
    res.status(201).json(result.teacher);
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: 'Failed to create teacher', details: error.message });
  }
});

router.put('/:id', verifyToken, hasRole(['admin']), async (req, res) => {
  const { firstName, lastName, phone, workHours, breakHours, specialties, maxStudentsPerDay, isCoordinator, active, workingDays } = req.body;
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    await sequelize.transaction(async (t) => {
      await teacher.update({ firstName, lastName, phone, workHours, breakHours, specialties, maxStudentsPerDay, isCoordinator, active, workingDays }, { transaction: t });
      if (isCoordinator !== undefined) await User.update({ role: isCoordinator ? 'coordinator' : 'teacher' }, { where: { id: teacher.userId }, transaction: t });
    });
    const updatedTeacher = await Teacher.findByPk(req.params.id, { include: [{ model: User, as: 'user', attributes: ['username', 'email'] }] });
    res.json(updatedTeacher);
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: 'Failed to update teacher', details: error.message });
  }
});

router.delete('/:id', verifyToken, hasRole(['admin']), async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const user = await User.findByPk(teacher.userId);
    const t = await sequelize.transaction();
    try {
      await teacher.update({ active: false }, { transaction: t });
      if (user) await user.update({ active: false }, { transaction: t });
      const teacherClasses = await Class.findAll({ where: { teacherId: teacher.id, status: { [Op.notIn]: ['cancelled', 'completed', 'no-show'] } }, transaction: t });
      for (const classItem of teacherClasses) {
        await classItem.update({ status: 'cancelled', notes: classItem.notes ? `${classItem.notes}\n[SYSTEM] Cancelled due to teacher deletion` : '[SYSTEM] Cancelled due to teacher deletion' }, { transaction: t });
      }
      await TeacherStudent.update({ active: false }, { where: { teacherId: teacher.id, active: true }, transaction: t });
      await t.commit();
      res.json({ message: 'Teacher deactivated successfully', classesUpdated: teacherClasses.length });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deactivating teacher:', error);
    res.status(500).json({ error: 'Failed to deactivate teacher' });
  }
});

// =====================================================================
// Get teacher schedule
// =====================================================================
router.get('/:id/schedule', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  console.log('\n=== SCHEDULE ROUTE START ===');
  try {
    const teacherId = req.params.id;
    const { startDate, endDate } = req.query;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) userTimezone = req.user.timezone;

    let studentsWithSchedule = [];
    try {
      studentsWithSchedule = await Student.findAll({
        attributes: ['id', 'name', 'surname'],
        include: [{ model: Teacher, as: 'teachers', where: { id: teacherId }, through: { attributes: ['weeklySchedule'], where: { active: true } } }]
      });
    } catch (err) { console.error('Step 4 FAILED:', err.message); throw err; }

    const assignedStudents = studentsWithSchedule.map(student => {
      const pivot = student.teachers && student.teachers.length > 0 ? student.teachers[0].TeacherStudent : null;
      let rawSchedule = [];
      if (pivot && pivot.weeklySchedule) {
        try { rawSchedule = typeof pivot.weeklySchedule === 'string' ? JSON.parse(pivot.weeklySchedule) : pivot.weeklySchedule; } catch (e) { rawSchedule = []; }
      }
      const fixedSchedule = (Array.isArray(rawSchedule) ? rawSchedule : []).map(slot => {
        const hour = slot.hour !== undefined ? parseInt(slot.hour) : parseInt((slot.startTime || '0:00').split(':')[0]);
        return { day: slot.day, hour, startTime: slot.startTime || `${String(hour).padStart(2,'0')}:00`, endTime: slot.endTime || `${String(hour+1).padStart(2,'0')}:00` };
      });
      return { id: student.id, fullName: `${student.name} ${student.surname}`, fixedSchedule };
    });

    const dateFilter = {};
    if (startDate && endDate) dateFilter[Op.between] = [startDate, endDate];
    else if (startDate) dateFilter[Op.gte] = startDate;
    else if (endDate) dateFilter[Op.lte] = endDate;

    let activities = [];
    try {
      activities = await TeacherActivity.findAll({ where: { teacherId: teacher.id, ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) }, order: [['date', 'ASC'], ['startTime', 'ASC']] });
    } catch (err) { console.error('Step 6 FAILED:', err.message); throw err; }

    const formattedActivities = activities.map(activity => {
      const userTime = timezoneUtils.convertFromAdminToUserTimezone(activity.date, activity.startTime, userTimezone);
      return { ...activity.toJSON(), userDate: userTime.date, userStartTime: userTime.time };
    });

    let classesWithStudents = [];
    try {
      classesWithStudents = await Class.findAll({
        where: { teacherId: teacher.id, ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
        include: [{ model: Student, as: 'students', through: { model: StudentClass, attributes: ['status'] }, attributes: ['id', 'name', 'surname'], required: false }],
        attributes: ['id', 'title', 'date', 'startTime', 'endTime', 'status', 'notes', 'timezone'],
        order: [['date', 'ASC'], ['startTime', 'ASC']]
      });
    } catch (err) { console.error('Step 7 FAILED:', err.message); throw err; }

    const formattedClasses = classesWithStudents.map(cls => {
      const classData = cls.toJSON();
      const student = classData.students && classData.students.length > 0 ? classData.students[0] : null;
      const classTimezone = classData.timezone || timezoneUtils.ADMIN_TIMEZONE;
      const userClassTime = timezoneUtils.convertTimezoneSafe(classData.date, classData.startTime, classTimezone, userTimezone);
      return { ...classData, studentId: student ? student.id : null, studentName: student ? student.name : null, studentSurname: student ? student.surname : null, userDate: userClassTime.date, userStartTime: userClassTime.time, students: undefined };
    });

    let rescheduledClasses = [];
    try {
      rescheduledClasses = await RescheduleClass.findAll({
        where: { [Op.or]: [{ oldTeacherId: teacherId }, { newTeacherId: teacherId }] },
        include: [{ model: Student, as: 'student' }, { model: Class, as: 'oldClass' }, { model: Class, as: 'newClass' }]
      });
    } catch (err) { console.error('Step 8 FAILED:', err.message); throw err; }

    const formattedRescheduled = rescheduledClasses.map(r => {
      const rJson = r.toJSON();
      if (rJson.oldClass) { const t = timezoneUtils.convertFromAdminToUserTimezone(rJson.oldClass.date, rJson.oldClass.startTime, userTimezone); rJson.oldClass.userDate = t.date; rJson.oldClass.userStartTime = t.time; }
      if (rJson.newClass) { const t = timezoneUtils.convertFromAdminToUserTimezone(rJson.newClass.date, rJson.newClass.startTime, userTimezone); rJson.newClass.userDate = t.date; rJson.newClass.userStartTime = t.time; }
      return rJson;
    });

    console.log('=== SCHEDULE ROUTE END OK ===\n');
    return res.json({ teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName }, workHours: teacher.workHours, breakHours: teacher.breakHours, workingDays: teacher.workingDays, assignedStudents, activities: formattedActivities, classes: formattedClasses, rescheduledClasses: formattedRescheduled, adminTimezone: timezoneUtils.ADMIN_TIMEZONE, userTimezone, tasks: [], exams: [] });
  } catch (error) {
    console.error('=== SCHEDULE ROUTE CRASH ===', error.message);
    return res.status(500).json({ error: 'Failed to fetch teacher schedule', details: error.message, errorName: error.name });
  }
});

router.get('/:id/students', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    const students = await Student.findAll({
      where: { active: true },
      include: [
        { model: Teacher, as: 'teachers', where: { id: teacherId }, through: { where: { active: true }, attributes: ['assignedDate', 'notes'] } },
        { model: User, as: 'user', attributes: ['email'] }
      ]
    });
    res.json(students);
  } catch (error) {
    console.error('Error fetching teacher students:', error);
    res.status(500).json({ error: 'Failed to fetch teacher students' });
  }
});

router.post('/:id/students', verifyToken, hasRole(['admin']), async (req, res) => {
  try {
    const { studentId, notes, weeklySchedule } = req.body;
    const teacherId = req.params.id;
    if (!studentId) return res.status(400).json({ error: 'Student ID is required' });
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const student = await Student.findByPk(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const existingAssignment = await TeacherStudent.findOne({ where: { studentId, active: true, teacherId: { [Op.ne]: teacherId } } });
    if (existingAssignment) {
      const existingTeacher = await Teacher.findByPk(existingAssignment.teacherId);
      const teacherName = existingTeacher ? `${existingTeacher.firstName} ${existingTeacher.lastName}` : 'another teacher';
      return res.status(400).json({ error: 'Student is already assigned to another teacher', teacherId: existingAssignment.teacherId, teacherName });
    }
    const existingTeacherAssignment = await TeacherStudent.findOne({ where: { studentId, teacherId, active: true } });
    if (existingTeacherAssignment) { if (weeklySchedule) await existingTeacherAssignment.update({ weeklySchedule }); return res.status(200).json(existingTeacherAssignment); }
    const inactiveAssignment = await TeacherStudent.findOne({ where: { studentId, teacherId, active: false } });
    if (inactiveAssignment) { await inactiveAssignment.update({ active: true, assignedDate: new Date(), notes: notes || inactiveAssignment.notes, weeklySchedule: weeklySchedule || inactiveAssignment.weeklySchedule }); return res.status(200).json(inactiveAssignment); }
    const assignment = await TeacherStudent.create({ teacherId, studentId, notes, assignedDate: new Date(), active: true, weeklySchedule: weeklySchedule || [] });
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error assigning student to teacher:', error);
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ error: 'Student already has a relationship with this teacher. Try removing the student first and then adding them again.' });
    res.status(500).json({ error: 'Failed to assign student to teacher' });
  }
});

router.delete('/:id/students/:studentId', verifyToken, hasRole(['admin']), async (req, res) => {
  try {
    const { id: teacherId, studentId } = req.params;
    const assignment = await TeacherStudent.findOne({ where: { teacherId, studentId, active: true } });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    await assignment.update({ active: false });
    res.json({ message: 'Student removed from teacher successfully' });
  } catch (error) {
    console.error('Error removing student from teacher:', error);
    res.status(500).json({ error: 'Failed to remove student from teacher' });
  }
});

router.delete('/:id/students/:studentId/hard', verifyToken, hasRole(['admin']), async (req, res) => {
  try {
    const { id: teacherId, studentId } = req.params;
    const result = await TeacherStudent.destroy({ where: { teacherId, studentId } });
    if (result === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ message: 'Student completely removed from teacher successfully' });
  } catch (error) {
    console.error('Error completely removing student from teacher:', error);
    res.status(500).json({ error: 'Failed to completely remove student from teacher' });
  }
});

router.get('/:id/activities', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { startDate, endDate } = req.query;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });

    // 1. One-time activities filtered by date range
    let where = { teacherId, isPermanent: false };
    if (startDate && endDate) where.date = { [Op.between]: [startDate, endDate] };
    else if (startDate) where.date = { [Op.gte]: startDate };
    else if (endDate) where.date = { [Op.lte]: endDate };
    const oneTimeActivities = await TeacherActivity.findAll({ where, order: [['date', 'ASC'], ['startTime', 'ASC']] });

    // 2. All permanent activities (they exist in every week)
    const permanentActivities = await TeacherActivity.findAll({
      where: { teacherId, isPermanent: true },
      order: [['startTime', 'ASC']]
    });

    // 3. Auto-complete permanent activities whose weekday has already passed today
    const today = moment().format('YYYY-MM-DD');
    const DOW_MAP = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
    for (const act of permanentActivities) {
      if (act.dayOfWeek && act.date < today) {
        // Mark as completed if it hasn't been updated yet
        if (act.status === 'scheduled') {
          await act.update({ status: 'completed' });
          act.status = 'completed';
        }
      }
    }

    const classes = await Class.findAll({
      where: { teacherId, ...(where.date ? { date: where.date } : {}) },
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });

    res.json({ activities: [...oneTimeActivities, ...permanentActivities], classes });
  } catch (error) {
    console.error('Error fetching teacher activities:', error);
    res.status(500).json({ error: 'Failed to fetch teacher activities' });
  }
});

router.post('/:id/activities', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { title, description, date, startTime, endTime, type, deadline, notes, isPermanent } = req.body;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    const appTimezone = process.env.APP_TIMEZONE || 'UTC';

    // Auto-derive dayOfWeek from date
    const DOW_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayOfWeek = date ? DOW_NAMES[new Date(date + 'T12:00:00').getDay()] : null;

    const activity = await TeacherActivity.create({
      teacherId, title, description, date, startTime, endTime, type, deadline, notes,
      timezone: appTimezone,
      status: 'scheduled',
      isPermanent: !!isPermanent,
      dayOfWeek: isPermanent ? dayOfWeek : null
    });
    res.status(201).json(activity);
  } catch (error) {
    console.error('Error creating teacher activity:', error);
    res.status(500).json({ error: 'Failed to create teacher activity' });
  }
});

router.put('/:id/activities/:activityId', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const { id: teacherId, activityId } = req.params;
    const { title, description, date, startTime, endTime, type, status, deadline, notes } = req.body;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    const activity = await TeacherActivity.findOne({ where: { id: activityId, teacherId } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    await activity.update({ title, description, date, startTime, endTime, type, status, deadline, notes });
    res.json(activity);
  } catch (error) {
    console.error('Error updating teacher activity:', error);
    res.status(500).json({ error: 'Failed to update teacher activity' });
  }
});

router.delete('/:id/activities/:activityId', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const { id: teacherId, activityId } = req.params;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    const activity = await TeacherActivity.findOne({ where: { id: activityId, teacherId } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    await activity.destroy();
    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher activity:', error);
    res.status(500).json({ error: 'Failed to delete teacher activity' });
  }
});

router.get('/:id/tasks', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { status } = req.query;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    const whereConditions = { assignedTo: teacher.id };
    if (status) whereConditions.status = status;
    const tasks = await Task.findAll({ where: whereConditions, include: [{ model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }], order: [['dueDate', 'ASC'], ['createdAt', 'DESC']] });
    return res.json(tasks || []);
  } catch (error) {
    console.error('Error fetching teacher tasks:', error);
    res.status(500).json({ error: 'Failed to fetch teacher tasks' });
  }
});

router.post('/:id/tasks/:taskId/submit', verifyToken, hasRole(['teacher']), async (req, res) => {
  try {
    const { id: teacherId, taskId } = req.params;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    res.json({ success: true, message: 'Task submitted successfully', taskId: parseInt(taskId) });
  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

router.get('/:id/exams', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { status } = req.query;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    const whereConditions = { assignedTo: teacherId };
    if (status) {
      if (status === 'pending') whereConditions.status = { [Op.in]: ['assigned', 'draft'] };
      else if (status === 'completed') whereConditions.status = { [Op.in]: ['completed', 'approved', 'rejected'] };
      else whereConditions.status = status;
    }
    const examsData = await Exam.findAll({ where: whereConditions, include: [{ model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }, { model: ExamQuestion, as: 'questions' }, { model: ExamAssignment, as: 'assignments', where: { teacherId }, required: false }], order: [['createdAt', 'DESC']] });
    if (!examsData || examsData.length === 0) return res.json([]);
    const formattedExams = examsData.map(exam => {
      const examAssignment = exam.assignments && exam.assignments.length > 0 ? exam.assignments[0] : null;
      return { id: exam.id, title: exam.title, description: exam.description, dueDate: exam.dueDate, status: exam.status, completedDate: (exam.status === 'completed' || exam.status === 'approved' || exam.status === 'rejected') ? (examAssignment?.completedAt || exam.updatedAt) : null, reviewNotes: examAssignment?.reviewNotes || exam.reviewNotes || null, students: [], result: exam.status === 'completed' ? 'Completed' : exam.status === 'approved' ? 'Approved' : exam.status === 'rejected' ? 'Rejected' : null, coordinator: exam.coordinator ? `${exam.coordinator.firstName} ${exam.coordinator.lastName}` : 'System Coordinator', totalQuestions: exam.questions ? exam.questions.length : 0 };
    });
    res.json(formattedExams);
  } catch (error) {
    console.error('Error fetching teacher exams:', error);
    res.status(500).json({ error: 'Failed to fetch teacher exams' });
  }
});

router.get('/:id/history', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });

    const tasks = await Task.findAll({ where: { assignedTo: teacher.id, status: { [Op.in]: ['completed', 'reviewed'] } }, include: [{ model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }], order: [['updatedAt', 'DESC']] });
    const formattedTasks = tasks.map(task => ({ id: task.id, title: task.title, description: task.description, completedDate: task.reviewedAt || task.updatedAt, dueDate: task.dueDate, status: task.status, result: task.completionDetails || (task.status === 'completed' ? 'Completed' : task.status === 'reviewed' ? 'Reviewed' : task.status), coordinator: task.coordinator ? `${task.coordinator.firstName} ${task.coordinator.lastName}` : 'System', reviewNotes: task.reviewNotes }));

    const exams = await Exam.findAll({ where: { assignedTo: teacher.id, status: { [Op.in]: ['completed', 'approved', 'rejected'] } }, include: [{ model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }, { model: ExamQuestion, as: 'questions', attributes: ['id'] }], order: [['updatedAt', 'DESC']] });
    const examAssignments = await ExamAssignment.findAll({ where: { teacherId: teacher.id, status: { [Op.in]: ['completed', 'approved', 'rejected'] } }, include: [{ model: Exam, as: 'exam', include: [{ model: Teacher, as: 'coordinator', attributes: ['id', 'firstName', 'lastName'] }, { model: ExamQuestion, as: 'questions', attributes: ['id'] }] }], order: [['updatedAt', 'DESC']] });
    const directExams = exams.map(exam => ({ id: exam.id, title: exam.title, description: exam.description, completedDate: exam.reviewedAt || exam.updatedAt, dueDate: exam.dueDate, status: exam.status, result: exam.status === 'completed' ? 'Completed' : exam.status === 'approved' ? 'Approved' : 'Rejected', totalQuestions: exam.questions ? exam.questions.length : 0, coordinator: exam.coordinator ? `${exam.coordinator.firstName} ${exam.coordinator.lastName}` : 'System', reviewNotes: exam.reviewNotes }));
    const assignedExams = examAssignments.map(assignment => {
      const exam = assignment.exam;
      if (!exam) return null;
      return { id: exam.id, title: exam.title, description: exam.description, completedDate: assignment.completedAt || assignment.updatedAt, dueDate: exam.dueDate, status: assignment.status, result: assignment.status === 'completed' ? 'Completed' : assignment.status === 'approved' ? 'Approved' : 'Rejected', totalQuestions: exam.questions ? exam.questions.length : 0, coordinator: exam.coordinator ? `${exam.coordinator.firstName} ${exam.coordinator.lastName}` : 'System', reviewNotes: assignment.reviewNotes };
    }).filter(Boolean);
    const examIds = new Set();
    const formattedExams = [...directExams, ...assignedExams].filter(exam => { if (examIds.has(exam.id)) return false; examIds.add(exam.id); return true; });

    // ── Activities history ──
    const today = moment().format('YYYY-MM-DD');
    const DOW_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

    // 1. One-time activities that are in the past (completed or their date already passed)
    const pastOneTime = await TeacherActivity.findAll({
      where: {
        teacherId: teacher.id,
        isPermanent: false,
        date: { [Op.lt]: today }
      },
      order: [['date', 'DESC']]
    });

    // 2. Permanent activities — generate one occurrence entry per past week-day since creation
    const permanentActivities = await TeacherActivity.findAll({
      where: { teacherId: teacher.id, isPermanent: true },
      order: [['date', 'ASC']]
    });

    const pastActivityEntries = [];

    // Completed / past one-time
    for (const act of pastOneTime) {
      pastActivityEntries.push({
        id: `ot-${act.id}`,
        activityId: act.id,
        title: act.title,
        description: act.description,
        type: act.type,
        date: act.date,
        startTime: act.startTime,
        endTime: act.endTime,
        isPermanent: false,
        status: 'completed'
      });
    }

    // Permanent: generate one entry per past occurrence (from creation date up to yesterday)
    for (const act of permanentActivities) {
      if (!act.dayOfWeek) continue;
      const targetDow = DOW_NAMES.indexOf(act.dayOfWeek); // 0-6
      const creationDate = moment(act.date);
      const yesterday = moment(today).subtract(1, 'days');

      // Walk from creation week to last week
      let cursor = creationDate.clone();
      // Advance to the first matching weekday on or after creation
      while (cursor.day() !== targetDow) cursor.add(1, 'days');

      while (cursor.isSameOrBefore(yesterday, 'day')) {
        pastActivityEntries.push({
          id: `perm-${act.id}-${cursor.format('YYYY-MM-DD')}`,
          activityId: act.id,
          title: act.title,
          description: act.description,
          type: act.type,
          date: cursor.format('YYYY-MM-DD'),
          startTime: act.startTime,
          endTime: act.endTime,
          isPermanent: true,
          dayOfWeek: act.dayOfWeek,
          status: 'completed'
        });
        cursor.add(7, 'days');
      }
    }

    // Sort all activity history entries by date desc
    pastActivityEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.json({ tasks: formattedTasks, exams: formattedExams, activities: pastActivityEntries });
  } catch (error) {
    console.error('Error fetching teacher history:', error);
    return res.status(500).json({ error: 'Failed to fetch history data', tasks: [], exams: [], activities: [] });
  }
});

router.get('/:id/classes', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { date, startDate, endDate } = req.query;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) userTimezone = req.user.timezone;
    let where = { teacherId };
    if (date) where.date = date;
    else if (startDate && endDate) where.date = { [Op.between]: [startDate, endDate] };
    const classes = await Class.findAll({ where, order: [['date', 'ASC'], ['startTime', 'ASC']], include: [{ model: Student, as: 'students', attributes: ['id', 'name', 'surname'], through: { model: StudentClass, attributes: ['status', 'originalClassId', 'notes'] } }, { model: RescheduleClass, as: 'oldReschedulings', required: false, where: { status: 'confirmed' } }] });
    const requestedStatus = req.query.status || 'scheduled';
    const filteredClasses = classes.filter(cls => { if (!cls.students || cls.students.length === 0) return true; return cls.students.some(student => { const studentClass = student.StudentClass; return studentClass && studentClass.status === requestedStatus; }); });
    const classesWithUserTimezone = filteredClasses.map(cls => { const userTime = timezoneUtils.convertFromAdminToUserTimezone(cls.date, cls.startTime, userTimezone); const userEndTime = timezoneUtils.convertFromAdminToUserTimezone(cls.date, cls.endTime, userTimezone); return { ...cls.toJSON(), userDate: userTime.date, userStartTime: userTime.time, userEndTime: userEndTime.time }; });
    res.json(classesWithUserTimezone);
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({ error: 'Failed to fetch teacher classes' });
  }
});

router.get('/:id/rescheduled-classes', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { startDate, endDate } = req.query;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    let userTimezone = timezoneUtils.ADMIN_TIMEZONE;
    if (req.user && req.user.timezone) userTimezone = req.user.timezone;
    let whereClause = { [Op.or]: [{ newTeacherId: teacherId }, { differentTeacher: true, '$newClass.teacherId$': teacherId }] };
    if (startDate && endDate) { whereClause[Op.and] = [sequelize.literal(`EXISTS (SELECT 1 FROM Classes WHERE Classes.id = RescheduleClass.new_class_id AND Classes.date BETWEEN '${startDate}' AND '${endDate}')`)] ; }
    const rescheduledClasses = await RescheduleClass.findAll({ where: whereClause, include: [{ model: Class, as: 'newClass', include: [{ model: Student, as: 'students', attributes: ['id', 'name', 'surname'] }] }, { model: Class, as: 'oldClass' }, { model: Student, as: 'student' }, { model: Teacher, as: 'oldTeacher' }, { model: Teacher, as: 'newTeacher' }] });
    const formattedClasses = rescheduledClasses.map(reschedule => {
      const classData = reschedule.newClass;
      if (!classData) return null;
      const userTime = timezoneUtils.convertFromAdminToUserTimezone(classData.date, classData.startTime, userTimezone);
      const userEndTime = timezoneUtils.convertFromAdminToUserTimezone(classData.date, classData.endTime, userTimezone);
      const studentName = reschedule.student ? `${reschedule.student.name} ${reschedule.student.surname || ''}`.trim() : 'Unknown Student';
      const oldTeacherName = reschedule.oldTeacher ? `${reschedule.oldTeacher.firstName} ${reschedule.oldTeacher.lastName || ''}`.trim() : 'Unknown Teacher';
      const newTeacherName = reschedule.newTeacher ? `${reschedule.newTeacher.firstName} ${reschedule.newTeacher.lastName || ''}`.trim() : 'Current Teacher';
      return { id: classData.id, title: classData.title || 'Rescheduled Class', date: classData.date, startTime: classData.startTime, endTime: classData.endTime, userDate: userTime.date, userStartTime: userTime.time, userEndTime: userEndTime.time, status: 'scheduled', teacherId: classData.teacherId, isRescheduled: true, rescheduledFrom: reschedule.oldClassId, rescheduledAt: reschedule.rescheduledAt, studentId: reschedule.studentId, studentName, oldTeacherId: reschedule.oldTeacherId, oldTeacherName, newTeacherName, isNewTeacher: reschedule.differentTeacher, reason: reschedule.reason };
    }).filter(Boolean);
    res.json(formattedClasses);
  } catch (error) {
    console.error('Error fetching rescheduled classes:', error);
    res.status(500).json({ error: 'Failed to fetch rescheduled classes', details: error.message });
  }
});

router.post('/:id/classes/:classId/start', verifyToken, hasRole(['teacher']), async (req, res) => {
  try {
    const { id: teacherId, classId } = req.params;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    res.json({ success: true, message: 'Class started successfully', classId: parseInt(classId) });
  } catch (error) {
    console.error('Error starting class:', error);
    res.status(500).json({ error: 'Failed to start class' });
  }
});

router.post('/:id/exams/:examId/submit', verifyToken, hasRole(['teacher']), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id: teacherId, examId } = req.params;
    const { comments, answers } = req.body;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) { await transaction.rollback(); return res.status(404).json({ error: 'Teacher not found' }); }
    if (req.user.id !== teacher.userId) { await transaction.rollback(); return res.status(403).json({ error: 'Unauthorized access' }); }
    const exam = await Exam.findOne({ where: { id: examId, assignedTo: teacherId }, include: [{ model: ExamQuestion, as: 'questions' }] });
    if (!exam) { await transaction.rollback(); return res.status(404).json({ error: 'Exam not found or not assigned to this teacher' }); }
    if (exam.status === 'completed' || exam.status === 'approved' || exam.status === 'rejected') { await transaction.rollback(); return res.status(400).json({ error: 'This exam has already been completed' }); }
    await exam.update({ status: 'completed', reviewNotes: comments || null }, { transaction });
    if (answers && Array.isArray(answers) && answers.length > 0) {
      const questionIds = exam.questions.map(q => q.id);
      for (const answer of answers) {
        if (!questionIds.includes(answer.questionId)) { await transaction.rollback(); return res.status(400).json({ error: `Answer provided for question ID ${answer.questionId} that doesn't belong to this exam` }); }
        await ExamAnswer.create({ examId, questionId: answer.questionId, teacherId, answerText: answer.answerText || null, selectedOption: answer.selectedOption || null }, { transaction });
      }
    }
    await transaction.commit();
    res.json({ success: true, message: 'Exam submitted successfully', examId: parseInt(examId) });
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

router.post('/:id/classes/:classId/record', verifyToken, hasRole(['teacher']), async (req, res) => {
  try {
    const { id: teacherId, classId } = req.params;
    const { breathing, warmup, vocalization, observations, classType, classStatus } = req.body;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (req.user.id !== teacher.userId) return res.status(403).json({ error: 'Unauthorized access' });
    const classRecord = await Class.findOne({ where: { id: classId, teacherId } });
    if (!classRecord) return res.status(404).json({ error: 'Class not found' });
    await classRecord.update({ status: 'completed', breathing, warmup, vocalization, observations, classType: classType || 'regular', classStatus: classStatus || 'given' });
    res.json({ success: true, message: 'Class record submitted successfully', classId: parseInt(classId) });
  } catch (error) {
    console.error('Error submitting class record:', error);
    res.status(500).json({ error: 'Failed to submit class record' });
  }
});

router.post('/:id/reset-password', verifyToken, hasRole(['admin']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { password } = req.body;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const user = await User.findByPk(teacher.userId);
    if (!user) return res.status(404).json({ error: 'User account not found for this teacher' });
    const newPassword = password || 'DefaultPass123';
    await user.update({ password: newPassword });
    return res.json({ message: 'Password reset successfully', teacherId, userId: user.id });
  } catch (error) {
    console.error('Reset teacher password error:', error);
    res.status(500).json({ error: 'Failed to reset teacher password', details: error.message });
  }
});

router.get('/:id/available-slots', verifyToken, async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date parameter is required' });
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    const workHours = teacher.workHours || {};
    const workingDays = teacher.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayOfWeek = moment(date).format('dddd').toLowerCase();
    if (!workingDays.includes(dayOfWeek)) return res.json({ message: 'Teacher does not work on this day', slots: [] });
    const dayWorkHours = workHours[dayOfWeek] || [];
    if (dayWorkHours.length === 0) return res.json({ message: 'Teacher has no work hours set for this day', slots: [] });
    const bookedClasses = await Class.findAll({ where: { date, [Op.or]: [{ teacherId }, { '$studentClasses.student.teachers.id$': teacherId }] }, include: [{ model: StudentClass, as: 'studentClasses', include: [{ model: Student, as: 'student', include: [{ model: Teacher, as: 'teachers', through: { where: { active: true } } }] }] }] });
    const bookedSlots = bookedClasses.map(cls => ({ start: cls.startTime, end: cls.endTime }));
    const availableSlots = dayWorkHours.flatMap(workSlot => {
      const workStart = moment(workSlot.start, 'HH:mm');
      const workEnd = moment(workSlot.end, 'HH:mm');
      let slots = [];
      let currentSlotStart = workStart.clone();
      while (currentSlotStart.clone().add(60, 'minutes').isSameOrBefore(workEnd)) {
        const currentSlotEnd = currentSlotStart.clone().add(60, 'minutes');
        const isOverlapping = bookedSlots.some(bs => { const bStart = moment(bs.start, 'HH:mm:ss'); const bEnd = moment(bs.end, 'HH:mm:ss'); return currentSlotStart.isBefore(bEnd) && currentSlotEnd.isAfter(bStart); });
        if (!isOverlapping) slots.push({ start: currentSlotStart.format('HH:mm:ss'), end: currentSlotEnd.format('HH:mm:ss'), date });
        currentSlotStart.add(30, 'minutes');
      }
      return slots;
    });
    res.json({ teacherId, date, availableSlots });
  } catch (error) {
    console.error('Error getting teacher available slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/available-slots', verifyToken, async (req, res) => {
  try {
    const { date, studentId } = req.query;
    if (!date) return res.status(400).json({ message: 'Date parameter is required' });
    const teachers = await Teacher.findAll({ where: { active: true } });
    if (!teachers || teachers.length === 0) return res.json({ message: 'No active teachers found', teachers: [] });
    let primaryTeachers = [];
    if (studentId) {
      const student = await Student.findByPk(studentId, { include: [{ model: Teacher, as: 'teachers', through: { where: { active: true } } }] });
      if (student && student.teachers) primaryTeachers = student.teachers.map(t => t.id);
    }
    const teacherAvailability = [];
    for (const teacher of teachers) {
      const isPrimary = primaryTeachers.includes(teacher.id);
      const workHours = teacher.workHours || {};
      const workingDays = teacher.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const dayOfWeek = moment(date).format('dddd').toLowerCase();
      if (!workingDays.includes(dayOfWeek)) { teacherAvailability.push({ teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email }, isPrimary, availableSlots: [] }); continue; }
      const dayWorkHours = workHours[dayOfWeek] || [];
      if (dayWorkHours.length === 0) { teacherAvailability.push({ teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email }, isPrimary, availableSlots: [] }); continue; }
      const bookedClasses = await Class.findAll({ where: { date, [Op.or]: [{ teacherId: teacher.id }, { '$studentClasses.student.teachers.id$': teacher.id }] }, include: [{ model: StudentClass, as: 'studentClasses', include: [{ model: Student, as: 'student', include: [{ model: Teacher, as: 'teachers', through: { where: { active: true } } }] }] }] });
      const bookedSlots = bookedClasses.map(cls => ({ start: cls.startTime, end: cls.endTime }));
      const availableSlots = dayWorkHours.flatMap(workSlot => {
        const workStart = moment(workSlot.start, 'HH:mm');
        const workEnd = moment(workSlot.end, 'HH:mm');
        let slots = [];
        let currentSlotStart = workStart.clone();
        while (currentSlotStart.clone().add(60, 'minutes').isSameOrBefore(workEnd)) {
          const currentSlotEnd = currentSlotStart.clone().add(60, 'minutes');
          const isOverlapping = bookedSlots.some(bs => { const bStart = moment(bs.start, 'HH:mm:ss'); const bEnd = moment(bs.end, 'HH:mm:ss'); return currentSlotStart.isBefore(bEnd) && currentSlotEnd.isAfter(bStart); });
          if (!isOverlapping) slots.push({ start: currentSlotStart.format('HH:mm:ss'), end: currentSlotEnd.format('HH:mm:ss'), date });
          currentSlotStart.add(30, 'minutes');
        }
        return slots;
      });
      teacherAvailability.push({ teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName, email: teacher.email }, isPrimary, availableSlots });
    }
    teacherAvailability.sort((a, b) => { if (a.isPrimary && !b.isPrimary) return -1; if (!a.isPrimary && b.isPrimary) return 1; return b.availableSlots.length - a.availableSlots.length; });
    res.json({ date, teachers: teacherAvailability });
  } catch (error) {
    console.error('Error getting all teachers availability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =====================================================================
// ✅ FIX (Opción A): GET /api/teachers/:id/given-classes
//
// PROBLEMA: El frontend llamaba a /api/teachers/1/given-classes
// pero el servidor solo tenía la ruta /teachers/given-classes (sin :id),
// lo que causaba un 500 Internal Server Error.
//
// SOLUCIÓN: Se agrega el endpoint con el teacherId en la URL (REST estándar).
// =====================================================================
router.get('/:id/given-classes', verifyToken, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { startDate, endDate } = req.query;

    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    if (req.user.role === 'teacher' && req.user.id !== teacher.userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const classWhere = { teacherId: teacher.id };
    if (startDate && endDate) {
      classWhere.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      classWhere.date = { [Op.gte]: startDate };
    } else if (endDate) {
      classWhere.date = { [Op.lte]: endDate };
    }

    const classes = await Class.findAll({
      where: classWhere,
      include: [{
        model: Student,
        as: 'students',
        attributes: ['id', 'name', 'surname'],
        through: {
          model: StudentClass,
          attributes: ['status'],
          where: { status: 'attended' }
        },
        required: true
      }],
      order: [['date', 'DESC'], ['startTime', 'DESC']]
    });

    const rows = [];
    for (const cls of classes) {
      for (const student of cls.students) {
        rows.push({
          classId:            cls.id,
          date:               cls.date,
          startTime:          cls.startTime,
          endTime:            cls.endTime,
          title:              cls.title,
          studentId:          student.id,
          studentName:        student.name,
          studentSurname:     student.surname,
          studentClassStatus: student.StudentClass?.status || 'attended'
        });
      }
    }

    return res.json(rows);
  } catch (error) {
    console.error('Error fetching given classes:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;