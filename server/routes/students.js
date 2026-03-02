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


// Obtener paquetes de un estudiante específico (Faltaba esta ruta)
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

/** * MODIFICACIÓN: PROGRAMACIÓN SEMANAL RECURRENTE Y PERSISTENCIA DE HORARIO FIJO
 */
router.post('/:id/schedule', verifyToken, isAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { packageId, classes, teacherId, weeklySchedule: clientWeeklySchedule } = req.body;
    // ↑ Renombramos el del cliente para evitar conflicto con el que calcularemos

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

    // --- GUARDAR HORARIO FIJO EN TeacherStudents ---
    // Priorizamos el weeklySchedule que viene del frontend (ya calculado por ClassSchedulingForm).
    // Si no viene, lo calculamos nosotros desde las clases como fallback.
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
            // Deduplicar: un slot por combinación día+hora
            arr.findIndex(s => s.day === slot.day && s.hour === slot.hour) === index
          );

    if (teacherId && weeklyScheduleToSave.length > 0) {
      // Buscamos el registro activo de la relación profesor-estudiante
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
        // Si aún no existe la relación (el AddDialog la crea después), la creamos aquí
        await TeacherStudent.create({
          teacherId,
          studentId: id,
          active: true,
          assignedDate: new Date(),
          weeklySchedule: weeklyScheduleToSave
        }, { transaction: t });
      }
    }
    // --- FIN GUARDAR HORARIO FIJO ---

    await studentPackage.update({
      remainingClasses: scheduledClasses.length
    }, { transaction: t });

    await t.commit();
    return res.status(201).json({ 
      message: 'Schedule created and fixed hours saved', 
      count: scheduledClasses.length,
      weeklySchedule: weeklyScheduleToSave  // Devolvemos para debug/confirmación
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