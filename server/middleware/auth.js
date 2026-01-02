const jwt = require('jsonwebtoken');
const { User, Student, Teacher, TeacherStudent } = require('../models');

// Middleware to verify JWT token
exports.verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided, access denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user - without eager loading the Student association
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token, user not found' });
    }
    
    // Add user to request
    req.user = user;
    
    // Also add studentId from token if it exists
    if (decoded.studentId) {
      req.user.studentId = decoded.studentId;
    }
    
    // If user has a student role but no studentId in token, try to get it from the database
    if (user.role === 'student' && !req.user.studentId) {
      try {
        const student = await Student.findOne({ where: { userId: user.id } });
        if (student) {
          req.user.studentId = student.id;
          console.log('DEBUG - Added studentId from database lookup:', student.id);
        }
      } catch (err) {
        console.error('Error finding student record:', err);
      }
    }
    
    // If user has a teacher role, try to get teacherId
    if (user.role === 'teacher' && !req.user.teacherId) {
      try {
        const teacher = await Teacher.findOne({ where: { userId: user.id } });
        if (teacher) {
          req.user.teacherId = teacher.id;
          console.log('DEBUG - Added teacherId from database lookup:', teacher.id);
        }
      } catch (err) {
        console.error('Error finding teacher record:', err);
      }
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to verify admin role
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied, admin privileges required' });
  }
  next();
};

// Middleware to verify student role
exports.isStudent = (req, res, next) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied, student privileges required' });
  }
  next();
};

// Middleware to check if a teacher is assigned to a student
exports.isTeacherForStudent = async (req, res, next) => {
  try {
    // If user is admin or coordinator, allow access
    if (req.user.role === 'admin' || req.user.role === 'coordinator') {
      return next();
    }
    
    // If user is not a teacher, deny access
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied, teacher privileges required' });
    }
    
    // Get teacherId if not already in req.user
    if (!req.user.teacherId) {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!teacher) {
        return res.status(403).json({ message: 'Teacher profile not found' });
      }
      req.user.teacherId = teacher.id;
    }
    
    // Get the studentId from the request params
    const studentId = req.params.id || req.params.studentId;
    
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }
    
    // Check if the teacher is assigned to this student
    const assignment = await TeacherStudent.findOne({
      where: {
        teacherId: req.user.teacherId,
        studentId: studentId,
        active: true
      }
    });
    
    if (!assignment) {
      return res.status(403).json({ message: 'Access denied, you are not assigned to this student' });
    }
    
    // Add studentId to request for convenience
    req.studentId = studentId;
    
    next();
  } catch (error) {
    console.error('isTeacherForStudent middleware error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Middleware to verify self or admin
exports.isSelfOrAdmin = async (req, res, next) => {
  console.log('DEBUG - isSelfOrAdmin middleware check:', {
    userRole: req.user.role,
    userId: req.user.id,
    userStudentId: req.user.studentId,
    userTeacherId: req.user.teacherId,
    requestedId: req.params.id,
    requestedStudentId: req.params.studentId,
    path: req.path,
    baseUrl: req.baseUrl
  });
  
  // Admin can access all data
  if (req.user.role === 'admin') {
    console.log('DEBUG - Access granted: user is admin');
    return next();
  }
  
  // Teachers can access their assigned students' data
  if (req.user.role === 'teacher') {
    // Get teacherId if not already in req.user
    if (!req.user.teacherId) {
      try {
        const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
        if (teacher) {
          req.user.teacherId = teacher.id;
          console.log(`DEBUG - Found and set teacherId from database lookup: ${req.user.teacherId}`);
        } else {
          console.log('DEBUG - No teacher profile found for this user');
          return res.status(403).json({ message: 'Teacher profile not found' });
        }
      } catch (err) {
        console.error('Error finding teacher ID for user:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
      }
    }
    
    // If accessing teacher's own data
    if (req.baseUrl.includes('/api/teachers') && req.params.id === req.user.teacherId.toString()) {
      console.log('DEBUG - Access granted: teacher accessing own data');
      return next();
    }
    
    // If accessing student data, check if teacher is assigned to this student
    if (req.baseUrl.includes('/api/students') && req.params.id) {
      try {
        const assignment = await TeacherStudent.findOne({
          where: {
            teacherId: req.user.teacherId,
            studentId: req.params.id,
            active: true
          }
        });
        
        if (assignment) {
          console.log('DEBUG - Access granted: teacher is assigned to this student');
          return next();
        }
      } catch (err) {
        console.error('Error checking teacher-student assignment:', err);
      }
    }
  }
  
  // Students can only access their own data
  if (req.user.role === 'student') {
    // First check if we can find a student ID associated with the user
    // if we don't already have it in req.user.studentId
    if (!req.user.studentId && req.user.student) {
      req.user.studentId = req.user.student.id;
      console.log(`DEBUG - Setting studentId from user.student: ${req.user.studentId}`);
    }
    
    if (!req.user.studentId) {
      try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (student) {
          req.user.studentId = student.id;
          console.log(`DEBUG - Found and set studentId from database lookup: ${req.user.studentId}`);
        }
      } catch (err) {
        console.error('Error finding student ID for user:', err);
      }
    }
    
    // Check if req.params.id exists (user is trying to access a specific resource)
    if (req.params.id) {
      // For user resources
      if (req.params.id === req.user.id.toString()) {
        console.log('DEBUG - Access granted: user ID match');
        return next();
      }
      
      // For student resources, check if ID matches user's studentId
      if (req.user.studentId && req.params.id === req.user.studentId.toString()) {
        console.log('DEBUG - Access granted: student ID from user matches requested ID');
        return next();
      }
      
      // For student resources, we need to check if the student belongs to the user
      if (req.baseUrl.includes('/api/students')) {
        const student = await Student.findOne({
          where: { id: req.params.id, userId: req.user.id }
        });
        
        if (student) {
          console.log('DEBUG - Access granted: student record found for user');
          return next();
        }
      }
    }
    
    // Also check for studentId parameter which is used in some routes
    if (req.params.studentId) {
      console.log('DEBUG - Checking studentId parameter:', req.params.studentId);
      
      // Check if studentId matches user's studentId
      if (req.user.studentId && req.params.studentId === req.user.studentId.toString()) {
        console.log('DEBUG - Access granted: studentId parameter matches user studentId');
        return next();
      }
      
      // Also check database relation
      const student = await Student.findOne({
        where: { id: req.params.studentId, userId: req.user.id }
      });
      
      if (student) {
        console.log('DEBUG - Access granted: student record found for studentId parameter');
        return next();
      }
    }
  }
  
  console.log('DEBUG - Access denied: user can only access their own resources');
  return res.status(403).json({ message: 'Access denied, you can only access your own resources' });
};

// Role-based authorization middleware
exports.hasRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No user found, authentication required' });
    }

    if (!Array.isArray(allowedRoles)) {
      allowedRoles = [allowedRoles];
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied, required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}; 

// Middleware to verify teacher role
exports.isTeacher = (req, res, next) => {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Access denied, teacher privileges required' });
  }
  next();
};

