const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RescheduleClass = sequelize.define('RescheduleClass', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Students',
        key: 'id',
      },
      comment: 'The student who rescheduled the class',
    },
    oldClassId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Classes',
        key: 'id',
      },
      comment: 'The original class that was rescheduled',
    },
    newClassId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Classes',
        key: 'id',
      },
      comment: 'The new class after rescheduling',
    },
    rescheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the class was rescheduled',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for rescheduling',
    },
    studentPackageId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'StudentPackages',
        key: 'id',
      },
      comment: 'The package used for rescheduling',
    },
    differentTeacher: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates if this reschedule is with a different teacher than the original class',
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
      defaultValue: 'confirmed',
      allowNull: false,
      comment: 'Status of the rescheduling request',
    }
  }, {
    tableName: 'rescheduled_classes',
    timestamps: true,
    underscored: true,
  });

  RescheduleClass.associate = (models) => {
    // RescheduleClass belongs to Student
    RescheduleClass.belongsTo(models.Student, {
      foreignKey: 'studentId',
      as: 'student',
    });

    // RescheduleClass belongs to the original Class
    RescheduleClass.belongsTo(models.Class, {
      foreignKey: 'oldClassId',
      as: 'oldClass',
    });

    // RescheduleClass belongs to the new Class
    RescheduleClass.belongsTo(models.Class, {
      foreignKey: 'newClassId',
      as: 'newClass',
    });

    // RescheduleClass belongs to StudentPackage
    RescheduleClass.belongsTo(models.StudentPackage, {
      foreignKey: 'studentPackageId',
      as: 'studentPackage',
    });
    
    // Define relationships with Teacher model for both old and new classes
    // These are indirect relationships through the Class model
    if (models.Teacher) {
      RescheduleClass.belongsTo(models.Teacher, {
        foreignKey: 'oldTeacherId',
        as: 'oldTeacher',
        constraints: false // This is a virtual relationship
      });
      
      RescheduleClass.belongsTo(models.Teacher, {
        foreignKey: 'newTeacherId',
        as: 'newTeacher',
        constraints: false // This is a virtual relationship
      });
    }
  };

  return RescheduleClass;
}; 