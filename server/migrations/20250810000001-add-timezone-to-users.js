'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if timezone column already exists in Users table
    const tableInfo = await queryInterface.describeTable('Users');
    if (!tableInfo.timezone) {
      await queryInterface.addColumn('Users', 'timezone', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'UTC'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Check if timezone column exists before trying to remove it
    const tableInfo = await queryInterface.describeTable('Users');
    if (tableInfo.timezone) {
      await queryInterface.removeColumn('Users', 'timezone');
    }
  }
};