module.exports = (sequelize, DataTypes) => {
  const StudentClass = sequelize.define('StudentClass', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Students',
        key: 'id'
      }
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Classes',
        key: 'id'
      }
    },
    studentPackageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'StudentPackages',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'attended', 'missed', 'cancelled', 'rescheduled'),
      defaultValue: 'scheduled'
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    originalClassId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Classes',
        key: 'id'
      },
      comment: 'If rescheduled, points to original class'
    },
    rescheduledDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the class was rescheduled'
    },
    canReschedule: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true
  });

  return StudentClass;
}; 