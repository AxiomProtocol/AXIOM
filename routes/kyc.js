/**
 * KYC (Know Your Customer) API Routes
 * Comprehensive verification system with security, compliance, and audit trails
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('@neondatabase/serverless');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Import authentication middleware
const { authenticateToken, requireRole, createUserRateLimit, auditLog } = require('../middleware/auth');

// Import secure object storage service  
const { ObjectStorageService } = require('../server/objectStorage');
const { createKYCDocumentAclPolicy, setObjectAclPolicy } = require('../server/objectAcl');

// Database connection
let pool = null;

async function initializeKYCDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  // Test connection
  await pool.query('SELECT 1');
  console.log('✅ KYC Database connected successfully');
}

// Initialize database connection
initializeKYCDatabase().catch(console.error);

// SECURITY: Rate limiting for KYC endpoints
const kycLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 KYC requests per windowMs
  message: { error: 'Too many KYC requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SECURITY: Stricter rate limiting for document uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: { error: 'Too many upload attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SECURITY: Per-user rate limiting for KYC operations
const kycUserLimiter = createUserRateLimit(
  15 * 60 * 1000, // 15 minutes
  10 // Max 10 KYC operations per user per 15 minutes
);

// SECURITY: Per-user document upload limiting
const documentUserLimiter = createUserRateLimit(
  60 * 60 * 1000, // 1 hour
  5 // Max 5 document uploads per user per hour
);

// Apply rate limiting to all KYC routes
router.use(kycLimiter);

// SECURITY: Configure secure file upload with validation
const storage = multer.memoryStorage(); // Use memory storage for security screening

const fileFilter = (req, file, cb) => {
  // Allowed file types for KYC documents
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Single file per request
  },
  fileFilter: fileFilter
});

// Validation helpers
function validatePersonalInfo(data) {
  const errors = [];
  
  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.push('First name must be at least 2 characters long');
  }
  
  if (!data.lastName || data.lastName.trim().length < 2) {
    errors.push('Last name must be at least 2 characters long');
  }
  
  if (!data.dateOfBirth) {
    errors.push('Date of birth is required');
  } else {
    const birthDate = new Date(data.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      errors.push('You must be at least 18 years old to proceed');
    }
  }
  
  if (!data.nationality || data.nationality.trim().length < 2) {
    errors.push('Nationality is required');
  }
  
  if (!data.address || data.address.trim().length < 10) {
    errors.push('Complete address is required');
  }
  
  if (!data.phoneNumber || !/^\+?[\d\s\-\(\)]{10,}$/.test(data.phoneNumber)) {
    errors.push('Valid phone number is required');
  }
  
  return errors;
}

// Audit logging function
async function logKYCAudit(kycId, action, actionBy, targetType, targetId, oldValues, newValues, reason, ipAddress, userAgent) {
  try {
    await pool.query(`
      INSERT INTO kyc_audit_logs (
        kyc_id, action, action_by, target_type, target_id, 
        old_values, new_values, changes_summary, reason,
        ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `, [
      kycId, action, actionBy, targetType, targetId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      `${action} action performed on ${targetType}`,
      reason,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('Failed to log KYC audit:', error);
  }
}

// ENDPOINT 1: POST /api/kyc/submit - Submit KYC verification data
router.post('/submit', authenticateToken, kycUserLimiter, auditLog('kyc_submit', 'verification'), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      dateOfBirth,
      nationality,
      address,
      phoneNumber,
      deviceFingerprint
    } = req.body;
    
    // Validate input data
    const validationErrors = validatePersonalInfo(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    // Check if user already has a KYC verification
    const existingKYC = await pool.query(
      'SELECT id, verification_status FROM kyc_verifications WHERE user_id = $1',
      [userId]
    );
    
    if (existingKYC.rows.length > 0) {
      const status = existingKYC.rows[0].verification_status;
      if (status === 'approved') {
        return res.status(400).json({
          error: 'KYC verification already approved for this user'
        });
      } else if (status === 'pending' || status === 'under_review') {
        return res.status(400).json({
          error: 'KYC verification is already in progress for this user'
        });
      }
    }
    
    // Create new KYC verification
    const result = await pool.query(`
      INSERT INTO kyc_verifications (
        user_id, first_name, last_name, date_of_birth, nationality,
        address, phone_number, verification_status, submitted_at,
        ip_address, user_agent, device_fingerprint, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), $8, $9, $10, NOW(), NOW())
      RETURNING id, verification_status, submitted_at
    `, [
      userId, firstName, lastName, dateOfBirth, nationality,
      address, phoneNumber, req.ip, req.get('User-Agent'), deviceFingerprint
    ]);
    
    const kycVerification = result.rows[0];
    
    // Initialize KYC steps
    const steps = [
      { name: 'personal_info', order: 1, status: 'completed' },
      { name: 'document_upload', order: 2, status: 'not_started' },
      { name: 'review_submission', order: 3, status: 'not_started' }
    ];
    
    for (const step of steps) {
      await pool.query(`
        INSERT INTO kyc_verification_steps (
          kyc_id, step_name, step_status, step_order, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [kycVerification.id, step.name, step.status, step.order]);
    }
    
    // Log audit trail
    await logKYCAudit(
      kycVerification.id,
      'created',
      userId,
      'verification',
      kycVerification.id,
      null,
      { firstName, lastName, nationality },
      'Initial KYC verification submission',
      req.ip,
      req.get('User-Agent')
    );
    
    res.status(201).json({
      success: true,
      message: 'KYC verification submitted successfully',
      data: {
        kycId: kycVerification.id,
        status: kycVerification.verification_status,
        submittedAt: kycVerification.submitted_at,
        nextStep: 'document_upload'
      }
    });
    
  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      error: 'Failed to submit KYC verification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ENDPOINT 2: GET /api/kyc/status/:userId - Get KYC verification status
router.get('/status/:userId', authenticateToken, kycUserLimiter, auditLog('kyc_status_view', 'verification'), async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.userId);
    const currentUserId = req.user.id;
    
    // SECURITY: Users can only view their own KYC status unless they're admin
    if (requestedUserId !== currentUserId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Access denied. You can only view your own KYC status.'
      });
    }
    
    // Get KYC verification data
    const kycResult = await pool.query(`
      SELECT 
        k.id, k.verification_status, k.submitted_at, k.reviewed_at,
        k.rejection_reason, k.risk_level, k.expires_at,
        u.email, u.first_name, u.last_name
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      WHERE k.user_id = $1
      ORDER BY k.created_at DESC
      LIMIT 1
    `, [requestedUserId]);
    
    if (kycResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No KYC verification found for this user'
      });
    }
    
    const kycData = kycResult.rows[0];
    
    // Get verification steps
    const stepsResult = await pool.query(`
      SELECT step_name, step_status, step_order, completed_at, validation_errors
      FROM kyc_verification_steps
      WHERE kyc_id = $1
      ORDER BY step_order ASC
    `, [kycData.id]);
    
    // Get document status
    const documentsResult = await pool.query(`
      SELECT document_type, verification_status, verified_at, rejection_reason
      FROM kyc_documents
      WHERE kyc_id = $1
    `, [kycData.id]);
    
    res.json({
      success: true,
      data: {
        kycId: kycData.id,
        status: kycData.verification_status,
        submittedAt: kycData.submitted_at,
        reviewedAt: kycData.reviewed_at,
        rejectionReason: kycData.rejection_reason,
        riskLevel: kycData.risk_level,
        expiresAt: kycData.expires_at,
        steps: stepsResult.rows,
        documents: documentsResult.rows
      }
    });
    
  } catch (error) {
    console.error('KYC status error:', error);
    res.status(500).json({
      error: 'Failed to retrieve KYC status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ENDPOINT 3: POST /api/kyc/documents/upload - Handle secure document uploads
router.post('/documents/upload', uploadLimiter, authenticateToken, documentUserLimiter, auditLog('kyc_document_upload', 'document'), upload.single('document'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No document file provided'
      });
    }
    
    if (!documentType || !['identity_front', 'identity_back', 'proof_of_address', 'selfie_verification'].includes(documentType)) {
      return res.status(400).json({
        error: 'Invalid document type. Must be: identity_front, identity_back, proof_of_address, or selfie_verification'
      });
    }
    
    // Get or create the user's KYC verification
    let kycResult = await pool.query(
      'SELECT id FROM kyc_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    let kycId;
    if (kycResult.rows.length === 0) {
      // Auto-create a minimal KYC verification record for inline uploads
      const createResult = await pool.query(`
        INSERT INTO kyc_verifications (
          user_id, first_name, last_name, date_of_birth, nationality,
          address, phone_number, verification_status, submitted_at,
          ip_address, user_agent, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), $8, $9, NOW(), NOW())
        RETURNING id
      `, [
        userId, 'Pending', 'Verification', '1990-01-01', 'Pending',
        'Pending Address Collection', 'Pending Phone', req.ip, req.get('User-Agent')
      ]);
      
      kycId = createResult.rows[0].id;
      
      // Initialize KYC steps for auto-created record
      const steps = [
        { name: 'personal_info', order: 1, status: 'pending' },
        { name: 'document_upload', order: 2, status: 'in_progress' },
        { name: 'review_submission', order: 3, status: 'not_started' }
      ];
      
      for (const step of steps) {
        await pool.query(`
          INSERT INTO kyc_verification_steps (
            kyc_id, step_name, step_status, step_order, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [kycId, step.name, step.status, step.order]);
      }
    } else {
      kycId = kycResult.rows[0].id;
    }
    
    // SECURITY: File signature validation (magic bytes check)
    const fileSignature = req.file.buffer.slice(0, 4).toString('hex');
    const validSignatures = {
      'ffd8ffe0': 'JPEG',
      'ffd8ffe1': 'JPEG',
      'ffd8ffe2': 'JPEG', 
      '89504e47': 'PNG',
      '52494646': 'WEBP',
      '25504446': 'PDF'
    };
    
    if (!validSignatures[fileSignature]) {
      return res.status(400).json({
        error: 'Invalid file signature. File may be corrupted or not a valid document type.'
      });
    }
    
    // SECURITY: Generate file hash for integrity checking
    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    
    // SECURITY: Upload to secure object storage with encryption
    const objectStorageService = new ObjectStorageService();
    const originalFileName = req.file.originalname;
    const documentPath = await objectStorageService.uploadKYCDocument(
      req.file.buffer,
      originalFileName,
      userId,
      documentType
    );
    
    // Get the uploaded file for ACL policy setting
    const objectFile = await objectStorageService.getObjectEntityFile(documentPath);
    
    // SECURITY: Set strict ACL policy for KYC document
    const aclPolicy = createKYCDocumentAclPolicy(userId);
    await setObjectAclPolicy(objectFile, aclPolicy);
    
    // Store document information in database with secure storage path
    const documentResult = await pool.query(`
      INSERT INTO kyc_documents (
        kyc_id, document_type, file_name, file_url, file_size,
        file_mime_type, file_hash, verification_status,
        upload_ip_address, uploaded_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, NOW(), NOW(), NOW())
      RETURNING id, verification_status
    `, [
      kycId, documentType, originalFileName, documentPath,
      req.file.size, req.file.mimetype, fileHash, req.ip
    ]);
    
    const document = documentResult.rows[0];
    
    // Update KYC step status
    await pool.query(`
      UPDATE kyc_verification_steps 
      SET step_status = 'in_progress', started_at = NOW(), updated_at = NOW()
      WHERE kyc_id = $1 AND step_name = 'document_upload'
    `, [kycId]);
    
    // Log audit trail
    await logKYCAudit(
      kycId,
      'document_uploaded',
      userId,
      'document',
      document.id,
      null,
      { documentType, fileName: originalFileName },
      `Document uploaded: ${documentType}`,
      req.ip,
      req.get('User-Agent')
    );
    
    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        documentId: document.id,
        documentType: documentType,
        status: document.verification_status,
        uploadedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      error: 'Failed to upload document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ENDPOINT 4: PUT /api/kyc/review/:kycId - Admin endpoint for reviewing KYC submissions
router.put('/review/:kycId', authenticateToken, requireRole(['admin', 'super_admin']), auditLog('kyc_review', 'verification'), async (req, res) => {
  try {
    const kycId = parseInt(req.params.kycId);
    const adminId = req.user.id;
    const { action, rejectionReason, riskLevel, complianceNotes } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }
    
    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({
        error: 'Rejection reason is required when rejecting KYC verification'
      });
    }
    
    // Get current KYC data
    const currentKYC = await pool.query(
      'SELECT * FROM kyc_verifications WHERE id = $1',
      [kycId]
    );
    
    if (currentKYC.rows.length === 0) {
      return res.status(404).json({
        error: 'KYC verification not found'
      });
    }
    
    const currentData = currentKYC.rows[0];
    
    // Update KYC verification
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const expiresAt = action === 'approve' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null; // 1 year from now
    
    const updateResult = await pool.query(`
      UPDATE kyc_verifications 
      SET 
        verification_status = $1,
        reviewed_at = NOW(),
        reviewed_by = $2,
        rejection_reason = $3,
        risk_level = $4,
        compliance_notes = $5,
        expires_at = $6,
        last_updated_by = $2,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [newStatus, adminId, rejectionReason, riskLevel, complianceNotes, expiresAt, kycId]);
    
    const updatedKYC = updateResult.rows[0];
    
    // Update verification steps
    if (action === 'approve') {
      await pool.query(`
        UPDATE kyc_verification_steps 
        SET step_status = 'completed', completed_at = NOW(), completed_by = $1, updated_at = NOW()
        WHERE kyc_id = $2 AND step_name = 'review_submission'
      `, [adminId, kycId]);
    }
    
    // Log audit trail
    await logKYCAudit(
      kycId,
      action === 'approve' ? 'approved' : 'rejected',
      adminId,
      'verification',
      kycId,
      { status: currentData.verification_status },
      { status: newStatus, rejectionReason, riskLevel },
      `KYC verification ${action}d by admin`,
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      message: `KYC verification ${action}d successfully`,
      data: {
        kycId: updatedKYC.id,
        status: updatedKYC.verification_status,
        reviewedAt: updatedKYC.reviewed_at,
        reviewedBy: adminId,
        expiresAt: updatedKYC.expires_at
      }
    });
    
  } catch (error) {
    console.error('KYC review error:', error);
    res.status(500).json({
      error: 'Failed to review KYC verification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ENDPOINT 5: GET /api/kyc/verifications - Admin endpoint to list all KYC submissions
router.get('/verifications', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      status,
      riskLevel,
      page = 1,
      limit = 50,
      sortBy = 'submitted_at',
      sortOrder = 'DESC'
    } = req.query;
    
    // Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 records per page
    const offset = (pageNum - 1) * limitNum;
    
    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      whereConditions.push(`k.verification_status = $${paramCount}`);
      queryParams.push(status);
    }
    
    if (riskLevel) {
      paramCount++;
      whereConditions.push(`k.risk_level = $${paramCount}`);
      queryParams.push(riskLevel);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate sort parameters
    const allowedSortFields = ['submitted_at', 'reviewed_at', 'verification_status', 'risk_level'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'submitted_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM kyc_verifications k
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].total);
    
    // Get paginated data
    const dataQuery = `
      SELECT 
        k.id, k.user_id, k.first_name, k.last_name, k.nationality,
        k.verification_status, k.submitted_at, k.reviewed_at, k.reviewed_by,
        k.rejection_reason, k.risk_level, k.compliance_notes, k.expires_at,
        u.email, u.username,
        admin.first_name as reviewer_first_name, admin.last_name as reviewer_last_name,
        COUNT(d.id) as documents_count
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      LEFT JOIN users admin ON k.reviewed_by = admin.id
      LEFT JOIN kyc_documents d ON k.id = d.kyc_id
      ${whereClause}
      GROUP BY k.id, u.email, u.username, admin.first_name, admin.last_name
      ORDER BY k.${sortField} ${sortDirection}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limitNum, offset);
    const dataResult = await pool.query(dataQuery, queryParams);
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalRecords / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    res.json({
      success: true,
      data: {
        verifications: dataResult.rows,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalRecords: totalRecords,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage,
          limit: limitNum
        }
      }
    });
    
  } catch (error) {
    console.error('KYC verifications list error:', error);
    res.status(500).json({
      error: 'Failed to retrieve KYC verifications',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== ADMIN-ONLY KYC ROUTES ====================

// ADMIN ENDPOINT: GET /api/kyc/admin/stats - Get comprehensive KYC statistics
router.get('/admin/stats', authenticateToken, requireRole(['admin', 'super_admin', 'kyc_reviewer']), auditLog('kyc_admin_stats_view', 'statistics'), async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get comprehensive statistics
    const statsQueries = [
      // Status distribution
      pool.query(`
        SELECT verification_status, COUNT(*) as count
        FROM kyc_verifications 
        WHERE created_at >= $1
        GROUP BY verification_status
      `, [startDate]),
      
      // Risk level distribution
      pool.query(`
        SELECT risk_level, COUNT(*) as count
        FROM kyc_verifications 
        WHERE created_at >= $1 AND risk_level IS NOT NULL
        GROUP BY risk_level
      `, [startDate]),
      
      // Processing time statistics
      pool.query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600) as avg_hours,
          MIN(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600) as min_hours,
          MAX(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600) as max_hours,
          COUNT(*) as processed_count
        FROM kyc_verifications 
        WHERE reviewed_at IS NOT NULL AND submitted_at IS NOT NULL
        AND created_at >= $1
      `, [startDate]),
      
      // Daily submission counts
      pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as submissions
        FROM kyc_verifications 
        WHERE created_at >= $1
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [startDate]),
      
      // Reviewer performance
      pool.query(`
        SELECT 
          u.first_name, u.last_name, u.id as reviewer_id,
          COUNT(*) as reviews_completed,
          AVG(EXTRACT(EPOCH FROM (k.reviewed_at - k.submitted_at))/3600) as avg_processing_hours
        FROM kyc_verifications k
        JOIN users u ON k.reviewed_by = u.id
        WHERE k.reviewed_at IS NOT NULL AND k.created_at >= $1
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY reviews_completed DESC
        LIMIT 10
      `, [startDate])
    ];
    
    const [statusResult, riskResult, processingResult, dailyResult, reviewerResult] = await Promise.all(statsQueries);
    
    // Calculate compliance score
    const totalSubmissions = statusResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const approvedCount = statusResult.rows.find(row => row.verification_status === 'approved')?.count || 0;
    const complianceScore = totalSubmissions > 0 ? Math.round((approvedCount / totalSubmissions) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalSubmissions,
          pendingReview: statusResult.rows.find(row => row.verification_status === 'pending')?.count || 0,
          underReview: statusResult.rows.find(row => row.verification_status === 'under_review')?.count || 0,
          approved: approvedCount,
          rejected: statusResult.rows.find(row => row.verification_status === 'rejected')?.count || 0,
          complianceScore,
          avgProcessingHours: processingResult.rows[0]?.avg_hours || 0
        },
        statusDistribution: statusResult.rows,
        riskDistribution: riskResult.rows,
        processingStats: processingResult.rows[0],
        dailySubmissions: dailyResult.rows,
        reviewerPerformance: reviewerResult.rows,
        timeRange
      }
    });
    
  } catch (error) {
    console.error('KYC admin stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve KYC statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ADMIN ENDPOINT: PUT /api/kyc/admin/review/:kycId - Advanced review with audit trail
router.put('/admin/review/:kycId', authenticateToken, requireRole(['admin', 'super_admin', 'kyc_reviewer']), auditLog('kyc_admin_review', 'verification'), async (req, res) => {
  try {
    const kycId = parseInt(req.params.kycId);
    const reviewerId = req.user.id;
    const {
      action, // 'approve', 'reject', 'request_additional', 'escalate'
      rejectionReason,
      riskLevel,
      complianceNotes,
      requiredDocuments,
      escalationReason
    } = req.body;
    
    if (!['approve', 'reject', 'request_additional', 'escalate'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action. Must be: approve, reject, request_additional, or escalate'
      });
    }
    
    // Get current verification data
    const currentResult = await pool.query(
      'SELECT * FROM kyc_verifications WHERE id = $1',
      [kycId]
    );
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'KYC verification not found'
      });
    }
    
    const currentKyc = currentResult.rows[0];
    
    // Prevent reviewing own submission (if user submitted their own KYC)
    if (currentKyc.user_id === reviewerId) {
      return res.status(403).json({
        error: 'Cannot review your own KYC submission'
      });
    }
    
    // Update verification based on action
    let newStatus;
    let expiresAt = null;
    
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        // Set expiration date (2 years from now)
        expiresAt = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
        break;
      case 'reject':
        newStatus = 'rejected';
        if (!rejectionReason) {
          return res.status(400).json({
            error: 'Rejection reason is required when rejecting'
          });
        }
        break;
      case 'request_additional':
        newStatus = 'pending';
        break;
      case 'escalate':
        newStatus = 'under_review';
        break;
      default:
        newStatus = 'under_review';
    }
    
    // Update verification record
    const updateResult = await pool.query(`
      UPDATE kyc_verifications SET
        verification_status = $1,
        reviewed_at = NOW(),
        reviewed_by = $2,
        rejection_reason = $3,
        risk_level = $4,
        compliance_notes = $5,
        expires_at = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [newStatus, reviewerId, rejectionReason, riskLevel, complianceNotes, expiresAt, kycId]);
    
    const updatedKyc = updateResult.rows[0];
    
    // Log detailed audit trail
    await logKYCAudit(
      kycId,
      `review_${action}`,
      reviewerId,
      'verification',
      kycId,
      {
        status: currentKyc.verification_status,
        risk_level: currentKyc.risk_level,
        compliance_notes: currentKyc.compliance_notes
      },
      {
        status: newStatus,
        risk_level: riskLevel,
        compliance_notes: complianceNotes,
        rejection_reason: rejectionReason
      },
      `KYC ${action} by admin: ${req.user.firstName} ${req.user.lastName}`,
      req.ip,
      req.get('User-Agent')
    );
    
    // If requesting additional documents, create a request record
    if (action === 'request_additional' && requiredDocuments && requiredDocuments.length > 0) {
      for (const docType of requiredDocuments) {
        await pool.query(`
          INSERT INTO kyc_document_requests (
            kyc_id, document_type, requested_by, request_reason, 
            status, created_at
          ) VALUES ($1, $2, $3, $4, 'pending', NOW())
        `, [kycId, docType, reviewerId, 'Additional verification required']);
      }
    }
    
    res.json({
      success: true,
      message: `KYC verification ${action}d successfully`,
      data: {
        kycId: updatedKyc.id,
        status: updatedKyc.verification_status,
        reviewedAt: updatedKyc.reviewed_at,
        reviewedBy: reviewerId,
        riskLevel: updatedKyc.risk_level,
        expiresAt: updatedKyc.expires_at
      }
    });
    
  } catch (error) {
    console.error('KYC admin review error:', error);
    res.status(500).json({
      error: 'Failed to process KYC review',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ADMIN ENDPOINT: POST /api/kyc/admin/bulk-actions - Bulk operations on KYC submissions
router.post('/admin/bulk-actions', authenticateToken, requireRole(['admin', 'super_admin']), auditLog('kyc_bulk_action', 'verification'), async (req, res) => {
  try {
    const {
      action, // 'bulk_approve', 'bulk_reject', 'bulk_assign', 'bulk_escalate'
      kycIds,
      rejectionReason,
      assignedReviewer,
      riskLevel,
      complianceNotes
    } = req.body;
    
    if (!['bulk_approve', 'bulk_reject', 'bulk_assign', 'bulk_escalate'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid bulk action'
      });
    }
    
    if (!Array.isArray(kycIds) || kycIds.length === 0) {
      return res.status(400).json({
        error: 'KYC IDs array is required and cannot be empty'
      });
    }
    
    if (kycIds.length > 100) {
      return res.status(400).json({
        error: 'Cannot process more than 100 submissions at once'
      });
    }
    
    const results = [];
    const errors = [];
    
    // Process each KYC submission
    for (const kycId of kycIds) {
      try {
        let query, params;
        
        switch (action) {
          case 'bulk_approve':
            query = `
              UPDATE kyc_verifications SET
                verification_status = 'approved',
                reviewed_at = NOW(),
                reviewed_by = $1,
                risk_level = $2,
                compliance_notes = $3,
                expires_at = $4,
                updated_at = NOW()
              WHERE id = $5 AND verification_status IN ('pending', 'under_review')
              RETURNING id, verification_status
            `;
            const expiresAt = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
            params = [req.user.id, riskLevel || 'low', complianceNotes, expiresAt, kycId];
            break;
            
          case 'bulk_reject':
            if (!rejectionReason) {
              errors.push({ kycId, error: 'Rejection reason required' });
              continue;
            }
            query = `
              UPDATE kyc_verifications SET
                verification_status = 'rejected',
                reviewed_at = NOW(),
                reviewed_by = $1,
                rejection_reason = $2,
                risk_level = $3,
                compliance_notes = $4,
                updated_at = NOW()
              WHERE id = $5 AND verification_status IN ('pending', 'under_review')
              RETURNING id, verification_status
            `;
            params = [req.user.id, rejectionReason, riskLevel || 'medium', complianceNotes, kycId];
            break;
            
          case 'bulk_assign':
            if (!assignedReviewer) {
              errors.push({ kycId, error: 'Assigned reviewer required' });
              continue;
            }
            query = `
              UPDATE kyc_verifications SET
                assigned_reviewer = $1,
                verification_status = 'under_review',
                updated_at = NOW()
              WHERE id = $2 AND verification_status = 'pending'
              RETURNING id, verification_status
            `;
            params = [assignedReviewer, kycId];
            break;
            
          case 'bulk_escalate':
            query = `
              UPDATE kyc_verifications SET
                verification_status = 'under_review',
                risk_level = 'high',
                compliance_notes = $1,
                updated_at = NOW()
              WHERE id = $2
              RETURNING id, verification_status
            `;
            params = [complianceNotes || 'Escalated for additional review', kycId];
            break;
        }
        
        const result = await pool.query(query, params);
        
        if (result.rows.length > 0) {
          results.push({
            kycId,
            status: result.rows[0].verification_status,
            success: true
          });
          
          // Log audit trail for each item
          await logKYCAudit(
            kycId,
            action,
            req.user.id,
            'verification',
            kycId,
            null,
            { action, bulk: true },
            `Bulk ${action} performed by ${req.user.firstName} ${req.user.lastName}`,
            req.ip,
            req.get('User-Agent')
          );
        } else {
          errors.push({ kycId, error: 'No update performed - status may be invalid for this action' });
        }
        
      } catch (itemError) {
        console.error(`Bulk action error for KYC ${kycId}:`, itemError);
        errors.push({ kycId, error: itemError.message });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk action completed: ${results.length} successful, ${errors.length} failed`,
      data: {
        action,
        successful: results,
        errors: errors,
        totalProcessed: kycIds.length
      }
    });
    
  } catch (error) {
    console.error('KYC bulk actions error:', error);
    res.status(500).json({
      error: 'Failed to process bulk actions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ADMIN ENDPOINT: GET /api/kyc/admin/audit-logs/:kycId - Get audit trail for specific KYC
router.get('/admin/audit-logs/:kycId', authenticateToken, requireRole(['admin', 'super_admin', 'kyc_reviewer']), async (req, res) => {
  try {
    const kycId = parseInt(req.params.kycId);
    const { page = 1, limit = 50 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await pool.query(`
      SELECT 
        al.*, 
        u.first_name as admin_first_name, 
        u.last_name as admin_last_name,
        u.email as admin_email
      FROM kyc_audit_logs al
      LEFT JOIN users u ON al.action_by = u.id
      WHERE al.kyc_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3
    `, [kycId, parseInt(limit), offset]);
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM kyc_audit_logs WHERE kyc_id = $1',
      [kycId]
    );
    
    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / parseInt(limit));
    
    res.json({
      success: true,
      data: {
        auditLogs: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('KYC audit logs error:', error);
    res.status(500).json({
      error: 'Failed to retrieve audit logs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ADMIN ENDPOINT: GET /api/kyc/admin/document/:documentId - Secure document viewing
router.get('/admin/document/:documentId', authenticateToken, requireRole(['admin', 'super_admin', 'kyc_reviewer']), auditLog('kyc_document_view', 'document'), async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    
    // Get document details with KYC verification info
    const result = await pool.query(`
      SELECT 
        d.*,
        k.user_id,
        k.verification_status,
        u.email as user_email
      FROM kyc_documents d
      JOIN kyc_verifications k ON d.kyc_id = k.id
      JOIN users u ON k.user_id = u.id
      WHERE d.id = $1
    `, [documentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }
    
    const document = result.rows[0];
    
    // Log document access for audit
    await logKYCAudit(
      document.kyc_id,
      'document_accessed',
      req.user.id,
      'document',
      documentId,
      null,
      { document_type: document.document_type, file_name: document.file_name },
      `Document viewed by admin: ${req.user.firstName} ${req.user.lastName}`,
      req.ip,
      req.get('User-Agent')
    );
    
    // Return document metadata (actual file serving would be handled by object storage service)
    res.json({
      success: true,
      data: {
        documentId: document.id,
        kycId: document.kyc_id,
        documentType: document.document_type,
        fileName: document.file_name,
        fileUrl: document.file_url,
        fileSize: document.file_size,
        mimeType: document.file_mime_type,
        verificationStatus: document.verification_status,
        uploadedAt: document.uploaded_at,
        userEmail: document.user_email,
        // Security note: Actual file serving should use signed URLs from object storage
        secureViewUrl: `/api/kyc/admin/document/${documentId}/view?token=${req.headers.authorization?.split(' ')[1]}`
      }
    });
    
  } catch (error) {
    console.error('KYC document access error:', error);
    res.status(500).json({
      error: 'Failed to access document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ADMIN ENDPOINT: GET /api/kyc/admin/export - Export KYC data for compliance
router.get('/admin/export', authenticateToken, requireRole(['admin', 'super_admin']), auditLog('kyc_data_export', 'export'), async (req, res) => {
  try {
    const {
      format = 'json', // 'json', 'csv'
      status,
      riskLevel,
      startDate,
      endDate,
      includeDocuments = 'false'
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;
    
    if (status && status !== 'all') {
      whereClause += ` AND k.verification_status = $${++paramCount}`;
      queryParams.push(status);
    }
    
    if (riskLevel && riskLevel !== 'all') {
      whereClause += ` AND k.risk_level = $${++paramCount}`;
      queryParams.push(riskLevel);
    }
    
    if (startDate) {
      whereClause += ` AND k.created_at >= $${++paramCount}`;
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereClause += ` AND k.created_at <= $${++paramCount}`;
      queryParams.push(endDate);
    }
    
    const query = `
      SELECT 
        k.id, k.user_id, k.first_name, k.last_name, k.date_of_birth,
        k.nationality, k.address, k.phone_number, k.verification_status,
        k.submitted_at, k.reviewed_at, k.reviewed_by, k.rejection_reason,
        k.risk_level, k.compliance_notes, k.expires_at,
        u.email as user_email,
        reviewer.first_name as reviewer_first_name,
        reviewer.last_name as reviewer_last_name
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      LEFT JOIN users reviewer ON k.reviewed_by = reviewer.id
      ${whereClause}
      ORDER BY k.created_at DESC
    `;
    
    const result = await pool.query(query, queryParams);
    
    // Log export action
    await logKYCAudit(
      null,
      'data_export',
      req.user.id,
      'export',
      null,
      null,
      {
        format,
        filters: { status, riskLevel, startDate, endDate },
        recordCount: result.rows.length
      },
      `KYC data export by admin: ${req.user.firstName} ${req.user.lastName}`,
      req.ip,
      req.get('User-Agent')
    );
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = Object.keys(result.rows[0] || {}).join(',');
      const csvRows = result.rows.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
        ).join(',')
      );
      const csv = [csvHeader, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="kyc-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // Return JSON format
      res.json({
        success: true,
        data: {
          exportDate: new Date().toISOString(),
          filters: { status, riskLevel, startDate, endDate },
          recordCount: result.rows.length,
          verifications: result.rows
        }
      });
    }
    
  } catch (error) {
    console.error('KYC export error:', error);
    res.status(500).json({
      error: 'Failed to export KYC data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;