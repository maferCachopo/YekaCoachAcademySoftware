const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Exam extends Model {
    static associate(models) {
      // We'll keep this for backward compatibility but use ExamAssignment for new implementations
      Exam.belongsTo(models.Teacher, {
        foreignKey: 'assignedTo',
        as: 'assignedTeacher'
      });
      
      Exam.belongsTo(models.Teacher, {
        foreignKey: 'createdBy',
        as: 'coordinator'
      });
      
      // Add many-to-many relationship with teachers through ExamAssignment
      Exam.belongsToMany(models.Teacher, {
        through: models.ExamAssignment,
        foreignKey: 'examId',
        otherKey: 'teacherId',
        as: 'assignedTeachers'
      });
      
      // Exam has many ExamAssignments
      Exam.hasMany(models.ExamAssignment, {
        foreignKey: 'examId',
        as: 'assignments'
      });
    }
  }

  Exam.init({
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
      allowNull: true
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Teachers',
        key: 'id'
      },
      allowNull: true // Make nullable since we'll use ExamAssignments instead
    },
    createdBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Teachers',
        key: 'id'
      },
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'assigned', 'completed', 'approved', 'rejected'),
      defaultValue: 'draft',
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Exam',
    tableName: 'Exams',
    timestamps: true
  });

  return Exam;
}; 