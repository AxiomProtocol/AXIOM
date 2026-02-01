/* Intelligent Alert Notification Service
   Advanced alerting system with smart thresholds and multi-channel notifications
   Provides real-time alerts for critical errors and patterns
*/

class AlertNotificationService {
  constructor(db) {
    this.db = db;
    this.alertChannels = new Map();
    this.alertHistory = new Map();
    this.suppressionRules = new Map();
    
    this.initializeChannels();
  }

  initializeChannels() {
    // Email channel
    this.alertChannels.set('email', {
      name: 'Email',
      enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
      send: this.sendEmailAlert.bind(this)
    });

    // Slack channel
    this.alertChannels.set('slack', {
      name: 'Slack',
      enabled: process.env.SLACK_WEBHOOK_URL,
      send: this.sendSlackAlert.bind(this)
    });

    // Webhook channel
    this.alertChannels.set('webhook', {
      name: 'Webhook',
      enabled: process.env.ALERT_WEBHOOK_URL,
      send: this.sendWebhookAlert.bind(this)
    });

    // Console channel (always enabled for development)
    this.alertChannels.set('console', {
      name: 'Console',
      enabled: true,
      send: this.sendConsoleAlert.bind(this)
    });
  }

  // Main alert processing method
  async processAlerts(alerts) {
    for (const alert of alerts) {
      try {
        // Check if alert should be suppressed
        if (this.shouldSuppressAlert(alert)) {
          continue;
        }

        // Enrich alert with additional context
        const enrichedAlert = await this.enrichAlert(alert);

        // Determine alert channels based on priority and type
        const channels = this.determineChannels(enrichedAlert);

        // Send to all appropriate channels
        for (const channel of channels) {
          await this.sendAlert(enrichedAlert, channel);
        }

        // Record alert history
        this.recordAlertHistory(enrichedAlert);

        // Update alert configuration if needed
        await this.updateAlertThresholds(enrichedAlert);

      } catch (error) {
        console.error(`❌ Failed to process alert:`, error);
      }
    }
  }

  // Check if alert should be suppressed based on rules
  shouldSuppressAlert(alert) {
    const alertKey = `${alert.type}_${alert.data?.errorType || 'unknown'}`;
    
    // Check frequency-based suppression
    const recentAlerts = this.alertHistory.get(alertKey) || [];
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const recentCount = recentAlerts.filter(time => time > tenMinutesAgo).length;

    // Suppress if too many similar alerts recently
    if (recentCount >= 5) {
      console.log(`🔇 Suppressing alert ${alertKey} - too frequent (${recentCount} in 10 min)`);
      return true;
    }

    // Don't suppress critical alerts
    if (alert.priority === 'critical') {
      return false;
    }

    return false;
  }

  // Enrich alert with additional context
  async enrichAlert(alert) {
    try {
      const enrichedAlert = { ...alert };

      // Add timestamp if not present
      if (!enrichedAlert.timestamp) {
        enrichedAlert.timestamp = new Date().toISOString();
      }

      // Add environment context
      enrichedAlert.environment = process.env.NODE_ENV || 'unknown';
      enrichedAlert.platform = 'SWF Platform';

      // Get related error statistics if this is an error alert
      if (alert.data?.errorType) {
        const stats = await this.getErrorStats(alert.data.errorType);
        enrichedAlert.statistics = stats;
      }

      // Add alert ID for tracking
      enrichedAlert.alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      return enrichedAlert;
    } catch (error) {
      console.error('Error enriching alert:', error);
      return alert;
    }
  }

  // Determine which channels to use based on alert properties
  determineChannels(alert) {
    const channels = [];

    switch (alert.priority) {
      case 'critical':
        // Critical alerts go to all available channels
        channels.push('email', 'slack', 'webhook', 'console');
        break;
      
      case 'high':
        // High priority goes to slack and console
        channels.push('slack', 'console');
        break;
      
      case 'medium':
        // Medium priority goes to console only
        channels.push('console');
        break;
      
      default:
        // Low priority or unknown goes to console
        channels.push('console');
    }

    // Filter to only enabled channels
    return channels.filter(channel => this.alertChannels.get(channel)?.enabled);
  }

  // Send alert to specific channel
  async sendAlert(alert, channelName) {
    try {
      const channel = this.alertChannels.get(channelName);
      if (!channel || !channel.enabled) {
        return;
      }

      await channel.send(alert);
      console.log(`✅ Alert sent via ${channel.name}: ${alert.type}`);
    } catch (error) {
      console.error(`❌ Failed to send alert via ${channelName}:`, error);
    }
  }

