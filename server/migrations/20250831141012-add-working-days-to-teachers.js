'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Obtener información de la tabla Teachers
    const tableInfo = await queryInterface.describeTable('Teachers');
    
    // 2. Verificar si la columna workingDays NO existe
    if (!tableInfo.workingDays) {
      await queryInterface.addColumn('Teachers', 'workingDays', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: '["monday", "tuesday", "wednesday", "thursday", "friday"]'
      });
      console.log('Columna workingDays agregada a Teachers.');
    } else {
      console.log('La columna workingDays ya existe en Teachers. Saltando paso.');
    }
  },

  async down (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Teachers');
    if (tableInfo.workingDays) {
      await queryInterface.removeColumn('Teachers', 'workingDays');
    }
  }
};