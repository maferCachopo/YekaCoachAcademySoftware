const { sequelize, StudentPackage, Student, Package } = require('./models');

async function debugStats() {
  try {
    // Ver todos los paquetes activos con su remainingClasses
    const activePackages = await StudentPackage.findAll({
      where: { status: 'active' },
      include: [
        { model: Student, as: 'student', attributes: ['id', 'name', 'surname', 'active'] },
        { model: Package, as: 'package', attributes: ['id', 'name', 'totalClasses'] }
      ],
      order: [['studentId', 'ASC']]
    });

    console.log('\n═══════════════════════════════════════════════');
    console.log(`Total paquetes con status="active": ${activePackages.length}`);
    console.log('═══════════════════════════════════════════════\n');

    for (const sp of activePackages) {
      console.log(`StudentPackage ID: ${sp.id}`);
      console.log(`  Estudiante: ${sp.student?.name} ${sp.student?.surname} (active=${sp.student?.active})`);
      console.log(`  Paquete:    ${sp.package?.name} (totalClasses=${sp.package?.totalClasses})`);
      console.log(`  remainingClasses: ${sp.remainingClasses}`);
      console.log(`  startDate: ${sp.startDate} | endDate: ${sp.endDate}`);
      console.log('---');
    }

    // Contar con el filtro actual (solo > 0)
    const { Op } = require('sequelize');
    const countGt0 = await StudentPackage.count({
      where: { status: 'active', remainingClasses: { [Op.gt]: 0 } }
    });
    console.log(`\n✅ Con filtro remainingClasses > 0: ${countGt0}`);

    // Contar sin filtro de remaining
    const countAll = await StudentPackage.count({
      where: { status: 'active' }
    });
    console.log(`📦 Sin filtro (todos los activos):  ${countAll}`);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

debugStats();