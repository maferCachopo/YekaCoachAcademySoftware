const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExamQuestion extends Model {
    static associate(models) {
      // All associations are defined in index.js
      // to avoid duplications and naming conflicts
    }
  }

  ExamQuestion.init({
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
    questionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    responseType: {
      type: DataTypes.ENUM('multiple_choice', 'true_false', 'short_answer', 'long_answer'),
      defaultValue: 'multiple_choice',
      allowNull: false
    },
    options: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('options');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('options', value);
        } else {
          this.setDataValue('options', JSON.stringify(value));
        }
      }
    },
    correctAnswer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ExamQuestion',
    tableName: 'ExamQuestions',
    timestamps: true
  });

  return ExamQuestion;
}; 