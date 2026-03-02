/**
 * SCRIPT DE MIGRACION - Ejecutar UNA SOLA VEZ
 * Recalcula weeklySchedule para todos los TeacherStudents
 * basandose en las clases reales programadas
 *
 * Uso desde carpeta server/:
 *   node backfill-weekly-schedule.js
 */

const { Op } = require('sequelize');
const db = require('./models');
const { TeacherStudent, StudentClass, Class } = db;

async function backfillWeeklySchedule() {
  console.log('=== INICIO MIGRACION weeklySchedule ===\n');

  try {
    await db.sequelize.authenticate();
    console.log('Conexion a DB OK\n');

    // 1. Obtener todas las relaciones activas profesor-estudiante
    const relations = await TeacherStudent.findAll({
      where: { active: true }
    });

    console.log(`Relaciones activas encontradas: ${relations.length}\n`);

    let updated = 0;
    let skipped = 0;

    for (const rel of relations) {
      const { teacherId, studentId } = rel;

      // 2. Buscar todas las StudentClass de este estudiante
      //    cuya clase pertenezca a este profesor
      const studentClasses = await StudentClass.findAll({
        where: {
          studentId,
          status: { [Op.in]: ['scheduled', 'completed'] }
        },
        include: [{
          model: Class,
          as: 'classDetail',
          where: {
            teacherId,
            status: { [Op.in]: ['scheduled', 'completed'] }
          },
          required: true
        }]
      });

      if (studentClasses.length === 0) {
        console.log(`  SKIP  Student ${studentId} / Teacher ${teacherId}: sin clases`);
        skipped++;
        continue;
      }

      // 3. Extraer slots unicos dia+hora
      const seen = new Set();
      const weeklySchedule = [];

      for (const sc of studentClasses) {
        const cls = sc.classDetail;
        if (!cls || !cls.date || !cls.startTime) continue;

        const d = new Date(cls.date + 'T12:00:00');
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const day = days[d.getDay()];
        const hour = parseInt(cls.startTime.split(':')[0]);
        const startTime = cls.startTime.substring(0, 5);
        const endTime = cls.endTime
          ? cls.endTime.substring(0, 5)
          : `${String(hour + 1).padStart(2, '0')}:00`;

        const key = `${day}-${hour}`;
        if (!seen.has(key)) {
          seen.add(key);
          weeklySchedule.push({ day, hour, startTime, endTime });
        }
      }

      if (weeklySchedule.length === 0) {
        console.log(`  SKIP  Student ${studentId} / Teacher ${teacherId}: clases sin fecha valida`);
        skipped++;
        continue;
      }

      // 4. Ordenar por dia y hora
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      weeklySchedule.sort((a, b) => {
        const di = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        return di !== 0 ? di : a.hour - b.hour;
      });

      // 5. Guardar en la BD
      await rel.update({ weeklySchedule });
      updated++;

      console.log(
        `  OK    Student ${studentId} / Teacher ${teacherId}: ${weeklySchedule.length} slots => ` +
        weeklySchedule.map(s => `${s.day} ${s.startTime}`).join(' | ')
      );
    }

    console.log('\n=== RESULTADO ===');
    console.log(`  Actualizados : ${updated}`);
    console.log(`  Omitidos     : ${skipped}`);
    console.log('=== FIN ===\n');

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

backfillWeeklySchedule();