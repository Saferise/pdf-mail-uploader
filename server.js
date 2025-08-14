const fs = require('fs-extra');
const logger = require('./logger');
const config = require('./config');
const GmailClient = require('./gmailClient');

class GmailReportProcessor {
  constructor() {
    this.gmailClient = new GmailClient();
    this.setupDirectories();
  }

  async setupDirectories() {
    try {
      await fs.ensureDir('logs');
      logger.info('Log directory ensured');
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  async start() {
    try {
      logger.info('Starting Gmail Report Processor...');
      
      // Display startup information
      console.log('\n=== Gmail Report Processor ===');
      console.log(`📧 Gmail Account: ${config.gmail.user}`);
      console.log(`📁 Reports folder: ${config.storage.reportsFolder}`);
      console.log(`🔍 Processing emails with "report" in subject`);
      console.log(`⏰ Checking every ${config.polling.interval / 1000} seconds`);
      console.log(`📖 Mark as read: ${config.polling.markAsRead}`);
      
      if (!config.gmail.password) {
        console.log('\n❌ ERROR: Gmail App Password not configured!');
        console.log('Please follow these steps:');
        console.log('1. Enable 2-Factor Authentication on your Gmail account');
        console.log('2. Generate an App Password: https://support.google.com/accounts/answer/185833');
        console.log('3. Set the GMAIL_APP_PASSWORD environment variable');
        console.log('4. Or add it to a .env file: GMAIL_APP_PASSWORD=your_app_password');
        process.exit(1);
      }
      
      console.log('\n🔐 Connecting to Gmail...');
      
      await this.gmailClient.connect();
      
      console.log('✅ Connected successfully!');
      console.log('\n🔄 Starting email monitoring...');
      console.log('Press Ctrl+C to stop\n');
      
      this.gmailClient.startPolling();
      
    } catch (error) {
      logger.error('Failed to start Gmail processor:', error);
      console.log('\n❌ Failed to connect to Gmail:');
      console.log(error.message);
      
      if (error.message.includes('Invalid credentials')) {
        console.log('\n💡 Troubleshooting:');
        console.log('1. Make sure you are using an App Password (not your regular password)');
        console.log('2. Enable 2-Factor Authentication first');
        console.log('3. Generate App Password: https://support.google.com/accounts/answer/185833');
        console.log('4. Set GMAIL_APP_PASSWORD environment variable');
      }
      
      process.exit(1);
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down gracefully...');
      logger.info('Received SIGINT, shutting down gracefully...');
      
      try {
        await this.gmailClient.disconnect();
        logger.info('Gmail client disconnected');
        console.log('✅ Disconnected from Gmail');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      
      try {
        await this.gmailClient.disconnect();
        logger.info('Gmail client disconnected');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  }

  async stop() {
    try {
      await this.gmailClient.disconnect();
      logger.info('Gmail processor stopped');
    } catch (error) {
      logger.error('Error stopping Gmail processor:', error);
    }
  }
}

// Start the processor if this file is run directly
if (require.main === module) {
  const processor = new GmailReportProcessor();
  processor.start();
}

module.exports = GmailReportProcessor;
