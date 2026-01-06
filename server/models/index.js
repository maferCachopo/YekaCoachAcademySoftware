const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Initialize an empty db object
const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./user')(sequelize, Sequelize.DataTypes);
db.Student = require('./student')(sequelize, Sequelize.DataTypes);
db.Package = require('./package')(sequelize, Sequelize.DataTypes);
db.StudentPackage = require('./studentPackage')(sequelize, Sequelize.DataTypes);
db.Class = require('./class')(sequelize, Sequelize.DataTypes);
db.StudentClass = require('./studentClass')(sequelize, Sequelize.DataTypes);
db.RescheduleClass = require('./rescheduleClass')(sequelize, Sequelize.DataTypes);
db.Teacher = require('./teacher')(sequelize, Sequelize.DataTypes);
db.TeacherStudent = require('./teacherStudent')(sequelize, Sequelize.DataTypes);
db.TeacherActivity = require('./teacherActivity')(sequelize, Sequelize.DataTypes);
db.Task = require('./task')(sequelize, Sequelize.DataTypes);
db.Exam = require('./exam')(sequelize, Sequelize.DataTypes);
db.ExamQuestion = require('./examQuestion')(sequelize, Sequelize.DataTypes);
db.ExamAnswer = require('./examAnswer')(sequelize, Sequelize.DataTypes);
db.ExamAssignment = require('./examAssignment')(sequelize, Sequelize.DataTypes);

// --- Define relationships ---

// Student belongs to User
db.Student.belongsTo(db.User, {
  foreignKey: 'userId',
  as: 'user'
});

// Student has many StudentPackages
db.Student.hasMany(db.StudentPackage, {
  foreignKey: 'studentId',
  as: 'packages'
});

// StudentPackage belongs to Student
db.StudentPackage.belongsTo(db.Student, {
  foreignKey: 'studentId',
  as: 'student'
});

// StudentPackage belongs to Package
db.StudentPackage.belongsTo(db.Package, {
  foreignKey: 'packageId',
  as: 'package'
});

// Package has many StudentPackages
db.Package.hasMany(db.StudentPackage, {
  foreignKey: 'packageId',
  as: 'studentPackages'
});

// Class can belong to many Students through StudentClass
db.Class.belongsToMany(db.Student, {
  through: db.StudentClass,
  foreignKey: 'classId',
  otherKey: 'studentId',
  as: 'students'
});

// Student can have many Classes through StudentClass
db.Student.belongsToMany(db.Class, {
  through: db.StudentClass,
  foreignKey: 'studentId',
  otherKey: 'classId',
  as: 'classes'
});

// StudentClass belongs to Student
db.StudentClass.belongsTo(db.Student, {
  foreignKey: 'studentId',
  as: 'student'
});

// StudentClass belongs to Class
db.StudentClass.belongsTo(db.Class, {
  foreignKey: 'classId',
  as: 'classDetail'
});

// Proper associations for student packages and classes
db.StudentClass.belongsTo(db.StudentPackage, { foreignKey: 'studentPackageId', as: 'studentPackage' });
db.StudentPackage.hasMany(db.StudentClass, { foreignKey: 'studentPackageId', as: 'studentClasses' });

// Fix duplicate alias for Class
db.Class.hasMany(db.StudentClass, { foreignKey: 'classId', as: 'studentClasses' });

// RescheduleClass relationships
db.Class.hasMany(db.RescheduleClass, { foreignKey: 'oldClassId', as: 'oldReschedulings' });
db.Class.hasMany(db.RescheduleClass, { foreignKey: 'newClassId', as: 'newReschedulings' });
db.Student.hasMany(db.RescheduleClass, { foreignKey: 'studentId', as: 'reschedulings' });
db.StudentPackage.hasMany(db.RescheduleClass, { foreignKey: 'studentPackageId', as: 'reschedulings' });

// --- Teacher-Student Relationships (MODIFICADO) ---
// Definimos la relación muchos a muchos
db.Teacher.belongsToMany(db.Student, {
  through: db.TeacherStudent,
  foreignKey: 'teacherId',
  otherKey: 'studentId',
  as: 'students'
});

db.Student.belongsToMany(db.Teacher, {
  through: db.TeacherStudent,
  foreignKey: 'studentId',
  otherKey: 'teacherId',
  as: 'teachers'
});

// IMPORTANTE: Definimos las relaciones directas con la tabla pivot para poder consultar
// el campo weeklySchedule de forma individual o mediante includes directos.
db.Teacher.hasMany(db.TeacherStudent, { foreignKey: 'teacherId', as: 'TeacherAssignments' });
db.Student.hasMany(db.TeacherStudent, { foreignKey: 'studentId', as: 'TeacherAssignments' });
db.TeacherStudent.belongsTo(db.Teacher, { foreignKey: 'teacherId', as: 'teacher' });
db.TeacherStudent.belongsTo(db.Student, { foreignKey: 'studentId', as: 'student' });

// Teacher-Activity relationships
db.Teacher.hasMany(db.TeacherActivity, {
  foreignKey: 'teacherId',
  as: 'activities'
});

db.TeacherActivity.belongsTo(db.Teacher, {
  foreignKey: 'teacherId',
  as: 'teacher'
});

// Class associated with a teacher
db.Class.belongsTo(db.Teacher, {
  foreignKey: 'teacherId',
  as: 'teacher'
});

db.Teacher.hasMany(db.Class, {
  foreignKey: 'teacherId',
  as: 'classes'
});

// Exam associations
db.Exam.hasMany(db.ExamQuestion, { foreignKey: 'examId', as: 'questions' });
db.ExamQuestion.belongsTo(db.Exam, { foreignKey: 'examId', as: 'examDetails' });

// ExamAnswer associations
db.ExamQuestion.hasMany(db.ExamAnswer, { foreignKey: 'questionId', as: 'answers' });
db.Exam.hasMany(db.ExamAnswer, { foreignKey: 'examId', as: 'answers' });
db.Teacher.hasMany(db.ExamAnswer, { foreignKey: 'teacherId', as: 'examAnswers' });

// Associate all models that have an associate function
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;