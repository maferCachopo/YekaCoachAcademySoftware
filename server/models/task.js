const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Task extends Model {
    static associate(models) {
      Task.belongsTo(models.Teacher, {
        foreignKey: 'assignedTo',
        as: 'assignedTeacher'
      });
      
      Task.belongsTo(models.Teacher, {
        foreignKey: 'assignedBy',
        as: 'coordinator'
      });
    }
  }

  Task.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Teachers',
        key: 'id'
      },
      allowNull: false
    },
    assignedBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Teachers',
        key: 'id'
      },
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'reviewed', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completionDetails: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Task',
    tableName: 'Tasks',
    timestamps: true
  });

  return Task;
}; 