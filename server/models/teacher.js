const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class teacher extends Model {
    static associate(models) {
      teacher.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  // ─── Helper: parsear de forma segura sin importar si ya viene como objeto ───
  const safeParse = (value, fallback) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value; // SQLite ya lo parseó
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return fallback; }
    }
    return fallback;
  };

  teacher.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isCoordinator: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // ─── workHours: TEXT con getter/setter manual ───────────────────────────
    workHours: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '{}',
      get() {
        return safeParse(this.getDataValue('workHours'), {});
      },
      set(value) {
        this.setDataValue('workHours', typeof value === 'string' ? value : JSON.stringify(value));
      },
      validate: {
        isValidWorkHours(value) {
          const workHours = safeParse(value, {});
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const validTimeFormat = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          if (typeof workHours !== 'object') throw new Error('Work hours must be an object');
          Object.keys(workHours).forEach(day => {
            if (!days.includes(day.toLowerCase())) throw new Error(`Invalid day: ${day}`);
            if (!Array.isArray(workHours[day])) throw new Error(`Hours for ${day} must be an array`);
            workHours[day].forEach(slot => {
              if (!slot.start || !slot.end || !validTimeFormat.test(slot.start) || !validTimeFormat.test(slot.end)) {
                throw new Error(`Invalid time format for ${day}`);
              }
            });
          });
        }
      }
    },

    // ─── breakHours: era DataTypes.JSON — lo cambiamos a TEXT para consistencia ─
    breakHours: {
      type: DataTypes.TEXT,           // ← cambiado de JSON a TEXT (igual que workHours)
      allowNull: true,
      defaultValue: '{}',
      get() {
        return safeParse(this.getDataValue('breakHours'), {});
      },
      set(value) {
        this.setDataValue('breakHours', typeof value === 'string' ? value : JSON.stringify(value));
      },
      validate: {
        isValidBreakHours(value) {
          if (value === null || value === undefined) return;
          const breakHours = safeParse(value, {});
          const validTimeFormat = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          if (typeof breakHours !== 'object') throw new Error('Break hours must be an object');
          Object.keys(breakHours).forEach(day => {
            if (!Array.isArray(breakHours[day])) throw new Error(`Break hours for ${day} must be an array`);
            breakHours[day].forEach(slot => {
              if (!slot.start || !slot.end || !validTimeFormat.test(slot.start) || !validTimeFormat.test(slot.end)) {
                throw new Error(`Invalid break time format for ${day}`);
              }
            });
          });
        }
      }
    },

    // ─── specialties: TEXT con getter/setter manual ─────────────────────────
    specialties: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        return safeParse(this.getDataValue('specialties'), []);
      },
      set(value) {
        this.setDataValue('specialties', typeof value === 'string' ? value : JSON.stringify(value));
      },
      validate: {
        isArray(value) {
          const specialties = safeParse(value, []);
          if (!Array.isArray(specialties)) throw new Error('Specialties must be an array');
        }
      }
    },

    maxStudentsPerDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 8,
      validate: { min: 1, max: 20 }
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // ─── workingDays: DataTypes.JSON ya tiene safeParse ─────────────────────
    workingDays: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: '["monday", "tuesday", "wednesday", "thursday", "friday"]',
      get() {
        return safeParse(
          this.getDataValue('workingDays'),
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        );
      },
      set(value) {
        this.setDataValue('workingDays', typeof value === 'string' ? value : JSON.stringify(value));
      },
      validate: {
        isValidWorkingDays(value) {
          if (value === null) return;
          const workingDays = safeParse(value, []);
          const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          if (!Array.isArray(workingDays)) throw new Error('Working days must be an array');
          workingDays.forEach(day => {
            if (!validDays.includes(day)) throw new Error(`Invalid working day: ${day}`);
          });
        }
      }
    }
  }, {
    sequelize,
    modelName: 'teacher',
    tableName: 'teachers',
    timestamps: true
  });

  return teacher;
};