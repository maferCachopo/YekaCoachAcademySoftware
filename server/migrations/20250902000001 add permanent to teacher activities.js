'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('TeacherActivities', 'isPermanent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true, this activity repeats every week on dayOfWeek'
    });
    await queryInterface.addColumn('TeacherActivities', 'dayOfWeek', {
      type: Sequelize.ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday'),
      allowNull: true,
      comment: 'Day of week for permanent activities (ignored for one-time activities)'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('TeacherActivities', 'isPermanent');
    await queryInterface.removeColumn('TeacherActivities', 'dayOfWeek');
  }
};