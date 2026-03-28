'use strict';
const bcrypt = require('bcrypt');

/**
 * SEEDER: seedTestHistory
 * 
 * Crea datos de prueba para verificar:
 * 1. Historial de clases atendidas (attended)
 * 2. Historial de paquetes completados
 * 3. Paquete activo con clases programadas
 * 4. Conversión de zona horaria en ViewDialog
 * 5. Horario habitual (weeklySchedule en TeacherStudent)
 * 
 * ESTUDIANTES CREADOS:
 * ─────────────────────────────────────────────────────────
 * A) hist_basico   → paquete completado (4 clases attended) + paquete activo (4 scheduled)
 * B) hist_estandar → paquete completado (8 clases attended) + paquete activo (8 scheduled, 2 días)
 * C) hist_tz       → igual que A pero con timezone distinto (America/New_York) para probar conversión
 * ─────────────────────────────────────────────────────────
 * 
 * PROFESOR CREADO: teacher_test (si no existe ya uno)
 * 
 * INSTRUCCIONES:
 *   cd server
 *   npx sequelize-cli db:seed --seed 20260314000001-seed-test-history.js
 * 
 * PARA REVERTIR:
 *   npx sequelize-cli db:seed:undo --seed 20260314000001-seed-test-history.js
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

const hash = async (password) => bcrypt.hash(password, 10);

const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const timeStr = (hour) => `${String(hour).padStart(2, '0')}:00:00`;

// ─── UP ─────────────────────────────────────────────────────────────────────

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // ── 1. PAQUETES ──────────────────────────────────────────────────────────
    // Usamos los paquetes existentes si ya hay, o insertamos los nuestros.
    // Buscamos por nombre para no duplicar.
    const existingPackages = await queryInterface.sequelize.query(
      `SELECT id, name FROM Packages WHERE name IN ('Basic', 'Standard')`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let basicPkgId, standardPkgId;

    const basicPkg = existingPackages.find(p => p.name === 'Basic');
    const standardPkg = existingPackages.find(p => p.name === 'Standard');

    if (!basicPkg) {
      await queryInterface.bulkInsert('Packages', [{
        name: 'Basic',
        description: 'Paquete básico 4 clases mensuales',
        totalClasses: 4,
        durationMonths: 1,
        durationWeeks: 4,
        maxReschedules: 2,
        price: 80.00,
        active: true,
        createdAt: now,
        updatedAt: now
      }]);
      const [row] = await queryInterface.sequelize.query(
        `SELECT id FROM Packages WHERE name = 'Basic' ORDER BY id DESC LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      basicPkgId = row.id;
    } else {
      basicPkgId = basicPkg.id;
    }

    if (!standardPkg) {
      await queryInterface.bulkInsert('Packages', [{
        name: 'Standard',
        description: 'Paquete estándar 8 clases mensuales',
        totalClasses: 8,
        durationMonths: 1,
        durationWeeks: 4,
        maxReschedules: 3,
        price: 150.00,
        active: true,
        createdAt: now,
        updatedAt: now
      }]);
      const [row] = await queryInterface.sequelize.query(
        `SELECT id FROM Packages WHERE name = 'Standard' ORDER BY id DESC LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      standardPkgId = row.id;
    } else {
      standardPkgId = standardPkg.id;
    }

    // ── 2. USUARIO Y PROFESOR DE PRUEBA ──────────────────────────────────────
    // Verificar si ya existe un profesor para no duplicar
    const existingTeacherUsers = await queryInterface.sequelize.query(
      `SELECT id FROM Users WHERE username = 'teacher_test'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let teacherId;

    if (existingTeacherUsers.length === 0) {
      await queryInterface.bulkInsert('Users', [{
        username: 'teacher_test',
        password: await hash('Test1234!'),
        email: 'teacher_test@yekacoach.test',
        role: 'teacher',
        timezone: 'America/Caracas',
        createdAt: now,
        updatedAt: now
      }]);

      const [teacherUser] = await queryInterface.sequelize.query(
        `SELECT id FROM Users WHERE username = 'teacher_test'`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      await queryInterface.bulkInsert('Teachers', [{
        userId: teacherUser.id,
        firstName: 'Profesor',
        lastName: 'Test',
        phone: '+58 412 0000000',
        isCoordinator: false,
        workHours: JSON.stringify({
          monday:    [{ start: '09:00', end: '18:00' }],
          tuesday:   [{ start: '09:00', end: '18:00' }],
          wednesday: [{ start: '09:00', end: '18:00' }],
          thursday:  [{ start: '09:00', end: '18:00' }],
          friday:    [{ start: '09:00', end: '18:00' }]
        }),
        breakHours: JSON.stringify({}),
        specialties: JSON.stringify(['grammar', 'conversation']),
        maxStudentsPerDay: 8,
        active: true,
        workingDays: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        createdAt: now,
        updatedAt: now
      }]);

      const [teacher] = await queryInterface.sequelize.query(
        `SELECT id FROM Teachers WHERE userId = ${teacherUser.id}`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      teacherId = teacher.id;
    } else {
      const [teacher] = await queryInterface.sequelize.query(
        `SELECT t.id FROM Teachers t JOIN Users u ON t.userId = u.id WHERE u.username = 'teacher_test'`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      teacherId = teacher?.id;
    }

    // ── 3. ESTUDIANTES DE PRUEBA ─────────────────────────────────────────────

    const students = [
      {
        username: 'hist_basico',
        email: 'hist_basico@yekacoach.test',
        timezone: 'America/Caracas',
        name: 'Historia',
        surname: 'Básico',
        city: 'Caracas',
        country: 'Venezuela',
        phone: '04120000001',
      },
      {
        username: 'hist_estandar',
        email: 'hist_estandar@yekacoach.test',
        timezone: 'America/Caracas',
        name: 'Historia',
        surname: 'Estándar',
        city: 'Caracas',
        country: 'Venezuela',
        phone: '04120000002',
      },
      {
        username: 'hist_tz',
        email: 'hist_tz@yekacoach.test',
        timezone: 'America/New_York',      // ← 1 hora menos que Caracas (EDT)
        name: 'Historia',
        surname: 'Timezone',
        city: 'New York',
        country: 'United States',
        phone: '12120000003',
      }
    ];

    const studentIds = {};

    for (const s of students) {
      // Saltar si ya existe
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM Users WHERE username = '${s.username}'`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      if (existing.length > 0) {
        console.log(`⚠️  Usuario '${s.username}' ya existe, saltando...`);
        const [st] = await queryInterface.sequelize.query(
          `SELECT st.id FROM Students st JOIN Users u ON st.userId = u.id WHERE u.username = '${s.username}'`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        if (st) studentIds[s.username] = st.id;
        continue;
      }

      await queryInterface.bulkInsert('Users', [{
        username: s.username,
        password: await hash('Test1234!'),
        email: s.email,
        role: 'student',
        timezone: s.timezone,
        createdAt: now,
        updatedAt: now
      }]);

      const [user] = await queryInterface.sequelize.query(
        `SELECT id FROM Users WHERE username = '${s.username}'`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      await queryInterface.bulkInsert('Students', [{
        userId: user.id,
        name: s.name,
        surname: s.surname,
        birthDate: '1995-06-15',
        phone: s.phone,
        city: s.city,
        country: s.country,
        zoomLink: 'https://zoom.us/j/test000000',
        joinDate: dateOffset(-60),
        active: true,
        allowDifferentTeacher: false,
        createdAt: now,
        updatedAt: now
      }]);

      const [student] = await queryInterface.sequelize.query(
        `SELECT id FROM Students WHERE userId = ${user.id}`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      studentIds[s.username] = student.id;
    }

    // ── 4. HELPER: crear clases + student_classes para un paquete ────────────

    const createClasses = async ({
      studentId,
      studentPackageId,
      teacherId,
      startDayOffset,   // primer día (negativo = pasado, positivo = futuro)
      totalClasses,
      daysOfWeek,       // ['wednesday'] o ['wednesday', 'thursday']
      startHour,        // hora del profesor (ej: 16 → 16:00)
      status,           // 'attended' | 'scheduled'
      timezone = 'America/Caracas'
    }) => {
      const dayMap = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
      let created = 0;
      let weekOffset = 0;

      while (created < totalClasses) {
        for (const day of daysOfWeek) {
          if (created >= totalClasses) break;

          // Calcular la fecha del día de la semana deseado en esa semana
          const base = new Date();
          base.setDate(base.getDate() + startDayOffset + (weekOffset * 7));

          // Ajustar al día de la semana correcto
          const targetDay = dayMap[day];
          const currentDay = base.getDay();
          const diff = targetDay - currentDay;
          base.setDate(base.getDate() + diff);

          const classDate = base.toISOString().split('T')[0];
          const classStartTime = timeStr(startHour);
          const classEndTime   = timeStr(startHour + 1);

          // Insertar clase
          await queryInterface.bulkInsert('Classes', [{
            title: 'Clase Individual',
            description: null,
            date: classDate,
            startTime: classStartTime,
            endTime: classEndTime,
            maxStudents: 1,
            teacherId: teacherId || null,
            status: status === 'attended' ? 'completed' : 'scheduled',
            timezone: timezone,
            notes: null,
            createdAt: now,
            updatedAt: now
          }]);

          const [cls] = await queryInterface.sequelize.query(
            `SELECT id FROM Classes WHERE date = '${classDate}' AND startTime = '${classStartTime}' ORDER BY id DESC LIMIT 1`,
            { type: Sequelize.QueryTypes.SELECT }
          );

          // Insertar StudentClass
          await queryInterface.bulkInsert('StudentClasses', [{
            studentId,
            classId: cls.id,
            studentPackageId,
            status,
            canReschedule: status === 'scheduled',
            createdAt: now,
            updatedAt: now
          }]);

          created++;
        }
        weekOffset++;
      }
    };

    // ── 5. ESTUDIANTE A: hist_basico ─────────────────────────────────────────
    // Paquete 1: COMPLETADO — 4 clases attended (hace 2 meses)
    // Paquete 2: ACTIVO     — 4 clases scheduled (próximas semanas)

    if (studentIds['hist_basico']) {
      const sId = studentIds['hist_basico'];

      // Paquete completado
      await queryInterface.bulkInsert('StudentPackages', [{
        studentId: sId,
        packageId: basicPkgId,
        startDate: dateOffset(-60),
        endDate: dateOffset(-30),
        remainingClasses: 0,
        usedReschedules: 0,
        status: 'completed',
        paymentStatus: 'paid',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updatedAt: now
      }]);
      const [sp1] = await queryInterface.sequelize.query(
        `SELECT id FROM StudentPackages WHERE studentId = ${sId} AND status = 'completed' ORDER BY id DESC LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      await createClasses({
        studentId: sId, studentPackageId: sp1.id, teacherId,
        startDayOffset: -56, totalClasses: 4,
        daysOfWeek: ['wednesday'], startHour: 16,
        status: 'attended'
      });

      // Paquete activo
      await queryInterface.bulkInsert('StudentPackages', [{
        studentId: sId,
        packageId: basicPkgId,
        startDate: dateOffset(0),
        endDate: dateOffset(30),
        remainingClasses: 4,
        usedReschedules: 0,
        status: 'active',
        paymentStatus: 'paid',
        createdAt: now,
        updatedAt: now
      }]);
      const [sp2] = await queryInterface.sequelize.query(
        `SELECT id FROM StudentPackages WHERE studentId = ${sId} AND status = 'active' ORDER BY id DESC LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      await createClasses({
        studentId: sId, studentPackageId: sp2.id, teacherId,
        startDayOffset: 3, totalClasses: 4,
        daysOfWeek: ['wednesday'], startHour: 16,
        status: 'scheduled'
      });

      // TeacherStudent con weeklySchedule
      if (teacherId) {
        const existing = await queryInterface.sequelize.query(
          `SELECT id FROM TeacherStudents WHERE teacherId = ${teacherId} AND studentId = ${sId}`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        if (existing.length === 0) {
          await queryInterface.bulkInsert('TeacherStudents', [{
            teacherId,
            studentId: sId,
            assignedDate: now,
            active: true,
            weeklySchedule: JSON.stringify([
              { day: 'wednesday', hour: 16, startTime: '16:00', endTime: '17:00' }
            ]),
            createdAt: now,
            updatedAt: now
          }]);
        }
      }
    }

    // ── 6. ESTUDIANTE B: hist_estandar ───────────────────────────────────────
    // Paquete 1: COMPLETADO — 8 clases attended (mié + jue)
    // Paquete 2: ACTIVO     — 8 clases scheduled (mié + jue próximos)

    if (studentIds['hist_estandar']) {
      const sId = studentIds['hist_estandar'];

      // Paquete completado
      await queryInterface.bulkInsert('StudentPackages', [{
        studentId: sId,
        packageId: standardPkgId,
        startDate: dateOffset(-60),
        endDate: dateOffset(-30),
        remainingClasses: 0,
        usedReschedules: 1,
        status: 'completed',
        paymentStatus: 'paid',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updatedAt: now
      }]);
      const [sp1] = await queryInterface.sequelize.query(
        `SELECT id FROM StudentPackages WHERE studentId = ${sId} AND status = 'completed' ORDER BY id DESC LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      await createClasses({
        studentId: sId, studentPackageId: sp1.id, teacherId,
        startDayOffset: -56, totalClasses: 8,
        daysOfWeek: ['wednesday', 'thursday'], startHour: 14,
        status: 'attended'
      });

      // Paquete activo
      await queryInterface.bulkInsert('StudentPackages', [{
        studentId: sId,
        packageId: standardPkgId,
        startDate: dateOffset(0),
        endDate: dateOffset(30),
        remainingClasses: 8,
        usedReschedules: 0,
        status: 'active',
        paymentStatus: 'paid',
        createdAt: now,
        updatedAt: now
      }]);
      const [sp2] = await queryInterface.sequelize.query(
        `SELECT id FROM StudentPackages WHERE studentId = ${sId} AND status = 'active' ORDER BY id DESC LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      await createClasses({
        studentId: sId, studentPackageId: sp2.id, teacherId,
        startDayOffset: 3, totalClasses: 8,
        daysOfWeek: ['wednesday', 'thursday'], startHour: 14,
        status: 'scheduled'
      });

      if (teacherId) {
        const existing = await queryInterface.sequelize.query(
          `SELECT id FROM TeacherStudents WHERE teacherId = ${teacherId} AND studentId = ${sId}`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        if (existing.length === 0) {
          await queryInterface.bulkInsert('TeacherStudents', [{
            teacherId,
            studentId: sId,
            assignedDate: now,
            active: true,
            weeklySchedule: JSON.stringify([
              { day: 'wednesday', hour: 14, startTime: '14:00', endTime: '15:00' },
              { day: 'thursday',  hour: 14, startTime: '14:00', endTime: '15:00' }
            ]),
            createdAt: now,
            updatedAt: now
          }]);
        }
      }
    }

    // ── 7. ESTUDIANTE C: hist_tz (New York, prueba zona horaria) ────────────
    // Igual que hist_basico pero con timezone America/New_York
    // El profesor trabaja a las 16:00 Caracas → 15:00 New York (Caracas = UTC-4, NY = UTC-5 en invierno / UTC-4 en verano)
    // En verano (EDT, UTC-4) coincide. En invierno (EST, UTC-5) es 1h menos → 15:00

    if (studentIds['hist_tz']) {
      const sId = studentIds['hist_tz'];

      // Paquete completado
      await queryInterface.bulkInsert('StudentPackages', [{
        studentId: sId,
        packageId: basicPkgId,
        startDate: dateOffset(-60),
        endDate: dateOffset(-30),
        remainingClasses: 0,
        usedReschedules: 0,
        status: 'completed',
        paymentStatus: 'paid',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updatedAt: now
      }]);
      const [sp1] = await queryInterface.sequelize.query(
        `SELECT id FROM StudentPackages WHERE studentId = ${sId} AND status = 'completed' ORDER BY id DESC LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      await createClasses({
        studentId: sId, studentPackageId: sp1.id, teacherId,
        startDayOffset: -56, totalClasses: 4,
        daysOfWeek: ['wednesday'], startHour: 16,
        status: 'attended'
      });

      // Paquete activo
      await queryInterface.bulkInsert('StudentPackages', [{
        studentId: sId,
        packageId: basicPkgId,
        startDate: dateOffset(0),
        endDate: dateOffset(30),
        remainingClasses: 4,
        usedReschedules: 0,
        status: 'active',
        paymentStatus: 'paid',
        createdAt: now,
        updatedAt: now
      }]);
      const [sp2] = await queryInterface.sequelize.query(
        `SELECT id FROM StudentPackages WHERE studentId = ${sId} AND status = 'active' ORDER BY id DESC LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      await createClasses({
        studentId: sId, studentPackageId: sp2.id, teacherId,
        startDayOffset: 3, totalClasses: 4,
        daysOfWeek: ['wednesday'], startHour: 16,
        status: 'scheduled'
      });

      if (teacherId) {
        const existing = await queryInterface.sequelize.query(
          `SELECT id FROM TeacherStudents WHERE teacherId = ${teacherId} AND studentId = ${sId}`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        if (existing.length === 0) {
          await queryInterface.bulkInsert('TeacherStudents', [{
            teacherId,
            studentId: sId,
            assignedDate: now,
            active: true,
            weeklySchedule: JSON.stringify([
              { day: 'wednesday', hour: 16, startTime: '16:00', endTime: '17:00' }
            ]),
            createdAt: now,
            updatedAt: now
          }]);
        }
      }
    }

    console.log('✅ Seeder completado. Estudiantes creados:');
    console.log('   • hist_basico   / Test1234!  → Basic completado + Basic activo');
    console.log('   • hist_estandar / Test1234!  → Standard completado + Standard activo (mié+jue)');
    console.log('   • hist_tz       / Test1234!  → Basic completado + Basic activo (timezone New York)');
  },

  // ─── DOWN ──────────────────────────────────────────────────────────────────
  async down(queryInterface, Sequelize) {
    const usernames = ['hist_basico', 'hist_estandar', 'hist_tz', 'teacher_test'];

    for (const username of usernames) {
      const users = await queryInterface.sequelize.query(
        `SELECT id FROM Users WHERE username = '${username}'`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      if (users.length === 0) continue;
      const userId = users[0].id;

      // Obtener studentId o teacherId
      const students = await queryInterface.sequelize.query(
        `SELECT id FROM Students WHERE userId = ${userId}`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      const teachers = await queryInterface.sequelize.query(
        `SELECT id FROM Teachers WHERE userId = ${userId}`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (students.length > 0) {
        const sId = students[0].id;

        // TeacherStudents
        await queryInterface.bulkDelete('TeacherStudents', { studentId: sId });

        // StudentClasses → Classes
        const studentClasses = await queryInterface.sequelize.query(
          `SELECT classId FROM StudentClasses WHERE studentId = ${sId}`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        const classIds = studentClasses.map(sc => sc.classId);
        await queryInterface.bulkDelete('StudentClasses', { studentId: sId });
        if (classIds.length > 0) {
          await queryInterface.sequelize.query(
            `DELETE FROM Classes WHERE id IN (${classIds.join(',')})`,
          );
        }

        // StudentPackages
        await queryInterface.bulkDelete('StudentPackages', { studentId: sId });

        // Student
        await queryInterface.bulkDelete('Students', { id: sId });
      }

      if (teachers.length > 0) {
        await queryInterface.bulkDelete('Teachers', { id: teachers[0].id });
      }

      // User
      await queryInterface.bulkDelete('Users', { id: userId });
    }

    console.log('✅ Seeder revertido correctamente.');
  }
};