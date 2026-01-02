'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.describeTable('Exams').then(async (tableDefinition) => {
      const updatePromises = [];

      // Add reviewNotes column if it doesn't exist
      if (!tableDefinition.reviewNotes) {
        updatePromises.push(queryInterface.addColumn('Exams', 'reviewNotes', {
          type: Sequelize.TEXT,
          allowNull: true
        }));
      }

      // Add reviewedAt column if it doesn't exist
      if (!tableDefinition.reviewedAt) {
        updatePromises.push(queryInterface.addColumn('Exams', 'reviewedAt', {
          type: Sequelize.DATE,
          allowNull: true
        }));
      }

      // Wait for all updates to complete
      await Promise.all(updatePromises);
    }).catch(() => {
      console.log('Exams table does not exist or cannot be modified');
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.describeTable('Exams').then(async (tableDefinition) => {
      const updatePromises = [];

      // Remove reviewNotes column if it exists
      if (tableDefinition.reviewNotes) {
        updatePromises.push(queryInterface.removeColumn('Exams', 'reviewNotes'));
      }

      // Remove reviewedAt column if it exists
      if (tableDefinition.reviewedAt) {
        updatePromises.push(queryInterface.removeColumn('Exams', 'reviewedAt'));
      }

      // Wait for all updates to complete
      await Promise.all(updatePromises);
    }).catch(() => {
      console.log('Exams table does not exist or cannot be modified');
    });
  }
}; 