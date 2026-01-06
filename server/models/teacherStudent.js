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

    // INICIO DE LA MODIFICACIÓN
    /**
     * MODIFICACIÓN: Se define weeklySchedule como TEXT con getters y setters.
     * MOTIVO: SQLite no tiene un tipo JSON nativo robusto. 
     * Al usar JSON.parse y JSON.stringify, permitimos que el resto de la App 
     * maneje el horario como un objeto de JavaScript (array) de forma transparente,
     * pero se almacena como texto en la base de datos.
     * Estructura: [{ "day": "monday", "startTime": "13:00", "endTime": "14:00" }]
     */
    weeklySchedule: {
      type: DataTypes.TEXT, 
      allowNull: true,
      defaultValue: '[]',
      get() {
        const rawValue = this.getDataValue('weeklySchedule');
        try {
          return rawValue ? JSON.parse(rawValue) : [];
        } catch (e) {
          return [];
        }
      },
      set(value) {
        this.setDataValue('weeklySchedule', JSON.stringify(value || []));
      }
    },
    // FIN DE LA MODIFICACIÓN

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