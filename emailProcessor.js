const fs = require('fs-extra');
const path = require('path');
const { simpleParser } = require('mailparser');
const logger = require('./logger');
const config = require('./config');

class EmailProcessor {
  constructor() {
    this.reportsFolder = config.storage.reportsFolder;
    this.ensureReportsFolder();
  }

  async ensureReportsFolder() {
    try {
      await fs.ensureDir(this.reportsFolder);
      logger.info(`Reports folder ensured at: ${this.reportsFolder}`);
    } catch (error) {
      logger.error('Failed to create reports folder:', error);
    }
  }

  async processEmail(stream) {
    try {
      const parsed = await simpleParser(stream);
      
      logger.info(`Processing email - From: ${parsed.from?.text}, Subject: ${parsed.subject}`);

      // Check if subject contains "report" (case insensitive)
      if (!this.isReportEmail(parsed.subject)) {
        logger.info(`Email subject "${parsed.subject}" does not contain "report" - skipping`);
        return {
          processed: false,
          reason: 'Subject does not contain "report"'
        };
      }

      const pdfAttachments = this.extractPdfAttachments(parsed.attachments || []);
      
      if (pdfAttachments.length === 0) {
        logger.info('No PDF attachments found in email');
        return {
          processed: false,
          reason: 'No PDF attachments found'
        };
      }

      const savedFiles = await this.savePdfAttachments(pdfAttachments, parsed);
      
      logger.info(`Successfully processed ${savedFiles.length} PDF attachments`);
      
      return {
        processed: true,
        savedFiles: savedFiles,
        emailInfo: {
          from: parsed.from?.text,
          subject: parsed.subject,
          date: parsed.date
        }
      };

    } catch (error) {
      logger.error('Error processing email:', error);
      throw error;
    }
  }

  isReportEmail(subject) {
    if (!subject) return false;
    return subject.toLowerCase().includes('report');
  }

  extractPdfAttachments(attachments) {
    return attachments.filter(attachment => {
      const contentType = attachment.contentType?.toLowerCase();
      const filename = attachment.filename?.toLowerCase();
      
      return contentType === 'application/pdf' || 
             (filename && filename.endsWith('.pdf'));
    });
  }

  async savePdfAttachments(pdfAttachments, emailData) {
    const savedFiles = [];
    
    for (const attachment of pdfAttachments) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sanitizedSender = this.sanitizeFilename(emailData.from?.text || 'unknown');
        const originalName = attachment.filename || `attachment-${timestamp}.pdf`;
        const filename = `${timestamp}_${sanitizedSender}_${originalName}`;
        const filePath = path.join(this.reportsFolder, filename);

        await fs.writeFile(filePath, attachment.content);
        
        const fileInfo = {
          originalName: attachment.filename,
          savedAs: filename,
          path: filePath,
          size: attachment.content.length,
          sender: emailData.from?.text,
          subject: emailData.subject,
          receivedAt: new Date().toISOString()
        };

        savedFiles.push(fileInfo);
        logger.info(`Saved PDF: ${filename} (${attachment.content.length} bytes)`);

      } catch (error) {
        logger.error(`Failed to save attachment ${attachment.filename}:`, error);
      }
    }

    return savedFiles;
  }

  sanitizeFilename(text) {
    if (!text) return 'unknown';
    
    // Extract email address if present
    const emailMatch = text.match(/<(.+)>/);
    const cleanText = emailMatch ? emailMatch[1] : text;
    
    // Remove invalid filename characters
    return cleanText
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50); // Limit length
  }
}

module.exports = EmailProcessor;
