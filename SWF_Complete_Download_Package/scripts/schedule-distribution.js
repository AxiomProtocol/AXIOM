/**
 * SWF Distribution Scheduler
 * 
 * This script can be used to set up a recurring distribution using a cron job.
 * 
 * Usage:
 * 1. Make sure your server has node.js and cron installed
 * 2. Install required packages: npm install node-cron
 * 3. Run this script: node scripts/schedule-distribution.js
 * 
 * The script will run the distribution weekly (every Sunday at 00:00 UTC)
 * You can modify the cron pattern to change the frequency
 */

const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the project root
const projectRoot = path.resolve(__dirname, '..');

// Create logs directory if it doesn't exist
const logsDir = path.join(projectRoot, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file for cron job
const logFile = path.join(logsDir, 'distribution-cron.log');

// Cron pattern: "0 0 * * 0" means every Sunday at 00:00
// For testing, you can use "* * * * *" which runs every minute
const cronPattern = '0 0 * * 0'; // Weekly on Sunday at midnight

console.log('Starting SWF distribution scheduler...');
console.log(`Distributions will run according to schedule: ${cronPattern}`);
console.log(`Logs will be saved to: ${logFile}`);

// Schedule the distribution task
cron.schedule(cronPattern, () => {
  const timestamp = new Date().toISOString();
  const distributionCommand = `cd ${projectRoot} && npx hardhat run scripts/distribute.js --network polygon`;
  
  console.log(`[${timestamp}] Running scheduled distribution...`);
  
  // Execute the distribution script
  exec(distributionCommand, (error, stdout, stderr) => {
    const logEntry = `
----------------------------------------
DISTRIBUTION RUN: ${timestamp}
----------------------------------------
${stdout}
${stderr ? `ERROR: ${stderr}` : ''}
${error ? `EXECUTION ERROR: ${error.message}` : ''}
----------------------------------------

`;
    
    // Append to log file
    fs.appendFileSync(logFile, logEntry);
    
    if (error) {
      console.error(`[${timestamp}] Distribution failed with error: ${error.message}`);
    } else {
      console.log(`[${timestamp}] Distribution completed successfully`);
    }
  });
});

console.log('Scheduler is running. Keep this process alive to maintain scheduled distributions.');
console.log('Press Ctrl+C to stop the scheduler.');

// For production, use a process manager like PM2 to keep the script running:
// pm2 start scripts/schedule-distribution.js --name "swf-distribution"