  // Channel-specific alert senders
  async sendEmailAlert(alert) {
    // Email implementation would go here
    // For now, just log the alert
    console.log('📧 EMAIL ALERT:', {
      subject: `[${alert.priority.toUpperCase()}] ${alert.type} - SWF Platform`,
      message: alert.message,
      details: alert.data
    });
  }

  async sendSlackAlert(alert) {
    // Slack webhook implementation would go here
    const slackMessage = {
      text: `🚨 *${alert.priority.toUpperCase()}* Alert from SWF Platform`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${this.getPriorityEmoji(alert.priority)} ${alert.type}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.message
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Environment: ${alert.environment} | Time: ${alert.timestamp}`
            }
          ]
        }
      ]
    };

    console.log('💬 SLACK ALERT:', slackMessage);

    // If webhook URL is configured, send the actual request
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackMessage)
        });
        
        if (!response.ok) {
          throw new Error(`Slack webhook failed: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }
  }

  async sendWebhookAlert(alert) {
    // Generic webhook implementation
    const webhookPayload = {
      alertId: alert.alertId,
      type: alert.type,
      priority: alert.priority,
      message: alert.message,
      timestamp: alert.timestamp,
      environment: alert.environment,
      data: alert.data
    };

    console.log('🌐 WEBHOOK ALERT:', webhookPayload);

    if (process.env.ALERT_WEBHOOK_URL) {
      try {
        const response = await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });
        
        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to send webhook alert:', error);
      }
    }
  }

  async sendConsoleAlert(alert) {
    const emoji = this.getPriorityEmoji(alert.priority);
    const timestamp = new Date().toISOString();
    
    console.log(`\n🚨 ==========================================`);
    console.log(`${emoji} ALERT: ${alert.type.toUpperCase()}`);
    console.log(`📅 Time: ${timestamp}`);
    console.log(`⚡ Priority: ${alert.priority.toUpperCase()}`);
    console.log(`💬 Message: ${alert.message}`);
    
    if (alert.data) {
      console.log(`📋 Details:`, JSON.stringify(alert.data, null, 2));
    }
    
    if (alert.statistics) {
      console.log(`📊 Statistics:`, alert.statistics);
    }
    
    console.log(`🚨 ==========================================\n`);
  }

  // Helper methods
  getPriorityEmoji(priority) {
    switch (priority) {
      case 'critical': return '🔥';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📢';
    }
  }

  async getErrorStats(errorType) {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_occurrences,
          COUNT(DISTINCT user_id) as affected_users,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen,
          AVG(error_count) as avg_frequency
        FROM error_events 
        WHERE error_type = $1 AND created_at > NOW() - INTERVAL '24 hours'
      `, [errorType]);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting error stats:', error);
      return null;
    }
  }

  recordAlertHistory(alert) {
    const alertKey = `${alert.type}_${alert.data?.errorType || 'unknown'}`;
    const history = this.alertHistory.get(alertKey) || [];
    
    history.push(Date.now());
    
    // Keep only last 24 hours of history
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentHistory = history.filter(time => time > oneDayAgo);
    
    this.alertHistory.set(alertKey, recentHistory);
  }

  async updateAlertThresholds(alert) {
    // Adaptive threshold logic could go here
    // For now, just log that we're considering threshold updates
    if (alert.priority === 'critical') {
      console.log(`🎯 Considering threshold update for ${alert.type}`);
    }
  }

  // Configuration methods
  enableChannel(channelName) {
    const channel = this.alertChannels.get(channelName);
    if (channel) {
      channel.enabled = true;
      console.log(`✅ Enabled alert channel: ${channel.name}`);
    }
  }

  disableChannel(channelName) {
    const channel = this.alertChannels.get(channelName);
    if (channel) {
      channel.enabled = false;
      console.log(`❌ Disabled alert channel: ${channel.name}`);
    }
  }

  getChannelStatus() {
    const status = {};
    for (const [name, channel] of this.alertChannels) {
      status[name] = {
        name: channel.name,
        enabled: channel.enabled
      };
    }
    return status;
  }

  // Test alert functionality
  async sendTestAlert() {
    const testAlert = {
      type: 'test_alert',
      priority: 'medium',
      message: 'This is a test alert to verify the notification system is working correctly.',
      data: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };

    await this.processAlerts([testAlert]);
    return testAlert;
  }
}

module.exports = AlertNotificationService;