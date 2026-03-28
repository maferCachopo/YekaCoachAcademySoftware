const { sequelize, Student, StudentPackage, StudentClass, Class, Package } = require('./models');
const { Op } = require('sequelize');

async function inspectAndClean() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  INSPECCIÓN DE CLASES PROGRAMADAS POR ESTUDIANTE');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Obtener todos los estudiantes activos con su paquete activo
    const students = await Student.findAll({
      where: { active: true },
      include: [
        {
          model: StudentPackage,
          as: 'packages',
          where: { status: 'active' },
          required: false,
          include: [{ model: Package, as: 'package' }]
        }
      ],
      order: [['id', 'ASC']]
    });

    let problemsFound = 0;

    for (const student of students) {
      const activePackage = student.packages?.[0];

      // Obtener TODAS las clases scheduled del estudiante
      const allScheduled = await StudentClass.findAll({
        where: { studentId: student.id, status: 'scheduled' },
        include: [{ model: Class, as: 'classDetail' }],
        order: [[{ model: Class, as: 'classDetail' }, 'date', 'ASC']]
      });

      if (allScheduled.length === 0) continue;

      const packageTotal = activePackage?.package?.totalClasses || 0;
      const isDuplicated = allScheduled.length > packageTotal;

      console.log(`┌─ Estudiante: ${student.name} ${student.surname} (ID: ${student.id})`);
      console.log(`│  Paquete activo: ${activePackage?.package?.name || 'Sin paquete'} (${packageTotal} clases)`);
      console.log(`│  Clases scheduled en DB: ${allScheduled.length} ${isDuplicated ? '⚠️  DUPLICADAS' : '✅'}`);

      if (isDuplicated) {
        problemsFound++;
        console.log(`│  ── Detalle de clases:`);
        for (const sc of allScheduled) {
          console.log(`│     SC.id=${sc.id} | Class.id=${sc.classId} | pkg=${sc.studentPackageId} | fecha=${sc.classDetail?.date} ${sc.classDetail?.startTime}`);
        }

        // Agrupar por studentPackageId
        const byPackage = {};
        for (const sc of allScheduled) {
          const pid = sc.studentPackageId;
          if (!byPackage[pid]) byPackage[pid] = [];
          byPackage[pid].push(sc);
        }

        console.log(`│  ── Agrupadas por StudentPackage:`);
        for (const [pid, classes] of Object.entries(byPackage)) {
          const isCurrent = activePackage && Number(pid) === activePackage.id;
          console.log(`│     StudentPackage ID ${pid} ${isCurrent ? '← ACTIVO' : '← ANTIGUO'}: ${classes.length} clases`);
        }

        // ── LIMPIEZA AUTOMÁTICA ─────────────────────────────────────────
        // Borrar clases scheduled que pertenecen a StudentPackages que NO son el activo
        if (activePackage) {
          const toClean = allScheduled.filter(sc => sc.studentPackageId !== activePackage.id);

          if (toClean.length > 0) {
            console.log(`│  🧹 Limpiando ${toClean.length} clases de paquetes anteriores...`);
            const t = await sequelize.transaction();
            try {
              const classIdsToDelete = toClean.map(sc => sc.classId);

              // Borrar StudentClasses huérfanas
              await StudentClass.destroy({
                where: { id: toClean.map(sc => sc.id) },
                transaction: t
              });

              // Borrar Classes huérfanas (si no las usa otro StudentClass)
              for (const classId of classIdsToDelete) {
                const other = await StudentClass.findOne({ where: { classId }, transaction: t });
                if (!other) {
                  await Class.destroy({ where: { id: classId }, transaction: t });
                }
              }

              await t.commit();
              console.log(`│  ✅ Limpieza completada`);
            } catch (err) {
              await t.rollback();
              console.log(`│  ❌ Error en limpieza: ${err.message}`);
            }
          } else {
            // Las duplicadas son del mismo paquete activo — mantener solo las más recientes
            console.log(`│  ⚠️  Duplicadas dentro del mismo paquete activo.`);
            console.log(`│     Manteniendo las ${packageTotal} más recientes por fecha...`);

            const t = await sequelize.transaction();
            try {
              // Ordenar por fecha y quedarnos con las primeras N (N = totalClasses)
              const sorted = [...allScheduled].sort((a, b) => {
                const da = a.classDetail?.date || '';
                const db = b.classDetail?.date || '';
                return da.localeCompare(db);
              });

              const toKeep = sorted.slice(0, packageTotal).map(sc => sc.id);
              const toDelete = sorted.slice(packageTotal);

              if (toDelete.length > 0) {
                const classIdsToDelete = toDelete.map(sc => sc.classId);
                await StudentClass.destroy({
                  where: { id: toDelete.map(sc => sc.id) },
                  transaction: t
                });
                for (const classId of classIdsToDelete) {
                  const other = await StudentClass.findOne({ where: { classId }, transaction: t });
                  if (!other) {
                    await Class.destroy({ where: { id: classId }, transaction: t });
                  }
                }
                console.log(`│  ✅ Eliminadas ${toDelete.length} clases duplicadas, mantenidas ${toKeep.length}`);
              }

              await t.commit();
            } catch (err) {
              await t.rollback();
              console.log(`│  ❌ Error en limpieza: ${err.message}`);
            }
          }
        }
      }

      console.log('└─────────────────────────────────────────────────────────\n');
    }

    if (problemsFound === 0) {
      console.log('✅ No se encontraron duplicados. Todos los horarios están limpios.\n');
    } else {
      console.log(`\n🏁 Proceso completado. Se encontraron y limpiaron ${problemsFound} estudiante(s) con duplicados.\n`);
    }

    process.exit(0);
  } catch (e) {
    console.error('Error fatal:', e);
    process.exit(1);
  }
}

inspectAndClean();