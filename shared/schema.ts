import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  decimal,
  integer,
  pgEnum,
  serial,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// User roles enum
export const userRoleEnum = pgEnum('user_role', [
  'user',
  'premium',
  'admin', 
  'super_admin',
  'moderator'
]);

// Account status enum
export const accountStatusEnum = pgEnum('account_status', [
  'active',
  'suspended',
  'pending_verification',
  'deactivated'
]);

// Savings account enums
export const savingsAccountTypeEnum = pgEnum('savings_account_type', [
  'hysa',
  'cd'
]);

export const savingsAccountStatusEnum = pgEnum('savings_account_status', [
  'open',
  'locked',
  'matured',
  'closed'
]);

export const savingsTransactionTypeEnum = pgEnum('savings_transaction_type', [
  'deposit',
  'withdrawal',
  'interest',
  'penalty',
  'adjustment'
]);

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
  }),
);

// Core users table with comprehensive profile management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  username: varchar("username", { length: 50 }).unique(),
  password: varchar("password"), // Hashed password for traditional login
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url"),
  bannerImageUrl: varchar("banner_image_url"), // Profile header/banner image
  
  // Wallet and blockchain data
  walletAddress: varchar("wallet_address", { length: 42 }),
  axmTokenBalance: decimal("axm_token_balance", { precision: 18, scale: 8 }).default('0'),
  totalStaked: decimal("total_staked", { precision: 18, scale: 8 }).default('0'),
  
  // Account management
  role: userRoleEnum("role").default('user'),
  accountStatus: accountStatusEnum("account_status").default('active'),
  emailVerified: boolean("email_verified").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  
  // Enhanced profile fields
  bio: text("bio"),
  headline: varchar("headline", { length: 150 }), // Short tagline/title for OG sharing
  purposeStatement: text("purpose_statement"), // Member's goals/purpose
  occupation: varchar("occupation", { length: 100 }),
  skills: jsonb("skills"), // Array of skills
  location: varchar("location", { length: 100 }),
  website: varchar("website"),
  socialLinks: jsonb("social_links"), // Twitter, LinkedIn, etc.
  phone: varchar("phone", { length: 20 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  showEmail: boolean("show_email").default(false),
  showPhone: boolean("show_phone").default(false),
  showWhatsapp: boolean("show_whatsapp").default(false),
  
  // Platform engagement and achievements
  memberSince: timestamp("member_since").defaultNow(),
  memberTier: varchar("member_tier", { length: 20 }).default('explorer'), // explorer, builder, leader
  totalGroupsJoined: integer("total_groups_joined").default(0),
  totalSavingsContributions: integer("total_savings_contributions").default(0),
  coursesCompleted: integer("courses_completed").default(0),
  referralCount: integer("referral_count").default(0),
  referralCode: varchar("referral_code", { length: 20 }).unique(),
  referredBy: integer("referred_by").references((): any => users.id),
  
  // Platform engagement
  lastLoginAt: timestamp("last_login_at"),
  loginCount: integer("login_count").default(0),
  premiumExpiresAt: timestamp("premium_expires_at"),
  
  // Profile visibility settings
  profileVisibility: varchar("profile_visibility", { length: 20 }).default('public'), // public, members, private
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User sessions for tracking multiple device logins
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionToken: varchar("session_token").unique().notNull(),
  deviceInfo: text("device_info"),
  ipAddress: varchar("ip_address", { length: 45 }),
  location: varchar("location"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User wallet connections and transaction history
export const userWallets = pgTable("user_wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  walletType: varchar("wallet_type", { length: 50 }), // MetaMask, WalletConnect, etc.
  isDefault: boolean("is_default").default(false),
  lastConnectedAt: timestamp("last_connected_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User transactions and activity log
export const userTransactions = pgTable("user_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  transactionType: varchar("transaction_type", { length: 50 }), // stake, unstake, transfer, etc.
  amount: decimal("amount", { precision: 18, scale: 8 }),
  tokenSymbol: varchar("token_symbol", { length: 10 }),
  status: varchar("status", { length: 20 }), // pending, confirmed, failed
  blockNumber: integer("block_number"),
  gasUsed: integer("gas_used"),
  gasPrice: decimal("gas_price", { precision: 18, scale: 0 }),
  metadata: jsonb("metadata"), // Additional transaction details
  createdAt: timestamp("created_at").defaultNow(),
});

// User onboarding data and progress tracking
export const userOnboarding = pgTable("user_onboarding", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  onboardingData: jsonb("onboarding_data"), // Complete onboarding form data
  currentStep: integer("current_step").default(1),
  completedSteps: jsonb("completed_steps"), // Array of completed step IDs
  selectedPath: varchar("selected_path", { length: 50 }), // beginner, investment, property, etc.
  selectedGoal: jsonb("selected_goal"), // Goal details
  monthlyContribution: decimal("monthly_contribution", { precision: 10, scale: 2 }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User financial goals from onboarding and goal setting
export const userGoals = pgTable("user_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  category: varchar("category", { length: 50 }), // retirement, education, home, etc.
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).default('0'),
  targetDate: timestamp("target_date"),
  priority: varchar("priority", { length: 20 }), // high, medium, low
  timeHorizon: integer("time_horizon"), // years
  importance: integer("importance"), // 1-10 scale
  monthlyContribution: decimal("monthly_contribution", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User investment preferences from advanced onboarding
export const userInvestmentPreferences = pgTable("user_investment_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  riskTolerance: varchar("risk_tolerance", { length: 50 }), // conservative, moderate, aggressive
  investmentExperience: varchar("investment_experience", { length: 50 }),
  assetClassPreferences: jsonb("asset_class_preferences"),
  geographicPreferences: jsonb("geographic_preferences"),
  esgPreferences: jsonb("esg_preferences"),
  managementPreferences: jsonb("management_preferences"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User notifications system
export const userNotifications = pgTable("user_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }), // info, warning, success, error
  isRead: boolean("is_read").default(false),
  actionUrl: varchar("action_url"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin activity logs
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }), // user, transaction, system
  targetId: varchar("target_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Platform settings and configuration
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: text("value"),
  type: varchar("type", { length: 20 }), // string, number, boolean, json
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==== KYC (KNOW YOUR CUSTOMER) COMPLIANCE SYSTEM ====

// KYC verification status enum
export const kycStatusEnum = pgEnum('kyc_status', [
  'pending',
  'under_review',
  'approved',
  'rejected'
]);

// KYC risk level enum
export const kycRiskLevelEnum = pgEnum('kyc_risk_level', [
  'low',
  'medium',
  'high'
]);

// KYC document type enum
export const kycDocumentTypeEnum = pgEnum('kyc_document_type', [
  'identity_front',
  'identity_back',
  'proof_of_address',
  'selfie_verification'
]);

// KYC document verification status enum
export const kycDocumentStatusEnum = pgEnum('kyc_document_status', [
  'pending',
  'approved',
  'rejected'
]);

// KYC verification step enum
export const kycStepEnum = pgEnum('kyc_step', [
  'personal_info',
  'document_upload',
  'review_submission'
]);

// KYC step status enum
export const kycStepStatusEnum = pgEnum('kyc_step_status', [
  'not_started',
  'in_progress',
  'completed'
]);

// Main KYC verifications table
export const kycVerifications = pgTable("kyc_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Personal Information
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  nationality: varchar("nationality", { length: 100 }).notNull(),
  address: text("address").notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  
  // Verification Status and Workflow
  verificationStatus: kycStatusEnum("verification_status").default('pending'),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id), // Admin who reviewed
  rejectionReason: text("rejection_reason"),
  
  // Risk Assessment
  riskLevel: kycRiskLevelEnum("risk_level"),
  complianceNotes: text("compliance_notes"),
  
  // Additional verification data
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint", { length: 100 }),
  
  // Compliance tracking
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
  expiresAt: timestamp("expires_at"), // KYC verification expiry
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for efficient queries
  userIdIdx: index("kyc_verifications_user_id_idx").on(table.userId),
  statusIdx: index("kyc_verifications_status_idx").on(table.verificationStatus),
  reviewedByIdx: index("kyc_verifications_reviewed_by_idx").on(table.reviewedBy),
  submittedAtIdx: index("kyc_verifications_submitted_at_idx").on(table.submittedAt),
}));

// KYC documents table for file uploads
export const kycDocuments = pgTable("kyc_documents", {
  id: serial("id").primaryKey(),
  kycId: integer("kyc_id").references(() => kycVerifications.id).notNull(),
  
  // Document Information
  documentType: kycDocumentTypeEnum("document_type").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileSize: integer("file_size"), // Size in bytes
  fileMimeType: varchar("file_mime_type", { length: 100 }),
  fileHash: varchar("file_hash", { length: 128 }), // SHA-256 hash for integrity
  
  // Verification Status
  verificationStatus: kycDocumentStatusEnum("verification_status").default('pending'),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by").references(() => users.id), // Admin who verified
  rejectionReason: text("rejection_reason"),
  
  // Document Analysis Results
  ocrData: jsonb("ocr_data"), // Extracted text and data from document
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }), // AI confidence 0-100
  analysisResults: jsonb("analysis_results"), // Detailed analysis results
  
  // Security and compliance
  isEncrypted: boolean("is_encrypted").default(true),
  uploadIpAddress: varchar("upload_ip_address", { length: 45 }),
  
  // Timestamps
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for efficient queries
  kycIdIdx: index("kyc_documents_kyc_id_idx").on(table.kycId),
  documentTypeIdx: index("kyc_documents_document_type_idx").on(table.documentType),
  statusIdx: index("kyc_documents_status_idx").on(table.verificationStatus),
  verifiedByIdx: index("kyc_documents_verified_by_idx").on(table.verifiedBy),
}));

// KYC verification steps for progress tracking
export const kycVerificationSteps = pgTable("kyc_verification_steps", {
  id: serial("id").primaryKey(),
  kycId: integer("kyc_id").references(() => kycVerifications.id).notNull(),
  
  // Step Information
  stepName: kycStepEnum("step_name").notNull(),
  stepStatus: kycStepStatusEnum("step_status").default('not_started'),
  stepOrder: integer("step_order").notNull(), // Order of steps (1, 2, 3, etc.)
  
  // Step completion data
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by").references(() => users.id), // User or admin who completed
  stepData: jsonb("step_data"), // Step-specific data and responses
  
  // Progress tracking
  attemptCount: integer("attempt_count").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  
  // Validation and errors
  validationErrors: jsonb("validation_errors"), // Field-specific validation errors
  notes: text("notes"), // Additional notes for the step
  
  // Timestamps
  startedAt: timestamp("started_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for efficient queries
  kycIdIdx: index("kyc_verification_steps_kyc_id_idx").on(table.kycId),
  stepNameIdx: index("kyc_verification_steps_step_name_idx").on(table.stepName),
  statusIdx: index("kyc_verification_steps_status_idx").on(table.stepStatus),
  orderIdx: index("kyc_verification_steps_order_idx").on(table.stepOrder),
  // Composite index for finding steps by KYC ID and order
  kycOrderIdx: index("kyc_verification_steps_kyc_order_idx").on(table.kycId, table.stepOrder),
}));

// KYC audit trail for compliance tracking
export const kycAuditLogs = pgTable("kyc_audit_logs", {
  id: serial("id").primaryKey(),
  kycId: integer("kyc_id").references(() => kycVerifications.id).notNull(),
  
  // Audit Information
  action: varchar("action", { length: 100 }).notNull(), // 'created', 'updated', 'approved', 'rejected', etc.
  actionBy: integer("action_by").references(() => users.id).notNull(), // User who performed action
  targetType: varchar("target_type", { length: 50 }), // 'verification', 'document', 'step'
  targetId: integer("target_id"), // ID of the target entity
  
  // Change tracking
  oldValues: jsonb("old_values"), // Previous state
  newValues: jsonb("new_values"), // New state
  changesSummary: text("changes_summary"), // Human-readable summary
  
  // Context and metadata
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  reason: text("reason"), // Reason for the change
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for audit queries
  kycIdIdx: index("kyc_audit_logs_kyc_id_idx").on(table.kycId),
  actionByIdx: index("kyc_audit_logs_action_by_idx").on(table.actionBy),
  actionIdx: index("kyc_audit_logs_action_idx").on(table.action),
  createdAtIdx: index("kyc_audit_logs_created_at_idx").on(table.createdAt),
}));

// ==== WEALTH-BUILDING FEATURES ====

// Contribution plan status enum
export const contributionPlanStatusEnum = pgEnum('contribution_plan_status', [
  'active',
  'paused', 
  'completed',
  'cancelled'
]);

// User contribution plans for wealth building
export const contributionPlans = pgTable("contribution_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  goalName: varchar("goal_name", { length: 100 }).notNull(),
  targetAmount: decimal("target_amount", { precision: 18, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 18, scale: 2 }).default('0'),
  monthlyContribution: decimal("monthly_contribution", { precision: 18, scale: 2 }).notNull(),
  autoContribute: boolean("auto_contribute").default(true),
  expectedCompletionDate: timestamp("expected_completion_date"),
  status: contributionPlanStatusEnum("status").default('active'),
  pathType: varchar("path_type", { length: 50 }), // 'beginner', 'yield', 'property', 'group'
  streakDays: integer("streak_days").default(0),
  lastContributionAt: timestamp("last_contribution_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community circles for group savings
export const circles = pgTable("circles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  goalAmount: decimal("goal_amount", { precision: 18, scale: 2 }),
  currentAmount: decimal("current_amount", { precision: 18, scale: 2 }).default('0'),
  memberLimit: integer("member_limit").default(50),
  currentMembers: integer("current_members").default(0),
  isPublic: boolean("is_public").default(true),
  inviteCode: varchar("invite_code", { length: 20 }).unique(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  circleImageUrl: varchar("circle_image_url"),
  tags: jsonb("tags"), // Array of interest tags
  activityLevel: varchar("activity_level", { length: 20 }).default('active'), // active, quiet, archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Circle memberships
export const circleMemberships = pgTable("circle_memberships", {
  id: serial("id").primaryKey(),
  circleId: integer("circle_id").references(() => circles.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 20 }).default('member'), // member, admin, moderator
  joinedAt: timestamp("joined_at").defaultNow(),
  totalContributed: decimal("total_contributed", { precision: 18, scale: 2 }).default('0'),
  isActive: boolean("is_active").default(true),
});

// Individual contributions to circles
export const circleContributions = pgTable("circle_contributions", {
  id: serial("id").primaryKey(),
  circleId: integer("circle_id").references(() => circles.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  contributionType: varchar("contribution_type", { length: 30 }).default('manual'), // manual, automatic, bonus
  message: text("message"),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Educational lessons
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  content: text("content").notNull(), // HTML or markdown content
  moduleId: varchar("module_id", { length: 50 }).notNull(), // e.g., 'money-basics', 'risk-101'
  orderIndex: integer("order_index").notNull(),
  estimatedMinutes: integer("estimated_minutes").default(5),
  difficultyLevel: varchar("difficulty_level", { length: 20 }).default('beginner'), // beginner, intermediate, advanced
  tags: jsonb("tags"),
  isPublished: boolean("is_published").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User progress tracking for lessons
export const lessonProgress = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  lessonId: integer("lesson_id").references(() => lessons.id).notNull(),
  isCompleted: boolean("is_completed").default(false),
  quizScore: integer("quiz_score"), // 0-100
  timeSpentMinutes: integer("time_spent_minutes").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User badges and achievements
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  badgeType: varchar("badge_type", { length: 50 }).notNull(), // lesson-complete, streak-7, first-contribution
  badgeName: varchar("badge_name", { length: 100 }).notNull(),
  description: text("description"),
  iconUrl: varchar("icon_url"),
  relatedId: varchar("related_id"), // lesson_id, circle_id, etc.
  earnedAt: timestamp("earned_at").defaultNow(),
});

// ==== COMPREHENSIVE EDUCATIONAL SYSTEM ====

// Course categories and modules
export const courseCategories = pgTable("course_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // emoji or icon name
  color: varchar("color", { length: 20 }).default('#3B82F6'), // hex color code
  orderIndex: integer("order_index").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual courses within categories
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => courseCategories.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  longDescription: text("long_description"),
  thumbnail: varchar("thumbnail", { length: 500 }),
  orderIndex: integer("order_index").notNull(),
  estimatedHours: decimal("estimated_hours", { precision: 4, scale: 2 }).default('1.0'),
  difficultyLevel: varchar("difficulty_level", { length: 20 }).default('beginner'), // beginner, intermediate, advanced
  prerequisites: jsonb("prerequisites"), // Array of course IDs required before this course
  tags: jsonb("tags"), // Array of tags for filtering
  isPublished: boolean("is_published").default(true),
  isFeatured: boolean("is_featured").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced lessons now belong to courses
export const courseModules = pgTable("course_modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  isOptional: boolean("is_optional").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Update existing lessons to link to modules instead of just moduleId string
export const enhancedLessons = pgTable("enhanced_lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => courseModules.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  content: text("content").notNull(), // HTML or markdown content
  contentType: varchar("content_type", { length: 20 }).default('markdown'), // markdown, html, video, interactive
  videoUrl: varchar("video_url", { length: 500 }),
  audioUrl: varchar("audio_url", { length: 500 }),
  orderIndex: integer("order_index").notNull(),
  estimatedMinutes: integer("estimated_minutes").default(5),
  hasQuiz: boolean("has_quiz").default(false),
  isRequired: boolean("is_required").default(true),
  passScore: integer("pass_score").default(70), // Minimum score to pass if has quiz
  maxAttempts: integer("max_attempts").default(3),
  tags: jsonb("tags"),
  isPublished: boolean("is_published").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quiz questions for lessons
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").references(() => enhancedLessons.id).notNull(),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 20 }).default('multiple_choice'), // multiple_choice, true_false, fill_blank, essay
  options: jsonb("options"), // Array of answer options for multiple choice
  correctAnswers: jsonb("correct_answers"), // Array of correct answers
  explanation: text("explanation"), // Explanation shown after answering
  points: integer("points").default(1),
  orderIndex: integer("order_index").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User quiz attempts and scores
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  lessonId: integer("lesson_id").references(() => enhancedLessons.id).notNull(),
  attemptNumber: integer("attempt_number").default(1),
  score: integer("score").default(0), // Percentage score 0-100
  totalQuestions: integer("total_questions"),
  correctAnswers: integer("correct_answers"),
  answers: jsonb("answers"), // User's answers mapped by question ID
  timeSpentMinutes: integer("time_spent_minutes").default(0),
  passed: boolean("passed").default(false),
  completedAt: timestamp("completed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced user progress tracking
export const courseProgress = pgTable("course_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  lessonsCompleted: integer("lessons_completed").default(0),
  totalLessons: integer("total_lessons"),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).default('0'),
  currentModuleId: integer("current_module_id").references(() => courseModules.id),
  currentLessonId: integer("current_lesson_id").references(() => enhancedLessons.id),
  averageQuizScore: decimal("average_quiz_score", { precision: 5, scale: 2 }),
  totalTimeSpent: integer("total_time_spent").default(0), // in minutes
  isCompleted: boolean("is_completed").default(false),
  certificateEarned: boolean("certificate_earned").default(false),
  certificateId: varchar("certificate_id", { length: 50 }),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Learning path definitions
export const learningPaths = pgTable("learning_paths", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  pathType: varchar("path_type", { length: 50 }), // 'beginner', 'wealth-builder', 'crypto-defi', 'real-estate'
  targetAudience: varchar("target_audience", { length: 100 }),
  estimatedWeeks: integer("estimated_weeks").default(4),
  difficultyLevel: varchar("difficulty_level", { length: 20 }).default('beginner'),
  courseOrder: jsonb("course_order"), // Array of course IDs in learning order
  prerequisites: jsonb("prerequisites"),
  outcomes: jsonb("outcomes"), // Array of learning outcomes
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 20 }),
  isPublished: boolean("is_published").default(true),
  isFeatured: boolean("is_featured").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User learning path enrollment and progress
export const userLearningPaths = pgTable("user_learning_paths", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  pathId: integer("path_id").references(() => learningPaths.id).notNull(),
  currentCourseIndex: integer("current_course_index").default(0),
  coursesCompleted: integer("courses_completed").default(0),
  totalCourses: integer("total_courses"),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).default('0'),
  isCompleted: boolean("is_completed").default(false),
  certificateEarned: boolean("certificate_earned").default(false),
  certificateId: varchar("certificate_id", { length: 50 }),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  targetCompletionDate: timestamp("target_completion_date"),
});

// Enhanced achievement system
export const achievementDefinitions = pgTable("achievement_definitions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  achievementType: varchar("achievement_type", { length: 30 }).notNull(), // course_complete, streak, assessment, engagement
  criteria: jsonb("criteria"), // Specific requirements to unlock
  points: integer("points").default(10),
  badgeIcon: varchar("badge_icon", { length: 100 }),
  badgeColor: varchar("badge_color", { length: 20 }),
  rarity: varchar("rarity", { length: 20 }).default('common'), // common, rare, epic, legendary
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User achievements tracking
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievementDefinitions.id).notNull(),
  progress: integer("progress").default(0), // Current progress toward achievement
  maxProgress: integer("max_progress").default(1), // Target progress to unlock
  isUnlocked: boolean("is_unlocked").default(false),
  unlockedAt: timestamp("unlocked_at"),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User learning streaks and engagement
export const learningStreaks = pgTable("learning_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: timestamp("last_activity_date"),
  streakStartDate: timestamp("streak_start_date"),
  weeklyGoal: integer("weekly_goal").default(3), // lessons per week
  monthlyGoal: integer("monthly_goal").default(12),
  totalLessonsCompleted: integer("total_lessons_completed").default(0),
  totalTimeSpent: integer("total_time_spent").default(0), // in minutes
  averageSessionTime: decimal("average_session_time", { precision: 5, scale: 2 }), // in minutes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course certificates
export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => courses.id),
  learningPathId: integer("learning_path_id").references(() => learningPaths.id),
  certificateId: varchar("certificate_id", { length: 50 }).unique().notNull(),
  certificateType: varchar("certificate_type", { length: 30 }), // course, learning_path, achievement
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  issuedDate: timestamp("issued_date").defaultNow(),
  isVerified: boolean("is_verified").default(true),
  verificationHash: varchar("verification_hash", { length: 100 }),
  templateUrl: varchar("template_url", { length: 500 }),
  shareUrl: varchar("share_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Learning analytics and insights
export const learningAnalytics = pgTable("learning_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  lessonsCompleted: integer("lessons_completed").default(0),
  timeSpent: integer("time_spent").default(0), // in minutes
  quizzesTaken: integer("quizzes_taken").default(0),
  averageScore: decimal("average_score", { precision: 5, scale: 2 }),
  coursesStarted: integer("courses_started").default(0),
  coursesCompleted: integer("courses_completed").default(0),
  achievementsUnlocked: integer("achievements_unlocked").default(0),
  streakMaintained: boolean("streak_maintained").default(false),
  preferredLearningTime: varchar("preferred_learning_time", { length: 20 }), // morning, afternoon, evening
  deviceType: varchar("device_type", { length: 20 }), // mobile, tablet, desktop
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDateIdx: index("learning_analytics_user_date_idx").on(table.userId, table.date),
}));

// Monthly transparency reports
export const reportMonths = pgTable("report_months", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  totalUsers: integer("total_users").default(0),
  totalContributions: decimal("total_contributions", { precision: 18, scale: 2 }).default('0'),
  totalCircles: integer("total_circles").default(0),
  averageContribution: decimal("average_contribution", { precision: 18, scale: 2 }).default('0'),
  topPerformingPath: varchar("top_performing_path", { length: 50 }),
  keyMetrics: jsonb("key_metrics"), // Additional metrics as JSON
  reportSummary: text("report_summary"),
  isPublished: boolean("is_published").default(false),
  publishedBy: integer("published_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  publishedAt: timestamp("published_at"),
});

// User poll responses for feedback
export const pollResponses = pgTable("poll_responses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  pollId: varchar("poll_id", { length: 100 }).notNull(), // Identifier for different polls
  questionId: varchar("question_id", { length: 100 }).notNull(),
  response: text("response").notNull(),
  responseType: varchar("response_type", { length: 20 }).default('text'), // text, rating, multiple_choice
  metadata: jsonb("metadata"), // Additional response data
  createdAt: timestamp("created_at").defaultNow(),
});

// ==== KEYGROW RENT-TO-OWN PATHWAY SYSTEM ====

// KeyGrow progress status enum
export const keygrowStatusEnum = pgEnum('keygrow_status', [
  'in_progress',
  'completed',
  'paused',
  'cancelled'
]);

// KeyGrow pathway step enum
export const keygrowStepEnum = pgEnum('keygrow_step', [
  'readiness_assessment',
  'market_education',
  'savings_calculator',
  'financial_preparation',
  'property_search',
  'pathway_selection'
]);

// Property status enum
export const propertyStatusEnum = pgEnum('property_status', [
  'available',
  'pending',
  'rented',
  'sold',
  'removed'
]);

// Property type enum  
export const propertyTypeEnum = pgEnum('property_type', [
  'house',
  'condo',
  'townhouse',
  'duplex',
  'apartment'
]);

// KeyGrow user progress tracking
export const keygrowProgress = pgTable("keygrow_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: keygrowStatusEnum("status").default('in_progress'),
  currentStep: keygrowStepEnum("current_step").default('readiness_assessment'),
  stepNumber: integer("step_number").default(1),
  
  // Readiness Assessment Data
  creditScore: integer("credit_score"),
  monthlyIncome: decimal("monthly_income", { precision: 12, scale: 2 }),
  monthlyDebt: decimal("monthly_debt", { precision: 12, scale: 2 }),
  emergencyFund: decimal("emergency_fund", { precision: 12, scale: 2 }),
  monthlyExpenses: decimal("monthly_expenses", { precision: 12, scale: 2 }),
  savingsRate: decimal("savings_rate", { precision: 5, scale: 2 }), // Percentage
  isFirstTimeBuyer: boolean("is_first_time_buyer").default(true),
  hasStableEmployment: boolean("has_stable_employment").default(false),
  
  // Market Analysis Data
  targetZipCode: varchar("target_zip_code", { length: 10 }),
  targetHomePrice: decimal("target_home_price", { precision: 12, scale: 2 }),
  averageRent: decimal("average_rent", { precision: 12, scale: 2 }),
  appreciationRate: decimal("appreciation_rate", { precision: 5, scale: 2 }), // Percentage
  downPaymentPercent: decimal("down_payment_percent", { precision: 5, scale: 2 }).default('20.00'),
  loanType: varchar("loan_type", { length: 20 }).default('conventional'), // conventional, fha, va, usda
  
  // Savings Target Data
  downPaymentAmount: decimal("down_payment_amount", { precision: 12, scale: 2 }),
  closingCosts: decimal("closing_costs", { precision: 12, scale: 2 }),
  movingCosts: decimal("moving_costs", { precision: 12, scale: 2 }),
  totalNeeded: decimal("total_needed", { precision: 12, scale: 2 }),
  currentSavings: decimal("current_savings", { precision: 12, scale: 2 }),
  monthlySavings: decimal("monthly_savings", { precision: 12, scale: 2 }),
  monthsToGoal: integer("months_to_goal"),
  
  // Property Search Preferences
  preferredLocation: varchar("preferred_location", { length: 100 }),
  priceRangeMin: decimal("price_range_min", { precision: 12, scale: 2 }),
  priceRangeMax: decimal("price_range_max", { precision: 12, scale: 2 }),
  bedrooms: integer("bedrooms").default(2),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).default('2.0'),
  preferredPropertyType: propertyTypeEnum("preferred_property_type").default('house'),
  
  // Calculated Scores
  readinessScore: integer("readiness_score").default(0), // 0-100
  affordabilityScore: integer("affordability_score").default(0), // 0-100
  
  // Selected Pathways
  selectedPathways: jsonb("selected_pathways"), // Array of selected rent-to-own options
  
  // Goal Integration from Onboarding
  onboardingGoalAmount: decimal("onboarding_goal_amount", { precision: 12, scale: 2 }),
  onboardingTimeframe: varchar("onboarding_timeframe", { length: 50 }),
  onboardingPathType: varchar("onboarding_path_type", { length: 50 }),
  
  // Completion Data
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mock property catalog for deterministic results
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  address: varchar("address", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  squareFeet: integer("square_feet"),
  propertyType: propertyTypeEnum("property_type").notNull(),
  description: text("description"),
  images: jsonb("images"), // Array of image URLs
  amenities: jsonb("amenities"), // Array of amenities
  
  // Rent-to-own specific data
  monthlyRent: decimal("monthly_rent", { precision: 8, scale: 2 }).notNull(),
  equityBuildupRate: decimal("equity_buildup_rate", { precision: 5, scale: 2 }).default('25.00'), // Percentage
  optionFee: decimal("option_fee", { precision: 8, scale: 2 }),
  optionPeriodMonths: integer("option_period_months").default(24), // Typical 2-year option
  
  // Status and availability
  status: propertyStatusEnum("status").default('available'),
  isRentToOwnEligible: boolean("is_rent_to_own_eligible").default(true),
  listingDate: timestamp("listing_date").defaultNow(),
  
  // Location data for matching
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  schoolDistrict: varchar("school_district", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User property watchlist
export const propertyWatchlist = pgTable("property_watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => ({
  // Ensure user can only watchlist each property once
  uniqueUserProperty: index("unique_user_property").on(table.userId, table.propertyId),
}));

// Property viewing requests
export const propertyViewing = pgTable("property_viewing", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  requestedDate: timestamp("requested_date"),
  contactEmail: varchar("contact_email", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  message: text("message"),
  status: varchar("status", { length: 20 }).default('requested'), // requested, scheduled, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// Pre-qualification calculations cache
export const prequalificationCache = pgTable("prequalification_cache", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  creditScore: integer("credit_score").notNull(),
  monthlyIncome: decimal("monthly_income", { precision: 12, scale: 2 }).notNull(),
  monthlyDebt: decimal("monthly_debt", { precision: 12, scale: 2 }).notNull(),
  downPaymentPercent: decimal("down_payment_percent", { precision: 5, scale: 2 }).notNull(),
  loanType: varchar("loan_type", { length: 20 }).notNull(),
  
  // Calculated results
  maxLoanAmount: decimal("max_loan_amount", { precision: 12, scale: 2 }),
  maxHomePrice: decimal("max_home_price", { precision: 12, scale: 2 }),
  estimatedMonthlyPayment: decimal("estimated_monthly_payment", { precision: 8, scale: 2 }),
  debtToIncomeRatio: decimal("debt_to_income_ratio", { precision: 5, scale: 2 }),
  isPrequalified: boolean("is_prequalified").default(false),
  
  // Cache metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Cache for 24 hours
});

// ==== SECURE WALLET AUTHENTICATION SYSTEM ====

// Wallet authentication nonce storage for secure signing
export const walletAuthNonces = pgTable("wallet_auth_nonces", {
  id: serial("id").primaryKey(),
  nonce: varchar("nonce", { length: 64 }).unique().notNull(), // Random hex string
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(), // Ethereum address format
  challengeMessage: text("challenge_message").notNull(), // EIP-4361 formatted message
  isUsed: boolean("is_used").default(false),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(), // Nonces expire in 15 minutes
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Index for quick lookups by nonce and wallet address
  nonceIdx: index("wallet_auth_nonces_nonce_idx").on(table.nonce),
  walletNonceIdx: index("wallet_auth_nonces_wallet_idx").on(table.walletAddress),
  expiresIdx: index("wallet_auth_nonces_expires_idx").on(table.expiresAt),
}));

// Wallet authentication attempts tracking for rate limiting
export const walletAuthAttempts = pgTable("wallet_auth_attempts", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  attemptType: varchar("attempt_type", { length: 20 }).notNull(), // 'challenge', 'verify'
  success: boolean("success").default(false),
  errorReason: varchar("error_reason", { length: 100 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for rate limiting queries
  walletIpIdx: index("wallet_auth_attempts_wallet_ip_idx").on(table.walletAddress, table.ipAddress),
  ipTimeIdx: index("wallet_auth_attempts_ip_time_idx").on(table.ipAddress, table.createdAt),
  walletTimeIdx: index("wallet_auth_attempts_wallet_time_idx").on(table.walletAddress, table.createdAt),
}));

// ==== DENET STORAGE SYSTEM ====

// Storage file status enum
export const storageFileStatusEnum = pgEnum('storage_file_status', [
  'uploading',
  'stored',
  'failed',
  'deleted',
  'archived'
]);

// Storage node status enum
export const storageNodeStatusEnum = pgEnum('storage_node_status', [
  'online',
  'offline',
  'maintenance',
  'error'
]);

// File type enum for categorization
export const fileTypeEnum = pgEnum('file_type', [
  'document',
  'image',
  'video',
  'audio',
  'archive',
  'other'
]);

// Storage files metadata tracking
export const storageFiles = pgTable("storage_files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // File Information
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileType: fileTypeEnum("file_type").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size").notNull(), // Size in bytes
  fileHash: varchar("file_hash", { length: 128 }), // SHA-256 hash for integrity
  
  // DeNet Storage Metadata
  deNetFileId: varchar("denet_file_id", { length: 100 }), // DeNet unique file identifier
  nodeId: varchar("node_id", { length: 100 }), // DeNet node storing the file
  storageProof: text("storage_proof"), // Cryptographic proof of storage
  replicationFactor: integer("replication_factor").default(3), // Number of copies
  
  // File Status and Processing
  status: storageFileStatusEnum("status").default('uploading'),
  uploadProgress: integer("upload_progress").default(0), // 0-100 percentage
  errorMessage: text("error_message"),
  
  // Access and Security
  isPublic: boolean("is_public").default(false),
  accessToken: varchar("access_token", { length: 64 }), // For private file access
  encryptionKey: varchar("encryption_key", { length: 128 }), // File encryption key
  
  // Storage Analytics
  downloadCount: integer("download_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  bandwidth_used: integer("bandwidth_used").default(0), // Total bandwidth in KB
  
  // Storage Costs and Billing
  storageRate: decimal("storage_rate", { precision: 10, scale: 6 }), // Cost per GB per month
  totalStorageCost: decimal("total_storage_cost", { precision: 18, scale: 8 }).default('0'),
  
  // File Lifecycle
  expiresAt: timestamp("expires_at"), // Optional expiration date
  lastBackupAt: timestamp("last_backup_at"),
  
  // Timestamps
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for efficient queries
  userIdIdx: index("storage_files_user_id_idx").on(table.userId),
  statusIdx: index("storage_files_status_idx").on(table.status),
  fileTypeIdx: index("storage_files_file_type_idx").on(table.fileType),
  nodeIdIdx: index("storage_files_node_id_idx").on(table.nodeId),
  deNetFileIdIdx: index("storage_files_denet_file_id_idx").on(table.deNetFileId),
  uploadedAtIdx: index("storage_files_uploaded_at_idx").on(table.uploadedAt),
}));

// DeNet storage nodes tracking and management
export const storageNodes = pgTable("storage_nodes", {
  id: serial("id").primaryKey(),
  
  // Node Identification
  nodeId: varchar("node_id", { length: 100 }).unique().notNull(),
  nodeName: varchar("node_name", { length: 100 }),
  nodeAddress: varchar("node_address", { length: 200 }).notNull(), // Network address
  
  // Node Status and Health
  status: storageNodeStatusEnum("status").default('offline'),
  isActive: boolean("is_active").default(true),
  healthScore: decimal("health_score", { precision: 5, scale: 2 }).default('100'), // 0-100 health score
  
  // Storage Capacity
  totalCapacity: integer("total_capacity").notNull(), // Total capacity in GB
  usedCapacity: integer("used_capacity").default(0), // Used capacity in GB
  availableCapacity: integer("available_capacity").notNull(), // Available capacity in GB
  
  // Performance Metrics
  uptime: decimal("uptime", { precision: 5, scale: 2 }).default('0'), // Uptime percentage
  responseTime: integer("response_time").default(0), // Average response time in ms
  bandwidth: integer("bandwidth").default(0), // Available bandwidth in Mbps
  
  // Storage Economics
  pricePerGB: decimal("price_per_gb", { precision: 10, scale: 6 }).default('0'), // Price per GB per month
  payoutAddress: varchar("payout_address", { length: 42 }), // Ethereum address for payments
  
  // Geographic and Network Info
  location: varchar("location", { length: 100 }),
  country: varchar("country", { length: 50 }),
  networkProvider: varchar("network_provider", { length: 100 }),
  
  // Node Statistics
  totalFilesStored: integer("total_files_stored").default(0),
  totalBandwidthUsed: integer("total_bandwidth_used").default(0), // In TB
  totalEarnings: decimal("total_earnings", { precision: 18, scale: 8 }).default('0'),
  
  // Monitoring Data
  lastPingAt: timestamp("last_ping_at"),
  lastHeartbeat: timestamp("last_heartbeat"),
  
  // Timestamps
  registeredAt: timestamp("registered_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for efficient queries
  nodeIdIdx: index("storage_nodes_node_id_idx").on(table.nodeId),
  statusIdx: index("storage_nodes_status_idx").on(table.status),
  isActiveIdx: index("storage_nodes_is_active_idx").on(table.isActive),
  locationIdx: index("storage_nodes_location_idx").on(table.location),
  lastPingIdx: index("storage_nodes_last_ping_idx").on(table.lastPingAt),
}));

// Storage analytics and usage tracking
export const storageAnalytics = pgTable("storage_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  
  // Analytics Period
  periodType: varchar("period_type", { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
  periodDate: timestamp("period_date").notNull(), // Start of the period
  
  // Storage Usage Metrics
  totalFiles: integer("total_files").default(0),
  totalStorageUsed: integer("total_storage_used").default(0), // In bytes
  totalBandwidthUsed: integer("total_bandwidth_used").default(0), // In bytes
  totalDownloads: integer("total_downloads").default(0),
  
  // Cost Analysis
  totalStorageCost: decimal("total_storage_cost", { precision: 18, scale: 8 }).default('0'),
  averageCostPerGB: decimal("average_cost_per_gb", { precision: 10, scale: 6 }).default('0'),
  
  // Performance Metrics
  averageUploadSpeed: decimal("average_upload_speed", { precision: 10, scale: 2 }).default('0'), // MB/s
  averageDownloadSpeed: decimal("average_download_speed", { precision: 10, scale: 2 }).default('0'), // MB/s
  averageResponseTime: integer("average_response_time").default(0), // Milliseconds
  
  // File Type Distribution
  documentsCount: integer("documents_count").default(0),
  imagesCount: integer("images_count").default(0),
  videosCount: integer("videos_count").default(0),
  audiosCount: integer("audios_count").default(0),
  archivesCount: integer("archives_count").default(0),
  othersCount: integer("others_count").default(0),
  
  // Node Performance
  activeNodes: integer("active_nodes").default(0),
  nodeUptimeAverage: decimal("node_uptime_average", { precision: 5, scale: 2 }).default('0'), // Percentage
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for analytics queries
  userIdIdx: index("storage_analytics_user_id_idx").on(table.userId),
  periodTypeIdx: index("storage_analytics_period_type_idx").on(table.periodType),
  periodDateIdx: index("storage_analytics_period_date_idx").on(table.periodDate),
  // Composite index for user analytics by period
  userPeriodIdx: index("storage_analytics_user_period_idx").on(table.userId, table.periodType, table.periodDate),
}));

// Storage upload sessions for tracking multi-part uploads
export const storageUploads = pgTable("storage_uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Upload Session Info
  uploadId: varchar("upload_id", { length: 64 }).unique().notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  fileHash: varchar("file_hash", { length: 128 }),
  
  // Upload Progress
  status: varchar("status", { length: 20 }).default('initiated'), // initiated, uploading, completed, failed
  bytesUploaded: integer("bytes_uploaded").default(0),
  uploadProgress: integer("upload_progress").default(0), // 0-100 percentage
  
  // Chunked Upload Management
  totalChunks: integer("total_chunks").default(1),
  completedChunks: integer("completed_chunks").default(0),
  chunkSize: integer("chunk_size").default(1048576), // 1MB default chunk size
  
  // Node Assignment
  assignedNodeId: varchar("assigned_node_id", { length: 100 }),
  
  // Error Handling
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  
  // Timing and Expiration
  expiresAt: timestamp("expires_at").notNull(), // Upload session expiry
  completedAt: timestamp("completed_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for upload management
  uploadIdIdx: index("storage_uploads_upload_id_idx").on(table.uploadId),
  userIdIdx: index("storage_uploads_user_id_idx").on(table.userId),
  statusIdx: index("storage_uploads_status_idx").on(table.status),
  assignedNodeIdx: index("storage_uploads_assigned_node_idx").on(table.assignedNodeId),
  expiresAtIdx: index("storage_uploads_expires_at_idx").on(table.expiresAt),
}));

// Savings Accounts System
export const savingsAccounts = pgTable("savings_accounts", {
  id: serial("id").primaryKey(),
  accountNumber: varchar("account_number", { length: 20 }).unique().notNull(),
  userId: integer("user_id"),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  
  // Account type and status
  type: savingsAccountTypeEnum("type").notNull(),
  status: savingsAccountStatusEnum("status").default('open').notNull(),
  
  // Financial data
  apy: decimal("apy", { precision: 5, scale: 2 }).notNull(),
  principal: decimal("principal", { precision: 18, scale: 8 }).default('0').notNull(),
  balance: decimal("balance", { precision: 18, scale: 8 }).default('0').notNull(),
  accruedInterest: decimal("accrued_interest", { precision: 18, scale: 8 }).default('0').notNull(),
  
  // CD-specific fields
  termMonths: integer("term_months"),
  maturityDate: timestamp("maturity_date"),
  earlyWithdrawalPenaltyRate: decimal("early_withdrawal_penalty_rate", { precision: 5, scale: 2 }),
  
  // Interest accrual tracking
  lastAccruedAt: timestamp("last_accrued_at"),
  
  // Metadata
  metadata: jsonb("metadata"),
  
  // Timestamps
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  walletAddressIdx: index("savings_accounts_wallet_address_idx").on(table.walletAddress),
  accountNumberIdx: index("savings_accounts_account_number_idx").on(table.accountNumber),
  typeStatusIdx: index("savings_accounts_type_status_idx").on(table.type, table.status),
  userIdIdx: index("savings_accounts_user_id_idx").on(table.userId),
}));

export const savingsTransactions = pgTable("savings_transactions", {
  id: serial("id").primaryKey(),
  savingsAccountId: integer("savings_account_id").notNull(),
  
  // Transaction details
  txType: savingsTransactionTypeEnum("tx_type").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 18, scale: 8 }).notNull(),
  
  // On-chain reference
  txHash: varchar("tx_hash", { length: 66 }),
  source: varchar("source", { length: 20 }).default('offchain'),
  
  // Description
  note: text("note"),
  
  // Timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  accountIdIdx: index("savings_transactions_account_id_idx").on(table.savingsAccountId),
  createdAtIdx: index("savings_transactions_created_at_idx").on(table.createdAt),
  txHashIdx: index("savings_transactions_tx_hash_idx").on(table.txHash),
}));

export const savingsAccountSettings = pgTable("savings_account_settings", {
  id: serial("id").primaryKey(),
  savingsAccountId: integer("savings_account_id").notNull().unique(),
  
  // Round-up savings
  roundUpEnabled: boolean("round_up_enabled").default(false),
  
  // Auto-transfer settings
  autoTransferEnabled: boolean("auto_transfer_enabled").default(false),
  autoTransferAmount: decimal("auto_transfer_amount", { precision: 18, scale: 8 }),
  autoTransferDay: integer("auto_transfer_day"),
  
  // Timestamp
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  accountIdIdx: index("savings_account_settings_account_id_idx").on(table.savingsAccountId),
}));

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UpsertUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type UserWallet = typeof userWallets.$inferSelect;
export type UserTransaction = typeof userTransactions.$inferSelect;
export type UserNotification = typeof userNotifications.$inferSelect;
export type AdminLog = typeof adminLogs.$inferSelect;
export type PlatformSetting = typeof platformSettings.$inferSelect;

// New wealth-building types
export type ContributionPlan = typeof contributionPlans.$inferSelect;
export type InsertContributionPlan = typeof contributionPlans.$inferInsert;
export type Circle = typeof circles.$inferSelect;
export type InsertCircle = typeof circles.$inferInsert;
export type CircleMembership = typeof circleMemberships.$inferSelect;
export type CircleContribution = typeof circleContributions.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type ReportMonth = typeof reportMonths.$inferSelect;

// Enhanced educational system types
export type CourseCategory = typeof courseCategories.$inferSelect;
export type InsertCourseCategory = typeof courseCategories.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;
export type CourseModule = typeof courseModules.$inferSelect;
export type InsertCourseModule = typeof courseModules.$inferInsert;
export type EnhancedLesson = typeof enhancedLessons.$inferSelect;
export type InsertEnhancedLesson = typeof enhancedLessons.$inferInsert;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = typeof quizQuestions.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;
export type CourseProgress = typeof courseProgress.$inferSelect;
export type InsertCourseProgress = typeof courseProgress.$inferInsert;
export type LearningPath = typeof learningPaths.$inferSelect;
export type InsertLearningPath = typeof learningPaths.$inferInsert;
export type UserLearningPath = typeof userLearningPaths.$inferSelect;
export type InsertUserLearningPath = typeof userLearningPaths.$inferInsert;
export type AchievementDefinition = typeof achievementDefinitions.$inferSelect;
export type InsertAchievementDefinition = typeof achievementDefinitions.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;
export type LearningStreak = typeof learningStreaks.$inferSelect;
export type InsertLearningStreak = typeof learningStreaks.$inferInsert;
export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;
export type LearningAnalytic = typeof learningAnalytics.$inferSelect;
export type InsertLearningAnalytic = typeof learningAnalytics.$inferInsert;
export type InsertReportMonth = typeof reportMonths.$inferInsert;
export type PollResponse = typeof pollResponses.$inferSelect;

// KeyGrow types
export type KeygrowProgress = typeof keygrowProgress.$inferSelect;
export type InsertKeygrowProgress = typeof keygrowProgress.$inferInsert;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;
export type PropertyWatchlist = typeof propertyWatchlist.$inferSelect;
export type InsertPropertyWatchlist = typeof propertyWatchlist.$inferInsert;
export type PropertyViewing = typeof propertyViewing.$inferSelect;
export type PrequalificationCache = typeof prequalificationCache.$inferSelect;

// Secure wallet authentication types
export type WalletAuthNonce = typeof walletAuthNonces.$inferSelect;
export type InsertWalletAuthNonce = typeof walletAuthNonces.$inferInsert;
export type WalletAuthAttempt = typeof walletAuthAttempts.$inferSelect;
export type InsertWalletAuthAttempt = typeof walletAuthAttempts.$inferInsert;

// Onboarding types
export type UserOnboarding = typeof userOnboarding.$inferSelect;
export type InsertUserOnboarding = typeof userOnboarding.$inferInsert;
export type UserGoal = typeof userGoals.$inferSelect;
export type InsertUserGoal = typeof userGoals.$inferInsert;
export type UserInvestmentPreference = typeof userInvestmentPreferences.$inferSelect;
export type InsertUserInvestmentPreference = typeof userInvestmentPreferences.$inferInsert;

// KYC (Know Your Customer) types
export type KycVerification = typeof kycVerifications.$inferSelect;
export type InsertKycVerification = typeof kycVerifications.$inferInsert;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type InsertKycDocument = typeof kycDocuments.$inferInsert;
export type KycVerificationStep = typeof kycVerificationSteps.$inferSelect;
export type InsertKycVerificationStep = typeof kycVerificationSteps.$inferInsert;
export type KycAuditLog = typeof kycAuditLogs.$inferSelect;
export type InsertKycAuditLog = typeof kycAuditLogs.$inferInsert;

// DeNet Storage types
export type StorageFile = typeof storageFiles.$inferSelect;
export type InsertStorageFile = typeof storageFiles.$inferInsert;
export type StorageNode = typeof storageNodes.$inferSelect;
export type InsertStorageNode = typeof storageNodes.$inferInsert;
export type StorageAnalytic = typeof storageAnalytics.$inferSelect;
export type InsertStorageAnalytic = typeof storageAnalytics.$inferInsert;
export type StorageUpload = typeof storageUploads.$inferSelect;
export type InsertStorageUpload = typeof storageUploads.$inferInsert;

// Savings Account types
export type SavingsAccount = typeof savingsAccounts.$inferSelect;
export type InsertSavingsAccount = typeof savingsAccounts.$inferInsert;
export type SavingsTransaction = typeof savingsTransactions.$inferSelect;
export type InsertSavingsTransaction = typeof savingsTransactions.$inferInsert;
export type SavingsAccountSettings = typeof savingsAccountSettings.$inferSelect;
export type InsertSavingsAccountSettings = typeof savingsAccountSettings.$inferInsert;

// ============================================
// DePIN Event Monitoring Tables
// ============================================

// DePIN Event Types
export const depinEventTypeEnum = pgEnum('depin_event_type', [
  'node_minted',
  'node_registered',
  'node_activated',
  'node_status_changed',
  'node_slashed',
  'lease_created',
  'lease_payment',
  'revenue_distributed',
  'withdrawal_processed',
  'performance_recorded'
]);

// DePIN Node Events (all blockchain events)
export const depinEvents = pgTable("depin_events", {
  id: serial("id").primaryKey(),
  eventType: depinEventTypeEnum("event_type").notNull(),
  transactionHash: varchar("transaction_hash", { length: 66 }).notNull(),
  blockNumber: integer("block_number").notNull(),
  logIndex: integer("log_index").notNull(),
  contractAddress: varchar("contract_address", { length: 42 }).notNull(),
  nodeId: integer("node_id"),
  nodeType: integer("node_type"),
  operatorAddress: varchar("operator_address", { length: 42 }),
  buyerAddress: varchar("buyer_address", { length: 42 }),
  tier: integer("tier"),
  priceEth: decimal("price_eth", { precision: 18, scale: 8 }),
  priceAxm: decimal("price_axm", { precision: 28, scale: 8 }),
  metadata: jsonb("metadata"),
  rawEventData: jsonb("raw_event_data"),
  processedAt: timestamp("processed_at").defaultNow(),
  blockTimestamp: timestamp("block_timestamp"),
}, (table) => ({
  txHashIdx: index("depin_events_tx_hash_idx").on(table.transactionHash),
  blockIdx: index("depin_events_block_idx").on(table.blockNumber),
  eventTypeIdx: index("depin_events_type_idx").on(table.eventType),
  operatorIdx: index("depin_events_operator_idx").on(table.operatorAddress),
  nodeIdx: index("depin_events_node_idx").on(table.nodeId),
}));

// DePIN Revenue Distributions
export const depinRevenueDistributions = pgTable("depin_revenue_distributions", {
  id: serial("id").primaryKey(),
  transactionHash: varchar("transaction_hash", { length: 66 }).notNull(),
  blockNumber: integer("block_number").notNull(),
  leaseId: integer("lease_id").notNull(),
  nodeId: integer("node_id").notNull(),
  totalRevenue: decimal("total_revenue", { precision: 28, scale: 8 }).notNull(),
  lesseeShare: decimal("lessee_share", { precision: 28, scale: 8 }).notNull(),
  lesseeAddress: varchar("lessee_address", { length: 42 }),
  operatorShare: decimal("operator_share", { precision: 28, scale: 8 }).notNull(),
  operatorAddress: varchar("operator_address", { length: 42 }),
  treasuryShare: decimal("treasury_share", { precision: 28, scale: 8 }).notNull(),
  distributedAt: timestamp("distributed_at"),
  processedAt: timestamp("processed_at").defaultNow(),
}, (table) => ({
  leaseIdx: index("depin_revenue_lease_idx").on(table.leaseId),
  nodeIdx: index("depin_revenue_node_idx").on(table.nodeId),
  distDateIdx: index("depin_revenue_date_idx").on(table.distributedAt),
}));

// DePIN Node Registry (current state)
export const depinNodes = pgTable("depin_nodes", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").unique().notNull(),
  nodeType: integer("node_type").notNull(),
  nodeTier: integer("node_tier"),
  operatorAddress: varchar("operator_address", { length: 42 }).notNull(),
  status: varchar("status", { length: 20 }).default('active'),
  purchasePriceEth: decimal("purchase_price_eth", { precision: 18, scale: 8 }),
  stakedAmountAxm: decimal("staked_amount_axm", { precision: 28, scale: 8 }),
  totalRevenueGenerated: decimal("total_revenue_generated", { precision: 28, scale: 8 }).default('0'),
  totalUptime: integer("total_uptime").default(0),
  totalDowntime: integer("total_downtime").default(0),
  lastHealthCheck: timestamp("last_health_check"),
  registeredAt: timestamp("registered_at"),
  activatedAt: timestamp("activated_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nodeIdIdx: index("depin_nodes_node_id_idx").on(table.nodeId),
  operatorIdx: index("depin_nodes_operator_idx").on(table.operatorAddress),
  statusIdx: index("depin_nodes_status_idx").on(table.status),
}));

// DePIN Event Sync State (for tracking last processed block)
export const depinSyncState = pgTable("depin_sync_state", {
  id: serial("id").primaryKey(),
  contractAddress: varchar("contract_address", { length: 42 }).unique().notNull(),
  lastProcessedBlock: integer("last_processed_block").notNull().default(0),
  lastProcessedTimestamp: timestamp("last_processed_timestamp"),
  isListening: boolean("is_listening").default(false),
  errorCount: integer("error_count").default(0),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// DePIN Event Types
export type DepinEvent = typeof depinEvents.$inferSelect;
export type InsertDepinEvent = typeof depinEvents.$inferInsert;
export type DepinRevenueDistribution = typeof depinRevenueDistributions.$inferSelect;
export type InsertDepinRevenueDistribution = typeof depinRevenueDistributions.$inferInsert;
export type DepinNode = typeof depinNodes.$inferSelect;
export type InsertDepinNode = typeof depinNodes.$inferInsert;
export type DepinSyncState = typeof depinSyncState.$inferSelect;
export type InsertDepinSyncState = typeof depinSyncState.$inferInsert;

// ============================================
// Node Leasing Marketplace Tables
// ============================================

export const leaseStatusEnum = pgEnum('lease_status', [
  'available',
  'leased',
  'expired',
  'cancelled'
]);

export const depinNodeListings = pgTable("depin_node_listings", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").notNull(),
  ownerAddress: varchar("owner_address", { length: 42 }).notNull(),
  monthlyRentAxm: decimal("monthly_rent_axm", { precision: 28, scale: 8 }).notNull(),
  minLeaseDays: integer("min_lease_days").default(30),
  maxLeaseDays: integer("max_lease_days").default(365),
  status: leaseStatusEnum("status").default('available'),
  description: text("description"),
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }).default('0'),
  totalLeases: integer("total_leases").default(0),
  totalEarnings: decimal("total_earnings", { precision: 28, scale: 8 }).default('0'),
  listedAt: timestamp("listed_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nodeIdIdx: index("node_listings_node_id_idx").on(table.nodeId),
  ownerIdx: index("node_listings_owner_idx").on(table.ownerAddress),
  statusIdx: index("node_listings_status_idx").on(table.status),
}));

export const depinLeases = pgTable("depin_leases", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => depinNodeListings.id).notNull(),
  nodeId: integer("node_id").notNull(),
  lesseeAddress: varchar("lessee_address", { length: 42 }).notNull(),
  ownerAddress: varchar("owner_address", { length: 42 }).notNull(),
  monthlyRentAxm: decimal("monthly_rent_axm", { precision: 28, scale: 8 }).notNull(),
  totalPaidAxm: decimal("total_paid_axm", { precision: 28, scale: 8 }).default('0'),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { length: 20 }).default('active'),
  lastPaymentDate: timestamp("last_payment_date"),
  nextPaymentDue: timestamp("next_payment_due"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  listingIdx: index("leases_listing_idx").on(table.listingId),
  lesseeIdx: index("leases_lessee_idx").on(table.lesseeAddress),
  ownerIdx: index("leases_owner_idx").on(table.ownerAddress),
  statusIdx: index("leases_status_idx").on(table.status),
}));

// ============================================
// Node Staking Tiers & Rewards
// ============================================

export const stakingTierEnum = pgEnum('staking_tier', [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond'
]);

export const depinStakingPositions = pgTable("depin_staking_positions", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").notNull(),
  operatorAddress: varchar("operator_address", { length: 42 }).notNull(),
  stakedAmount: decimal("staked_amount", { precision: 28, scale: 8 }).notNull(),
  tier: stakingTierEnum("tier").default('bronze'),
  apyRate: decimal("apy_rate", { precision: 5, scale: 2 }).default('5.00'),
  rewardsEarned: decimal("rewards_earned", { precision: 28, scale: 8 }).default('0'),
  rewardsClaimed: decimal("rewards_claimed", { precision: 28, scale: 8 }).default('0'),
  lastRewardCalculation: timestamp("last_reward_calculation").defaultNow(),
  stakingStartDate: timestamp("staking_start_date").defaultNow(),
  lockEndDate: timestamp("lock_end_date"),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nodeIdIdx: index("staking_node_id_idx").on(table.nodeId),
  operatorIdx: index("staking_operator_idx").on(table.operatorAddress),
  tierIdx: index("staking_tier_idx").on(table.tier),
}));

// ============================================
// Performance Metrics & Bonuses
// ============================================

export const depinPerformanceMetrics = pgTable("depin_performance_metrics", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").notNull(),
  operatorAddress: varchar("operator_address", { length: 42 }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  uptimePercentage: decimal("uptime_percentage", { precision: 5, scale: 2 }).default('0'),
  totalRequests: integer("total_requests").default(0),
  successfulRequests: integer("successful_requests").default(0),
  avgResponseTime: decimal("avg_response_time", { precision: 10, scale: 2 }),
  bonusEarned: decimal("bonus_earned", { precision: 28, scale: 8 }).default('0'),
  slashingPenalty: decimal("slashing_penalty", { precision: 28, scale: 8 }).default('0'),
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }).default('0'),
  rank: integer("rank"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nodeIdIdx: index("perf_node_id_idx").on(table.nodeId),
  periodIdx: index("perf_period_idx").on(table.periodStart, table.periodEnd),
  scoreIdx: index("perf_score_idx").on(table.performanceScore),
}));

// ============================================
// DEX Liquidity Mining
// ============================================

export const dexLiquidityRewards = pgTable("dex_liquidity_rewards", {
  id: serial("id").primaryKey(),
  poolAddress: varchar("pool_address", { length: 42 }).notNull(),
  providerAddress: varchar("provider_address", { length: 42 }).notNull(),
  lpTokenBalance: decimal("lp_token_balance", { precision: 28, scale: 8 }).notNull(),
  sharePercentage: decimal("share_percentage", { precision: 10, scale: 6 }).default('0'),
  rewardsEarned: decimal("rewards_earned", { precision: 28, scale: 8 }).default('0'),
  rewardsClaimed: decimal("rewards_claimed", { precision: 28, scale: 8 }).default('0'),
  pendingRewards: decimal("pending_rewards", { precision: 28, scale: 8 }).default('0'),
  bonusMultiplier: decimal("bonus_multiplier", { precision: 5, scale: 2 }).default('1.00'),
  lockPeriodDays: integer("lock_period_days").default(0),
  lockEndDate: timestamp("lock_end_date"),
  lastClaimDate: timestamp("last_claim_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  poolIdx: index("lp_rewards_pool_idx").on(table.poolAddress),
  providerIdx: index("lp_rewards_provider_idx").on(table.providerAddress),
}));

// ============================================
// DEX Limit Orders
// ============================================

export const orderStatusEnum = pgEnum('order_status', [
  'open',
  'partial',
  'filled',
  'cancelled',
  'expired'
]);

export const orderSideEnum = pgEnum('order_side', [
  'buy',
  'sell'
]);

export const dexLimitOrders = pgTable("dex_limit_orders", {
  id: serial("id").primaryKey(),
  orderHash: varchar("order_hash", { length: 66 }).unique(),
  traderAddress: varchar("trader_address", { length: 42 }).notNull(),
  tokenIn: varchar("token_in", { length: 42 }).notNull(),
  tokenOut: varchar("token_out", { length: 42 }).notNull(),
  amountIn: decimal("amount_in", { precision: 28, scale: 8 }).notNull(),
  amountOut: decimal("amount_out", { precision: 28, scale: 8 }).notNull(),
  limitPrice: decimal("limit_price", { precision: 28, scale: 18 }).notNull(),
  filledAmount: decimal("filled_amount", { precision: 28, scale: 8 }).default('0'),
  side: orderSideEnum("side").notNull(),
  status: orderStatusEnum("status").default('open'),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  filledAt: timestamp("filled_at"),
  cancelledAt: timestamp("cancelled_at"),
}, (table) => ({
  traderIdx: index("limit_orders_trader_idx").on(table.traderAddress),
  statusIdx: index("limit_orders_status_idx").on(table.status),
  priceIdx: index("limit_orders_price_idx").on(table.limitPrice),
  tokenPairIdx: index("limit_orders_pair_idx").on(table.tokenIn, table.tokenOut),
}));

// ============================================
// Treasury Buyback & Burn
// ============================================

export const treasuryBuybacks = pgTable("treasury_buybacks", {
  id: serial("id").primaryKey(),
  transactionHash: varchar("transaction_hash", { length: 66 }).unique(),
  ethSpent: decimal("eth_spent", { precision: 18, scale: 8 }).notNull(),
  axmBought: decimal("axm_bought", { precision: 28, scale: 8 }).notNull(),
  axmBurned: decimal("axm_burned", { precision: 28, scale: 8 }).default('0'),
  averagePrice: decimal("average_price", { precision: 18, scale: 8 }),
  sourceRevenue: varchar("source_revenue", { length: 50 }),
  executedAt: timestamp("executed_at").defaultNow(),
  burnTransactionHash: varchar("burn_transaction_hash", { length: 66 }),
  burnedAt: timestamp("burned_at"),
  metadata: jsonb("metadata"),
}, (table) => ({
  dateIdx: index("buybacks_date_idx").on(table.executedAt),
}));

export const treasuryBurnSummary = pgTable("treasury_burn_summary", {
  id: serial("id").primaryKey(),
  totalEthSpent: decimal("total_eth_spent", { precision: 28, scale: 8 }).default('0'),
  totalAxmBought: decimal("total_axm_bought", { precision: 28, scale: 8 }).default('0'),
  totalAxmBurned: decimal("total_axm_burned", { precision: 28, scale: 8 }).default('0'),
  buybackCount: integer("buyback_count").default(0),
  lastBuybackDate: timestamp("last_buyback_date"),
  lastBurnDate: timestamp("last_burn_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// Governance Node Voting Power
// ============================================

export const governanceNodePower = pgTable("governance_node_power", {
  id: serial("id").primaryKey(),
  voterAddress: varchar("voter_address", { length: 42 }).notNull(),
  nodeCount: integer("node_count").default(0),
  totalStakedAxm: decimal("total_staked_axm", { precision: 28, scale: 8 }).default('0'),
  baseVotingPower: decimal("base_voting_power", { precision: 28, scale: 8 }).default('0'),
  nodeBonus: decimal("node_bonus", { precision: 28, scale: 8 }).default('0'),
  stakingBonus: decimal("staking_bonus", { precision: 28, scale: 8 }).default('0'),
  totalVotingPower: decimal("total_voting_power", { precision: 28, scale: 8 }).default('0'),
  delegatedTo: varchar("delegated_to", { length: 42 }),
  delegatedPower: decimal("delegated_power", { precision: 28, scale: 8 }).default('0'),
  lastCalculated: timestamp("last_calculated").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  voterIdx: index("gov_power_voter_idx").on(table.voterAddress),
  powerIdx: index("gov_power_total_idx").on(table.totalVotingPower),
}));

// ============================================
// Treasury Grants DAO
// ============================================

export const grantStatusEnum = pgEnum('grant_status', [
  'draft',
  'voting',
  'approved',
  'rejected',
  'funded',
  'completed',
  'cancelled'
]);

export const grantCategoryEnum = pgEnum('grant_category', [
  'development',
  'marketing',
  'community',
  'infrastructure',
  'research',
  'education',
  'partnerships',
  'other'
]);

export const daoGrants = pgTable("dao_grants", {
  id: serial("id").primaryKey(),
  proposerAddress: varchar("proposer_address", { length: 42 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  category: grantCategoryEnum("category").default('other'),
  requestedAmount: decimal("requested_amount", { precision: 28, scale: 8 }).notNull(),
  milestones: jsonb("milestones"),
  teamInfo: jsonb("team_info"),
  timeline: varchar("timeline", { length: 100 }),
  status: grantStatusEnum("status").default('draft'),
  votesFor: decimal("votes_for", { precision: 28, scale: 8 }).default('0'),
  votesAgainst: decimal("votes_against", { precision: 28, scale: 8 }).default('0'),
  votesAbstain: decimal("votes_abstain", { precision: 28, scale: 8 }).default('0'),
  quorumReached: boolean("quorum_reached").default(false),
  votingStartDate: timestamp("voting_start_date"),
  votingEndDate: timestamp("voting_end_date"),
  fundedAmount: decimal("funded_amount", { precision: 28, scale: 8 }).default('0'),
  fundedAt: timestamp("funded_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  proposerIdx: index("grants_proposer_idx").on(table.proposerAddress),
  statusIdx: index("grants_status_idx").on(table.status),
  categoryIdx: index("grants_category_idx").on(table.category),
}));

export const daoGrantVotes = pgTable("dao_grant_votes", {
  id: serial("id").primaryKey(),
  grantId: integer("grant_id").references(() => daoGrants.id).notNull(),
  voterAddress: varchar("voter_address", { length: 42 }).notNull(),
  votingPower: decimal("voting_power", { precision: 28, scale: 8 }).notNull(),
  vote: varchar("vote", { length: 10 }).notNull(),
  reason: text("reason"),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  votedAt: timestamp("voted_at").defaultNow(),
}, (table) => ({
  grantIdx: index("grant_votes_grant_idx").on(table.grantId),
  voterIdx: index("grant_votes_voter_idx").on(table.voterAddress),
  uniqueVote: index("grant_votes_unique").on(table.grantId, table.voterAddress),
}));

// ============================================
// IoT Data Streams (Smart City)
// ============================================

export const iotDeviceTypeEnum = pgEnum('iot_device_type', [
  'energy_meter',
  'water_meter',
  'traffic_sensor',
  'air_quality',
  'weather_station',
  'parking_sensor',
  'waste_bin',
  'street_light',
  'security_camera',
  'ev_charger',
  'other'
]);

export const iotDeviceStreams = pgTable("iot_device_streams", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id", { length: 100 }).unique().notNull(),
  deviceType: iotDeviceTypeEnum("device_type").notNull(),
  nodeId: integer("node_id"),
  locationLat: decimal("location_lat", { precision: 10, scale: 7 }),
  locationLng: decimal("location_lng", { precision: 10, scale: 7 }),
  locationName: varchar("location_name", { length: 200 }),
  ownerAddress: varchar("owner_address", { length: 42 }),
  isActive: boolean("is_active").default(true),
  lastDataAt: timestamp("last_data_at"),
  dataPointCount: integer("data_point_count").default(0),
  revenueGenerated: decimal("revenue_generated", { precision: 28, scale: 8 }).default('0'),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  deviceTypeIdx: index("iot_device_type_idx").on(table.deviceType),
  nodeIdx: index("iot_node_idx").on(table.nodeId),
  ownerIdx: index("iot_owner_idx").on(table.ownerAddress),
}));

export const iotDataPoints = pgTable("iot_data_points", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id", { length: 100 }).notNull(),
  dataType: varchar("data_type", { length: 50 }).notNull(),
  value: decimal("value", { precision: 20, scale: 6 }),
  unit: varchar("unit", { length: 20 }),
  rawData: jsonb("raw_data"),
  recordedAt: timestamp("recorded_at").notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
}, (table) => ({
  deviceIdx: index("iot_data_device_idx").on(table.deviceId),
  timeIdx: index("iot_data_time_idx").on(table.recordedAt),
  typeIdx: index("iot_data_type_idx").on(table.dataType),
}));

// ============================================
// Utility Bill Payments
// ============================================

export const utilityTypeEnum = pgEnum('utility_type', [
  'electricity',
  'water',
  'gas',
  'internet',
  'waste',
  'solar_credits',
  'ev_charging',
  'other'
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'pending',
  'paid',
  'overdue',
  'cancelled',
  'disputed'
]);

export const utilityInvoices = pgTable("utility_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).unique().notNull(),
  accountAddress: varchar("account_address", { length: 42 }).notNull(),
  utilityType: utilityTypeEnum("utility_type").notNull(),
  providerName: varchar("provider_name", { length: 100 }),
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
  usageAmount: decimal("usage_amount", { precision: 20, scale: 6 }),
  usageUnit: varchar("usage_unit", { length: 20 }),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  amountAxm: decimal("amount_axm", { precision: 28, scale: 8 }),
  axmPriceAtInvoice: decimal("axm_price_at_invoice", { precision: 18, scale: 8 }),
  discountApplied: decimal("discount_applied", { precision: 18, scale: 2 }).default('0'),
  status: invoiceStatusEnum("status").default('pending'),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  paymentTxHash: varchar("payment_tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  accountIdx: index("utility_account_idx").on(table.accountAddress),
  typeIdx: index("utility_type_idx").on(table.utilityType),
  statusIdx: index("utility_status_idx").on(table.status),
  dueDateIdx: index("utility_due_idx").on(table.dueDate),
}));

export const utilityPayments = pgTable("utility_payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => utilityInvoices.id).notNull(),
  payerAddress: varchar("payer_address", { length: 42 }).notNull(),
  amountAxm: decimal("amount_axm", { precision: 28, scale: 8 }).notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  axmPriceAtPayment: decimal("axm_price_at_payment", { precision: 18, scale: 8 }),
  transactionHash: varchar("transaction_hash", { length: 66 }).unique(),
  paidAt: timestamp("paid_at").defaultNow(),
}, (table) => ({
  invoiceIdx: index("payment_invoice_idx").on(table.invoiceId),
  payerIdx: index("payment_payer_idx").on(table.payerAddress),
}));

// ============================================
// SIWE (Sign-In with Ethereum) Authentication Tables
// ============================================

export const siweNonces = pgTable("siwe_nonces", {
  id: serial("id").primaryKey(),
  nonce: varchar("nonce", { length: 64 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nonceIdx: index("siwe_nonce_idx").on(table.nonce),
  expiresIdx: index("siwe_expires_idx").on(table.expiresAt),
}));

export const walletSessions = pgTable("wallet_sessions", {
  id: serial("id").primaryKey(),
  sessionToken: varchar("session_token", { length: 128 }).unique().notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }).unique().notNull(),
  chainId: integer("chain_id").notNull(),
  domain: varchar("domain", { length: 255 }),
  authenticatedAt: timestamp("authenticated_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
}, (table) => ({
  tokenIdx: index("wallet_session_token_idx").on(table.sessionToken),
  addressIdx: index("wallet_session_address_idx").on(table.walletAddress),
  expiresIdx: index("wallet_session_expires_idx").on(table.expiresAt),
}));

// ============================================
// KeyGrow Rent-to-Own Program Tables
// ============================================

export const keygrowPropertyTypeEnum = pgEnum('keygrow_property_type', [
  'single_family',
  'multi_family',
  'land',
  'commercial',
  'condo',
  'townhouse',
  'manufactured'
]);

export const keygrowPropertyStatusEnum = pgEnum('keygrow_property_status', [
  'draft',
  'pending_review',
  'available',
  'enrolled',
  'tokenized',
  'fully_owned',
  'suspended',
  'withdrawn'
]);

export const keygrowSellerStatusEnum = pgEnum('keygrow_seller_status', [
  'pending',
  'verified',
  'suspended',
  'rejected'
]);

export const keygrowFeeStatusEnum = pgEnum('keygrow_fee_status', [
  'pending',
  'paid',
  'refunded',
  'waived'
]);

// Seller verification and onboarding
export const keygrowSellers = pgTable("keygrow_sellers", {
  id: serial("id").primaryKey(),
  sellerId: varchar("seller_id", { length: 66 }).unique().notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }).unique().notNull(),
  businessName: varchar("business_name", { length: 255 }),
  contactName: varchar("contact_name", { length: 200 }),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseState: varchar("license_state", { length: 50 }),
  companyType: varchar("company_type", { length: 100 }),
  website: varchar("website", { length: 500 }),
  totalListings: integer("total_listings").default(0),
  totalSales: integer("total_sales").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  status: keygrowSellerStatusEnum("status").default('pending'),
  kycVerified: boolean("kyc_verified").default(false),
  kycDocumentCid: varchar("kyc_document_cid", { length: 100 }),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by", { length: 42 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("keygrow_seller_wallet_idx").on(table.walletAddress),
  statusIdx: index("keygrow_seller_status_idx").on(table.status),
  emailIdx: index("keygrow_seller_email_idx").on(table.email),
}));

// Participation fees ($500 upfront)
export const keygrowParticipationFees = pgTable("keygrow_participation_fees", {
  id: serial("id").primaryKey(),
  feeId: varchar("fee_id", { length: 66 }).unique().notNull(),
  enrollmentId: integer("enrollment_id"),
  tenantAddress: varchar("tenant_address", { length: 42 }).notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull().default('500'),
  amountAxm: decimal("amount_axm", { precision: 28, scale: 8 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  stripePaymentId: varchar("stripe_payment_id", { length: 255 }),
  status: keygrowFeeStatusEnum("status").default('pending'),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  refundReason: text("refund_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("keygrow_fee_tenant_idx").on(table.tenantAddress),
  statusIdx: index("keygrow_fee_status_idx").on(table.status),
  enrollmentIdx: index("keygrow_fee_enrollment_idx").on(table.enrollmentId),
}));

// Property tokenization (10,000 shares per property)
export const keygrowPropertyTokens = pgTable("keygrow_property_tokens", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  tokenContractAddress: varchar("token_contract_address", { length: 42 }),
  tokenId: integer("token_id"),
  totalShares: integer("total_shares").default(10000).notNull(),
  availableShares: integer("available_shares").default(10000).notNull(),
  pricePerShareUsd: decimal("price_per_share_usd", { precision: 18, scale: 2 }),
  pricePerShareAxm: decimal("price_per_share_axm", { precision: 28, scale: 8 }),
  mintTransactionHash: varchar("mint_transaction_hash", { length: 66 }),
  mintBlockNumber: integer("mint_block_number"),
  isTokenized: boolean("is_tokenized").default(false),
  tokenizedAt: timestamp("tokenized_at"),
  ipfsMetadataCid: varchar("ipfs_metadata_cid", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  propertyIdx: index("keygrow_token_property_idx").on(table.propertyId),
  contractIdx: index("keygrow_token_contract_idx").on(table.tokenContractAddress),
}));

// Investor fractional share holdings
export const keygrowInvestorHoldings = pgTable("keygrow_investor_holdings", {
  id: serial("id").primaryKey(),
  holdingId: varchar("holding_id", { length: 66 }).unique().notNull(),
  propertyId: integer("property_id").notNull(),
  investorAddress: varchar("investor_address", { length: 42 }).notNull(),
  sharesOwned: integer("shares_owned").notNull(),
  purchasePriceUsd: decimal("purchase_price_usd", { precision: 18, scale: 2 }),
  purchasePriceAxm: decimal("purchase_price_axm", { precision: 28, scale: 8 }),
  currentValueUsd: decimal("current_value_usd", { precision: 18, scale: 2 }),
  totalDividendsReceived: decimal("total_dividends_received", { precision: 28, scale: 8 }).default('0'),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  purchasedAt: timestamp("purchased_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  propertyIdx: index("keygrow_holding_property_idx").on(table.propertyId),
  investorIdx: index("keygrow_holding_investor_idx").on(table.investorAddress),
}));

// Investor share orders/transactions
export const keygrowShareOrders = pgTable("keygrow_share_orders", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 66 }).unique().notNull(),
  propertyId: integer("property_id").notNull(),
  buyerAddress: varchar("buyer_address", { length: 42 }).notNull(),
  sellerAddress: varchar("seller_address", { length: 42 }),
  orderType: varchar("order_type", { length: 20 }).notNull(),
  shares: integer("shares").notNull(),
  pricePerShareAxm: decimal("price_per_share_axm", { precision: 28, scale: 8 }).notNull(),
  totalAmountAxm: decimal("total_amount_axm", { precision: 28, scale: 8 }).notNull(),
  status: varchar("status", { length: 20 }).default('pending'),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  filledAt: timestamp("filled_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  propertyIdx: index("keygrow_order_property_idx").on(table.propertyId),
  buyerIdx: index("keygrow_order_buyer_idx").on(table.buyerAddress),
  statusIdx: index("keygrow_order_status_idx").on(table.status),
}));

// Property API enrichment data from ATTOM/RentCast
export const keygrowPropertyEnrichment = pgTable("keygrow_property_enrichment", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  attomId: varchar("attom_id", { length: 100 }),
  rentcastId: varchar("rentcast_id", { length: 100 }),
  estimatedValueUsd: decimal("estimated_value_usd", { precision: 18, scale: 2 }),
  estimatedRentUsd: decimal("estimated_rent_usd", { precision: 18, scale: 2 }),
  lastSalePrice: decimal("last_sale_price", { precision: 18, scale: 2 }),
  lastSaleDate: timestamp("last_sale_date"),
  taxAssessedValue: decimal("tax_assessed_value", { precision: 18, scale: 2 }),
  yearBuilt: integer("year_built"),
  lotSizeSqFt: integer("lot_size_sq_ft"),
  livingAreaSqFt: integer("living_area_sq_ft"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  propertyType: varchar("property_type", { length: 100 }),
  zoning: varchar("zoning", { length: 100 }),
  hoaFees: decimal("hoa_fees", { precision: 10, scale: 2 }),
  ownerName: varchar("owner_name", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  fipsCode: varchar("fips_code", { length: 20 }),
  apn: varchar("apn", { length: 100 }),
  photos: jsonb("photos"),
  amenities: jsonb("amenities"),
  rawData: jsonb("raw_data"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  propertyIdx: index("keygrow_enrich_property_idx").on(table.propertyId),
  attomIdx: index("keygrow_enrich_attom_idx").on(table.attomId),
  rentcastIdx: index("keygrow_enrich_rentcast_idx").on(table.rentcastId),
}));

// Equity schedules (0.75% - 1.25% based on tier)
export const keygrowEquitySchedules = pgTable("keygrow_equity_schedules", {
  id: serial("id").primaryKey(),
  tierName: varchar("tier_name", { length: 100 }).notNull(),
  minTermMonths: integer("min_term_months").notNull(),
  maxTermMonths: integer("max_term_months"),
  baseEquityPercent: decimal("base_equity_percent", { precision: 8, scale: 4 }).notNull(),
  loyaltyBonusPercent: decimal("loyalty_bonus_percent", { precision: 8, scale: 4 }).default('0'),
  earlyPaymentBonusPercent: decimal("early_payment_bonus_percent", { precision: 8, scale: 4 }).default('0'),
  maxEquityPercent: decimal("max_equity_percent", { precision: 8, scale: 4 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const keygrowEnrollmentStatusEnum = pgEnum('keygrow_enrollment_status', [
  'pending',
  'active',
  'completed',
  'cancelled',
  'defaulted'
]);

export const keygrowPaymentStatusEnum = pgEnum('keygrow_payment_status', [
  'pending',
  'confirmed',
  'failed',
  'refunded'
]);

export const keygrowProperties = pgTable("keygrow_properties", {
  id: serial("id").primaryKey(),
  propertyId: varchar("property_id", { length: 66 }).unique().notNull(),
  ownerAddress: varchar("owner_address", { length: 42 }).notNull(),
  propertyName: varchar("property_name", { length: 200 }).notNull(),
  propertyType: varchar("property_type", { length: 50 }).notNull(),
  addressLine1: varchar("address_line_1", { length: 200 }),
  addressLine2: varchar("address_line_2", { length: 200 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar("country", { length: 100 }).default('USA'),
  totalValueUsd: decimal("total_value_usd", { precision: 18, scale: 2 }).notNull(),
  totalValueAxm: decimal("total_value_axm", { precision: 28, scale: 8 }),
  monthlyRentUsd: decimal("monthly_rent_usd", { precision: 18, scale: 2 }).notNull(),
  monthlyRentAxm: decimal("monthly_rent_axm", { precision: 28, scale: 8 }),
  equityPercentPerPayment: decimal("equity_percent_per_payment", { precision: 8, scale: 4 }).default('0.5'),
  minimumTermMonths: integer("minimum_term_months").default(24),
  maximumTermMonths: integer("maximum_term_months").default(360),
  tokenContractAddress: varchar("token_contract_address", { length: 42 }),
  tokenId: varchar("token_id", { length: 78 }),
  ipfsMetadataCid: varchar("ipfs_metadata_cid", { length: 100 }),
  imageUrl: varchar("image_url", { length: 500 }),
  description: text("description"),
  amenities: jsonb("amenities"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  squareFeet: integer("square_feet"),
  yearBuilt: integer("year_built"),
  status: keygrowPropertyStatusEnum("status").default('available'),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  ownerIdx: index("keygrow_prop_owner_idx").on(table.ownerAddress),
  statusIdx: index("keygrow_prop_status_idx").on(table.status),
  cityIdx: index("keygrow_prop_city_idx").on(table.city),
  typeIdx: index("keygrow_prop_type_idx").on(table.propertyType),
}));

export const keygrowEnrollments = pgTable("keygrow_enrollments", {
  id: serial("id").primaryKey(),
  enrollmentId: varchar("enrollment_id", { length: 66 }).unique().notNull(),
  propertyId: integer("property_id").references(() => keygrowProperties.id).notNull(),
  tenantAddress: varchar("tenant_address", { length: 42 }).notNull(),
  tenantName: varchar("tenant_name", { length: 200 }),
  tenantEmail: varchar("tenant_email", { length: 255 }),
  enrollmentDate: timestamp("enrollment_date").defaultNow(),
  targetOwnershipDate: timestamp("target_ownership_date"),
  agreedTermMonths: integer("agreed_term_months").notNull(),
  agreedMonthlyRentAxm: decimal("agreed_monthly_rent_axm", { precision: 28, scale: 8 }).notNull(),
  agreedEquityPerPayment: decimal("agreed_equity_per_payment", { precision: 8, scale: 4 }).notNull(),
  totalEquityRequired: decimal("total_equity_required", { precision: 8, scale: 4 }).default('100'),
  currentEquityPercent: decimal("current_equity_percent", { precision: 8, scale: 4 }).default('0'),
  totalPaymentsMade: integer("total_payments_made").default(0),
  totalAxmPaid: decimal("total_axm_paid", { precision: 28, scale: 8 }).default('0'),
  missedPayments: integer("missed_payments").default(0),
  status: keygrowEnrollmentStatusEnum("status").default('pending'),
  contractSignatureHash: varchar("contract_signature_hash", { length: 66 }),
  kycVerified: boolean("kyc_verified").default(false),
  lastPaymentDate: timestamp("last_payment_date"),
  nextPaymentDue: timestamp("next_payment_due"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  propertyIdx: index("keygrow_enroll_property_idx").on(table.propertyId),
  tenantIdx: index("keygrow_enroll_tenant_idx").on(table.tenantAddress),
  statusIdx: index("keygrow_enroll_status_idx").on(table.status),
  dueDateIdx: index("keygrow_enroll_due_idx").on(table.nextPaymentDue),
}));

export const keygrowPayments = pgTable("keygrow_payments", {
  id: serial("id").primaryKey(),
  paymentId: varchar("payment_id", { length: 66 }).unique().notNull(),
  enrollmentId: integer("enrollment_id").references(() => keygrowEnrollments.id).notNull(),
  payerAddress: varchar("payer_address", { length: 42 }).notNull(),
  paymentMonth: integer("payment_month").notNull(),
  paymentYear: integer("payment_year").notNull(),
  amountAxm: decimal("amount_axm", { precision: 28, scale: 8 }).notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }),
  axmPriceAtPayment: decimal("axm_price_at_payment", { precision: 18, scale: 8 }),
  equityEarned: decimal("equity_earned", { precision: 8, scale: 4 }).notNull(),
  cumulativeEquity: decimal("cumulative_equity", { precision: 8, scale: 4 }).notNull(),
  transactionHash: varchar("transaction_hash", { length: 66 }).unique(),
  blockNumber: integer("block_number"),
  status: keygrowPaymentStatusEnum("status").default('pending'),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  isLate: boolean("is_late").default(false),
  lateFeeAxm: decimal("late_fee_axm", { precision: 28, scale: 8 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  enrollmentIdx: index("keygrow_pay_enrollment_idx").on(table.enrollmentId),
  payerIdx: index("keygrow_pay_payer_idx").on(table.payerAddress),
  statusIdx: index("keygrow_pay_status_idx").on(table.status),
  monthYearIdx: index("keygrow_pay_month_year_idx").on(table.paymentYear, table.paymentMonth),
}));

export const keygrowEquityTransfers = pgTable("keygrow_equity_transfers", {
  id: serial("id").primaryKey(),
  transferId: varchar("transfer_id", { length: 66 }).unique().notNull(),
  enrollmentId: integer("enrollment_id").references(() => keygrowEnrollments.id).notNull(),
  fromAddress: varchar("from_address", { length: 42 }).notNull(),
  toAddress: varchar("to_address", { length: 42 }).notNull(),
  equityPercent: decimal("equity_percent", { precision: 8, scale: 4 }).notNull(),
  transferType: varchar("transfer_type", { length: 50 }).notNull(),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  blockNumber: integer("block_number"),
  transferredAt: timestamp("transferred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  enrollmentIdx: index("keygrow_transfer_enrollment_idx").on(table.enrollmentId),
  fromIdx: index("keygrow_transfer_from_idx").on(table.fromAddress),
  toIdx: index("keygrow_transfer_to_idx").on(table.toAddress),
}));

export const keygrowPropertyDocuments = pgTable("keygrow_property_documents", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => keygrowProperties.id).notNull(),
  documentType: varchar("document_type", { length: 100 }).notNull(),
  documentName: varchar("document_name", { length: 255 }).notNull(),
  ipfsCid: varchar("ipfs_cid", { length: 100 }),
  fileUrl: varchar("file_url", { length: 500 }),
  fileHash: varchar("file_hash", { length: 66 }),
  uploadedBy: varchar("uploaded_by", { length: 42 }),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by", { length: 42 }),
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  propertyIdx: index("keygrow_doc_property_idx").on(table.propertyId),
  typeIdx: index("keygrow_doc_type_idx").on(table.documentType),
}));

// ============================================
// Export Types for New Tables
// ============================================

// Node Leasing Types
export type DepinNodeListing = typeof depinNodeListings.$inferSelect;
export type InsertDepinNodeListing = typeof depinNodeListings.$inferInsert;
export type DepinLease = typeof depinLeases.$inferSelect;
export type InsertDepinLease = typeof depinLeases.$inferInsert;

// Staking Types
export type DepinStakingPosition = typeof depinStakingPositions.$inferSelect;
export type InsertDepinStakingPosition = typeof depinStakingPositions.$inferInsert;

// Performance Types
export type DepinPerformanceMetric = typeof depinPerformanceMetrics.$inferSelect;
export type InsertDepinPerformanceMetric = typeof depinPerformanceMetrics.$inferInsert;

// DEX Types
export type DexLiquidityReward = typeof dexLiquidityRewards.$inferSelect;
export type InsertDexLiquidityReward = typeof dexLiquidityRewards.$inferInsert;
export type DexLimitOrder = typeof dexLimitOrders.$inferSelect;
export type InsertDexLimitOrder = typeof dexLimitOrders.$inferInsert;

// Treasury Types
export type TreasuryBuyback = typeof treasuryBuybacks.$inferSelect;
export type InsertTreasuryBuyback = typeof treasuryBuybacks.$inferInsert;
export type TreasuryBurnSummary = typeof treasuryBurnSummary.$inferSelect;
export type InsertTreasuryBurnSummary = typeof treasuryBurnSummary.$inferInsert;

// Governance Types
export type GovernanceNodePower = typeof governanceNodePower.$inferSelect;
export type InsertGovernanceNodePower = typeof governanceNodePower.$inferInsert;
export type DaoGrant = typeof daoGrants.$inferSelect;
export type InsertDaoGrant = typeof daoGrants.$inferInsert;
export type DaoGrantVote = typeof daoGrantVotes.$inferSelect;
export type InsertDaoGrantVote = typeof daoGrantVotes.$inferInsert;

// IoT Types
export type IotDeviceStream = typeof iotDeviceStreams.$inferSelect;
export type InsertIotDeviceStream = typeof iotDeviceStreams.$inferInsert;
export type IotDataPoint = typeof iotDataPoints.$inferSelect;
export type InsertIotDataPoint = typeof iotDataPoints.$inferInsert;

// Utility Types
export type UtilityInvoice = typeof utilityInvoices.$inferSelect;
export type InsertUtilityInvoice = typeof utilityInvoices.$inferInsert;
export type UtilityPayment = typeof utilityPayments.$inferSelect;
export type InsertUtilityPayment = typeof utilityPayments.$inferInsert;

// SIWE Authentication Types
export type SiweNonce = typeof siweNonces.$inferSelect;
export type InsertSiweNonce = typeof siweNonces.$inferInsert;
export type WalletSession = typeof walletSessions.$inferSelect;
export type InsertWalletSession = typeof walletSessions.$inferInsert;

// KeyGrow Rent-to-Own Types
export type KeygrowProperty = typeof keygrowProperties.$inferSelect;
export type InsertKeygrowProperty = typeof keygrowProperties.$inferInsert;
export type KeygrowEnrollment = typeof keygrowEnrollments.$inferSelect;
export type InsertKeygrowEnrollment = typeof keygrowEnrollments.$inferInsert;
export type KeygrowPayment = typeof keygrowPayments.$inferSelect;
export type InsertKeygrowPayment = typeof keygrowPayments.$inferInsert;
export type KeygrowEquityTransfer = typeof keygrowEquityTransfers.$inferSelect;
export type InsertKeygrowEquityTransfer = typeof keygrowEquityTransfers.$inferInsert;
export type KeygrowPropertyDocument = typeof keygrowPropertyDocuments.$inferSelect;
export type InsertKeygrowPropertyDocument = typeof keygrowPropertyDocuments.$inferInsert;

// KeyGrow Extended Types
export type KeygrowSeller = typeof keygrowSellers.$inferSelect;
export type InsertKeygrowSeller = typeof keygrowSellers.$inferInsert;
export type KeygrowParticipationFee = typeof keygrowParticipationFees.$inferSelect;
export type InsertKeygrowParticipationFee = typeof keygrowParticipationFees.$inferInsert;
export type KeygrowPropertyToken = typeof keygrowPropertyTokens.$inferSelect;
export type InsertKeygrowPropertyToken = typeof keygrowPropertyTokens.$inferInsert;
export type KeygrowInvestorHolding = typeof keygrowInvestorHoldings.$inferSelect;
export type InsertKeygrowInvestorHolding = typeof keygrowInvestorHoldings.$inferInsert;
export type KeygrowShareOrder = typeof keygrowShareOrders.$inferSelect;
export type InsertKeygrowShareOrder = typeof keygrowShareOrders.$inferInsert;
export type KeygrowPropertyEnrichment = typeof keygrowPropertyEnrichment.$inferSelect;
export type InsertKeygrowPropertyEnrichment = typeof keygrowPropertyEnrichment.$inferInsert;
export type KeygrowEquitySchedule = typeof keygrowEquitySchedules.$inferSelect;
export type InsertKeygrowEquitySchedule = typeof keygrowEquitySchedules.$inferInsert;

// ============================================
// EARLY ACCESS SIGNUPS
// ============================================

export const earlyAccessSignups = pgTable("early_access_signups", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  referralCode: varchar("referral_code", { length: 50 }).unique().notNull(),
  referredBy: varchar("referred_by", { length: 50 }),
  referralCount: integer("referral_count").default(0).notNull(),
  referralReward: integer("referral_reward").default(0).notNull(),
  baseReward: integer("base_reward").default(100).notNull(),
  verified: boolean("verified").default(false).notNull(),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("early_access_email_idx").on(table.email),
  referralCodeIdx: index("early_access_referral_code_idx").on(table.referralCode),
  referredByIdx: index("early_access_referred_by_idx").on(table.referredBy),
}));

export type EarlyAccessSignup = typeof earlyAccessSignups.$inferSelect;
export type InsertEarlyAccessSignup = typeof earlyAccessSignups.$inferInsert;

// ============================================
// CONTACT FORM SUBMISSIONS
// ============================================

export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 100 }).notNull(),
  message: text("message").notNull(),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("contact_submissions_email_idx").on(table.email),
  createdAtIdx: index("contact_submissions_created_at_idx").on(table.createdAt),
}));

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;

// ============================================
// PMA (PRIVATE MEMBERSHIP ASSOCIATION) APPLICATIONS
// ============================================

export const pmaApplicationStatusEnum = pgEnum('pma_application_status', [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'withdrawn'
]);

export const pmaMembershipTypeEnum = pgEnum('pma_membership_type', [
  'founding',
  'standard',
  'associate'
]);

export const pmaApplications = pgTable("pma_applications", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }).unique().notNull(),
  membershipType: pmaMembershipTypeEnum("membership_type").default('standard').notNull(),
  country: varchar("country", { length: 10 }).notNull(),
  status: pmaApplicationStatusEnum("status").default('pending').notNull(),
  acceptedDeclaration: boolean("accepted_declaration").default(false).notNull(),
  acceptedBylaws: boolean("accepted_bylaws").default(false).notNull(),
  acceptedMembership: boolean("accepted_membership").default(false).notNull(),
  acceptedRisks: boolean("accepted_risks").default(false).notNull(),
  acceptedPrivate: boolean("accepted_private").default(false).notNull(),
  reviewNotes: text("review_notes"),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  reviewedAt: timestamp("reviewed_at"),
  memberNumber: varchar("member_number", { length: 20 }).unique(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("pma_applications_email_idx").on(table.email),
  walletIdx: index("pma_applications_wallet_idx").on(table.walletAddress),
  statusIdx: index("pma_applications_status_idx").on(table.status),
}));

export type PmaApplication = typeof pmaApplications.$inferSelect;
export type InsertPmaApplication = typeof pmaApplications.$inferInsert;

// ============================================
// SMS SUBSCRIBERS
// ============================================

export const smsSubscriberStatusEnum = pgEnum('sms_subscriber_status', [
  'active',
  'unsubscribed',
  'pending'
]);

export const smsSubscribers = pgTable("sms_subscribers", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  categories: text("categories").notNull(),
  status: smsSubscriberStatusEnum("status").default('active').notNull(),
  optInIp: varchar("opt_in_ip", { length: 45 }),
  optInTimestamp: timestamp("opt_in_timestamp").defaultNow().notNull(),
  optOutTimestamp: timestamp("opt_out_timestamp"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  phoneIdx: index("sms_subscribers_phone_idx").on(table.phone),
  statusIdx: index("sms_subscribers_status_idx").on(table.status),
}));

export type SmsSubscriber = typeof smsSubscribers.$inferSelect;
export type InsertSmsSubscriber = typeof smsSubscribers.$inferInsert;

// ============================================
// LEADS / EMAIL CAPTURE
// ============================================

export const leadSourceEnum = pgEnum('lead_source', [
  'equity_calculator',
  'academy',
  'keygrow',
  'susu',
  'whitepaper',
  'newsletter',
  'referral',
  'tiktok',
  'other'
]);

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  source: leadSourceEnum("source").default('other').notNull(),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),
  calculatorData: jsonb("calculator_data"),
  isSubscribed: boolean("is_subscribed").default(true).notNull(),
  isConverted: boolean("is_converted").default(false).notNull(),
  convertedAt: timestamp("converted_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("leads_email_idx").on(table.email),
  sourceIdx: index("leads_source_idx").on(table.source),
  createdAtIdx: index("leads_created_at_idx").on(table.createdAt),
}));

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ============================================
// ACADEMY COURSES & MEMBERSHIPS
// ============================================

export const academyMembershipTierEnum = pgEnum('academy_membership_tier', [
  'free',
  'basic',
  'pro',
  'enterprise'
]);

export const academyCourseStatusEnum = pgEnum('academy_course_status', [
  'draft',
  'published',
  'archived'
]);

export const academyCourses = pgTable("academy_courses", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  category: varchar("category", { length: 100 }).notNull(),
  difficulty: varchar("difficulty", { length: 20 }).default('beginner'),
  durationMinutes: integer("duration_minutes").default(0),
  lessonsCount: integer("lessons_count").default(0),
  requiredTier: academyMembershipTierEnum("required_tier").default('free').notNull(),
  status: academyCourseStatusEnum("status").default('draft').notNull(),
  isFeatured: boolean("is_featured").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("academy_courses_slug_idx").on(table.slug),
  categoryIdx: index("academy_courses_category_idx").on(table.category),
  statusIdx: index("academy_courses_status_idx").on(table.status),
}));

export const academyLessons = pgTable("academy_lessons", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => academyCourses.id).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  videoUrl: varchar("video_url", { length: 500 }),
  durationMinutes: integer("duration_minutes").default(0),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  courseIdx: index("academy_lessons_course_idx").on(table.courseId),
}));

export const academyMemberships = pgTable("academy_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tier: academyMembershipTierEnum("tier").default('free').notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("academy_memberships_user_idx").on(table.userId),
  stripeCustomerIdx: index("academy_memberships_stripe_customer_idx").on(table.stripeCustomerId),
}));

export const academyProgress = pgTable("academy_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => academyCourses.id).notNull(),
  lessonId: integer("lesson_id").references(() => academyLessons.id).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => ({
  userCourseIdx: index("academy_progress_user_course_idx").on(table.userId, table.courseId),
}));

export const academyCertificates = pgTable("academy_certificates", {
  id: serial("id").primaryKey(),
  certificateId: varchar("certificate_id", { length: 50 }).unique().notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => academyCourses.id).notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  shareableUrl: varchar("shareable_url", { length: 500 }),
}, (table) => ({
  userIdx: index("academy_certificates_user_idx").on(table.userId),
  certificateIdIdx: index("academy_certificates_id_idx").on(table.certificateId),
}));

export type AcademyCourse = typeof academyCourses.$inferSelect;
export type InsertAcademyCourse = typeof academyCourses.$inferInsert;
export type AcademyLesson = typeof academyLessons.$inferSelect;
export type InsertAcademyLesson = typeof academyLessons.$inferInsert;
export type AcademyMembership = typeof academyMemberships.$inferSelect;
export type InsertAcademyMembership = typeof academyMemberships.$inferInsert;
export type AcademyProgress = typeof academyProgress.$inferSelect;
export type AcademyCertificate = typeof academyCertificates.$inferSelect;

// ============================================
// PLATFORM IMPACT METRICS
// ============================================

export const platformMetrics = pgTable("platform_metrics", {
  id: serial("id").primaryKey(),
  metricDate: timestamp("metric_date").defaultNow().notNull(),
  totalMembers: integer("total_members").default(0),
  totalEquityDistributed: decimal("total_equity_distributed", { precision: 18, scale: 2 }).default('0'),
  keygrowEnrollments: integer("keygrow_enrollments").default(0),
  susuPoolsCreated: integer("susu_pools_created").default(0),
  susuTotalSaved: decimal("susu_total_saved", { precision: 18, scale: 2 }).default('0'),
  depinNodesActive: integer("depin_nodes_active").default(0),
  governanceProposals: integer("governance_proposals").default(0),
  carbonCreditsGenerated: decimal("carbon_credits_generated", { precision: 18, scale: 2 }).default('0'),
  academyCompletions: integer("academy_completions").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dateIdx: index("platform_metrics_date_idx").on(table.metricDate),
}));

export type PlatformMetric = typeof platformMetrics.$inferSelect;
export type InsertPlatformMetric = typeof platformMetrics.$inferInsert;

// ============================================
// WEALTH PRACTICE — REGIONAL INTEREST HUBS & PURPOSE GROUPS
// ============================================

export const susuRegionTypeEnum = pgEnum('susu_region_type', [
  'city',
  'metro',
  'state',
  'country'
]);

export const susuHubRoleEnum = pgEnum('susu_hub_role', [
  'member',
  'moderator',
  'regional_admin',
  'regional_owner'
]);

export const susuGroupRoleEnum = pgEnum('susu_group_role', [
  'member',
  'organizer'
]);

export const susuInviteStatusEnum = pgEnum('susu_invite_status', [
  'pending',
  'accepted',
  'declined',
  'expired'
]);

export const susuInterestHubs = pgTable("susu_interest_hubs", {
  id: serial("id").primaryKey(),
  regionId: varchar("region_id", { length: 100 }).notNull(),
  regionDisplay: varchar("region_display", { length: 200 }).notNull(),
  regionType: susuRegionTypeEnum("region_type").default('city'),
  description: text("description"),
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  memberCount: integer("member_count").default(0),
  createdBy: integer("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  regionIdIdx: index("susu_hubs_region_id_idx").on(table.regionId),
  isActiveIdx: index("susu_hubs_active_idx").on(table.isActive),
  memberCountIdx: index("susu_hubs_member_count_idx").on(table.memberCount),
}));

export const susuPurposeCategories = pgTable("susu_purpose_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const susuPurposeGroups = pgTable("susu_purpose_groups", {
  id: serial("id").primaryKey(),
  hubId: integer("hub_id").references(() => susuInterestHubs.id).notNull(),
  purposeCategoryId: integer("purpose_category_id").references(() => susuPurposeCategories.id).notNull(),
  customPurposeLabel: varchar("custom_purpose_label", { length: 200 }),
  contributionAmount: decimal("contribution_amount", { precision: 18, scale: 8 }).notNull(),
  contributionCurrency: varchar("contribution_currency", { length: 20 }).default('AXM'),
  cycleLengthDays: integer("cycle_length_days").notNull(),
  displayName: varchar("display_name", { length: 300 }),
  description: text("description"),
  memberCount: integer("member_count").default(0),
  minMembersToActivate: integer("min_members_to_activate").default(3),
  maxMembers: integer("max_members").default(50),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  graduatedToPoolId: integer("graduated_to_pool_id"),
  graduationTxHash: varchar("graduation_tx_hash", { length: 66 }),
  graduatedAt: timestamp("graduated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  hubIdIdx: index("susu_groups_hub_id_idx").on(table.hubId),
  purposeIdx: index("susu_groups_purpose_idx").on(table.purposeCategoryId),
  isActiveIdx: index("susu_groups_active_idx").on(table.isActive),
  graduatedIdx: index("susu_groups_graduated_idx").on(table.graduatedToPoolId),
}));

export const susuAnalyticsEventTypeEnum = pgEnum('susu_analytics_event_type', [
  'hub_join',
  'hub_leave',
  'group_join',
  'group_leave',
  'group_create',
  'graduation',
  'invitation_sent',
  'invitation_accepted'
]);

export const susuAnalyticsEvents = pgTable("susu_analytics_events", {
  id: serial("id").primaryKey(),
  eventType: susuAnalyticsEventTypeEnum("event_type").notNull(),
  hubId: integer("hub_id").references(() => susuInterestHubs.id),
  groupId: integer("group_id").references(() => susuPurposeGroups.id),
  userId: varchar("user_id", { length: 42 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  eventTypeIdx: index("susu_analytics_event_type_idx").on(table.eventType),
  hubIdIdx: index("susu_analytics_hub_id_idx").on(table.hubId),
  groupIdIdx: index("susu_analytics_group_id_idx").on(table.groupId),
  createdAtIdx: index("susu_analytics_created_at_idx").on(table.createdAt),
}));

export type SusuAnalyticsEvent = typeof susuAnalyticsEvents.$inferSelect;
export type InsertSusuAnalyticsEvent = typeof susuAnalyticsEvents.$inferInsert;

export const susuHubMembers = pgTable("susu_hub_members", {
  id: serial("id").primaryKey(),
  hubId: integer("hub_id").references(() => susuInterestHubs.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: susuHubRoleEnum("role").default('member'),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  hubUserIdx: index("susu_hub_members_hub_user_idx").on(table.hubId, table.userId),
  userIdx: index("susu_hub_members_user_idx").on(table.userId),
}));

export const susuGroupMembers = pgTable("susu_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => susuPurposeGroups.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: susuGroupRoleEnum("role").default('member'),
  commitmentConfirmed: boolean("commitment_confirmed").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  groupUserIdx: index("susu_group_members_group_user_idx").on(table.groupId, table.userId),
  userIdx: index("susu_group_members_user_idx").on(table.userId),
}));

export const susuPurposeRegistrations = pgTable("susu_purpose_registrations", {
  id: serial("id").primaryKey(),
  hubId: integer("hub_id").references(() => susuInterestHubs.id),
  groupId: integer("group_id").references(() => susuPurposeGroups.id),
  region: varchar("region", { length: 100 }).notNull(),
  purpose: varchar("purpose", { length: 100 }).notNull(),
  memberName: varchar("member_name", { length: 255 }).notNull(),
  memberEmail: varchar("member_email", { length: 255 }).notNull(),
  memberPhone: varchar("member_phone", { length: 50 }),
  commitmentAmount: decimal("commitment_amount", { precision: 10, scale: 2 }).notNull(),
  commitmentDuration: integer("commitment_duration").notNull(),
  status: varchar("status", { length: 50 }).default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  hubIdIdx: index("susu_registrations_hub_id_idx").on(table.hubId),
  groupIdIdx: index("susu_registrations_group_id_idx").on(table.groupId),
  emailIdx: index("susu_registrations_email_idx").on(table.memberEmail),
  statusIdx: index("susu_registrations_status_idx").on(table.status),
}));

export type SusuPurposeRegistration = typeof susuPurposeRegistrations.$inferSelect;
export type InsertSusuPurposeRegistration = typeof susuPurposeRegistrations.$inferInsert;

export const susuInvitations = pgTable("susu_invitations", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => susuPurposeGroups.id),
  hubId: integer("hub_id").references(() => susuInterestHubs.id),
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  inviteePhoneHash: varchar("invitee_phone_hash", { length: 128 }),
  inviteeName: varchar("invitee_name", { length: 100 }),
  status: susuInviteStatusEnum("status").default('pending'),
  token: varchar("token", { length: 64 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => ({
  tokenIdx: index("susu_invitations_token_idx").on(table.token),
  statusIdx: index("susu_invitations_status_idx").on(table.status),
}));

export type SusuInterestHub = typeof susuInterestHubs.$inferSelect;
export type InsertSusuInterestHub = typeof susuInterestHubs.$inferInsert;
export type SusuPurposeCategory = typeof susuPurposeCategories.$inferSelect;
export type InsertSusuPurposeCategory = typeof susuPurposeCategories.$inferInsert;
export type SusuPurposeGroup = typeof susuPurposeGroups.$inferSelect;
export type InsertSusuPurposeGroup = typeof susuPurposeGroups.$inferInsert;
export type SusuHubMember = typeof susuHubMembers.$inferSelect;
export type InsertSusuHubMember = typeof susuHubMembers.$inferInsert;
export type SusuGroupMember = typeof susuGroupMembers.$inferSelect;
export type InsertSusuGroupMember = typeof susuGroupMembers.$inferInsert;
export type SusuInvitation = typeof susuInvitations.$inferSelect;
export type InsertSusuInvitation = typeof susuInvitations.$inferInsert;

export const susuFeatureFlags = pgTable("susu_feature_flags", {
  id: serial("id").primaryKey(),
  flagKey: varchar("flag_key", { length: 100 }).unique().notNull(),
  flagValue: boolean("flag_value").default(false),
  description: text("description"),
  updatedBy: varchar("updated_by", { length: 42 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SusuFeatureFlag = typeof susuFeatureFlags.$inferSelect;
export type InsertSusuFeatureFlag = typeof susuFeatureFlags.$inferInsert;

// ==================== COMPLIANCE & TRUST CENTER TABLES ====================

export const complianceClaimStatusEnum = pgEnum('compliance_claim_status', [
  'active',
  'verified',
  'pending_verification',
  'deprecated',
  'retracted'
]);

export const complianceClaimCategoryEnum = pgEnum('compliance_claim_category', [
  'security',
  'tokenomics',
  'governance',
  'kyc_aml',
  'regulatory',
  'smart_contract',
  'treasury',
  'keygrow',
  'depin',
  'banking',
  'general'
]);

export const evidenceTypeEnum = pgEnum('evidence_type', [
  'contract_address',
  'transaction_hash',
  'document',
  'audit_report',
  'screenshot',
  'api_endpoint',
  'external_link',
  'code_reference'
]);

export const complaintStatusEnum = pgEnum('complaint_status', [
  'submitted',
  'under_review',
  'investigating',
  'resolved',
  'rejected',
  'escalated'
]);

export const complaintCategoryEnum = pgEnum('complaint_category', [
  'misleading_claim',
  'security_concern',
  'fund_dispute',
  'service_issue',
  'technical_bug',
  'regulatory_concern',
  'other'
]);

export const complianceClaims = pgTable("compliance_claims", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  category: complianceClaimCategoryEnum("category").notNull(),
  status: complianceClaimStatusEnum("status").default('active'),
  featureId: varchar("feature_id", { length: 100 }),
  contractAddress: varchar("contract_address", { length: 42 }),
  displayOrder: integer("display_order").default(0),
  isPublic: boolean("is_public").default(true),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("compliance_claims_category_idx").on(table.category),
  statusIdx: index("compliance_claims_status_idx").on(table.status),
  featureIdx: index("compliance_claims_feature_idx").on(table.featureId),
}));

export const complianceEvidence = pgTable("compliance_evidence", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => complianceClaims.id).notNull(),
  type: evidenceTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  url: text("url"),
  hash: varchar("hash", { length: 66 }),
  metadata: jsonb("metadata"),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  claimIdx: index("compliance_evidence_claim_idx").on(table.claimId),
  typeIdx: index("compliance_evidence_type_idx").on(table.type),
}));

export const complianceDisclosures = pgTable("compliance_disclosures", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  category: complianceClaimCategoryEnum("category").notNull(),
  featureId: varchar("feature_id", { length: 100 }),
  requiresAcknowledgement: boolean("requires_acknowledgement").default(false),
  displayLocation: varchar("display_location", { length: 100 }),
  isActive: boolean("is_active").default(true),
  effectiveDate: timestamp("effective_date").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("compliance_disclosures_category_idx").on(table.category),
  featureIdx: index("compliance_disclosures_feature_idx").on(table.featureId),
  activeIdx: index("compliance_disclosures_active_idx").on(table.isActive),
}));

export const complianceAcknowledgements = pgTable("compliance_acknowledgements", {
  id: serial("id").primaryKey(),
  disclosureId: integer("disclosure_id").references(() => complianceDisclosures.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  walletAddress: varchar("wallet_address", { length: 42 }),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
}, (table) => ({
  disclosureIdx: index("compliance_ack_disclosure_idx").on(table.disclosureId),
  userIdx: index("compliance_ack_user_idx").on(table.userId),
  walletIdx: index("compliance_ack_wallet_idx").on(table.walletAddress),
}));

export const complianceComplaints = pgTable("compliance_complaints", {
  id: serial("id").primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 20 }).unique().notNull(),
  category: complaintCategoryEnum("category").notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  description: text("description").notNull(),
  claimId: integer("claim_id").references(() => complianceClaims.id),
  status: complaintStatusEnum("status").default('submitted'),
  priority: varchar("priority", { length: 20 }).default('normal'),
  submitterEmail: varchar("submitter_email", { length: 255 }),
  submitterWallet: varchar("submitter_wallet", { length: 42 }),
  submitterId: integer("submitter_id").references(() => users.id),
  assignedTo: varchar("assigned_to", { length: 100 }),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  ticketIdx: index("compliance_complaints_ticket_idx").on(table.ticketNumber),
  statusIdx: index("compliance_complaints_status_idx").on(table.status),
  categoryIdx: index("compliance_complaints_category_idx").on(table.category),
  claimIdx: index("compliance_complaints_claim_idx").on(table.claimId),
}));

export const complianceComplaintUpdates = pgTable("compliance_complaint_updates", {
  id: serial("id").primaryKey(),
  complaintId: integer("complaint_id").references(() => complianceComplaints.id).notNull(),
  updateType: varchar("update_type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  isPublic: boolean("is_public").default(true),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  complaintIdx: index("compliance_updates_complaint_idx").on(table.complaintId),
}));

export const complianceEvents = pgTable("compliance_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  description: text("description"),
  metadata: jsonb("metadata"),
  performedBy: varchar("performed_by", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  eventTypeIdx: index("compliance_events_type_idx").on(table.eventType),
  entityIdx: index("compliance_events_entity_idx").on(table.entityType, table.entityId),
  createdAtIdx: index("compliance_events_created_idx").on(table.createdAt),
}));

export type ComplianceClaim = typeof complianceClaims.$inferSelect;
export type InsertComplianceClaim = typeof complianceClaims.$inferInsert;
export type ComplianceEvidence = typeof complianceEvidence.$inferSelect;
export type InsertComplianceEvidence = typeof complianceEvidence.$inferInsert;
export type ComplianceDisclosure = typeof complianceDisclosures.$inferSelect;
export type InsertComplianceDisclosure = typeof complianceDisclosures.$inferInsert;
export type ComplianceAcknowledgement = typeof complianceAcknowledgements.$inferSelect;
export type InsertComplianceAcknowledgement = typeof complianceAcknowledgements.$inferInsert;
export type ComplianceComplaint = typeof complianceComplaints.$inferSelect;
export type InsertComplianceComplaint = typeof complianceComplaints.$inferInsert;
export type ComplianceComplaintUpdate = typeof complianceComplaintUpdates.$inferSelect;
export type InsertComplianceComplaintUpdate = typeof complianceComplaintUpdates.$inferInsert;
export type ComplianceEvent = typeof complianceEvents.$inferSelect;
export type InsertComplianceEvent = typeof complianceEvents.$inferInsert;

// ==================== SUSU DUAL-MODE ARCHITECTURE ====================

export const susuModeEnum = pgEnum('susu_mode', [
  'community',
  'capital'
]);

export const susuModeThresholds = pgTable("susu_mode_thresholds", {
  id: serial("id").primaryKey(),
  thresholdKey: varchar("threshold_key", { length: 100 }).unique().notNull(),
  thresholdValue: decimal("threshold_value", { precision: 18, scale: 2 }).notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by", { length: 42 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const susuPurposeCategoryMultipliers = pgTable("susu_purpose_category_multipliers", {
  id: serial("id").primaryKey(),
  purposeCategoryId: integer("purpose_category_id").references(() => susuPurposeCategories.id).notNull(),
  multiplier: decimal("multiplier", { precision: 5, scale: 2 }).default('1.0'),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const susuCharters = pgTable("susu_charters", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => susuPurposeGroups.id),
  poolId: integer("pool_id"),
  version: integer("version").default(1),
  purpose: text("purpose").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  contributionAmount: decimal("contribution_amount", { precision: 18, scale: 8 }).notNull(),
  contributionFrequency: varchar("contribution_frequency", { length: 20 }).notNull(),
  startDate: timestamp("start_date"),
  rotationMethod: varchar("rotation_method", { length: 20 }).default('sequential'),
  payoutOrderLocked: boolean("payout_order_locked").default(false),
  gracePeriodDays: integer("grace_period_days").default(3),
  latePenaltyBps: integer("late_penalty_bps").default(0),
  exitPolicy: text("exit_policy"),
  disputePolicy: text("dispute_policy"),
  custodyModel: varchar("custody_model", { length: 30 }).default('non-custodial'),
  charterText: text("charter_text"),
  charterHash: varchar("charter_hash", { length: 66 }),
  effectiveDate: timestamp("effective_date"),
  mode: susuModeEnum("mode").default('community'),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  groupIdx: index("susu_charters_group_idx").on(table.groupId),
  poolIdx: index("susu_charters_pool_idx").on(table.poolId),
  modeIdx: index("susu_charters_mode_idx").on(table.mode),
}));

export const susuCharterAcceptances = pgTable("susu_charter_acceptances", {
  id: serial("id").primaryKey(),
  charterId: integer("charter_id").references(() => susuCharters.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  charterVersion: integer("charter_version").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow(),
  walletSignature: text("wallet_signature"),
  ipAddress: varchar("ip_address", { length: 45 }),
}, (table) => ({
  charterUserIdx: index("susu_charter_acceptances_charter_user_idx").on(table.charterId, table.userId),
}));

export const susuReliabilityProfiles = pgTable("susu_reliability_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).unique().notNull(),
  totalPoolsJoined: integer("total_pools_joined").default(0),
  totalPoolsCompleted: integer("total_pools_completed").default(0),
  totalContributions: integer("total_contributions").default(0),
  onTimeContributions: integer("on_time_contributions").default(0),
  lateContributions: integer("late_contributions").default(0),
  missedContributions: integer("missed_contributions").default(0),
  earlyExits: integer("early_exits").default(0),
  ejections: integer("ejections").default(0),
  reliabilityScore: decimal("reliability_score", { precision: 5, scale: 2 }).default('100.00'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("susu_reliability_user_idx").on(table.userId),
  scoreIdx: index("susu_reliability_score_idx").on(table.reliabilityScore),
}));

export const susuMissionCards = pgTable("susu_mission_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  goalDescription: text("goal_description"),
  targetAmount: decimal("target_amount", { precision: 18, scale: 2 }),
  currentAmount: decimal("current_amount", { precision: 18, scale: 2 }).default('0'),
  targetDate: timestamp("target_date"),
  purposeCategoryId: integer("purpose_category_id").references(() => susuPurposeCategories.id),
  isPublic: boolean("is_public").default(true),
  shareCount: integer("share_count").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("susu_mission_cards_user_idx").on(table.userId),
  publicIdx: index("susu_mission_cards_public_idx").on(table.isPublic),
}));

export const susuTemplates = pgTable("susu_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  purposeCategoryId: integer("purpose_category_id").references(() => susuPurposeCategories.id),
  suggestedContribution: decimal("suggested_contribution", { precision: 18, scale: 8 }),
  suggestedCycleDays: integer("suggested_cycle_days"),
  suggestedMemberCount: integer("suggested_member_count"),
  rotationMethod: varchar("rotation_method", { length: 20 }).default('sequential'),
  defaultCharterText: text("default_charter_text"),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  purposeIdx: index("susu_templates_purpose_idx").on(table.purposeCategoryId),
  activeIdx: index("susu_templates_active_idx").on(table.isActive),
}));

export type SusuModeThreshold = typeof susuModeThresholds.$inferSelect;
export type InsertSusuModeThreshold = typeof susuModeThresholds.$inferInsert;
export type SusuCharter = typeof susuCharters.$inferSelect;
export type InsertSusuCharter = typeof susuCharters.$inferInsert;
export type SusuCharterAcceptance = typeof susuCharterAcceptances.$inferSelect;
export type InsertSusuCharterAcceptance = typeof susuCharterAcceptances.$inferInsert;
export type SusuReliabilityProfile = typeof susuReliabilityProfiles.$inferSelect;
export type InsertSusuReliabilityProfile = typeof susuReliabilityProfiles.$inferInsert;
export type SusuMissionCard = typeof susuMissionCards.$inferSelect;
export type InsertSusuMissionCard = typeof susuMissionCards.$inferInsert;
export type SusuTemplate = typeof susuTemplates.$inferSelect;
export type InsertSusuTemplate = typeof susuTemplates.$inferInsert;

// ============================================
// SUSU Risk Mitigation Tables (December 2025)
// ============================================

// Collateral stake status enum
export const susuCollateralStatusEnum = pgEnum('susu_collateral_status', [
  'staked',      // Active stake
  'released',    // Successfully completed, returned to member
  'forfeited',   // Member defaulted, stake claimed
  'partial_forfeit' // Partial default, partial claim
]);

// 1. Collateral Staking - Members stake AXM tokens as security deposit
export const susuCollateralStakes = pgTable("susu_collateral_stakes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  groupId: integer("group_id").references(() => susuPurposeGroups.id),
  poolId: varchar("pool_id", { length: 100 }), // On-chain pool ID
  stakeAmount: decimal("stake_amount", { precision: 18, scale: 8 }).notNull(),
  tokenType: varchar("token_type", { length: 20 }).default('AXM'), // AXM or stablecoin
  status: susuCollateralStatusEnum("status").default('staked'),
  stakeTxHash: varchar("stake_tx_hash", { length: 66 }),
  releaseTxHash: varchar("release_tx_hash", { length: 66 }),
  forfeitTxHash: varchar("forfeit_tx_hash", { length: 66 }),
  forfeitAmount: decimal("forfeit_amount", { precision: 18, scale: 8 }),
  forfeitReason: text("forfeit_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  releasedAt: timestamp("released_at"),
  forfeitedAt: timestamp("forfeited_at"),
}, (table) => ({
  userIdx: index("susu_collateral_user_idx").on(table.userId),
  groupIdx: index("susu_collateral_group_idx").on(table.groupId),
  poolIdx: index("susu_collateral_pool_idx").on(table.poolId),
  statusIdx: index("susu_collateral_status_idx").on(table.status),
}));

// Vetting request status enum
export const susuVettingStatusEnum = pgEnum('susu_vetting_status', [
  'pending',     // Awaiting votes
  'approved',    // Member accepted
  'rejected',    // Member denied
  'expired',     // Voting period ended without quorum
  'withdrawn'    // Applicant withdrew
]);

// 2. Mutual Vetting - Vetting requests for new members
export const susuVettingRequests = pgTable("susu_vetting_requests", {
  id: serial("id").primaryKey(),
  applicantUserId: integer("applicant_user_id").references(() => users.id).notNull(),
  groupId: integer("group_id").references(() => susuPurposeGroups.id).notNull(),
  status: susuVettingStatusEnum("status").default('pending'),
  votesRequired: integer("votes_required").default(3), // Min votes for quorum
  approvalThreshold: decimal("approval_threshold", { precision: 5, scale: 2 }).default('0.66'), // 66% approval
  votingDeadline: timestamp("voting_deadline"),
  applicationMessage: text("application_message"),
  reliabilityScoreAtApplication: integer("reliability_score_at_application"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  applicantIdx: index("susu_vetting_applicant_idx").on(table.applicantUserId),
  groupIdx: index("susu_vetting_group_idx").on(table.groupId),
  statusIdx: index("susu_vetting_status_idx").on(table.status),
}));

// Vetting votes from existing members
export const susuVettingVotes = pgTable("susu_vetting_votes", {
  id: serial("id").primaryKey(),
  vettingRequestId: integer("vetting_request_id").references(() => susuVettingRequests.id).notNull(),
  voterUserId: integer("voter_user_id").references(() => users.id).notNull(),
  vote: boolean("vote").notNull(), // true = approve, false = reject
  voteReason: text("vote_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  requestVoterIdx: index("susu_vetting_votes_request_voter_idx").on(table.vettingRequestId, table.voterUserId),
}));

// 3. Payout Priority Configuration per group
export const susuPayoutPriorityConfigs = pgTable("susu_payout_priority_configs", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => susuPurposeGroups.id),
  poolId: varchar("pool_id", { length: 100 }),
  priorityMethod: varchar("priority_method", { length: 30 }).default('reliability'), // reliability, hybrid, random
  reliabilityWeight: decimal("reliability_weight", { precision: 5, scale: 2 }).default('0.70'), // 70% weight for reliability
  tenureWeight: decimal("tenure_weight", { precision: 5, scale: 2 }).default('0.20'), // 20% weight for time in group
  collateralWeight: decimal("collateral_weight", { precision: 5, scale: 2 }).default('0.10'), // 10% weight for collateral amount
  minReliabilityForEarlyPayout: integer("min_reliability_for_early_payout").default(80),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  groupIdx: index("susu_priority_group_idx").on(table.groupId),
  poolIdx: index("susu_priority_pool_idx").on(table.poolId),
}));

// Calculated payout order for members
export const susuPayoutOrder = pgTable("susu_payout_order", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => susuPurposeGroups.id),
  poolId: varchar("pool_id", { length: 100 }),
  userId: integer("user_id").references(() => users.id).notNull(),
  payoutPosition: integer("payout_position").notNull(), // 1 = first, 2 = second, etc.
  priorityScore: decimal("priority_score", { precision: 8, scale: 4 }),
  reliabilityComponent: decimal("reliability_component", { precision: 8, scale: 4 }),
  tenureComponent: decimal("tenure_component", { precision: 8, scale: 4 }),
  collateralComponent: decimal("collateral_component", { precision: 8, scale: 4 }),
  isPaid: boolean("is_paid").default(false),
  paidAt: timestamp("paid_at"),
  payoutTxHash: varchar("payout_tx_hash", { length: 66 }),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => ({
  groupUserIdx: index("susu_payout_order_group_user_idx").on(table.groupId, table.userId),
  poolUserIdx: index("susu_payout_order_pool_user_idx").on(table.poolId, table.userId),
  positionIdx: index("susu_payout_order_position_idx").on(table.payoutPosition),
}));

// 4. Insurance Pool - Protocol fee allocation for default coverage
export const susuInsurancePools = pgTable("susu_insurance_pools", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).default('Global SUSU Insurance Pool'),
  totalBalance: decimal("total_balance", { precision: 18, scale: 8 }).default('0'),
  totalContributions: decimal("total_contributions", { precision: 18, scale: 8 }).default('0'),
  totalClaimsPaid: decimal("total_claims_paid", { precision: 18, scale: 8 }).default('0'),
  feeAllocationPercent: decimal("fee_allocation_percent", { precision: 5, scale: 2 }).default('25.00'), // 25% of protocol fees
  maxClaimPercent: decimal("max_claim_percent", { precision: 5, scale: 2 }).default('80.00'), // Max 80% coverage per claim
  minPoolBalance: decimal("min_pool_balance", { precision: 18, scale: 8 }).default('1000'), // Minimum reserve
  isActive: boolean("is_active").default(true),
  lastContributionAt: timestamp("last_contribution_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insurance contributions from protocol fees
export const susuInsuranceContributions = pgTable("susu_insurance_contributions", {
  id: serial("id").primaryKey(),
  insurancePoolId: integer("insurance_pool_id").references(() => susuInsurancePools.id).notNull(),
  sourcePoolId: varchar("source_pool_id", { length: 100 }), // Which SUSU pool the fee came from
  sourceGroupId: integer("source_group_id").references(() => susuPurposeGroups.id),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  originalFeeAmount: decimal("original_fee_amount", { precision: 18, scale: 8 }),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  poolIdx: index("susu_insurance_contrib_pool_idx").on(table.insurancePoolId),
  sourcePoolIdx: index("susu_insurance_contrib_source_idx").on(table.sourcePoolId),
}));

// Insurance claim status enum
export const susuInsuranceClaimStatusEnum = pgEnum('susu_insurance_claim_status', [
  'pending',     // Awaiting review
  'approved',    // Claim approved, payment pending
  'paid',        // Claim paid out
  'partial',     // Partially paid (pool had insufficient funds)
  'rejected',    // Claim denied
  'withdrawn'    // Claimant withdrew
]);

// Insurance claims for defaults
export const susuInsuranceClaims = pgTable("susu_insurance_claims", {
  id: serial("id").primaryKey(),
  insurancePoolId: integer("insurance_pool_id").references(() => susuInsurancePools.id).notNull(),
  claimantUserId: integer("claimant_user_id").references(() => users.id).notNull(), // Member who missed payout
  defaulterUserId: integer("defaulter_user_id").references(() => users.id).notNull(), // Member who defaulted
  groupId: integer("group_id").references(() => susuPurposeGroups.id),
  poolId: varchar("pool_id", { length: 100 }),
  cycleNumber: integer("cycle_number"),
  claimAmount: decimal("claim_amount", { precision: 18, scale: 8 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 18, scale: 8 }),
  paidAmount: decimal("paid_amount", { precision: 18, scale: 8 }),
  status: susuInsuranceClaimStatusEnum("status").default('pending'),
  claimReason: text("claim_reason"),
  reviewNotes: text("review_notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  payoutTxHash: varchar("payout_tx_hash", { length: 66 }),
  collateralRecovered: decimal("collateral_recovered", { precision: 18, scale: 8 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  paidAt: timestamp("paid_at"),
}, (table) => ({
  poolIdx: index("susu_claims_pool_idx").on(table.insurancePoolId),
  claimantIdx: index("susu_claims_claimant_idx").on(table.claimantUserId),
  defaulterIdx: index("susu_claims_defaulter_idx").on(table.defaulterUserId),
  statusIdx: index("susu_claims_status_idx").on(table.status),
  groupIdx: index("susu_claims_group_idx").on(table.groupId),
}));

// Risk mitigation settings per group
export const susuRiskSettings = pgTable("susu_risk_settings", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => susuPurposeGroups.id),
  poolId: varchar("pool_id", { length: 100 }),
  // Collateral settings
  collateralRequired: boolean("collateral_required").default(false),
  minCollateralAmount: decimal("min_collateral_amount", { precision: 18, scale: 8 }),
  collateralMultiplier: decimal("collateral_multiplier", { precision: 5, scale: 2 }).default('1.00'), // 1x contribution
  // Vetting settings
  vettingRequired: boolean("vetting_required").default(false),
  vettingVotesRequired: integer("vetting_votes_required").default(3),
  vettingApprovalThreshold: decimal("vetting_approval_threshold", { precision: 5, scale: 2 }).default('0.66'),
  vettingPeriodDays: integer("vetting_period_days").default(3),
  // Priority settings
  priorityEnabled: boolean("priority_enabled").default(true),
  priorityMethod: varchar("priority_method", { length: 30 }).default('reliability'),
  // Insurance settings
  insuranceEnabled: boolean("insurance_enabled").default(true),
  insurancePoolId: integer("insurance_pool_id").references(() => susuInsurancePools.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  groupIdx: index("susu_risk_settings_group_idx").on(table.groupId),
  poolIdx: index("susu_risk_settings_pool_idx").on(table.poolId),
}));

// Export types for risk mitigation tables
export type SusuCollateralStake = typeof susuCollateralStakes.$inferSelect;
export type InsertSusuCollateralStake = typeof susuCollateralStakes.$inferInsert;
export type SusuVettingRequest = typeof susuVettingRequests.$inferSelect;
export type InsertSusuVettingRequest = typeof susuVettingRequests.$inferInsert;
export type SusuVettingVote = typeof susuVettingVotes.$inferSelect;
export type InsertSusuVettingVote = typeof susuVettingVotes.$inferInsert;
export type SusuPayoutPriorityConfig = typeof susuPayoutPriorityConfigs.$inferSelect;
export type InsertSusuPayoutPriorityConfig = typeof susuPayoutPriorityConfigs.$inferInsert;
export type SusuPayoutOrder = typeof susuPayoutOrder.$inferSelect;
export type InsertSusuPayoutOrder = typeof susuPayoutOrder.$inferInsert;
export type SusuInsurancePool = typeof susuInsurancePools.$inferSelect;
export type InsertSusuInsurancePool = typeof susuInsurancePools.$inferInsert;
export type SusuInsuranceContribution = typeof susuInsuranceContributions.$inferSelect;
export type InsertSusuInsuranceContribution = typeof susuInsuranceContributions.$inferInsert;
export type SusuInsuranceClaim = typeof susuInsuranceClaims.$inferSelect;
export type InsertSusuInsuranceClaim = typeof susuInsuranceClaims.$inferInsert;
export type SusuRiskSettings = typeof susuRiskSettings.$inferSelect;
export type InsertSusuRiskSettings = typeof susuRiskSettings.$inferInsert;

// ==== POLICY GUARD SYSTEM - Member Credentials & Reputation ====

// Member credentials for identity verification and trust tracking
export const memberCredentials = pgTable("member_credentials", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).unique().notNull(),
  isVerified: boolean("is_verified").default(false),
  verificationLevel: integer("verification_level").default(0),
  verifiedAt: timestamp("verified_at"),
  reputationScore: integer("reputation_score").default(50),
  completedRotations: integer("completed_rotations").default(0),
  defaultCount: integer("default_count").default(0),
  onTimePayments: integer("on_time_payments").default(0),
  latePayments: integer("late_payments").default(0),
  totalContributed: decimal("total_contributed", { precision: 18, scale: 8 }).default('0'),
  totalReceived: decimal("total_received", { precision: 18, scale: 8 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("member_credentials_wallet_idx").on(table.walletAddress),
  reputationIdx: index("member_credentials_reputation_idx").on(table.reputationScore),
}));

// Policy commitments for 2-rotation minimum agreements
export const policyCommitments = pgTable("policy_commitments", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  poolId: integer("pool_id").notNull(),
  minRotations: integer("min_rotations").default(2),
  completedRotations: integer("completed_rotations").default(0),
  signedAt: timestamp("signed_at"),
  fulfilledAt: timestamp("fulfilled_at"),
  breachedAt: timestamp("breached_at"),
  forfeitAmount: decimal("forfeit_amount", { precision: 18, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletPoolIdx: index("policy_commitments_wallet_pool_idx").on(table.walletAddress, table.poolId),
  walletIdx: index("policy_commitments_wallet_idx").on(table.walletAddress),
}));

// Reputation events for tracking member behavior
export const reputationEventTypeEnum = pgEnum('reputation_event_type', [
  'contribution',
  'payout_received',
  'rotation_completed',
  'default',
  'early_exit',
  'on_time_payment',
  'late_payment',
  'identity_verified',
  'vouched_for_member',
  'received_vouch'
]);

export const reputationSeverityEnum = pgEnum('reputation_severity', [
  'positive',
  'neutral',
  'negative'
]);

export const reputationEvents = pgTable("reputation_events", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  eventType: reputationEventTypeEnum("event_type").notNull(),
  severity: reputationSeverityEnum("severity").notNull(),
  scoreChange: integer("score_change").default(0),
  poolId: integer("pool_id"),
  groupId: integer("group_id"),
  metadata: jsonb("metadata"),
  oracleTxHash: varchar("oracle_tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletIdx: index("reputation_events_wallet_idx").on(table.walletAddress),
  eventTypeIdx: index("reputation_events_type_idx").on(table.eventType),
  createdAtIdx: index("reputation_events_created_idx").on(table.createdAt),
}));

// Export types for policy guard tables
export type MemberCredential = typeof memberCredentials.$inferSelect;
export type InsertMemberCredential = typeof memberCredentials.$inferInsert;
export type PolicyCommitment = typeof policyCommitments.$inferSelect;
export type InsertPolicyCommitment = typeof policyCommitments.$inferInsert;
export type ReputationEvent = typeof reputationEvents.$inferSelect;
export type InsertReputationEvent = typeof reputationEvents.$inferInsert;

// Organizer certification level enum
export const organizerCertLevelEnum = pgEnum('organizer_cert_level', [
  'none',
  'foundation',
  'certified',
  'master'
]);

// Organizer training progress
export const organizerTrainingProgress = pgTable("organizer_training_progress", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  moduleId: varchar("module_id", { length: 50 }).notNull(),
  quizScore: integer("quiz_score"),
  passed: boolean("passed").default(false),
  attempts: integer("attempts").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletModuleIdx: index("organizer_training_wallet_module_idx").on(table.walletAddress, table.moduleId),
  walletIdx: index("organizer_training_wallet_idx").on(table.walletAddress),
}));

// Organizer certifications earned
export const organizerCertifications = pgTable("organizer_certifications", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  certificationLevel: organizerCertLevelEnum("certification_level").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletIdx: index("organizer_cert_wallet_idx").on(table.walletAddress),
  levelIdx: index("organizer_cert_level_idx").on(table.certificationLevel),
}));

// Export types for organizer training
export type OrganizerTrainingProgress = typeof organizerTrainingProgress.$inferSelect;
export type InsertOrganizerTrainingProgress = typeof organizerTrainingProgress.$inferInsert;
export type OrganizerCertification = typeof organizerCertifications.$inferSelect;
export type InsertOrganizerCertification = typeof organizerCertifications.$inferInsert;

// Onramp provider and status enums
export const onrampProviderEnum = pgEnum('onramp_provider', [
  'coinbase',
  'ramp',
  'transak'
]);

export const onrampStatusEnum = pgEnum('onramp_status', [
  'created',
  'pending',
  'completed',
  'failed'
]);

// Onramp purchase intents - tracks fiat-to-crypto purchases
export const onrampPurchaseIntents = pgTable("onramp_purchase_intents", {
  id: serial("id").primaryKey(),
  intentId: varchar("intent_id", { length: 64 }).unique().notNull(),
  userId: varchar("user_id", { length: 255 }),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  provider: onrampProviderEnum("provider").notNull(),
  chainId: integer("chain_id").notNull(),
  asset: varchar("asset", { length: 20 }).notNull(),
  fiatCurrency: varchar("fiat_currency", { length: 10 }).notNull(),
  fiatAmount: decimal("fiat_amount", { precision: 18, scale: 2 }).notNull(),
  cryptoAmountEstimate: decimal("crypto_amount_estimate", { precision: 18, scale: 8 }),
  status: onrampStatusEnum("status").default('created').notNull(),
  providerReference: varchar("provider_reference", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("onramp_intents_wallet_idx").on(table.walletAddress),
  statusIdx: index("onramp_intents_status_idx").on(table.status),
  providerIdx: index("onramp_intents_provider_idx").on(table.provider),
  intentIdIdx: index("onramp_intents_intent_id_idx").on(table.intentId),
}));

// Export types for onramp
export type OnrampPurchaseIntent = typeof onrampPurchaseIntents.$inferSelect;
export type InsertOnrampPurchaseIntent = typeof onrampPurchaseIntents.$inferInsert;

// Error log level enum
export const errorLogLevelEnum = pgEnum('error_log_level', [
  'error',
  'warn',
  'info',
  'debug'
]);

// Error logs table for development monitoring
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  level: errorLogLevelEnum("level").notNull(),
  message: text("message").notNull(),
  path: varchar("path", { length: 500 }),
  method: varchar("method", { length: 10 }),
  statusCode: integer("status_code"),
  stack: text("stack"),
  userAgent: text("user_agent"),
  requestBody: jsonb("request_body"),
  additionalInfo: jsonb("additional_info"),
  source: varchar("source", { length: 50 }).default('server'),
  environment: varchar("environment", { length: 20 }).default('development'),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  levelIdx: index("error_logs_level_idx").on(table.level),
  createdAtIdx: index("error_logs_created_at_idx").on(table.createdAt),
  resolvedIdx: index("error_logs_resolved_idx").on(table.resolved),
}));

// Export types for error logs
export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

// ============================================
// WEALTH ENGINE V2 - SOVEREIGN BANKING TABLES
// ============================================

// Yield Vault position status enum
export const vaultPositionStatusEnum = pgEnum('vault_position_status', [
  'active',
  'withdrawn',
  'compounding'
]);

// Yield Vault positions - persistent storage for auto-compound staking
export const yieldVaultPositions = pgTable("yield_vault_positions", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 24, scale: 8 }).default('0').notNull(),
  rewardsAccrued: decimal("rewards_accrued", { precision: 24, scale: 8 }).default('0').notNull(),
  autoCompoundEnabled: boolean("auto_compound_enabled").default(true),
  lastCompoundAt: timestamp("last_compound_at"),
  totalCompounded: decimal("total_compounded", { precision: 24, scale: 8 }).default('0'),
  status: vaultPositionStatusEnum("status").default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("vault_positions_wallet_idx").on(table.walletAddress),
  statusIdx: index("vault_positions_status_idx").on(table.status),
}));

// Yield Vault compound history
export const yieldVaultCompoundHistory = pgTable("yield_vault_compound_history", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  amountCompounded: decimal("amount_compounded", { precision: 24, scale: 8 }).notNull(),
  newTotal: decimal("new_total", { precision: 24, scale: 8 }).notNull(),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletIdx: index("vault_compound_wallet_idx").on(table.walletAddress),
}));

// Treasury fee events - tracks fees routed through AxiomFeeBurner
export const treasuryFeeEvents = pgTable("treasury_fee_events", {
  id: serial("id").primaryKey(),
  productType: varchar("product_type", { length: 50 }).notNull(),
  feeAmount: decimal("fee_amount", { precision: 24, scale: 8 }).notNull(),
  sourceAddress: varchar("source_address", { length: 42 }),
  txHash: varchar("tx_hash", { length: 66 }),
  buybackExecuted: boolean("buyback_executed").default(false),
  axmBurned: decimal("axm_burned", { precision: 24, scale: 8 }),
  veAxmRewards: decimal("ve_axm_rewards", { precision: 24, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  productIdx: index("fee_events_product_idx").on(table.productType),
  buybackIdx: index("fee_events_buyback_idx").on(table.buybackExecuted),
}));

// Badge NFT mints - tracks achievement badge minting
export const badgeMints = pgTable("badge_mints", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  badgeId: varchar("badge_id", { length: 50 }).notNull(),
  badgeName: varchar("badge_name", { length: 100 }).notNull(),
  badgeRarity: varchar("badge_rarity", { length: 20 }).notNull(),
  tokenId: integer("token_id"),
  txHash: varchar("tx_hash", { length: 66 }),
  mintedAt: timestamp("minted_at").defaultNow(),
  metadata: jsonb("metadata"),
}, (table) => ({
  walletIdx: index("badge_mints_wallet_idx").on(table.walletAddress),
  badgeIdx: index("badge_mints_badge_idx").on(table.badgeId),
}));

// Referral reward claims - tracks on-chain referral payouts
export const referralRewardClaims = pgTable("referral_reward_claims", {
  id: serial("id").primaryKey(),
  referrerAddress: varchar("referrer_address", { length: 42 }).notNull(),
  referredAddress: varchar("referred_address", { length: 42 }).notNull(),
  rewardAmount: decimal("reward_amount", { precision: 24, scale: 8 }).notNull(),
  rewardType: varchar("reward_type", { length: 50 }).notNull(),
  txHash: varchar("tx_hash", { length: 66 }),
  claimedAt: timestamp("claimed_at").defaultNow(),
}, (table) => ({
  referrerIdx: index("referral_claims_referrer_idx").on(table.referrerAddress),
}));

// DePIN reward diversions - tracks 5% diversion to SusuInsuranceFund
export const depinRewardDiversions = pgTable("depin_reward_diversions", {
  id: serial("id").primaryKey(),
  nodeId: varchar("node_id", { length: 100 }).notNull(),
  nodeOwnerAddress: varchar("node_owner_address", { length: 42 }).notNull(),
  totalReward: decimal("total_reward", { precision: 24, scale: 8 }).notNull(),
  diversionAmount: decimal("diversion_amount", { precision: 24, scale: 8 }).notNull(),
  diversionPercent: decimal("diversion_percent", { precision: 5, scale: 2 }).default('5.00'),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nodeIdx: index("depin_diversions_node_idx").on(table.nodeId),
  ownerIdx: index("depin_diversions_owner_idx").on(table.nodeOwnerAddress),
}));

// Credit score updates - tracks score changes from SUSU repayments
export const creditScoreUpdates = pgTable("credit_score_updates", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  previousScore: integer("previous_score"),
  newScore: integer("new_score").notNull(),
  changeReason: varchar("change_reason", { length: 100 }).notNull(),
  susuPoolId: integer("susu_pool_id"),
  repaymentAmount: decimal("repayment_amount", { precision: 24, scale: 8 }),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletIdx: index("credit_updates_wallet_idx").on(table.walletAddress),
  poolIdx: index("credit_updates_pool_idx").on(table.susuPoolId),
}));

// Protocol metrics snapshots - for transparency dashboard
export const protocolMetricsSnapshots = pgTable("protocol_metrics_snapshots", {
  id: serial("id").primaryKey(),
  totalValueLocked: decimal("total_value_locked", { precision: 24, scale: 8 }),
  totalAxmBurned: decimal("total_axm_burned", { precision: 24, scale: 8 }),
  totalVeAxmLocked: decimal("total_ve_axm_locked", { precision: 24, scale: 8 }),
  totalVeAxmHolders: integer("total_ve_axm_holders"),
  insuranceFundBalance: decimal("insurance_fund_balance", { precision: 24, scale: 8 }),
  totalFeesCollected: decimal("total_fees_collected", { precision: 24, scale: 8 }),
  totalSusuCircles: integer("total_susu_circles"),
  totalDepinNodes: integer("total_depin_nodes"),
  averageCreditScore: integer("average_credit_score"),
  snapshotAt: timestamp("snapshot_at").defaultNow(),
}, (table) => ({
  snapshotIdx: index("protocol_metrics_snapshot_idx").on(table.snapshotAt),
}));

// Lock challenge badges - gamified lock duration achievements
export const lockChallengeBadges = pgTable("lock_challenge_badges", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  badgeType: varchar("badge_type", { length: 50 }).notNull(),
  badgeName: varchar("badge_name", { length: 100 }).notNull(),
  lockDurationYears: integer("lock_duration_years").notNull(),
  lockAmount: decimal("lock_amount", { precision: 24, scale: 8 }).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  displayOnProfile: boolean("display_on_profile").default(true),
  metadata: jsonb("metadata"),
}, (table) => ({
  walletIdx: index("lock_badges_wallet_idx").on(table.walletAddress),
  typeIdx: index("lock_badges_type_idx").on(table.badgeType),
}));

// Node referral bonuses - rewards for node operator referrals
export const nodeReferralBonuses = pgTable("node_referral_bonuses", {
  id: serial("id").primaryKey(),
  referrerAddress: varchar("referrer_address", { length: 42 }).notNull(),
  referredAddress: varchar("referred_address", { length: 42 }).notNull(),
  nodeId: varchar("node_id", { length: 100 }).notNull(),
  nodeTier: varchar("node_tier", { length: 50 }).notNull(),
  nodePurchaseAmount: decimal("node_purchase_amount", { precision: 24, scale: 8 }).notNull(),
  bonusAmount: decimal("bonus_amount", { precision: 24, scale: 8 }).notNull(),
  bonusPercent: decimal("bonus_percent", { precision: 5, scale: 2 }).default('5.00'),
  status: varchar("status", { length: 20 }).default('pending'),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
}, (table) => ({
  referrerIdx: index("node_referrals_referrer_idx").on(table.referrerAddress),
  referredIdx: index("node_referrals_referred_idx").on(table.referredAddress),
}));

// Insurance claims history - public log of SUSU insurance claims
export const insuranceClaims = pgTable("insurance_claims", {
  id: serial("id").primaryKey(),
  claimantAddress: varchar("claimant_address", { length: 42 }).notNull(),
  susuPoolId: integer("susu_pool_id").notNull(),
  susuPoolName: varchar("susu_pool_name", { length: 100 }),
  claimAmount: decimal("claim_amount", { precision: 24, scale: 8 }).notNull(),
  claimReason: varchar("claim_reason", { length: 200 }).notNull(),
  status: varchar("status", { length: 20 }).default('pending'),
  approvedBy: varchar("approved_by", { length: 42 }),
  txHash: varchar("tx_hash", { length: 66 }),
  submittedAt: timestamp("submitted_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata"),
}, (table) => ({
  claimantIdx: index("insurance_claims_claimant_idx").on(table.claimantAddress),
  poolIdx: index("insurance_claims_pool_idx").on(table.susuPoolId),
  statusIdx: index("insurance_claims_status_idx").on(table.status),
}));

// Weekly digest subscriptions - for protocol activity summaries
export const weeklyDigestSubscriptions = pgTable("weekly_digest_subscriptions", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  subscribed: boolean("subscribed").default(true),
  lastSentAt: timestamp("last_sent_at"),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletIdx: index("digest_subs_wallet_idx").on(table.walletAddress),
}));

// Credit score actions - tracks which actions improve credit scores
export const creditScoreActions = pgTable("credit_score_actions", {
  id: serial("id").primaryKey(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionName: varchar("action_name", { length: 100 }).notNull(),
  description: text("description"),
  pointsValue: integer("points_value").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Node upgrade transactions - tracks upgrade path purchases
export const nodeUpgrades = pgTable("node_upgrades", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  fromNodeId: varchar("from_node_id", { length: 100 }).notNull(),
  fromTier: varchar("from_tier", { length: 50 }).notNull(),
  toTier: varchar("to_tier", { length: 50 }).notNull(),
  creditAmount: decimal("credit_amount", { precision: 24, scale: 8 }).notNull(),
  additionalPayment: decimal("additional_payment", { precision: 24, scale: 8 }).notNull(),
  newNodeId: varchar("new_node_id", { length: 100 }),
  status: varchar("status", { length: 20 }).default('pending'),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  walletIdx: index("node_upgrades_wallet_idx").on(table.walletAddress),
}));

// User quest progress tracking for milestone quests
export const userQuestProgress = pgTable("user_quest_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  questId: varchar("quest_id", { length: 50 }).notNull(),
  progress: integer("progress").default(0),
  maxProgress: integer("max_progress").default(1),
  status: varchar("status", { length: 20 }).default('active'),
  xpEarned: integer("xp_earned").default(0),
  axmEarned: decimal("axm_earned", { precision: 24, scale: 8 }).default('0'),
  creditBoostEarned: integer("credit_boost_earned").default(0),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userQuestIdx: index("user_quest_idx").on(table.userId, table.questId),
}));

// Social mission progress tracking for viral growth
export const socialMissionProgress = pgTable("social_mission_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  missionId: varchar("mission_id", { length: 50 }).notNull(),
  progress: integer("progress").default(0),
  status: varchar("status", { length: 20 }).default('in_progress'),
  rewardClaimed: decimal("reward_claimed", { precision: 24, scale: 8 }).default('0'),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userMissionIdx: index("social_mission_user_idx").on(table.userId, table.missionId),
}));

// Dismissed nudges tracking for lifecycle messaging
export const dismissedNudges = pgTable("dismissed_nudges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  nudgeId: varchar("nudge_id", { length: 50 }).notNull(),
  dismissedAt: timestamp("dismissed_at").defaultNow(),
}, (table) => ({
  userNudgeIdx: index("dismissed_nudges_user_idx").on(table.userId, table.nudgeId),
}));

// User streaks for activity tracking
export const userStreaks = pgTable("user_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivity: timestamp("last_activity").defaultNow(),
  totalActiveDays: integer("total_active_days").default(0),
  weeklyActivity: jsonb("weekly_activity"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userStreakIdx: index("user_streaks_user_idx").on(table.userId),
}));

// Community interest hubs for creator portal
export const interestHubs = pgTable("interest_hubs", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  hubType: varchar("hub_type", { length: 50 }).notNull(),
  memberCount: integer("member_count").default(0),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  creatorIdx: index("interest_hubs_creator_idx").on(table.creatorId),
}));

// Fee rebate tracking for SUSU completion rewards
export const feeRebates = pgTable("fee_rebates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tier: varchar("tier", { length: 20 }).notNull(),
  rebateRate: decimal("rebate_rate", { precision: 5, scale: 2 }).notNull(),
  totalRebatesEarned: decimal("total_rebates_earned", { precision: 24, scale: 8 }).default('0'),
  rotationsCompleted: integer("rotations_completed").default(0),
  nextTierProgress: integer("next_tier_progress").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userRebateIdx: index("fee_rebates_user_idx").on(table.userId),
}));

// Export types for Wealth Engine V2
export type YieldVaultPosition = typeof yieldVaultPositions.$inferSelect;
export type InsertYieldVaultPosition = typeof yieldVaultPositions.$inferInsert;
export type YieldVaultCompound = typeof yieldVaultCompoundHistory.$inferSelect;
export type InsertYieldVaultCompound = typeof yieldVaultCompoundHistory.$inferInsert;
export type TreasuryFeeEvent = typeof treasuryFeeEvents.$inferSelect;
export type InsertTreasuryFeeEvent = typeof treasuryFeeEvents.$inferInsert;
export type BadgeMint = typeof badgeMints.$inferSelect;
export type InsertBadgeMint = typeof badgeMints.$inferInsert;
export type ReferralRewardClaim = typeof referralRewardClaims.$inferSelect;
export type InsertReferralRewardClaim = typeof referralRewardClaims.$inferInsert;
export type DepinRewardDiversion = typeof depinRewardDiversions.$inferSelect;
export type InsertDepinRewardDiversion = typeof depinRewardDiversions.$inferInsert;
export type CreditScoreUpdate = typeof creditScoreUpdates.$inferSelect;
export type InsertCreditScoreUpdate = typeof creditScoreUpdates.$inferInsert;
export type ProtocolMetricsSnapshot = typeof protocolMetricsSnapshots.$inferSelect;
export type InsertProtocolMetricsSnapshot = typeof protocolMetricsSnapshots.$inferInsert;

// ===== MODULE 2: HOLDER VALUE PARTICIPATION TABLES =====

// Participation interest registrations (land cohorts)
export const participationInterest = pgTable("participation_interest", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  interestType: varchar("interest_type", { length: 50 }).notNull().default('land-cohort'),
  cohortId: varchar("cohort_id", { length: 100 }),
  veAxmBalance: decimal("ve_axm_balance", { precision: 24, scale: 8 }),
  tier: integer("tier").default(0),
  status: varchar("status", { length: 20 }).default('pending'),
  registeredAt: timestamp("registered_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  metadata: jsonb("metadata"),
}, (table) => ({
  walletIdx: index("participation_interest_wallet_idx").on(table.walletAddress),
  cohortIdx: index("participation_interest_cohort_idx").on(table.cohortId),
}));

// Produce box reservations
export const produceReservations = pgTable("produce_reservations", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  cycleId: varchar("cycle_id", { length: 50 }).notNull(),
  cycleSeason: varchar("cycle_season", { length: 20 }).notNull(),
  cycleYear: integer("cycle_year").notNull(),
  creditsUsed: integer("credits_used").default(1),
  tier: integer("tier").default(0),
  status: varchar("status", { length: 20 }).default('reserved'),
  reservedAt: timestamp("reserved_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  claimedAt: timestamp("claimed_at"),
  metadata: jsonb("metadata"),
}, (table) => ({
  walletIdx: index("produce_reservations_wallet_idx").on(table.walletAddress),
  cycleIdx: index("produce_reservations_cycle_idx").on(table.cycleId),
}));

// Steward cohort enrollments
export const stewardCohorts = pgTable("steward_cohorts", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  cohortId: varchar("cohort_id", { length: 50 }).notNull(),
  cohortName: varchar("cohort_name", { length: 100 }),
  tier: integer("tier").default(0),
  veAxmBalance: decimal("ve_axm_balance", { precision: 24, scale: 8 }),
  status: varchar("status", { length: 20 }).default('enrolled'),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  certificateIssued: boolean("certificate_issued").default(false),
  metadata: jsonb("metadata"),
}, (table) => ({
  walletIdx: index("steward_cohorts_wallet_idx").on(table.walletAddress),
  cohortIdx: index("steward_cohorts_cohort_idx").on(table.cohortId),
}));

// Participation credits ledger (off-chain tracking with on-chain verification)
export const participationCredits = pgTable("participation_credits", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
  totalCredits: integer("total_credits").default(0),
  holdingCredits: integer("holding_credits").default(0),
  actionCredits: integer("action_credits").default(0),
  bonusCredits: integer("bonus_credits").default(0),
  veAxmBalance: decimal("ve_axm_balance", { precision: 24, scale: 8 }),
  onChainScore: integer("on_chain_score"),
  tier: integer("tier").default(0),
  daysHeld: integer("days_held").default(0),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("participation_credits_wallet_idx").on(table.walletAddress),
}));

// Participation actions log (for credit calculation)
export const participationActions = pgTable("participation_actions", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionValue: integer("action_value").default(1),
  creditsEarned: integer("credits_earned").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletIdx: index("participation_actions_wallet_idx").on(table.walletAddress),
  actionTypeIdx: index("participation_actions_type_idx").on(table.actionType),
}));

// Export types for Module 2
export type ParticipationInterest = typeof participationInterest.$inferSelect;
export type InsertParticipationInterest = typeof participationInterest.$inferInsert;
export type ProduceReservation = typeof produceReservations.$inferSelect;
export type InsertProduceReservation = typeof produceReservations.$inferInsert;
export type StewardCohort = typeof stewardCohorts.$inferSelect;
export type InsertStewardCohort = typeof stewardCohorts.$inferInsert;
export type ParticipationCredit = typeof participationCredits.$inferSelect;
export type InsertParticipationCredit = typeof participationCredits.$inferInsert;
export type ParticipationAction = typeof participationActions.$inferSelect;
export type InsertParticipationAction = typeof participationActions.$inferInsert;

// ============================================
// STEWARD DASHBOARD SCHEMA
// ============================================

// Steward role enum
export const stewardRoleEnum = pgEnum('steward_role', [
  'coordinator',
  'lead',
  'council',
  'admin'
]);

// Steward status enum
export const stewardStatusEnum = pgEnum('steward_status', [
  'applicant',
  'probationary',
  'active',
  'atRisk',
  'reassignmentPending'
]);

// Drop status enum
export const dropStatusEnum = pgEnum('drop_status', [
  'draft',
  'published',
  'completed',
  'cancelled'
]);

// Reservation status enum
export const reservationStatusEnum = pgEnum('reservation_status', [
  'reserved',
  'confirmed',
  'cancelled',
  'noShow',
  'pickedUp'
]);

// Land lead stage enum
export const landLeadStageEnum = pgEnum('land_lead_stage', [
  'new',
  'needsData',
  'qualified',
  'underReview',
  'escalated',
  'declined',
  'pursuing',
  'acquired',
  'archived'
]);

// Incident severity enum
export const incidentSeverityEnum = pgEnum('incident_severity', [
  'low',
  'medium',
  'high',
  'critical'
]);

// Steward Regions
export const stewardRegions = pgTable("steward_regions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  coverage: text("coverage"),
  defaultPickupPoints: jsonb("default_pickup_points"),
  capacityTargets: jsonb("capacity_targets"),
  status: varchar("status", { length: 20 }).default('active'),
  parentRegionId: integer("parent_region_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Steward Assignments
export const stewardAssignments = pgTable("steward_assignments", {
  id: serial("id").primaryKey(),
  wallet: varchar("wallet", { length: 42 }).notNull(),
  role: stewardRoleEnum("role").default('coordinator'),
  regionId: integer("region_id").references(() => stewardRegions.id),
  status: stewardStatusEnum("status").default('applicant'),
  probationStartDate: timestamp("probation_start_date"),
  probationEndDate: timestamp("probation_end_date"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("steward_assignments_wallet_idx").on(table.wallet),
  regionIdx: index("steward_assignments_region_idx").on(table.regionId),
}));

// Steward Drops (Produce Distribution Events)
export const stewardDrops = pgTable("steward_drops", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").references(() => stewardRegions.id).notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  timeWindows: jsonb("time_windows"),
  capacity: integer("capacity").default(50),
  cutoffAt: timestamp("cutoff_at"),
  status: dropStatusEnum("status").default('draft'),
  createdBy: varchar("created_by", { length: 42 }),
  reconciliationData: jsonb("reconciliation_data"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  regionIdx: index("steward_drops_region_idx").on(table.regionId),
  dateIdx: index("steward_drops_date_idx").on(table.date),
}));

// Drop Reservations
export const stewardReservations = pgTable("steward_reservations", {
  id: serial("id").primaryKey(),
  dropId: integer("drop_id").references(() => stewardDrops.id).notNull(),
  wallet: varchar("wallet", { length: 42 }).notNull(),
  status: reservationStatusEnum("status").default('reserved'),
  notes: text("notes"),
  checkInTime: timestamp("check_in_time"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dropIdx: index("steward_reservations_drop_idx").on(table.dropId),
  walletIdx: index("steward_reservations_wallet_idx").on(table.wallet),
}));

// Participant Profiles
export const stewardParticipants = pgTable("steward_participants", {
  wallet: varchar("wallet", { length: 42 }).primaryKey(),
  displayName: varchar("display_name", { length: 100 }),
  joinDate: timestamp("join_date").defaultNow(),
  participationPath: varchar("participation_path", { length: 50 }),
  activityScore: integer("activity_score").default(0),
  flags: jsonb("flags"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Land Leads
export const stewardLandLeads = pgTable("steward_land_leads", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").references(() => stewardRegions.id),
  parcelAddress: text("parcel_address").notNull(),
  county: varchar("county", { length: 100 }),
  link: text("link"),
  askingPrice: decimal("asking_price", { precision: 14, scale: 2 }),
  acreage: decimal("acreage", { precision: 10, scale: 2 }),
  zoning: varchar("zoning", { length: 50 }),
  utilities: jsonb("utilities"),
  water: varchar("water", { length: 100 }),
  topography: varchar("topography", { length: 100 }),
  riskFlags: jsonb("risk_flags"),
  photos: jsonb("photos"),
  proposedUse: text("proposed_use"),
  confidenceScore: integer("confidence_score"),
  stage: landLeadStageEnum("stage").default('new'),
  qualificationChecklist: jsonb("qualification_checklist"),
  interestSignals: jsonb("interest_signals"),
  decisionLog: jsonb("decision_log"),
  createdBy: varchar("created_by", { length: 42 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  regionIdx: index("steward_land_leads_region_idx").on(table.regionId),
  stageIdx: index("steward_land_leads_stage_idx").on(table.stage),
}));

// Steward Groups
export const stewardGroups = pgTable("steward_groups", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").references(() => stewardRegions.id),
  name: varchar("name", { length: 100 }).notNull(),
  purpose: text("purpose"),
  targetSize: integer("target_size"),
  intakeWindow: jsonb("intake_window"),
  cadence: varchar("cadence", { length: 50 }),
  status: varchar("status", { length: 20 }).default('forming'),
  playbook: jsonb("playbook"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  regionIdx: index("steward_groups_region_idx").on(table.regionId),
}));

// Group Members
export const stewardGroupMembers = pgTable("steward_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => stewardGroups.id).notNull(),
  wallet: varchar("wallet", { length: 42 }).notNull(),
  role: varchar("role", { length: 50 }).default('member'),
  joinedAt: timestamp("joined_at").defaultNow(),
  attendanceLogs: jsonb("attendance_logs"),
  metadata: jsonb("metadata"),
}, (table) => ({
  groupIdx: index("steward_group_members_group_idx").on(table.groupId),
  walletIdx: index("steward_group_members_wallet_idx").on(table.wallet),
}));

// Steward Tasks
export const stewardTasks = pgTable("steward_tasks", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").references(() => stewardRegions.id),
  assignedToWallet: varchar("assigned_to_wallet", { length: 42 }),
  type: varchar("type", { length: 50 }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  dueAt: timestamp("due_at"),
  priority: varchar("priority", { length: 20 }).default('medium'),
  status: varchar("status", { length: 20 }).default('pending'),
  blockers: jsonb("blockers"),
  evidenceLinks: jsonb("evidence_links"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  regionIdx: index("steward_tasks_region_idx").on(table.regionId),
  assignedIdx: index("steward_tasks_assigned_idx").on(table.assignedToWallet),
  statusIdx: index("steward_tasks_status_idx").on(table.status),
}));

// Steward Messages
export const stewardMessages = pgTable("steward_messages", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").references(() => stewardRegions.id),
  channel: varchar("channel", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 200 }),
  body: text("body").notNull(),
  sentBy: varchar("sent_by", { length: 42 }),
  sentAt: timestamp("sent_at").defaultNow(),
  audienceSegment: varchar("audience_segment", { length: 50 }),
  templateUsed: varchar("template_used", { length: 50 }),
  metadata: jsonb("metadata"),
}, (table) => ({
  regionIdx: index("steward_messages_region_idx").on(table.regionId),
  channelIdx: index("steward_messages_channel_idx").on(table.channel),
}));

// Steward Incidents
export const stewardIncidents = pgTable("steward_incidents", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").references(() => stewardRegions.id),
  category: varchar("category", { length: 50 }),
  severity: incidentSeverityEnum("severity").default('low'),
  description: text("description").notNull(),
  relatedDropId: integer("related_drop_id").references(() => stewardDrops.id),
  createdBy: varchar("created_by", { length: 42 }),
  status: varchar("status", { length: 20 }).default('open'),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  regionIdx: index("steward_incidents_region_idx").on(table.regionId),
  statusIdx: index("steward_incidents_status_idx").on(table.status),
}));

// Weekly Reports
export const stewardWeeklyReports = pgTable("steward_weekly_reports", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").references(() => stewardRegions.id).notNull(),
  weekStart: timestamp("week_start").notNull(),
  summary: text("summary"),
  dropMetrics: jsonb("drop_metrics"),
  participantMetrics: jsonb("participant_metrics"),
  landMetrics: jsonb("land_metrics"),
  issues: jsonb("issues"),
  nextWeekPlan: text("next_week_plan"),
  submittedBy: varchar("submitted_by", { length: 42 }),
  submittedAt: timestamp("submitted_at").defaultNow(),
  metadata: jsonb("metadata"),
}, (table) => ({
  regionIdx: index("steward_weekly_reports_region_idx").on(table.regionId),
  weekIdx: index("steward_weekly_reports_week_idx").on(table.weekStart),
}));

// Reputation Metrics
export const stewardReputationMetrics = pgTable("steward_reputation_metrics", {
  id: serial("id").primaryKey(),
  wallet: varchar("wallet", { length: 42 }).notNull(),
  regionId: integer("region_id").references(() => stewardRegions.id),
  reliabilityScore: integer("reliability_score").default(0),
  responsivenessScore: integer("responsiveness_score").default(0),
  landQualityScore: integer("land_quality_score").default(0),
  reportingScore: integer("reporting_score").default(0),
  compositeScore: integer("composite_score").default(0),
  unlocks: jsonb("unlocks"),
  metadata: jsonb("metadata"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("steward_reputation_wallet_idx").on(table.wallet),
  regionIdx: index("steward_reputation_region_idx").on(table.regionId),
}));

// Land Interest Signals
export const stewardLandInterests = pgTable("steward_land_interests", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => stewardLandLeads.id).notNull(),
  wallet: varchar("wallet", { length: 42 }).notNull(),
  interestLevel: varchar("interest_level", { length: 20 }).default('interested'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  leadIdx: index("steward_land_interests_lead_idx").on(table.leadId),
  walletIdx: index("steward_land_interests_wallet_idx").on(table.wallet),
}));

// Export types for Steward Dashboard
export type StewardRegion = typeof stewardRegions.$inferSelect;
export type InsertStewardRegion = typeof stewardRegions.$inferInsert;
export type StewardAssignment = typeof stewardAssignments.$inferSelect;
export type InsertStewardAssignment = typeof stewardAssignments.$inferInsert;
export type StewardDrop = typeof stewardDrops.$inferSelect;
export type InsertStewardDrop = typeof stewardDrops.$inferInsert;
export type StewardReservation = typeof stewardReservations.$inferSelect;
export type InsertStewardReservation = typeof stewardReservations.$inferInsert;
export type StewardParticipant = typeof stewardParticipants.$inferSelect;
export type InsertStewardParticipant = typeof stewardParticipants.$inferInsert;
export type StewardLandLead = typeof stewardLandLeads.$inferSelect;
export type InsertStewardLandLead = typeof stewardLandLeads.$inferInsert;
export type StewardGroup = typeof stewardGroups.$inferSelect;
export type InsertStewardGroup = typeof stewardGroups.$inferInsert;
export type StewardGroupMember = typeof stewardGroupMembers.$inferSelect;
export type InsertStewardGroupMember = typeof stewardGroupMembers.$inferInsert;
export type StewardTask = typeof stewardTasks.$inferSelect;
export type InsertStewardTask = typeof stewardTasks.$inferInsert;
export type StewardMessage = typeof stewardMessages.$inferSelect;
export type InsertStewardMessage = typeof stewardMessages.$inferInsert;
export type StewardIncident = typeof stewardIncidents.$inferSelect;
export type InsertStewardIncident = typeof stewardIncidents.$inferInsert;
export type StewardWeeklyReport = typeof stewardWeeklyReports.$inferSelect;
export type InsertStewardWeeklyReport = typeof stewardWeeklyReports.$inferInsert;
export type StewardReputationMetric = typeof stewardReputationMetrics.$inferSelect;
export type InsertStewardReputationMetric = typeof stewardReputationMetrics.$inferInsert;
export type StewardLandInterest = typeof stewardLandInterests.$inferSelect;
export type InsertStewardLandInterest = typeof stewardLandInterests.$inferInsert;

// ============================================
// STEWARD-ACTIVATED LAND PROGRAM TABLES
// ============================================

// Enums for Activated Land
export const ownerOpennessLevelEnum = pgEnum("owner_openness_level", [
  'curious', 'open', 'ready'
]);

export const conversionPotentialEnum = pgEnum("conversion_potential", [
  'lease', 'seller_finance', 'partnership', 'purchase', 'unknown'
]);

export const activationStageEnum = pgEnum("activation_stage", [
  'intake', 'site_readiness', 'plan_drafted', 'active_cycle', 'paused', 'completed'
]);

export const landLeadTypeEnum = pgEnum("land_lead_type", [
  'traditional', 'activated_land'
]);

// Landowner Applications
export const landownerApplications = pgTable("landowner_applications", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  county: varchar("county", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  parcelAddress: text("parcel_address").notNull(),
  acreage: varchar("acreage", { length: 50 }),
  currentUse: varchar("current_use", { length: 50 }),
  desiredUse: text("desired_use"),
  willingnessForProduce: varchar("willingness_for_produce", { length: 50 }),
  utilitiesNotes: text("utilities_notes"),
  accessNotes: text("access_notes"),
  additionalNotes: text("additional_notes"),
  photos: jsonb("photos"),
  status: varchar("status", { length: 20 }).default('pending'),
  assignedSteward: varchar("assigned_steward", { length: 42 }),
  regionId: integer("region_id").references(() => stewardRegions.id),
  convertedToLeadId: integer("converted_to_lead_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("landowner_applications_status_idx").on(table.status),
  countyIdx: index("landowner_applications_county_idx").on(table.county),
}));

// Activated Land Stewardship Plans
export const activatedLandStewardshipPlans = pgTable("activated_land_stewardship_plans", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => stewardLandLeads.id).notNull(),
  proposedActivities: text("proposed_activities"),
  seasonalCalendar: jsonb("seasonal_calendar"),
  participantGuidelines: text("participant_guidelines"),
  maxParticipants: integer("max_participants"),
  communicationFrequency: varchar("communication_frequency", { length: 50 }),
  accessHours: varchar("access_hours", { length: 100 }),
  toolStorage: text("tool_storage"),
  emergencyPlan: text("emergency_plan"),
  stopPauseProcedures: text("stop_pause_procedures"),
  ownerApprovalDate: timestamp("owner_approval_date"),
  ownerApprovalSignature: varchar("owner_approval_signature", { length: 200 }),
  status: varchar("status", { length: 20 }).default('draft'),
  createdBy: varchar("created_by", { length: 42 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  leadIdx: index("al_stewardship_plans_lead_idx").on(table.leadId),
  statusIdx: index("al_stewardship_plans_status_idx").on(table.status),
}));

// Activated Land Activation Cycles
export const activatedLandCycles = pgTable("activated_land_cycles", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => stewardLandLeads.id).notNull(),
  planId: integer("plan_id").references(() => activatedLandStewardshipPlans.id),
  cycleNumber: integer("cycle_number").default(1),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).default('active'),
  participantCount: integer("participant_count").default(0),
  outputSummary: text("output_summary"),
  ownerFeedback: text("owner_feedback"),
  ownerSatisfactionRating: integer("owner_satisfaction_rating"),
  lessonsLearned: text("lessons_learned"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  leadIdx: index("al_cycles_lead_idx").on(table.leadId),
  statusIdx: index("al_cycles_status_idx").on(table.status),
}));

// Activated Land Weekly Logs
export const activatedLandWeeklyLogs = pgTable("activated_land_weekly_logs", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").references(() => activatedLandCycles.id).notNull(),
  weekStart: timestamp("week_start").notNull(),
  activitiesCompleted: text("activities_completed"),
  participantAttendance: jsonb("participant_attendance"),
  photos: jsonb("photos"),
  issuesEncountered: text("issues_encountered"),
  ownerCommunication: text("owner_communication"),
  nextWeekPlanned: text("next_week_planned"),
  submittedBy: varchar("submitted_by", { length: 42 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  cycleIdx: index("al_weekly_logs_cycle_idx").on(table.cycleId),
  weekIdx: index("al_weekly_logs_week_idx").on(table.weekStart),
}));

// Owner Agreement Checklist
export const activatedLandOwnerChecklists = pgTable("activated_land_owner_checklists", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => stewardLandLeads.id).notNull(),
  ownershipConfirmed: boolean("ownership_confirmed").default(false),
  accessTermsAgreed: boolean("access_terms_agreed").default(false),
  activitiesApproved: boolean("activities_approved").default(false),
  communicationFrequencyAgreed: boolean("communication_frequency_agreed").default(false),
  stopConditionsUnderstood: boolean("stop_conditions_understood").default(false),
  insuranceAcknowledged: boolean("insurance_acknowledged").default(false),
  noFinancialPromisesUnderstood: boolean("no_financial_promises_understood").default(false),
  voluntaryParticipationConfirmed: boolean("voluntary_participation_confirmed").default(false),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by", { length: 42 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  leadIdx: index("al_owner_checklists_lead_idx").on(table.leadId),
}));

// Conversion Options (optional future acquisition discussions)
export const activatedLandConversionOptions = pgTable("activated_land_conversion_options", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => stewardLandLeads.id).notNull(),
  ownerInitiated: boolean("owner_initiated").default(true),
  conversionType: conversionPotentialEnum("conversion_type"),
  discussionDate: timestamp("discussion_date"),
  discussionNotes: text("discussion_notes"),
  ownerInterestLevel: varchar("owner_interest_level", { length: 20 }),
  estimatedTimeline: varchar("estimated_timeline", { length: 50 }),
  referredToTeam: boolean("referred_to_team").default(false),
  referralDate: timestamp("referral_date"),
  status: varchar("status", { length: 20 }).default('noted'),
  createdBy: varchar("created_by", { length: 42 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  leadIdx: index("al_conversion_options_lead_idx").on(table.leadId),
}));

// Export types for Activated Land tables
export type LandownerApplication = typeof landownerApplications.$inferSelect;
export type InsertLandownerApplication = typeof landownerApplications.$inferInsert;
export type ActivatedLandStewardshipPlan = typeof activatedLandStewardshipPlans.$inferSelect;
export type InsertActivatedLandStewardshipPlan = typeof activatedLandStewardshipPlans.$inferInsert;
export type ActivatedLandCycle = typeof activatedLandCycles.$inferSelect;
export type InsertActivatedLandCycle = typeof activatedLandCycles.$inferInsert;
export type ActivatedLandWeeklyLog = typeof activatedLandWeeklyLogs.$inferSelect;
export type InsertActivatedLandWeeklyLog = typeof activatedLandWeeklyLogs.$inferInsert;
export type ActivatedLandOwnerChecklist = typeof activatedLandOwnerChecklists.$inferSelect;
export type InsertActivatedLandOwnerChecklist = typeof activatedLandOwnerChecklists.$inferInsert;
export type ActivatedLandConversionOption = typeof activatedLandConversionOptions.$inferSelect;
export type InsertActivatedLandConversionOption = typeof activatedLandConversionOptions.$inferInsert;

// ============================================
// STEWARD RECRUITMENT SYSTEM
// ============================================

// Steward Interest Signups (quick form for recruitment)
export const stewardInterestSignups = pgTable("steward_interest_signups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  region: varchar("region", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  motivation: text("motivation"),
  source: varchar("source", { length: 100 }),
  referredBy: varchar("referred_by", { length: 200 }),
  status: varchar("status", { length: 20 }).default('new'),
  contactedAt: timestamp("contacted_at"),
  convertedToApplicant: boolean("converted_to_applicant").default(false),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("steward_interest_email_idx").on(table.email),
  regionIdx: index("steward_interest_region_idx").on(table.region),
  statusIdx: index("steward_interest_status_idx").on(table.status),
}));

export type StewardInterestSignup = typeof stewardInterestSignups.$inferSelect;
export type InsertStewardInterestSignup = typeof stewardInterestSignups.$inferInsert;

// ============================================
// LAND ACQUISITION & REG CF CROWDFUNDING
// ============================================

// Land Submission Status Enum
export const landSubmissionStatusEnum = pgEnum('land_submission_status', [
  'new',
  'reviewing',
  'steward_assigned',
  'steward_evaluation',
  'community_vote',
  'qualified',
  'approved',
  'rejected',
  'archived'
]);

// Land Submission Source Type Enum
export const landSubmissionSourceEnum = pgEnum('land_submission_source', [
  'manual',
  'zillow',
  'realtor',
  'redfin',
  'loopnet',
  'landwatch',
  'other'
]);

// Land Submissions (property submissions from landowners or importers)
export const landSubmissions = pgTable("land_submissions", {
  id: serial("id").primaryKey(),
  
  // Owner Information
  ownerName: varchar("owner_name", { length: 200 }).notNull(),
  ownerEmail: varchar("owner_email", { length: 200 }).notNull(),
  ownerPhone: varchar("owner_phone", { length: 50 }),
  
  // Property Location
  propertyAddress: text("property_address").notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  county: varchar("county", { length: 100 }),
  parcelNumber: varchar("parcel_number", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  
  // Property Details
  acreage: decimal("acreage", { precision: 10, scale: 2 }).notNull(),
  askingPrice: decimal("asking_price", { precision: 18, scale: 2 }),
  zoning: varchar("zoning", { length: 100 }),
  propertyType: varchar("property_type", { length: 100 }),
  currentUse: varchar("current_use", { length: 200 }),
  utilitiesAvailable: jsonb("utilities_available"),
  roadAccess: varchar("road_access", { length: 100 }),
  waterSource: varchar("water_source", { length: 100 }),
  topography: varchar("topography", { length: 100 }),
  structuresOnProperty: text("structures_on_property"),
  environmentalIssues: text("environmental_issues"),
  
  // Legal Status
  titleClear: boolean("title_clear").default(true),
  liensEncumbrances: text("liens_encumbrances"),
  
  // Seller Motivation
  ownerMotivation: text("owner_motivation"),
  timelineToSell: varchar("timeline_to_sell", { length: 50 }),
  openToOption: boolean("open_to_option").default(true),
  optionPremiumAcceptable: decimal("option_premium_acceptable", { precision: 18, scale: 2 }),
  
  // Documents & Media
  documents: jsonb("documents"),
  images: jsonb("images"),
  notes: text("notes"),
  
  // Lead Scoring
  leadScore: integer("lead_score").default(0),
  
  // Import Source (for listing imports)
  sourceUrl: text("source_url"),
  sourceType: varchar("source_type", { length: 50 }).default('manual'),
  importStatus: varchar("import_status", { length: 50 }),
  importedData: jsonb("imported_data"),
  importedAt: timestamp("imported_at"),
  
  // Multi-Stage Workflow
  status: varchar("status", { length: 50 }).default('new'),
  approvalStage: varchar("approval_stage", { length: 50 }).default('submission'),
  
  // Admin Review
  assignedStewardId: integer("assigned_steward_id").references(() => users.id),
  stewardAssignmentAt: timestamp("steward_assignment_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  // Steward Evaluation
  stewardEvaluationNotes: text("steward_evaluation_notes"),
  stewardRecommendation: varchar("steward_recommendation", { length: 50 }),
  stewardReportUrl: text("steward_report_url"),
  stewardEvaluationAt: timestamp("steward_evaluation_at"),
  
  // Community Vote
  communityVoteStatus: varchar("community_vote_status", { length: 50 }).default('not_started'),
  communityVotesFor: integer("community_votes_for").default(0),
  communityVotesAgainst: integer("community_votes_against").default(0),
  communityVoteStartAt: timestamp("community_vote_start_at"),
  communityVoteEndAt: timestamp("community_vote_end_at"),
  
  // Final Approval
  finalApprovalAt: timestamp("final_approval_at"),
  finalApprovalBy: integer("final_approval_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  
  // Social Sharing
  shareSlug: varchar("share_slug", { length: 100 }).unique(),
  shareCount: integer("share_count").default(0),
  referralCode: varchar("referral_code", { length: 50 }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  ownerEmailIdx: index("land_submissions_owner_email_idx").on(table.ownerEmail),
  statusIdx: index("land_submissions_status_idx").on(table.status),
  stageIdx: index("land_submissions_stage_idx").on(table.approvalStage),
  stewardIdx: index("land_submissions_steward_idx").on(table.assignedStewardId),
  leadScoreIdx: index("land_submissions_lead_score_idx").on(table.leadScore),
  shareSlugIdx: index("land_submissions_share_slug_idx").on(table.shareSlug),
}));

export type LandSubmission = typeof landSubmissions.$inferSelect;
export type InsertLandSubmission = typeof landSubmissions.$inferInsert;

// Steward Reviews for Land Submissions
export const stewardReviews = pgTable("steward_reviews", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => landSubmissions.id).notNull(),
  stewardId: integer("steward_id").references(() => users.id).notNull(),
  riskScore: integer("risk_score"),
  recommendation: varchar("recommendation", { length: 50 }),
  locationAnalysis: text("location_analysis"),
  marketAnalysis: text("market_analysis"),
  developmentPotential: text("development_potential"),
  communityFit: text("community_fit"),
  concerns: text("concerns"),
  notes: text("notes"),
  attachments: jsonb("attachments"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  submissionIdx: index("steward_reviews_submission_idx").on(table.submissionId),
  stewardIdx: index("steward_reviews_steward_idx").on(table.stewardId),
}));

export type StewardReview = typeof stewardReviews.$inferSelect;
export type InsertStewardReview = typeof stewardReviews.$inferInsert;

// Community Votes on Land Submissions
export const communityVotes = pgTable("community_votes", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => landSubmissions.id).notNull(),
  voterId: integer("voter_id").references(() => users.id).notNull(),
  vote: varchar("vote", { length: 20 }).notNull(),
  weight: integer("weight").default(1),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  submissionIdx: index("community_votes_submission_idx").on(table.submissionId),
  voterIdx: index("community_votes_voter_idx").on(table.voterId),
  uniqueVote: index("community_votes_unique").on(table.submissionId, table.voterId),
}));

export type CommunityVote = typeof communityVotes.$inferSelect;
export type InsertCommunityVote = typeof communityVotes.$inferInsert;

// Campaign Short Links for Social Sharing
export const campaignShortLinks = pgTable("campaign_short_links", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => crowdfundingCampaigns.id).notNull(),
  slug: varchar("slug", { length: 50 }).unique().notNull(),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),
  referralCode: varchar("referral_code", { length: 50 }),
  clickCount: integer("click_count").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  slugIdx: index("campaign_short_links_slug_idx").on(table.slug),
  campaignIdx: index("campaign_short_links_campaign_idx").on(table.campaignId),
  referralIdx: index("campaign_short_links_referral_idx").on(table.referralCode),
}));

export type CampaignShortLink = typeof campaignShortLinks.$inferSelect;
export type InsertCampaignShortLink = typeof campaignShortLinks.$inferInsert;

// Referral Attributions for Investment Tracking
export const referralAttributions = pgTable("referral_attributions", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => crowdfundingCampaigns.id).notNull(),
  referrerId: integer("referrer_id").references(() => users.id),
  referralCode: varchar("referral_code", { length: 50 }).notNull(),
  investorId: integer("investor_id").references(() => users.id),
  investedAmount: decimal("invested_amount", { precision: 18, scale: 2 }),
  conversionStatus: varchar("conversion_status", { length: 50 }).default('clicked'),
  clickedAt: timestamp("clicked_at").defaultNow(),
  convertedAt: timestamp("converted_at"),
}, (table) => ({
  campaignIdx: index("referral_attributions_campaign_idx").on(table.campaignId),
  referrerIdx: index("referral_attributions_referrer_idx").on(table.referrerId),
  referralCodeIdx: index("referral_attributions_code_idx").on(table.referralCode),
}));

export type ReferralAttribution = typeof referralAttributions.$inferSelect;
export type InsertReferralAttribution = typeof referralAttributions.$inferInsert;

// Land Option Status Enum
export const landOptionStatusEnum = pgEnum('land_option_status', [
  'draft',
  'active',
  'option_fee_paid',
  'exercise_ready',
  'exercised',
  'expired',
  'cancelled'
]);

// Crowdfunding Campaign Status Enum
export const crowdfundingStatusEnum = pgEnum('crowdfunding_status', [
  'draft',
  'live',
  'funded',
  'closed',
  'cancelled'
]);

// Acquisition Pool Status Enum
export const acquisitionPoolStatusEnum = pgEnum('acquisition_pool_status', [
  'forming',
  'active',
  'funded',
  'distributed',
  'cancelled'
]);

// Land Options (tokenized land purchase options)
export const landOptions = pgTable("land_options", {
  id: serial("id").primaryKey(),
  parcelId: varchar("parcel_id", { length: 100 }).notNull(),
  location: text("location").notNull(),
  acreage: decimal("acreage", { precision: 10, scale: 2 }).notNull(),
  purchasePrice: decimal("purchase_price", { precision: 18, scale: 2 }).notNull(),
  optionFee: decimal("option_fee", { precision: 18, scale: 2 }).notNull(),
  optionPeriodDays: integer("option_period_days").notNull(),
  expiresAt: timestamp("expires_at"),
  landownerAddress: varchar("landowner_address", { length: 42 }).notNull(),
  landownerName: varchar("landowner_name", { length: 200 }),
  landownerEmail: varchar("landowner_email", { length: 200 }),
  stewardId: integer("steward_id").references(() => users.id),
  status: landOptionStatusEnum("status").default('draft'),
  totalShares: integer("total_shares").notNull(),
  sharesSold: integer("shares_sold").default(0),
  minInvestment: decimal("min_investment", { precision: 18, scale: 2 }).notNull(),
  maxInvestment: decimal("max_investment", { precision: 18, scale: 2 }).notNull(),
  regCFCompliant: boolean("reg_cf_compliant").default(true),
  contractAddress: varchar("contract_address", { length: 42 }),
  onChainOptionId: integer("on_chain_option_id"),
  ipfsMetadata: text("ipfs_metadata"),
  description: text("description"),
  featuredImage: text("featured_image"),
  propertyType: varchar("property_type", { length: 50 }),
  zoning: varchar("zoning", { length: 100 }),
  developmentPlan: text("development_plan"),
  projectedReturns: decimal("projected_returns", { precision: 5, scale: 2 }),
  riskLevel: varchar("risk_level", { length: 20 }),
  documents: jsonb("documents"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  parcelIdx: index("land_options_parcel_idx").on(table.parcelId),
  statusIdx: index("land_options_status_idx").on(table.status),
  stewardIdx: index("land_options_steward_idx").on(table.stewardId),
}));

// Reg CF Crowdfunding Campaigns
export const crowdfundingCampaigns = pgTable("crowdfunding_campaigns", {
  id: serial("id").primaryKey(),
  landOptionId: integer("land_option_id").references(() => landOptions.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 300 }),
  description: text("description").notNull(),
  targetAmount: decimal("target_amount", { precision: 18, scale: 2 }).notNull(),
  minInvestment: decimal("min_investment", { precision: 18, scale: 2 }).notNull(),
  maxInvestment: decimal("max_investment", { precision: 18, scale: 2 }).notNull(),
  raisedAmount: decimal("raised_amount", { precision: 18, scale: 2 }).default('0'),
  investorCount: integer("investor_count").default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: crowdfundingStatusEnum("status").default('draft'),
  issuerId: integer("issuer_id").references(() => users.id).notNull(),
  offeringDocumentCID: text("offering_document_cid"),
  requiresAccreditation: boolean("requires_accreditation").default(false),
  regCFFormC: text("reg_cf_form_c"),
  termsAndConditions: text("terms_and_conditions"),
  riskFactors: text("risk_factors"),
  useOfFunds: text("use_of_funds"),
  financialStatements: jsonb("financial_statements"),
  contractAddress: varchar("contract_address", { length: 42 }),
  onChainCampaignId: integer("on_chain_campaign_id"),
  featuredImage: text("featured_image"),
  galleryImages: jsonb("gallery_images"),
  videoUrl: text("video_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  landOptionIdx: index("crowdfunding_land_option_idx").on(table.landOptionId),
  statusIdx: index("crowdfunding_status_idx").on(table.status),
  issuerIdx: index("crowdfunding_issuer_idx").on(table.issuerId),
}));

// Crowdfunding Investments
export const crowdfundingInvestments = pgTable("crowdfunding_investments", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => crowdfundingCampaigns.id).notNull(),
  investorId: integer("investor_id").references(() => users.id).notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  sharesReceived: integer("shares_received"),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  status: varchar("status", { length: 20 }).default('pending'),
  kycVerified: boolean("kyc_verified").default(false),
  accredited: boolean("accredited").default(false),
  investorAnnualIncome: decimal("investor_annual_income", { precision: 18, scale: 2 }),
  investorNetWorth: decimal("investor_net_worth", { precision: 18, scale: 2 }),
  signedAgreement: boolean("signed_agreement").default(false),
  agreementCID: text("agreement_cid"),
  refunded: boolean("refunded").default(false),
  refundDate: timestamp("refund_date"),
  refundTxHash: varchar("refund_tx_hash", { length: 66 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  campaignIdx: index("investments_campaign_idx").on(table.campaignId),
  investorIdx: index("investments_investor_idx").on(table.investorId),
  statusIdx: index("investments_status_idx").on(table.status),
}));

// Land Acquisition Pools (SUSU-style community pooling)
export const landAcquisitionPools = pgTable("land_acquisition_pools", {
  id: serial("id").primaryKey(),
  landOptionId: integer("land_option_id").references(() => landOptions.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 18, scale: 2 }).notNull(),
  monthlyContribution: decimal("monthly_contribution", { precision: 18, scale: 2 }).notNull(),
  memberLimit: integer("member_limit").notNull(),
  memberCount: integer("member_count").default(0),
  totalContributed: decimal("total_contributed", { precision: 18, scale: 2 }).default('0'),
  cycleCount: integer("cycle_count").notNull(),
  currentCycle: integer("current_cycle").default(0),
  cycleStartDate: timestamp("cycle_start_date"),
  cycleDurationDays: integer("cycle_duration_days").default(30),
  status: acquisitionPoolStatusEnum("status").default('forming'),
  stewardId: integer("steward_id").references(() => users.id).notNull(),
  contractAddress: varchar("contract_address", { length: 42 }),
  onChainPoolId: integer("on_chain_pool_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  landOptionIdx: index("pools_land_option_idx").on(table.landOptionId),
  statusIdx: index("pools_status_idx").on(table.status),
  stewardIdx: index("pools_steward_idx").on(table.stewardId),
}));

// Pool Members
export const poolMembers = pgTable("pool_members", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").references(() => landAcquisitionPools.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }),
  totalContributed: decimal("total_contributed", { precision: 18, scale: 2 }).default('0'),
  cyclesCompleted: integer("cycles_completed").default(0),
  missedPayments: integer("missed_payments").default(0),
  active: boolean("active").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
  metadata: jsonb("metadata"),
}, (table) => ({
  poolIdx: index("pool_members_pool_idx").on(table.poolId),
  userIdx: index("pool_members_user_idx").on(table.userId),
}));

// Pool Contributions
export const poolContributions = pgTable("pool_contributions", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").references(() => landAcquisitionPools.id).notNull(),
  memberId: integer("member_id").references(() => poolMembers.id).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  cycle: integer("cycle").notNull(),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  poolIdx: index("contributions_pool_idx").on(table.poolId),
  memberIdx: index("contributions_member_idx").on(table.memberId),
}));

// Investor KYC/Accreditation Records
export const investorVerifications = pgTable("investor_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }),
  kycComplete: boolean("kyc_complete").default(false),
  kycProvider: varchar("kyc_provider", { length: 50 }),
  kycVerifiedAt: timestamp("kyc_verified_at"),
  accredited: boolean("accredited").default(false),
  accreditationMethod: varchar("accreditation_method", { length: 50 }),
  accreditationVerifiedAt: timestamp("accreditation_verified_at"),
  annualIncome: decimal("annual_income", { precision: 18, scale: 2 }),
  netWorth: decimal("net_worth", { precision: 18, scale: 2 }),
  yearlyInvestmentTotal: decimal("yearly_investment_total", { precision: 18, scale: 2 }).default('0'),
  investmentYear: integer("investment_year"),
  documentsCID: text("documents_cid"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("verifications_user_idx").on(table.userId),
  walletIdx: index("verifications_wallet_idx").on(table.walletAddress),
}));

// Land Governance Proposals
export const landGovernanceProposals = pgTable("land_governance_proposals", {
  id: serial("id").primaryKey(),
  landOptionId: integer("land_option_id").references(() => landOptions.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  proposalType: varchar("proposal_type", { length: 50 }).notNull(),
  proposerId: integer("proposer_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).default('pending'),
  votesFor: integer("votes_for").default(0),
  votesAgainst: integer("votes_against").default(0),
  quorumRequired: integer("quorum_required").default(10),
  votingStartsAt: timestamp("voting_starts_at"),
  votingEndsAt: timestamp("voting_ends_at"),
  executedAt: timestamp("executed_at"),
  onChainProposalId: varchar("on_chain_proposal_id", { length: 66 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  landOptionIdx: index("proposals_land_option_idx").on(table.landOptionId),
  statusIdx: index("proposals_status_idx").on(table.status),
}));

// Export types for Land Acquisition tables
export type LandOption = typeof landOptions.$inferSelect;
export type InsertLandOption = typeof landOptions.$inferInsert;
export type CrowdfundingCampaign = typeof crowdfundingCampaigns.$inferSelect;
export type InsertCrowdfundingCampaign = typeof crowdfundingCampaigns.$inferInsert;
export type CrowdfundingInvestment = typeof crowdfundingInvestments.$inferSelect;
export type InsertCrowdfundingInvestment = typeof crowdfundingInvestments.$inferInsert;
export type LandAcquisitionPool = typeof landAcquisitionPools.$inferSelect;
export type InsertLandAcquisitionPool = typeof landAcquisitionPools.$inferInsert;
export type PoolMember = typeof poolMembers.$inferSelect;
export type InsertPoolMember = typeof poolMembers.$inferInsert;
export type PoolContribution = typeof poolContributions.$inferSelect;
export type InsertPoolContribution = typeof poolContributions.$inferInsert;
export type InvestorVerification = typeof investorVerifications.$inferSelect;
export type InsertInvestorVerification = typeof investorVerifications.$inferInsert;
export type LandGovernanceProposal = typeof landGovernanceProposals.$inferSelect;
export type InsertLandGovernanceProposal = typeof landGovernanceProposals.$inferInsert;

// ============================================================================
// LAND RECLAMATION WORKBOOK TABLES
// ============================================================================

// Workbook Case Status Enum
export const workbookCaseStatusEnum = pgEnum('workbook_case_status', [
  'active',
  'archived'
]);

// Section Completion Status Enum
export const sectionCompletionStatusEnum = pgEnum('section_completion_status', [
  'not_started',
  'in_progress',
  'complete',
  'blocked'
]);

// Record Type Enum
export const recordTypeEnum = pgEnum('record_type', [
  'census',
  'deed',
  'tax',
  'probate',
  'map',
  'court',
  'other'
]);

// Source Type Enum
export const sourceTypeEnum = pgEnum('source_type', [
  'primary',
  'secondary'
]);

// Evidence Confidence Level Enum
export const evidenceConfidenceEnum = pgEnum('evidence_confidence', [
  'unsupported',
  'partially_supported',
  'primary_supported'
]);

// Claim Type Enum
export const claimTypeEnum = pgEnum('claim_type', [
  'birth',
  'death',
  'residency',
  'ownership_indicator',
  'acquisition',
  'transfer',
  'dispossession',
  'current_owner',
  'other'
]);

// Claim Confidence Enum
export const claimConfidenceEnum = pgEnum('claim_confidence', [
  'user_asserted',
  'supported',
  'verified'
]);

// Task Status Enum
export const taskStatusEnum = pgEnum('task_status', [
  'open',
  'done'
]);

// Dispossession Mechanism Enum
export const dispossessionMechanismEnum = pgEnum('dispossession_mechanism', [
  'tax_sale',
  'sheriff_sale',
  'partition',
  'fraud',
  'probate_gap',
  'unknown'
]);

// Dispossession Authority Enum
export const dispossessionAuthorityEnum = pgEnum('dispossession_authority', [
  'court',
  'sheriff',
  'private',
  'unknown'
]);

// Subscription Status Enum
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'canceled'
]);

// Outcome Type Enum
export const outcomeTypeEnum = pgEnum('outcome_type', [
  'attorney_contacted',
  'action_filed',
  'negotiation_started',
  'case_closed',
  'other'
]);

// Assumption Category Enum
export const assumptionCategoryEnum = pgEnum('assumption_category', [
  'date_estimate',
  'relationship_inference',
  'residency_inference',
  'other'
]);

// Workbook Cases Table
export const workbookCases = pgTable("workbook_cases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  caseTitle: varchar("case_title", { length: 255 }).notNull(),
  ancestorPrimaryName: varchar("ancestor_primary_name", { length: 255 }).notNull(),
  ancestorNameVariants: jsonb("ancestor_name_variants").default([]),
  jurisdictionCode: varchar("jurisdiction_code", { length: 10 }),
  status: workbookCaseStatusEnum("status").default('active'),
  ethicalUseAcceptedAt: timestamp("ethical_use_accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("workbook_cases_user_idx").on(table.userId),
  statusIdx: index("workbook_cases_status_idx").on(table.status),
}));

// Workbook Section States Table
export const workbookSectionStates = pgTable("workbook_section_states", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  sectionKey: varchar("section_key", { length: 50 }).notNull(),
  completionStatus: sectionCompletionStatusEnum("completion_status").default('not_started'),
  blockedReason: text("blocked_reason"),
  sectionData: jsonb("section_data").default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  caseIdx: index("section_states_case_idx").on(table.caseId),
  sectionIdx: index("section_states_section_idx").on(table.sectionKey),
}));

// Evidence Items Table
export const evidenceItems = pgTable("evidence_items", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  recordType: recordTypeEnum("record_type").notNull(),
  primaryOrSecondary: sourceTypeEnum("primary_or_secondary").notNull(),
  confidenceLevel: evidenceConfidenceEnum("confidence_level").default('unsupported'),
  sourceName: varchar("source_name", { length: 255 }).notNull(),
  sourceLocation: text("source_location"),
  sourceCitation: text("source_citation"),
  dateAccessed: timestamp("date_accessed").notNull(),
  yearRangeStart: integer("year_range_start"),
  yearRangeEnd: integer("year_range_end"),
  county: varchar("county", { length: 100 }),
  state: varchar("state", { length: 50 }),
  legalDescription: text("legal_description"),
  fileId: varchar("file_id", { length: 255 }),
  extractedText: text("extracted_text"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  caseIdx: index("evidence_items_case_idx").on(table.caseId),
  userIdx: index("evidence_items_user_idx").on(table.userId),
  typeIdx: index("evidence_items_type_idx").on(table.recordType),
}));

// Fact Claims Table
export const factClaims = pgTable("fact_claims", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  claimType: claimTypeEnum("claim_type").notNull(),
  claimText: text("claim_text").notNull(),
  confidenceLevel: claimConfidenceEnum("confidence_level").default('user_asserted'),
  relatedEvidenceIds: jsonb("related_evidence_ids").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  caseIdx: index("fact_claims_case_idx").on(table.caseId),
  userIdx: index("fact_claims_user_idx").on(table.userId),
}));

// Task Items Table
export const taskItems = pgTable("task_items", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sectionKey: varchar("section_key", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  instructions: text("instructions"),
  status: taskStatusEnum("status").default('open'),
  dueAt: timestamp("due_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  caseIdx: index("task_items_case_idx").on(table.caseId),
  userIdx: index("task_items_user_idx").on(table.userId),
  statusIdx: index("task_items_status_idx").on(table.status),
}));

// Timeline Events Table
export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  eventDate: timestamp("event_date"),
  eventYear: integer("event_year"),
  location: varchar("location", { length: 255 }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  relatedEvidenceIds: jsonb("related_evidence_ids").default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  caseIdx: index("timeline_events_case_idx").on(table.caseId),
  yearIdx: index("timeline_events_year_idx").on(table.eventYear),
}));

// Dispossession Events Table
export const dispossessionEvents = pgTable("dispossession_events", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  mechanism: dispossessionMechanismEnum("mechanism").default('unknown'),
  estimatedDate: varchar("estimated_date", { length: 50 }),
  authority: dispossessionAuthorityEnum("authority").default('unknown'),
  description: text("description"),
  relatedEvidenceIds: jsonb("related_evidence_ids").default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  caseIdx: index("dispossession_events_case_idx").on(table.caseId),
}));

// Resource Directory Items Table
export const resourceDirectoryItems = pgTable("resource_directory_items", {
  id: serial("id").primaryKey(),
  sectionKey: varchar("section_key", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  jurisdictions: jsonb("jurisdictions").default([]),
  url: text("url"),
  notes: text("notes"),
  coverageYears: varchar("coverage_years", { length: 100 }),
  pitfalls: text("pitfalls"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  sectionIdx: index("resource_directory_section_idx").on(table.sectionKey),
  activeIdx: index("resource_directory_active_idx").on(table.active),
}));

// Subscription Entitlements Table
export const subscriptionEntitlements = pgTable("subscription_entitlements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  planKey: varchar("plan_key", { length: 50 }).default('workbook_monthly_20'),
  status: subscriptionStatusEnum("status").default('active'),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  providerCustomerId: varchar("provider_customer_id", { length: 100 }),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("subscription_entitlements_user_idx").on(table.userId),
  statusIdx: index("subscription_entitlements_status_idx").on(table.status),
}));

// Staff Interaction Logs Table
export const staffInteractionLogs = pgTable("staff_interaction_logs", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  officeName: varchar("office_name", { length: 255 }).notNull(),
  staffNameOrRole: varchar("staff_name_or_role", { length: 255 }),
  dateVisited: timestamp("date_visited").notNull(),
  summary: text("summary"),
  outcome: text("outcome"),
  nextSteps: text("next_steps"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  caseIdx: index("staff_interaction_logs_case_idx").on(table.caseId),
  userIdx: index("staff_interaction_logs_user_idx").on(table.userId),
}));

// Record Destruction Entries Table
export const recordDestructionEntries = pgTable("record_destruction_entries", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  recordSeries: varchar("record_series", { length: 255 }).notNull(),
  reportedBy: varchar("reported_by", { length: 255 }),
  reportDate: timestamp("report_date"),
  describedReason: text("described_reason"),
  allegedTransferLocation: text("alleged_transfer_location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  caseIdx: index("record_destruction_entries_case_idx").on(table.caseId),
  userIdx: index("record_destruction_entries_user_idx").on(table.userId),
}));

// Assumption Entries Table
export const assumptionEntries = pgTable("assumption_entries", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  category: assumptionCategoryEnum("category").notNull(),
  statement: text("statement").notNull(),
  rationale: text("rationale"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  caseIdx: index("assumption_entries_case_idx").on(table.caseId),
  userIdx: index("assumption_entries_user_idx").on(table.userId),
}));

// Dossier Snapshots Table
export const dossierSnapshots = pgTable("dossier_snapshots", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  snapshotLabel: varchar("snapshot_label", { length: 255 }).notNull(),
  evidenceIds: jsonb("evidence_ids").default([]),
  factClaimIds: jsonb("fact_claim_ids").default([]),
  sectionStates: jsonb("section_states").default({}),
  exportBundleFileId: varchar("export_bundle_file_id", { length: 255 }),
  contentHash: varchar("content_hash", { length: 66 }),
  onChainTxHash: varchar("on_chain_tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  caseIdx: index("dossier_snapshots_case_idx").on(table.caseId),
}));

// Outcome Logs Table
export const outcomeLogs = pgTable("outcome_logs", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => workbookCases.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  outcomeType: outcomeTypeEnum("outcome_type").notNull(),
  dateLogged: timestamp("date_logged").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  caseIdx: index("outcome_logs_case_idx").on(table.caseId),
  userIdx: index("outcome_logs_user_idx").on(table.userId),
}));

// AI Usage Meters Table
export const aiUsageMeters = pgTable("ai_usage_meters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  assistantCalls: integer("assistant_calls").default(0),
  docExtractions: integer("doc_extractions").default(0),
  exportsGenerated: integer("exports_generated").default(0),
  limits: jsonb("limits").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("ai_usage_meters_user_idx").on(table.userId),
  periodIdx: index("ai_usage_meters_period_idx").on(table.periodStart, table.periodEnd),
}));

// ============================================
// LAND ACQUISITION IMPROVEMENTS - 6 NEW FEATURES
// ============================================

// Milestone Status Enum
export const milestoneStatusEnum = pgEnum('milestone_status', [
  'pending',
  'in_progress',
  'completed',
  'verified',
  'failed'
]);

// Secondary Market Listing Status Enum
export const marketListingStatusEnum = pgEnum('market_listing_status', [
  'active',
  'pending',
  'sold',
  'cancelled',
  'expired'
]);

// Token Holder Proposal Status Enum
export const proposalStatusEnum = pgEnum('proposal_status', [
  'draft',
  'active',
  'passed',
  'rejected',
  'executed',
  'cancelled'
]);

// Notification Type Enum
export const notificationTypeEnum = pgEnum('notification_type', [
  'campaign_update',
  'milestone_completed',
  'investment_confirmed',
  'refund_processed',
  'vote_required',
  'market_activity',
  'due_diligence_ready',
  'general'
]);

// 1. Campaign Milestones (Milestone-Based Fund Release)
export const campaignMilestones = pgTable("campaign_milestones", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => crowdfundingCampaigns.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  releasePercentage: decimal("release_percentage", { precision: 5, scale: 2 }).notNull(),
  releaseAmount: decimal("release_amount", { precision: 18, scale: 2 }),
  sequenceOrder: integer("sequence_order").notNull(),
  status: milestoneStatusEnum("status").default('pending'),
  requiredDocuments: jsonb("required_documents").default([]),
  submittedDocuments: jsonb("submitted_documents").default([]),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  completedAt: timestamp("completed_at"),
  fundsReleasedAt: timestamp("funds_released_at"),
  releaseTxHash: varchar("release_tx_hash", { length: 66 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  campaignIdx: index("milestones_campaign_idx").on(table.campaignId),
  statusIdx: index("milestones_status_idx").on(table.status),
  sequenceIdx: index("milestones_sequence_idx").on(table.campaignId, table.sequenceOrder),
}));

// 2. Secondary Market Listings (Peer-to-Peer Token Trading)
export const secondaryMarketListings = pgTable("secondary_market_listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").references(() => users.id).notNull(),
  sellerWallet: varchar("seller_wallet", { length: 42 }).notNull(),
  campaignId: integer("campaign_id").references(() => crowdfundingCampaigns.id),
  poolId: integer("pool_id").references(() => landAcquisitionPools.id),
  tokenType: varchar("token_type", { length: 20 }).notNull(),
  tokenId: integer("token_id"),
  sharesForSale: integer("shares_for_sale").notNull(),
  pricePerShare: decimal("price_per_share", { precision: 18, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 18, scale: 2 }).notNull(),
  minPurchase: integer("min_purchase").default(1),
  status: marketListingStatusEnum("status").default('active'),
  buyerId: integer("buyer_id").references(() => users.id),
  buyerWallet: varchar("buyer_wallet", { length: 42 }),
  soldAt: timestamp("sold_at"),
  saleTxHash: varchar("sale_tx_hash", { length: 66 }),
  expiresAt: timestamp("expires_at"),
  platformFee: decimal("platform_fee", { precision: 18, scale: 2 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  sellerIdx: index("market_seller_idx").on(table.sellerId),
  campaignIdx: index("market_campaign_idx").on(table.campaignId),
  statusIdx: index("market_status_idx").on(table.status),
}));

// 3. Due Diligence Reports
export const dueDiligenceReports = pgTable("due_diligence_reports", {
  id: serial("id").primaryKey(),
  landOptionId: integer("land_option_id").references(() => landOptions.id).notNull(),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  titleSearchCompleted: boolean("title_search_completed").default(false),
  titleSearchDate: timestamp("title_search_date"),
  titleSearchFindings: text("title_search_findings"),
  titleCompany: varchar("title_company", { length: 200 }),
  environmentalAssessmentCompleted: boolean("environmental_assessment_completed").default(false),
  environmentalDate: timestamp("environmental_date"),
  environmentalFindings: text("environmental_findings"),
  environmentalRating: varchar("environmental_rating", { length: 20 }),
  surveyCompleted: boolean("survey_completed").default(false),
  surveyDate: timestamp("survey_date"),
  surveyFindings: text("survey_findings"),
  surveyorName: varchar("surveyor_name", { length: 200 }),
  comparableSales: jsonb("comparable_sales").default([]),
  marketAnalysis: text("market_analysis"),
  estimatedValue: decimal("estimated_value", { precision: 18, scale: 2 }),
  attomPropertyId: varchar("attom_property_id", { length: 100 }),
  attomData: jsonb("attom_data"),
  walkScore: integer("walk_score"),
  transitScore: integer("transit_score"),
  bikeScore: integer("bike_score"),
  zoning: varchar("zoning", { length: 100 }),
  zoningRestrictions: text("zoning_restrictions"),
  utilities: jsonb("utilities").default({}),
  legalIssues: text("legal_issues"),
  riskAssessment: text("risk_assessment"),
  riskScore: integer("risk_score"),
  recommendations: text("recommendations"),
  preparedBy: integer("prepared_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  documentsCID: text("documents_cid"),
  status: varchar("status", { length: 20 }).default('draft'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  landOptionIdx: index("due_diligence_land_idx").on(table.landOptionId),
  statusIdx: index("due_diligence_status_idx").on(table.status),
}));

// 4. Token Holder Proposals (Voting Rights)
export const tokenHolderProposals = pgTable("token_holder_proposals", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => crowdfundingCampaigns.id),
  poolId: integer("pool_id").references(() => landAcquisitionPools.id),
  landOptionId: integer("land_option_id").references(() => landOptions.id),
  proposerId: integer("proposer_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  proposalType: varchar("proposal_type", { length: 50 }).notNull(),
  options: jsonb("options").default([]),
  votingStartDate: timestamp("voting_start_date"),
  votingEndDate: timestamp("voting_end_date"),
  quorumPercentage: decimal("quorum_percentage", { precision: 5, scale: 2 }).default('51'),
  passingThreshold: decimal("passing_threshold", { precision: 5, scale: 2 }).default('50'),
  status: proposalStatusEnum("status").default('draft'),
  totalVotes: integer("total_votes").default(0),
  totalVotingPower: decimal("total_voting_power", { precision: 18, scale: 2 }).default('0'),
  yesVotes: decimal("yes_votes", { precision: 18, scale: 2 }).default('0'),
  noVotes: decimal("no_votes", { precision: 18, scale: 2 }).default('0'),
  abstainVotes: decimal("abstain_votes", { precision: 18, scale: 2 }).default('0'),
  winningOption: integer("winning_option"),
  executedAt: timestamp("executed_at"),
  executionTxHash: varchar("execution_tx_hash", { length: 66 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  campaignIdx: index("proposals_campaign_idx").on(table.campaignId),
  poolIdx: index("proposals_pool_idx").on(table.poolId),
  statusIdx: index("proposals_status_idx").on(table.status),
}));

// Token Holder Votes
export const tokenHolderVotes = pgTable("token_holder_votes", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").references(() => tokenHolderProposals.id).notNull(),
  voterId: integer("voter_id").references(() => users.id).notNull(),
  voterWallet: varchar("voter_wallet", { length: 42 }),
  voteChoice: varchar("vote_choice", { length: 20 }).notNull(),
  votingPower: decimal("voting_power", { precision: 18, scale: 2 }).notNull(),
  sharesHeld: integer("shares_held").notNull(),
  reason: text("reason"),
  signature: text("signature"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  proposalIdx: index("votes_proposal_idx").on(table.proposalId),
  voterIdx: index("votes_voter_idx").on(table.voterId),
  uniqueVote: index("votes_unique_idx").on(table.proposalId, table.voterId),
}));

// 5. Investor Notifications
export const investorNotifications = pgTable("investor_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  campaignId: integer("campaign_id").references(() => crowdfundingCampaigns.id),
  poolId: integer("pool_id").references(() => landAcquisitionPools.id),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"),
  read: boolean("read").default(false),
  readAt: timestamp("read_at"),
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  pushSent: boolean("push_sent").default(false),
  pushSentAt: timestamp("push_sent_at"),
  priority: varchar("priority", { length: 20 }).default('normal'),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId),
  campaignIdx: index("notifications_campaign_idx").on(table.campaignId),
  readIdx: index("notifications_read_idx").on(table.userId, table.read),
  typeIdx: index("notifications_type_idx").on(table.type),
}));

// Campaign Updates (Progress Reports)
export const campaignUpdates = pgTable("campaign_updates", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => crowdfundingCampaigns.id),
  poolId: integer("pool_id").references(() => landAcquisitionPools.id),
  authorId: integer("author_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  updateType: varchar("update_type", { length: 50 }).default('general'),
  images: jsonb("images").default([]),
  videoCID: text("video_cid"),
  attachments: jsonb("attachments").default([]),
  visibility: varchar("visibility", { length: 20 }).default('investors_only'),
  notifyInvestors: boolean("notify_investors").default(true),
  notificationsSent: integer("notifications_sent").default(0),
  viewCount: integer("view_count").default(0),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  campaignIdx: index("updates_campaign_idx").on(table.campaignId),
  poolIdx: index("updates_pool_idx").on(table.poolId),
  authorIdx: index("updates_author_idx").on(table.authorId),
}));

// 6. Investor Portfolio Summary (for Dashboard)
export const investorPortfolios = pgTable("investor_portfolios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  totalInvested: decimal("total_invested", { precision: 18, scale: 2 }).default('0'),
  totalCurrentValue: decimal("total_current_value", { precision: 18, scale: 2 }).default('0'),
  totalReturns: decimal("total_returns", { precision: 18, scale: 2 }).default('0'),
  activeCampaigns: integer("active_campaigns").default(0),
  activePools: integer("active_pools").default(0),
  totalSharesOwned: integer("total_shares_owned").default(0),
  pendingVotes: integer("pending_votes").default(0),
  unreadNotifications: integer("unread_notifications").default(0),
  lastActivityAt: timestamp("last_activity_at"),
  riskProfile: varchar("risk_profile", { length: 20 }),
  preferences: jsonb("preferences").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("portfolio_user_idx").on(table.userId),
}));

// Investor Documents Vault
export const investorDocuments = pgTable("investor_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  campaignId: integer("campaign_id").references(() => crowdfundingCampaigns.id),
  poolId: integer("pool_id").references(() => landAcquisitionPools.id),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  fileCID: text("file_cid"),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  generatedAt: timestamp("generated_at"),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("investor_docs_user_idx").on(table.userId),
  campaignIdx: index("investor_docs_campaign_idx").on(table.campaignId),
  typeIdx: index("investor_docs_type_idx").on(table.documentType),
}));

// Export types for Land Acquisition Improvements
export type CampaignMilestone = typeof campaignMilestones.$inferSelect;
export type InsertCampaignMilestone = typeof campaignMilestones.$inferInsert;
export type SecondaryMarketListing = typeof secondaryMarketListings.$inferSelect;
export type InsertSecondaryMarketListing = typeof secondaryMarketListings.$inferInsert;
export type DueDiligenceReport = typeof dueDiligenceReports.$inferSelect;
export type InsertDueDiligenceReport = typeof dueDiligenceReports.$inferInsert;
export type TokenHolderProposal = typeof tokenHolderProposals.$inferSelect;
export type InsertTokenHolderProposal = typeof tokenHolderProposals.$inferInsert;
export type TokenHolderVote = typeof tokenHolderVotes.$inferSelect;
export type InsertTokenHolderVote = typeof tokenHolderVotes.$inferInsert;
export type InvestorNotification = typeof investorNotifications.$inferSelect;
export type InsertInvestorNotification = typeof investorNotifications.$inferInsert;
export type CampaignUpdate = typeof campaignUpdates.$inferSelect;
export type InsertCampaignUpdate = typeof campaignUpdates.$inferInsert;
export type InvestorPortfolio = typeof investorPortfolios.$inferSelect;
export type InsertInvestorPortfolio = typeof investorPortfolios.$inferInsert;
export type InvestorDocument = typeof investorDocuments.$inferSelect;
export type InsertInvestorDocument = typeof investorDocuments.$inferInsert;

// Export types for Workbook tables
export type WorkbookCase = typeof workbookCases.$inferSelect;
export type InsertWorkbookCase = typeof workbookCases.$inferInsert;
export type WorkbookSectionState = typeof workbookSectionStates.$inferSelect;
export type InsertWorkbookSectionState = typeof workbookSectionStates.$inferInsert;
export type EvidenceItem = typeof evidenceItems.$inferSelect;
export type InsertEvidenceItem = typeof evidenceItems.$inferInsert;
export type FactClaim = typeof factClaims.$inferSelect;
export type InsertFactClaim = typeof factClaims.$inferInsert;
export type TaskItem = typeof taskItems.$inferSelect;
export type InsertTaskItem = typeof taskItems.$inferInsert;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertTimelineEvent = typeof timelineEvents.$inferInsert;
export type DispossessionEvent = typeof dispossessionEvents.$inferSelect;
export type InsertDispossessionEvent = typeof dispossessionEvents.$inferInsert;
export type ResourceDirectoryItem = typeof resourceDirectoryItems.$inferSelect;
export type InsertResourceDirectoryItem = typeof resourceDirectoryItems.$inferInsert;
export type SubscriptionEntitlement = typeof subscriptionEntitlements.$inferSelect;
export type InsertSubscriptionEntitlement = typeof subscriptionEntitlements.$inferInsert;
export type StaffInteractionLog = typeof staffInteractionLogs.$inferSelect;
export type InsertStaffInteractionLog = typeof staffInteractionLogs.$inferInsert;
export type RecordDestructionEntry = typeof recordDestructionEntries.$inferSelect;
export type InsertRecordDestructionEntry = typeof recordDestructionEntries.$inferInsert;
export type AssumptionEntry = typeof assumptionEntries.$inferSelect;
export type InsertAssumptionEntry = typeof assumptionEntries.$inferInsert;
export type DossierSnapshot = typeof dossierSnapshots.$inferSelect;
export type InsertDossierSnapshot = typeof dossierSnapshots.$inferInsert;
export type OutcomeLog = typeof outcomeLogs.$inferSelect;
export type InsertOutcomeLog = typeof outcomeLogs.$inferInsert;
export type AiUsageMeter = typeof aiUsageMeters.$inferSelect;
export type InsertAiUsageMeter = typeof aiUsageMeters.$inferInsert;

// ============================================
// CLOSED-LOOP COORDINATION SYSTEM TABLES
// PMA Membership, Purpose Pools, Treasury, Audit
// ============================================

// Membership status for PMA gating
export const membershipStatusEnum = pgEnum('membership_status', [
  'applicant',
  'member',
  'suspended',
  'removed'
]);

// Purpose pool lifecycle
export const purposePoolStatusEnum = pgEnum('purpose_pool_status', [
  'draft',
  'open',
  'paused',
  'closed',
  'executing'
]);

// Pool commitment lifecycle
export const poolCommitmentStatusEnum = pgEnum('pool_commitment_status', [
  'committed',
  'withdrawn',
  'locked',
  'released'
]);

// Governance proposal lifecycle
export const governanceProposalStatusEnum = pgEnum('governance_proposal_status', [
  'draft',
  'voting',
  'approved',
  'rejected',
  'executed'
]);

// Vote options
export const voteOptionEnum = pgEnum('vote_option', [
  'yes',
  'no',
  'abstain'
]);

// Proposal categories
export const proposalCategoryEnum = pgEnum('proposal_category', [
  'due_diligence',
  'legal',
  'survey',
  'steward_ops',
  'option_deposit',
  'close_costs',
  'other'
]);

// Land candidate stages
export const landCandidateStageEnum = pgEnum('land_candidate_stage', [
  'candidate',
  'under_review',
  'due_diligence',
  'ready_for_vote',
  'approved_for_execution',
  'acquired',
  'archived'
]);

// Treasury transaction types
export const treasuryTransactionTypeEnum = pgEnum('treasury_transaction_type', [
  'deposit',
  'withdrawal',
  'commitment',
  'release',
  'disbursement',
  'fee',
  'adjustment'
]);

// PMA Membership tracking on users (extended via separate table for flexibility)
export const membershipRecords = pgTable("membership_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  membershipStatus: membershipStatusEnum("membership_status").default('applicant'),
  membershipAcceptedAt: timestamp("membership_accepted_at"),
  membershipAgreementVersion: varchar("membership_agreement_version", { length: 20 }),
  disclosureAcceptedAt: timestamp("disclosure_accepted_at"),
  disclosureVersion: varchar("disclosure_version", { length: 20 }),
  rulesAcceptedAt: timestamp("rules_accepted_at"),
  rulesVersion: varchar("rules_version", { length: 20 }),
  suspendedAt: timestamp("suspended_at"),
  suspendedReason: text("suspended_reason"),
  removedAt: timestamp("removed_at"),
  removedReason: text("removed_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("membership_user_idx").on(table.userId),
  statusIdx: index("membership_status_idx").on(table.membershipStatus),
}));

// Community treasuries
export const treasuries = pgTable("treasuries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  purpose: text("purpose"),
  policyJson: jsonb("policy_json").default({}),
  totalBalanceAxusd: decimal("total_balance_axusd", { precision: 28, scale: 8 }).default('0'),
  createdBy: integer("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Treasury transactions ledger
export const treasuryTransactions = pgTable("treasury_transactions", {
  id: serial("id").primaryKey(),
  treasuryId: integer("treasury_id").references(() => treasuries.id).notNull(),
  transactionType: treasuryTransactionTypeEnum("transaction_type").notNull(),
  amountAxusd: decimal("amount_axusd", { precision: 28, scale: 8 }).notNull(),
  fromAddress: varchar("from_address", { length: 42 }),
  toAddress: varchar("to_address", { length: 42 }),
  txHash: varchar("tx_hash", { length: 66 }),
  memo: text("memo"),
  proposalId: integer("proposal_id"),
  poolId: integer("pool_id"),
  executedBy: integer("executed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  treasuryIdx: index("treasury_tx_treasury_idx").on(table.treasuryId),
  typeIdx: index("treasury_tx_type_idx").on(table.transactionType),
  createdIdx: index("treasury_tx_created_idx").on(table.createdAt),
}));

// Member AXUSD balances (cached from chain or off-chain tracking)
export const memberBalances = pgTable("member_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  axusdBalance: decimal("axusd_balance", { precision: 28, scale: 8 }).default('0'),
  axusdCommitted: decimal("axusd_committed", { precision: 28, scale: 8 }).default('0'),
  axusdAvailable: decimal("axusd_available", { precision: 28, scale: 8 }).default('0'),
  lastSyncedAt: timestamp("last_synced_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("member_balance_user_idx").on(table.userId),
}));

// Purpose pools for coordinated resource allocation
export const purposePools = pgTable("purpose_pools", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  purpose: text("purpose").notNull(),
  description: text("description"),
  status: purposePoolStatusEnum("status").default('draft'),
  treasuryId: integer("treasury_id").references(() => treasuries.id),
  targetAmountAxusd: decimal("target_amount_axusd", { precision: 28, scale: 8 }),
  currentAmountAxusd: decimal("current_amount_axusd", { precision: 28, scale: 8 }).default('0'),
  minCommitAxusd: decimal("min_commit_axusd", { precision: 28, scale: 8 }).default('50'),
  maxCommitAxusd: decimal("max_commit_axusd", { precision: 28, scale: 8 }),
  memberLimit: integer("member_limit"),
  currentMemberCount: integer("current_member_count").default(0),
  landCandidateId: integer("land_candidate_id"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("purpose_pool_status_idx").on(table.status),
  treasuryIdx: index("purpose_pool_treasury_idx").on(table.treasuryId),
}));

// Pool governance rules
export const poolRules = pgTable("pool_rules", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").references(() => purposePools.id).notNull().unique(),
  rulesJson: jsonb("rules_json").default({}),
  withdrawWindowDays: integer("withdraw_window_days").default(7),
  quorumPercentage: decimal("quorum_percentage", { precision: 5, scale: 2 }).default('51'),
  approvalThreshold: decimal("approval_threshold", { precision: 5, scale: 2 }).default('66'),
  votingDurationDays: integer("voting_duration_days").default(7),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pool-specific disclosures
export const poolDisclosures = pgTable("pool_disclosures", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").references(() => purposePools.id).notNull(),
  disclosureText: text("disclosure_text").notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  requiresAcknowledgment: boolean("requires_acknowledgment").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  poolIdx: index("pool_disclosure_pool_idx").on(table.poolId),
}));

// Member commitments to pools
export const poolCommitments = pgTable("pool_commitments", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").references(() => purposePools.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amountAxusd: decimal("amount_axusd", { precision: 28, scale: 8 }).notNull(),
  status: poolCommitmentStatusEnum("status").default('committed'),
  committedAt: timestamp("committed_at").defaultNow(),
  lockedAt: timestamp("locked_at"),
  releasedAt: timestamp("released_at"),
  withdrawnAt: timestamp("withdrawn_at"),
  disclosureVersion: varchar("disclosure_version", { length: 20 }),
  disclosureAcceptedAt: timestamp("disclosure_accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  poolIdx: index("pool_commitment_pool_idx").on(table.poolId),
  userIdx: index("pool_commitment_user_idx").on(table.userId),
  statusIdx: index("pool_commitment_status_idx").on(table.status),
}));

// Governance proposals for pool spending
export const governanceProposals = pgTable("governance_proposals", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").references(() => purposePools.id),
  treasuryId: integer("treasury_id").references(() => treasuries.id),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  amountAxusd: decimal("amount_axusd", { precision: 28, scale: 8 }),
  recipientAddress: varchar("recipient_address", { length: 42 }),
  recipientName: varchar("recipient_name", { length: 200 }),
  category: proposalCategoryEnum("category").default('other'),
  status: governanceProposalStatusEnum("status").default('draft'),
  quorumRequired: decimal("quorum_required", { precision: 5, scale: 2 }).default('51'),
  approvalThreshold: decimal("approval_threshold", { precision: 5, scale: 2 }).default('66'),
  votingStartsAt: timestamp("voting_starts_at"),
  votingEndsAt: timestamp("voting_ends_at"),
  totalVotes: integer("total_votes").default(0),
  yesVotes: decimal("yes_votes", { precision: 28, scale: 8 }).default('0'),
  noVotes: decimal("no_votes", { precision: 28, scale: 8 }).default('0'),
  abstainVotes: decimal("abstain_votes", { precision: 28, scale: 8 }).default('0'),
  executedAt: timestamp("executed_at"),
  executedBy: integer("executed_by").references(() => users.id),
  executionTxHash: varchar("execution_tx_hash", { length: 66 }),
  landCandidateId: integer("land_candidate_id"),
  attachments: jsonb("attachments").default([]),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  poolIdx: index("gov_proposal_pool_idx").on(table.poolId),
  statusIdx: index("gov_proposal_status_idx").on(table.status),
  categoryIdx: index("gov_proposal_category_idx").on(table.category),
}));

// Member votes on proposals
export const governanceVotes = pgTable("governance_votes", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").references(() => governanceProposals.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  vote: voteOptionEnum("vote").notNull(),
  weight: decimal("weight", { precision: 28, scale: 8 }).default('1'),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  proposalIdx: index("gov_vote_proposal_idx").on(table.proposalId),
  userIdx: index("gov_vote_user_idx").on(table.userId),
  uniqueVoteIdx: index("gov_vote_unique_idx").on(table.proposalId, table.userId),
}));

// Land candidates (enhanced land submissions)
export const landCandidates = pgTable("land_candidates", {
  id: serial("id").primaryKey(),
  landSubmissionId: integer("land_submission_id"),
  name: varchar("name", { length: 300 }).notNull(),
  location: varchar("location", { length: 300 }),
  county: varchar("county", { length: 100 }),
  state: varchar("state", { length: 50 }),
  acreage: decimal("acreage", { precision: 10, scale: 2 }),
  askingPrice: decimal("asking_price", { precision: 18, scale: 2 }),
  propertyType: varchar("property_type", { length: 100 }),
  stage: landCandidateStageEnum("stage").default('candidate'),
  stewardshipIntent: text("stewardship_intent"),
  publicSummary: text("public_summary"),
  featuredImageUrl: varchar("featured_image_url", { length: 500 }),
  listingUrl: varchar("listing_url", { length: 500 }),
  isAccessVerified: boolean("is_access_verified").default(false),
  isTitleReviewed: boolean("is_title_reviewed").default(false),
  isMineralRightsReviewed: boolean("is_mineral_rights_reviewed").default(false),
  isSurveyVerified: boolean("is_survey_verified").default(false),
  isEnvironmentalScreened: boolean("is_environmental_screened").default(false),
  isOptionDocsUploaded: boolean("is_option_docs_uploaded").default(false),
  isPurchaseApprovedByVote: boolean("is_purchase_approved_by_vote").default(false),
  dueDiligenceProgress: integer("due_diligence_progress").default(0),
  assignedStewardId: integer("assigned_steward_id").references(() => users.id),
  poolId: integer("pool_id").references(() => purposePools.id),
  approvalProposalId: integer("approval_proposal_id"),
  acquiredAt: timestamp("acquired_at"),
  archivedAt: timestamp("archived_at"),
  archivedReason: text("archived_reason"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  stageIdx: index("land_candidate_stage_idx").on(table.stage),
  stewardIdx: index("land_candidate_steward_idx").on(table.assignedStewardId),
  poolIdx: index("land_candidate_pool_idx").on(table.poolId),
}));

// System audit logs
export const systemAuditLogs = pgTable("system_audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  actorIdx: index("audit_log_actor_idx").on(table.actorUserId),
  actionIdx: index("audit_log_action_idx").on(table.action),
  entityIdx: index("audit_log_entity_idx").on(table.entityType, table.entityId),
  createdIdx: index("audit_log_created_idx").on(table.createdAt),
}));

// Disclosure acknowledgments (universal tracking)
export const disclosureAcknowledgments = pgTable("disclosure_acknowledgments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  disclosureType: varchar("disclosure_type", { length: 50 }).notNull(),
  disclosureVersion: varchar("disclosure_version", { length: 20 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: integer("entity_id"),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
}, (table) => ({
  userIdx: index("disclosure_ack_user_idx").on(table.userId),
  typeIdx: index("disclosure_ack_type_idx").on(table.disclosureType),
  entityIdx: index("disclosure_ack_entity_idx").on(table.entityType, table.entityId),
}));

// ============================================
// STEWARD CORPS TRAINING PROGRAM
// ============================================

// Training tier enum
export const trainingTierEnum = pgEnum("training_tier", [
  'premium',      // $2,500 - Full certification + land priority + max AXUSD
  'standard',     // $1,000 - Full certification + standard benefits
  'scholarship'   // Subsidized - For qualifying applicants
]);

// Training phase enum
export const trainingPhaseEnum = pgEnum("training_phase", [
  'enrolled',     // Just enrolled, not started
  'online',       // Online self-paced modules
  'classroom',    // Live cohort sessions
  'field',        // On-site practical training
  'graduated',    // Completed all phases
  'covenant'      // Signed lifetime covenant
]);

// Module status enum
export const moduleStatusEnum = pgEnum("module_status", [
  'locked',
  'available',
  'in_progress',
  'completed'
]);

// Training Programs (cohorts)
export const trainingPrograms = pgTable("training_programs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxEnrollment: integer("max_enrollment").default(50),
  currentEnrollment: integer("current_enrollment").default(0),
  isActive: boolean("is_active").default(true),
  isAcceptingEnrollment: boolean("is_accepting_enrollment").default(true),
  fieldSiteLocation: varchar("field_site_location", { length: 300 }),
  fieldSiteState: varchar("field_site_state", { length: 50 }),
  classroomSchedule: jsonb("classroom_schedule"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training Enrollments
export const trainingEnrollments = pgTable("training_enrollments", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => trainingPrograms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }),
  tier: trainingTierEnum("tier").notNull(),
  currentPhase: trainingPhaseEnum("current_phase").default('enrolled'),
  
  // Payment info
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 100 }),
  paymentStatus: varchar("payment_status", { length: 20 }).default('pending'),
  
  // Scholarship info
  scholarshipApproved: boolean("scholarship_approved").default(false),
  scholarshipReason: text("scholarship_reason"),
  
  // Progress tracking
  onlineProgress: integer("online_progress").default(0),
  classroomAttendance: integer("classroom_attendance").default(0),
  classroomSessionsTotal: integer("classroom_sessions_total").default(6),
  fieldDaysCompleted: integer("field_days_completed").default(0),
  fieldDaysRequired: integer("field_days_required").default(30),
  
  // Completion dates
  onlineCompletedAt: timestamp("online_completed_at"),
  classroomCompletedAt: timestamp("classroom_completed_at"),
  fieldCompletedAt: timestamp("field_completed_at"),
  graduatedAt: timestamp("graduated_at"),
  covenantSignedAt: timestamp("covenant_signed_at"),
  
  // Rewards
  axusdRewardAmount: decimal("axusd_reward_amount", { precision: 18, scale: 2 }),
  axusdRewardDistributedAt: timestamp("axusd_reward_distributed_at"),
  landAccessGrantedAt: timestamp("land_access_granted_at"),
  assignedLandCandidateId: integer("assigned_land_candidate_id").references(() => landCandidates.id, { onDelete: 'set null' }),
  
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  programIdx: index("training_enrollment_program_idx").on(table.programId),
  userIdx: index("training_enrollment_user_idx").on(table.userId),
  walletIdx: index("training_enrollment_wallet_idx").on(table.walletAddress),
  phaseIdx: index("training_enrollment_phase_idx").on(table.currentPhase),
  uniqueEnrollment: unique("unique_program_user_enrollment").on(table.programId, table.userId),
}));

// Training Modules (curriculum content)
export const trainingModules = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  phase: trainingPhaseEnum("phase").notNull(),
  moduleOrder: integer("module_order").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 300 }),
  description: text("description"),
  content: text("content"),
  videoUrl: varchar("video_url", { length: 500 }),
  estimatedMinutes: integer("estimated_minutes").default(30),
  
  // Quiz/assessment
  hasQuiz: boolean("has_quiz").default(false),
  quizQuestions: jsonb("quiz_questions"),
  passingScore: integer("passing_score").default(80),
  
  // Requirements
  prerequisiteModuleId: integer("prerequisite_module_id"),
  isRequired: boolean("is_required").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  phaseIdx: index("training_module_phase_idx").on(table.phase),
  orderIdx: index("training_module_order_idx").on(table.moduleOrder),
}));

// Module Progress (per user)
export const trainingModuleProgress = pgTable("training_module_progress", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollment_id").references(() => trainingEnrollments.id).notNull(),
  moduleId: integer("module_id").references(() => trainingModules.id).notNull(),
  status: moduleStatusEnum("status").default('locked'),
  progress: integer("progress").default(0),
  
  // Quiz results
  quizAttempts: integer("quiz_attempts").default(0),
  quizScore: integer("quiz_score"),
  quizPassedAt: timestamp("quiz_passed_at"),
  
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  enrollmentIdx: index("module_progress_enrollment_idx").on(table.enrollmentId),
  moduleIdx: index("module_progress_module_idx").on(table.moduleId),
  uniqueProgress: unique("unique_enrollment_module_progress").on(table.enrollmentId, table.moduleId),
}));

// Field Training Checklists
export const fieldTrainingChecklists = pgTable("field_training_checklists", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollment_id").references(() => trainingEnrollments.id).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  taskName: varchar("task_name", { length: 300 }).notNull(),
  taskDescription: text("task_description"),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  supervisorApproved: boolean("supervisor_approved").default(false),
  supervisorId: integer("supervisor_id").references(() => users.id),
  supervisorNotes: text("supervisor_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  enrollmentIdx: index("field_checklist_enrollment_idx").on(table.enrollmentId),
  categoryIdx: index("field_checklist_category_idx").on(table.category),
}));

// Steward Covenant Records
export const stewardCovenants = pgTable("steward_covenants", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollment_id").references(() => trainingEnrollments.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }),
  
  // Covenant details
  covenantVersion: varchar("covenant_version", { length: 20 }).default('1.0'),
  covenantText: text("covenant_text").notNull(),
  
  // Signature
  signedAt: timestamp("signed_at").notNull(),
  signatureHash: varchar("signature_hash", { length: 66 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Status
  isActive: boolean("is_active").default(true),
  revokedAt: timestamp("revoked_at"),
  revocationReason: text("revocation_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  enrollmentIdx: index("covenant_enrollment_idx").on(table.enrollmentId),
  userIdx: index("covenant_user_idx").on(table.userId),
  walletIdx: index("covenant_wallet_idx").on(table.walletAddress),
}));

// Training Certificates (proof of graduation)
export const trainingCertificates = pgTable("training_certificates", {
  id: serial("id").primaryKey(),
  enrollmentId: integer("enrollment_id").references(() => trainingEnrollments.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  certificateNumber: varchar("certificate_number", { length: 50 }).notNull(),
  tier: trainingTierEnum("tier").notNull(),
  
  // Certificate details
  issuedAt: timestamp("issued_at").notNull(),
  validFrom: timestamp("valid_from").notNull(),
  
  // On-chain verification (optional NFT)
  tokenId: varchar("token_id", { length: 100 }),
  contractAddress: varchar("contract_address", { length: 42 }),
  txHash: varchar("tx_hash", { length: 66 }),
  
  // PDF certificate
  pdfUrl: varchar("pdf_url", { length: 500 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  enrollmentIdx: index("certificate_enrollment_idx").on(table.enrollmentId),
  userIdx: index("certificate_user_idx").on(table.userId),
  certNumIdx: index("certificate_number_idx").on(table.certificateNumber),
}));

// Export types for Training Program
export type TrainingProgram = typeof trainingPrograms.$inferSelect;
export type InsertTrainingProgram = typeof trainingPrograms.$inferInsert;
export type TrainingEnrollment = typeof trainingEnrollments.$inferSelect;
export type InsertTrainingEnrollment = typeof trainingEnrollments.$inferInsert;
export type TrainingModule = typeof trainingModules.$inferSelect;
export type InsertTrainingModule = typeof trainingModules.$inferInsert;
export type TrainingModuleProgress = typeof trainingModuleProgress.$inferSelect;
export type InsertTrainingModuleProgress = typeof trainingModuleProgress.$inferInsert;
export type FieldTrainingChecklist = typeof fieldTrainingChecklists.$inferSelect;
export type InsertFieldTrainingChecklist = typeof fieldTrainingChecklists.$inferInsert;
export type StewardCovenant = typeof stewardCovenants.$inferSelect;
export type InsertStewardCovenant = typeof stewardCovenants.$inferInsert;
export type TrainingCertificate = typeof trainingCertificates.$inferSelect;
export type InsertTrainingCertificate = typeof trainingCertificates.$inferInsert;

// Export types for Closed-Loop System
export type MembershipRecord = typeof membershipRecords.$inferSelect;
export type InsertMembershipRecord = typeof membershipRecords.$inferInsert;
export type Treasury = typeof treasuries.$inferSelect;
export type InsertTreasury = typeof treasuries.$inferInsert;
export type TreasuryTransaction = typeof treasuryTransactions.$inferSelect;
export type InsertTreasuryTransaction = typeof treasuryTransactions.$inferInsert;
export type MemberBalance = typeof memberBalances.$inferSelect;
export type InsertMemberBalance = typeof memberBalances.$inferInsert;
export type PurposePool = typeof purposePools.$inferSelect;
export type InsertPurposePool = typeof purposePools.$inferInsert;
export type PoolRule = typeof poolRules.$inferSelect;
export type InsertPoolRule = typeof poolRules.$inferInsert;
export type PoolDisclosure = typeof poolDisclosures.$inferSelect;
export type InsertPoolDisclosure = typeof poolDisclosures.$inferInsert;
export type PoolCommitment = typeof poolCommitments.$inferSelect;
export type InsertPoolCommitment = typeof poolCommitments.$inferInsert;
export type GovernanceProposal = typeof governanceProposals.$inferSelect;
export type InsertGovernanceProposal = typeof governanceProposals.$inferInsert;
export type GovernanceVote = typeof governanceVotes.$inferSelect;
export type InsertGovernanceVote = typeof governanceVotes.$inferInsert;
export type LandCandidate = typeof landCandidates.$inferSelect;
export type InsertLandCandidate = typeof landCandidates.$inferInsert;
export type SystemAuditLog = typeof systemAuditLogs.$inferSelect;
export type InsertSystemAuditLog = typeof systemAuditLogs.$inferInsert;
export type DisclosureAcknowledgment = typeof disclosureAcknowledgments.$inferSelect;
export type InsertDisclosureAcknowledgment = typeof disclosureAcknowledgments.$inferInsert;

// ============================================
// Phase 9-14 Extended Upgrade Tables
// ============================================

// Analytics Alerts System
export const analyticsAlertStatusEnum = pgEnum('analytics_alert_status', ['pending', 'triggered', 'acknowledged', 'resolved']);
export const analyticsAlertSeverityEnum = pgEnum('analytics_alert_severity', ['info', 'warning', 'critical']);

export const analyticsAlerts = pgTable("analytics_alerts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  metric: varchar("metric", { length: 100 }).notNull(),
  condition: varchar("condition", { length: 50 }).notNull(),
  threshold: decimal("threshold", { precision: 18, scale: 8 }).notNull(),
  currentValue: decimal("current_value", { precision: 18, scale: 8 }),
  status: analyticsAlertStatusEnum("status").default('pending'),
  severity: analyticsAlertSeverityEnum("severity").default('info'),
  triggeredAt: timestamp("triggered_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by", { length: 42 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("alert_status_idx").on(table.status),
  metricIdx: index("alert_metric_idx").on(table.metric),
}));

// Quest System
export const questCategoryEnum = pgEnum('quest_category', ['onboarding', 'participation', 'governance', 'social', 'loyalty', 'special']);
export const questStatusEnum = pgEnum('quest_status', ['available', 'in_progress', 'completed', 'expired']);

export const quests = pgTable("quests", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: questCategoryEnum("category").notNull(),
  requirements: jsonb("requirements").notNull(),
  rewards: jsonb("rewards").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxCompletions: integer("max_completions"),
  currentCompletions: integer("current_completions").default(0),
  repeatable: boolean("repeatable").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("quest_category_idx").on(table.category),
  activeIdx: index("quest_active_idx").on(table.isActive),
}));

export const userQuests = pgTable("user_quests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  questId: integer("quest_id").references(() => quests.id).notNull(),
  status: questStatusEnum("status").default('available'),
  progress: integer("progress").default(0),
  requirementProgress: jsonb("requirement_progress"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  rewardsClaimedAt: timestamp("rewards_claimed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("user_quest_user_idx").on(table.userId),
  questIdx: index("user_quest_quest_idx").on(table.questId),
  statusIdx: index("user_quest_status_idx").on(table.status),
}));

export const userXpLevels = pgTable("user_xp_levels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  totalXp: integer("total_xp").default(0),
  level: integer("level").default(1),
  badges: jsonb("badges"),
  loginStreak: integer("login_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastLoginDate: timestamp("last_login_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("user_xp_user_idx").on(table.userId),
  levelIdx: index("user_xp_level_idx").on(table.level),
}));

// Membership Subscriptions
export const membershipTierEnum = pgEnum('membership_tier', ['free', 'basic', 'premium', 'enterprise']);

export const membershipSubscriptions = pgTable("membership_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tier: membershipTierEnum("tier").notNull(),
  status: subscriptionStatusEnum("status").default('active'),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("subscription_user_idx").on(table.userId),
  statusIdx: index("subscription_status_idx").on(table.status),
  tierIdx: index("subscription_tier_idx").on(table.tier),
}));

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  discount: decimal("discount", { precision: 5, scale: 2 }).default('10'),
  commission: decimal("commission", { precision: 5, scale: 2 }).default('15'),
  uses: integer("uses").default(0),
  maxUses: integer("max_uses"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  codeIdx: index("referral_code_idx").on(table.code),
  creatorIdx: index("referral_creator_idx").on(table.creatorId),
}));

export const referralEarnings = pgTable("referral_earnings", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => users.id).notNull(),
  referredId: integer("referred_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default('pending'),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  referrerIdx: index("earning_referrer_idx").on(table.referrerId),
  statusIdx: index("earning_status_idx").on(table.status),
}));

// AML Risk Level Enum (used with existing kycVerifications table)
export const amlRiskLevelEnum = pgEnum('aml_risk_level', ['low', 'medium', 'high', 'blocked']);

export const complianceAuditLogs = pgTable("compliance_audit_logs", {
  id: serial("id").primaryKey(),
  action: varchar("action", { length: 200 }).notNull(),
  actor: varchar("actor", { length: 200 }).notNull(),
  actorType: varchar("actor_type", { length: 50 }).default('user'),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 100 }),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  txHash: varchar("tx_hash", { length: 66 }),
  severity: varchar("severity", { length: 20 }).default('info'),
  immutable: boolean("immutable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  actionIdx: index("audit_action_idx").on(table.action),
  actorIdx: index("audit_actor_idx").on(table.actor),
  resourceIdx: index("audit_resource_idx").on(table.resource),
  timestampIdx: index("audit_timestamp_idx").on(table.createdAt),
}));

// DePIN & IoT Extended System
export const iotDeviceStatusEnum = pgEnum('iot_device_status', ['online', 'offline', 'maintenance']);

export const iotDevices = pgTable("iot_devices", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  deviceType: varchar("device_type", { length: 50 }).notNull(),
  landAssetId: varchar("land_asset_id", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  address: varchar("address", { length: 300 }),
  status: iotDeviceStatusEnum("status").default('offline'),
  lastSeen: timestamp("last_seen"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("device_status_idx").on(table.status),
  landIdx: index("device_land_idx").on(table.landAssetId),
}));

export const sensorReadings = pgTable("sensor_readings", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").references(() => iotDevices.id).notNull(),
  readingType: varchar("reading_type", { length: 100 }).notNull(),
  value: decimal("value", { precision: 18, scale: 8 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  verified: boolean("verified").default(false),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  deviceIdx: index("reading_device_idx").on(table.deviceId),
  typeIdx: index("reading_type_idx").on(table.readingType),
  timestampIdx: index("reading_timestamp_idx").on(table.createdAt),
}));

export const assetOracles = pgTable("asset_oracles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  oracleType: varchar("oracle_type", { length: 50 }).notNull(),
  source: varchar("source", { length: 200 }).notNull(),
  value: decimal("value", { precision: 18, scale: 8 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  chainlinkAddress: varchar("chainlink_address", { length: 42 }),
  lastUpdate: timestamp("last_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  typeIdx: index("oracle_type_idx").on(table.oracleType),
  sourceIdx: index("oracle_source_idx").on(table.source),
}));

export const crossChainSettlements = pgTable("cross_chain_settlements", {
  id: serial("id").primaryKey(),
  sourceChain: varchar("source_chain", { length: 100 }).notNull(),
  destinationChain: varchar("destination_chain", { length: 100 }).notNull(),
  asset: varchar("asset", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  status: varchar("status", { length: 50 }).default('pending'),
  sourceTxHash: varchar("source_tx_hash", { length: 66 }),
  destTxHash: varchar("dest_tx_hash", { length: 66 }),
  fee: decimal("fee", { precision: 18, scale: 8 }),
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  statusIdx: index("settlement_status_idx").on(table.status),
  sourceIdx: index("settlement_source_idx").on(table.sourceChain),
}));

export const energyCredits = pgTable("energy_credits", {
  id: serial("id").primaryKey(),
  landAssetId: varchar("land_asset_id", { length: 100 }).notNull(),
  creditType: varchar("credit_type", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  verified: boolean("verified").default(false),
  tokenized: boolean("tokenized").default(false),
  tokenId: varchar("token_id", { length: 100 }),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  landIdx: index("credit_land_idx").on(table.landAssetId),
  typeIdx: index("credit_type_idx").on(table.creditType),
}));

// ============================================
// AXUSD STABLECOIN SYSTEM TABLES
// ============================================

// AXUSD Historical Snapshots - Daily metrics tracking
export const axusdSnapshots = pgTable("axusd_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  totalSupply: decimal("total_supply", { precision: 24, scale: 8 }).notNull(),
  circulatingSupply: decimal("circulating_supply", { precision: 24, scale: 8 }).notNull(),
  psmReserveUsdc: decimal("psm_reserve_usdc", { precision: 24, scale: 8 }).notNull(),
  backstopReserveUsdc: decimal("backstop_reserve_usdc", { precision: 24, scale: 8 }),
  tbillReserve: decimal("tbill_reserve", { precision: 24, scale: 8 }),
  reserveRatio: decimal("reserve_ratio", { precision: 8, scale: 4 }),
  pegPrice: decimal("peg_price", { precision: 12, scale: 8 }),
  lpTvl: decimal("lp_tvl", { precision: 24, scale: 8 }),
  lpApr: decimal("lp_apr", { precision: 8, scale: 4 }),
  dailyVolume: decimal("daily_volume", { precision: 24, scale: 8 }),
  dailyFees: decimal("daily_fees", { precision: 24, scale: 8 }),
  uniqueHolders: integer("unique_holders"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  dateIdx: index("axusd_snapshot_date_idx").on(table.snapshotDate),
}));

// AXUSD Alert Configurations
export const axusdAlertTypeEnum = pgEnum('axusd_alert_type', [
  'peg_deviation',
  'reserve_low',
  'high_utilization',
  'large_mint',
  'large_redeem',
  'liquidity_change'
]);

export const axusdAlerts = pgTable("axusd_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  alertType: axusdAlertTypeEnum("alert_type").notNull(),
  threshold: decimal("threshold", { precision: 18, scale: 8 }),
  isActive: boolean("is_active").default(true),
  emailNotify: boolean("email_notify").default(true),
  webhookUrl: varchar("webhook_url"),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("axusd_alert_user_idx").on(table.userId),
  typeIdx: index("axusd_alert_type_idx").on(table.alertType),
}));

// AXUSD Alert History
export const axusdAlertHistory = pgTable("axusd_alert_history", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").references(() => axusdAlerts.id),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  currentValue: decimal("current_value", { precision: 18, scale: 8 }),
  thresholdValue: decimal("threshold_value", { precision: 18, scale: 8 }),
  acknowledged: boolean("acknowledged").default(false),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  alertIdx: index("alert_history_alert_idx").on(table.alertId),
  timestampIdx: index("alert_history_timestamp_idx").on(table.createdAt),
}));

// LP Incentive Programs
export const lpIncentivePrograms = pgTable("lp_incentive_programs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  poolAddress: varchar("pool_address", { length: 42 }).notNull(),
  rewardToken: varchar("reward_token", { length: 42 }).notNull(),
  rewardTokenSymbol: varchar("reward_token_symbol", { length: 20 }).notNull(),
  totalRewards: decimal("total_rewards", { precision: 24, scale: 8 }).notNull(),
  distributedRewards: decimal("distributed_rewards", { precision: 24, scale: 8 }).default('0'),
  rewardsPerDay: decimal("rewards_per_day", { precision: 24, scale: 8 }),
  bonusMultiplier: decimal("bonus_multiplier", { precision: 8, scale: 4 }).default('1'),
  minLockDays: integer("min_lock_days").default(0),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  poolIdx: index("lp_incentive_pool_idx").on(table.poolAddress),
  activeIdx: index("lp_incentive_active_idx").on(table.isActive),
}));

// LP Positions with incentive tracking
export const lpPositions = pgTable("lp_positions", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  poolAddress: varchar("pool_address", { length: 42 }).notNull(),
  lpTokenBalance: decimal("lp_token_balance", { precision: 24, scale: 8 }).notNull(),
  entryValue: decimal("entry_value", { precision: 24, scale: 8 }),
  currentValue: decimal("current_value", { precision: 24, scale: 8 }),
  unclaimedRewards: decimal("unclaimed_rewards", { precision: 24, scale: 8 }).default('0'),
  claimedRewards: decimal("claimed_rewards", { precision: 24, scale: 8 }).default('0'),
  stakingMultiplier: decimal("staking_multiplier", { precision: 8, scale: 4 }).default('1'),
  lockEndDate: timestamp("lock_end_date"),
  firstDepositAt: timestamp("first_deposit_at"),
  lastUpdateAt: timestamp("last_update_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletIdx: index("lp_position_wallet_idx").on(table.walletAddress),
  poolIdx: index("lp_position_pool_idx").on(table.poolAddress),
  walletPoolUnique: unique("lp_position_wallet_pool").on(table.walletAddress, table.poolAddress),
}));

// AXUSD Trading Pools (Multi-pool support)
export const axusdTradingPools = pgTable("axusd_trading_pools", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  poolAddress: varchar("pool_address", { length: 42 }).notNull().unique(),
  dex: varchar("dex", { length: 50 }).notNull(),
  token0Address: varchar("token0_address", { length: 42 }).notNull(),
  token0Symbol: varchar("token0_symbol", { length: 20 }).notNull(),
  token0Decimals: integer("token0_decimals").notNull(),
  token1Address: varchar("token1_address", { length: 42 }).notNull(),
  token1Symbol: varchar("token1_symbol", { length: 20 }).notNull(),
  token1Decimals: integer("token1_decimals").notNull(),
  feeRate: decimal("fee_rate", { precision: 8, scale: 6 }),
  chainId: integer("chain_id").notNull().default(42161),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  dexIdx: index("trading_pool_dex_idx").on(table.dex),
  chainIdx: index("trading_pool_chain_idx").on(table.chainId),
}));

// Cross-chain Bridge Routes for AXUSD
export const axusdBridgeRoutes = pgTable("axusd_bridge_routes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  sourceChain: varchar("source_chain", { length: 50 }).notNull(),
  sourceChainId: integer("source_chain_id").notNull(),
  destChain: varchar("dest_chain", { length: 50 }).notNull(),
  destChainId: integer("dest_chain_id").notNull(),
  bridgeProvider: varchar("bridge_provider", { length: 50 }).notNull(),
  bridgeContract: varchar("bridge_contract", { length: 42 }),
  minAmount: decimal("min_amount", { precision: 24, scale: 8 }),
  maxAmount: decimal("max_amount", { precision: 24, scale: 8 }),
  estimatedTime: integer("estimated_time_minutes"),
  feePercent: decimal("fee_percent", { precision: 8, scale: 4 }),
  flatFee: decimal("flat_fee", { precision: 24, scale: 8 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sourceIdx: index("bridge_source_idx").on(table.sourceChain),
  destIdx: index("bridge_dest_idx").on(table.destChain),
  providerIdx: index("bridge_provider_idx").on(table.bridgeProvider),
}));

// Bridge Transaction History
export const axusdBridgeTransactions = pgTable("axusd_bridge_transactions", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => axusdBridgeRoutes.id),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  amount: decimal("amount", { precision: 24, scale: 8 }).notNull(),
  fee: decimal("fee", { precision: 24, scale: 8 }),
  status: varchar("status", { length: 20 }).default('pending'),
  sourceTxHash: varchar("source_tx_hash", { length: 66 }),
  destTxHash: varchar("dest_tx_hash", { length: 66 }),
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  walletIdx: index("bridge_tx_wallet_idx").on(table.walletAddress),
  statusIdx: index("bridge_tx_status_idx").on(table.status),
}));

// Export types for Phase 9-14
export type AnalyticsAlert = typeof analyticsAlerts.$inferSelect;
export type InsertAnalyticsAlert = typeof analyticsAlerts.$inferInsert;
export type Quest = typeof quests.$inferSelect;
export type InsertQuest = typeof quests.$inferInsert;
export type UserQuestRecord = typeof userQuests.$inferSelect;
export type InsertUserQuest = typeof userQuests.$inferInsert;
export type UserXpLevel = typeof userXpLevels.$inferSelect;
export type InsertUserXpLevel = typeof userXpLevels.$inferInsert;
export type MembershipSubscription = typeof membershipSubscriptions.$inferSelect;
export type InsertMembershipSubscription = typeof membershipSubscriptions.$inferInsert;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;
export type ReferralEarning = typeof referralEarnings.$inferSelect;
export type InsertReferralEarning = typeof referralEarnings.$inferInsert;
export type ComplianceAuditLog = typeof complianceAuditLogs.$inferSelect;
export type InsertComplianceAuditLog = typeof complianceAuditLogs.$inferInsert;
export type IotDevice = typeof iotDevices.$inferSelect;
export type InsertIotDevice = typeof iotDevices.$inferInsert;
export type SensorReading = typeof sensorReadings.$inferSelect;
export type InsertSensorReading = typeof sensorReadings.$inferInsert;
export type AssetOracle = typeof assetOracles.$inferSelect;
export type InsertAssetOracle = typeof assetOracles.$inferInsert;
export type CrossChainSettlement = typeof crossChainSettlements.$inferSelect;
export type InsertCrossChainSettlement = typeof crossChainSettlements.$inferInsert;
export type EnergyCredit = typeof energyCredits.$inferSelect;
export type InsertEnergyCredit = typeof energyCredits.$inferInsert;

// AXUSD System Types
export type AxusdSnapshot = typeof axusdSnapshots.$inferSelect;
export type InsertAxusdSnapshot = typeof axusdSnapshots.$inferInsert;
export type AxusdAlert = typeof axusdAlerts.$inferSelect;
export type InsertAxusdAlert = typeof axusdAlerts.$inferInsert;
export type AxusdAlertHistory = typeof axusdAlertHistory.$inferSelect;
export type InsertAxusdAlertHistory = typeof axusdAlertHistory.$inferInsert;
export type LpIncentiveProgram = typeof lpIncentivePrograms.$inferSelect;
export type InsertLpIncentiveProgram = typeof lpIncentivePrograms.$inferInsert;
export type LpPosition = typeof lpPositions.$inferSelect;
export type InsertLpPosition = typeof lpPositions.$inferInsert;
export type AxusdTradingPool = typeof axusdTradingPools.$inferSelect;
export type InsertAxusdTradingPool = typeof axusdTradingPools.$inferInsert;
export type AxusdBridgeRoute = typeof axusdBridgeRoutes.$inferSelect;
export type InsertAxusdBridgeRoute = typeof axusdBridgeRoutes.$inferInsert;
export type AxusdBridgeTransaction = typeof axusdBridgeTransactions.$inferSelect;
export type InsertAxusdBridgeTransaction = typeof axusdBridgeTransactions.$inferInsert;

// ============================================
// REAL ESTATE LENDING FUND - INVESTOR TABLES
// ============================================

// Accreditation verification status
export const accreditationStatusEnum = pgEnum('accreditation_status', [
  'pending',
  'documents_submitted',
  'under_review',
  'verified',
  'rejected',
  'expired'
]);

// Accreditation method used
export const accreditationMethodEnum = pgEnum('accreditation_method', [
  'income',           // $200K+ individual / $300K+ joint
  'net_worth',        // $1M+ excluding primary residence
  'professional',     // Series 7, 65, or 82 license
  'entity',           // Entity with $5M+ assets
  'knowledgeable'     // Knowledgeable employee of fund
]);

// Investor subscription status
export const subscriptionInvestorStatusEnum = pgEnum('subscription_investor_status', [
  'pending',
  'documents_signed',
  'funds_pending',
  'active',
  'redeemed',
  'cancelled'
]);

// Accredited Investors table
export const accreditedInvestors = pgTable("accredited_investors", {
  id: serial("id").primaryKey(),
  
  // User linkage
  userId: integer("user_id").references(() => users.id),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  
  // Personal Information
  legalName: varchar("legal_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  dateOfBirth: timestamp("date_of_birth"),
  ssn: varchar("ssn_hash", { length: 64 }), // Hashed SSN for compliance
  
  // Address
  street: varchar("street", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar("country", { length: 50 }).default('USA'),
  
  // Accreditation
  accreditationStatus: accreditationStatusEnum("accreditation_status").default('pending'),
  accreditationMethod: accreditationMethodEnum("accreditation_method"),
  accreditationVerifiedAt: timestamp("accreditation_verified_at"),
  accreditationExpiresAt: timestamp("accreditation_expires_at"),
  
  // Verification documents (stored securely)
  verificationDocuments: jsonb("verification_documents"), // Array of doc references
  
  // Questionnaire responses
  questionnaireResponses: jsonb("questionnaire_responses"),
  questionnaireCompletedAt: timestamp("questionnaire_completed_at"),
  
  // Document acknowledgments
  ppmAcknowledgedAt: timestamp("ppm_acknowledged_at"),
  subscriptionSignedAt: timestamp("subscription_signed_at"),
  riskDisclosureAcknowledgedAt: timestamp("risk_disclosure_acknowledged_at"),
  
  // Investor classification (for entity investors)
  isEntity: boolean("is_entity").default(false),
  entityName: varchar("entity_name", { length: 255 }),
  entityType: varchar("entity_type", { length: 50 }), // LLC, Trust, Corporation
  entityState: varchar("entity_state", { length: 50 }),
  
  // Compliance
  kycVerified: boolean("kyc_verified").default(false),
  amlCleared: boolean("aml_cleared").default(false),
  ofacCleared: boolean("ofac_cleared").default(false),
  
  // Notes
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("investor_wallet_idx").on(table.walletAddress),
  statusIdx: index("investor_status_idx").on(table.accreditationStatus),
  emailIdx: index("investor_email_idx").on(table.email),
}));

// Fund Subscriptions (investments)
export const fundSubscriptions = pgTable("fund_subscriptions", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").references(() => accreditedInvestors.id).notNull(),
  
  // Fund details
  fundId: varchar("fund_id", { length: 50 }).default('fixflip-001'), // Future-proof for multiple funds
  productId: integer("product_id").default(1), // Maps to on-chain ProductRegistry
  
  // Investment
  investmentAmount: decimal("investment_amount", { precision: 24, scale: 8 }).notNull(),
  sharesIssued: decimal("shares_issued", { precision: 24, scale: 8 }),
  sharePrice: decimal("share_price", { precision: 18, scale: 8 }).default('1.00000000'),
  
  // On-chain tracking
  depositTxHash: varchar("deposit_tx_hash", { length: 66 }),
  vaultSharesBalance: decimal("vault_shares_balance", { precision: 24, scale: 8 }),
  
  // Status
  status: subscriptionInvestorStatusEnum("status").default('pending'),
  
  // Lock-up
  subscriptionDate: timestamp("subscription_date").defaultNow(),
  lockupExpiresAt: timestamp("lockup_expires_at"),
  
  // Distribution tracking
  totalDistributions: decimal("total_distributions", { precision: 24, scale: 8 }).default('0'),
  lastDistributionAt: timestamp("last_distribution_at"),
  
  // Documents
  signedSubscriptionDoc: varchar("signed_subscription_doc"), // Storage reference
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  investorIdx: index("subscription_investor_idx").on(table.investorId),
  fundIdx: index("subscription_fund_idx").on(table.fundId),
  statusIdx: index("subscription_status_idx").on(table.status),
}));

// Investor Document Acknowledgments (audit trail)
export const investorDocumentAcknowledgments = pgTable("investor_document_acknowledgments", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").references(() => accreditedInvestors.id).notNull(),
  
  documentType: varchar("document_type", { length: 50 }).notNull(), // ppm, subscription, risk_disclosure
  documentVersion: varchar("document_version", { length: 20 }),
  documentHash: varchar("document_hash", { length: 66 }), // SHA256 of document
  
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
  signatureHash: varchar("signature_hash", { length: 66 }), // For e-signature
}, (table) => ({
  investorDocIdx: index("doc_ack_investor_idx").on(table.investorId),
  docTypeIdx: index("doc_ack_type_idx").on(table.documentType),
}));

// Real Estate Lending Fund Types
export type AccreditedInvestor = typeof accreditedInvestors.$inferSelect;
export type InsertAccreditedInvestor = typeof accreditedInvestors.$inferInsert;
export type FundSubscription = typeof fundSubscriptions.$inferSelect;
export type InsertFundSubscription = typeof fundSubscriptions.$inferInsert;
export type InvestorDocumentAcknowledgment = typeof investorDocumentAcknowledgments.$inferSelect;
export type InsertInvestorDocumentAcknowledgment = typeof investorDocumentAcknowledgments.$inferInsert;

// ============================================================================
// DSCR Loan Origination System - Database Schema
// Status: NEW | January 13, 2026
// Features: 30-year amortizing rental loans, investor soft commitments
// ============================================================================

// DSCR Application Status Enum
export const dscrApplicationStatusEnum = pgEnum('dscr_application_status', [
  'submitted',
  'pre_screened',
  'conditional_approval',
  'docs_complete',
  'ready_to_close',
  'funded',
  'declined'
]);

// DSCR Tier Enum (maps to on-chain product IDs)
export const dscrTierEnum = pgEnum('dscr_tier', [
  'low',      // 65% LTV, 1.25 DSCR, 7% APR
  'standard', // 70% LTV, 1.20 DSCR, 8% APR
  'yield'     // 75% LTV, 1.10 DSCR, 9.5% APR
]);

// DSCR Document Type Enum
export const dscrDocumentTypeEnum = pgEnum('dscr_document_type', [
  'government_id',
  'rent_roll',
  'purchase_contract',
  'appraisal',
  'scope_of_work',
  'insurance',
  'title_report',
  'entity_docs',
  'bank_statements',
  'other'
]);

// Investor Commitment Status Enum
export const investorCommitmentStatusEnum = pgEnum('investor_commitment_status', [
  'soft_commit',
  'confirmed',
  'funded',
  'withdrawn',
  'expired'
]);

// DSCR Borrowers Table
export const dscrBorrowers = pgTable("dscr_borrowers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  
  // Identity
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  
  // Entity information (if applicable)
  isEntity: boolean("is_entity").default(false),
  entityName: varchar("entity_name", { length: 255 }),
  entityType: varchar("entity_type", { length: 50 }), // LLC, Corporation, Trust
  entityState: varchar("entity_state", { length: 50 }),
  
  // Address
  streetAddress: varchar("street_address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  
  // Experience
  yearsExperience: integer("years_experience"),
  propertiesOwned: integer("properties_owned"),
  totalUnitsOwned: integer("total_units_owned"),
  
  // Wallet
  walletAddress: varchar("wallet_address", { length: 42 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("dscr_borrower_email_idx").on(table.email),
  walletIdx: index("dscr_borrower_wallet_idx").on(table.walletAddress),
}));

// DSCR Properties Table
export const dscrProperties = pgTable("dscr_properties", {
  id: serial("id").primaryKey(),
  
  // Property address
  streetAddress: varchar("street_address", { length: 500 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 20 }).notNull(),
  county: varchar("county", { length: 100 }),
  
  // Property details
  propertyType: varchar("property_type", { length: 50 }), // sfr, duplex, triplex, fourplex, multifamily
  yearBuilt: integer("year_built"),
  squareFeet: integer("square_feet"),
  lotSize: integer("lot_size"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  units: integer("units").default(1),
  
  // Valuation
  purchasePrice: decimal("purchase_price", { precision: 18, scale: 2 }),
  appraisedValue: decimal("appraised_value", { precision: 18, scale: 2 }),
  afterRepairValue: decimal("after_repair_value", { precision: 18, scale: 2 }),
  
  // Rental income
  monthlyRent: decimal("monthly_rent", { precision: 12, scale: 2 }),
  marketRent: decimal("market_rent", { precision: 12, scale: 2 }),
  occupancyStatus: varchar("occupancy_status", { length: 50 }), // occupied, vacant, partially_occupied
  
  // Expenses
  monthlyExpenses: decimal("monthly_expenses", { precision: 12, scale: 2 }), // PITI minus P
  propertyTaxes: decimal("property_taxes", { precision: 12, scale: 2 }),
  insurance: decimal("insurance", { precision: 12, scale: 2 }),
  hoaFees: decimal("hoa_fees", { precision: 12, scale: 2 }),
  managementFees: decimal("management_fees", { precision: 12, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  addressIdx: index("dscr_property_address_idx").on(table.streetAddress, table.city, table.state),
  stateIdx: index("dscr_property_state_idx").on(table.state),
}));

// DSCR Applications Table
export const dscrApplications = pgTable("dscr_applications", {
  id: serial("id").primaryKey(),
  
  // Foreign keys
  borrowerId: integer("borrower_id").references(() => dscrBorrowers.id).notNull(),
  propertyId: integer("property_id").references(() => dscrProperties.id).notNull(),
  
  // Application reference
  applicationNumber: varchar("application_number", { length: 20 }).unique(), // DSCR-2026-0001
  
  // Loan request
  loanAmountRequested: decimal("loan_amount_requested", { precision: 18, scale: 2 }).notNull(),
  loanPurpose: varchar("loan_purpose", { length: 50 }), // purchase, refinance, cash_out_refi
  termMonths: integer("term_months").default(360), // 30 years
  
  // Tier selection
  tier: dscrTierEnum("tier").default('standard'),
  
  // Calculator outputs (stored after computation)
  monthlyPayment: decimal("monthly_payment", { precision: 12, scale: 2 }),
  dscrBps: integer("dscr_bps"), // DSCR * 100 (e.g., 125 = 1.25x)
  ltvBps: integer("ltv_bps"),   // LTV * 100 (e.g., 7000 = 70%)
  interestRateBps: integer("interest_rate_bps"), // APR * 100 (e.g., 800 = 8%)
  
  // Status workflow
  status: dscrApplicationStatusEnum("status").default('submitted'),
  preScreenedAt: timestamp("pre_screened_at"),
  conditionalApprovalAt: timestamp("conditional_approval_at"),
  docsCompleteAt: timestamp("docs_complete_at"),
  readyToCloseAt: timestamp("ready_to_close_at"),
  fundedAt: timestamp("funded_at"),
  declinedAt: timestamp("declined_at"),
  
  // Term sheet
  termSheetGeneratedAt: timestamp("term_sheet_generated_at"),
  termSheetExpiresAt: timestamp("term_sheet_expires_at"),
  termSheetStorageKey: varchar("term_sheet_storage_key", { length: 255 }),
  
  // Underwriting
  underwriterNotes: text("underwriter_notes"),
  declineReason: text("decline_reason"),
  conditions: jsonb("conditions"), // Array of conditions to clear
  
  // On-chain reference (after funding)
  onChainLoanId: integer("on_chain_loan_id"),
  originationTxHash: varchar("origination_tx_hash", { length: 66 }),
  
  // Wallet
  walletAddress: varchar("wallet_address", { length: 42 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  applicationNumberIdx: index("dscr_app_number_idx").on(table.applicationNumber),
  statusIdx: index("dscr_app_status_idx").on(table.status),
  tierIdx: index("dscr_app_tier_idx").on(table.tier),
  borrowerIdx: index("dscr_app_borrower_idx").on(table.borrowerId),
}));

// DSCR Documents Table
export const dscrDocuments = pgTable("dscr_documents", {
  id: serial("id").primaryKey(),
  
  applicationId: integer("application_id").references(() => dscrApplications.id).notNull(),
  
  documentType: dscrDocumentTypeEnum("document_type").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"), // bytes
  
  // Metadata
  description: text("description"),
  uploadedBy: varchar("uploaded_by", { length: 100 }),
  
  // Status
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  applicationIdx: index("dscr_doc_app_idx").on(table.applicationId),
  typeIdx: index("dscr_doc_type_idx").on(table.documentType),
}));

// Investor Commitments Table (soft commits for DSCR fund)
export const investorCommitments = pgTable("investor_commitments", {
  id: serial("id").primaryKey(),
  
  // Link to user if registered
  userId: integer("user_id").references(() => users.id),
  
  // Identity
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  
  // Wallet
  walletAddress: varchar("wallet_address", { length: 42 }),
  
  // Commitment details
  commitmentAmount: decimal("commitment_amount", { precision: 24, scale: 8 }).notNull(),
  tierPreference: dscrTierEnum("tier_preference"),
  timelineMonths: integer("timeline_months"), // When they plan to invest
  
  // Accreditation
  isAccredited: boolean("is_accredited").default(false),
  accreditationMethod: varchar("accreditation_method", { length: 100 }), // income, net_worth, professional
  accreditationVerifiedAt: timestamp("accreditation_verified_at"),
  
  // Entity
  isEntity: boolean("is_entity").default(false),
  entityName: varchar("entity_name", { length: 255 }),
  entityType: varchar("entity_type", { length: 50 }),
  
  // Status
  status: investorCommitmentStatusEnum("status").default('soft_commit'),
  
  // Notes
  investorNotes: text("investor_notes"),
  adminNotes: text("admin_notes"),
  
  // Tracking
  source: varchar("source", { length: 100 }), // website, referral, event
  referralCode: varchar("referral_code", { length: 50 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Commitment expiration
}, (table) => ({
  emailIdx: index("investor_commit_email_idx").on(table.email),
  walletIdx: index("investor_commit_wallet_idx").on(table.walletAddress),
  statusIdx: index("investor_commit_status_idx").on(table.status),
  tierIdx: index("investor_commit_tier_idx").on(table.tierPreference),
}));

// DSCR Investor Onboarding Table (SEC Reg D 506(c) compliance)
export const dscrInvestorOnboardingStatusEnum = pgEnum('dscr_investor_onboarding_status', [
  'pending',
  'under_review',
  'verified',
  'rejected'
]);

export const dscrInvestorOnboarding = pgTable("dscr_investor_onboarding", {
  id: serial("id").primaryKey(),
  
  // Wallet
  walletAddress: varchar("wallet_address", { length: 42 }).unique().notNull(),
  
  // Personal Info
  legalName: varchar("legal_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  dateOfBirth: timestamp("date_of_birth"),
  street: varchar("street", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar("country", { length: 50 }).default('USA'),
  
  // Entity Info
  isEntity: boolean("is_entity").default(false),
  entityName: varchar("entity_name", { length: 255 }),
  entityType: varchar("entity_type", { length: 50 }),
  entityState: varchar("entity_state", { length: 50 }),
  
  // Accreditation
  accreditationMethod: varchar("accreditation_method", { length: 50 }),
  incomeAmount: varchar("income_amount", { length: 50 }),
  netWorthAmount: varchar("net_worth_amount", { length: 50 }),
  professionalLicense: varchar("professional_license", { length: 100 }),
  investmentAmount: varchar("investment_amount", { length: 50 }),
  questionnaireCompleted: boolean("questionnaire_completed").default(false),
  
  // Document Acknowledgments with Signatures
  ppmAcknowledged: boolean("ppm_acknowledged").default(false),
  ppmSignature: varchar("ppm_signature", { length: 132 }),
  ppmSignatureTimestamp: decimal("ppm_signature_timestamp", { precision: 20, scale: 0 }),
  
  riskDisclosureAcknowledged: boolean("risk_disclosure_acknowledged").default(false),
  riskDisclosureSignature: varchar("risk_disclosure_signature", { length: 132 }),
  riskDisclosureSignatureTimestamp: decimal("risk_disclosure_signature_timestamp", { precision: 20, scale: 0 }),
  
  subscriptionSigned: boolean("subscription_signed").default(false),
  subscriptionSignature: varchar("subscription_signature", { length: 132 }),
  subscriptionSignatureTimestamp: decimal("subscription_signature_timestamp", { precision: 20, scale: 0 }),
  
  // Status
  status: dscrInvestorOnboardingStatusEnum("status").default('pending'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("dscr_onboard_wallet_idx").on(table.walletAddress),
  statusIdx: index("dscr_onboard_status_idx").on(table.status),
  emailIdx: index("dscr_onboard_email_idx").on(table.email),
}));

// Workbook Email Leads Table
export const workbookLeads = pgTable("workbook_leads", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  source: varchar("source", { length: 100 }), // reclaim-landing, workbook-gate, etc.
  status: varchar("status", { length: 20 }).default('active'), // active, unsubscribed
  createdAt: timestamp("created_at").defaultNow(),
  convertedAt: timestamp("converted_at"), // When they became a subscriber
  lastEmailSentAt: timestamp("last_email_sent_at"),
}, (table) => ({
  emailIdx: index("workbook_leads_email_idx").on(table.email),
  statusIdx: index("workbook_leads_status_idx").on(table.status),
}));

export type WorkbookLead = typeof workbookLeads.$inferSelect;
export type InsertWorkbookLead = typeof workbookLeads.$inferInsert;

// DSCR Types
export type DscrBorrower = typeof dscrBorrowers.$inferSelect;
export type InsertDscrBorrower = typeof dscrBorrowers.$inferInsert;
export type DscrProperty = typeof dscrProperties.$inferSelect;
export type InsertDscrProperty = typeof dscrProperties.$inferInsert;
export type DscrApplication = typeof dscrApplications.$inferSelect;
export type InsertDscrApplication = typeof dscrApplications.$inferInsert;
export type DscrDocument = typeof dscrDocuments.$inferSelect;
export type InsertDscrDocument = typeof dscrDocuments.$inferInsert;
export type InvestorCommitment = typeof investorCommitments.$inferSelect;
export type InsertInvestorCommitment = typeof investorCommitments.$inferInsert;
export type DscrInvestorOnboarding = typeof dscrInvestorOnboarding.$inferSelect;
export type InsertDscrInvestorOnboarding = typeof dscrInvestorOnboarding.$inferInsert;

// ============================================
// COMMUNITY LAND FUNDS - PHASE 1 TABLES
// ============================================

// Subscription plan types
export const landFundPlanTypeEnum = pgEnum('land_fund_plan_type', [
  'weekly',
  'monthly', 
  'annual'
]);

// Subscription status
export const landFundSubscriptionStatusEnum = pgEnum('land_fund_subscription_status', [
  'active',
  'paused',
  'cancelled',
  'past_due'
]);

// Attribution tracking for ads (TikTok, Facebook, etc.)
export const landFundAttribution = pgTable("land_fund_attribution", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 255 }),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),
  utmContent: varchar("utm_content", { length: 100 }),
  utmTerm: varchar("utm_term", { length: 100 }),
  referralCode: varchar("referral_code", { length: 50 }),
  landingPage: varchar("landing_page", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("land_attr_user_idx").on(table.userId),
  sourceIdx: index("land_attr_source_idx").on(table.utmSource),
  campaignIdx: index("land_attr_campaign_idx").on(table.utmCampaign),
  referralIdx: index("land_attr_referral_idx").on(table.referralCode),
}));

// Investor subscription plans for recurring investment
export const landFundSubscriptions = pgTable("land_fund_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  parcelId: varchar("parcel_id", { length: 50 }),
  planType: landFundPlanTypeEnum("plan_type").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 10 }).default('USD'),
  status: landFundSubscriptionStatusEnum("status").default('active'),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  nextPaymentDate: timestamp("next_payment_date"),
  totalInvestedCents: integer("total_invested_cents").default(0),
  totalShares: integer("total_shares").default(0),
  startDate: timestamp("start_date").defaultNow(),
  pausedAt: timestamp("paused_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("land_sub_user_idx").on(table.userId),
  statusIdx: index("land_sub_status_idx").on(table.status),
  parcelIdx: index("land_sub_parcel_idx").on(table.parcelId),
}));

// Funnel events tracking (view, start_checkout, complete)
export const landFundFunnelEvents = pgTable("land_fund_funnel_events", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }),
  userId: integer("user_id").references(() => users.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: jsonb("event_data"),
  attributionId: integer("attribution_id").references(() => landFundAttribution.id),
  parcelId: varchar("parcel_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sessionIdx: index("land_funnel_session_idx").on(table.sessionId),
  eventIdx: index("land_funnel_event_idx").on(table.eventType),
  userIdx: index("land_funnel_user_idx").on(table.userId),
}));

// Founding member tracking (first 10,000 investors)
export const landFundFoundingMembers = pgTable("land_fund_founding_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).unique().notNull(),
  rank: integer("rank").notNull(),
  status: varchar("status", { length: 20 }).default('active'),
  badgeClaimed: boolean("badge_claimed").default(false),
  badgeTokenId: varchar("badge_token_id", { length: 100 }),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  rankIdx: index("land_founding_rank_idx").on(table.rank),
}));

// Investment activity log (for live ticker)
export const landFundInvestmentActivity = pgTable("land_fund_investment_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  subscriptionId: integer("subscription_id").references(() => landFundSubscriptions.id),
  parcelId: varchar("parcel_id", { length: 50 }),
  amountCents: integer("amount_cents").notNull(),
  sharesPurchased: integer("shares_purchased").default(0),
  displayName: varchar("display_name", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("land_activity_user_idx").on(table.userId),
  parcelIdx: index("land_activity_parcel_idx").on(table.parcelId),
  createdIdx: index("land_activity_created_idx").on(table.createdAt),
}));

// Referral tracking for viral growth
export const landFundReferrals = pgTable("land_fund_referrals", {
  id: serial("id").primaryKey(),
  referrerUserId: integer("referrer_user_id").references(() => users.id).notNull(),
  referredUserId: integer("referred_user_id").references(() => users.id),
  referralCode: varchar("referral_code", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default('clicked'),
  rewardStatus: varchar("reward_status", { length: 20 }).default('pending'),
  rewardAmountCents: integer("reward_amount_cents"),
  createdAt: timestamp("created_at").defaultNow(),
  convertedAt: timestamp("converted_at"),
}, (table) => ({
  referrerIdx: index("land_ref_referrer_idx").on(table.referrerUserId),
  referredIdx: index("land_ref_referred_idx").on(table.referredUserId),
  codeIdx: index("land_ref_code_idx").on(table.referralCode),
  statusIdx: index("land_ref_status_idx").on(table.status),
}));

// Partner Deal Submissions
export const partnerDealStatusEnum = pgEnum('partner_deal_status', [
  'new',
  'contacted',
  'in_review',
  'approved',
  'funded',
  'declined',
  'withdrawn'
]);

export const partnerDealSubmissions = pgTable("partner_deal_submissions", {
  id: serial("id").primaryKey(),
  
  // Contact Information
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  
  // Deal Data from Questionnaire
  propertyType: varchar("property_type", { length: 50 }).notNull(),
  acquisitionStructure: varchar("acquisition_structure", { length: 50 }).notNull(),
  capitalNeed: varchar("capital_need", { length: 50 }).notNull(),
  exitStrategy: varchar("exit_strategy", { length: 50 }).notNull(),
  timeline: varchar("timeline", { length: 50 }).notNull(),
  dealValue: varchar("deal_value", { length: 50 }).notNull(),
  partnerRole: varchar("partner_role", { length: 50 }).notNull(),
  
  // Recommendation Generated
  recommendedPrimary: varchar("recommended_primary", { length: 255 }),
  recommendedSecondary: jsonb("recommended_secondary"),
  recommendedProtection: jsonb("recommended_protection"),
  compliancePath: varchar("compliance_path", { length: 50 }),
  estimatedTerms: jsonb("estimated_terms"),
  
  // Additional Context
  dealDescription: text("deal_description"),
  propertyAddress: varchar("property_address", { length: 500 }),
  
  // Status & Tracking
  status: partnerDealStatusEnum("status").default('new'),
  notes: text("notes"),
  assignedTo: integer("assigned_to").references(() => users.id),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  contactedAt: timestamp("contacted_at"),
}, (table) => ({
  emailIdx: index("partner_deal_email_idx").on(table.email),
  statusIdx: index("partner_deal_status_idx").on(table.status),
  createdIdx: index("partner_deal_created_idx").on(table.createdAt),
}));

// Types for new tables
export type PartnerDealSubmission = typeof partnerDealSubmissions.$inferSelect;
export type InsertPartnerDealSubmission = typeof partnerDealSubmissions.$inferInsert;

export type LandFundAttribution = typeof landFundAttribution.$inferSelect;
export type InsertLandFundAttribution = typeof landFundAttribution.$inferInsert;
export type LandFundSubscription = typeof landFundSubscriptions.$inferSelect;
export type InsertLandFundSubscription = typeof landFundSubscriptions.$inferInsert;
export type LandFundFunnelEvent = typeof landFundFunnelEvents.$inferSelect;
export type InsertLandFundFunnelEvent = typeof landFundFunnelEvents.$inferInsert;
export type LandFundFoundingMember = typeof landFundFoundingMembers.$inferSelect;
export type InsertLandFundFoundingMember = typeof landFundFoundingMembers.$inferInsert;
export type LandFundInvestmentActivity = typeof landFundInvestmentActivity.$inferSelect;
export type InsertLandFundInvestmentActivity = typeof landFundInvestmentActivity.$inferInsert;
export type LandFundReferral = typeof landFundReferrals.$inferSelect;
export type InsertLandFundReferral = typeof landFundReferrals.$inferInsert;

// ==== OBSERVATION MODE: INTERNAL SETTLEMENT MODULE ====

// Treasury account type enum
export const treasuryAccountTypeEnum = pgEnum('treasury_account_type', [
  'operating',
  'reserve',
  'escrow',
  'development',
  'insurance',
  'contingency'
]);

// Ledger entry status enum
export const ledgerEntryStatusEnum = pgEnum('ledger_entry_status', [
  'pending',
  'approved',
  'rejected',
  'reconciled'
]);

// Ledger entry type enum
export const ledgerEntryTypeEnum = pgEnum('ledger_entry_type', [
  'credit',
  'debit',
  'transfer',
  'adjustment'
]);

// Internal treasury accounts (internal bookkeeping only)
export const treasuryAccounts = pgTable("treasury_accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  accountType: treasuryAccountTypeEnum("account_type").notNull(),
  balance: decimal("balance", { precision: 18, scale: 6 }).default('0'),
  currency: varchar("currency", { length: 10 }).default('USD'),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("treasury_accounts_name_idx").on(table.name),
  typeIdx: index("treasury_accounts_type_idx").on(table.accountType),
}));

// Internal counterparties (internal entities only - NO external investors)
export const internalCounterparties = pgTable("internal_counterparties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  description: text("description"),
  taxId: varchar("tax_id", { length: 50 }),
  isInternal: boolean("is_internal").default(true).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("internal_counterparties_name_idx").on(table.name),
}));

// Ledger entries (journal entries for internal settlement)
export const ledgerEntries = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  entryDate: timestamp("entry_date").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  entryType: ledgerEntryTypeEnum("entry_type").notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  currency: varchar("currency", { length: 10 }).default('USD'),
  
  // Account references
  debitAccountId: integer("debit_account_id").references(() => treasuryAccounts.id),
  creditAccountId: integer("credit_account_id").references(() => treasuryAccounts.id),
  counterpartyId: integer("counterparty_id").references(() => internalCounterparties.id),
  
  // Category and reference
  category: varchar("category", { length: 100 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  externalReference: varchar("external_reference", { length: 200 }),
  
  // Approval workflow
  status: ledgerEntryStatusEnum("status").default('pending'),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedBy: integer("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  
  // Metadata
  attachments: jsonb("attachments"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dateIdx: index("ledger_entries_date_idx").on(table.entryDate),
  statusIdx: index("ledger_entries_status_idx").on(table.status),
  debitIdx: index("ledger_entries_debit_idx").on(table.debitAccountId),
  creditIdx: index("ledger_entries_credit_idx").on(table.creditAccountId),
}));

// ==== OBSERVATION MODE: PRIVATE CREDIT NOTE (SELF-FUNDED) ====

// Note status enum
export const privateCreditNoteStatusEnum = pgEnum('private_credit_note_status', [
  'draft',
  'active',
  'current',
  'delinquent',
  'paid_off',
  'defaulted',
  'cancelled'
]);

// Payment event type enum
export const notePaymentEventTypeEnum = pgEnum('note_payment_event_type', [
  'scheduled_payment',
  'principal',
  'interest',
  'prepayment',
  'late_fee',
  'adjustment'
]);

// Private credit notes (self-funded only - NO external investors)
export const privateCreditNotes = pgTable("private_credit_notes", {
  id: serial("id").primaryKey(),
  noteNumber: varchar("note_number", { length: 50 }).unique().notNull(),
  
  // Note terms
  principal: decimal("principal", { precision: 18, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 4 }).notNull(),
  termMonths: integer("term_months").notNull(),
  paymentFrequency: varchar("payment_frequency", { length: 20 }).default('monthly'),
  
  // Internal parties only
  issuer: varchar("issuer", { length: 200 }).default('Axiom Protocol Treasury'),
  borrowerEntityName: varchar("borrower_entity_name", { length: 200 }),
  isSelfFunded: boolean("is_self_funded").default(true).notNull(),
  
  // Collateral reference
  collateralType: varchar("collateral_type", { length: 100 }),
  collateralDescription: text("collateral_description"),
  collateralValue: decimal("collateral_value", { precision: 18, scale: 2 }),
  ltvRatio: decimal("ltv_ratio", { precision: 5, scale: 4 }),
  
  // Dates
  originationDate: timestamp("origination_date"),
  maturityDate: timestamp("maturity_date"),
  firstPaymentDate: timestamp("first_payment_date"),
  
  // Status and balances
  status: privateCreditNoteStatusEnum("status").default('draft'),
  outstandingPrincipal: decimal("outstanding_principal", { precision: 18, scale: 2 }),
  accruedInterest: decimal("accrued_interest", { precision: 18, scale: 2 }).default('0'),
  totalPaymentsReceived: decimal("total_payments_received", { precision: 18, scale: 2 }).default('0'),
  
  // Governance alignment
  governanceConfigHash: varchar("governance_config_hash", { length: 100 }),
  riskConfigSnapshot: jsonb("risk_config_snapshot"),
  
  // Admin only
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  noteNumberIdx: index("private_credit_notes_number_idx").on(table.noteNumber),
  statusIdx: index("private_credit_notes_status_idx").on(table.status),
  maturityIdx: index("private_credit_notes_maturity_idx").on(table.maturityDate),
}));

// Note payment events
export const notePaymentEvents = pgTable("note_payment_events", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").references(() => privateCreditNotes.id).notNull(),
  eventDate: timestamp("event_date").notNull(),
  eventType: notePaymentEventTypeEnum("event_type").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  principalPortion: decimal("principal_portion", { precision: 18, scale: 2 }).default('0'),
  interestPortion: decimal("interest_portion", { precision: 18, scale: 2 }).default('0'),
  lateFee: decimal("late_fee", { precision: 18, scale: 2 }).default('0'),
  balanceAfter: decimal("balance_after", { precision: 18, scale: 2 }),
  reference: varchar("reference", { length: 200 }),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  noteIdIdx: index("note_payment_events_note_idx").on(table.noteId),
  dateIdx: index("note_payment_events_date_idx").on(table.eventDate),
}));

// Note covenants checklist
export const noteCovenants = pgTable("note_covenants", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").references(() => privateCreditNotes.id).notNull(),
  covenantName: varchar("covenant_name", { length: 200 }).notNull(),
  description: text("description"),
  checkFrequency: varchar("check_frequency", { length: 20 }).default('monthly'),
  isCompliant: boolean("is_compliant"),
  lastCheckedAt: timestamp("last_checked_at"),
  lastCheckedBy: integer("last_checked_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  noteIdIdx: index("note_covenants_note_idx").on(table.noteId),
}));

// Note documents
export const noteDocuments = pgTable("note_documents", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").references(() => privateCreditNotes.id).notNull(),
  documentType: varchar("document_type", { length: 100 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }),
  fileHash: varchar("file_hash", { length: 128 }),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  noteIdIdx: index("note_documents_note_idx").on(table.noteId),
}));

// Types for observation mode tables
export type TreasuryAccount = typeof treasuryAccounts.$inferSelect;
export type InsertTreasuryAccount = typeof treasuryAccounts.$inferInsert;
export type InternalCounterparty = typeof internalCounterparties.$inferSelect;
export type InsertInternalCounterparty = typeof internalCounterparties.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;
export type PrivateCreditNote = typeof privateCreditNotes.$inferSelect;
export type InsertPrivateCreditNote = typeof privateCreditNotes.$inferInsert;
export type NotePaymentEvent = typeof notePaymentEvents.$inferSelect;
export type InsertNotePaymentEvent = typeof notePaymentEvents.$inferInsert;
export type NoteCovenant = typeof noteCovenants.$inferSelect;
export type InsertNoteCovenant = typeof noteCovenants.$inferInsert;
export type NoteDocument = typeof noteDocuments.$inferSelect;
export type InsertNoteDocument = typeof noteDocuments.$inferInsert;

// ========================================
// NOTE ACQUISITION PIPELINE
// ========================================

export const notePerformanceStatusEnum = pgEnum('note_performance_status', [
  'PERFORMING',
  'SUB_PERFORMING',
  'NON_PERFORMING',
  'REO'
]);

export const noteTypeEnum = pgEnum('note_type', [
  'FIRST_LIEN',
  'SECOND_LIEN',
  'HELOC',
  'LAND_CONTRACT',
  'CFD'
]);

export const notePipelinePhaseEnum = pgEnum('note_pipeline_phase', [
  'INTAKE',
  'DUE_DILIGENCE',
  'VALUATION',
  'ATTESTATION',
  'ACQUISITION',
  'REJECTED'
]);

export const noteSubmissionStatusEnum = pgEnum('note_submission_status', [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN'
]);

export const noteSubmissions = pgTable("note_submissions", {
  id: serial("id").primaryKey(),
  noteId: varchar("note_id", { length: 50 }).notNull().unique(),
  submittedBy: varchar("submitted_by", { length: 42 }),
  submitterEmail: varchar("submitter_email", { length: 200 }).notNull(),
  sellerName: varchar("seller_name", { length: 200 }).notNull(),
  sellerEmail: varchar("seller_email", { length: 200 }).notNull(),
  sellerPhone: varchar("seller_phone", { length: 50 }),
  sellerCompany: varchar("seller_company", { length: 200 }),
  performanceStatus: notePerformanceStatusEnum("performance_status").default('PERFORMING'),
  noteType: noteTypeEnum("note_type").default('FIRST_LIEN'),
  unpaidPrincipalBalance: decimal("unpaid_principal_balance", { precision: 18, scale: 2 }).notNull(),
  originalLoanAmount: decimal("original_loan_amount", { precision: 18, scale: 2 }),
  interestRate: decimal("interest_rate", { precision: 5, scale: 3 }),
  noteRate: decimal("note_rate", { precision: 5, scale: 3 }),
  monthlyPayment: decimal("monthly_payment", { precision: 18, scale: 2 }),
  paymentsRemaining: integer("payments_remaining"),
  maturityDate: varchar("maturity_date", { length: 20 }),
  originationDate: varchar("origination_date", { length: 20 }),
  propertyAddress: varchar("property_address", { length: 500 }).notNull(),
  propertyCity: varchar("property_city", { length: 100 }),
  propertyState: varchar("property_state", { length: 50 }),
  propertyZip: varchar("property_zip", { length: 20 }),
  propertyType: varchar("property_type", { length: 50 }),
  estimatedPropertyValue: decimal("estimated_property_value", { precision: 18, scale: 2 }),
  ltv: decimal("ltv", { precision: 5, scale: 2 }),
  borrowerPaymentHistory: text("borrower_payment_history"),
  monthsDelinquent: integer("months_delinquent").default(0),
  lastPaymentDate: varchar("last_payment_date", { length: 20 }),
  askingPrice: decimal("asking_price", { precision: 18, scale: 2 }).notNull(),
  discountFromUpb: decimal("discount_from_upb", { precision: 5, scale: 2 }),
  hasTitle: boolean("has_title").default(false),
  hasOriginalNote: boolean("has_original_note").default(false),
  hasAllonge: boolean("has_allonge").default(false),
  hasAssignment: boolean("has_assignment").default(false),
  hasServicingRecords: boolean("has_servicing_records").default(false),
  hasPaymentHistory: boolean("has_payment_history").default(false),
  hasBorrowerInfo: boolean("has_borrower_info").default(false),
  notes: text("notes"),
  status: noteSubmissionStatusEnum("status").default('SUBMITTED'),
  pipelinePhase: notePipelinePhaseEnum("pipeline_phase").default('INTAKE'),
  assignedAttestorA: varchar("assigned_attestor_a", { length: 42 }),
  assignedAttestorB: varchar("assigned_attestor_b", { length: 42 }),
  attestationAAt: timestamp("attestation_a_at"),
  attestationBAt: timestamp("attestation_b_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  noteIdIdx: index("note_submissions_note_id_idx").on(table.noteId),
  statusIdx: index("note_submissions_status_idx").on(table.status),
  phaseIdx: index("note_submissions_phase_idx").on(table.pipelinePhase),
}));

// ========================================
// NODE OPERATOR PROGRAM
// ========================================

export const operatorRoleEnum = pgEnum('operator_role', [
  'OBSERVER',
  'VALIDATOR',
  'ATTESTOR'
]);

export const operatorStatusEnum = pgEnum('operator_status', [
  'PENDING',
  'ONBOARDING',
  'ACTIVE',
  'SUSPENDED',
  'INACTIVE'
]);

export const onboardingPhaseEnum = pgEnum('onboarding_phase', [
  'APPLICATION',
  'VERIFICATION',
  'PROVISIONING',
  'DRY_RUN',
  'CERTIFICATION',
  'ACTIVATION'
]);

export const nodeOperators = pgTable("node_operators", {
  id: serial("id").primaryKey(),
  operatorId: varchar("operator_id", { length: 50 }).notNull().unique(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }),
  role: operatorRoleEnum("role").default('OBSERVER'),
  roles: jsonb("roles").$type<string[]>().default(['OBSERVER']),
  status: operatorStatusEnum("status").default('PENDING'),
  onboardingPhase: onboardingPhaseEnum("onboarding_phase").default('APPLICATION'),
  onChainNodeId: integer("on_chain_node_id"),
  totalMilestonesCompleted: integer("total_milestones_completed").default(0),
  totalEarnings: decimal("total_earnings", { precision: 18, scale: 2 }).default('0'),
  pendingEarnings: decimal("pending_earnings", { precision: 18, scale: 2 }).default('0'),
  attestationCount: integer("attestation_count").default(0),
  lastActivityAt: timestamp("last_activity_at"),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("node_operators_wallet_idx").on(table.walletAddress),
  statusIdx: index("node_operators_status_idx").on(table.status),
  roleIdx: index("node_operators_role_idx").on(table.role),
  onChainNodeIdx: index("node_operators_on_chain_node_idx").on(table.onChainNodeId),
}));

export const nodeOnboarding = pgTable("node_onboarding", {
  id: serial("id").primaryKey(),
  onboardingId: varchar("onboarding_id", { length: 50 }).notNull().unique(),
  operatorId: varchar("operator_id", { length: 50 }).references(() => nodeOperators.operatorId).notNull(),
  currentPhase: onboardingPhaseEnum("current_phase").default('APPLICATION'),
  applicationSubmittedAt: timestamp("application_submitted_at"),
  verificationCompletedAt: timestamp("verification_completed_at"),
  provisioningCompletedAt: timestamp("provisioning_completed_at"),
  dryRunCompletedAt: timestamp("dry_run_completed_at"),
  certificationCompletedAt: timestamp("certification_completed_at"),
  activationCompletedAt: timestamp("activation_completed_at"),
  expiresAt: timestamp("expires_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  operatorIdx: index("node_onboarding_operator_idx").on(table.operatorId),
}));

export const nodeChainSyncStatusEnum = pgEnum('node_chain_sync_status', [
  'SYNCED',
  'PENDING',
  'FAILED'
]);

export const nodeChainSync = pgTable("node_chain_sync", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").notNull(),
  operatorAddress: varchar("operator_address", { length: 42 }).notNull(),
  nodeClass: integer("node_class").notNull(),
  blockNumber: integer("block_number").notNull(),
  txHash: varchar("tx_hash", { length: 66 }).notNull(),
  syncStatus: nodeChainSyncStatusEnum("sync_status").default('PENDING'),
  linkedOperatorId: varchar("linked_operator_id", { length: 50 }),
  syncedAt: timestamp("synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nodeIdIdx: index("node_chain_sync_node_id_idx").on(table.nodeId),
  operatorAddressIdx: index("node_chain_sync_operator_address_idx").on(table.operatorAddress),
  syncStatusIdx: index("node_chain_sync_status_idx").on(table.syncStatus),
}));

export const creditTransactionTypeEnum = pgEnum('credit_transaction_type', [
  'ACCRUAL',
  'ADJUSTMENT',
  'SLASH',
  'REDEMPTION',
  'ONCHAIN_SYNC'
]);

export const creditTransactionStatusEnum = pgEnum('credit_transaction_status', [
  'PENDING',
  'POSTED',
  'REVERSED',
  'FAILED'
]);

export const creditSourceEnum = pgEnum('credit_source', [
  'WORK',
  'NODE_REWARDS',
  'ADMIN',
  'SYSTEM'
]);

export const creditsLedger = pgTable("credits_ledger", {
  id: serial("id").primaryKey(),
  operatorId: varchar("operator_id", { length: 50 }).references(() => nodeOperators.operatorId).notNull().unique(),
  availableBalance: decimal("available_balance", { precision: 18, scale: 6 }).default('0').notNull(),
  pendingBalance: decimal("pending_balance", { precision: 18, scale: 6 }).default('0').notNull(),
  totalEarned: decimal("total_earned", { precision: 18, scale: 6 }).default('0').notNull(),
  totalRedeemed: decimal("total_redeemed", { precision: 18, scale: 6 }).default('0').notNull(),
  totalSlashed: decimal("total_slashed", { precision: 18, scale: 6 }).default('0').notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  operatorIdx: index("credits_ledger_operator_idx").on(table.operatorId),
}));

export const creditsTransactions = pgTable("credits_transactions", {
  id: serial("id").primaryKey(),
  transactionId: varchar("transaction_id", { length: 50 }).notNull().unique(),
  operatorId: varchar("operator_id", { length: 50 }).references(() => nodeOperators.operatorId).notNull(),
  type: creditTransactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  currency: varchar("currency", { length: 10 }).default('USD').notNull(),
  source: creditSourceEnum("source").notNull(),
  status: creditTransactionStatusEnum("status").default('PENDING').notNull(),
  reference: varchar("reference", { length: 100 }),
  txHash: varchar("tx_hash", { length: 66 }),
  reason: text("reason"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  operatorIdx: index("credits_transactions_operator_idx").on(table.operatorId),
  typeIdx: index("credits_transactions_type_idx").on(table.type),
  statusIdx: index("credits_transactions_status_idx").on(table.status),
  createdAtIdx: index("credits_transactions_created_at_idx").on(table.createdAt),
}));

export const onchainRewardsSync = pgTable("onchain_rewards_sync", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").notNull().unique(),
  operatorId: varchar("operator_id", { length: 50 }).references(() => nodeOperators.operatorId),
  lastBlockNumber: integer("last_block_number").default(0),
  lastEventId: varchar("last_event_id", { length: 100 }),
  lastRewardsTotal: decimal("last_rewards_total", { precision: 18, scale: 6 }).default('0'),
  lastPendingBalance: decimal("last_pending_balance", { precision: 18, scale: 6 }).default('0'),
  syncedAt: timestamp("synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nodeIdIdx: index("onchain_rewards_sync_node_id_idx").on(table.nodeId),
  operatorIdx: index("onchain_rewards_sync_operator_idx").on(table.operatorId),
}));

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().primaryKey(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdByAdminId: uuid("created_by_admin_id"),
});

export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: uuid("actor_user_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  requestId: text("request_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminProposals = pgTable("admin_proposals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actionType: text("action_type").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  amount: decimal("amount", { precision: 20, scale: 6 }),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default('pending'),
  reason: text("reason").notNull(),
  approvalReason: text("approval_reason"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  executedBy: uuid("executed_by"),
  executedAt: timestamp("executed_at"),
  rejectedBy: uuid("rejected_by"),
  rejectedAt: timestamp("rejected_at"),
  cancelledBy: uuid("cancelled_by"),
  cancelledAt: timestamp("cancelled_at"),
  requestId: text("request_id").notNull(),
  uniqueKey: text("unique_key").notNull(),
  executionResult: jsonb("execution_result"),
});

export const adminProposalEvents = pgTable("admin_proposal_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: uuid("proposal_id").notNull(),
  eventType: text("event_type").notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  actorRole: text("actor_role").notNull(),
  requestId: text("request_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  eventPayload: jsonb("event_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payoutStateHistory = pgTable("payout_state_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  payoutId: text("payout_id").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  changedBy: uuid("changed_by").notNull(),
  proposalId: uuid("proposal_id"),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactionReversals = pgTable("transaction_reversals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  originalTransactionId: text("original_transaction_id").notNull(),
  reversalTransactionId: text("reversal_transaction_id").notNull(),
  createdBy: uuid("created_by").notNull(),
  proposalId: uuid("proposal_id"),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NoteSubmission = typeof noteSubmissions.$inferSelect;
export type InsertNoteSubmission = typeof noteSubmissions.$inferInsert;
export type NodeOperator = typeof nodeOperators.$inferSelect;
export type InsertNodeOperator = typeof nodeOperators.$inferInsert;
export type NodeOnboarding = typeof nodeOnboarding.$inferSelect;
export type InsertNodeOnboarding = typeof nodeOnboarding.$inferInsert;
export type NodeChainSync = typeof nodeChainSync.$inferSelect;
export type InsertNodeChainSync = typeof nodeChainSync.$inferInsert;
export type CreditsLedger = typeof creditsLedger.$inferSelect;
export type InsertCreditsLedger = typeof creditsLedger.$inferInsert;
export type CreditsTransaction = typeof creditsTransactions.$inferSelect;
export type InsertCreditsTransaction = typeof creditsTransactions.$inferInsert;
export type OnchainRewardsSync = typeof onchainRewardsSync.$inferSelect;

// ============================================================
// NATIONAL ECONOMIC PILOT - $1M Dual-Asset Barbell Strategy
// ============================================================

export const pilotSpvStatusEnum = pgEnum('pilot_spv_status', [
  'formation', 'active', 'distributing', 'winding_down', 'closed'
]);

export const pilotAssetTypeEnum = pgEnum('pilot_asset_type', [
  'multifamily', 'mixed_use', 'commercial', 'industrial', 'warehouse', 'farmland'
]);

export const pilotSpvs = pgTable("pilot_spvs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  label: text("label").notNull(),
  assetType: pilotAssetTypeEnum("asset_type").notNull(),
  status: pilotSpvStatusEnum("status").notNull().default('formation'),
  targetPurchasePrice: decimal("target_purchase_price", { precision: 14, scale: 2 }).notNull(),
  equityAllocated: decimal("equity_allocated", { precision: 14, scale: 2 }).notNull(),
  debtAmount: decimal("debt_amount", { precision: 14, scale: 2 }).default('0'),
  currentValuation: decimal("current_valuation", { precision: 14, scale: 2 }),
  occupancyRate: decimal("occupancy_rate", { precision: 5, scale: 2 }),
  targetYield: decimal("target_yield", { precision: 5, scale: 2 }),
  targetAppreciation: decimal("target_appreciation", { precision: 5, scale: 2 }),
  monthlyNetCashFlow: decimal("monthly_net_cash_flow", { precision: 10, scale: 2 }),
  unitCount: integer("unit_count"),
  location: text("location"),
  marketType: text("market_type"),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pilotInvestorStatusEnum = pgEnum('pilot_investor_status', [
  'invited', 'onboarding', 'committed', 'funded', 'active', 'exited'
]);

export const pilotInvestors = pgTable("pilot_investors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: pilotInvestorStatusEnum("status").notNull().default('invited'),
  commitmentAmount: decimal("commitment_amount", { precision: 14, scale: 2 }).notNull(),
  fundedAmount: decimal("funded_amount", { precision: 14, scale: 2 }).notNull().default('0'),
  proRataShare: decimal("pro_rata_share", { precision: 8, scale: 6 }),
  accreditationVerified: boolean("accreditation_verified").notNull().default(false),
  kycCompleted: boolean("kyc_completed").notNull().default(false),
  passwordHash: text("password_hash"),
  lastLoginAt: timestamp("last_login_at"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pilotContributionStatusEnum = pgEnum('pilot_contribution_status', [
  'pledged', 'called', 'received', 'confirmed', 'returned'
]);

export const pilotContributions = pgTable("pilot_contributions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid("investor_id").notNull(),
  spvId: uuid("spv_id"),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  status: pilotContributionStatusEnum("status").notNull().default('pledged'),
  capitalCallId: uuid("capital_call_id"),
  paymentMethod: text("payment_method"),
  referenceNumber: text("reference_number"),
  receivedAt: timestamp("received_at"),
  confirmedAt: timestamp("confirmed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotCapitalCallStatusEnum = pgEnum('pilot_capital_call_status', [
  'draft', 'issued', 'partially_funded', 'fully_funded', 'closed'
]);

export const pilotCapitalCalls = pgTable("pilot_capital_calls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  spvId: uuid("spv_id"),
  callNumber: integer("call_number").notNull(),
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull(),
  fundedAmount: decimal("funded_amount", { precision: 14, scale: 2 }).notNull().default('0'),
  status: pilotCapitalCallStatusEnum("status").notNull().default('draft'),
  purpose: text("purpose").notNull(),
  dueDate: timestamp("due_date").notNull(),
  issuedAt: timestamp("issued_at"),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotDistributionTypeEnum = pgEnum('pilot_distribution_type', [
  'cash_flow', 'appreciation', 'return_of_capital', 'special'
]);

export const pilotDistributions = pgTable("pilot_distributions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  spvId: uuid("spv_id"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  grossRevenue: decimal("gross_revenue", { precision: 14, scale: 2 }).notNull(),
  operatingExpenses: decimal("operating_expenses", { precision: 14, scale: 2 }).notNull(),
  netIncome: decimal("net_income", { precision: 14, scale: 2 }).notNull(),
  distributionAmount: decimal("distribution_amount", { precision: 14, scale: 2 }).notNull(),
  reserveAmount: decimal("reserve_amount", { precision: 14, scale: 2 }).notNull(),
  growthAmount: decimal("growth_amount", { precision: 14, scale: 2 }).notNull(),
  operatingBufferAmount: decimal("operating_buffer_amount", { precision: 14, scale: 2 }).notNull(),
  distributionType: pilotDistributionTypeEnum("distribution_type").notNull().default('cash_flow'),
  status: text("status").notNull().default('pending'),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotInvestorDistributions = pgTable("pilot_investor_distributions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  distributionId: uuid("distribution_id").notNull(),
  investorId: uuid("investor_id").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  proRataShare: decimal("pro_rata_share", { precision: 8, scale: 6 }).notNull(),
  status: text("status").notNull().default('pending'),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),
  referenceNumber: text("reference_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotTreasuryBuckets = pgTable("pilot_treasury_buckets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  spvId: uuid("spv_id"),
  bucketName: text("bucket_name").notNull(),
  allocationPercent: decimal("allocation_percent", { precision: 5, scale: 2 }).notNull(),
  currentBalance: decimal("current_balance", { precision: 14, scale: 2 }).notNull().default('0'),
  minReserve: decimal("min_reserve", { precision: 14, scale: 2 }).notNull().default('0'),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pilotDocCategoryEnum = pgEnum('pilot_doc_category', [
  'offering', 'operating_agreement', 'spv_formation', 'inspection', 'appraisal',
  'title', 'insurance', 'financial_report', 'tax', 'legal', 'other'
]);

export const pilotDocuments = pgTable("pilot_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  spvId: uuid("spv_id"),
  title: text("title").notNull(),
  category: pilotDocCategoryEnum("category").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotAuditActionEnum = pgEnum('pilot_audit_action', [
  'contribution_received', 'contribution_confirmed', 'distribution_calculated',
  'distribution_approved', 'distribution_paid', 'reserve_allocation',
  'capital_call_issued', 'capital_call_funded', 'asset_purchased',
  'valuation_updated', 'document_uploaded', 'investor_onboarded',
  'report_generated', 'configuration_changed'
]);

export const pilotAuditTrail = pgTable("pilot_audit_trail", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  action: pilotAuditActionEnum("action").notNull(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  spvId: uuid("spv_id"),
  investorId: uuid("investor_id"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  amount: decimal("amount", { precision: 14, scale: 2 }),
  description: text("description").notNull(),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotAssetMetrics = pgTable("pilot_asset_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  spvId: uuid("spv_id").notNull(),
  recordDate: timestamp("record_date").notNull(),
  occupancyRate: decimal("occupancy_rate", { precision: 5, scale: 2 }),
  grossRent: decimal("gross_rent", { precision: 10, scale: 2 }),
  operatingExpenses: decimal("operating_expenses", { precision: 10, scale: 2 }),
  netOperatingIncome: decimal("net_operating_income", { precision: 10, scale: 2 }),
  capRate: decimal("cap_rate", { precision: 5, scale: 2 }),
  currentValuation: decimal("current_valuation", { precision: 14, scale: 2 }),
  reserveBalance: decimal("reserve_balance", { precision: 14, scale: 2 }),
  debtServicePayment: decimal("debt_service_payment", { precision: 10, scale: 2 }),
  maintenanceCosts: decimal("maintenance_costs", { precision: 10, scale: 2 }),
  vacancyLoss: decimal("vacancy_loss", { precision: 10, scale: 2 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotReportTypeEnum = pgEnum('pilot_report_type', [
  'monthly_balance_sheet', 'monthly_income', 'monthly_reserves',
  'quarterly_valuation', 'quarterly_risk', 'annual_summary'
]);

export const pilotReports = pgTable("pilot_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  spvId: uuid("spv_id"),
  reportType: pilotReportTypeEnum("report_type").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  data: jsonb("data").notNull(),
  generatedBy: text("generated_by").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotNotificationTypeEnum = pgEnum('pilot_notification_type', [
  'report_published', 'distribution_processed', 'capital_call_issued',
  'valuation_updated', 'document_added', 'general_update'
]);

export const pilotNotifications = pgTable("pilot_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: uuid("investor_id"),
  notificationType: pilotNotificationTypeEnum("notification_type").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  emailSent: boolean("email_sent").notNull().default(false),
  emailSentAt: timestamp("email_sent_at"),
  readAt: timestamp("read_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotBenchmarks = pgTable("pilot_benchmarks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  spvId: uuid("spv_id"),
  recordDate: timestamp("record_date").notNull(),
  localCapRate: decimal("local_cap_rate", { precision: 5, scale: 2 }),
  treasuryYield10yr: decimal("treasury_yield_10yr", { precision: 5, scale: 2 }),
  sp500Return: decimal("sp500_return", { precision: 7, scale: 2 }),
  pilotReturn: decimal("pilot_return", { precision: 7, scale: 2 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotExpansionGate = pgTable("pilot_expansion_gate", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  checkDate: timestamp("check_date").notNull(),
  occupancyAbove90: boolean("occupancy_above_90").notNull().default(false),
  reservesFullyFunded: boolean("reserves_fully_funded").notNull().default(false),
  consecutivePositiveMonths: integer("consecutive_positive_months").notNull().default(0),
  investorSatisfactionScore: decimal("investor_satisfaction_score", { precision: 5, scale: 2 }),
  totalAssetsUnderManagement: decimal("total_aum", { precision: 14, scale: 2 }),
  isReadyForExpansion: boolean("is_ready_for_expansion").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pilot Type Exports
export type PilotSpv = typeof pilotSpvs.$inferSelect;
export type InsertPilotSpv = typeof pilotSpvs.$inferInsert;
export type PilotInvestor = typeof pilotInvestors.$inferSelect;
export type InsertPilotInvestor = typeof pilotInvestors.$inferInsert;
export type PilotContribution = typeof pilotContributions.$inferSelect;
export type InsertPilotContribution = typeof pilotContributions.$inferInsert;
export type PilotCapitalCall = typeof pilotCapitalCalls.$inferSelect;
export type InsertPilotCapitalCall = typeof pilotCapitalCalls.$inferInsert;
export type PilotDistribution = typeof pilotDistributions.$inferSelect;
export type InsertPilotDistribution = typeof pilotDistributions.$inferInsert;
export type PilotInvestorDistribution = typeof pilotInvestorDistributions.$inferSelect;
export type InsertPilotInvestorDistribution = typeof pilotInvestorDistributions.$inferInsert;
export type PilotDocument = typeof pilotDocuments.$inferSelect;
export type InsertPilotDocument = typeof pilotDocuments.$inferInsert;
export type PilotAuditEntry = typeof pilotAuditTrail.$inferSelect;
export type InsertPilotAuditEntry = typeof pilotAuditTrail.$inferInsert;
export type PilotAssetMetric = typeof pilotAssetMetrics.$inferSelect;
export type InsertPilotAssetMetric = typeof pilotAssetMetrics.$inferInsert;
export type PilotReport = typeof pilotReports.$inferSelect;
export type InsertPilotReport = typeof pilotReports.$inferInsert;
export type PilotNotification = typeof pilotNotifications.$inferSelect;
export type InsertPilotNotification = typeof pilotNotifications.$inferInsert;
export type PilotBenchmark = typeof pilotBenchmarks.$inferSelect;
export type InsertPilotBenchmark = typeof pilotBenchmarks.$inferInsert;
export type PilotExpansionGateCheck = typeof pilotExpansionGate.$inferSelect;
export type InsertPilotExpansionGateCheck = typeof pilotExpansionGate.$inferInsert;
export type InsertOnchainRewardsSync = typeof onchainRewardsSync.$inferInsert;

// ============================================================
// MIRDT — Market Intelligence and Risk Disclosure Terminal
// ============================================================

export const mirdtAssetTypeEnum = pgEnum('mirdt_asset_type', ['CRYPTO', 'EQUITY']);

export const mirdtSetupStatusEnum = pgEnum('mirdt_setup_status', ['ACTIVE', 'EXPIRED', 'INVALIDATED']);

export const mirdtTradeOutcomeEnum = pgEnum('mirdt_trade_outcome', ['WIN', 'LOSS', 'FLAT']);

export const mirdtSetups = pgTable("mirdt_setups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  assetType: mirdtAssetTypeEnum("asset_type").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  venue: varchar("venue", { length: 100 }),
  horizonDays: integer("horizon_days").notNull(),
  entryZoneLow: decimal("entry_zone_low", { precision: 18, scale: 8 }).notNull(),
  entryZoneHigh: decimal("entry_zone_high", { precision: 18, scale: 8 }).notNull(),
  invalidationPrice: decimal("invalidation_price", { precision: 18, scale: 8 }).notNull(),
  thesisSummary: text("thesis_summary").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  signalZ: decimal("signal_z", { precision: 8, scale: 4 }).notNull(),
  expectedP5: decimal("expected_p5", { precision: 18, scale: 8 }),
  expectedP50: decimal("expected_p50", { precision: 18, scale: 8 }),
  expectedP95: decimal("expected_p95", { precision: 18, scale: 8 }),
  volatilityEstimate: decimal("volatility_estimate", { precision: 8, scale: 4 }),
  liquidityNotes: text("liquidity_notes"),
  modelVersion: varchar("model_version", { length: 50 }).notNull(),
  dataSnapshotRef: uuid("data_snapshot_ref"),
  rationaleTraceJson: jsonb("rationale_trace_json"),
  status: mirdtSetupStatusEnum("status").default('ACTIVE').notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  symbolIdx: index("mirdt_setup_symbol_idx").on(table.symbol),
  statusIdx: index("mirdt_setup_status_idx").on(table.status),
  createdIdx: index("mirdt_setup_created_idx").on(table.createdAt),
  assetTypeIdx: index("mirdt_setup_asset_type_idx").on(table.assetType),
}));

export const mirdtPaperTrades = pgTable("mirdt_paper_trades", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  setupId: uuid("setup_id").notNull(),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  entryPrice: decimal("entry_price", { precision: 18, scale: 8 }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  exitPrice: decimal("exit_price", { precision: 18, scale: 8 }),
  pnl: decimal("pnl", { precision: 18, scale: 8 }),
  pnlPct: decimal("pnl_pct", { precision: 8, scale: 4 }),
  maxAdverseExcursion: decimal("max_adverse_excursion", { precision: 18, scale: 8 }),
  maxFavorableExcursion: decimal("max_favorable_excursion", { precision: 18, scale: 8 }),
  outcome: mirdtTradeOutcomeEnum("outcome"),
  notes: text("notes"),
}, (table) => ({
  setupIdx: index("mirdt_paper_trade_setup_idx").on(table.setupId),
}));

export const mirdtDataSnapshots = pgTable("mirdt_data_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  rawRef: text("raw_ref"),
  checksum: varchar("checksum", { length: 128 }),
});

// MIRDT Type Exports
export type MirdtSetup = typeof mirdtSetups.$inferSelect;
export type InsertMirdtSetup = typeof mirdtSetups.$inferInsert;
export type MirdtPaperTrade = typeof mirdtPaperTrades.$inferSelect;
export type InsertMirdtPaperTrade = typeof mirdtPaperTrades.$inferInsert;
export type MirdtDataSnapshot = typeof mirdtDataSnapshots.$inferSelect;
export type InsertMirdtDataSnapshot = typeof mirdtDataSnapshots.$inferInsert;

export const lexiconScanStatusEnum = pgEnum('lexicon_scan_status', ['FOUND', 'CLEAN']);

export const mirdtLexiconScanLogs = pgTable("mirdt_lexicon_scan_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  scope: varchar("scope", { length: 100 }).notNull(),
  filePath: varchar("file_path", { length: 500 }),
  originalTerm: varchar("original_term", { length: 200 }).notNull(),
  replacementTerm: varchar("replacement_term", { length: 200 }),
  lineNumber: integer("line_number"),
  excerpt: text("excerpt"),
  status: lexiconScanStatusEnum("status").default('FOUND').notNull(),
  meta: jsonb("meta"),
}, (table) => ({
  scopeIdx: index("lexicon_scan_scope_idx").on(table.scope),
  termIdx: index("lexicon_scan_term_idx").on(table.originalTerm),
  createdIdx: index("lexicon_scan_created_idx").on(table.createdAt),
}));

export type MirdtLexiconScanLog = typeof mirdtLexiconScanLogs.$inferSelect;
export type InsertMirdtLexiconScanLog = typeof mirdtLexiconScanLogs.$inferInsert;

export const sentinelRegimeEnum = pgEnum('sentinel_regime', ['TREND_UP', 'TREND_DOWN', 'RANGE_LOW_VOL', 'HIGH_VOL_DISLOCATION']);
export const sentinelDecisionEnum = pgEnum('sentinel_decision', ['APPROVED', 'DENIED']);
export const sentinelActionTypeEnum = pgEnum('sentinel_action_type', ['TREASURY_DEPLOY', 'LEND_ISSUE', 'MINT', 'BURN', 'PARAMETER_CHANGE', 'SWAP', 'LP_ACTION', 'BRIDGE']);
export const sentinelSignalDirectionEnum = pgEnum('sentinel_signal_direction', ['LONG', 'SHORT', 'NEUTRAL']);

export const sentinelSignals = pgTable("sentinel_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: varchar("asset_type", { length: 20 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
  horizonDays: integer("horizon_days").notNull(),
  direction: sentinelSignalDirectionEnum("direction").notNull(),
  entryZoneLow: decimal("entry_zone_low", { precision: 24, scale: 8 }).notNull(),
  entryZoneHigh: decimal("entry_zone_high", { precision: 24, scale: 8 }).notNull(),
  entryMid: decimal("entry_mid", { precision: 24, scale: 8 }).notNull(),
  invalidationLevel: decimal("invalidation_level", { precision: 24, scale: 8 }).notNull(),
  pRaw: decimal("p_raw", { precision: 8, scale: 4 }).notNull(),
  pCalibrated: decimal("p_calibrated", { precision: 8, scale: 4 }),
  regimeState: sentinelRegimeEnum("regime_state").notNull(),
  confirmationScore: decimal("confirmation_score", { precision: 8, scale: 4 }),
  finalScore: decimal("final_score", { precision: 8, scale: 4 }),
  volEstimate: decimal("vol_estimate", { precision: 8, scale: 4 }).notNull(),
  liquidityScore: decimal("liquidity_score", { precision: 8, scale: 4 }),
  modelVersion: varchar("model_version", { length: 32 }).notNull(),
  dataSnapshotRef: varchar("data_snapshot_ref", { length: 64 }),
  sourceSetupId: varchar("source_setup_id"),
  rationaleJson: jsonb("rationale_json"),
  qualified: boolean("qualified").default(false),
  qualifiedAt: timestamp("qualified_at"),
});

export const sentinelRegimeSnapshots = pgTable("sentinel_regime_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  regime: sentinelRegimeEnum("regime").notNull(),
  confidence: decimal("confidence", { precision: 8, scale: 4 }).notNull(),
  sma20Slope: decimal("sma20_slope", { precision: 12, scale: 6 }),
  sma50Slope: decimal("sma50_slope", { precision: 12, scale: 6 }),
  volatility20d: decimal("volatility_20d", { precision: 8, scale: 4 }),
  volatilityRatio: decimal("volatility_ratio", { precision: 8, scale: 4 }),
  breadthScore: decimal("breadth_score", { precision: 8, scale: 4 }),
  notes: text("notes"),
  snapshotJson: jsonb("snapshot_json"),
});

export const sentinelDecisions = pgTable("sentinel_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  scope: varchar("scope", { length: 64 }).notNull(),
  actionType: sentinelActionTypeEnum("action_type").notNull(),
  subject: varchar("subject", { length: 128 }).notNull(),
  maxNotional: decimal("max_notional", { precision: 24, scale: 8 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  decision: sentinelDecisionEnum("decision").notNull(),
  reasonCode: varchar("reason_code", { length: 64 }).notNull(),
  plainLanguage: text("plain_language").notNull(),
  signalId: varchar("signal_id"),
  logHash: varchar("log_hash", { length: 128 }).notNull(),
  prevHash: varchar("prev_hash", { length: 128 }).notNull(),
  signature: text("signature"),
  nonce: integer("nonce").notNull(),
  consumed: boolean("consumed").default(false),
  consumedAt: timestamp("consumed_at"),
  consumedTxHash: varchar("consumed_tx_hash", { length: 128 }),
});

export const sentinelTrades = pgTable("sentinel_trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  signalId: varchar("signal_id").notNull(),
  decisionId: varchar("decision_id"),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  direction: sentinelSignalDirectionEnum("direction").notNull(),
  entryPrice: decimal("entry_price", { precision: 24, scale: 8 }).notNull(),
  quantity: decimal("quantity", { precision: 24, scale: 8 }).notNull(),
  targetPrice: decimal("target_price", { precision: 24, scale: 8 }),
  stopPrice: decimal("stop_price", { precision: 24, scale: 8 }),
  exitPrice: decimal("exit_price", { precision: 24, scale: 8 }),
  exitAt: timestamp("exit_at"),
  pnl: decimal("pnl", { precision: 24, scale: 8 }),
  pnlPct: decimal("pnl_pct", { precision: 8, scale: 4 }),
  status: varchar("status", { length: 20 }).notNull().default('OPEN'),
  notes: text("notes"),
});

export const sentinelCalibrationRuns = pgTable("sentinel_calibration_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  modelVersion: varchar("model_version", { length: 32 }).notNull(),
  totalSignals: integer("total_signals").notNull(),
  calibrationMethod: varchar("calibration_method", { length: 32 }).notNull(),
  brierScore: decimal("brier_score", { precision: 8, scale: 6 }),
  ece: decimal("ece", { precision: 8, scale: 6 }),
  reliabilityJson: jsonb("reliability_json"),
  regimeSplitJson: jsonb("regime_split_json"),
  notes: text("notes"),
});

export const sentinelAuditLog = pgTable("sentinel_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  actor: varchar("actor", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  resourceType: varchar("resource_type", { length: 64 }).notNull(),
  resourceId: varchar("resource_id", { length: 128 }),
  payloadJson: jsonb("payload_json").notNull(),
  prevHash: varchar("prev_hash", { length: 128 }).notNull(),
  rowHash: varchar("row_hash", { length: 128 }).notNull(),
});

export type SentinelSignal = typeof sentinelSignals.$inferSelect;
export type InsertSentinelSignal = typeof sentinelSignals.$inferInsert;
export type SentinelRegimeSnapshot = typeof sentinelRegimeSnapshots.$inferSelect;
export type InsertSentinelRegimeSnapshot = typeof sentinelRegimeSnapshots.$inferInsert;
export type SentinelDecision = typeof sentinelDecisions.$inferSelect;
export type InsertSentinelDecision = typeof sentinelDecisions.$inferInsert;
export type SentinelTrade = typeof sentinelTrades.$inferSelect;
export type InsertSentinelTrade = typeof sentinelTrades.$inferInsert;
export type SentinelCalibrationRun = typeof sentinelCalibrationRuns.$inferSelect;
export type InsertSentinelCalibrationRun = typeof sentinelCalibrationRuns.$inferInsert;
export type SentinelAuditLog = typeof sentinelAuditLog.$inferSelect;
export type InsertSentinelAuditLog = typeof sentinelAuditLog.$inferInsert;

export const founderOpsLog = pgTable("founder_ops_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  week: integer("week").notNull(),
  phase: integer("phase").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description").notNull(),
  txHash: varchar("tx_hash", { length: 128 }),
  product: varchar("product", { length: 64 }),
  amount: decimal("amount", { precision: 24, scale: 8 }),
  status: varchar("status", { length: 32 }).notNull().default('completed'),
  failureReason: text("failure_reason"),
  fixApplied: text("fix_applied"),
  protocolChange: text("protocol_change"),
});

export type FounderOpsLog = typeof founderOpsLog.$inferSelect;
export type InsertFounderOpsLog = typeof founderOpsLog.$inferInsert;

export const solvencySnapshots = pgTable("solvency_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  asOfUtc: timestamp("as_of_utc").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  checksum: text("checksum").notNull(),
  notes: text("notes"),
}, (table) => ({
  createdIdx: index("solvency_snap_created_idx").on(table.createdAt),
}));

export type SolvencySnapshot = typeof solvencySnapshots.$inferSelect;
export type InsertSolvencySnapshot = typeof solvencySnapshots.$inferInsert;

export const scenarioRuns = pgTable("scenario_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  snapshotId: varchar("snapshot_id").notNull(),
  scenarioId: varchar("scenario_id").notNull(),
  scenarioLabel: varchar("scenario_label").notNull(),
  inputJson: jsonb("input_json").notNull(),
  resultJson: jsonb("result_json").notNull(),
  resultingPolicyMode: varchar("resulting_policy_mode").notNull(),
  breachesThreshold: boolean("breaches_threshold").notNull().default(false),
}, (table) => ({
  snapshotIdx: index("scenario_runs_snapshot_idx").on(table.snapshotId),
  createdIdx: index("scenario_runs_created_idx").on(table.createdAt),
}));

export type ScenarioRun = typeof scenarioRuns.$inferSelect;
export type InsertScenarioRun = typeof scenarioRuns.$inferInsert;

export const disclosureEvents = pgTable("disclosure_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  eventType: varchar("event_type").notNull(),
  severity: varchar("severity").notNull().default("info"),
  title: varchar("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
}, (table) => ({
  typeIdx: index("disclosure_events_type_idx").on(table.eventType),
  createdIdx: index("disclosure_events_created_idx").on(table.createdAt),
}));

export type DisclosureEvent = typeof disclosureEvents.$inferSelect;
export type InsertDisclosureEvent = typeof disclosureEvents.$inferInsert;

export const ameInputSnapshots = pgTable("ame_input_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  checksum: text("checksum").notNull(),
  rawJson: jsonb("raw_json").notNull(),
  sourceVersion: text("source_version").notNull(),
  mode: text("mode").notNull(),
}, (table) => ({
  createdIdx: index("ame_input_snap_created_idx").on(table.createdAt),
}));

export type AmeInputSnapshot = typeof ameInputSnapshots.$inferSelect;
export type InsertAmeInputSnapshot = typeof ameInputSnapshots.$inferInsert;

export const ameEvaluations = pgTable("ame_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  modelVersion: text("model_version").notNull(),
  inputSnapshotId: varchar("input_snapshot_id").notNull(),
  regimeBand: text("regime_band").notNull(),
  rs: decimal("rs", { precision: 6, scale: 4 }).notNull(),
  pm: decimal("pm", { precision: 6, scale: 4 }).notNull(),
  cr: decimal("cr", { precision: 18, scale: 8 }).notNull(),
  rr: decimal("rr", { precision: 18, scale: 8 }).notNull(),
  lbr: decimal("lbr", { precision: 18, scale: 8 }).notNull(),
  ld: decimal("ld", { precision: 18, scale: 8 }).notNull(),
  crTarget: decimal("cr_target", { precision: 18, scale: 8 }).notNull(),
  rrTarget: decimal("rr_target", { precision: 18, scale: 8 }).notNull(),
  lbrTarget: decimal("lbr_target", { precision: 18, scale: 8 }).notNull(),
  ldTarget: decimal("ld_target", { precision: 18, scale: 8 }).notNull(),
  payoutFactor: decimal("payout_factor", { precision: 6, scale: 4 }).notNull(),
  actionsJson: jsonb("actions_json").notNull(),
  disclosureJson: jsonb("disclosure_json").notNull(),
  status: text("status").notNull(),
}, (table) => ({
  createdIdx: index("ame_eval_created_idx").on(table.createdAt),
  regimeBandIdx: index("ame_eval_regime_idx").on(table.regimeBand),
  statusIdx: index("ame_eval_status_idx").on(table.status),
}));

export type AmeEvaluation = typeof ameEvaluations.$inferSelect;
export type InsertAmeEvaluation = typeof ameEvaluations.$inferInsert;

export const ameMetricsTimeseries = pgTable("ame_metrics_timeseries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricKey: text("metric_key").notNull(),
  ts: timestamp("ts").notNull(),
  value: decimal("value", { precision: 24, scale: 10 }).notNull(),
  evaluationId: varchar("evaluation_id").notNull(),
}, (table) => ({
  metricTsIdx: index("ame_ts_metric_ts_idx").on(table.metricKey, table.ts),
}));

export type AmeMetricsTimeseries = typeof ameMetricsTimeseries.$inferSelect;
export type InsertAmeMetricsTimeseries = typeof ameMetricsTimeseries.$inferInsert;

export const ameStressScenarios = pgTable("ame_stress_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  scenarioKey: text("scenario_key").notNull(),
  shockJson: jsonb("shock_json").notNull(),
  baselineEvaluationId: varchar("baseline_evaluation_id").notNull(),
  projectedJson: jsonb("projected_json").notNull(),
  checksum: text("checksum").notNull(),
}, (table) => ({
  createdIdx: index("ame_stress_created_idx").on(table.createdAt),
  scenarioIdx: index("ame_stress_scenario_idx").on(table.scenarioKey),
}));

export type AmeStressScenario = typeof ameStressScenarios.$inferSelect;
export type InsertAmeStressScenario = typeof ameStressScenarios.$inferInsert;

// ==== AME ENFORCEMENT TABLES ====

export const amePolicyState = pgTable("ame_policy_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  policyMode: text("policy_mode").notNull(),
  triggerMetric: text("trigger_metric").notNull(),
  triggerValue: decimal("trigger_value", { precision: 18, scale: 8 }).notNull(),
  thresholdsJson: jsonb("thresholds_json").notNull(),
  notes: text("notes"),
  evaluationId: varchar("evaluation_id"),
}, (table) => ({
  createdIdx: index("ame_policy_state_created_idx").on(table.createdAt),
  policyModeIdx: index("ame_policy_state_policy_mode_idx").on(table.policyMode),
}));

export type AmePolicyState = typeof amePolicyState.$inferSelect;
export type InsertAmePolicyState = typeof amePolicyState.$inferInsert;

export const ameEnforcementEvent = pgTable("ame_enforcement_event", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull(),
  policyMode: text("policy_mode").notNull(),
  detailsJson: jsonb("details_json").notNull(),
  metricSnapshotId: varchar("metric_snapshot_id"),
  evaluationId: varchar("evaluation_id"),
}, (table) => ({
  createdIdx: index("ame_enforcement_event_created_idx").on(table.createdAt),
  eventTypeIdx: index("ame_enforcement_event_event_type_idx").on(table.eventType),
  severityIdx: index("ame_enforcement_event_severity_idx").on(table.severity),
}));

export type AmeEnforcementEvent = typeof ameEnforcementEvent.$inferSelect;
export type InsertAmeEnforcementEvent = typeof ameEnforcementEvent.$inferInsert;

export const ameDataSnapshot = pgTable("ame_data_snapshot", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  provider: text("provider").notNull(),
  rawRef: text("raw_ref"),
  checksum: text("checksum").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
}, (table) => ({
  createdIdx: index("ame_data_snapshot_created_idx").on(table.createdAt),
}));

export type AmeDataSnapshot = typeof ameDataSnapshot.$inferSelect;
export type InsertAmeDataSnapshot = typeof ameDataSnapshot.$inferInsert;

export const ameTradeoffLog = pgTable("ame_tradeoff_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  decision: text("decision").notNull(),
  constraintsJson: jsonb("constraints_json").notNull(),
  rationale: text("rationale").notNull(),
  policyMode: text("policy_mode"),
  evaluationId: varchar("evaluation_id"),
}, (table) => ({
  createdIdx: index("ame_tradeoff_log_created_idx").on(table.createdAt),
}));

export type AmeTradeoffLog = typeof ameTradeoffLog.$inferSelect;
export type InsertAmeTradeoffLog = typeof ameTradeoffLog.$inferInsert;

// ==== AME METRIC SNAPSHOT TABLE ====

export const ameMetricSnapshot = pgTable("ame_metric_snapshot", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  environment: text("environment").notNull().default('PRODUCTION'),
  version: text("version").notNull().default('AME-v2.0'),
  treasuryTotalUsd: decimal("treasury_total_usd", { precision: 18, scale: 8 }).notNull(),
  treasuryLiquidUsd: decimal("treasury_liquid_usd", { precision: 18, scale: 8 }).notNull(),
  designatedReservesUsd: decimal("designated_reserves_usd", { precision: 18, scale: 8 }).notNull(),
  lossBufferUsd: decimal("loss_buffer_usd", { precision: 18, scale: 8 }).notNull(),
  netExternalExposureUsd: decimal("net_external_exposure_usd", { precision: 18, scale: 8 }).notNull(),
  grossIssuanceAxusd: decimal("gross_issuance_axusd", { precision: 18, scale: 8 }).notNull().default('0'),
  circulatingExposureUsd: decimal("circulating_exposure_usd", { precision: 18, scale: 8 }).notNull(),
  coverageRatio: decimal("coverage_ratio", { precision: 18, scale: 8 }).notNull(),
  reserveRatio: decimal("reserve_ratio", { precision: 18, scale: 8 }).notNull(),
  liquidityStabilityRatio: decimal("liquidity_stability_ratio", { precision: 18, scale: 8 }).notNull(),
  redemptionStressRatio: decimal("redemption_stress_ratio", { precision: 18, scale: 8 }).notNull(),
  volatilityPressureIndex: decimal("volatility_pressure_index", { precision: 18, scale: 8 }).notNull(),
  stabilityScore: decimal("stability_score", { precision: 6, scale: 2 }).notNull(),
  policyMode: text("policy_mode").notNull(),
  compositionJson: jsonb("composition_json"),
  inputsRef: varchar("inputs_ref"),
  evaluationId: varchar("evaluation_id"),
}, (table) => ({
  createdIdx: index("ame_metric_snapshot_created_idx").on(table.createdAt),
  policyModeIdx: index("ame_metric_snapshot_policy_mode_idx").on(table.policyMode),
  environmentIdx: index("ame_metric_snapshot_env_idx").on(table.environment),
}));

export type AmeMetricSnapshot = typeof ameMetricSnapshot.$inferSelect;
export type InsertAmeMetricSnapshot = typeof ameMetricSnapshot.$inferInsert;

// ==== AME STRESS RUN TABLE ====

export const ameStressRun = pgTable("ame_stress_run", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  runName: text("run_name").notNull(),
  baseSnapshotId: varchar("base_snapshot_id"),
  scenariosJson: jsonb("scenarios_json").notNull(),
  resultsJson: jsonb("results_json").notNull(),
  conclusion: text("conclusion").notNull(),
  policyModeAfter: text("policy_mode_after").notNull(),
  evaluationId: varchar("evaluation_id"),
}, (table) => ({
  createdIdx: index("ame_stress_run_created_idx").on(table.createdAt),
}));

export type AmeStressRunRecord = typeof ameStressRun.$inferSelect;
export type InsertAmeStressRun = typeof ameStressRun.$inferInsert;

// ==== MIRDT EXECUTION MODEL ====

export const mirdtExecutionGradeEnum = pgEnum('mirdt_execution_grade', ['A', 'B', 'C', 'REJECT']);

export const mirdtExecutionStatusEnum = pgEnum('mirdt_execution_status', ['DRAFT', 'ELIGIBLE', 'WAIT', 'REJECTED', 'AUTHORIZED', 'OPENED', 'CLOSED', 'EXPIRED', 'INVALIDATED']);

export const mirdtLiquidityTierEnum = pgEnum('mirdt_liquidity_tier', ['HIGH', 'MODERATE', 'LOW', 'FRAGILE']);

export const mirdtRegimeTierEnum = pgEnum('mirdt_regime_tier', ['LOW', 'NORMAL', 'EXPANDING', 'EXTREME']);

export const mirdtEntryTriggerEnum = pgEnum('mirdt_entry_trigger', ['ZONE_EDGE', 'BREAKOUT', 'MEAN_DRIFT', 'VOL_EXPANSION', 'NONE']);

export const mirdtPolicyModeEnum = pgEnum('mirdt_policy_mode', ['BOOTSTRAP', 'NORMAL', 'CAUTION', 'RESTRICTED', 'EMERGENCY']);

export const mirdtEventTypeEnum = pgEnum('mirdt_event_type', ['DECISION_CREATED', 'DECISION_REJECTED', 'DECISION_WAIT', 'AUTHORIZED', 'OPENED', 'CLOSED', 'INVALIDATED', 'EXPIRED', 'EMERGENCY_EXIT']);

export const mirdtExecutionDecisions = pgTable("mirdt_execution_decisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  setupId: uuid("setup_id").notNull(),
  snapshotId: uuid("snapshot_id"),
  currentPrice: decimal("current_price", { precision: 18, scale: 8 }).notNull(),
  priceSource: varchar("price_source", { length: 100 }).notNull(),
  priceAsOf: timestamp("price_as_of").notNull(),
  signalZ: decimal("signal_z", { precision: 8, scale: 4 }),
  volatilityEstimate: decimal("volatility_estimate", { precision: 8, scale: 4 }),
  liquidityTier: mirdtLiquidityTierEnum("liquidity_tier").notNull(),
  regimeTier: mirdtRegimeTierEnum("regime_tier").notNull(),
  eligibilityStatus: varchar("eligibility_status", { length: 20 }).notNull(),
  grade: mirdtExecutionGradeEnum("grade").notNull(),
  reasonCodes: jsonb("reason_codes").notNull().default(sql`'[]'::jsonb`),
  entryTriggerType: mirdtEntryTriggerEnum("entry_trigger_type").notNull(),
  entryAllowed: boolean("entry_allowed").notNull(),
  riskFractionBps: integer("risk_fraction_bps").notNull(),
  riskBudgetUsd: decimal("risk_budget_usd", { precision: 18, scale: 8 }).notNull(),
  invalidationDistance: decimal("invalidation_distance", { precision: 18, scale: 8 }).notNull(),
  positionSizeQty: decimal("position_size_qty", { precision: 18, scale: 8 }).notNull(),
  positionNotionalUsd: decimal("position_notional_usd", { precision: 18, scale: 8 }).notNull(),
  stopPrice: decimal("stop_price", { precision: 18, scale: 8 }).notNull(),
  takeProfitP50: decimal("take_profit_p50", { precision: 18, scale: 8 }),
  takeProfitP95: decimal("take_profit_p95", { precision: 18, scale: 8 }),
  timeHorizonExitAt: timestamp("time_horizon_exit_at").notNull(),
  policyMode: mirdtPolicyModeEnum("policy_mode").notNull(),
  decisionTraceJson: jsonb("decision_trace_json").notNull(),
  checksum: varchar("checksum", { length: 64 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: varchar("asset_type", { length: 20 }).notNull(),
}, (table) => ({
  setupCreatedIdx: index("mirdt_exec_dec_setup_created_idx").on(table.setupId, table.createdAt),
  gradeCreatedIdx: index("mirdt_exec_dec_grade_created_idx").on(table.grade, table.createdAt),
  eligibilityCreatedIdx: index("mirdt_exec_dec_eligibility_created_idx").on(table.eligibilityStatus, table.createdAt),
}));

export type MirdtExecutionDecision = typeof mirdtExecutionDecisions.$inferSelect;
export type InsertMirdtExecutionDecision = typeof mirdtExecutionDecisions.$inferInsert;

export const mirdtExecutionRuns = pgTable("mirdt_execution_runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  runType: varchar("run_type", { length: 20 }).notNull(),
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  processedCount: integer("processed_count").notNull().default(0),
  eligibleCount: integer("eligible_count").notNull().default(0),
  authorizedCount: integer("authorized_count").notNull().default(0),
  openedCount: integer("opened_count").notNull().default(0),
  invalidatedCount: integer("invalidated_count").notNull().default(0),
  expiredCount: integer("expired_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  failureDetails: jsonb("failure_details").notNull().default(sql`'[]'::jsonb`),
  checksum: varchar("checksum", { length: 64 }).notNull(),
});

export type MirdtExecutionRun = typeof mirdtExecutionRuns.$inferSelect;
export type InsertMirdtExecutionRun = typeof mirdtExecutionRuns.$inferInsert;

export const mirdtExecutionEvents = pgTable("mirdt_execution_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  setupId: uuid("setup_id").notNull(),
  decisionId: uuid("decision_id"),
  paperTradeId: uuid("paper_trade_id"),
  eventType: mirdtEventTypeEnum("event_type").notNull(),
  eventData: jsonb("event_data").notNull(),
  checksum: varchar("checksum", { length: 64 }).notNull(),
}, (table) => ({
  setupCreatedIdx: index("mirdt_exec_evt_setup_created_idx").on(table.setupId, table.createdAt),
}));

export type MirdtExecutionEvent = typeof mirdtExecutionEvents.$inferSelect;
export type InsertMirdtExecutionEvent = typeof mirdtExecutionEvents.$inferInsert;

export const mirdtPortfolioState = pgTable("mirdt_portfolio_state", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  portfolioCapitalUsd: decimal("portfolio_capital_usd", { precision: 18, scale: 8 }).notNull(),
  riskFractionBps: integer("risk_fraction_bps").notNull().default(50),
  maxConcurrentTrades: integer("max_concurrent_trades").notNull().default(5),
  maxPerAssetExposureBps: integer("max_per_asset_exposure_bps").notNull().default(2000),
  drawdownBrakeBps: integer("drawdown_brake_bps").notNull().default(500),
  systemVolatilityTier: mirdtRegimeTierEnum("system_volatility_tier").notNull().default('NORMAL'),
  policyMode: mirdtPolicyModeEnum("policy_mode").notNull().default('BOOTSTRAP'),
  globalSizeMultiplier: decimal("global_size_multiplier", { precision: 18, scale: 8 }).notNull().default('1.0'),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => ({
  createdIdx: index("mirdt_portfolio_state_created_idx").on(table.createdAt),
}));

export type MirdtPortfolioState = typeof mirdtPortfolioState.$inferSelect;
export type InsertMirdtPortfolioState = typeof mirdtPortfolioState.$inferInsert;

export const mirdtExecutionTimeseries = pgTable("mirdt_execution_timeseries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metricKey: varchar("metric_key", { length: 100 }).notNull(),
  metricValue: decimal("metric_value", { precision: 18, scale: 8 }).notNull(),
  tags: jsonb("tags"),
  runId: uuid("run_id"),
}, (table) => ({
  metricCreatedIdx: index("mirdt_exec_ts_metric_created_idx").on(table.metricKey, table.createdAt),
}));

export type MirdtExecutionTimeseries = typeof mirdtExecutionTimeseries.$inferSelect;
export type InsertMirdtExecutionTimeseries = typeof mirdtExecutionTimeseries.$inferInsert;
