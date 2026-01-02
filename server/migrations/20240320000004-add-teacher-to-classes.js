'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Classes', 'teacherId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Teachers',
        key: 'id'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Classes', 'teacherId');
  }
}; 