'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Obtener información de la tabla Classes
    const tableInfo = await queryInterface.describeTable('Classes');

    // 2. Verificar si la columna teacherId NO existe
    if (!tableInfo.teacherId) {
      await queryInterface.addColumn('Classes', 'teacherId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Teachers',
          key: 'id'
        }
      });
      console.log('Columna teacherId agregada a Classes.');
    } else {
      console.log('La columna teacherId ya existe en Classes. Saltando paso.');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Classes');
    if (tableInfo.teacherId) {
      await queryInterface.removeColumn('Classes', 'teacherId');
    }
  }
};