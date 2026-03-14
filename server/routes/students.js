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
        { model: User, as: 'user', attributes: ['username', 'email', 'timezone'] },
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

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE STUDENT — corregido: timezone va en User, no en Student
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Campos que pertenecen a la tabla Student
    const studentFields = [
      'name', 'surname', 'birthDate', 'phone',
      'city', 'country', 'active', 'zoomLink', 'allowDifferentTeacher'
    ];

    const studentUpdateData = {};
    for (const field of studentFields) {
      if (req.body[field] !== undefined) {
        studentUpdateData[field] = req.body[field];
      }
    }

    await student.update(studentUpdateData);

    // Campos que pertenecen a la tabla User (incluido timezone)
    if (req.body.updateUser) {
      const user = await User.findByPk(student.userId);
      if (user) {
        if (req.body.email)    user.email    = req.body.email;
        if (req.body.username) user.username = req.body.username;
        if (req.body.timezone) user.timezone = req.body.timezone; // <-- aquí va timezone
        if (req.body.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(req.body.password, salt);
        }
        await user.save();
      }
    }

    return res.json(student);
  } catch (error) {
    console.error('Update student error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NUEVA RUTA: PUT /:id/packages/:packageId
// Permite actualizar el status u otros campos de un StudentPackage específico.
// Esto era lo que causaba el 500 — la ruta no existía.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/packages/:packageId', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id, packageId } = req.params;

    const studentPackage = await StudentPackage.findOne({
      where: { id: packageId, studentId: id }
    });

    if (!studentPackage) {
      return res.status(404).json({ message: 'StudentPackage not found' });
    }

    // Campos permitidos para actualizar
    const allowedFields = ['status', 'remainingClasses', 'usedReschedules', 'paymentStatus', 'endDate'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    await studentPackage.update(updateData);
    return res.json(studentPackage);
  } catch (error) {
    console.error('Update student package error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RUTA CRÍTICA: Asignar paquete a estudiante
// ─────────────────────────────────────────────────────────────────────────────
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

// Obtener paquetes de un estudiante específico
router.get('/:id/packages', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const studentPackages = await StudentPackage.findAll({
      where: { studentId: req.params.id },
      include: [{ model: Package, as: 'package' }],
      order: [['createdAt', 'DESC']]
    });
    return res.json(studentPackages);
  } catch (error) {
    console.error('Error fetching student packages:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Programación semanal recurrente
router.post('/:id/schedule', verifyToken, isAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { packageId, classes, teacherId, weeklySchedule: clientWeeklySchedule } = req.body;

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

    const weeklyScheduleToSave = (clientWeeklySchedule && clientWeeklySchedule.length > 0)
      ? clientWeeklySchedule
      : classes
          .filter(cls => cls.date && cls.startTime)
          .map(cls => ({
            day: moment(cls.date).format('dddd').toLowerCase(),
            hour: parseInt(cls.startTime.split(':')[0]),
            startTime: cls.startTime,
            endTime: cls.endTime
          }))
          .filter((slot, index, arr) =>
            arr.findIndex(s => s.day === slot.day && s.hour === slot.hour) === index
          );

    if (teacherId && weeklyScheduleToSave.length > 0) {
      const teacherStudentRecord = await TeacherStudent.findOne({
        where: { studentId: id, teacherId, active: true },
        transaction: t
      });

      if (teacherStudentRecord) {
        await teacherStudentRecord.update(
          { weeklySchedule: weeklyScheduleToSave },
          { transaction: t }
        );
      } else {
        await TeacherStudent.create({
          teacherId,
          studentId: id,
          active: true,
          assignedDate: new Date(),
          weeklySchedule: weeklyScheduleToSave
        }, { transaction: t });
      }
    }

    await studentPackage.update({
      remainingClasses: scheduledClasses.length
    }, { transaction: t });

    await t.commit();
    return res.status(201).json({ 
      message: 'Schedule created and fixed hours saved', 
      count: scheduledClasses.length,
      weeklySchedule: weeklyScheduleToSave
    });

  } catch (error) {
    if (t) await t.rollback();
    console.error('Schedule error:', error);
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