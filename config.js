require('dotenv').config();

module.exports = {
  gmail: {
    user: process.env.GMAIL_USER || 'fadiyassin381@gmail.com',
    password: process.env.GMAIL_APP_PASSWORD || 'qemh kvfr acgh gykg', // Gmail App Password required
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  },
  polling: {
    interval: parseInt(process.env.POLL_INTERVAL) || 30000, // Check every 30 seconds
    markAsRead: process.env.MARK_AS_READ !== 'false' // Default to true
  },
  storage: {
    reportsFolder: process.env.REPORTS_FOLDER || './all-reports/unparsed-reports'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
