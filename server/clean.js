// server/fix-upgraded-students.js
const { TeacherStudent, StudentClass, Class, Student } = require('./models');

async function fixDatabase() {
  console.log('=== Iniciando reparación de estudiantes con Upgrade ===');
  
  try {
    // 1. Buscamos todas las relaciones profesor-estudiante activas
    const relations = await TeacherStudent.findAll({ where: { active: true } });
    console.log(`Analizando ${relations.length} registros...`);

    let arreglados = 0;

    for (const rel of relations) {
      // 2. Buscamos las clases programadas (scheduled) de este estudiante
      const classes = await StudentClass.findAll({
        where: { 
          studentId: rel.studentId, 
          status: 'scheduled' 
        },
        include: [{ 
          model: Class, 
          as: 'classDetail',
          where: { teacherId: rel.teacherId } 
        }]
      });

      // Si tiene clases pero el horario fijo está vacío o es un array vacío
      if (classes.length > 0 && (!rel.weeklySchedule || rel.weeklySchedule.length === 0)) {
        
        // 3. Extraemos el día y la hora de las clases existentes
        const schedule = classes.map(c => {
          const date = new Date(c.classDetail.date + 'T00:00:00');
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          const hour = parseInt(c.classDetail.startTime.split(':')[0]);
          return { day: dayName, hour: hour };
        });

        // Eliminar duplicados
        const uniqueSchedule = Array.from(new Set(schedule.map(s => JSON.stringify(s))))
                                    .map(s => JSON.parse(s));

        // 4. Actualizamos el registro "roto"
        await rel.update({ weeklySchedule: uniqueSchedule });
        
        const student = await Student.findByPk(rel.studentId);
        console.log(`✅ Arreglado: ${student.name} ${student.surname} (ID: ${rel.studentId})`);
        arreglados++;
      }
    }

    console.log(`\n=== Proceso terminado: ${arreglados} estudiantes reparados ===`);
    process.exit(0);
  } catch (error) {
    console.error('Error durante la reparación:', error);
    process.exit(1);
  }
}

fixDatabase();