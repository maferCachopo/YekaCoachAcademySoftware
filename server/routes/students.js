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
          attributes: ['username', 'email', 'timezone']
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

// Update student
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

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

    // Campos que pertenecen a User (email, username, timezone, password)
    if (req.body.updateUser) {
      const user = await User.findByPk(student.userId);
      if (user) {
        if (req.body.email)    user.email    = req.body.email;
        if (req.body.username) user.username = req.body.username;
        if (req.body.timezone) user.timezone = req.body.timezone;
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

// Update a specific StudentPackage
router.put('/:id/packages/:packageId', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id, packageId } = req.params;

    const studentPackage = await StudentPackage.findOne({
      where: { id: packageId, studentId: id }
    });

    if (!studentPackage) {
      return res.status(404).json({ message: 'StudentPackage not found' });
    }

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

// Assign package to student
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

// Get packages for a student
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

// Upgrade package
router.post('/:id/upgrade-package', verifyToken, isAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { newPackageId, teacherId, classes, weeklySchedule, startDate } = req.body;

    const student = await Student.findByPk(id, { transaction: t });
    if (!student) {
      await t.rollback();
      return res.status(404).json({ message: 'Student not found' });
    }

    const currentActivePackage = await StudentPackage.findOne({
      where: { studentId: id, status: 'active' },
      transaction: t
    });

    if (!currentActivePackage) {
      await t.rollback();
      return res.status(404).json({ message: 'No se encontró paquete activo.' });
    }

    // 1. Cancelar el paquete anterior
    await currentActivePackage.update(
      { status: 'cancelled', notes: 'Cancelado por upgrade' },
      { transaction: t }
    );

    // 2. Limpiar clases programadas futuras del paquete anterior
    const oldScheduled = await StudentClass.findAll({
      where: { studentId: id, studentPackageId: currentActivePackage.id, status: 'scheduled' },
      transaction: t
    });

    if (oldScheduled.length > 0) {
      const oldClassIds = oldScheduled.map(sc => sc.classId);
      await StudentClass.destroy({
        where: { id: oldScheduled.map(sc => sc.id) },
        transaction: t
      });
      for (const cId of oldClassIds) {
        const others = await StudentClass.findOne({ where: { classId: cId }, transaction: t });
        if (!others) await Class.destroy({ where: { id: cId }, transaction: t });
      }
    }

    // 3. Crear nuevo paquete
    const newPkgBase = await Package.findByPk(newPackageId, { transaction: t });
    if (!newPkgBase) {
      await t.rollback();
      return res.status(404).json({ message: 'Package not found' });
    }

    const newStudentPackage = await StudentPackage.create({
      studentId: id,
      packageId: newPackageId,
      startDate: startDate,
      endDate: moment(startDate).add(newPkgBase.durationMonths, 'months').format('YYYY-MM-DD'),
      remainingClasses: classes.length,
      status: 'active',
      paymentStatus: 'paid'
    }, { transaction: t });

    // 4. Crear clases con el nombre del estudiante como título
    const studentFullName = `${student.name} ${student.surname}`;

    for (const cls of classes) {
      const classRecord = await Class.create({
        title: studentFullName,
        date: cls.date,
        startTime: cls.startTime,
        endTime: cls.endTime,
        teacherId: teacherId,
        status: 'scheduled',
        timezone: ADMIN_TIMEZONE,
        maxStudents: 1
      }, { transaction: t });

      await StudentClass.create({
        studentId: id,
        classId: classRecord.id,
        studentPackageId: newStudentPackage.id,
        status: 'scheduled',
        canReschedule: true
      }, { transaction: t });
    }

    // 5. Actualizar weeklySchedule en TeacherStudent
    if (weeklySchedule && teacherId) {
      const [tsRelation] = await TeacherStudent.findOrCreate({
        where: { teacherId, studentId: id },
        defaults: { active: true },
        transaction: t
      });
      await tsRelation.update({ weeklySchedule, active: true }, { transaction: t });
    }

    await t.commit();
    return res.json({ message: 'Upgrade exitoso', package: newStudentPackage });
  } catch (error) {
    await t.rollback();
    console.error('Upgrade package error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// Schedule classes for a student
router.post('/:id/schedule', verifyToken, isAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { packageId, classes, teacherId, weeklySchedule: clientWeeklySchedule } = req.body;

    // FIX: obtener el estudiante para usar su nombre como título de las clases
    const student = await Student.findByPk(id);
    if (!student) {
      await t.rollback();
      return res.status(404).json({ message: 'Student not found' });
    }
    const studentFullName = `${student.name} ${student.surname}`;

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
        title: studentFullName,
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

    // Construir weeklySchedule desde las clases si el cliente no lo envió
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

    await studentPackage.update(
      { remainingClasses: scheduledClasses.length },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({
      message: 'Schedule created successfully',
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

// Get active teacher for a student
router.get('/:id/teacher', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const relation = await TeacherStudent.findOne({
      where: { studentId: req.params.id, active: true },
      order: [['updatedAt', 'DESC']]
    });
    if (!relation) return res.json({ teacherId: null });
    return res.json({ teacherId: relation.teacherId });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get weekly schedule for a student
router.get('/:id/weekly-schedule', verifyToken, isSelfOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const relation = await TeacherStudent.findOne({
      where: { studentId: id, active: true },
      order: [['updatedAt', 'DESC']]
    });
    if (!relation || !relation.weeklySchedule) {
      return res.json({ weeklySchedule: [] });
    }
    return res.json({ weeklySchedule: relation.weeklySchedule });
  } catch (error) {
    console.error('Error fetching weekly schedule:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete all scheduled classes for a specific package (used before rescheduling)
router.delete('/:id/packages/:packageId/scheduled-classes', verifyToken, isAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, packageId } = req.params;

    const studentPackage = await StudentPackage.findOne({
      where: { studentId: id, id: packageId }
    });
    if (!studentPackage) {
      await t.rollback();
      return res.status(404).json({ message: 'StudentPackage not found' });
    }

    const scheduledStudentClasses = await StudentClass.findAll({
      where: {
        studentId: id,
        studentPackageId: packageId,
        status: 'scheduled'
      },
      transaction: t
    });

    if (scheduledStudentClasses.length === 0) {
      await t.rollback();
      return res.json({ message: 'No scheduled classes to delete', deleted: 0 });
    }

    const classIds = scheduledStudentClasses.map(sc => sc.classId);

    await StudentClass.destroy({
      where: {
        studentId: id,
        studentPackageId: packageId,
        status: 'scheduled'
      },
      transaction: t
    });

    // Borrar clases huérfanas (no usadas por otro estudiante)
    for (const classId of classIds) {
      const otherStudentClass = await StudentClass.findOne({
        where: { classId },
        transaction: t
      });
      if (!otherStudentClass) {
        await Class.destroy({ where: { id: classId }, transaction: t });
      }
    }

    await t.commit();
    return res.json({
      message: 'Scheduled classes deleted',
      deleted: scheduledStudentClasses.length
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Delete scheduled classes error:', error);
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