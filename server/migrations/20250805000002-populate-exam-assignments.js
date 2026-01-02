'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all exams with assignedTo value
    const exams = await queryInterface.sequelize.query(
      'SELECT id, assignedTo, status, reviewNotes, reviewedAt, updatedAt FROM "Exams" WHERE assignedTo IS NOT NULL',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Create ExamAssignment for each exam
    if (exams.length > 0) {
      const assignments = exams.map(exam => ({
        examId: exam.id,
        teacherId: exam.assignedTo,
        status: exam.status,
        reviewNotes: exam.reviewNotes,
        reviewedAt: exam.reviewedAt,
        completedAt: exam.status === 'completed' || exam.status === 'approved' || exam.status === 'rejected' ? exam.updatedAt : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await queryInterface.bulkInsert('ExamAssignments', assignments);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Delete ExamAssignments that were created from this migration
    // This is a bit tricky since we don't know which ones were created by this migration
    // So we'll delete all and rely on the down migration of the create-exam-assignments file
    // to drop the entire table if needed
    await queryInterface.bulkDelete('ExamAssignments', null, {});
  }
}; 