// Middleware to verify coordinator role
exports.isCoordinator = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No user found, authentication required' });
  }
  
  // If user role is coordinator, allow access
  if (req.user.role === 'coordinator') {
    return next();
  }
  
  // If user is a teacher, check if they have coordinator flag
  if (req.user.role === 'teacher') {
    try {
      const { Teacher } = require('../models');
      const teacher = await Teacher.findOne({ 
        where: { 
          userId: req.user.id,
          isCoordinator: true
        } 
      });
      
      if (teacher) {
        // Add teacherId to request for convenience if not already there
        if (!req.user.teacherId) {
          req.user.teacherId = teacher.id;
        }
        return next();
      }
    } catch (error) {
      console.error('isCoordinator middleware error:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
  
  return res.status(403).json({ message: 'Access denied, coordinator privileges required' });
};

// Middleware to verify if user is teacher or coordinator
exports.isTeacherOrCoordinator = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No user found, authentication required' });
  }
  
  // If user is admin, coordinator, or teacher, allow access
  if (req.user.role === 'admin' || req.user.role === 'coordinator' || req.user.role === 'teacher') {
    // If user is teacher, make sure teacherId is set
    if (req.user.role === 'teacher' && !req.user.teacherId) {
      try {
        const { Teacher } = require('../models');
        const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
        if (teacher) {
          req.user.teacherId = teacher.id;
          // Check if teacher has coordinator flag and add it to the request
          if (teacher.isCoordinator) {
            req.user.isCoordinator = true;
          }
        }
      } catch (error) {
        console.error('isTeacherOrCoordinator middleware error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
      }
    }
    return next();
  }
  
  return res.status(403).json({ message: 'Access denied, teacher or coordinator privileges required' });
}; 