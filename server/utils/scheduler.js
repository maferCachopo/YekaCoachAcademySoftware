const cron = require('node-cron');
const { Op } = require('sequelize');
const db = require('../models');
const { Class, StudentClass, StudentPackage, Student, User } = db;
const logger = require('./logger');
const moment = require('moment-timezone');
const timezoneUtils = require('./timezoneUtils');

// Import admin timezone constant from our utility file
const { ADMIN_TIMEZONE } = timezoneUtils;

// Initialize global array for storing time check logs
global.timeCheckLogs = global.timeCheckLogs || [];

// Log server and timezone information at startup
logger.info('=====================================');
logger.info(`SCHEDULER TIMEZONE SETTINGS:`);
logger.info(`ADMIN_TIMEZONE: ${ADMIN_TIMEZONE}`);
logger.info(`Current time (UTC): ${new Date().toISOString()}`);
logger.info(`Current time (${ADMIN_TIMEZONE}): ${moment().tz(ADMIN_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`);
logger.info('=====================================');


/**
 * Updates the status of classes that have passed their end time
 * Also updates the remaining classes count for student packages
 */
const updateClassStatus = async () => {
  // Create dates in Admin timezone for proper SQL comparison
  const nowInAdminTz = moment().tz(ADMIN_TIMEZONE);
  const today = nowInAdminTz.format('YYYY-MM-DD'); // YYYY-MM-DD in admin timezone
  const currentTime = nowInAdminTz.format('HH:mm:ss'); // HH:MM:SS in admin timezone
  
  logger.info(`Running updateClassStatus at ${moment().toISOString()} with admin timezone time ${nowInAdminTz.format('YYYY-MM-DD HH:mm:ss')} (${ADMIN_TIMEZONE})`)
  
  try {
    // Find all scheduled classes that are in the past
    // Either the date is in the past OR the date is today but the end time has passed
    // Using proper timezone-adjusted date and time for comparison
    logger.info(`SQL query will use date: ${today} and time: ${currentTime} (${ADMIN_TIMEZONE})`);
    
    const completedClasses = await Class.findAll({
      where: {
        status: 'scheduled',
        [Op.or]: [
          // Past date (regardless of time)
          {
            date: {
              [Op.lt]: today
            }
          },
          // Today but end time has passed
          {
            date: today,
            endTime: {
              [Op.lt]: currentTime
            }
          }
        ]
      }
    });
    
    logger.info(`SQL query completed: found ${completedClasses.length} classes that should be marked as completed based on ${ADMIN_TIMEZONE} time`);

          if (completedClasses.length > 0) {
      logger.info(`Found ${completedClasses.length} classes to mark as completed`);
      
      // Update each class and related student records
      for (const classItem of completedClasses) {
        // Mark class as completed - CRITICAL STEP - DO NOT SKIP
        logger.info(`Updating class ${classItem.id} status from '${classItem.status}' to 'completed'`);
        await classItem.update({ status: 'completed' });
        
        // Double-check that the class status was updated properly
        const checkClass = await Class.findByPk(classItem.id);
        logger.info(`Class ${classItem.id} status after update: '${checkClass.status}'`);
        
        // Find all student classes for this class
        const studentClasses = await StudentClass.findAll({
          where: {
            classId: classItem.id,
            status: 'scheduled'
          },
          include: [
            {
              model: StudentPackage,
              as: 'studentPackage'
            }
          ]
        });
        
        // Get mapping of all scheduled classes by package ID for checking future classes
        const packageFutureClassesMap = {};
        
        // For each student with a class, get all their other scheduled classes
        const affectedStudentIds = studentClasses.map(sc => sc.studentId);
        const affectedPackageIds = studentClasses.map(sc => sc.studentPackageId);
        
        // Get all scheduled classes for affected packages
        for (const packageId of affectedPackageIds) {
          const futureClasses = await StudentClass.findAll({
            where: {
              studentPackageId: packageId,
              status: 'scheduled',
              classId: { [Op.ne]: classItem.id } // Exclude the current class
            },
            include: [
              {
                model: Class,
                as: 'classDetail'
              }
            ]
          });
          
          // Count future classes (date is today or later)
          const today = new Date().toISOString().split('T')[0];
          const futureClassesCount = futureClasses.filter(fc => {
            const classDate = fc.classDetail.date;
            return classDate >= today;
          }).length;
          
          packageFutureClassesMap[packageId] = futureClassesCount;
          logger.info(`Package ${packageId} has ${futureClassesCount} future scheduled classes`);
        }
        
        // Update each student class and decrement their remaining classes
        for (const studentClass of studentClasses) {
          try {
            // Use the admin timezone as default
            let userTimezone = ADMIN_TIMEZONE;
            
            // Make a request to the frontend to check for timezone cookie
            try {
              // Attempt to find timezone from a recent request that might have the cookie
              const options = {
                host: 'localhost',
                port: process.env.PORT || 3001,
                path: '/api/ping',
                method: 'GET',
                timeout: 1000,
              };
              
              // Log that we're checking for cookies
              logger.info(`Checking for timezone cookie in recent requests`);
            } catch (cookieError) {
              logger.error('Error checking timezone cookie:', cookieError);
              // Fallback to admin timezone
            }
            
            // Find associated students for this class
            const studentClasses = await StudentClass.findAll({
              where: { classId: classItem.id, status: 'scheduled' },
              include: [{
                model: Student,
                as: 'student',
                include: [{ model: User, as: 'user' }]
              }]
            });
            
            // If no students with timezones found, default to admin timezone
            // Reset userTimezone (reuse the variable defined above)
            userTimezone = ADMIN_TIMEZONE;
            
            // For classes with multiple students, we'll use the earliest timezone
            // (the one where the class ends first)
            if (studentClasses.length > 0) {
              const studentTimezones = studentClasses
                .filter(sc => sc.student && sc.student.user && sc.student.user.timezone)
                .map(sc => sc.student.user.timezone);
              
              if (studentTimezones.length > 0) {
                userTimezone = studentTimezones[0]; // Use first student's timezone
                logger.info(`Using student timezone: ${userTimezone} for class ${classItem.id}`);
              }
            }
            
            // Check if the class has ended in the user's timezone
            const classHasEnded = timezoneUtils.isClassEnded(
              classItem.date, 
              classItem.endTime,
              userTimezone
            );
            
            // Create moment objects with the proper timezones for detailed logging
            const classEndMoment = moment.tz(`${classItem.date} ${classItem.endTime}`, ADMIN_TIMEZONE);
            const classEndUserMoment = classEndMoment.clone().tz(userTimezone);
            const nowMoment = moment().tz(ADMIN_TIMEZONE);
            const nowUserMoment = moment().tz(userTimezone);
            
            // Format times for detailed logging
            const classEndFormatted = classEndMoment.format('YYYY-MM-DD HH:mm:ss');
            const classEndUserFormatted = classEndUserMoment.format('YYYY-MM-DD HH:mm:ss');
            const nowFormatted = nowMoment.format('YYYY-MM-DD HH:mm:ss');
            const nowUserFormatted = nowUserMoment.format('YYYY-MM-DD HH:mm:ss');
            const diffMinutes = nowUserMoment.diff(classEndUserMoment, 'minutes');
            
            logger.info(`================ CLASS STATUS CHECK ================`);
            logger.info(`CLASS ID: ${classItem.id}`);
            logger.info(`CLASS DATE: ${classItem.date}`);
            logger.info(`CLASS END TIME: ${classItem.endTime}`);
            logger.info(`ADMIN TIMEZONE: ${ADMIN_TIMEZONE}, USER TIMEZONE: ${userTimezone}`);
            logger.info(`CLASS END DATETIME (ADMIN): ${classEndFormatted}`);
            logger.info(`CLASS END DATETIME (USER): ${classEndUserFormatted}`);
            logger.info(`CURRENT DATETIME (ADMIN): ${nowFormatted}`);
            logger.info(`CURRENT DATETIME (USER): ${nowUserFormatted}`);
            logger.info(`COMPARISON: Current time is ${diffMinutes} minutes ${diffMinutes >= 0 ? 'after' : 'before'} class end time in user timezone`);
            logger.info(`TIME COMPARISON RESULT: ${classHasEnded ? 'Class has ended' : 'Class has NOT ended yet'} in user timezone`);
            
            // Add this detailed info to a global log that can be accessed via API
            global.timeCheckLogs = global.timeCheckLogs || [];
            global.timeCheckLogs.push({
              checkTime: new Date().toISOString(),
              classId: classItem.id,
              classDate: classItem.date,
              classEndTime: classItem.endTime,
              classEndDatetimeAdmin: classEndFormatted,
              classEndDatetimeUser: classEndUserFormatted,
              currentDatetimeAdmin: nowFormatted,
              currentDatetimeUser: nowUserFormatted,
              adminTimezone: ADMIN_TIMEZONE,
              userTimezone: userTimezone,
              diffMinutes: diffMinutes,
              hasEnded: classHasEnded
            });
            // Keep only the last 20 logs
            if (global.timeCheckLogs.length > 20) {
              global.timeCheckLogs = global.timeCheckLogs.slice(-20);
            }
            
            // Only mark as attended if the class has truly ended in the user's timezone
            if (classHasEnded) {
              logger.info(`Class ${classItem.id} has ended, marking as attended`);
              await studentClass.update({ 
                status: 'attended' 
              });
            } else {
              logger.info(`Class ${classItem.id} hasn't ended yet, keeping as scheduled`);
              // Skip this class since it hasn't actually ended
              continue;
            }
          } catch (error) {
            logger.error(`Error processing class ${classItem.id} for student ${studentClass.studentId}:`, error);
            continue;
          }
          
          // Update student package remaining classes count
          if (studentClass.studentPackage) {
            const remainingClasses = Math.max(0, studentClass.studentPackage.remainingClasses - 1);
            const packageId = studentClass.studentPackageId;
            const futureScheduledClassesCount = packageFutureClassesMap[packageId] || 0;
            
            logger.info(`Updated package ${packageId} remaining classes to ${remainingClasses}, with ${futureScheduledClassesCount} future scheduled classes`);
            
            // Update remaining classes to equal the number of scheduled future classes
            await studentClass.studentPackage.update({ 
              remainingClasses: futureScheduledClassesCount
            });
            
            // Only mark package as completed if no future scheduled classes
            if (futureScheduledClassesCount === 0) {
              logger.info(`Marking package ${packageId} as completed - no future scheduled classes`);
              await studentClass.studentPackage.update({ status: 'completed' });
            } else {
              // If there are still scheduled classes, ensure package stays active
              logger.info(`Keeping package ${packageId} active with ${futureScheduledClassesCount} future scheduled classes`);
              await studentClass.studentPackage.update({ 
                status: 'active'  // Ensure package stays active
              });
            }
          }
        }
      }
      
      logger.info(`Successfully updated ${completedClasses.length} classes to 'completed' status`);
    }
  } catch (error) {
    logger.error('Error updating class status:', error);
  }
};

