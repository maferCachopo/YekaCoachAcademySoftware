'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Intentar eliminar el índice antiguo (si existe)
    try {
      await queryInterface.removeIndex('TeacherStudents', 'unique_active_teacher_student');
      console.log('Índice antiguo eliminado.');
    } catch (error) {
      console.log('El índice antiguo no existía o ya fue eliminado. Continuando...');
    }

    // 2. Intentar crear el nuevo índice (manejando si ya existe)
    try {
      await queryInterface.addIndex('TeacherStudents', ['teacherId', 'studentId'], {
        unique: true,
        name: 'unique_teacher_student'
      });
      console.log('Índice unique_teacher_student creado.');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('El índice unique_teacher_student ya existe. Saltando paso.');
      } else {
        // Si es otro error, lo lanzamos para que se sepa
        throw error;
      }
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      await queryInterface.removeIndex('TeacherStudents', 'unique_teacher_student');
    } catch (error) {
      console.log('Error al eliminar índice nuevo en rollback:', error.message);
    }

    try {
      await queryInterface.addIndex('TeacherStudents', ['teacherId', 'studentId', 'active'], {
        unique: true,
        name: 'unique_active_teacher_student',
        where: {
          active: true
        }
      });
    } catch (error) {
      console.log('Error al restaurar índice antiguo en rollback:', error.message);
    }
  }
};