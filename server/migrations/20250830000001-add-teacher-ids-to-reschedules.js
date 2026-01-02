'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the old_teacher_id column already exists
      const tableInfo = await queryInterface.describeTable('rescheduled_classes');
      
      // Add old_teacher_id if it doesn't exist
      if (!tableInfo.old_teacher_id) {
        await queryInterface.addColumn('rescheduled_classes', 'old_teacher_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'teachers',
            key: 'id'
          },
          comment: 'The teacher of the original class'
        });
        console.log('Added old_teacher_id column to rescheduled_classes table');
      } else {
        console.log('old_teacher_id column already exists in rescheduled_classes table');
      }
      
      // Add new_teacher_id if it doesn't exist
      if (!tableInfo.new_teacher_id) {
        await queryInterface.addColumn('rescheduled_classes', 'new_teacher_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'teachers',
            key: 'id'
          },
          comment: 'The teacher of the new class'
        });
        console.log('Added new_teacher_id column to rescheduled_classes table');
      } else {
        console.log('new_teacher_id column already exists in rescheduled_classes table');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding teacher ID columns:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if the columns exist before trying to remove them
      const tableInfo = await queryInterface.describeTable('rescheduled_classes');
      
      if (tableInfo.new_teacher_id) {
        await queryInterface.removeColumn('rescheduled_classes', 'new_teacher_id');
        console.log('Removed new_teacher_id column from rescheduled_classes table');
      }
      
      if (tableInfo.old_teacher_id) {
        await queryInterface.removeColumn('rescheduled_classes', 'old_teacher_id');
        console.log('Removed old_teacher_id column from rescheduled_classes table');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error removing teacher ID columns:', error);
      return Promise.reject(error);
    }
  }
};