/**
 * Manual function to update past classes for a single student
 * This can be called from the student profile to force an update
 */
const updateStudentClassStatus = async (studentId) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  try {
    // Find all student classes that are scheduled but in the past
    const studentClasses = await StudentClass.findAll({
      where: {
        studentId,
        status: 'scheduled'
      },
      include: [
        {
          model: Class,
          as: 'classDetail',
          where: {
            date: {
              [Op.lt]: today
            }
          }
        },
        {
          model: StudentPackage,
          as: 'studentPackage'
        }
      ]
    });
    
    if (studentClasses.length > 0) {
      logger.info(`Found ${studentClasses.length} past classes to update for student ${studentId}`);
      
      // Get all student classes to check for remaining scheduled classes
      const allStudentClasses = await StudentClass.findAll({
        where: {
          studentId,
          status: 'scheduled'
        },
        include: [
          {
            model: Class,
            as: 'classDetail'
          }
        ]
      });
      
      // Group all classes by package ID to properly update each package
      const classesByPackage = {};
      allStudentClasses.forEach(cls => {
        if (!classesByPackage[cls.studentPackageId]) {
          classesByPackage[cls.studentPackageId] = [];
        }
        classesByPackage[cls.studentPackageId].push(cls);
      });
      
      logger.info(`Student ${studentId} has scheduled classes: ${JSON.stringify(Object.keys(classesByPackage).map(packageId => ({ 
        packageId, 
        count: classesByPackage[packageId].length 
      })))}`);
      
      for (const studentClass of studentClasses) {
        // Mark the class as completed
        await studentClass.classDetail.update({ status: 'completed' });
        
        try {
          // Get student user info to determine timezone
          let studentTimezone = ADMIN_TIMEZONE;
          
          // Check if we have a student with user info to get timezone
          if (studentClass.student && studentClass.student.user && studentClass.student.user.timezone) {
            studentTimezone = studentClass.student.user.timezone;
            logger.info(`Found user timezone for student ${studentClass.studentId}: ${studentTimezone}`);
          } else {
            // Try to fetch student with user info
            const studentWithUser = await Student.findOne({
              where: { id: studentClass.studentId },
              include: [{ model: User, as: 'user' }]
            });
            
            if (studentWithUser && studentWithUser.user && studentWithUser.user.timezone) {
              studentTimezone = studentWithUser.user.timezone;
              logger.info(`Found user timezone for student ${studentClass.studentId}: ${studentTimezone}`);
            }
          }
          
          // Check if the class has ended in the user's timezone
          const classHasEnded = timezoneUtils.isClassEnded(
            studentClass.classDetail.date, 
            studentClass.classDetail.endTime,
            studentTimezone
          );
          
          // Create moment objects with the proper timezones for logging
          const classEndMoment = moment.tz(`${studentClass.classDetail.date} ${studentClass.classDetail.endTime}`, ADMIN_TIMEZONE);
          const classEndUserMoment = classEndMoment.clone().tz(studentTimezone);
          const nowUserMoment = moment().tz(studentTimezone);
          
          logger.info(`Checking class ${studentClass.classId} - End time (admin): ${classEndMoment.format()} (${ADMIN_TIMEZONE}), End time (user): ${classEndUserMoment.format()} (${studentTimezone}), Current user time: ${nowUserMoment.format()} (${studentTimezone})`);
          logger.info(`Time difference in user timezone: ${nowUserMoment.diff(classEndUserMoment, 'minutes')} minutes`);
          
          // Only mark as attended if the class has truly ended in the user's timezone
          if (classHasEnded) {
            logger.info(`Class ${studentClass.classId} has ended, marking as attended`);
            await studentClass.update({ status: 'attended' });
          } else {
            logger.info(`Class ${studentClass.classId} hasn't ended yet, keeping as scheduled`);
            continue;
          }
        } catch (error) {
          logger.error(`Error processing class ${studentClass.classId} for student ${studentClass.studentId}:`, error);
          continue;
        }
        
        // Update student package remaining classes count
        if (studentClass.studentPackage) {
          // Get the original package to know the total classes
          const packageInfo = await studentClass.studentPackage.getPackage();
          const totalPackageClasses = packageInfo.totalClasses;
          
          // Count all classes for this package (both scheduled and attended)
          const scheduledClassesCount = await StudentClass.count({
            where: {
              studentId,
              studentPackageId: studentClass.studentPackageId,
              status: 'scheduled'
            }
          });
          
          const attendedClassesCount = await StudentClass.count({
            where: {
              studentId,
              studentPackageId: studentClass.studentPackageId,
              status: 'attended'
            }
          });
          
          // Calculate the correct remaining classes
          const usedClasses = scheduledClassesCount + attendedClassesCount;
          const remainingClasses = Math.max(0, totalPackageClasses - usedClasses);
          
          logger.info(`Updated package ${studentClass.studentPackageId} remaining classes calculation:`, {
            totalPackageClasses,
            scheduledClassesCount, 
            attendedClassesCount,
            usedClasses,
            remainingClasses
          });
          
          // Update remaining classes
          await studentClass.studentPackage.update({ 
            remainingClasses: scheduledClassesCount 
          });
          
          logger.info(`Updated package ${studentClass.studentPackageId} remaining classes to ${scheduledClassesCount}`);
          
          // Only mark package as completed if no future scheduled classes
          const futureScheduledClassesCount = classesByPackage[studentClass.studentPackageId]?.filter(cls => {
            const classDate = new Date(cls.classDetail.date);
            return classDate >= now && cls.id !== studentClass.id;
          }).length || 0;
          
          logger.info(`Package ${studentClass.studentPackageId} has ${futureScheduledClassesCount} future scheduled classes`);
          
          if (remainingClasses === 0 && futureScheduledClassesCount === 0) {
            logger.info(`Marking package ${studentClass.studentPackageId} as completed - no classes left and no future scheduled classes`);
            await studentClass.studentPackage.update({ status: 'completed' });
          } else if (futureScheduledClassesCount > 0 && remainingClasses === 0) {
            // If there are still scheduled classes but remainingClasses is 0, update it to match scheduled count
            logger.info(`Updating package ${studentClass.studentPackageId} remaining classes to match scheduled count ${futureScheduledClassesCount}`);
            await studentClass.studentPackage.update({ 
              remainingClasses: futureScheduledClassesCount,
              status: 'active'  // Ensure package stays active
            });
          }
        }
      }
      
      return studentClasses.length;
    }
    
    return 0;
  } catch (error) {
    logger.error(`Error updating class status for student ${studentId}:`, error);
    throw error;
  }
};

/**
 * Schedule jobs to run at specific intervals
 */
const initScheduler = () => {
  // Run every hour to update class status
  cron.schedule('0 * * * *', async () => {
    logger.info('Running scheduled job: Update class status');
    await updateClassStatus();
  });
  
  // Also run the update immediately on server start
  updateClassStatus();
};

module.exports = {
  initScheduler,
  updateClassStatus, // Export for manual running or testing
  updateStudentClassStatus // Export for updating a specific student's classes
}; 