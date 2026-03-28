const { sequelize } = require('./models');

async function fixTeachers() {
  try {
    // Ver todos los profesores primero
    const teachers = await sequelize.query(
      'SELECT id, firstName, lastName, breakHours, specialties, workHours FROM Teachers',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Profesores encontrados:', teachers.length);
    
    for (const t of teachers) {
      console.log(`\nProfesor ID ${t.id}: ${t.firstName} ${t.lastName}`);
      console.log('  breakHours raw:', t.breakHours);
      console.log('  specialties raw:', t.specialties);
      console.log('  workHours raw:', t.workHours);
      
      // Detectar si están corruptos
      const needsFix = 
        !t.breakHours || 
        t.breakHours.includes('[object') ||
        t.breakHours === 'null' ||
        !t.specialties ||
        t.specialties.includes('[object');

      if (needsFix) {
        console.log('  ⚠️  CORRUPTO — arreglando...');
        await sequelize.query(
          `UPDATE Teachers SET breakHours = '{}', specialties = '[]' WHERE id = ${t.id}`
        );
        console.log('  ✅ Arreglado');
      } else {
        console.log('  ✅ OK');
      }
    }
    
    console.log('\n✅ Proceso completado');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixTeachers();