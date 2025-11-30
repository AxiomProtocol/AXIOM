// Registration routes for SWF platform
import express, { Router, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { InsertRegistration } from '../shared/schema';

// Create Express router
const router = Router();

// Create new registration from landing page form
router.post('/api/register-interest', async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      email,
      interestLevel,
      walletAddress,
      country,
      hearAboutUs,
      additionalInfo,
      newsletter,
      termsConditions
    } = req.body;

    // Check if email already exists
    const existingRegistration = await storage.getRegistrationByEmail(email);
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered'
      });
    }

    // Create registration record
    const registrationData: InsertRegistration = {
      name: fullName,
      email,
      investmentInterest: interestLevel,
      walletAddress: walletAddress || null,
      country: country || null,
      hearAboutUs: hearAboutUs || null,
      additionalInfo: additionalInfo || null,
      subscribeToNewsletter: !!newsletter,
      agreeToTerms: !!termsConditions
    };

    const registration = await storage.createRegistration(registrationData);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: registration
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
      error: (error as Error).message
    });
  }
});

// Admin-only routes below
function adminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }
  next();
}

// Get all registrations (admin only)
router.get('/api/admin/registrations', adminAuth, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const registrations = await storage.getAllRegistrations(limit);
    
    return res.json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch registrations',
      error: (error as Error).message
    });
  }
});

// Get specific registration by ID (admin only)
router.get('/api/admin/registrations/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const registration = await storage.getRegistration(id);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    return res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    console.error('Error fetching registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch registration',
      error: (error as Error).message
    });
  }
});

// Update registration status (admin only)
router.patch('/api/admin/registrations/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    // Remove any fields that shouldn't be updated
    delete updates.id;
    delete updates.createdAt;
    
    const updatedRegistration = await storage.updateRegistration(id, updates);
    
    if (!updatedRegistration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Registration updated successfully',
      data: updatedRegistration
    });
  } catch (error) {
    console.error('Error updating registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update registration',
      error: (error as Error).message
    });
  }
});

export default router;