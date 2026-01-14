'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar si la columna ya existe para evitar errores
    const tableInfo = await queryInterface.describeTable('TeacherStudents');
    
    if (!tableInfo.weeklySchedule) {
      await queryInterface.addColumn('TeacherStudents', 'weeklySchedule', {
        type: Sequelize.TEXT, // Usamos TEXT para SQLite (que simula JSON)
        allowNull: true,
        defaultValue: '[]',
        comment: 'Stores array of { day: string, start: string, end: string }'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('TeacherStudents');
    if (tableInfo.weeklySchedule) {
      await queryInterface.removeColumn('TeacherStudents', 'weeklySchedule');
    }
  }
};