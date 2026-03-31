// fix-class-titles.js (Ejecutar en la carpeta server)
const { sequelize, Class, Student, StudentClass } = require('./models');

async function fixTitles() {
  console.log('--- INICIANDO REPARACIÓN DE TÍTULOS DE CLASES ---');
  try {
    // Buscar todas las clases que tienen títulos genéricos
    const classes = await Class.findAll({
      include: [{
        model: Student,
        as: 'students',
        through: { attributes: [] }
      }]
    });

    let updatedCount = 0;

    for (const cls of classes) {
      // Si la clase tiene un estudiante asignado
      if (cls.students && cls.students.length > 0) {
        const student = cls.students[0];
        const fullName = `${student.name} ${student.surname}`;
        
        // Solo actualizamos si el título es genérico o diferente al nombre del alumno
        if (cls.title === 'Clase Individual' || cls.title === 'Clase' || cls.title.includes('Clase Upgrade')) {
          await cls.update({ title: fullName });
          console.log(`Clase ID ${cls.id} corregida: -> ${fullName}`);
          updatedCount++;
        }
      }
    }

    console.log(`--- PROCESO COMPLETADO ---`);
    console.log(`Total de clases actualizadas: ${updatedCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Error durante la reparación:', error);
    process.exit(1);
  }
}

fixTitles();