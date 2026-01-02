import { fetchWithAuth } from './api';

/**
 * API functions for teacher management
 */
export const teacherAPI = {
  /**
   * Get all teachers
   * @returns {Promise<Array>} List of teachers
   */
  getAllTeachers: async () => {
    try {
      return await fetchWithAuth('/teachers');
    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
  },
  
  /**
   * Get a teacher by ID
   * @param {number} id - The teacher ID
   * @returns {Promise<Object>} Teacher data
   */
  getTeacherById: async (id) => {
    try {
      return await fetchWithAuth(`/teachers/${id}`);
    } catch (error) {
      console.error('Error fetching teacher:', error);
      throw error;
    }
  },
  
  /**
   * Create a new teacher
   * @param {Object} teacherData - The teacher data
   * @returns {Promise<Object>} Created teacher
   */
  createTeacher: async (teacherData) => {
    try {
      return await fetchWithAuth('/teachers', {
        method: 'POST',
        body: JSON.stringify(teacherData),
      });
    } catch (error) {
      console.error('Error creating teacher:', error);
      throw error;
    }
  },
  
  /**
   * Update a teacher
   * @param {number} id - The teacher ID
   * @param {Object} teacherData - The updated teacher data
   * @returns {Promise<Object>} Updated teacher
   */
  updateTeacher: async (id, teacherData) => {
    try {
      return await fetchWithAuth(`/teachers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(teacherData),
      });
    } catch (error) {
      console.error('Error updating teacher:', error);
      throw error;
    }
  },
  
  /**
   * Delete a teacher (soft delete)
   * @param {number} id - The teacher ID
   * @returns {Promise<Object>} Response message
   */
  deleteTeacher: async (id) => {
    try {
      return await fetchWithAuth(`/teachers/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting teacher:', error);
      throw error;
    }
  },
  
  /**
   * Reset a teacher's password
   * @param {number} id - The teacher ID
   * @param {string} password - The new password
   * @returns {Promise<Object>} Response message
   */
  resetPassword: async (id, password) => {
    try {
      return await fetchWithAuth(`/teachers/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
    } catch (error) {
      console.error('Error resetting teacher password:', error);
      throw error;
    }
  },
  
  /**
   * Update a teacher's schedule
   * @param {number} id - The teacher ID
   * @param {Object} scheduleData - The schedule data
   * @returns {Promise<Object>} Updated schedule
   */
  updateSchedule: async (id, scheduleData) => {
    try {
      return await fetchWithAuth(`/teachers/${id}/schedule`, {
        method: 'PUT',
        body: JSON.stringify(scheduleData),
      });
    } catch (error) {
      console.error('Error updating teacher schedule:', error);
      throw error;
    }
  },
};

export default teacherAPI;