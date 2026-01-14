'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Obtener información de la tabla actual
    const tableInfo = await queryInterface.describeTable('Students');
    
    // 2. Verificar si la columna NO existe antes de crearla
    if (!tableInfo.allowDifferentTeacher) {
      await queryInterface.addColumn('Students', 'allowDifferentTeacher', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
      console.log('Columna allowDifferentTeacher creada exitosamente.');
    } else {
      console.log('La columna allowDifferentTeacher ya existe. Saltando paso.');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Students');
    if (tableInfo.allowDifferentTeacher) {
      await queryInterface.removeColumn('Students', 'allowDifferentTeacher');
    }
  }
};