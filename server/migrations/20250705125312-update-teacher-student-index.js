'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Remove the old index
      await queryInterface.removeIndex('TeacherStudents', 'unique_active_teacher_student');
    } catch (error) {
      console.log('Index might not exist, continuing with migration:', error.message);
    }

    // Add the new index
    await queryInterface.addIndex('TeacherStudents', ['teacherId', 'studentId'], {
      unique: true,
      name: 'unique_teacher_student'
    });
  },

  async down (queryInterface, Sequelize) {
    try {
      // Remove the new index
      await queryInterface.removeIndex('TeacherStudents', 'unique_teacher_student');
    } catch (error) {
      console.log('Index might not exist, continuing with migration:', error.message);
    }

    // Add back the old index
    await queryInterface.addIndex('TeacherStudents', ['teacherId', 'studentId', 'active'], {
      unique: true,
      name: 'unique_active_teacher_student',
      where: {
        active: true
      }
    });
  }
};
