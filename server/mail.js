/**
 * SWF Mail Service
 * 
 * This module provides email functionality for the Sovran Wealth Fund application
 * to send notifications, alerts, and updates to users.
 */

const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// Create a connection pool to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Configure email transporter
const getTransporter = () => {
  // If using environment variables for SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Fallback to a default service (for development/testing)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send an email notification
 * 
 * @param {Object} options Email options
 * @param {string} options.to Recipient email address
 * @param {string} options.subject Email subject
 * @param {string} options.text Plain text content
 * @param {string} options.html HTML content (optional)
 * @returns {Promise} Promise resolving to the sent message info
 */
const sendEmail = async (options) => {
  try {
    const transporter = getTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Sovran Wealth Fund <noreply@sovranwealthfund.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    // Log email activity to database if available
    try {
      await pool.query(
        'INSERT INTO email_logs (recipient, subject, message_id, sent_at) VALUES ($1, $2, $3, NOW())',
        [options.to, options.subject, info.messageId]
      );
    } catch (dbError) {
      console.warn('Could not log email to database:', dbError.message);
    }
    
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send a notification about staking activity
 * 
 * @param {string} email User's email
 * @param {string} walletAddress User's wallet address
 * @param {string} action Type of staking action (stake, unstake, claim)
 * @param {string} amount Amount of tokens involved
 * @returns {Promise} Promise resolving to the sent message info
 */
const sendStakingNotification = async (email, walletAddress, action, amount) => {
  const actionMap = {
    stake: 'staked',
    unstake: 'unstaked',
    claim: 'claimed'
  };
  
  const verb = actionMap[action] || action;
  
  return sendEmail({
    to: email,
    subject: `SWF Staking Activity: ${verb.charAt(0).toUpperCase() + verb.slice(1)} ${amount} SWF`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #3b82f6;">Sovran Wealth Fund - Staking Notification</h2>
        <p>Hello,</p>
        <p>We're writing to inform you about recent activity on your SWF staking account.</p>
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Action:</strong> ${action.toUpperCase()}</p>
          <p><strong>Amount:</strong> ${amount} SWF</p>
          <p><strong>Wallet:</strong> ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>Thank you for participating in the Sovran Wealth Fund ecosystem.</p>
        <p>Best regards,<br>The SWF Team</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message. Please do not reply to this email.
          If you did not perform this action, please contact support immediately.
        </p>
      </div>
    `,
    text: `
      Sovran Wealth Fund - Staking Notification

      Hello,

      We're writing to inform you about recent activity on your SWF staking account.

      Action: ${action.toUpperCase()}
      Amount: ${amount} SWF
      Wallet: ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}
      Time: ${new Date().toLocaleString()}

      Thank you for participating in the Sovran Wealth Fund ecosystem.

      Best regards,
      The SWF Team

      This is an automated message. Please do not reply to this email.
      If you did not perform this action, please contact support immediately.
    `
  });
};

/**
 * Send price alert notification
 * 
 * @param {string} email User's email
 * @param {string} tokenSymbol Token symbol (e.g., SWF)
 * @param {string} price Current price
 * @param {string} threshold Alert threshold
 * @returns {Promise} Promise resolving to the sent message info
 */
const sendPriceAlert = async (email, tokenSymbol, price, threshold) => {
  return sendEmail({
    to: email,
    subject: `SWF Price Alert: ${tokenSymbol} has reached ${price}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #3b82f6;">Sovran Wealth Fund - Price Alert</h2>
        <p>Hello,</p>
        <p>This is an automated alert to notify you that ${tokenSymbol} has reached your configured price threshold.</p>
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Token:</strong> ${tokenSymbol}</p>
          <p><strong>Current Price:</strong> ${price}</p>
          <p><strong>Your Alert Threshold:</strong> ${threshold}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>You can view your current holdings and take action by visiting our dashboard.</p>
        <p>Best regards,<br>The SWF Team</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message. Please do not reply to this email.
          You can update your alert preferences in your account settings.
        </p>
      </div>
    `,
    text: `
      Sovran Wealth Fund - Price Alert

      Hello,

      This is an automated alert to notify you that ${tokenSymbol} has reached your configured price threshold.

      Token: ${tokenSymbol}
      Current Price: ${price}
      Your Alert Threshold: ${threshold}
      Time: ${new Date().toLocaleString()}

      You can view your current holdings and take action by visiting our dashboard.

      Best regards,
      The SWF Team

      This is an automated message. Please do not reply to this email.
      You can update your alert preferences in your account settings.
    `
  });
};

/**
 * Create email database tables if they don't exist
 */
const initializeEmailTables = async () => {
  try {
    // Create email logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message_id VARCHAR(255),
        sent_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create email preferences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_preferences (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) NOT NULL,
        email VARCHAR(255) NOT NULL,
        staking_notifications BOOLEAN DEFAULT TRUE,
        price_alerts BOOLEAN DEFAULT TRUE,
        price_threshold_lower NUMERIC,
        price_threshold_upper NUMERIC,
        security_notifications BOOLEAN DEFAULT TRUE,
        marketing_emails BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(wallet_address)
      )
    `);
    
    console.log('Email tables initialized');
  } catch (error) {
    console.error('Error initializing email tables:', error);
  }
};

// Export all functions
module.exports = {
  sendEmail,
  sendStakingNotification,
  sendPriceAlert,
  initializeEmailTables
};