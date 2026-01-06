// server/scripts/syncSchedules.js
const { TeacherStudent, StudentClass, Class, sequelize } = require('../models');

/**
 * Script para sincronizar los horarios de los estudiantes ya existentes.
 * Busca las clases programadas actuales y las convierte en el 
 * "horario fijo" del estudiante dentro de la tabla TeacherStudent.
 */
async function syncSchedules() {
  console.log('--- INICIANDO SINCRONIZACIÓN DE HORARIOS FIJOS ---');
  
  try {
    // 1. Verificar conexión a la base de datos
    await sequelize.authenticate();
    console.log('Conexión establecida con la base de datos.');

    // 2. Buscar todas las relaciones profesor-estudiante activas
    const relations = await TeacherStudent.findAll({ 
      where: { active: true } 
    });

    console.log(`Se encontraron ${relations.length} asignaciones para procesar.\n`);

    let count = 0;

    for (const rel of relations) {
      // 3. Para cada relación, buscamos las clases 'scheduled' que tiene el alumno con ese profesor
      const studentClasses = await StudentClass.findAll({
        where: { 
          studentId: rel.studentId,
          status: 'scheduled'
        },
        include: [{
          model: Class,
          as: 'classDetail',
          where: { teacherId: rel.teacherId }
        }],
        order: [[{ model: Class, as: 'classDetail' }, 'date', 'ASC']]
      });

      if (studentClasses.length > 0) {
        // 4. Extraemos los slots únicos (Día y Hora) de sus clases programadas
        const slots = studentClasses.map(sc => {
          const date = new Date(sc.classDetail.date + 'T00:00:00');
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          const hour = parseInt(sc.classDetail.startTime.split(':')[0]);
          
          return { day: dayName, hour: hour };
        });

        // 5. Eliminar duplicados de slots (por si tiene clases varios lunes, etc.)
        const uniqueSlots = Array.from(new Set(slots.map(s => JSON.stringify(s))))
          .map(s => JSON.parse(s));

        // 6. Actualizar el registro en la tabla TeacherStudent
        await rel.update({
          weeklySchedule: uniqueSlots
        });

        console.log(`[ID Alumno: ${rel.studentId}] -> Sincronizado con ${uniqueSlots.length} horario(s) fijo(s).`);
        count++;
      } else {
        console.log(`[ID Alumno: ${rel.studentId}] -> No tiene clases programadas futuras. Se mantuvo vacío.`);
      }
    }

    console.log(`\n--- PROCESO COMPLETADO ---`);
    console.log(`Total de asignaciones actualizadas: ${count}`);
    
  } catch (error) {
    console.error('Error durante la sincronización:', error);
  } finally {
    // Cerrar el proceso
    await sequelize.close();
    process.exit();
  }
}

// Ejecutar la función
syncSchedules();