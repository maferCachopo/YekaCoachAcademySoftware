'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if timezone column exists in Classes table
    const classesTableInfo = await queryInterface.describeTable('Classes');
    if (!classesTableInfo.timezone) {
      await queryInterface.addColumn('Classes', 'timezone', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'UTC'
      });
    }

    // Check if timezone column exists in TeacherActivities table
    const teacherActivitiesTableInfo = await queryInterface.describeTable('TeacherActivities');
    if (!teacherActivitiesTableInfo.timezone) {
      await queryInterface.addColumn('TeacherActivities', 'timezone', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'UTC'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Only attempt to remove columns if they exist
    const classesTableInfo = await queryInterface.describeTable('Classes');
    if (classesTableInfo.timezone) {
      await queryInterface.removeColumn('Classes', 'timezone');
    }
    
    const teacherActivitiesTableInfo = await queryInterface.describeTable('TeacherActivities');
    if (teacherActivitiesTableInfo.timezone) {
      await queryInterface.removeColumn('TeacherActivities', 'timezone');
    }
  }
}; 