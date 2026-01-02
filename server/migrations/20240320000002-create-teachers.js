'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Teachers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      workHours: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '{}'
      },
      specialties: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '[]'
      },
      maxStudentsPerDay: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 8
      },
      isCoordinator: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS teachers_userId ON Teachers (userId);
      CREATE INDEX IF NOT EXISTS teachers_active ON Teachers (active);
      CREATE INDEX IF NOT EXISTS teachers_isCoordinator ON Teachers (isCoordinator);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Teachers');
  }
}; 