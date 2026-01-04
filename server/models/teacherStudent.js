// server/models/teacherStudent.js
module.exports = (sequelize, DataTypes) => {
  const TeacherStudent = sequelize.define('TeacherStudent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Teachers',
        key: 'id'
      }
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Students',
        key: 'id'
      }
    },
    assignedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    /**
     * weeklySchedule guardará los slots fijos del estudiante.
     * Estructura esperada: [{ "day": "monday", "hour": 10 }, { "day": "friday", "hour": 15 }]
     */
    weeklySchedule: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'TeacherStudents', // Aseguramos el nombre de la tabla
    indexes: [
      {
        unique: true,
        fields: ['teacherId', 'studentId'],
        name: 'unique_teacher_student'
      }
    ]
  });

  return TeacherStudent;
};