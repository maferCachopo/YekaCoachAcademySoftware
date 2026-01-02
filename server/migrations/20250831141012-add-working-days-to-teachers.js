'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Teachers', 'workingDays', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: '["monday", "tuesday", "wednesday", "thursday", "friday"]'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Teachers', 'workingDays');
  }
};
