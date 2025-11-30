// Script to schedule periodic APR adjustments
require("dotenv").config();
const { scheduleAdjustments } = require("./adjustAPR");

console.log("Starting APR adjustment scheduler...");
console.log("Press Ctrl+C to stop the scheduler");

// Schedule the APR adjustments
scheduleAdjustments();

// Keep the process running
process.stdin.resume();