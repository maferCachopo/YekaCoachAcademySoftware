/**
 * Timezone utilities for server-side timezone conversions
 */
const moment = require('moment-timezone');

// Import admin timezone constant - hardcode default if not set in environment
const ADMIN_TIMEZONE = process.env.ADMIN_TIMEZONE || 'America/Caracas';

/**
 * Convert a date and time from admin timezone to user timezone
 * @param {string} dateString - The date string in YYYY-MM-DD format
 * @param {string} timeString - The time string in HH:mm:ss format
 * @param {string} userTimezone - The user's timezone (defaults to UTC if not provided)
 * @returns {Object} - { date: 'YYYY-MM-DD', time: 'HH:mm:ss' } in user's timezone
 */
const convertFromAdminToUserTimezone = (dateString, timeString, userTimezone = 'UTC') => {
  if (!dateString || !timeString) {
    return { date: dateString, time: timeString };
  }

  try {
    // Create a moment object in the admin timezone
    const adminTime = moment.tz(`${dateString}T${timeString}`, ADMIN_TIMEZONE);
    if (!adminTime.isValid()) {
      console.error('Invalid date/time for timezone conversion:', { dateString, timeString, ADMIN_TIMEZONE });
      return { date: dateString, time: timeString };
    }

    // Convert to the user's timezone
    const userTime = adminTime.clone().tz(userTimezone);
    
    // Return formatted date and time
    return {
      date: userTime.format('YYYY-MM-DD'),
      time: userTime.format('HH:mm:ss'),
      dateTime: userTime,
      original: { date: dateString, time: timeString }
    };
  } catch (error) {
    console.error('Error converting time from admin to user timezone:', error);
    return { date: dateString, time: timeString };
  }
};

/**
 * Convert a date and time from user timezone to admin timezone
 * @param {string} dateString - The date string in YYYY-MM-DD format
 * @param {string} timeString - The time string in HH:mm:ss format
 * @param {string} userTimezone - The user's timezone (defaults to UTC if not provided)
 * @returns {Object} - { date: 'YYYY-MM-DD', time: 'HH:mm:ss' } in admin timezone
 */
const convertFromUserToAdminTimezone = (dateString, timeString, userTimezone = 'UTC') => {
  if (!dateString || !timeString) {
    return { date: dateString, time: timeString };
  }

  try {
    // Create a moment object in the user's timezone
    const userTime = moment.tz(`${dateString}T${timeString}`, userTimezone);
    if (!userTime.isValid()) {
      console.error('Invalid date/time for timezone conversion:', { dateString, timeString, userTimezone });
      return { date: dateString, time: timeString };
    }

    // Convert to the admin timezone
    const adminTime = userTime.clone().tz(ADMIN_TIMEZONE);
    
    // Return formatted date and time
    return {
      date: adminTime.format('YYYY-MM-DD'),
      time: adminTime.format('HH:mm:ss'),
      dateTime: adminTime,
      original: { date: dateString, time: timeString }
    };
  } catch (error) {
    console.error('Error converting time from user to admin timezone:', error);
    return { date: dateString, time: timeString };
  }
};

/**
 * Check if a class has ended in the given timezone
 * @param {string} classDate - The class date in YYYY-MM-DD format
 * @param {string} classEndTime - The class end time in HH:mm:ss format
 * @param {string} userTimezone - The timezone to check in (defaults to admin timezone)
 * @returns {boolean} - True if the class has ended in the given timezone
 */
const isClassEnded = (classDate, classEndTime, userTimezone = ADMIN_TIMEZONE) => {
  try {
    // First convert the class end time from admin timezone to the user's timezone
    const classEndAdmin = moment.tz(`${classDate}T${classEndTime}`, ADMIN_TIMEZONE);
    if (!classEndAdmin.isValid()) {
      console.error('Invalid class date/time:', { classDate, classEndTime });
      return false;
    }
    
    const classEndUserTz = classEndAdmin.clone().tz(userTimezone);
    const nowInUserTz = moment().tz(userTimezone);
    
    return nowInUserTz.isAfter(classEndUserTz);
  } catch (error) {
    console.error('Error checking if class has ended:', error);
    return false;
  }
};

/**
 * Get timezone for a user from the database or use default
 * @param {Object} user - User object from database
 * @returns {string} - Timezone string
 */
const getUserTimezone = (user) => {
  if (user && user.timezone) {
    return user.timezone;
  }
  return ADMIN_TIMEZONE;
};

/**
 * Debug timezone comparison
 * @param {string} dateString - The date string in YYYY-MM-DD format
 * @param {string} timeString - The time string in HH:mm:ss format
 * @param {string} timezone - The timezone to check (defaults to admin timezone)
 * @returns {Object} - Debug information
 */
const debugTimezone = (dateString, timeString, timezone = ADMIN_TIMEZONE) => {
  const info = {
    input: { date: dateString, time: timeString, timezone },
    adminTimezone: ADMIN_TIMEZONE,
    currentTimeUTC: moment.utc().format(),
    currentTimeInTimezone: moment().tz(timezone).format(),
    dateTimeInTimezone: moment.tz(`${dateString}T${timeString}`, timezone).format(),
    isValid: moment.tz(`${dateString}T${timeString}`, timezone).isValid()
  };
  
  console.log('Timezone Debug Info:', JSON.stringify(info, null, 2));
  return info;
};

/**
 * Safely convert time from one timezone to another, with fallback to admin timezone
 * @param {string} dateString - The date string in YYYY-MM-DD format
 * @param {string} timeString - The time string in HH:mm:ss format
 * @param {string} fromTimezone - Source timezone
 * @param {string} toTimezone - Target timezone
 * @returns {Object} - { date: 'YYYY-MM-DD', time: 'HH:mm:ss' } in target timezone
 */
const convertTimezoneSafe = (dateString, timeString, fromTimezone = ADMIN_TIMEZONE, toTimezone = 'UTC') => {
  if (!dateString || !timeString) {
    return { date: dateString, time: timeString };
  }

  try {
    // Use admin timezone as fallback if source timezone is invalid
    if (!moment.tz.zone(fromTimezone)) {
      console.warn(`Invalid source timezone: ${fromTimezone}, falling back to admin timezone`);
      fromTimezone = ADMIN_TIMEZONE;
    }

    // Use admin timezone as fallback if target timezone is invalid
    if (!moment.tz.zone(toTimezone)) {
      console.warn(`Invalid target timezone: ${toTimezone}, falling back to admin timezone`);
      toTimezone = ADMIN_TIMEZONE;
    }

    // Create a moment object in the source timezone
    const sourceTime = moment.tz(`${dateString}T${timeString}`, fromTimezone);
    if (!sourceTime.isValid()) {
      console.error('Invalid date/time for timezone conversion:', { dateString, timeString, fromTimezone });
      return { date: dateString, time: timeString };
    }

    // Convert to the target timezone
    const targetTime = sourceTime.clone().tz(toTimezone);
    
    // Return formatted date and time
    return {
      date: targetTime.format('YYYY-MM-DD'),
      time: targetTime.format('HH:mm:ss'),
      dateTime: targetTime,
      original: { date: dateString, time: timeString }
    };
  } catch (error) {
    console.error('Error converting between timezones:', error);
    return { date: dateString, time: timeString };
  }
};

module.exports = {
  ADMIN_TIMEZONE,
  convertFromAdminToUserTimezone,
  convertFromUserToAdminTimezone,
  convertTimezoneSafe,
  isClassEnded,
  getUserTimezone,
  debugTimezone
};