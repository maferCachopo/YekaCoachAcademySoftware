const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExamAnswer extends Model {
    static associate(models) {
      ExamAnswer.belongsTo(models.ExamQuestion, {
        foreignKey: 'questionId',
        as: 'question'
      });
      
      ExamAnswer.belongsTo(models.Exam, {
        foreignKey: 'examId',
        as: 'exam'
      });
      
      ExamAnswer.belongsTo(models.Teacher, {
        foreignKey: 'teacherId',
        as: 'teacher'
      });
    }
  }

  ExamAnswer.init({
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
    questionId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'ExamQuestions',
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
    answerText: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    selectedOption: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ExamAnswer',
    tableName: 'ExamAnswers',
    timestamps: true
  });

  return ExamAnswer;
}; 