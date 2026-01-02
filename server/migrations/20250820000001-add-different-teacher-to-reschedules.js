'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the column already exists
      const tableInfo = await queryInterface.describeTable('rescheduled_classes');
      if (!tableInfo.different_teacher) {
        // Add the different_teacher column if it doesn't exist
        await queryInterface.addColumn('rescheduled_classes', 'different_teacher', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Indicates if this reschedule is with a different teacher than the original class'
        });
        console.log('Added different_teacher column to rescheduled_classes table');
      } else {
        console.log('different_teacher column already exists in rescheduled_classes table');
      }
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding different_teacher column:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if the column exists before trying to remove it
      const tableInfo = await queryInterface.describeTable('rescheduled_classes');
      if (tableInfo.different_teacher) {
        await queryInterface.removeColumn('rescheduled_classes', 'different_teacher');
        console.log('Removed different_teacher column from rescheduled_classes table');
      } else {
        console.log('different_teacher column does not exist in rescheduled_classes table');
      }
      return Promise.resolve();
    } catch (error) {
      console.error('Error removing different_teacher column:', error);
      return Promise.reject(error);
    }
  }
};