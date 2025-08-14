const Imap = require('imap');
const { simpleParser } = require('mailparser');
const logger = require('./logger');
const config = require('./config');
const EmailProcessor = require('./emailProcessor');

class GmailClient {
  constructor() {
    this.imap = null;
    this.emailProcessor = new EmailProcessor();
    this.isConnected = false;
    this.isProcessing = false;
    this.processedUIDs = new Set(); // Track processed emails to avoid duplicates
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (!config.gmail.password) {
        reject(new Error('Gmail App Password not configured. Please set GMAIL_APP_PASSWORD environment variable.'));
        return;
      }

      this.imap = new Imap({
        user: config.gmail.user,
        password: config.gmail.password,
        host: config.gmail.host,
        port: config.gmail.port,
        tls: config.gmail.tls,
        tlsOptions: config.gmail.tlsOptions
      });

      this.imap.once('ready', () => {
        logger.info(`Connected to Gmail IMAP for ${config.gmail.user}`);
        this.isConnected = true;
        resolve();
      });

      this.imap.once('error', (err) => {
        logger.error('IMAP connection error:', err);
        this.isConnected = false;
        reject(err);
      });

      this.imap.once('end', () => {
        logger.info('IMAP connection ended');
        this.isConnected = false;
      });

      this.imap.connect();
    });
  }

  async checkForReportEmails() {
    if (!this.isConnected || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      await this.openInbox();
      
      // Search for unread emails with "report" in subject
      const uids = await this.searchReportEmails();
      
      if (uids.length === 0) {
        logger.info('No new report emails found');
        this.isProcessing = false;
        return;
      }

      logger.info(`Found ${uids.length} unread emails with "report" in subject`);

      for (const uid of uids) {
        if (this.processedUIDs.has(uid)) {
          continue; // Skip already processed emails
        }

        try {
          await this.processEmailByUID(uid);
          this.processedUIDs.add(uid);
        } catch (error) {
          logger.error(`Error processing email UID ${uid}:`, error);
        }
      }

    } catch (error) {
      logger.error('Error checking for emails:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  openInbox() {
    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
        } else {
          resolve(box);
        }
      });
    });
  }

  searchReportEmails() {
    return new Promise((resolve, reject) => {
      // Search for unread emails with "report" in subject (case insensitive)
      const searchCriteria = [
        'UNSEEN', // Unread emails
        ['SUBJECT', 'report']
      ];

      this.imap.search(searchCriteria, (err, uids) => {
        if (err) {
          reject(err);
        } else {
          resolve(uids || []);
        }
      });
    });
  }

  processEmailByUID(uid) {
    return new Promise((resolve, reject) => {
      const fetch = this.imap.fetch(uid, {
        bodies: '',
        markSeen: config.polling.markAsRead,
        struct: true
      });

      fetch.on('message', (msg, seqno) => {
        let emailData = '';

        msg.on('body', (stream, info) => {
          stream.on('data', (chunk) => {
            emailData += chunk.toString('utf8');
          });

          stream.once('end', async () => {
            try {
              // Create a readable stream from the email data
              const { Readable } = require('stream');
              const emailStream = new Readable();
              emailStream.push(emailData);
              emailStream.push(null);

              const result = await this.emailProcessor.processEmail(emailStream);
              
              if (result.processed) {
                logger.info(`✅ Processed email UID ${uid}: ${result.savedFiles.length} PDFs saved`);
                result.savedFiles.forEach(file => {
                  logger.info(`   📄 ${file.savedAs}`);
                });
              } else {
                logger.info(`ℹ️  Email UID ${uid} skipped: ${result.reason}`);
              }

              resolve(result);
            } catch (error) {
              logger.error(`Error processing email UID ${uid}:`, error);
              reject(error);
            }
          });
        });

        msg.once('attributes', (attrs) => {
          logger.debug(`Email UID ${uid} attributes:`, attrs);
        });

        msg.once('end', () => {
          logger.debug(`Finished fetching email UID ${uid}`);
        });
      });

      fetch.once('error', (err) => {
        logger.error(`Fetch error for UID ${uid}:`, err);
        reject(err);
      });

      fetch.once('end', () => {
        logger.debug(`Fetch completed for UID ${uid}`);
      });
    });
  }

  startPolling() {
    logger.info(`Starting Gmail polling every ${config.polling.interval / 1000} seconds`);
    
    // Initial check
    this.checkForReportEmails();

    // Set up interval for periodic checking
    this.pollingInterval = setInterval(() => {
      this.checkForReportEmails();
    }, config.polling.interval);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('Stopped Gmail polling');
    }
  }

  disconnect() {
    return new Promise((resolve) => {
      this.stopPolling();
      
      if (this.imap && this.isConnected) {
        this.imap.end();
        this.imap.once('end', () => {
          logger.info('Disconnected from Gmail IMAP');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = GmailClient;
