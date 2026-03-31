const { Class, Student, StudentClass } = require('./models');

async function run() {
  const classes = await Class.findAll({
    include: [{ model: Student, as: 'students' }]
  });
  for (let c of classes) {
    if (c.students && c.students.length > 0) {
      const name = `${c.students[0].name} ${c.students[0].surname}`;
      await c.update({ title: name });
      console.log(`Actualizado ID ${c.id} a ${name}`);
    }
  }
  process.exit();
}
run();