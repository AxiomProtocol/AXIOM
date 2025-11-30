/* Advanced Error Intelligence Service
   Intelligent error analysis, pattern detection, and automated insights
   Provides ML-like capabilities for error management and resolution
*/

const crypto = require('crypto');

class ErrorIntelligenceService {
  constructor(db) {
    this.db = db;
    this.patterns = new Map(); // In-memory pattern cache
    this.solutions = new Map(); // Solution cache
    this.alertThresholds = new Map(); // Alert configuration cache
  }

  // Generate unique error hash for deduplication
  generateErrorHash(errorType, errorMessage, sourceFile, lineNumber) {
    const hashInput = `${errorType}:${errorMessage}:${sourceFile}:${lineNumber}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  // Classify error severity based on multiple factors
  classifyErrorSeverity(errorData) {
    const {
      errorType,
      errorMessage,
      componentStack,
      url,
      userAction,
      performanceImpact
    } = errorData;

    // Critical indicators
    const criticalPatterns = [
      /payment.*fail/i,
      /database.*down/i,
      /security.*breach/i,
      /authentication.*fail/i,
      /crash/i,
      /fatal/i
    ];

    // High severity indicators
    const highPatterns = [
      /cannot.*read.*property/i,
      /undefined.*function/i,
      /network.*error/i,
      /timeout/i,
      /permission.*denied/i
    ];

    // Check for critical patterns
    const errorText = `${errorType} ${errorMessage}`;
    if (criticalPatterns.some(pattern => pattern.test(errorText))) {
      return 'critical';
    }

    // Check for high severity patterns
    if (highPatterns.some(pattern => pattern.test(errorText))) {
      return 'high';
    }

    // Check performance impact
    if (performanceImpact) {
      const { lcp, fid, cls } = performanceImpact;
      if (lcp > 4000 || fid > 300 || cls > 0.25) {
        return 'high';
      }
    }

    // Check critical pages/features
    const criticalPages = ['/payment', '/checkout', '/login', '/dashboard'];
    if (criticalPages.some(page => url && url.includes(page))) {
      return 'high';
    }

    // Default to medium
    return 'medium';
  }

  // Categorize errors into logical groups
  categorizeError(errorData) {
    const { errorType, errorMessage, sourceFile, componentStack } = errorData;
    
    const categories = {
      'frontend': {
        'component': /React|Component|render/i,
        'state': /state|props|reducer/i,
        'navigation': /router|navigation|route/i,
        'form': /form|input|validation/i,
        'ui': /ui|layout|style|css/i
      },
      'backend': {
        'api': /api|endpoint|request|response/i,
        'database': /database|sql|query|connection/i,
        'authentication': /auth|login|token|session/i,
        'payment': /payment|stripe|billing/i
      },
      'network': {
        'timeout': /timeout|network.*error/i,
        'cors': /cors|cross.*origin/i,
        'fetch': /fetch|xhr|ajax/i,
        'websocket': /websocket|ws/i
      },
      'performance': {
        'memory': /memory|heap|out.*of.*memory/i,
        'render': /render.*performance|slow.*render/i,
        'bundle': /bundle|chunk|loading/i
      }
    };

    const errorText = `${errorType} ${errorMessage} ${sourceFile} ${componentStack}`;
    
    for (const [category, subcategories] of Object.entries(categories)) {
      for (const [subcategory, pattern] of Object.entries(subcategories)) {
        if (pattern.test(errorText)) {
          return { category, subcategory };
        }
      }
    }

    return { category: 'unknown', subcategory: 'unclassified' };
  }

  // Assess impact level on user experience
  assessImpactLevel(errorData) {
    const { severity, url, userAction, componentStack } = errorData;
    
    // Blocking: Prevents user from completing critical tasks
    const blockingIndicators = [
      /payment.*fail/i,
      /form.*submit.*fail/i,
      /login.*fail/i,
      /crash/i,
      /white.*screen/i
    ];

    // Degraded: Affects user experience but doesn't block
    const degradedIndicators = [
      /slow.*performance/i,
      /timeout/i,
      /loading.*error/i,
      /visual.*glitch/i
    ];

    const errorText = `${errorData.errorType} ${errorData.errorMessage} ${userAction}`;
    
    if (blockingIndicators.some(pattern => pattern.test(errorText))) {
      return 'blocking';
    }
    
    if (degradedIndicators.some(pattern => pattern.test(errorText))) {
      return 'degraded';
    }
    
    // Default based on severity
    if (severity === 'critical') return 'blocking';
    if (severity === 'high') return 'degraded';
    return 'minor';
  }

  // Detect if this is a recurring error pattern
  async detectRecurringPattern(errorHash, timeWindow = 3600000) { // 1 hour default
    try {
      const recentErrors = await this.db.execute(
        `SELECT COUNT(*) as count, MIN(created_at) as first_seen 
         FROM error_events 
         WHERE error_hash = $1 AND created_at > NOW() - INTERVAL '${timeWindow / 1000} seconds'`,
        [errorHash]
      );

      const errorCount = parseInt(recentErrors.rows[0]?.count || 0);
      return {
        isRecurring: errorCount > 3,
        frequency: errorCount,
        timeWindow: timeWindow
      };
    } catch (error) {
      console.error('Error detecting pattern:', error);
      return { isRecurring: false, frequency: 1 };
    }
  }

  // Generate automated suggestions for error resolution
  generateResolutionSuggestions(errorData) {
    const { errorType, errorMessage, category, subcategory } = errorData;
    
    const suggestionRules = {
      'TypeError: Cannot read properties of undefined': [
        'Add null/undefined checks before accessing properties',
        'Use optional chaining (?.) for safer property access',
        'Initialize state/props with default values',
        'Add loading states while data is being fetched'
      ],
      'TypeError: Cannot read properties of null': [
        'Check if element exists before accessing properties',
        'Add null guards in your code',
        'Ensure DOM elements are properly rendered',
        'Use conditional rendering in React components'
      ],
      'Network Error': [
        'Check API endpoint availability',
        'Verify CORS configuration',
        'Add retry logic for network requests',
        'Implement proper error handling for API calls'
      ],
      'ChunkLoadError': [
        'Clear browser cache and reload',
        'Check if all build assets are properly deployed',
        'Implement dynamic import error boundaries',
        'Add fallback loading for code splitting'
      ]
    };

    // Match specific error patterns
    for (const [pattern, suggestions] of Object.entries(suggestionRules)) {
      if (errorMessage.includes(pattern) || errorType.includes(pattern)) {
        return suggestions;
      }
    }

    // Category-based suggestions
    const categorySuggestions = {
      'frontend': {
        'component': ['Add error boundaries', 'Check component lifecycle', 'Validate props'],
        'state': ['Initialize state properly', 'Check state updates', 'Use immutable updates'],
        'form': ['Add form validation', 'Check input handlers', 'Validate form data']
      },
      'network': {
        'timeout': ['Increase timeout values', 'Add retry logic', 'Check network conditions'],
        'cors': ['Configure CORS headers', 'Check allowed origins', 'Verify request methods']
      }
    };

    const categoryBasedSuggestions = categorySuggestions[category]?.[subcategory];
    if (categoryBasedSuggestions) {
      return categoryBasedSuggestions;
    }

    // Default suggestions
    return [
      'Check browser console for additional details',
      'Reproduce the error in development environment',
      'Review recent code changes',
      'Check for similar resolved issues'
    ];
  }

  // Process and enrich error data with intelligence
  async processErrorEvent(rawErrorData) {
    try {
      // Generate unique identifiers
      const errorHash = this.generateErrorHash(
        rawErrorData.errorType,
        rawErrorData.errorMessage,
        rawErrorData.sourceFile,
        rawErrorData.lineNumber
      );

      const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      // Apply intelligence
      const severity = this.classifyErrorSeverity(rawErrorData);
      const { category, subcategory } = this.categorizeError(rawErrorData);
      const impactLevel = this.assessImpactLevel({ ...rawErrorData, severity });
      const recurringInfo = await this.detectRecurringPattern(errorHash);
      const suggestions = this.generateResolutionSuggestions({
        ...rawErrorData,
        category,
        subcategory
      });

      // Enrich error data
      const enrichedErrorData = {
        ...rawErrorData,
        errorId,
        errorHash,
        severity,
        category,
        subcategory,
        impactLevel,
        isRecurring: recurringInfo.isRecurring,
        resolutionSuggestions: suggestions,
        
        // Add intelligence metadata
        intelligence: {
          autoClassified: true,
          confidenceScore: 0.85, // Could be ML-based in future
          processingVersion: '1.0',
          suggestions: suggestions.slice(0, 3) // Top 3 suggestions
        }
      };

      return enrichedErrorData;
    } catch (error) {
      console.error('Error processing event:', error);
      // Return original data if processing fails
      return { ...rawErrorData, processingError: error.message };
    }
  }

  // Analyze error trends and patterns
  async analyzeErrorTrends(timeRange = '24h') {
    try {
      const timeFilter = timeRange === '24h' ? "NOW() - INTERVAL '24 hours'" 
                      : timeRange === '7d' ? "NOW() - INTERVAL '7 days'"
                      : timeRange === '30d' ? "NOW() - INTERVAL '30 days'"
                      : "NOW() - INTERVAL '24 hours'";

      const trends = await this.db.execute(`
        SELECT 
          error_type,
          category,
          severity,
          COUNT(*) as occurrence_count,
          COUNT(DISTINCT user_id) as affected_users,
          AVG(CASE WHEN impact_level = 'blocking' THEN 1 ELSE 0 END) as blocking_rate,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen
        FROM error_events 
        WHERE created_at > ${timeFilter}
        GROUP BY error_type, category, severity
        ORDER BY occurrence_count DESC
        LIMIT 20
      `);

      return {
        timeRange,
        topErrors: trends.rows,
        summary: {
          totalErrors: trends.rows.reduce((sum, row) => sum + parseInt(row.occurrence_count), 0),
          affectedUsers: trends.rows.reduce((sum, row) => sum + parseInt(row.affected_users), 0),
          criticalErrors: trends.rows.filter(row => row.severity === 'critical').length
        }
      };
    } catch (error) {
      console.error('Error analyzing trends:', error);
      return { error: error.message };
    }
  }

  // Generate real-time alerts based on error patterns
  async checkAlertConditions(errorData) {
    const alerts = [];
    
    // Critical error immediate alert
    if (errorData.severity === 'critical') {
      alerts.push({
        type: 'critical_error',
        message: `Critical error detected: ${errorData.errorType}`,
        priority: 'high',
        channels: ['email', 'slack'],
        data: errorData
      });
    }

    // High frequency alert (>10 errors in 5 minutes)
    const recentCount = await this.getRecentErrorCount(errorData.errorHash, 5 * 60 * 1000);
    if (recentCount > 10) {
      alerts.push({
        type: 'high_frequency',
        message: `High error frequency: ${recentCount} occurrences in 5 minutes`,
        priority: 'medium',
        channels: ['slack'],
        data: { ...errorData, frequency: recentCount }
      });
    }

    // New error type alert
    const isNewError = await this.isNewErrorType(errorData.errorHash);
    if (isNewError) {
      alerts.push({
        type: 'new_error',
        message: `New error type detected: ${errorData.errorType}`,
        priority: 'low',
        channels: ['email'],
        data: errorData
      });
    }

    return alerts;
  }

  // Helper methods
  async getRecentErrorCount(errorHash, timeWindow) {
    try {
      const result = await this.db.execute(
        `SELECT COUNT(*) as count FROM error_events 
         WHERE error_hash = $1 AND created_at > NOW() - INTERVAL '${timeWindow / 1000} seconds'`,
        [errorHash]
      );
      return parseInt(result.rows[0]?.count || 0);
    } catch (error) {
      console.error('Error getting recent count:', error);
      return 0;
    }
  }

  async isNewErrorType(errorHash) {
    try {
      const result = await this.db.execute(
        `SELECT COUNT(*) as count FROM error_events 
         WHERE error_hash = $1 AND created_at < NOW() - INTERVAL '24 hours'`,
        [errorHash]
      );
      return parseInt(result.rows[0]?.count || 0) === 0;
    } catch (error) {
      console.error('Error checking if new:', error);
      return false;
    }
  }
}

module.exports = ErrorIntelligenceService;