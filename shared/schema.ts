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
// SUSU REGIONAL INTEREST HUBS & PURPOSE GROUPS
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