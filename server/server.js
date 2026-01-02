const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
require('dotenv').config();

// Determine environment - make this more robust
console.log('Starting server with NODE_ENV:', process.env.NODE_ENV);
const dev = process.env.NODE_ENV !== 'production';
const disableCompilation = process.env.NEXT_DISABLE_COMPILATION === 'true';

// Log startup information
console.log('Environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- NEXT_DISABLE_COMPILATION:', process.env.NEXT_DISABLE_COMPILATION);
console.log('- Development mode:', dev);
console.log('- Running on Replit:', process.env.REPL_ID ? 'Yes' : 'No');

if (disableCompilation && !dev) {
  console.log('Running in strict production mode - on-demand compilation disabled');
}

const nextApp = next({ 
  dev, 
  dir: path.join(__dirname, '..'),
  // Explicitly set production mode if NODE_ENV is production
  conf: {
    distDir: '.next',
    productionBrowserSourceMaps: false
  }
});

const handle = nextApp.getRequestHandler();

// Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const packageRoutes = require('./routes/packages');
const classRoutes = require('./routes/classes');
const adminRoutes = require('./routes/admin');
const rescheduleRoutes = require('./routes/reschedules');
const teacherRoutes = require('./routes/teachers');
const coordinatorRoutes = require('./routes/coordinator');
const availabilityRoutes = require('./routes/availability');

// Database connection
const db = require('./models');

// Import utilities
const logger = require('./utils/logger');
const { initScheduler } = require('./utils/scheduler');

// Set port - for Replit, we need to use process.env.PORT (usually 3000)
const PORT = process.env.PORT || 3001;

// Prepare Next.js then start the server
nextApp.prepare().then(() => {
  // Initialize express app
  const app = express();

  // Middleware
  app.use(cors({
    origin: dev ? ['http://localhost:3000'] : true,
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/packages', packageRoutes);
  app.use('/api/classes', classRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reschedules', rescheduleRoutes);
  app.use('/api/teachers', teacherRoutes);
  app.use('/api/coordinator', coordinatorRoutes);
  app.use('/api/availability', availabilityRoutes);

  // Add a simple ping/health route for server checks
  app.get('/api/ping', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      dev: dev
    });
  });

  // Add a test endpoint that's easy to check from mobile
  app.get('/api/mobiletest', (req, res) => {
    res.status(200).json({ 
      status: 'success', 
      message: 'Mobile connection successful!',
      clientIp: req.ip || req.connection.remoteAddress,
      time: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      dev: dev
    });
  });

  // Production-specific handling for Next.js routes
  if (!dev) {
    // In production, serve pre-rendered pages without compiling
    logger.info('Running in production mode - using pre-built Next.js pages only');
    
    // Special handling if on-demand compilation is disabled
    if (disableCompilation) {
      logger.info('On-demand compilation is DISABLED - only pre-built pages will be served');
      
      // Cache lookup of known pre-built pages
      const preBuiltPages = new Set();
      
      // Add middleware to check for 404s for non-prebuilt pages
      app.use((req, res, next) => {
        // Skip for API routes and static assets
        if (req.url.startsWith('/api/') || req.url.startsWith('/_next/')) {
          return next();
        }
        
        // Only check for HTML page requests
        const parsedUrl = parse(req.url, true);
        
        // If we know this page was prebuilt, continue
        if (preBuiltPages.has(parsedUrl.pathname)) {
          return next();
        }
        
        // For unknown pages, try to serve them using Next.js
        // If they haven't been pre-built, Next.js would typically compile them
        // But with our settings, it will return 404 if not found
        next();
      });
    }
    
    // Handle all non-API routes with Next.js
    app.all('*', (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        return handle(req, res, parsedUrl);
      } catch (error) {
        logger.error(`Error handling request for ${req.url}:`, error);
        return res.status(500).send('Internal Server Error');
      }
    });
  } else {
    // In development, let Next.js handle dynamic compilation
    logger.info('Running in development mode - pages will be compiled on-demand');
    app.all('*', (req, res) => {
      const parsedUrl = parse(req.url, true);
      return handle(req, res, parsedUrl);
    });
  }

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
  });

  // Sync database and start server
  db.sequelize.sync({ force: false }).then(async () => {
    // The birthDate column is now part of the model, so we don't need to run the migration anymore
    
    // Run migrations manually
    try {
      const { Umzug, SequelizeStorage } = require('umzug');
      const path = require('path');
      
      const umzug = new Umzug({
        migrations: { glob: path.join(__dirname, './migrations/*.js') },
        context: db.sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize: db.sequelize }),
        logger: console,
      });
      
      // Run pending migrations
      const pending = await umzug.pending();
      if (pending.length > 0) {
        logger.info(`Running ${pending.length} pending migrations...`);
        await umzug.up();
        logger.info('Migrations completed successfully');
      } else {
        logger.info('No pending migrations to run');
      }
    } catch (error) {
      logger.error('Error running migrations:', error);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Combined server running on port ${PORT}`);
      logger.info(`Server is available on your local network`);
      logger.info(`Production mode: ${!dev}, On-demand compilation disabled: ${disableCompilation}`);
      
      // Initialize the scheduler
      initScheduler();
    });
  }).catch(err => {
    logger.error('Unable to connect to the database:', err);
  });
});

// Export for testing
module.exports = nextApp; 