const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    seederStorage: 'sequelize',
    migrationStorage: 'sequelize'
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    seederStorage: 'sequelize',
    migrationStorage: 'sequelize'
  },
  production: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    seederStorage: 'sequelize',
    migrationStorage: 'sequelize'
  }
}; 