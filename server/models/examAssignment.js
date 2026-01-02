const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExamAssignment extends Model {
    static associate(models) {
      ExamAssignment.belongsTo(models.Exam, {
        foreignKey: 'examId',
        as: 'exam'
      });
      
      ExamAssignment.belongsTo(models.Teacher, {
        foreignKey: 'teacherId',
        as: 'teacher'
      });
    }
  }

  ExamAssignment.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    examId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Exams',
        key: 'id'
      },
      allowNull: false,
      onDelete: 'CASCADE'
    },
    teacherId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Teachers',
        key: 'id'
      },
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('assigned', 'completed', 'approved', 'rejected'),
      defaultValue: 'assigned',
      allowNull: false
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ExamAssignment',
    tableName: 'ExamAssignments',
    timestamps: true
  });

  return ExamAssignment;
}; 