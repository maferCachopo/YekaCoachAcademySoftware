module.exports = (sequelize, DataTypes) => {
  const teacherActivity = sequelize.define('teacherActivity', {
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
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('class', 'meeting', 'preparation', 'other'),
      defaultValue: 'other'
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'),
      defaultValue: 'scheduled'
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'UTC'
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // ── NEW ──
    isPermanent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true the activity repeats every week on dayOfWeek; the "date" field holds the creation/anchor date'
    },
    dayOfWeek: {
      type: DataTypes.ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday'),
      allowNull: true,
      comment: 'Day of week for permanent activities (populated automatically from "date" on create)'
    }
  }, {
    timestamps: true
  });

  return teacherActivity;
};