/**
 * Deployment script for YekaCouch Academy
 * This script runs database migrations in production environment
 * 
 * Usage:
 * node scripts/deploy.js
 */

require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

// Set environment to production
process.env.NODE_ENV = 'production';

console.log('Starting deployment process...');
console.log('Environment:', process.env.NODE_ENV);

// Function to execute shell commands
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command}`);
    
    exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        return reject(error);
      }
      
      if (stderr) {
        console.log(`Command stderr: ${stderr}`);
      }
      
      console.log(`Command stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Main deployment function
async function deploy() {
  try {
    // Check migration status
    console.log('Checking migration status...');
    await runCommand('npx sequelize-cli db:migrate:status');
    
    // Run migrations
    console.log('Running database migrations...');
    await runCommand('npx sequelize-cli db:migrate');
    
    console.log('Deployment completed successfully!');
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
deploy(); 