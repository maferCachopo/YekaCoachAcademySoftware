'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Tasks');

    if (!tableInfo.completionDetails) {
      await queryInterface.addColumn('Tasks', 'completionDetails', {
        type: Sequelize.TEXT,
        allowNull: true
      });
      console.log('Columna completionDetails agregada a Tasks.');
    } else {
      console.log('La columna completionDetails ya existe en Tasks. Saltando paso.');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Tasks');
    if (tableInfo.completionDetails) {
      await queryInterface.removeColumn('Tasks', 'completionDetails');
    }
  }
};