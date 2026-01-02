const { sequelize, User, Student, Package, StudentPackage, Class, StudentClass, Teacher, Task, Exam, ExamQuestion } = require('../models');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Starting database seeding...');
  
  try {
    // Create admin user if not exists
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      console.log('Creating admin user...');
      await User.create({
        username: 'admin',
        email: 'admin@yekacouchacademy.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        active: true
      });
    }
    
    // Create coordinator user and teacher
    let coordinator = await User.findOne({ where: { username: 'coordinator' } });
    let coordinatorTeacher;
    
    if (!coordinator) {
      console.log('Creating coordinator user...');
      coordinator = await User.create({
        username: 'coordinator',
        email: 'coordinator@yekacouchacademy.com',
        password: await bcrypt.hash('coordinator123', 10),
        role: 'coordinator',
        active: true
      });
      
      coordinatorTeacher = await Teacher.create({
        userId: coordinator.id,
        firstName: 'Coordinator',
        lastName: 'Admin',
        phone: '+1234567890',
        isCoordinator: true,
        specialties: 'Management, Coordination',
        active: true
      });
    } else {
      coordinatorTeacher = await Teacher.findOne({
        where: {
          userId: coordinator.id
        }
      });
    }
    
    // Create teacher users
    let teacher1 = await User.findOne({ where: { username: 'teacher1' } });
    let teacher1Model;
    
    if (!teacher1) {
      console.log('Creating teacher1 user...');
      teacher1 = await User.create({
        username: 'teacher1',
        email: 'teacher1@yekacouchacademy.com',
        password: await bcrypt.hash('teacher123', 10),
        role: 'teacher',
        active: true
      });
      
      teacher1Model = await Teacher.create({
        userId: teacher1.id,
        firstName: 'Maria',
        lastName: 'Rodriguez',
        phone: '+1234567891',
        specialties: 'Beginner Spanish, Conversation',
        active: true
      });
    } else {
      teacher1Model = await Teacher.findOne({
        where: {
          userId: teacher1.id
        }
      });
    }
    
    // Create some example tasks if not exists
    const tasksCount = await Task.count();
    if (tasksCount === 0) {
      console.log('Creating example tasks...');
      await Task.bulkCreate([
        {
          title: 'Prepare lesson plans',
          description: 'Create detailed lesson plans for beginner Spanish classes',
          assignedTo: teacher1Model.id,
          assignedBy: coordinatorTeacher.id,
          status: 'pending'
        },
        {
          title: 'Review student essays',
          description: 'Grade and provide feedback on student essays from advanced class',
          assignedTo: teacher1Model.id,
          assignedBy: coordinatorTeacher.id,
          status: 'in_progress'
        }
      ]);
    }
    
    // Create some example exams if not exists
    const examsCount = await Exam.count();
    if (examsCount === 0) {
      console.log('Creating example exams...');
      
      // Create first exam
      const exam1 = await Exam.create({
        title: 'Spanish Language Proficiency Exam',
        description: 'Evaluate students\' language proficiency in reading and writing.',
        assignedTo: teacher1Model.id,
        createdBy: coordinatorTeacher.id,
        status: 'assigned',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalQuestions: 5
      });
      
      // Create questions for first exam
      await ExamQuestion.bulkCreate([
        {
          examId: exam1.id,
          questionNumber: 1,
          questionText: 'Translate the following sentence: "I would like to go to the beach tomorrow."',
          responseType: 'short_answer',
          correctAnswer: 'Me gustaría ir a la playa mañana.',
          points: 5
        },
        {
          examId: exam1.id,
          questionNumber: 2,
          questionText: 'Which of the following is the correct conjugation of the verb "hablar" in the first person plural present tense?',
          responseType: 'multiple_choice',
          options: JSON.stringify(['hablamos', 'hablan', 'hablo', 'habláis']),
          correctAnswer: 'hablamos',
          points: 3
        },
        {
          examId: exam1.id,
          questionNumber: 3,
          questionText: 'Write a short paragraph about your daily routine in Spanish.',
          responseType: 'long_answer',
          points: 10
        },
        {
          examId: exam1.id,
          questionNumber: 4,
          questionText: 'Is "la problema" the correct way to say "the problem" in Spanish?',
          responseType: 'true_false',
          correctAnswer: 'false',
          points: 2
        },
        {
          examId: exam1.id,
          questionNumber: 5,
          questionText: 'Conjugate the verb "ser" in present tense for all persons.',
          responseType: 'short_answer',
          correctAnswer: 'yo soy, tú eres, él/ella es, nosotros somos, vosotros sois, ellos/ellas son',
          points: 5
        }
      ]);
      
      // Create second exam
      const exam2 = await Exam.create({
        title: 'Conversational Spanish Assessment',
        description: 'Assess students\' ability to engage in everyday conversations.',
        assignedTo: teacher1Model.id,
        createdBy: coordinatorTeacher.id,
        status: 'assigned',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        totalQuestions: 3
      });
      
      // Create questions for second exam
      await ExamQuestion.bulkCreate([
        {
          examId: exam2.id,
          questionNumber: 1,
          questionText: 'Record a 2-minute conversation with a student discussing their hobbies.',
          responseType: 'long_answer',
          points: 15
        },
        {
          examId: exam2.id,
          questionNumber: 2,
          questionText: 'What are three common greetings in Spanish?',
          responseType: 'short_answer',
          correctAnswer: 'Hola, Buenos días, ¿Cómo estás?',
          points: 6
        },
        {
          examId: exam2.id,
          questionNumber: 3,
          questionText: 'Evaluate the student\'s pronunciation of the following words: "desarrollo", "refrigerador", "ferrocarril"',
          responseType: 'long_answer',
          points: 9
        }
      ]);
    }
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seed().then(() => {
    console.log('Seeding completed.');
    process.exit(0);
  }).catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = seed; 