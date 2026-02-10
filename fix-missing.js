// fix-missing.js
const { TeacherStudent, StudentClass, Class } = require('./server/models');

async function fix() {
  const relations = await TeacherStudent.findAll({ where: { active: true } });
  
  for (const rel of relations) {
    const classes = await StudentClass.findAll({
      where: { studentId: rel.studentId, status: 'scheduled' },
      include: [{ model: Class, as: 'classDetail' }]
    });

    if (classes.length > 0) {
      const schedule = classes.map(c => ({
        day: new Date(c.classDetail.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        hour: parseInt(c.classDetail.startTime.split(':')[0])
      }));
      
      const unique = Array.from(new Set(schedule.map(s => JSON.stringify(s)))).map(s => JSON.parse(s));
      
      await rel.update({ weeklySchedule: unique });
      console.log(`Arreglado estudiante ID: ${rel.studentId}`);
    }
  }
  process.exit();
}
fix();