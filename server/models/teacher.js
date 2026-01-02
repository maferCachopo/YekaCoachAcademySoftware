const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Teacher extends Model {
    static associate(models) {
      Teacher.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  Teacher.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
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
    workHours: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '{}',
      get() {
        const rawValue = this.getDataValue('workHours');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('workHours', value);
        } else {
          this.setDataValue('workHours', JSON.stringify(value));
        }
      },
      validate: {
        isValidWorkHours(value) {
          const workHours = typeof value === 'string' ? JSON.parse(value) : value;
          
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const validTimeFormat = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          
          if (typeof workHours !== 'object') throw new Error('Work hours must be an object');
          
          Object.keys(workHours).forEach(day => {
            if (!days.includes(day.toLowerCase())) {
              throw new Error(`Invalid day: ${day}`);
            }
            if (!Array.isArray(workHours[day])) {
              throw new Error(`Hours for ${day} must be an array`);
            }
            workHours[day].forEach(slot => {
              if (!slot.start || !slot.end || !validTimeFormat.test(slot.start) || !validTimeFormat.test(slot.end)) {
                throw new Error(`Invalid time format for ${day}`);
              }
            });
          });
        }
      }
    },
    breakHours: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: '{}',
      get() {
        const rawValue = this.getDataValue('breakHours');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('breakHours', value);
        } else {
          this.setDataValue('breakHours', JSON.stringify(value));
        }
      },
      validate: {
        isValidBreakHours(value) {
          if (value === null) return;
          
          const breakHours = typeof value === 'string' ? JSON.parse(value) : value;
          
          const validTimeFormat = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          
          if (typeof breakHours !== 'object') throw new Error('Break hours must be an object');
          
          Object.keys(breakHours).forEach(day => {
            if (!Array.isArray(breakHours[day])) {
              throw new Error(`Break hours for ${day} must be an array`);
            }
            breakHours[day].forEach(slot => {
              if (!slot.start || !slot.end || !validTimeFormat.test(slot.start) || !validTimeFormat.test(slot.end)) {
                throw new Error(`Invalid break time format for ${day}`);
              }
            });
          });
        }
      }
    },
    specialties: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const rawValue = this.getDataValue('specialties');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('specialties', value);
        } else {
          this.setDataValue('specialties', JSON.stringify(value));
        }
      },
      validate: {
        isArray(value) {
          const specialties = typeof value === 'string' ? JSON.parse(value) : value;
          if (!Array.isArray(specialties)) {
            throw new Error('Specialties must be an array');
          }
        }
      }
    },
    maxStudentsPerDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 8,
      validate: {
        min: 1,
        max: 20
      }
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    workingDays: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: '["monday", "tuesday", "wednesday", "thursday", "friday"]',
      get() {
        const rawValue = this.getDataValue('workingDays');
        if (!rawValue) {
          return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        }
        
        // If rawValue is already an array, return it as is
        if (Array.isArray(rawValue)) {
          return rawValue;
        }
        
        // If rawValue is a string, parse it
        try {
          return JSON.parse(rawValue);
        } catch (error) {
          console.error('Error parsing workingDays:', error);
          return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        }
      },
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('workingDays', value);
        } else {
          this.setDataValue('workingDays', JSON.stringify(value));
        }
      },
      validate: {
        isValidWorkingDays(value) {
          if (value === null) return;
          
          const workingDays = typeof value === 'string' ? JSON.parse(value) : value;
          const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          
          if (!Array.isArray(workingDays)) {
            throw new Error('Working days must be an array');
          }
          
          workingDays.forEach(day => {
            if (!validDays.includes(day)) {
              throw new Error(`Invalid working day: ${day}`);
            }
          });
        }
      }
    }
  }, {
    sequelize,
    modelName: 'Teacher',
    tableName: 'Teachers',
    timestamps: true
  });

  return Teacher;
}; 