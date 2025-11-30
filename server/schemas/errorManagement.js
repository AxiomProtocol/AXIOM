/* Advanced Error Management System Schema
   Enterprise-grade error logging, reporting, and debugging infrastructure
   Features: Intelligent categorization, pattern detection, real-time analytics
*/

const { sql } = require('drizzle-orm');
const { pgTable, serial, varchar, text, timestamp, jsonb, integer, boolean, decimal, index } = require('drizzle-orm/pg-core');

// Main error events table - comprehensive error capture
const errorEvents = pgTable('error_events', {
  id: serial('id').primaryKey(),
  
  // Core Error Information
  errorId: varchar('error_id', { length: 100 }).notNull().unique(), // Unique identifier for grouping
  errorHash: varchar('error_hash', { length: 64 }).notNull(), // Hash for deduplication
  errorType: varchar('error_type', { length: 100 }).notNull(),
  errorMessage: text('error_message').notNull(),
  errorStack: text('error_stack'),
  sourceFile: varchar('source_file', { length: 500 }),
  lineNumber: integer('line_number'),
  columnNumber: integer('column_number'),
  
  // Context Information
  componentStack: text('component_stack'),
  userAgent: text('user_agent'),
  url: varchar('url', { length: 1000 }),
  userId: varchar('user_id', { length: 100 }),
  sessionId: varchar('session_id', { length: 100 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  
  // Environment & Device Context
  viewport: jsonb('viewport'), // { width, height, devicePixelRatio }
  deviceInfo: jsonb('device_info'), // { memory, cores, connection, etc }
  browserInfo: jsonb('browser_info'), // { name, version, engine }
  platformInfo: jsonb('platform_info'), // { os, version, architecture }
  
  // Application Context
  appVersion: varchar('app_version', { length: 50 }),
  buildNumber: varchar('build_number', { length: 50 }),
  environment: varchar('environment', { length: 20 }).default('development'),
  feature: varchar('feature', { length: 100 }), // Which feature/module
  userAction: varchar('user_action', { length: 200 }), // What user was doing
  
  // Error Classification
  severity: varchar('severity', { length: 20 }).default('medium'), // critical, high, medium, low
  category: varchar('category', { length: 50 }), // frontend, backend, network, etc
  subcategory: varchar('subcategory', { length: 50 }), // component, api, database, etc
  isRecurring: boolean('is_recurring').default(false),
  impactLevel: varchar('impact_level', { length: 20 }), // blocking, degraded, minor
  
  // Performance Impact
  performanceImpact: jsonb('performance_impact'), // { lcp, fid, cls, memory }
  loadTime: integer('load_time'), // milliseconds
  errorCount: integer('error_count').default(1), // for grouped errors
  affectedUsers: integer('affected_users').default(1),
  
  // State Snapshots
  componentState: jsonb('component_state'), // React component state
  reduxState: jsonb('redux_state'), // Global state snapshot  
  formData: jsonb('form_data'), // Form values (sanitized)
  userFlow: jsonb('user_flow'), // Recent user actions
  
  // Resolution Tracking
  status: varchar('status', { length: 20 }).default('open'), // open, investigating, resolved, ignored
  assignedTo: varchar('assigned_to', { length: 100 }),
  resolution: text('resolution'),
  resolutionTime: timestamp('resolution_time'),
  
  // Metadata
  tags: jsonb('tags'), // Array of custom tags
  customData: jsonb('custom_data'), // Additional context
  
  // Timestamps
  firstOccurrence: timestamp('first_occurrence').defaultNow(),
  lastOccurrence: timestamp('last_occurrence').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  // Performance indexes for fast queries
  errorHashIdx: index('error_hash_idx').on(table.errorHash),
  errorTypeIdx: index('error_type_idx').on(table.errorType),
  severityIdx: index('severity_idx').on(table.severity),
  statusIdx: index('status_idx').on(table.status),
  environmentIdx: index('environment_idx').on(table.environment),
  timestampIdx: index('timestamp_idx').on(table.createdAt),
  userIdx: index('user_idx').on(table.userId),
  sessionIdx: index('session_idx').on(table.sessionId)
}));

// Error patterns and trends analysis
const errorPatterns = pgTable('error_patterns', {
  id: serial('id').primaryKey(),
  patternHash: varchar('pattern_hash', { length: 64 }).notNull().unique(),
  errorType: varchar('error_type', { length: 100 }).notNull(),
  pattern: text('pattern').notNull(), // Regex or description
  frequency: integer('frequency').default(1),
  affectedUsers: integer('affected_users').default(1),
  firstSeen: timestamp('first_seen').defaultNow(),
  lastSeen: timestamp('last_seen').defaultNow(),
  severity: varchar('severity', { length: 20 }),
  isActive: boolean('is_active').default(true),
  description: text('description'),
  suggestedFix: text('suggested_fix'),
  createdAt: timestamp('created_at').defaultNow()
});

// Error resolution knowledge base
const errorResolutions = pgTable('error_resolutions', {
  id: serial('id').primaryKey(),
  errorPattern: varchar('error_pattern', { length: 200 }).notNull(),
  solution: text('solution').notNull(),
  effectiveness: decimal('effectiveness', { precision: 3, scale: 2 }), // 0.00 to 1.00
  timeToResolve: integer('time_to_resolve'), // minutes
  tags: jsonb('tags'),
  createdBy: varchar('created_by', { length: 100 }),
  verified: boolean('verified').default(false),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Real-time error alerts configuration
const errorAlerts = pgTable('error_alerts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  conditions: jsonb('conditions').notNull(), // Query conditions
  threshold: integer('threshold').default(1),
  timeWindow: integer('time_window').default(300), // seconds
  severity: varchar('severity', { length: 20 }),
  channels: jsonb('channels'), // email, slack, webhook, etc
  isActive: boolean('is_active').default(true),
  lastTriggered: timestamp('last_triggered'),
  triggerCount: integer('trigger_count').default(0),
  createdAt: timestamp('created_at').defaultNow()
});

// Performance correlation data
const performanceMetrics = pgTable('performance_metrics', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 100 }).notNull(),
  errorEventId: integer('error_event_id').references(() => errorEvents.id),
  
  // Core Web Vitals
  lcp: decimal('lcp', { precision: 10, scale: 2 }), // Largest Contentful Paint
  fid: decimal('fid', { precision: 10, scale: 2 }), // First Input Delay
  cls: decimal('cls', { precision: 10, scale: 4 }), // Cumulative Layout Shift
  fcp: decimal('fcp', { precision: 10, scale: 2 }), // First Contentful Paint
  ttfb: decimal('ttfb', { precision: 10, scale: 2 }), // Time to First Byte
  
  // Memory and Resource Usage
  memoryUsage: jsonb('memory_usage'),
  resourceTimings: jsonb('resource_timings'),
  navigationTiming: jsonb('navigation_timing'),
  
  // Custom Metrics
  apiResponseTimes: jsonb('api_response_times'),
  componentRenderTimes: jsonb('component_render_times'),
  
  timestamp: timestamp('timestamp').defaultNow()
});

// User error impact tracking
const userErrorImpact = pgTable('user_error_impact', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 100 }).notNull(),
  sessionId: varchar('session_id', { length: 100 }),
  errorEventId: integer('error_event_id').references(() => errorEvents.id),
  
  // Impact Assessment
  impactType: varchar('impact_type', { length: 50 }), // blocking, degraded, informational
  userExperience: varchar('user_experience', { length: 50 }), // poor, fair, good
  taskCompleted: boolean('task_completed').default(false),
  timeToResolve: integer('time_to_resolve'), // How long user was blocked
  
  // Recovery Actions
  recoveryAction: varchar('recovery_action', { length: 100 }), // refresh, retry, abandon
  assistanceProvided: text('assistance_provided'),
  
  timestamp: timestamp('timestamp').defaultNow()
});

module.exports = {
  errorEvents,
  errorPatterns,
  errorResolutions,
  errorAlerts,
  performanceMetrics,
  userErrorImpact
};