/**
 * SWF Landing Page API Routes
 * 
 * Handles form submissions and early access registrations
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Directory for storing registrations
const REGISTRATIONS_DIR = path.join(__dirname, '..', 'data');
const REGISTRATIONS_FILE = path.join(REGISTRATIONS_DIR, 'registrations.json');

// Ensure the data directory exists
if (!fs.existsSync(REGISTRATIONS_DIR)) {
  fs.mkdirSync(REGISTRATIONS_DIR, { recursive: true });
}

// Initialize empty registrations file if it doesn't exist
if (!fs.existsSync(REGISTRATIONS_FILE)) {
  fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify([], null, 2));
}

// Load existing registrations
function loadRegistrations() {
  try {
    const data = fs.readFileSync(REGISTRATIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading registrations:', error);
    return [];
  }
}

// Save registrations to file
function saveRegistrations(registrations) {
  try {
    fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(registrations, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving registrations:', error);
    return false;
  }
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// POST route for handling early access registration
router.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, interestLevel, newsletter = false } = req.body;

    // Basic validation
    if (!fullName || !email || !interestLevel) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Load existing registrations
    const registrations = loadRegistrations();

    // Check if email already exists
    const existingUser = registrations.find(reg => reg.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Create new registration
    const newRegistration = {
      id: Date.now().toString(),
      fullName,
      email,
      interestLevel,
      newsletter,
      registrationDate: new Date().toISOString(),
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    // Add to registrations and save
    registrations.push(newRegistration);
    const saved = saveRegistrations(registrations);

    if (!saved) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error saving registration' 
      });
    }

    // Return success
    return res.status(201).json({ 
      success: true, 
      message: 'Registration successful' 
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// GET route for landing page
router.get('/landing', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
});

module.exports = router;