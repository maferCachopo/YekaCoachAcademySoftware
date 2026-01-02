const express = require('express');
const router = express.Router();
const { Teacher, User, Student, Class, StudentClass } = require('../models');
const { verifyToken, hasRole } = require('../middleware/auth');
const { Op } = require('sequelize');
const moment = require('moment');

// Get available dates within a date range based on teacher schedules
router.get('/dates', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, studentId, teacherId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Both startDate and endDate parameters are required' });
    }
    
    // Parse dates
    const start = moment(startDate);
    const end = moment(endDate);
    
    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    
    // Limit the date range to avoid excessive processing
    const maxDays = 90; // Maximum 90 days range
    let originalEnd = end.clone();
    if (end.diff(start, 'days') > maxDays) {
      console.log(`Date range too large (${end.diff(start, 'days')} days). Limiting to ${maxDays} days.`);
      end = start.clone().add(maxDays, 'days');
      // We'll continue processing with the limited range instead of returning an error
    }
    
    // Array to store available dates
    const availableDates = [];
    
    // If a specific teacher is requested
    if (teacherId) {
      // Get teacher information
      const teacher = await Teacher.findByPk(teacherId);
      
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }
      
      // Get teacher's work hours and working days
      const workHours = teacher.workHours || {};
      const workingDays = teacher.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      // Loop through each day in the range
      for (let date = start.clone(); date.isSameOrBefore(end); date.add(1, 'day')) {
        const formattedDate = date.format('YYYY-MM-DD');
        const dayOfWeek = date.format('dddd').toLowerCase();
        
        // If teacher doesn't work on this day, skip
        if (!workingDays.includes(dayOfWeek)) {
          continue;
        }
        
        // Get teacher's work hours for this day
        const dayWorkHours = workHours[dayOfWeek] || [];
        
        // If teacher has no work hours set for this day, skip
        if (dayWorkHours.length === 0) {
          continue;
        }
        
        // Find all classes for the teacher on this date
        const bookedClasses = await Class.findAll({
          where: {
            date: formattedDate,
            [Op.or]: [
              { teacherId },
              { '$studentClasses.student.teachers.id$': teacherId } // Classes of teacher's students
            ]
          },
          include: [
            {
              model: StudentClass,
              as: 'studentClasses',
              include: [
                {
                  model: Student,
                  as: 'student',
                  include: [
                    {
                      model: Teacher,
                      as: 'teachers',
                      through: {
                        where: { active: true }
                      }
                    }
                  ]
                }
              ]
            }
          ]
        });
        
        // Convert booked classes to time ranges
        const bookedSlots = bookedClasses.map(cls => {
          return {
            start: cls.startTime,
            end: cls.endTime
          };
        });
        
        // Check if there's any available slot on this day
        let hasAvailableSlot = false;
        
        // Check each work hour block
        for (const workSlot of dayWorkHours) {
          const workStart = moment(workSlot.start, 'HH:mm');
          const workEnd = moment(workSlot.end, 'HH:mm');
          
          // Default class duration is 1 hour (60 minutes)
          const classDuration = 60; // minutes
          
          // Check if there's at least one available slot in this work block
          let currentSlotStart = workStart.clone();
          
          while (currentSlotStart.clone().add(classDuration, 'minutes').isSameOrBefore(workEnd)) {
            const currentSlotEnd = currentSlotStart.clone().add(classDuration, 'minutes');
            
            // Check if this slot overlaps with any booked slots
            const isOverlapping = bookedSlots.some(bookedSlot => {
              const bookedStart = moment(bookedSlot.start, 'HH:mm:ss');
              const bookedEnd = moment(bookedSlot.end, 'HH:mm:ss');
              
              return (
                currentSlotStart.isBefore(bookedEnd) && 
                currentSlotEnd.isAfter(bookedStart)
              );
            });
            
            if (!isOverlapping) {
              // Found an available slot, no need to check further
              hasAvailableSlot = true;
              break;
            }
            
            // Move to next potential slot (with 30-minute intervals)
            currentSlotStart.add(30, 'minutes');
          }
          
          if (hasAvailableSlot) {
            break;
          }
        }
        
        // If there's at least one available slot on this day, add it to the result
        if (hasAvailableSlot) {
          availableDates.push(formattedDate);
        }
      }
    } else {
      // If no specific teacher, check all teachers (or primary teachers if studentId is provided)
      let teachersToCheck = [];
      
      if (studentId) {
        // Get the student's assigned teachers
        const student = await Student.findByPk(studentId, {
          include: [
            {
              model: Teacher,
              as: 'teachers',
              through: {
                where: { active: true }
              }
            }
          ]
        });
        
        if (student && student.teachers && student.teachers.length > 0) {
          teachersToCheck = student.teachers;
        } else {
          // If student has no assigned teachers, get all active teachers
          teachersToCheck = await Teacher.findAll({
            where: { active: true }
          });
        }
      } else {
        // Get all active teachers
        teachersToCheck = await Teacher.findAll({
          where: { active: true }
        });
      }
      
      // Loop through each day in the range
      for (let date = start.clone(); date.isSameOrBefore(end); date.add(1, 'day')) {
        const formattedDate = date.format('YYYY-MM-DD');
        const dayOfWeek = date.format('dddd').toLowerCase();
        
        // Flag to track if any teacher has an available slot on this day
        let anyTeacherHasSlot = false;
        
        // Check each teacher
        for (const teacher of teachersToCheck) {
          // Get teacher's work hours
          const workHours = teacher.workHours || {};
          
          // Get teacher's work hours for this day
          const dayWorkHours = workHours[dayOfWeek] || [];
          
          // If teacher doesn't work on this day, skip
          if (dayWorkHours.length === 0) {
            continue;
          }
          
          // Find all classes for this teacher on this date
          const bookedClasses = await Class.findAll({
            where: {
              date: formattedDate,
              [Op.or]: [
                { teacherId: teacher.id },
                { '$studentClasses.student.teachers.id$': teacher.id } // Classes of teacher's students
              ]
            },
            include: [
              {
                model: StudentClass,
                as: 'studentClasses',
                include: [
                  {
                    model: Student,
                    as: 'student',
                    include: [
                      {
                        model: Teacher,
                        as: 'teachers',
                        through: {
                          where: { active: true }
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          });
          
          // Convert booked classes to time ranges
          const bookedSlots = bookedClasses.map(cls => {
            return {
              start: cls.startTime,
              end: cls.endTime
            };
          });
          
          // Check if there's any available slot for this teacher on this day
          let hasAvailableSlot = false;
          
          // Check each work hour block
          for (const workSlot of dayWorkHours) {
            const workStart = moment(workSlot.start, 'HH:mm');
            const workEnd = moment(workSlot.end, 'HH:mm');
            
            // Default class duration is 1 hour (60 minutes)
            const classDuration = 60; // minutes
            
            // Check if there's at least one available slot in this work block
            let currentSlotStart = workStart.clone();
            
            while (currentSlotStart.clone().add(classDuration, 'minutes').isSameOrBefore(workEnd)) {
              const currentSlotEnd = currentSlotStart.clone().add(classDuration, 'minutes');
              
              // Check if this slot overlaps with any booked slots
              const isOverlapping = bookedSlots.some(bookedSlot => {
                const bookedStart = moment(bookedSlot.start, 'HH:mm:ss');
                const bookedEnd = moment(bookedSlot.end, 'HH:mm:ss');
                
                return (
                  currentSlotStart.isBefore(bookedEnd) && 
                  currentSlotEnd.isAfter(bookedStart)
                );
              });
              
              if (!isOverlapping) {
                // Found an available slot, no need to check further
                hasAvailableSlot = true;
                break;
              }
              
              // Move to next potential slot (with 30-minute intervals)
              currentSlotStart.add(30, 'minutes');
            }
            
            if (hasAvailableSlot) {
              break;
            }
          }
          
          // If this teacher has an available slot, mark the day as available
          if (hasAvailableSlot) {
            anyTeacherHasSlot = true;
            break; // No need to check other teachers
          }
        }
        
        // If any teacher has an available slot on this day, add it to the result
        if (anyTeacherHasSlot) {
          availableDates.push(formattedDate);
        }
      }
    }
    
    res.json({
      startDate,
      endDate,
      availableDates
    });
    
  } catch (error) {
    console.error('Error getting available dates:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;