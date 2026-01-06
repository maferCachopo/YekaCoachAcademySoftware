const express = require('express');
const { Student, User, StudentPackage, Package, Class, StudentClass, RescheduleClass, Teacher, TeacherStudent, sequelize } = require('../models');
const { verifyToken, isAdmin, isSelfOrAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const bcrypt = require('bcrypt');

const ADMIN_TIMEZONE = process.env.ADMIN_TIMEZONE || 'America/Caracas';

const router = express.Router();

// Get all students (admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const showInactive = req.query.showInactive === 'true';
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
          include: [{ model: Package, as: 'package' }]
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
    const student = await Student.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['username', 'email'] },
        { 
            model: StudentPackage, 
            as: 'packages', 
            include: [{ model: Package, as: 'package' }] 
        }
      ]
    });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    return res.json(student);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * RUTA CRÍTICA: Asignar paquete a estudiante
 */
router.post('/:id/packages', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { packageId, startDate, endDate } = req.body;

    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const pkg = await Package.findByPk(packageId);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });

    await StudentPackage.update(
      { status: 'completed' },
      { where: { studentId: id, status: 'active' } }
    );

    const studentPackage = await StudentPackage.create({
      studentId: id,
      packageId: packageId,
      startDate: startDate,
      endDate: endDate,
      remainingClasses: pkg.totalClasses,
      usedReschedules: 0,
      status: 'active',
      paymentStatus: 'paid'
    });

    return res.status(201).json(studentPackage);
  } catch (error) {
    console.error('Error in POST /students/:id/packages:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/** * MODIFICACIÓN: PROGRAMACIÓN SEMANAL RECURRENTE Y PERSISTENCIA DE HORARIO FIJO
 */
router.post('/:id/schedule', verifyToken, isAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { packageId, classes, teacherId } = req.body; 

    const studentPackage = await StudentPackage.findOne({
      where: { studentId: id, packageId, status: 'active' }
    });

    if (!studentPackage) {
      await t.rollback();
      return res.status(404).json({ message: 'No active package found for scheduling.' });
    }

    const scheduledClasses = [];
    for (const cls of classes) {
      const classRecord = await Class.create({
        title: cls.title || 'Clase Individual',
        date: cls.date,
        startTime: cls.startTime,
        endTime: cls.endTime,
        teacherId: teacherId || cls.teacherId || null,
        status: 'scheduled',
        timezone: ADMIN_TIMEZONE,
        maxStudents: 1
      }, { transaction: t });

      scheduledClasses.push({
        studentId: id,
        classId: classRecord.id,
        studentPackageId: studentPackage.id,
        status: 'scheduled',
        canReschedule: true
      });
    }

    await StudentClass.bulkCreate(scheduledClasses, { transaction: t });

    // --- INICIO DE MODIFICACIÓN: GUARDAR HORARIO FIJO ---
    // Extraemos los días y horas únicos para que el nombre del alumno aparezca siempre en el cronograma
    const weeklySchedule = classes.map(cls => ({
      day: moment(cls.date).format('dddd').toLowerCase(),
      startTime: cls.startTime,
      endTime: cls.endTime
    })).filter((v, i, a) => a.findIndex(t => (
      t.day === v.day && t.startTime === v.startTime && t.endTime === v.endTime
    )) === i);

    // Actualizamos la relación para que el profesor vea al alumno en esos bloques específicos
    if (teacherId) {
      await TeacherStudent.update(
        { weeklySchedule: weeklySchedule },
        { 
          where: { studentId: id, teacherId: teacherId },
          transaction: t 
        }
      );
    }
    // --- FIN DE MODIFICACIÓN ---

    await studentPackage.update({
      remainingClasses: scheduledClasses.length
    }, { transaction: t });

    await t.commit();
    return res.status(201).json({ 
      message: 'Schedule created and fixed hours saved', 
      count: scheduledClasses.length 
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Schedule error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update student
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    await student.update(req.body);

    if (req.body.updateUser) {
      const user = await User.findByPk(student.userId);
      if (user) {
        if (req.body.email) user.email = req.body.email;
        if (req.body.username) user.username = req.body.username;
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
        }
        await user.save();
      }
    }

    return res.json(student);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete student (soft delete)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    await student.update({ active: false });
    return res.json({ message: 'Student deactivated' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student classes
router.get('/:id/classes', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const studentClasses = await StudentClass.findAll({
      where: { studentId: req.params.id },
      include: [{ model: Class, as: 'classDetail' }],
      order: [[{ model: Class, as: 'classDetail' }, 'date', 'ASC']]
    });
    return res.json(studentClasses);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;