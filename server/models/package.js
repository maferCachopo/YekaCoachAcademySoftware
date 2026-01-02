module.exports = (sequelize, DataTypes) => {
  const Package = sequelize.define('Package', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    totalClasses: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    durationMonths: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    maxReschedules: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true
  });

  return Package;
}; 