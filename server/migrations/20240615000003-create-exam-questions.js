'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ExamQuestions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      examId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Exams',
          key: 'id'
        },
        allowNull: false,
        onDelete: 'CASCADE'
      },
      questionNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      questionText: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      responseType: {
        type: Sequelize.ENUM('multiple_choice', 'true_false', 'short_answer', 'long_answer'),
        defaultValue: 'multiple_choice',
        allowNull: false
      },
      options: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      correctAnswer: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      points: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ExamQuestions');
  }
}; 